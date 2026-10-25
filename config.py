"""
config.py
Central configuration for the whole project.
Edit this file only when changing folder paths, camera index, or business rules.
"""

import os

BASE_DIR = os.path.dirname(os.path.abspath(__file__))

# ---- Folder paths ----
DATASET_DIR = os.path.join(BASE_DIR, "dataset")     # raw face images per student
MODEL_DIR = os.path.join(BASE_DIR, "models")
MODEL_PATH = os.path.join(MODEL_DIR, "face_cnn_model.h5")
LABELS_PATH = os.path.join(MODEL_DIR, "labels.json")  # maps class index -> roll_no

# ---- Camera ----
ENTRY_CAMERA_INDEX = 0     # webcam index for the entry-point camera
EXIT_CAMERA_INDEX = 0      # change to 1 if you use a second physical camera for exit

# ---- Face detection / recognition ----
FACE_IMG_SIZE = (128, 128)         # input size fed to the Keras CNN
IMAGES_PER_STUDENT = 60            # how many face samples to capture during registration
RECOGNITION_CONFIDENCE_THRESHOLD = 0.75   # softmax probability needed to accept a match

# ---- Time tracking business rules ----
MIN_PRESENT_MINUTES = 0          # minimum net minutes in class to be marked "Present"
MAX_BREAK_MINUTES = 20             # a single break longer than this raises an alert flag

# ---- Database (SQLite or MySQL via SQLAlchemy) ----
USE_MYSQL = True

if USE_MYSQL:
    DB_USER = "root"
    DB_PASSWORD = "root"
    DB_HOST = "localhost"
    DB_NAME = "attendance_system"
    SQLALCHEMY_DATABASE_URI = f"mysql+pymysql://{DB_USER}:{DB_PASSWORD}@{DB_HOST}/{DB_NAME}"
else:
    SQLALCHEMY_DATABASE_URI = f"sqlite:///{os.path.join(BASE_DIR, 'attendance_system.db')}"

