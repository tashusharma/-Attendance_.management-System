# Student Attendance Management System — Face Recognition + Entry/Exit/Break Time Tracking

A complete, runnable starter project. Face detection runs on OpenCV; **all recognition
is done with a TensorFlow/Keras CNN — no other deep learning framework is used anywhere
in this codebase.**

```
attendance-system/
├── app.py                     # Flask backend + JSON APIs + server-rendered dashboard
├── config.py                  # all paths, thresholds, DB credentials in one place
├── requirements.txt
├── database/
│   └── schema.sql              # MySQL schema: students, attendance_logs, break_logs, recognition_events
├── dataset/                    # auto-created — one folder per student, full of face crops
├── models/                     # auto-created — trained .h5 model + labels.json
├── src/
│   ├── face_detector.py        # OpenCV Haar Cascade — WHERE is a face
│   ├── capture_faces.py        # Step 1: register a student (webcam capture)
│   ├── train_model.py          # Step 2: train the Keras CNN — WHO is the face
│   ├── attendance_engine.py    # Step 3: loads the model, runs live recognition
│   └── db.py                   # Step 4: entry/exit/break business logic + SQLAlchemy models
├── templates/dashboard.html    # lightweight server-rendered fallback view
├── static/style.css
└── frontend/                   # React + Tailwind admin panel (separate app, talks to the same API)
    ├── package.json
    ├── vite.config.js / tailwind.config.js / postcss.config.js
    └── src/
        ├── api.js              # axios client for every Flask endpoint
        ├── components/         # Sidebar, Topbar (live clock), SummaryCard, StatusBadge, ActivityTicker
        └── pages/               # Dashboard, Students, LiveRecognition, Reports
```

## 1. How the time-tracking logic actually works

This is the core idea of the whole system, so understand it before touching code:

