"""
app.py
STEP 4 of the pipeline: Flask web app.
- Two cameras (or two buttons in a demo UI) feed images to /api/recognize/entry
  and /api/recognize/exit.
- src/attendance_engine.py (Keras/TensorFlow) answers "who is this".
- src/db.py turns that into an entry_time / exit_time / break_time record.
- /dashboard renders today's attendance + time report for teachers/admins.

Run:
    python app.py
Then open http://127.0.0.1:5000/dashboard
"""

import os
import cv2
from datetime import date, datetime, timedelta
from flask import Flask, request, jsonify, render_template
from flask_cors import CORS

from config import SQLALCHEMY_DATABASE_URI
from src.db import (
    db, Student, AttendanceLog, BreakLog,
    handle_entry_event, handle_exit_event, get_recent_events
)

app = Flask(__name__)
app.config["SQLALCHEMY_DATABASE_URI"] = SQLALCHEMY_DATABASE_URI
app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False
db.init_app(app)
CORS(app)  # allows the separate React dev server (e.g. localhost:5173) to call this API

UPLOAD_DIR = os.path.join(os.path.dirname(__file__), "uploads")
os.makedirs(UPLOAD_DIR, exist_ok=True)

# Lazily loaded to avoid crashing Flask on startup if no trained model exists yet.
engine = None

def get_engine():
    global engine
    if engine is None:
        from src.attendance_engine import AttendanceEngine
        engine = AttendanceEngine()
    return engine


def _save_temp_image(file):
    path = os.path.join(UPLOAD_DIR, file.filename)
    file.save(path)
    return path


@app.route("/api/recognize/entry", methods=["POST"])
def recognize_entry():
    """Called by the camera/client at the classroom ENTRANCE."""
    image_path = _save_temp_image(request.files["frame"])
    try:
        current_engine = get_engine()
    except FileNotFoundError as e:
        return jsonify({"error": str(e)}), 400

    matches = current_engine.recognize_from_path(image_path)

    responses = []
    for match in matches:
        if match["roll_no"] is None:
            responses.append({"status": "unrecognized", "confidence": match["confidence"]})
            continue
        student = Student.query.filter_by(roll_no=match["roll_no"]).first()
        if not student:
            continue
        result = handle_entry_event(student.id)
        result.update({"roll_no": student.roll_no, "name": student.name,
                        "confidence": match["confidence"]})
        responses.append(result)

    return jsonify(responses)


@app.route("/api/recognize/exit", methods=["POST"])
def recognize_exit():
    """
    Called by the camera/client at the classroom EXIT/DOOR.
    Pass ?final=true for end-of-session exit, otherwise it is treated as a
    temporary washroom/break exit.
    """
    final_exit = request.args.get("final", "false").lower() == "true"
    image_path = _save_temp_image(request.files["frame"])
    try:
        current_engine = get_engine()
    except FileNotFoundError as e:
        return jsonify({"error": str(e)}), 400

    matches = current_engine.recognize_from_path(image_path)

    responses = []
    for match in matches:
        if match["roll_no"] is None:
            responses.append({"status": "unrecognized", "confidence": match["confidence"]})
            continue
        student = Student.query.filter_by(roll_no=match["roll_no"]).first()
        if not student:
            continue
        result = handle_exit_event(student.id, final_exit=final_exit)
        result.update({"roll_no": student.roll_no, "name": student.name,
                        "confidence": match["confidence"]})
        responses.append(result)

    return jsonify(responses)


@app.route("/api/recognize/video", methods=["POST"])
def recognize_video():
    """Processes a video file, extracting 1 frame per second to mark attendance."""
    mode = request.form.get("mode", "entry")
    final_exit = request.form.get("final", "false").lower() == "true"
    
    if "video" not in request.files:
        return jsonify({"error": "No video file provided"}), 400
        
    video_path = _save_temp_image(request.files["video"])
    try:
        current_engine = get_engine()
    except FileNotFoundError as e:
        return jsonify({"error": str(e)}), 400

    cap = cv2.VideoCapture(video_path)
    fps = cap.get(cv2.CAP_PROP_FPS)
    if not fps or fps < 1:
        fps = 30  # fallback
    
    frame_interval = int(fps)  # 1 frame per second
    frame_count = 0
    unique_students_recognized = {}

    while True:
        ret, frame = cap.read()
        if not ret:
            break
        
        if frame_count % frame_interval == 0:
            matches = current_engine.recognize(frame)
            for match in matches:
                roll_no = match["roll_no"]
                if roll_no is not None and roll_no not in unique_students_recognized:
                    unique_students_recognized[roll_no] = match["confidence"]
        
        frame_count += 1

    cap.release()
    try:
        os.remove(video_path)
    except:
        pass
    
    responses = []
    for roll_no, confidence in unique_students_recognized.items():
        student = Student.query.filter_by(roll_no=roll_no).first()
        if not student:
            continue
            
        if mode == "entry":
            result = handle_entry_event(student.id)
        else:
            result = handle_exit_event(student.id, final_exit=final_exit)
            
        result.update({
            "roll_no": student.roll_no, 
            "name": student.name,
            "confidence": confidence
        })
        responses.append(result)

    return jsonify(responses)


