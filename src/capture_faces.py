"""
src/capture_faces.py
STEP 1 of the pipeline: register a new student by capturing face samples
from the webcam. Run this once per student before training the model.

Usage:
    python src/capture_faces.py --roll 21CS045 --name "Rahul Sharma"
"""

import os
import sys
import argparse
import cv2

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from config import DATASET_DIR, ENTRY_CAMERA_INDEX, IMAGES_PER_STUDENT, FACE_IMG_SIZE
from src.face_detector import detect_faces, crop_face


def capture_student_faces(roll_no, name):
    student_dir = os.path.join(DATASET_DIR, roll_no)
    os.makedirs(student_dir, exist_ok=True)

    cam = cv2.VideoCapture(ENTRY_CAMERA_INDEX)
    count = 0

    print(f"[INFO] Capturing faces for {name} ({roll_no}). Press 'q' to stop early.")

    while count < IMAGES_PER_STUDENT:
        ok, frame = cam.read()
        if not ok:
            break

        faces = detect_faces(frame)
        for box in faces:
            x, y, w, h = box
            face_img = crop_face(frame, box, FACE_IMG_SIZE)
            file_path = os.path.join(student_dir, f"{roll_no}_{count}.jpg")
            cv2.imwrite(file_path, face_img)
            count += 1

            cv2.rectangle(frame, (x, y), (x + w, y + h), (0, 255, 0), 2)
            cv2.putText(frame, f"Captured: {count}/{IMAGES_PER_STUDENT}",
                        (10, 30), cv2.FONT_HERSHEY_SIMPLEX, 0.8, (0, 255, 0), 2)
            break  # only take one face per frame to avoid duplicates

        cv2.imshow("Registering Student - press q to quit", frame)
        if cv2.waitKey(1) & 0xFF == ord("q"):
            break

    cam.release()
    cv2.destroyAllWindows()
    print(f"[INFO] Done. Saved {count} images to {student_dir}")
    return student_dir


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--roll", required=True, help="Student roll number, used as folder/class name")
    parser.add_argument("--name", required=True, help="Student full name")
    args = parser.parse_args()

    capture_student_faces(args.roll, args.name)
