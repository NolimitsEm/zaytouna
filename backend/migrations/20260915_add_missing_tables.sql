-- Select the existing application database in your SQL client before running.
-- Back up the VPS database first. No DROP, DELETE, UPDATE, or account changes.
-- Matches the three server.js tables absent from the older bundled SQL file.
-- Existing tables are left unchanged; this does not repair an incompatible schema.

CREATE TABLE IF NOT EXISTS exercise_submissions (
  id VARCHAR(140) NOT NULL PRIMARY KEY,
  course_id VARCHAR(100) NOT NULL DEFAULT '',
  user_id VARCHAR(80) NOT NULL DEFAULT '',
  student_name VARCHAR(255) NOT NULL DEFAULT '',
  submitted_at VARCHAR(40) NOT NULL DEFAULT '',
  sort_index INT NOT NULL DEFAULT 0,
  payload LONGTEXT NOT NULL,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_exercise_submissions_course (course_id),
  INDEX idx_exercise_submissions_user (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS teacher_absences (
  id VARCHAR(140) NOT NULL PRIMARY KEY,
  schedule_id VARCHAR(100) NOT NULL DEFAULT '',
  teacher_id VARCHAR(80) NOT NULL DEFAULT '',
  absence_date VARCHAR(40) NOT NULL DEFAULT '',
  sort_index INT NOT NULL DEFAULT 0,
  payload LONGTEXT NOT NULL,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_teacher_absences_schedule (schedule_id),
  INDEX idx_teacher_absences_teacher (teacher_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS general_plans (
  id VARCHAR(140) NOT NULL PRIMARY KEY,
  niveau_id VARCHAR(80) NOT NULL DEFAULT '',
  groupe_id VARCHAR(80) NOT NULL DEFAULT '',
  sort_index INT NOT NULL DEFAULT 0,
  payload LONGTEXT NOT NULL,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_general_plans_class (niveau_id, groupe_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