@app.route("/api/students", methods=["GET"])
def list_students():
    students = Student.query.order_by(Student.name).all()
    return jsonify([
        {"id": s.id, "roll_no": s.roll_no, "name": s.name,
         "class_name": s.class_name, "created_at": s.created_at.isoformat()}
        for s in students
    ])


@app.route("/api/students", methods=["POST"])
def add_student():
    """
    Adds the DB record only. After this, run on the server machine:
        python src/capture_faces.py --roll <roll_no> --name "<name>"
        python src/train_model.py
    so the new student is actually recognizable by the camera.
    """
    data = request.get_json()
    if Student.query.filter_by(roll_no=data["roll_no"]).first():
        return jsonify({"error": "Roll number already exists"}), 400

    student = Student(
        roll_no=data["roll_no"],
        name=data["name"],
        class_name=data.get("class_name", ""),
        photo_folder=f"dataset/{data['roll_no']}"
    )
    db.session.add(student)
    db.session.commit()
    return jsonify({"id": student.id, "roll_no": student.roll_no, "name": student.name}), 201


@app.route("/api/attendance/today", methods=["GET"])
def attendance_today():
    today = date.today()
    logs = (
        db.session.query(AttendanceLog, Student)
        .join(Student, AttendanceLog.student_id == Student.id)
        .filter(AttendanceLog.attendance_date == today)
        .all()
    )
    return jsonify([
        {
            "roll_no": s.roll_no,
            "name": s.name,
            "class_name": s.class_name,
            "entry_time": log.entry_time.strftime("%H:%M:%S") if log.entry_time else None,
            "final_exit_time": log.final_exit_time.strftime("%H:%M:%S") if log.final_exit_time else None,
            "total_break_minutes": float(log.total_break_minutes or 0),
            "total_present_minutes": float(log.total_present_minutes or 0),
            "status": log.status,
        }
        for log, s in logs
    ])


@app.route("/api/activity", methods=["GET"])
def activity_feed():
    limit = int(request.args.get("limit", 20))
    events = get_recent_events(limit=limit)
    return jsonify([
        {
            "roll_no": s.roll_no,
            "name": s.name,
            "event_type": e.event_type,
            "event_time": e.event_time.strftime("%H:%M:%S"),
        }
        for e, s in events
    ])


@app.route("/api/reports", methods=["GET"])
def reports():
    """
    Query params:
      from=YYYY-MM-DD, to=YYYY-MM-DD (defaults to last 7 days)
      student_id=<int> (optional filter)
    """
    to_str = request.args.get("to")
    from_str = request.args.get("from")
    to_date = datetime.strptime(to_str, "%Y-%m-%d").date() if to_str else date.today()
    from_date = datetime.strptime(from_str, "%Y-%m-%d").date() if from_str else to_date - timedelta(days=6)

    query = (
        db.session.query(AttendanceLog, Student)
        .join(Student, AttendanceLog.student_id == Student.id)
        .filter(AttendanceLog.attendance_date.between(from_date, to_date))
    )
    student_id = request.args.get("student_id")
    if student_id:
        query = query.filter(AttendanceLog.student_id == int(student_id))

    logs = query.order_by(AttendanceLog.attendance_date).all()
    return jsonify([
        {
            "date": log.attendance_date.isoformat(),
            "roll_no": s.roll_no,
            "name": s.name,
            "entry_time": log.entry_time.strftime("%H:%M:%S") if log.entry_time else None,
            "final_exit_time": log.final_exit_time.strftime("%H:%M:%S") if log.final_exit_time else None,
            "total_break_minutes": float(log.total_break_minutes or 0),
            "total_present_minutes": float(log.total_present_minutes or 0),
            "status": log.status,
        }
        for log, s in logs
    ])


@app.route("/dashboard")
def dashboard():
    """Teacher/admin view: today's entry, exit, break and total time per student."""
    today = date.today()
    logs = (
        db.session.query(AttendanceLog, Student)
        .join(Student, AttendanceLog.student_id == Student.id)
        .filter(AttendanceLog.attendance_date == today)
        .all()
    )
    return render_template("dashboard.html", logs=logs, today=today)


@app.route("/")
def home():
    return render_template("dashboard.html", logs=[], today=date.today())


if __name__ == "__main__":
    with app.app_context():
        db.create_all()
    app.run(debug=True)
