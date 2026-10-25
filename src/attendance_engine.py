"""
src/attendance_engine.py
STEP 3 of the pipeline: loads the trained Keras/TensorFlow model and uses it,
together with face_detector.py, to identify WHO is in front of the camera.
This module never touches the database directly - it just answers
"which student, with what confidence" and the Flask route decides whether
that counts as an entry / exit / break event (see src/db.py).
"""

import os
import sys
import json
import numpy as np
import cv2
import tensorflow as tf

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from config import MODEL_PATH, LABELS_PATH, FACE_IMG_SIZE, RECOGNITION_CONFIDENCE_THRESHOLD
from src.face_detector import detect_faces, crop_face


class AttendanceEngine:
    def __init__(self):
        if not os.path.exists(MODEL_PATH):
            raise FileNotFoundError(
                "Trained model not found. Run src/train_model.py first."
            )
        self.model = tf.keras.models.load_model(MODEL_PATH)

        with open(LABELS_PATH) as f:
            self.label_map = json.load(f)   # {"0": "21CS045", "1": "21CS046", ...}

    def recognize(self, frame):
        """
        Runs detection + Keras classification on a single frame.
        Returns a list of dicts: [{roll_no, confidence, box}, ...]
        """
        results = []
        faces = detect_faces(frame)

        for box in faces:
            face_img = crop_face(frame, box, FACE_IMG_SIZE)
            face_array = face_img.astype("float32") / 255.0
            face_array = np.expand_dims(face_array, axis=0)   # (1, H, W, 3)

            predictions = self.model.predict(face_array, verbose=0)[0]
            class_idx = int(np.argmax(predictions))
            confidence = float(predictions[class_idx])

            if confidence >= RECOGNITION_CONFIDENCE_THRESHOLD:
                roll_no = self.label_map[str(class_idx)]
                results.append({"roll_no": roll_no, "confidence": confidence, "box": box})
            else:
                results.append({"roll_no": None, "confidence": confidence, "box": box})

        return results

    def recognize_from_path(self, image_path):
        """Convenience wrapper used by the Flask API when a JPEG is uploaded."""
        frame = cv2.imread(image_path)
        return self.recognize(frame)