- **Entry camera** (classroom door, "in" side): every recognized face triggers
  `handle_entry_event()`.
  - First recognition of the day → sets `entry_time`.
  - If the student had an **open break** (went out, hasn't come back) → this
    recognition closes that break and adds its duration to `total_break_minutes`.
- **Exit camera** (classroom door, "out" side): every recognized face triggers
  `handle_exit_event()`.
  - Called with `final=false` → treated as a **temporary exit** (washroom/break):
    opens a new row in `break_logs` with `break_out_time = now`.
  - Called with `final=true` (end of period/day) → sets `final_exit_time` and
    triggers `_recalculate_totals()`:
    ```
    total_present_minutes = (final_exit_time - entry_time) - total_break_minutes
    status = "Present" if total_present_minutes >= MIN_PRESENT_MINUTES else "Partial"
    ```
- If a student is never recognized at all that day, their row simply stays
  `status = "Absent"`.

All of this lives in `src/db.py` — that file is the single source of truth for
every time calculation, so you only ever need to look in one place.

## 2. Prerequisites

- Python 3.10 or 3.11 (TensorFlow 2.15 supports these well)
- MySQL Server 8.x installed and running
- A webcam (laptop camera is fine for development; use two USB webcams for a
  real entry + exit setup later)

## 3. Setup — step by step

```bash
# 1. Clone/copy this folder, then create a virtual environment
python -m venv venv
source venv/bin/activate          # Windows: venv\Scripts\activate

# 2. Install dependencies
pip install -r requirements.txt

# 3. Create the database
mysql -u root -p < database/schema.sql

# 4. Update config.py with your MySQL password
#    (DB_USER, DB_PASSWORD, DB_HOST, DB_NAME)
```

## 4. Register students (Step 1 of the pipeline)

Run this once per student. It opens the webcam and saves ~60 cropped face
images into `dataset/<roll_no>/`.

```bash
python src/capture_faces.py --roll 21CS045 --name "Rahul Sharma"
python src/capture_faces.py --roll 21CS046 --name "Anita Verma"
```

Then add the same students to the database (you can do this with a tiny script
or directly in MySQL):

```sql
INSERT INTO students (roll_no, name, class_name, photo_folder)
VALUES ('21CS045', 'Rahul Sharma', 'CS-A', 'dataset/21CS045'),
       ('21CS046', 'Anita Verma',  'CS-A', 'dataset/21CS046');
```

Repeat `capture_faces.py` for every student you want the system to recognize.
**Minimum 2 students with ~60 images each** is recommended before training,
otherwise the CNN has nothing to discriminate between.

## 5. Train the Keras/TensorFlow model (Step 2)

```bash
python src/train_model.py
```

What this does:
- Loads every `dataset/<roll_no>/*.jpg` folder with `ImageDataGenerator`
  (this is the Keras data-loading + augmentation utility — rotation, zoom,
  shift, flip — so the model generalizes to slightly different angles/lighting).
- Builds a CNN with the **Keras Sequential API** (`Conv2D → BatchNorm → MaxPool`
  ×3, then `Dense → Dropout → Dense(softmax)`).
- Trains with `EarlyStopping` + `ModelCheckpoint` (both Keras callbacks) so the
  best-performing epoch is the one actually saved.
- Saves `models/face_cnn_model.h5` and `models/labels.json`
  (maps the CNN's output index back to a roll number).

Re-run this script any time you add a new student or recapture images.

## 6. Run the application (Step 3 + 4)

```bash
python app.py
```

This starts Flask on `http://127.0.0.1:5000`. On first run it also creates all
tables in MySQL via `db.create_all()`.

Open the dashboard:
```
http://127.0.0.1:5000/dashboard
```

## 7. Testing the entry/exit APIs without physical cameras yet

You can simulate camera frames using `curl` and any photo of a registered
student, before wiring up real hardware:

```bash
# Student walks IN
curl -X POST -F "frame=@test_images/rahul.jpg" \
  http://127.0.0.1:5000/api/recognize/entry

# Student steps out for washroom/break
curl -X POST -F "frame=@test_images/rahul.jpg" \
  http://127.0.0.1:5000/api/recognize/exit

# Student comes back from the break (hit entry endpoint again)
curl -X POST -F "frame=@test_images/rahul.jpg" \
  http://127.0.0.1:5000/api/recognize/entry

# End of class - final exit
curl -X POST -F "frame=@test_images/rahul.jpg" \
  "http://127.0.0.1:5000/api/recognize/exit?final=true"
```

Refresh `/dashboard` after the final exit call — you'll see entry time, exit
time, total break minutes, total present minutes, and the computed status
(Present / Partial / Absent) for that student.

## 8. React + Tailwind Admin Panel (`frontend/`)

A separate, modern admin panel lives in `frontend/`. It talks to the exact
same Flask API (CORS is already enabled in `app.py`) — the Flask server is
still the only thing that touches the database or the Keras model.

**Pages:** Dashboard (KPI cards + today's table + live gate-activity feed),
Students (list + register new student), Live Recognition (browser webcam →
captures a frame → calls `/api/recognize/entry` or `/api/recognize/exit`),
Reports (date-range table + chart of total present minutes per student).

```bash
cd frontend
npm install
cp .env.example .env        # points VITE_API_BASE_URL at your Flask server
npm run dev
```

Open `http://localhost:5173`. Make sure `python app.py` is running on
`http://127.0.0.1:5000` at the same time — the React app is just a client,
it has no logic of its own beyond calling these endpoints:

| Endpoint | Method | Purpose |
|---|---|---|
| `/api/students` | GET / POST | list registered students / register a new one |
| `/api/attendance/today` | GET | today's entry/exit/break/total-time table |
| `/api/activity` | GET | last N recognition events (powers the live feed) |
| `/api/reports?from=&to=&student_id=` | GET | historical attendance for a date range |
| `/api/recognize/entry` | POST (`frame` file) | entry-camera recognition |
| `/api/recognize/exit?final=true/false` | POST (`frame` file) | exit-camera recognition |

> Registering a student from the React UI only creates the database row.
> You still need to run `capture_faces.py` + `train_model.py` on the server
> for that student's face to actually be recognizable — the Students page
> shows you the exact commands right after you add someone.

## 9. Wiring up real cameras (production step)

Replace the `curl`/manual-upload step with a small client script that:
1. Opens `cv2.VideoCapture(ENTRY_CAMERA_INDEX)` on a Raspberry Pi or PC near
   the entry door, grabs a frame every 1–2 seconds, and POSTs it to
   `/api/recognize/entry`.
2. Does the same with `EXIT_CAMERA_INDEX` near the exit door, posting to
   `/api/recognize/exit` (and to `?final=true` after the last period of the
   day, e.g. on a timer or a teacher's "End Day" button in the dashboard).

Both camera indices and all thresholds are already centralized in `config.py`
so you don't have to touch the rest of the code to deploy this on real hardware.

## 10. Common issues

| Problem | Fix |
|---|---|
| `FileNotFoundError: Trained model not found` | Run `src/train_model.py` after registering at least 2 students |
| Low recognition accuracy | Capture more images per student (100+), ensure good, even lighting during `capture_faces.py` |
| Every face shows `unrecognized` | Lower `RECOGNITION_CONFIDENCE_THRESHOLD` slightly in `config.py`, or retrain with more varied images |
| MySQL connection error | Double check `DB_USER` / `DB_PASSWORD` / `DB_HOST` in `config.py` and that MySQL service is running |

## 11. Next steps (optional improvements)

- Swap the single-CNN classifier for a Keras-based embedding model
  (still pure TensorFlow/Keras) if you outgrow simple softmax classification
  with many students.
- Add a `/api/end-day` route that loops over all students and calls
  `handle_exit_event(student_id, final_exit=True)` automatically at a fixed time.
- Add email/SMS alerts when `total_break_minutes` exceeds `MAX_BREAK_MINUTES`.
