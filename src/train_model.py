"""
src/train_model.py
STEP 2 of the pipeline: trains a Keras CNN classifier on every student folder
inside dataset/. This is the ONLY place TensorFlow/Keras model-building happens,
exactly as required: no other deep learning framework is used anywhere.

Usage:
    python src/train_model.py
"""

import os
import sys
import json
import numpy as np

import tensorflow as tf
from tensorflow.keras.models import Sequential
from tensorflow.keras.layers import (
    Conv2D, MaxPooling2D, Flatten, Dense, Dropout, BatchNormalization
)
from tensorflow.keras.preprocessing.image import ImageDataGenerator
from tensorflow.keras.callbacks import EarlyStopping, ModelCheckpoint

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from config import DATASET_DIR, MODEL_PATH, LABELS_PATH, FACE_IMG_SIZE, MODEL_DIR


def build_cnn(num_classes, input_shape):
    """A compact CNN classifier built with the Keras Sequential API."""
    model = Sequential([
        Conv2D(32, (3, 3), activation="relu", input_shape=input_shape),
        BatchNormalization(),
        MaxPooling2D(2, 2),

        Conv2D(64, (3, 3), activation="relu"),
        BatchNormalization(),
        MaxPooling2D(2, 2),

        Conv2D(128, (3, 3), activation="relu"),
        BatchNormalization(),
        MaxPooling2D(2, 2),

        Flatten(),
        Dense(256, activation="relu"),
        Dropout(0.4),
        Dense(num_classes, activation="softmax")   # one output unit per registered student
    ])

    model.compile(
        optimizer=tf.keras.optimizers.Adam(learning_rate=0.0005),
        loss="categorical_crossentropy",
        metrics=["accuracy"]
    )
    return model


def train():
    os.makedirs(MODEL_DIR, exist_ok=True)
    input_shape = (FACE_IMG_SIZE[0], FACE_IMG_SIZE[1], 3)

    # Keras ImageDataGenerator handles loading + augmentation directly from
    # the dataset/<roll_no>/*.jpg folder structure created by capture_faces.py
    datagen = ImageDataGenerator(
        rescale=1.0 / 255,
        rotation_range=10,
        zoom_range=0.15,
        width_shift_range=0.1,
        height_shift_range=0.1,
        horizontal_flip=True,
        validation_split=0.2
    )

    train_data = datagen.flow_from_directory(
        DATASET_DIR,
        target_size=FACE_IMG_SIZE,
        batch_size=16,
        class_mode="categorical",
        subset="training"
    )

    val_data = datagen.flow_from_directory(
        DATASET_DIR,
        target_size=FACE_IMG_SIZE,
        batch_size=16,
        class_mode="categorical",
        subset="validation"
    )

    num_classes = train_data.num_classes
    print(f"[INFO] Training CNN on {num_classes} registered students...")

    model = build_cnn(num_classes, input_shape)

    callbacks = [
        EarlyStopping(monitor="val_loss", patience=5, restore_best_weights=True),
        ModelCheckpoint(MODEL_PATH, monitor="val_accuracy", save_best_only=True)
    ]

    model.fit(
        train_data,
        validation_data=val_data,
        epochs=30,
        callbacks=callbacks
    )

    # Save class index -> roll_no mapping so the recognition script can
    # translate the CNN's softmax output back into a student identity.
    label_map = {v: k for k, v in train_data.class_indices.items()}
    with open(LABELS_PATH, "w") as f:
        json.dump(label_map, f, indent=2)

    print(f"[INFO] Model saved to {MODEL_PATH}")
    print(f"[INFO] Labels saved to {LABELS_PATH}")


if __name__ == "__main__":
    train()
