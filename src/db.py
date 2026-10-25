"""
src/db.py
SQLAlchemy models + helper functions for all attendance/time-tracking logic.
Keeping every "entry time / exit time / break time" calculation in ONE place
makes the rest of the codebase (Flask routes, recognition script) very thin.
"""

from datetime import datetime, date
from flask_sqlalchemy import SQLAlchemy

db = SQLAlchemy()


class Student(db.Model):
    __tablename__ = "students"
    id = db.Column(db.Integer, primary_key=True)
    roll_no = db.Column(db.String(20), unique=True, nullable=False)
    name = db.Column(db.String(100), nullable=False)
    class_name = db.Column(db.String(50))
    photo_folder = db.Column(db.String(255))
    created_at = db.Column(db.DateTime, default=datetime.utcnow)


class AttendanceLog(db.Model):
    __tablename__ = "attendance_logs"
    id = db.Column(db.Integer, primary_key=True)
    student_id = db.Column(db.Integer, db.ForeignKey("students.id"), nullable=False)
    attendance_date = db.Column(db.Date, nullable=False)
    entry_time = db.Column(db.DateTime, nullable=True)
    final_exit_time = db.Column(db.DateTime, nullable=True)
    total_break_minutes = db.Column(db.Numeric(6, 2), default=0)
    total_present_minutes = db.Column(db.Numeric(6, 2), default=0)
    status = db.Column(db.Enum("Present", "Partial", "Absent"), default="Absent")

    breaks = db.relationship("BreakLog", backref="attendance_log", lazy=True)


class BreakLog(db.Model):
    __tablename__ = "break_logs"
    id = db.Column(db.Integer, primary_key=True)
    attendance_log_id = db.Column(db.Integer, db.ForeignKey("attendance_logs.id"), nullable=False)
    break_out_time = db.Column(db.DateTime, nullable=False)
    break_in_time = db.Column(db.DateTime, nullable=True)
    break_duration_minutes = db.Column(db.Numeric(6, 2), nullable=True)


class RecognitionEvent(db.Model):
    """Raw log of every camera recognition - powers the frontend's live activity feed."""
    __tablename__ = "recognition_events"
    id = db.Column(db.Integer, primary_key=True)
    student_id = db.Column(db.Integer, db.ForeignKey("students.id"), nullable=False)
    event_type = db.Column(db.Enum("entry", "break_out", "break_in", "final_exit", "unrecognized"), nullable=False)
    event_time = db.Column(db.DateTime, default=datetime.utcnow)
    confidence = db.Column(db.Numeric(5, 4))


# ----------------------------------------------------------------------
# Core helper functions used by the recognition pipeline (Flask routes)
# ----------------------------------------------------------------------

def get_or_create_today_log(student_id):
    """Return today's attendance row for a student, creating it on first recognition."""
    today = date.today()
    log = AttendanceLog.query.filter_by(student_id=student_id, attendance_date=today).first()
    if log is None:
        log = AttendanceLog(student_id=student_id, attendance_date=today, status="Absent")
        db.session.add(log)
        db.session.commit()
    return log


def handle_entry_event(student_id):
    """
    Called every time a face is recognized at the ENTRY camera.
    - First recognition of the day -> sets entry_time.
    - If the student was on a break (open break_log with no break_in_time) -> closes the break.
    """
    log = get_or_create_today_log(student_id)
    now = datetime.now()

    open_break = BreakLog.query.filter_by(
        attendance_log_id=log.id, break_in_time=None
    ).first()

    if open_break is not None:
        # Student is RETURNING from a washroom/break
        open_break.break_in_time = now
        duration_minutes = round((now - open_break.break_out_time).total_seconds() / 60, 2)
        open_break.break_duration_minutes = duration_minutes
        log.total_break_minutes = float(log.total_break_minutes or 0) + duration_minutes
        db.session.add(RecognitionEvent(student_id=student_id, event_type="break_in"))
        db.session.commit()
        return {"event": "break_in", "break_duration_minutes": duration_minutes}

    if log.entry_time is None:
        # First time entering the classroom today
        log.entry_time = now
        db.session.add(RecognitionEvent(student_id=student_id, event_type="entry"))
        db.session.commit()
        return {"event": "entry", "entry_time": now.strftime("%H:%M:%S")}

    return {"event": "already_inside"}


def handle_exit_event(student_id, final_exit=False):
    """
    Called every time a face is recognized at the EXIT camera.
    - final_exit=True  -> student is leaving for the day (end of class) -> recompute totals.
    - final_exit=False -> student is stepping out temporarily (washroom/break) -> open a BreakLog.
    """
    log = get_or_create_today_log(student_id)
    now = datetime.now()

    if final_exit:
        log.final_exit_time = now
        _recalculate_totals(log)
        db.session.add(RecognitionEvent(student_id=student_id, event_type="final_exit"))
        db.session.commit()
        return {"event": "final_exit", "exit_time": now.strftime("%H:%M:%S"),
                "total_present_minutes": float(log.total_present_minutes),
                "status": log.status}

    # Temporary exit -> open a new break log entry
    new_break = BreakLog(attendance_log_id=log.id, break_out_time=now)
    db.session.add(new_break)
    db.session.add(RecognitionEvent(student_id=student_id, event_type="break_out"))
    db.session.commit()
    return {"event": "break_out", "break_out_time": now.strftime("%H:%M:%S")}


def get_recent_events(limit=20):
    """Latest recognition events joined with student info, newest first."""
    rows = (
        db.session.query(RecognitionEvent, Student)
        .join(Student, RecognitionEvent.student_id == Student.id)
        .order_by(RecognitionEvent.event_time.desc())
        .limit(limit)
        .all()
    )
    return rows


def _recalculate_totals(log):
    """Total Present Minutes = (final_exit - entry) - total_break_minutes."""
    from config import MIN_PRESENT_MINUTES

    if log.entry_time and log.final_exit_time:
        gross_minutes = (log.final_exit_time - log.entry_time).total_seconds() / 60
        net_minutes = max(gross_minutes - float(log.total_break_minutes or 0), 0)
        log.total_present_minutes = round(net_minutes, 2)
        log.status = "Present" if net_minutes >= MIN_PRESENT_MINUTES else "Partial"
    else:
        log.status = "Absent"
