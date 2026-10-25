-- ============================================================
-- Student Attendance Management System - Database Schema
-- ============================================================

CREATE DATABASE IF NOT EXISTS attendance_system;
USE attendance_system;

-- 1. Students master table
CREATE TABLE IF NOT EXISTS students (
    id              INT AUTO_INCREMENT PRIMARY KEY,
    roll_no         VARCHAR(20) NOT NULL UNIQUE,
    name            VARCHAR(100) NOT NULL,
    class_name      VARCHAR(50),
    photo_folder    VARCHAR(255),        -- path to the captured face dataset for this student
    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. One row per student per day -> the master attendance record
CREATE TABLE IF NOT EXISTS attendance_logs (
    id                  INT AUTO_INCREMENT PRIMARY KEY,
    student_id          INT NOT NULL,
    attendance_date     DATE NOT NULL,
    entry_time          DATETIME NULL,        -- first recognized entry of the day
    final_exit_time     DATETIME NULL,        -- last recognized exit of the day
    total_break_minutes DECIMAL(6,2) DEFAULT 0,
    total_present_minutes DECIMAL(6,2) DEFAULT 0,   -- (final_exit - entry) - total_break
    status              ENUM('Present','Partial','Absent') DEFAULT 'Absent',
    FOREIGN KEY (student_id) REFERENCES students(id),
    UNIQUE KEY uniq_student_day (student_id, attendance_date)
);

-- 3. Every washroom / short break is logged here, linked to the day's attendance row
CREATE TABLE IF NOT EXISTS break_logs (
    id                  INT AUTO_INCREMENT PRIMARY KEY,
    attendance_log_id   INT NOT NULL,
    break_out_time      DATETIME NOT NULL,
    break_in_time       DATETIME NULL,
    break_duration_minutes DECIMAL(6,2) NULL,
    FOREIGN KEY (attendance_log_id) REFERENCES attendance_logs(id)
);

-- 4. Raw recognition events - powers the "live activity" feed on the frontend
CREATE TABLE IF NOT EXISTS recognition_events (
    id              INT AUTO_INCREMENT PRIMARY KEY,
    student_id      INT NOT NULL,
    event_type      ENUM('entry','break_out','break_in','final_exit','unrecognized') NOT NULL,
    event_time      DATETIME DEFAULT CURRENT_TIMESTAMP,
    confidence      DECIMAL(5,4),
    FOREIGN KEY (student_id) REFERENCES students(id)
);

-- 5. Configurable system settings (e.g. minimum minutes required to count as Present)
CREATE TABLE IF NOT EXISTS settings (
    setting_key     VARCHAR(50) PRIMARY KEY,
    setting_value   VARCHAR(100) NOT NULL
);

INSERT INTO settings (setting_key, setting_value) VALUES
    ('min_present_minutes', '180'),     -- below this -> 'Partial' instead of 'Present'
    ('max_break_minutes', '20')         -- alert if a single break exceeds this
ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value);
