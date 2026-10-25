"""
src/face_detector.py
Pure OpenCV face detector (Haar Cascade). Kept separate from the Keras/TensorFlow
recognition model so the detection step never depends on the deep learning stack -
it only finds WHERE a face is; the CNN model decides WHO it is.
"""

import cv2

_cascade_path = cv2.data.haarcascades + "haarcascade_frontalface_default.xml"
_face_cascade = cv2.CascadeClassifier(_cascade_path)


def detect_faces(frame):
    """
    Input : a BGR frame (numpy array) from OpenCV's VideoCapture.
    Output: list of (x, y, w, h) bounding boxes, one per detected face.
    """
    gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
    faces = _face_cascade.detectMultiScale(
        gray,
        scaleFactor=1.2,
        minNeighbors=5,
        minSize=(80, 80)
    )
    return faces


def crop_face(frame, box, target_size):
    """Crop a detected face from the frame and resize it for the Keras model."""
    x, y, w, h = box
    face_img = frame[y:y + h, x:x + w]
    face_img = cv2.resize(face_img, target_size)
    return face_img
