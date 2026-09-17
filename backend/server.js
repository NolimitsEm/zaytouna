import http from "node:http";
import crypto from "node:crypto";
import { mkdir, readFile, writeFile, rename, unlink } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";
import mysql from "mysql2/promise";
import nodemailer from "nodemailer";
import { createLoginLimiter } from "./login-security.js";
import { changeAccountAccess } from "./account-access.js";
import { classroomEntrySettings, ensureClassroomAnnotationPolicy } from "./zoom-classroom-policy.js";
import { stateRevision, stateRevisions, assertStateRevisions, staleStateError } from "./state-revisions.js";
import { withoutAnswerKeys, targetsStudent, validateStudentSubmission, validateTeacherAbsence } from "./academic-policy.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, ".env") });
const dataDir = path.join(__dirname, "data");
const emailSettingsPath = path.join(dataDir, "email-settings.json");
const activationInvitesPath = path.join(dataDir, "activation-invites.json");
const zoomRecordingsPath = path.join(dataDir, "zoom-recordings.json");
const port = Number(process.env.PORT || 3001);
const host = String(process.env.HOST || "0.0.0.0").trim();
const zoomApiBaseUrl = "https://api.zoom.us/v2";
const zoomOauthTokenUrl = "https://zoom.us/oauth/token";
const defaultZoomTimezone = process.env.ZOOM_TIMEZONE || "Africa/Tunis";
const defaultZoomDurationMinutes = Number(process.env.ZOOM_DEFAULT_DURATION_MINUTES || 60);
const sessionCookieName = "zaytouna_session";
const sessionTtlSeconds = Number(process.env.SESSION_TTL_SECONDS || 7 * 24 * 60 * 60);
const configuredSessionSecret = String(process.env.JWT_SECRET || process.env.SESSION_SECRET || "").trim();
if (process.env.NODE_ENV === "production" && configuredSessionSecret.length < 64) {
  throw new Error("JWT_SECRET must contain at least 64 characters in production.");
}
const sessionSecret = configuredSessionSecret || crypto.randomBytes(32).toString("hex");
const activationTokenTtlSeconds = Number(process.env.ACTIVATION_TOKEN_TTL_SECONDS || 24 * 60 * 60);
const maxRequestBodyBytes = Number(process.env.MAX_REQUEST_BODY_BYTES || 25 * 1024 * 1024);
const loginWindowMs = Number(process.env.LOGIN_RATE_LIMIT_WINDOW_MS || 15 * 60 * 1000);
const loginBlockMs = Number(process.env.LOGIN_RATE_LIMIT_BLOCK_MS || 15 * 60 * 1000);
// Wrong credentials trigger a temporary throttle, never permanent disablement.
const loginMaxAttempts = Number(process.env.LOGIN_RATE_LIMIT_MAX_ATTEMPTS || 5);
let zoomTokenCache = null;
let mysqlPool = null;
let mysqlReady = null;
let appStateWriteQueue = Promise.resolve();
const loginLimiter = createLoginLimiter({ maxAttempts: loginMaxAttempts, windowMs: loginWindowMs, blockMs: loginBlockMs });

const appStateKeys = new Set([
  "acceptedUsers",
  "activityLog",
  "correctedExamExamplesSeededV1",
  "deletedUserIds",
  "emailSettings",
  "exerciseSubmissions",
  "examCorrectionExamplesSeeded",
  "examDataResetVersion",
  "examSubmissions",
  "gradeSettings",
  "generalPlans",
  "ilyasCompletedSemesterWorkV1",
  "ilyasDemoRestoredV1",
  "lessonSessionLog",
  "managedExams",
  "managedGroupes",
  "managedNiveaux",
  "managedQuestionnaires",
  "managedSchedule",
  "managedSubjects",
  "publicContent",
  "questionnaireResultExamplesSeededV1",
  "questionnaireSubmissions",
  "registrationRequests",
  "subjectRedirects",
  "teacherCourses",
  "teacherAbsences"
]);

const defaultEmailSettings = {
  fromName: "مشيخة التعليم الزيتوني وفروعه",
  fromEmail: "",
  smtpHost: "smtp.gmail.com",
  smtpPort: "587",
  appPassword: "",
  autoSendActivation: true
};

const emailLogoAttachments = [
  {
    filename: "email-signature-logo-1.png",
    path: path.join(__dirname, "assets", "email-signature-logo-1.png"),
    cid: "email-signature-logo-1@zaytouna-platform"
  },
  {
    filename: "email-signature-logo-2.png",
    path: path.join(__dirname, "assets", "email-signature-logo-2.png"),
    cid: "email-signature-logo-2@zaytouna-platform"
  }
];

async function ensureDataDir() {
  await mkdir(dataDir, { recursive: true });
}

async function readJson(filePath, fallback) {
  try {
    return JSON.parse(await readFile(filePath, "utf8"));
  } catch {
    return structuredClone(fallback);
  }
}

async function writeJson(filePath, value) {
  await ensureDataDir();
  await writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

function mysqlConfig() {
  return {
    host: process.env.MYSQL_HOST || "127.0.0.1",
    port: Number(process.env.MYSQL_PORT || 3306),
    user: process.env.MYSQL_USER || "root",
    password: process.env.MYSQL_PASSWORD || "",
    database: process.env.MYSQL_DATABASE || "zaytouna_platform"
  };
}

function shouldAutoCreateMysqlDatabase() {
  const value = String(process.env.MYSQL_AUTO_CREATE_DATABASE || "true").trim().toLowerCase();
  return !["0", "false", "no"].includes(value);
}

function escapeMysqlIdentifier(value) {
  return String(value).replaceAll("`", "``");
}

async function ensureMysqlPool() {
  if (mysqlPool) return mysqlPool;
  if (!mysqlReady) {
    mysqlReady = (async () => {
      const config = mysqlConfig();
      if (shouldAutoCreateMysqlDatabase()) {
        const databaseName = escapeMysqlIdentifier(config.database);
        const setupConnection = await mysql.createConnection({
          host: config.host,
          port: config.port,
          user: config.user,
          password: config.password,
          charset: "utf8mb4"
        });
        try {
          await setupConnection.query(
            `CREATE DATABASE IF NOT EXISTS \`${databaseName}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`
          );
        } finally {
          await setupConnection.end();
        }
      }

      mysqlPool = mysql.createPool({
        ...config,
        waitForConnections: true,
        connectionLimit: 10,
        namedPlaceholders: true,
        charset: "utf8mb4"
      });

      await ensureDatabaseSchema(mysqlPool);
    })();
  }
  try {
    await mysqlReady;
    return mysqlPool;
  } catch (error) {
    mysqlReady = null;
    mysqlPool = null;
    throw error;
  }
}

async function ensureDatabaseSchema(pool) {
  const statements = [
    `CREATE TABLE IF NOT EXISTS users (
      id VARCHAR(80) NOT NULL PRIMARY KEY,
      name VARCHAR(255) NOT NULL DEFAULT '',
      email VARCHAR(255) NOT NULL DEFAULT '',
      role VARCHAR(40) NOT NULL DEFAULT '',
      role_label VARCHAR(120) NOT NULL DEFAULT '',
      niveau_id VARCHAR(80) NOT NULL DEFAULT '',
      groupe_id VARCHAR(80) NOT NULL DEFAULT '',
      sort_index INT NOT NULL DEFAULT 0,
      payload LONGTEXT NOT NULL,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX idx_users_role (role),
      INDEX idx_users_email (email),
      INDEX idx_users_niveau_groupe (niveau_id, groupe_id)
    ) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`,
    `CREATE TABLE IF NOT EXISTS deleted_user_ids (
      user_id VARCHAR(80) NOT NULL PRIMARY KEY,
      sort_index INT NOT NULL DEFAULT 0,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    ) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`,
    `CREATE TABLE IF NOT EXISTS niveaux (
      id VARCHAR(80) NOT NULL PRIMARY KEY,
      name VARCHAR(255) NOT NULL DEFAULT '',
      sort_index INT NOT NULL DEFAULT 0,
      payload LONGTEXT NOT NULL,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    ) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`,
    `CREATE TABLE IF NOT EXISTS groupes (
      id VARCHAR(80) NOT NULL PRIMARY KEY,
      name VARCHAR(255) NOT NULL DEFAULT '',
      sort_index INT NOT NULL DEFAULT 0,
      payload LONGTEXT NOT NULL,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    ) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`,
    `CREATE TABLE IF NOT EXISTS subjects (
      id VARCHAR(80) NOT NULL PRIMARY KEY,
      name VARCHAR(255) NOT NULL DEFAULT '',
      short_name VARCHAR(120) NOT NULL DEFAULT '',
      semester VARCHAR(20) NOT NULL DEFAULT '',
      sort_index INT NOT NULL DEFAULT 0,
      payload LONGTEXT NOT NULL,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX idx_subjects_semester (semester)
    ) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`,
    `CREATE TABLE IF NOT EXISTS subject_redirects (
      source_subject_id VARCHAR(80) NOT NULL PRIMARY KEY,
      target_subject_id VARCHAR(80) NOT NULL DEFAULT '',
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    ) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`,
    `CREATE TABLE IF NOT EXISTS registration_requests (
      id VARCHAR(100) NOT NULL PRIMARY KEY,
      student_name VARCHAR(255) NOT NULL DEFAULT '',
      email VARCHAR(255) NOT NULL DEFAULT '',
      status VARCHAR(60) NOT NULL DEFAULT '',
      requested_at VARCHAR(40) NOT NULL DEFAULT '',
      sort_index INT NOT NULL DEFAULT 0,
      payload LONGTEXT NOT NULL,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX idx_registration_status (status),
      INDEX idx_registration_email (email)
    ) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`,
    `CREATE TABLE IF NOT EXISTS public_content (
      section_key VARCHAR(80) NOT NULL PRIMARY KEY,
      content_json LONGTEXT NOT NULL,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    ) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`,
    `CREATE TABLE IF NOT EXISTS courses (
      id VARCHAR(100) NOT NULL PRIMARY KEY,
      title VARCHAR(255) NOT NULL DEFAULT '',
      subject_id VARCHAR(80) NOT NULL DEFAULT '',
      niveau_id VARCHAR(80) NOT NULL DEFAULT '',
      groupe_id VARCHAR(80) NOT NULL DEFAULT '',
      teacher_id VARCHAR(80) NOT NULL DEFAULT '',
      created_at VARCHAR(40) NOT NULL DEFAULT '',
      sort_index INT NOT NULL DEFAULT 0,
      payload LONGTEXT NOT NULL,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX idx_courses_subject (subject_id),
      INDEX idx_courses_niveau_groupe (niveau_id, groupe_id),
      INDEX idx_courses_teacher (teacher_id)
    ) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`,
    `CREATE TABLE IF NOT EXISTS schedule_items (
      id VARCHAR(100) NOT NULL PRIMARY KEY,
      title VARCHAR(255) NOT NULL DEFAULT '',
      subject_id VARCHAR(80) NOT NULL DEFAULT '',
      niveau_id VARCHAR(80) NOT NULL DEFAULT '',
      groupe_id VARCHAR(80) NOT NULL DEFAULT '',
      teacher_id VARCHAR(80) NOT NULL DEFAULT '',
      starts_at VARCHAR(40) NOT NULL DEFAULT '',
      sort_index INT NOT NULL DEFAULT 0,
      payload LONGTEXT NOT NULL,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX idx_schedule_subject (subject_id),
      INDEX idx_schedule_niveau_groupe (niveau_id, groupe_id)
    ) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`,
    `CREATE TABLE IF NOT EXISTS exams (
      id VARCHAR(100) NOT NULL PRIMARY KEY,
      title VARCHAR(255) NOT NULL DEFAULT '',
      subject_id VARCHAR(80) NOT NULL DEFAULT '',
      niveau_id VARCHAR(80) NOT NULL DEFAULT '',
      groupe_id VARCHAR(80) NOT NULL DEFAULT '',
      teacher_id VARCHAR(80) NOT NULL DEFAULT '',
      opens_at VARCHAR(40) NOT NULL DEFAULT '',
      sort_index INT NOT NULL DEFAULT 0,
      payload LONGTEXT NOT NULL,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX idx_exams_subject (subject_id),
      INDEX idx_exams_niveau_groupe (niveau_id, groupe_id),
      INDEX idx_exams_teacher (teacher_id)
    ) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`,
    `CREATE TABLE IF NOT EXISTS exam_submissions (
      id VARCHAR(120) NOT NULL PRIMARY KEY,
      exam_id VARCHAR(100) NOT NULL DEFAULT '',
      user_id VARCHAR(80) NOT NULL DEFAULT '',
      student_name VARCHAR(255) NOT NULL DEFAULT '',
      submitted_at VARCHAR(40) NOT NULL DEFAULT '',
      correction_status VARCHAR(60) NOT NULL DEFAULT '',
      score VARCHAR(60) NOT NULL DEFAULT '',
      sort_index INT NOT NULL DEFAULT 0,
      payload LONGTEXT NOT NULL,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX idx_exam_submissions_exam (exam_id),
      INDEX idx_exam_submissions_user (user_id)
    ) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`,
    `CREATE TABLE IF NOT EXISTS questionnaires (
      id VARCHAR(100) NOT NULL PRIMARY KEY,
      title VARCHAR(255) NOT NULL DEFAULT '',
      subject_id VARCHAR(80) NOT NULL DEFAULT '',
      niveau_id VARCHAR(80) NOT NULL DEFAULT '',
      groupe_id VARCHAR(80) NOT NULL DEFAULT '',
      teacher_id VARCHAR(80) NOT NULL DEFAULT '',
      sort_index INT NOT NULL DEFAULT 0,
      payload LONGTEXT NOT NULL,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX idx_questionnaires_subject (subject_id),
      INDEX idx_questionnaires_niveau_groupe (niveau_id, groupe_id)
    ) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`,
    `CREATE TABLE IF NOT EXISTS questionnaire_submissions (
      id VARCHAR(120) NOT NULL PRIMARY KEY,
      questionnaire_id VARCHAR(100) NOT NULL DEFAULT '',
      user_id VARCHAR(80) NOT NULL DEFAULT '',
      student_name VARCHAR(255) NOT NULL DEFAULT '',
      submitted_at VARCHAR(40) NOT NULL DEFAULT '',
      sort_index INT NOT NULL DEFAULT 0,
      payload LONGTEXT NOT NULL,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX idx_questionnaire_submissions_questionnaire (questionnaire_id),
      INDEX idx_questionnaire_submissions_user (user_id)
    ) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`,
    `CREATE TABLE IF NOT EXISTS grade_settings (
      setting_key VARCHAR(80) NOT NULL PRIMARY KEY,
      setting_json LONGTEXT NOT NULL,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    ) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`,
    `CREATE TABLE IF NOT EXISTS email_settings (
      setting_key VARCHAR(80) NOT NULL PRIMARY KEY,
      setting_json LONGTEXT NOT NULL,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    ) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`,
    `CREATE TABLE IF NOT EXISTS activity_log (
      id VARCHAR(120) NOT NULL PRIMARY KEY,
      user_id VARCHAR(80) NOT NULL DEFAULT '',
      user_name VARCHAR(255) NOT NULL DEFAULT '',
      role VARCHAR(40) NOT NULL DEFAULT '',
      login_at VARCHAR(40) NOT NULL DEFAULT '',
      last_activity_at VARCHAR(40) NOT NULL DEFAULT '',
      status VARCHAR(80) NOT NULL DEFAULT '',
      sort_index INT NOT NULL DEFAULT 0,
      payload LONGTEXT NOT NULL,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX idx_activity_user (user_id),
      INDEX idx_activity_role (role)
    ) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`,
    `CREATE TABLE IF NOT EXISTS lesson_session_log (
      id VARCHAR(120) NOT NULL PRIMARY KEY,
      user_id VARCHAR(80) NOT NULL DEFAULT '',
      course_id VARCHAR(100) NOT NULL DEFAULT '',
      started_at VARCHAR(40) NOT NULL DEFAULT '',
      ended_at VARCHAR(40) NOT NULL DEFAULT '',
      sort_index INT NOT NULL DEFAULT 0,
      payload LONGTEXT NOT NULL,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX idx_lesson_sessions_user (user_id),
      INDEX idx_lesson_sessions_course (course_id)
    ) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`,
    `CREATE TABLE IF NOT EXISTS exercise_submissions (
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
    ) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`,
    `CREATE TABLE IF NOT EXISTS teacher_absences (
      id VARCHAR(140) NOT NULL PRIMARY KEY,
      schedule_id VARCHAR(100) NOT NULL DEFAULT '',
      teacher_id VARCHAR(80) NOT NULL DEFAULT '',
      absence_date VARCHAR(40) NOT NULL DEFAULT '',
      sort_index INT NOT NULL DEFAULT 0,
      payload LONGTEXT NOT NULL,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX idx_teacher_absences_schedule (schedule_id),
      INDEX idx_teacher_absences_teacher (teacher_id)
    ) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`,
    `CREATE TABLE IF NOT EXISTS general_plans (
      id VARCHAR(140) NOT NULL PRIMARY KEY,
      niveau_id VARCHAR(80) NOT NULL DEFAULT '',
      groupe_id VARCHAR(80) NOT NULL DEFAULT '',
      sort_index INT NOT NULL DEFAULT 0,
      payload LONGTEXT NOT NULL,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX idx_general_plans_class (niveau_id, groupe_id)
    ) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`,
    `CREATE TABLE IF NOT EXISTS ui_flags (
      flag_key VARCHAR(100) NOT NULL PRIMARY KEY,
      flag_value VARCHAR(255) NOT NULL DEFAULT '',
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    ) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`,
    `CREATE TABLE IF NOT EXISTS storage_meta (
      state_key VARCHAR(80) NOT NULL PRIMARY KEY,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    ) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`
  ];

  for (const statement of statements) {
    await pool.query(statement);
  }
  await migrateLegacyAppState(pool);
  await migratePlaintextUserPasswords(pool);
  await repairCorruptedArabicDemoData(pool);
}

async function tableExists(pool, tableName) {
  const [rows] = await pool.execute(
    "SELECT COUNT(*) AS count FROM information_schema.tables WHERE table_schema = DATABASE() AND table_name = ?",
    [tableName]
  );
  return Number(rows[0]?.count) > 0;
}

async function migrateLegacyAppState(pool) {
  if (!(await tableExists(pool, "app_state"))) return;

  const [metaRows] = await pool.query("SELECT COUNT(*) AS count FROM storage_meta");
  if (Number(metaRows[0]?.count) > 0) return;

  const [rows] = await pool.query("SELECT state_key, state_value FROM app_state");
  const items = Object.fromEntries(
    rows
      .filter((row) => appStateKeys.has(row.state_key))
      .map((row) => [row.state_key, row.state_value])
  );
  if (Object.keys(items).length) await writeAppStateToDatabase(items);
}

function safeJsonParse(value, fallback) {
  try {
    return JSON.parse(String(value));
  } catch {
    return fallback;
  }
}

function jsonString(value) {
  return JSON.stringify(value ?? null);
}

function cleanText(value) {
  return String(value ?? "").replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "");
}

function isDangerousObjectKey(key) {
  return key === "__proto__" || key === "prototype" || key === "constructor" || /^on[a-z]/i.test(key);
}

function isUrlFieldKey(key) {
  return /(url|link|href|src|image|avatar)$/i.test(String(key || ""));
}

function safeStoredUrl(value) {
  const cleanValue = cleanText(value).trim();
  if (!cleanValue) return "";
  if (/^(assets\/|\/assets\/|#)/i.test(cleanValue)) return cleanValue;
  if (/^data:/i.test(cleanValue)) {
    return /^data:(image\/(png|jpe?g|gif|webp)|audio\/[a-z0-9.+-]+|video\/[a-z0-9.+-]+|application\/pdf);base64,[a-z0-9+/=\s]+$/i.test(cleanValue)
      ? cleanValue
      : "";
  }
  try {
    const parsed = new URL(cleanValue);
    return ["http:", "https:", "mailto:", "tel:"].includes(parsed.protocol) ? cleanValue : "";
  } catch {
    return "";
  }
}

function sanitizeStoredValue(value, key = "") {
  if (Array.isArray(value)) return value.map((item) => sanitizeStoredValue(item, key));
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value)
        .filter(([entryKey]) => !isDangerousObjectKey(entryKey))
        .map(([entryKey, entryValue]) => [entryKey, sanitizeStoredValue(entryValue, entryKey)])
    );
  }
  if (typeof value === "string") {
    return isUrlFieldKey(key) ? safeStoredUrl(value) : cleanText(value);
  }
  return value;
}

function sanitizeStoragePayloadString(value, key) {
  if (typeof value !== "string") return value;
  if (isArrayStateKey(key)) return JSON.stringify(arrayFromStorageValue(value).map((item) => sanitizeStoredValue(item)));
  if (key === "subjectRedirects" || key === "publicContent" || key === "gradeSettings" || key === "emailSettings") {
    return JSON.stringify(sanitizeStoredValue(objectFromStorageValue(value)));
  }
  return cleanText(value);
}

function sanitizeAppStateItems(items = {}) {
  return Object.fromEntries(
    Object.entries(items)
      .filter(([key]) => appStateKeys.has(key))
      .map(([key, value]) => [key, value === null ? null : sanitizeStoragePayloadString(value, key)])
  );
}

function stateWriteAllowedForRole(role, key) {
  if (role === "admin") return true;
  const permissions = {
    teacher: new Set(["teacherCourses", "managedExams", "examSubmissions", "questionnaireSubmissions", "exerciseSubmissions", "teacherAbsences", "lessonSessionLog"]),
    student: new Set(["examSubmissions", "questionnaireSubmissions", "exerciseSubmissions"])
  };
  return permissions[role]?.has(key) || false;
}

function assertStateWritePermissions(user, items = {}) {
  const forbidden = Object.keys(items).filter((key) => !stateWriteAllowedForRole(String(user?.role || ""), key));
  if (!forbidden.length) return;
  const error = new Error("You are not allowed to modify this data.");
  error.statusCode = 403;
  throw error;
}

async function mergeRoleScopedStateWrite(user, items = {}, currentState, readRecordings = readZoomRecordings) {
  if (user?.role === "admin") return items;
  const current = currentState || await readAppStateFromDatabase();
  const result = { ...items };
  const currentCourses = stateArray(current, "teacherCourses");
  const currentExams = stateArray(current, "managedExams");
  const teacherCourseIds = new Set(currentCourses.filter((item) => idsMatch(item.teacherId, user.id)).map((item) => String(item.id)));
  const teacherExamIds = new Set(currentExams.filter((item) => idsMatch(item.teacherId || item.createdBy, user.id)).map((item) => String(item.id)));
  if (user?.role === "teacher" && items.teacherCourses) {
    const changedMeetings = arrayFromStorageValue(items.teacherCourses).filter(course => {
      const previous = currentCourses.find(item => idsMatch(item.id, course.id));
      return (course.zoomMeetingId || course.zoomMeetingUuid) && (!previous || !idsMatch(previous.zoomMeetingId, course.zoomMeetingId) || !idsMatch(previous.zoomMeetingUuid, course.zoomMeetingUuid));
    });
    if (changedMeetings.length) {
      const recordings = await readRecordings();
      for (const course of changedMeetings) {
        const record = findZoomRecord(recordings, { meetingId: course.zoomMeetingId, uuid: course.zoomMeetingUuid });
        if (!record || !idsMatch(record.teacherId, user.id) || (course.zoomMeetingId && !idsMatch(record.meetingId, course.zoomMeetingId)) || (course.zoomMeetingUuid && !idsMatch(record.meetingUuid, course.zoomMeetingUuid))) {
          throw Object.assign(new Error("This Zoom meeting was not created for you."), { statusCode: 403 });
        }
      }
    }
  }
  const mergeArray = (key, owns) => {
    if (!(key in result)) return;
    let incoming = arrayFromStorageValue(result[key]);
    const existing = stateArray(current, key);
    const existingById = new Map(existing.map((item, index) => [itemId(item, index, key), item]));
    if (incoming.some((item, index) => {
      const saved = existingById.get(itemId(item, index, key));
      return !owns(saved || item) || !owns(item);
    })) {
      const error = new Error("You are not allowed to modify this data.");
      error.statusCode = 403;
      throw error;
    }
    if (user.role === "student") {
      const targetKey = { examSubmissions: "examId", questionnaireSubmissions: "questionnaireId", exerciseSubmissions: "courseId" }[key];
      const targets = new Set();
      for (const item of incoming) {
        const target = String(item[targetKey]);
        if (targets.has(target)) throw Object.assign(new Error("Only one submission is allowed per activity."), { statusCode: 403 });
        targets.add(target);
      }
      incoming = incoming.map((item, index) => validateStudentSubmission(key, item, existingById.get(itemId(item, index, key)), user, current));
      // Omitting an old submission is not permission to erase it.
      const ids = new Set(incoming.map(item => String(item.id)));
      incoming.push(...existing.filter(item => owns(item) && !ids.has(String(item.id))));
    }
    if (key === "teacherAbsences" && user.role === "teacher") {
      incoming = incoming.map((item, index) => validateTeacherAbsence(item, existingById.get(itemId(item, index, key)), user, current));
      const ids = new Set(incoming.map(item => String(item.id)));
      incoming.push(...existing.filter(item => owns(item) && item.status !== "pending" && !ids.has(String(item.id))));
    }
    result[key] = jsonString([...existing.filter((item) => !owns(item)), ...incoming]);
  };
  if (user?.role === "teacher") {
    mergeArray("teacherCourses", (item) => idsMatch(item.teacherId, user.id));
    mergeArray("managedExams", (item) => idsMatch(item.teacherId || item.createdBy, user.id));
    mergeArray("teacherAbsences", (item) => idsMatch(item.teacherId, user.id));
    mergeArray("lessonSessionLog", (item) => teacherCourseIds.has(String(item.courseId)) || idsMatch(item.userId, user.id));
    mergeArray("examSubmissions", (item) => teacherExamIds.has(String(item.examId)));
    // Teachers can answer questionnaires addressed to teachers.  Their own
    // response is the only questionnaire response they may write.
    mergeArray("questionnaireSubmissions", (item) => idsMatch(item.userId, user.id));
    mergeArray("exerciseSubmissions", (item) => teacherCourseIds.has(String(item.courseId)));
  } else if (user?.role === "student") {
    ["examSubmissions", "questionnaireSubmissions", "exerciseSubmissions"].forEach((key) => mergeArray(key, (item) => idsMatch(item.userId, user.id)));
  }
  return result;
}

function arrayFromStorageValue(value) {
  const parsed = safeJsonParse(value, []);
  return Array.isArray(parsed) ? parsed : [];
}

function objectFromStorageValue(value) {
  const parsed = safeJsonParse(value, {});
  return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : {};
}

function payloadFromRow(row) {
  return safeJsonParse(row.payload ?? row.content_json ?? row.setting_json, null);
}

function base64UrlEncode(value) {
  return Buffer.from(value).toString("base64url");
}

function base64UrlJson(value) {
  return base64UrlEncode(JSON.stringify(value));
}

function signJwt(payload, ttlSeconds = sessionTtlSeconds) {
  const now = Math.floor(Date.now() / 1000);
  const header = { alg: "HS256", typ: "JWT" };
  const body = {
    ...payload,
    jti: crypto.randomUUID(),
    iat: now,
    exp: now + ttlSeconds
  };
  const unsigned = `${base64UrlJson(header)}.${base64UrlJson(body)}`;
  const signature = crypto.createHmac("sha256", sessionSecret).update(unsigned).digest("base64url");
  return `${unsigned}.${signature}`;
}

function verifyJwt(token) {
  const [header, payload, signature] = String(token || "").split(".");
  if (!header || !payload || !signature) return null;
  const unsigned = `${header}.${payload}`;
  const expected = crypto.createHmac("sha256", sessionSecret).update(unsigned).digest("base64url");
  if (!timingSafeStringEqual(signature, expected)) return null;
  const decoded = safeJsonParse(Buffer.from(payload, "base64url").toString("utf8"), null);
  if (!decoded || Number(decoded.exp) <= Math.floor(Date.now() / 1000)) return null;
  return decoded;
}

function parseCookies(header = "") {
  return Object.fromEntries(String(header).split(";").map((part) => {
    const [name, ...rest] = part.trim().split("=");
    return [decodeURIComponent(name || ""), decodeURIComponent(rest.join("=") || "")];
  }).filter(([name]) => name));
}

function cookieHeader(name, value, options = {}) {
  const parts = [
    `${encodeURIComponent(name)}=${encodeURIComponent(value)}`,
    "Path=/",
    "HttpOnly",
    "SameSite=Lax"
  ];
  if (options.maxAge !== undefined) parts.push(`Max-Age=${Number(options.maxAge) || 0}`);
  if (process.env.NODE_ENV === "production" || process.env.COOKIE_SECURE === "true") parts.push("Secure");
  return parts.join("; ");
}

function publicAuthUser(user = {}) {
  const { password, activationToken, ...safeUser } = user;
  return safeUser;
}

function sessionMatchesUser(session, user) {
  return Boolean(session?.sub && user && Number(session.sv) === Number(user.sessionVersion || 0));
}

async function authenticatedRequestUser(request, lookupUser = findLoginUser) {
  const cookies = parseCookies(request.headers.cookie || "");
  const session = verifyJwt(cookies[sessionCookieName]);
  if (!session?.sub) return null;
  const user = await lookupUser(session.sub);
  if (!user || user.isDisabled || !user.emailConfirmed || !sessionMatchesUser(session, user)) return null;
  return user;
}

async function requireRequestRole(request, roles) {
  const user = await authenticatedRequestUser(request);
  if (!user) {
    const error = new Error("Not authenticated.");
    error.statusCode = 401;
    throw error;
  }
  if (!roles.includes(String(user.role || ""))) {
    const error = new Error("You are not allowed to perform this action.");
    error.statusCode = 403;
    throw error;
  }
  return user;
}

function isPasswordHash(value) {
  return String(value || "").startsWith("scrypt$");
}

function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString("base64url");
  const hash = crypto.scryptSync(String(password || ""), salt, 64).toString("base64url");
  return `scrypt$${salt}$${hash}`;
}

function passwordMatches(storedPassword, candidatePassword) {
  const stored = String(storedPassword || "");
  const candidate = String(candidatePassword || "");
  if (!stored || !candidate) return false;
  if (!isPasswordHash(stored)) return timingSafeStringEqual(stored, candidate);
  const [, salt, expectedHash] = stored.split("$");
  if (!salt || !expectedHash) return false;
  const candidateHash = crypto.scryptSync(candidate, salt, 64).toString("base64url");
  return timingSafeStringEqual(candidateHash, expectedHash);
}

function secureStoredPassword(password) {
  const value = String(password || "");
  if (!value || isPasswordHash(value)) return value;
  return hashPassword(value);
}

function publicStateUser(user = {}) {
  return publicAuthUser(user);
}

async function migratePlaintextUserPasswords(pool) {
  const [rows] = await pool.query("SELECT id, payload FROM users");
  for (const row of rows) {
    const user = payloadFromRow(row);
    if (!user?.password || isPasswordHash(user.password)) continue;
    user.password = secureStoredPassword(user.password);
    await pool.execute("UPDATE users SET payload = ? WHERE id = ?", [jsonString(user), row.id]);
  }
}

const knownArabicUsers = {
  sara: { name: "سارة بن علي", roleLabel: "طالبة" },
  ilyas: { name: "إلياس رحماني", roleLabel: "طالب" },
  teacher: { name: "الأستاذة مريم", roleLabel: "أستاذ" },
  admin: { name: "إدارة المعهد", roleLabel: "إدارة" }
};

function hasQuestionMarkCorruption(value) {
  return /\?{2,}/.test(String(value || ""));
}

function repairKnownUserText(user = {}) {
  const known = knownArabicUsers[String(user.id || "")];
  if (!known) return { user, changed: false };
  let changed = false;
  const next = { ...user };
  if (hasQuestionMarkCorruption(next.name)) {
    next.name = known.name;
    changed = true;
  }
  if (hasQuestionMarkCorruption(next.roleLabel)) {
    next.roleLabel = known.roleLabel;
    changed = true;
  }
  return { user: next, changed };
}

function repairKnownUserPayloadText(payload = {}) {
  let changed = false;
  const next = { ...payload };
  const userId = String(next.userId || next.teacherId || next.id || "");
  const known = knownArabicUsers[userId];
  if (known) {
    for (const key of ["name", "userName", "studentName", "teacherName"]) {
      if (hasQuestionMarkCorruption(next[key])) {
        next[key] = known.name;
        changed = true;
      }
    }
    if (hasQuestionMarkCorruption(next.roleLabel)) {
      next.roleLabel = known.roleLabel;
      changed = true;
    }
  }
  return { payload: next, changed };
}

async function repairCorruptedArabicDemoData(pool) {
  const [userRows] = await pool.query("SELECT id, name, role_label, payload FROM users");
  for (const row of userRows) {
    const parsed = payloadFromRow(row) || {};
    const { user, changed } = repairKnownUserText({ ...parsed, id: row.id, name: parsed.name || row.name, roleLabel: parsed.roleLabel || row.role_label });
    if (!changed) continue;
    const payload = { ...parsed, name: user.name, roleLabel: user.roleLabel };
    await pool.execute(
      "UPDATE users SET name = ?, role_label = ?, payload = ? WHERE id = ?",
      [user.name, user.roleLabel, jsonString(payload), row.id]
    );
  }

  const textTables = [
    { table: "activity_log", nameColumn: "user_name" },
    { table: "exam_submissions", nameColumn: "student_name" },
    { table: "questionnaire_submissions", nameColumn: "student_name" },
    { table: "lesson_session_log", nameColumn: "" }
  ];
  for (const { table, nameColumn } of textTables) {
    const [rows] = await pool.query(`SELECT id, ${nameColumn ? `\`${nameColumn}\`,` : ""} payload FROM \`${table}\``);
    for (const row of rows) {
      const parsed = payloadFromRow(row) || {};
      const { payload, changed } = repairKnownUserPayloadText(parsed);
      const known = knownArabicUsers[String(parsed.userId || parsed.teacherId || "")];
      const updates = [];
      const params = [];
      if (nameColumn && known && hasQuestionMarkCorruption(row[nameColumn])) {
        updates.push(`\`${nameColumn}\` = ?`);
        params.push(known.name);
      }
      if (changed) {
        updates.push("payload = ?");
        params.push(jsonString(payload));
      }
      if (!updates.length) continue;
      params.push(row.id);
      await pool.execute(`UPDATE \`${table}\` SET ${updates.join(", ")} WHERE id = ?`, params);
    }
  }
}

async function readUsersFromDatabase() {
  const pool = await ensureMysqlPool();
  const [rows] = await pool.query(arrayStateStores.acceptedUsers.select);
  return rows.map(payloadFromRow).filter(Boolean);
}

async function findLoginUser(identifier) {
  const login = String(identifier || "").trim().toLowerCase();
  if (!login) return null;
  const users = await readUsersFromDatabase();
  return users.find((user) => (
    String(user.email || "").trim().toLowerCase() === login ||
    String(user.id || "").trim().toLowerCase() === login
  )) || null;
}

async function rotateUserSession(userId) {
  // Login/logout must not rewrite a stale snapshot of every other account.
  return mutateUserAccessInDatabase(String(userId), user => {
    if (!user || user.isDisabled || !user.emailConfirmed) return null;
    return { ...user, sessionVersion: Math.max(0, Number(user.sessionVersion) || 0) + 1, lastLoginAt: new Date().toISOString() };
  });
}

function profileValidationError(message) {
  const error = new Error(message);
  error.statusCode = 422;
  return error;
}

function validProfileEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value || ""));
}

function validBirthDate(value) {
  if (!value) return true;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T12:00:00Z`);
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

async function updateOwnProfile(
  authUser,
  body = {},
  mutateUser = mutateUserAccessInDatabase,
  readUsers = readUsersFromDatabase,
) {
  const users = await readUsers();
  const email = String(body.email || "")
    .trim()
    .toLowerCase();
  const phone = String(body.phone || "").trim();
  const birthDate = String(body.birthDate || "").trim();
  const residence = String(body.residence || "").trim();
  if (!validProfileEmail(email))
    throw profileValidationError("Invalid email address.");
  if (phone.length > 40 || !/^[0-9+()\s.-]*$/.test(phone))
    throw profileValidationError("Invalid phone number.");
  if (!validBirthDate(birthDate))
    throw profileValidationError("Invalid birth date.");
  if (residence.length > 180 || (authUser.role === "student" && !residence))
    throw profileValidationError("Student residence is required.");
  let emailChanged = false;
  const user = await mutateUser(String(authUser.id), (user) => {
    if (!user || user.isDisabled)
      throw profileValidationError("Account not available.");
    emailChanged =
      email !==
      String(user.email || "")
        .trim()
        .toLowerCase();
    if (
      emailChanged &&
      users.some(
        (item) =>
          String(item.id) !== String(user.id) &&
          String(item.email || "")
            .trim()
            .toLowerCase() === email,
      )
    ) {
      throw profileValidationError("This email address is already in use.");
    }
    if (emailChanged && !passwordMatches(user.password, body.currentPassword)) {
      const error = new Error("Current password is incorrect.");
      error.statusCode = 401;
      throw error;
    }
    user.email = email;
    user.phone = phone;
    user.birthDate = birthDate;
    user.residence = residence;
    if (emailChanged)
      user.sessionVersion = Math.max(0, Number(user.sessionVersion) || 0) + 1;
    return user;
  });
  return { user, sessionRotated: emailChanged };
}

async function changeOwnPassword(
  authUser,
  body = {},
  mutateUser = mutateUserAccessInDatabase,
) {
  return mutateUser(String(authUser.id), (user) => {
    if (!user) throw profileValidationError("Account not found.");
    if (!passwordMatches(user.password, body.currentPassword)) {
      const error = new Error("Current password is incorrect.");
      error.statusCode = 401;
      throw error;
    }
    const passwordError = strongPasswordError(body.password);
    if (passwordError) throw profileValidationError(passwordError);
    if (passwordMatches(user.password, body.password))
      throw profileValidationError("The new password must be different.");
    user.password = hashPassword(body.password);
    user.sessionVersion = Math.max(0, Number(user.sessionVersion) || 0) + 1;
    return user;
  });
}

async function updateOwnAvatar(
  authUser,
  avatar,
  mutateUser = mutateUserAccessInDatabase,
) {
  const imageUrl = safeStoredUrl(avatar);
  if (!/^data:image\/(png|jpe?g|webp);base64,/i.test(imageUrl))
    throw profileValidationError("Invalid profile image.");
  const encoded = imageUrl.slice(imageUrl.indexOf(",") + 1);
  if (Buffer.from(encoded, "base64").length > 2 * 1024 * 1024)
    throw profileValidationError("Profile image is too large.");
  return mutateUser(String(authUser.id), (user) => {
    if (!user) throw profileValidationError("Account not found.");
    user.avatar = imageUrl;
    return user;
  });
}

function itemId(item, index, prefix = "row") {
  return String(item?.id ?? item?.userId ?? item?.examId ?? item?.questionnaireId ?? `${prefix}-${index + 1}`).trim();
}

function textField(value) {
  return String(value ?? "").trim();
}

function requestIp(request) {
  const forwardedIps = String(request.headers["x-forwarded-for"] || "")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);
  return forwardedIps.at(-1) || String(request.socket.remoteAddress || "").trim() || "unknown";
}

function requestOrigin(request) {
  return String(request.headers.origin || "").trim();
}

function allowedCorsOrigins(request) {
  const configured = String(process.env.CORS_ALLOWED_ORIGINS || "")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);
  const isProduction = process.env.NODE_ENV === "production";
  const host = isProduction ? "" : String(request.headers.host || "").trim();
  return new Set([
    ...configured,
    ...(!isProduction ? [
      "http://127.0.0.1:5173",
      "http://localhost:5173",
      "http://127.0.0.1:4173",
      "http://localhost:4173"
    ] : []),
    host ? `http://${host}` : "",
    host ? `https://${host}` : ""
  ].filter(Boolean));
}

function requestHasTrustedOrigin(request) {
  const origin = requestOrigin(request);
  if (!origin) return true;
  return allowedCorsOrigins(request).has(origin);
}

function securityHeaders(request) {
  const headers = {
    "X-Content-Type-Options": "nosniff",
    "X-Frame-Options": "DENY",
    "Referrer-Policy": "same-origin",
    "Permissions-Policy": "camera=(), microphone=(), geolocation=()",
    "Cross-Origin-Resource-Policy": "same-origin",
    "Vary": "Origin"
  };
  const origin = requestOrigin(request);
  if (origin && allowedCorsOrigins(request).has(origin)) {
    headers["Access-Control-Allow-Origin"] = origin;
    headers["Access-Control-Allow-Credentials"] = "true";
  }
  return headers;
}

function sendJsonForRequest(request, response, statusCode, payload, headers = {}) {
  sendJson(response, statusCode, payload, {
    ...securityHeaders(request),
    ...headers
  });
}

async function mutateUserAccessInDatabase(id, mutate, poolOverride) {
  const pool = poolOverride || await ensureMysqlPool();
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const [rows] = await connection.execute("SELECT payload FROM users WHERE id = ? FOR UPDATE", [id]);
    const previous = rows.length ? payloadFromRow(rows[0]) : null;
    const user = await mutate(previous && { ...previous });
    if (user) await connection.execute("UPDATE users SET payload = ? WHERE id = ?", [jsonString(user), id]);
    if (user && user.email !== previous.email) await connection.execute("UPDATE users SET email = ? WHERE id = ?", [user.email, id]);
    await connection.commit();
    return user;
  } catch (error) {
    await connection.rollback().catch(() => {});
    throw error;
  } finally {
    connection.release();
  }
}

const flagStateKeys = new Set([
  "correctedExamExamplesSeededV1",
  "examCorrectionExamplesSeeded",
  "examDataResetVersion",
  "ilyasCompletedSemesterWorkV1",
  "ilyasDemoRestoredV1",
  "questionnaireResultExamplesSeededV1"
]);

const arrayStateStores = {
  acceptedUsers: {
    table: "users",
    select: "SELECT payload FROM users ORDER BY sort_index ASC, id ASC",
    insert: `INSERT INTO users
      (id, name, email, role, role_label, niveau_id, groupe_id, sort_index, payload)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    values: (item, index) => [
      itemId(item, index, "user"),
      textField(item.name),
      textField(item.email).toLowerCase(),
      textField(item.role),
      textField(item.roleLabel),
      textField(item.niveauId),
      textField(item.groupeId),
      index,
      jsonString(item)
    ]
  },
  deletedUserIds: {
    table: "deleted_user_ids",
    select: "SELECT user_id FROM deleted_user_ids ORDER BY sort_index ASC, user_id ASC",
    read: (rows) => rows.map((row) => row.user_id),
    insert: "INSERT INTO deleted_user_ids (user_id, sort_index) VALUES (?, ?)",
    values: (item, index) => [textField(item), index]
  },
  managedNiveaux: {
    table: "niveaux",
    select: "SELECT payload FROM niveaux ORDER BY sort_index ASC, id ASC",
    insert: "INSERT INTO niveaux (id, name, sort_index, payload) VALUES (?, ?, ?, ?)",
    values: (item, index) => [itemId(item, index, "niveau"), textField(item.name), index, jsonString(item)]
  },
  managedGroupes: {
    table: "groupes",
    select: "SELECT payload FROM groupes ORDER BY sort_index ASC, id ASC",
    insert: "INSERT INTO groupes (id, name, sort_index, payload) VALUES (?, ?, ?, ?)",
    values: (item, index) => [itemId(item, index, "groupe"), textField(item.name), index, jsonString(item)]
  },
  managedSubjects: {
    table: "subjects",
    select: "SELECT payload FROM subjects ORDER BY sort_index ASC, id ASC",
    insert: "INSERT INTO subjects (id, name, short_name, semester, sort_index, payload) VALUES (?, ?, ?, ?, ?, ?)",
    values: (item, index) => [
      itemId(item, index, "subject"),
      textField(item.name),
      textField(item.short),
      textField(item.semester),
      index,
      jsonString(item)
    ]
  },
  registrationRequests: {
    table: "registration_requests",
    select: "SELECT payload FROM registration_requests ORDER BY sort_index ASC, id ASC",
    insert: `INSERT INTO registration_requests
      (id, student_name, email, status, requested_at, sort_index, payload)
      VALUES (?, ?, ?, ?, ?, ?, ?)`,
    values: (item, index) => [
      itemId(item, index, "registration"),
      textField(item.studentName || item.name || item.fullName),
      textField(item.email).toLowerCase(),
      textField(item.status),
      textField(item.requestedAt || item.createdAt || item.submittedAt),
      index,
      jsonString(item)
    ]
  },
  teacherCourses: {
    table: "courses",
    select: "SELECT payload FROM courses ORDER BY sort_index ASC, id ASC",
    insert: `INSERT INTO courses
      (id, title, subject_id, niveau_id, groupe_id, teacher_id, created_at, sort_index, payload)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    values: (item, index) => [
      itemId(item, index, "course"),
      textField(item.title),
      textField(item.subjectId),
      textField(item.niveauId),
      textField(item.groupeId),
      textField(item.teacherId),
      textField(item.createdAt),
      index,
      jsonString(item)
    ]
  },
  managedSchedule: {
    table: "schedule_items",
    select: "SELECT payload FROM schedule_items ORDER BY sort_index ASC, id ASC",
    insert: `INSERT INTO schedule_items
      (id, title, subject_id, niveau_id, groupe_id, teacher_id, starts_at, sort_index, payload)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    values: (item, index) => [
      itemId(item, index, "schedule"),
      textField(item.title || item.courseTitle),
      textField(item.subjectId),
      textField(item.niveauId),
      textField(item.groupeId),
      textField(item.teacherId),
      textField(item.startsAt || item.startAt || item.date || item.day),
      index,
      jsonString(item)
    ]
  },
  managedExams: {
    table: "exams",
    select: "SELECT payload FROM exams ORDER BY sort_index ASC, id ASC",
    insert: `INSERT INTO exams
      (id, title, subject_id, niveau_id, groupe_id, teacher_id, opens_at, sort_index, payload)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    values: (item, index) => [
      itemId(item, index, "exam"),
      textField(item.title),
      textField(item.subjectId),
      textField(item.niveauId),
      textField(item.groupeId),
      textField(item.teacherId),
      textField(item.opensAt || item.openAt || item.date),
      index,
      jsonString(item)
    ]
  },
  examSubmissions: {
    table: "exam_submissions",
    select: "SELECT payload FROM exam_submissions ORDER BY sort_index ASC, id ASC",
    insert: `INSERT INTO exam_submissions
      (id, exam_id, user_id, student_name, submitted_at, correction_status, score, sort_index, payload)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    values: (item, index) => [
      itemId(item, index, "exam-submission"),
      textField(item.examId),
      textField(item.userId),
      textField(item.studentName),
      textField(item.submittedAt),
      textField(item.correctionStatus),
      textField(item.score),
      index,
      jsonString(item)
    ]
  },
  managedQuestionnaires: {
    table: "questionnaires",
    select: "SELECT payload FROM questionnaires ORDER BY sort_index ASC, id ASC",
    insert: `INSERT INTO questionnaires
      (id, title, subject_id, niveau_id, groupe_id, teacher_id, sort_index, payload)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    values: (item, index) => [
      itemId(item, index, "questionnaire"),
      textField(item.title),
      textField(item.subjectId),
      textField(item.niveauId),
      textField(item.groupeId),
      textField(item.teacherId),
      index,
      jsonString(item)
    ]
  },
  questionnaireSubmissions: {
    table: "questionnaire_submissions",
    select: "SELECT payload FROM questionnaire_submissions ORDER BY sort_index ASC, id ASC",
    insert: `INSERT INTO questionnaire_submissions
      (id, questionnaire_id, user_id, student_name, submitted_at, sort_index, payload)
      VALUES (?, ?, ?, ?, ?, ?, ?)`,
    values: (item, index) => [
      itemId(item, index, "questionnaire-submission"),
      textField(item.questionnaireId),
      textField(item.userId),
      textField(item.studentName),
      textField(item.submittedAt),
      index,
      jsonString(item)
    ]
  },
  activityLog: {
    table: "activity_log",
    select: "SELECT payload FROM activity_log ORDER BY sort_index ASC, id ASC",
    insert: `INSERT INTO activity_log
      (id, user_id, user_name, role, login_at, last_activity_at, status, sort_index, payload)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    values: (item, index) => [
      itemId(item, index, "activity"),
      textField(item.userId),
      textField(item.userName || item.studentName),
      textField(item.role),
      textField(item.loginAt),
      textField(item.lastActivityAt),
      textField(item.status),
      index,
      jsonString(item)
    ]
  },
  lessonSessionLog: {
    table: "lesson_session_log",
    select: "SELECT payload FROM lesson_session_log ORDER BY sort_index ASC, id ASC",
    insert: `INSERT INTO lesson_session_log
      (id, user_id, course_id, started_at, ended_at, sort_index, payload)
      VALUES (?, ?, ?, ?, ?, ?, ?)`,
    values: (item, index) => [
      itemId(item, index, "lesson-session"),
      textField(item.userId),
      textField(item.courseId),
      textField(item.startedAt || item.startAt || item.openedAt),
      textField(item.endedAt || item.endAt || item.closedAt),
      index,
      jsonString(item)
    ]
  },
  exerciseSubmissions: {
    table: "exercise_submissions",
    select: "SELECT payload FROM exercise_submissions ORDER BY sort_index ASC, id ASC",
    insert: `INSERT INTO exercise_submissions
      (id, course_id, user_id, student_name, submitted_at, sort_index, payload)
      VALUES (?, ?, ?, ?, ?, ?, ?)`,
    values: (item, index) => [
      itemId(item, index, "exercise-submission"),
      textField(item.courseId),
      textField(item.userId),
      textField(item.studentName),
      textField(item.submittedAt),
      index,
      jsonString(item)
    ]
  },
  teacherAbsences: {
    table: "teacher_absences",
    select: "SELECT payload FROM teacher_absences ORDER BY sort_index ASC, id ASC",
    insert: `INSERT INTO teacher_absences
      (id, schedule_id, teacher_id, absence_date, sort_index, payload)
      VALUES (?, ?, ?, ?, ?, ?)`,
    values: (item, index) => [
      itemId(item, index, "teacher-absence"),
      textField(item.scheduleId),
      textField(item.teacherId),
      textField(item.date),
      index,
      jsonString(item)
    ]
  },
  generalPlans: {
    table: "general_plans",
    select: "SELECT payload FROM general_plans ORDER BY sort_index ASC, id ASC",
    insert: `INSERT INTO general_plans
      (id, niveau_id, groupe_id, sort_index, payload)
      VALUES (?, ?, ?, ?, ?)`,
    values: (item, index) => [
      itemId(item, index, "general-plan"),
      textField(item.niveauId),
      textField(item.groupeId),
      index,
      jsonString(item)
    ]
  }
};

function isArrayStateKey(key) {
  return Boolean(arrayStateStores[key]);
}

async function markStateKeySaved(connection, key) {
  await connection.execute(
    "INSERT INTO storage_meta (state_key) VALUES (?) ON DUPLICATE KEY UPDATE updated_at = CURRENT_TIMESTAMP",
    [key]
  );
}

async function clearStateKeySaved(connection, key) {
  await connection.execute("DELETE FROM storage_meta WHERE state_key = ?", [key]);
}

async function replaceArrayState(connection, key, value, options = {}) {
  const store = arrayStateStores[key];
  let rows = arrayFromStorageValue(value);
  if (options.expectedArrays && key in options.expectedArrays) {
    const [saved] = await connection.query(`${store.select} FOR UPDATE`);
    let values = store.read ? store.read(saved) : saved.map(payloadFromRow).filter(item => item !== null);
    if (key === "acceptedUsers") values = values.map(publicStateUser);
    if (stateRevision(jsonString(values)) !== stateRevision(options.expectedArrays[key] || "[]")) throw staleStateError();
  }
  if (key === "acceptedUsers") rows = await mergeUserSecrets(connection, rows, options);
  await connection.query(`DELETE FROM \`${store.table}\``);
  for (const [index, item] of rows.entries()) {
    await connection.execute(store.insert, store.values(item, index));
  }
  await markStateKeySaved(connection, key);
  return rows.length;
}

async function mergeUserSecrets(connection, users, { preserveUserSecurity = false } = {}) {
  const [existingRows] = await connection.query("SELECT payload FROM users FOR UPDATE");
  const existingById = new Map(existingRows.map((row) => {
    const user = payloadFromRow(row);
    return [String(user?.id || ""), user];
  }));
  return users.map((user) => {
    const existing = existingById.get(String(user?.id || "")) || {};
    const samePassword = Boolean(user.password && existing.password &&
      (user.password === existing.password || passwordMatches(existing.password, user.password)));
    const passwordChanged = Boolean(user.password && !samePassword);
    const merged = {
      ...user,
      password: samePassword ? existing.password : user.password ? secureStoredPassword(user.password) : existing.password || "",
      activationToken: user.activationToken || existing.activationToken || "",
      sessionVersion: Math.max(Number(existing.sessionVersion) || 0, Number(user.sessionVersion) || 0)
    };
    if (preserveUserSecurity && existing.id) {
      // An old administrative form must not undo a newer session/status change.
      for (const field of ["isDisabled", "emailConfirmed", "confirmedAt", "disabledAt", "disabledReason"]) {
        if (Object.hasOwn(existing, field)) merged[field] = existing[field];
        else delete merged[field];
      }
      merged.sessionVersion = Number(existing.sessionVersion) || 0;
      if (passwordChanged) {
        merged.sessionVersion += 1;
        merged.emailConfirmed = true; // Existing administrative password-reset workflow.
      }
    }
    return merged;
  });
}

async function replaceSubjectRedirects(connection, value) {
  const redirects = objectFromStorageValue(value);
  await connection.query("DELETE FROM subject_redirects");
  for (const [sourceSubjectId, targetSubjectId] of Object.entries(redirects)) {
    await connection.execute(
      "INSERT INTO subject_redirects (source_subject_id, target_subject_id) VALUES (?, ?)",
      [sourceSubjectId, textField(targetSubjectId)]
    );
  }
  await markStateKeySaved(connection, "subjectRedirects");
  return Object.keys(redirects).length;
}

async function replacePublicContent(connection, value) {
  const content = objectFromStorageValue(value);
  await connection.query("DELETE FROM public_content");
  for (const [sectionKey, sectionValue] of Object.entries(content)) {
    await connection.execute(
      "INSERT INTO public_content (section_key, content_json) VALUES (?, ?)",
      [sectionKey, jsonString(sectionValue)]
    );
  }
  await markStateKeySaved(connection, "publicContent");
  return Object.keys(content).length;
}

async function replaceSingletonJson(connection, key, table, idColumn, valueColumn, value) {
  const parsed = objectFromStorageValue(value);
  await connection.execute(
    `INSERT INTO ${table} (${idColumn}, ${valueColumn}) VALUES ('default', ?) ON DUPLICATE KEY UPDATE ${valueColumn} = VALUES(${valueColumn})`,
    [jsonString(parsed)]
  );
  await markStateKeySaved(connection, key);
  return 1;
}

async function replaceEmailSettingsFromAppState(connection, value) {
  const publicSettings = objectFromStorageValue(value);
  delete publicSettings.hasAppPassword;

  const [rows] = await connection.query("SELECT setting_json FROM email_settings WHERE setting_key = 'default' LIMIT 1");
  const saved = rows.length
    ? safeJsonParse(rows[0].setting_json, {})
    : await readJson(emailSettingsPath, defaultEmailSettings);
  const next = { ...defaultEmailSettings, ...saved, ...publicSettings };

  await connection.execute(
    "INSERT INTO email_settings (setting_key, setting_json) VALUES ('default', ?) ON DUPLICATE KEY UPDATE setting_json = VALUES(setting_json)",
    [jsonString(next)]
  );
  await markStateKeySaved(connection, "emailSettings");
  return 1;
}

async function replaceFlag(connection, key, value) {
  await connection.execute(
    "INSERT INTO ui_flags (flag_key, flag_value) VALUES (?, ?) ON DUPLICATE KEY UPDATE flag_value = VALUES(flag_value)",
    [key, textField(value)]
  );
  await markStateKeySaved(connection, key);
  return 1;
}

async function readAppStateFromDatabase() {
  const pool = await ensureMysqlPool();
  const [metaRows] = await pool.query("SELECT state_key FROM storage_meta");
  const savedKeys = new Set(metaRows.map((row) => row.state_key));
  const state = {};

  for (const [key, store] of Object.entries(arrayStateStores)) {
    const [rows] = await pool.query(store.select);
    if (rows.length || savedKeys.has(key)) {
      const values = store.read ? store.read(rows) : rows.map(payloadFromRow).filter((item) => item !== null);
      if (key === "acceptedUsers") {
        state[key] = jsonString(values.map(publicStateUser));
        continue;
      }
      state[key] = jsonString(values);
    }
  }

  const [redirectRows] = await pool.query("SELECT source_subject_id, target_subject_id FROM subject_redirects ORDER BY source_subject_id ASC");
  if (redirectRows.length || savedKeys.has("subjectRedirects")) {
    state.subjectRedirects = jsonString(Object.fromEntries(
      redirectRows.map((row) => [row.source_subject_id, row.target_subject_id])
    ));
  }

  const [contentRows] = await pool.query("SELECT section_key, content_json FROM public_content ORDER BY section_key ASC");
  if (contentRows.length || savedKeys.has("publicContent")) {
    state.publicContent = jsonString(Object.fromEntries(
      contentRows.map((row) => [row.section_key, safeJsonParse(row.content_json, {})])
    ));
  }

  const [gradeRows] = await pool.query("SELECT setting_json FROM grade_settings WHERE setting_key = 'default' LIMIT 1");
  if (gradeRows.length || savedKeys.has("gradeSettings")) {
    state.gradeSettings = gradeRows[0]?.setting_json || "{}";
  }

  const [emailRows] = await pool.query("SELECT setting_json FROM email_settings WHERE setting_key = 'default' LIMIT 1");
  if (emailRows.length || savedKeys.has("emailSettings")) {
    state.emailSettings = jsonString(publicEmailSettings({
      ...defaultEmailSettings,
      ...safeJsonParse(emailRows[0]?.setting_json || "{}", {})
    }));
  }

  const [flagRows] = await pool.query("SELECT flag_key, flag_value FROM ui_flags");
  for (const row of flagRows) {
    state[row.flag_key] = row.flag_value;
  }
  for (const key of flagStateKeys) {
    if (savedKeys.has(key) && !(key in state)) state[key] = "";
  }

  return state;
}

function publicAppState(state) {
  const publicKeys = new Set([
    "managedGroupes",
    "managedNiveaux",
    "managedSubjects",
    "publicContent",
    "subjectRedirects"
  ]);
  return Object.fromEntries(Object.entries(state).filter(([key]) => publicKeys.has(key)));
}

function stateArray(state, key) {
  return arrayFromStorageValue(state[key]);
}

function idsMatch(left, right) {
  return String(left ?? "") === String(right ?? "");
}

function itemTargetsStudent(item, student) {
  return targetsStudent(item, student);
}

function roleScopedAppState(state, user) {
  if (user?.role === "admin") return state;
  const courses = stateArray(state, "teacherCourses");
  const exams = stateArray(state, "managedExams");
  const schedules = stateArray(state, "managedSchedule");
  const questionnaires = stateArray(state, "managedQuestionnaires");
  const isTeacher = user?.role === "teacher";
  const visibleCourses = isTeacher
    ? courses.filter((item) => idsMatch(item.teacherId, user.id))
    : courses.filter((item) => item.publishedToStudents !== false && itemTargetsStudent(item, user));
  const visibleExams = isTeacher
    ? exams.filter((item) => idsMatch(item.teacherId || item.createdBy, user.id))
    : exams.filter((item) => item.publishedToStudents !== false && itemTargetsStudent(item, user));
  const visibleSchedules = isTeacher
    ? schedules.filter((item) => idsMatch(item.teacherId, user.id))
    : schedules.filter((item) => itemTargetsStudent(item, user));
  const visibleScheduleIds = new Set(visibleSchedules.map((item) => String(item.id)));
  const courseIds = new Set(visibleCourses.map((item) => String(item.id)));
  const examIds = new Set(visibleExams.map((item) => String(item.id)));
  const visibleQuestionnaires = isTeacher
    ? questionnaires.filter((item) => item.targetAudience === "teachers" || item.targetAudience === "all")
    : questionnaires.filter((item) => itemTargetsStudent(item, user) && (item.targetAudience === "students" || item.targetAudience === "all"));
  const users = stateArray(state, "acceptedUsers").map((item) => idsMatch(item.id, user.id)
    ? publicStateUser(item)
    : { id: item.id, name: item.name, role: item.role, roleLabel: item.roleLabel, niveauId: item.niveauId, groupeId: item.groupeId, isDisabled: Boolean(item.isDisabled), emailConfirmed: Boolean(item.emailConfirmed) });
  const ownOrVisibleSubmission = (item, type) => isTeacher
    ? (type === "exam" ? examIds.has(String(item.examId)) : courseIds.has(String(item.courseId)))
    : idsMatch(item.userId, user.id);
  const fullGradeSettings = objectFromStorageValue(state.gradeSettings);
  const academicYear = String(fullGradeSettings.academicYear || "").trim();
  const studentDistributionKey = `${academicYear}::${user?.niveauId || ""}::${user?.groupeId || ""}`;
  const studentDistribution = !isTeacher
    ? fullGradeSettings.bulletinDistributions?.[studentDistributionKey]
    : "";
  const scopedGradeSettings = {
    academicYear,
    ...(studentDistribution ? { bulletinDistributions: { [studentDistributionKey]: studentDistribution } } : {})
  };
  const scoped = {
    managedGroupes: state.managedGroupes || "[]", managedNiveaux: state.managedNiveaux || "[]", managedSubjects: state.managedSubjects || "[]",
    subjectRedirects: state.subjectRedirects || "{}", publicContent: state.publicContent || "{}",
    acceptedUsers: jsonString(users), teacherCourses: jsonString(isTeacher ? visibleCourses : visibleCourses.map(({ zoomStartUrl, ...course }) => course)), managedExams: jsonString(isTeacher ? visibleExams : withoutAnswerKeys(visibleExams)),
    managedSchedule: jsonString(visibleSchedules), managedQuestionnaires: jsonString(visibleQuestionnaires),
    examSubmissions: jsonString(stateArray(state, "examSubmissions").filter((item) => ownOrVisibleSubmission(item, "exam")).map(item => isTeacher ? item : withoutAnswerKeys(item))),
    exerciseSubmissions: jsonString(stateArray(state, "exerciseSubmissions").filter((item) => ownOrVisibleSubmission(item, "exercise"))),
    questionnaireSubmissions: jsonString(stateArray(state, "questionnaireSubmissions").filter((item) => idsMatch(item.userId, user.id))),
    // Students need approved absences for their own timetable so the session
    // can be shown in red. Pending requests and other classes stay private.
    teacherAbsences: jsonString(isTeacher
      ? stateArray(state, "teacherAbsences").filter((item) => idsMatch(item.teacherId, user.id))
      : stateArray(state, "teacherAbsences").filter((item) => item.status === "approved" && visibleScheduleIds.has(String(item.scheduleId)))),
    lessonSessionLog: jsonString(isTeacher ? stateArray(state, "lessonSessionLog").filter((item) => courseIds.has(String(item.courseId))) : []),
    generalPlans: jsonString(isTeacher ? [] : stateArray(state, "generalPlans").filter((item) => itemTargetsStudent(item, user))),
    activityLog: "[]", registrationRequests: "[]", deletedUserIds: "[]", emailSettings: "{}",
    // A student receives only the distribution marker for their own class. The
    // administration-only grading configuration and other classes stay private.
    gradeSettings: jsonString(scopedGradeSettings)
  };
  return scoped;
}

async function writeAppStateToDatabase(items, options = {}) {
  const entries = Object.entries(sanitizeAppStateItems(items || {}));
  if (!entries.length) return { saved: 0, deleted: 0 };

  const pool = await ensureMysqlPool();
  const connection = await pool.getConnection();
  let saved = 0;
  let deleted = 0;

  try {
    await connection.beginTransaction();

    for (const [key, value] of entries) {
      if (value === null) {
        if (isArrayStateKey(key)) await replaceArrayState(connection, key, "[]", options);
        if (key === "subjectRedirects") await connection.query("DELETE FROM subject_redirects");
        if (key === "publicContent") await connection.query("DELETE FROM public_content");
        if (key === "gradeSettings") await connection.query("DELETE FROM grade_settings");
        if (key === "emailSettings") await connection.query("DELETE FROM email_settings");
        if (flagStateKeys.has(key)) await connection.execute("DELETE FROM ui_flags WHERE flag_key = ?", [key]);
        await clearStateKeySaved(connection, key);
        deleted += 1;
        continue;
      }

      if (isArrayStateKey(key)) {
        saved += await replaceArrayState(connection, key, value, options);
        continue;
      }
      if (key === "subjectRedirects") {
        saved += await replaceSubjectRedirects(connection, value);
        continue;
      }
      if (key === "publicContent") {
        saved += await replacePublicContent(connection, value);
        continue;
      }
      if (key === "gradeSettings") {
        saved += await replaceSingletonJson(connection, key, "grade_settings", "setting_key", "setting_json", value);
        continue;
      }
      if (key === "emailSettings") {
        saved += await replaceEmailSettingsFromAppState(connection, value);
        continue;
      }
      if (flagStateKeys.has(key)) {
        saved += await replaceFlag(connection, key, value);
      }
    }

    await connection.commit();
  } catch (error) {
    // A dropped MySQL socket cannot execute ROLLBACK. Keep the original error
    // so the retry path can repair the pool instead of masking it with
    // "Can't add new command when connection is in closed state".
    await connection.rollback().catch(() => {});
    throw error;
  } finally {
    connection.release();
  }

  return { saved, deleted };
}

function isRetryableMysqlWriteError(error) {
  return ["ER_LOCK_DEADLOCK", "ER_LOCK_WAIT_TIMEOUT", "PROTOCOL_CONNECTION_LOST", "PROTOCOL_ENQUEUE_AFTER_QUIT"].includes(error?.code)
    || /connection is in closed state|connection.*closed|connection.*lost|socket.*closed/i.test(String(error?.message || ""));
}

async function resetMysqlPool() {
  const pool = mysqlPool;
  mysqlPool = null;
  mysqlReady = null;
  if (pool) await pool.end().catch(() => {});
}

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function writeAppStateToDatabaseWithRetry(items, attempts = 3, options = {}) {
  let lastError = null;
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      return await writeAppStateToDatabase(items, options);
    } catch (error) {
      lastError = error;
      if (!isRetryableMysqlWriteError(error) || attempt === attempts) break;
      await resetMysqlPool();
      await wait(75 * attempt);
    }
  }
  throw lastError;
}

function enqueueAppStateWrite(items, { user, revisions } = {}) {
  const run = async () => {
    const current = await readAppStateFromDatabase();
    assertStateRevisions(items, revisions, roleScopedAppState(current, user));
    const merged = await mergeRoleScopedStateWrite(user, items, current);
    const expectedArrays = Object.fromEntries(Object.keys(merged).filter(isArrayStateKey).map(key => [key, current[key] || "[]"]));
    const result = await writeAppStateToDatabaseWithRetry(merged, 3, { preserveUserSecurity: true, expectedArrays });
    const scoped = roleScopedAppState(await readAppStateFromDatabase(), user);
    return { ...result, items: Object.fromEntries(Object.keys(items).map(key => [key, scoped[key]])), revisions: stateRevisions(scoped) };
  };
  const queued = appStateWriteQueue.then(run, run);
  appStateWriteQueue = queued.catch(() => {});
  return queued;
}

async function readEmailSettings() {
  try {
    const pool = await ensureMysqlPool();
    const [rows] = await pool.query("SELECT setting_json FROM email_settings WHERE setting_key = 'default' LIMIT 1");
    if (rows.length) {
      const saved = safeJsonParse(rows[0].setting_json, {});
      return { ...defaultEmailSettings, ...saved };
    }
  } catch {
    // Keep the email feature usable before MySQL is started.
  }
  const saved = await readJson(emailSettingsPath, defaultEmailSettings);
  return { ...defaultEmailSettings, ...saved };
}

async function writeEmailSettings(settings) {
  await writeJson(emailSettingsPath, settings);
  try {
    const pool = await ensureMysqlPool();
    await pool.execute(
      "INSERT INTO email_settings (setting_key, setting_json) VALUES ('default', ?) ON DUPLICATE KEY UPDATE setting_json = VALUES(setting_json)",
      [jsonString(settings)]
    );
    await pool.execute(
      "INSERT INTO storage_meta (state_key) VALUES ('emailSettings') ON DUPLICATE KEY UPDATE updated_at = CURRENT_TIMESTAMP"
    );
  } catch {
    // The JSON file remains a local fallback if MySQL is temporarily unavailable.
  }
}

async function readActivationInvites() {
  const saved = await readJson(activationInvitesPath, {});
  return saved && typeof saved === "object" && !Array.isArray(saved) ? saved : {};
}

async function writeActivationInvites(invites) {
  await writeJson(activationInvitesPath, invites);
}

function activationTokenHash(token) {
  return crypto.createHash("sha256").update(String(token || "")).digest("base64url");
}

function activationInviteExpired(invite) {
  const expiresAt = Date.parse(String(invite?.expiresAt || ""));
  if (Number.isFinite(expiresAt)) return expiresAt <= Date.now();
  const createdAt = Date.parse(String(invite?.createdAt || ""));
  return !Number.isFinite(createdAt) || createdAt + activationTokenTtlSeconds * 1000 <= Date.now();
}

function activationInviteUser(user = {}) {
  return {
    id: String(user.id || "").trim(),
    name: String(user.name || "").trim(),
    email: String(user.email || "").trim().toLowerCase(),
    role: String(user.role || "student").trim(),
    roleLabel: String(user.roleLabel || "").trim(),
    niveauId: String(user.niveauId || "").trim(),
    groupeId: String(user.groupeId || "").trim(),
    cin: String(user.cin || "").trim(),
    phone: String(user.phone || "").trim(),
    birthDate: String(user.birthDate || "").trim(),
    residence: String(user.residence || "").trim(),
    registrationNumber: String(user.registrationNumber || "").trim(),
    payment: user.payment || {},
    password: "",
    isDisabled: true,
    emailConfirmed: false,
    activationToken: "",
    activationEmailSentAt: user.activationEmailSentAt || new Date().toISOString(),
    confirmedAt: ""
  };
}

async function storeActivationInvite(user, token) {
  if (!token || !user) return "";
  const invites = await readActivationInvites();
  const createdAt = new Date();
  const tokenHash = activationTokenHash(token);
  invites[tokenHash] = {
    tokenHash,
    user: activationInviteUser(user),
    createdAt: createdAt.toISOString(),
    expiresAt: new Date(createdAt.getTime() + activationTokenTtlSeconds * 1000).toISOString()
  };
  await writeActivationInvites(invites);
  return invites[tokenHash];
}

function activationUrlForEmail(baseUrl, token) {
  const parsed = new URL(String(baseUrl || ""));
  if (!/^https?:$/.test(parsed.protocol)) throw new Error("Invalid activation URL.");
  parsed.search = "";
  parsed.hash = `completeSignup?token=${encodeURIComponent(token)}`;
  return parsed.toString();
}

function publicEmailSettings(settings) {
  const { appPassword, ...publicSettings } = settings;
  return { ...publicSettings, hasAppPassword: Boolean(appPassword) };
}

function strongPasswordError(password) {
  const value = String(password || "");
  if (value.length < 8) return "Password must be at least 8 characters.";
  if (!/[a-z]/.test(value)) return "Password must contain a lowercase letter.";
  if (!/[A-Z]/.test(value)) return "Password must contain an uppercase letter.";
  if (!/\d/.test(value)) return "Password must contain a number.";
  if (!/[^A-Za-z0-9]/.test(value)) return "Password must contain a special character.";
  return "";
}

async function appendRegistrationRequest(requestPayload) {
  const [rows] = await (await ensureMysqlPool()).query(arrayStateStores.registrationRequests.select);
  const requests = rows.map(payloadFromRow).filter(Boolean);
  const request = sanitizeStoredValue({
    ...requestPayload,
    id: requestPayload.id || `request-${Date.now()}`,
    status: requestPayload.status || "pending",
    requestedAt: requestPayload.requestedAt || new Date().toISOString()
  });
  requests.unshift(request);
  await writeAppStateToDatabaseWithRetry({ registrationRequests: jsonString(requests) });
  return request;
}

async function completeActivation(token, password) {
  const cleanToken = textField(token);
  const passwordError = strongPasswordError(password);
  if (passwordError) {
    const error = new Error(passwordError);
    error.statusCode = 422;
    throw error;
  }
  const invites = await readActivationInvites();
  const tokenHash = activationTokenHash(cleanToken);
  const invite = invites[tokenHash] || invites[cleanToken] || null;
  if (!invite?.user || activationInviteExpired(invite)) {
    if (invite) {
      delete invites[tokenHash];
      delete invites[cleanToken];
      await writeActivationInvites(invites);
    }
    const error = new Error("Invalid or expired activation token.");
    error.statusCode = 404;
    throw error;
  }
  const users = await readUsersFromDatabase();
  const user = users.find((item) => String(item.id) === String(invite.user.id || ""));
  if (!user) {
    const error = new Error("Invalid activation token.");
    error.statusCode = 404;
    throw error;
  }
  user.password = hashPassword(password);
  user.emailConfirmed = true;
  user.isDisabled = false;
  user.confirmedAt = new Date().toISOString();
  user.activationToken = "";
  user.activationEmailSentAt = "";
  await writeAppStateToDatabaseWithRetry({ acceptedUsers: jsonString(users) });
  delete invites[tokenHash];
  delete invites[cleanToken];
  await writeActivationInvites(invites);
  return publicAuthUser(user);
}

async function parseRawBody(request) {
  const chunks = [];
  let totalBytes = 0;
  for await (const chunk of request) {
    totalBytes += chunk.length;
    if (totalBytes > maxRequestBodyBytes) {
      const error = new Error("Request body is too large.");
      error.statusCode = 413;
      throw error;
    }
    chunks.push(chunk);
  }
  return chunks.length ? Buffer.concat(chunks).toString("utf8") : "";
}

async function parseBody(request) {
  const rawBody = await parseRawBody(request);
  if (!rawBody.trim()) return {};
  return JSON.parse(rawBody);
}

function sendJson(response, statusCode, payload, headers = {}) {
  response.writeHead(statusCode, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
    "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "X-Content-Type-Options": "nosniff",
    "X-Frame-Options": "DENY",
    "Referrer-Policy": "same-origin",
    "Permissions-Policy": "camera=(), microphone=(), geolocation=()",
    "Cross-Origin-Resource-Policy": "same-origin",
    ...headers
  });
  response.end(JSON.stringify(payload));
}

function activationEmailTemplate({ name, activationUrl, loginUrl, fromName }) {
  const safeName = name || "المستخدم";
  const safeFromName = fromName || defaultEmailSettings.fromName;
  const safeLoginUrl = loginUrl || activationUrl;
  return {
    subject: "تفعيل حسابك على منصة التعليم الزيتوني عن بعد",
    text: [
      "بسم الله الرحمان الرحيم",
      "",
      "تفعيل حسابك على منصة التعليم الزيتوني عن بعد",
      "",
      `السلام عليكم و رحمة الله تعالى و بركاته ${safeName} ,`,
      "",
      "تم إنشاء حسابك بنجاح. اضغط على الرابط التالي لإكمال التفعيل واختيار كلمة المرور:",
      activationUrl,
      "",
      "و هذا رابط الدخول للمنصة:",
      safeLoginUrl,
      "",
      safeFromName
    ].join("\n"),
    html: `
      <div dir="rtl" style="margin:0;background:#f4f6ef;padding:30px 12px;font-family:Tahoma,Arial,sans-serif;color:#263018">
        <div style="max-width:680px;margin:0 auto;background:#ffffff;border:1px solid #dfe7d2;border-radius:18px;overflow:hidden;box-shadow:0 14px 36px rgba(38,48,24,0.12)">
          <div style="padding:34px 30px 24px;line-height:2;text-align:right">
            <div style="text-align:center;margin-bottom:24px">
              <div style="display:inline-block;border:1px solid #d8e2c8;background:#fbfcf7;border-radius:999px;padding:8px 22px;color:#68752a;font-size:17px;font-weight:700">بسم الله الرحمان الرحيم</div>
            </div>
            <h1 style="margin:0 0 24px;font-size:24px;line-height:1.7;color:#2f4a22;text-align:center">تفعيل حسابك على منصة التعليم الزيتوني عن بعد</h1>
            <div style="border-right:5px solid #b99a4b;background:#fbfaf4;border-radius:14px;padding:20px 22px;margin:0 0 20px">
              <p style="margin:0 0 18px;font-size:17px">السلام عليكم و رحمة الله تعالى و بركاته ${escapeHtml(safeName)} ,</p>
              <p style="margin:0;font-size:17px">تم إنشاء حسابك بنجاح. اضغط على الرابط التالي لإكمال التفعيل واختيار كلمة المرور:</p>
            </div>
            <div style="text-align:center;margin:22px 0 24px">
              <a href="${escapeHtml(activationUrl)}" style="display:inline-block;background:#68752a;color:#ffffff;text-decoration:none;padding:13px 30px;border-radius:10px;font-weight:700;font-size:16px">تفعيل الحساب واختيار كلمة المرور</a>
            </div>
            <div style="border:1px solid #e0d0a8;background:#fffaf0;border-radius:14px;padding:18px 20px;margin:0 0 24px;text-align:center">
              <p style="margin:0 0 14px;font-size:17px;color:#53613b;font-weight:700">و هذا رابط الدخول للمنصة</p>
              <a href="${escapeHtml(safeLoginUrl)}" style="display:inline-block;color:#2f4a22;text-decoration:none;font-weight:700;word-break:break-all;direction:ltr">${escapeHtml(safeLoginUrl)}</a>
            </div>
          </div>
          <div style="background:#eef3e5;border-top:4px solid #b99a4b;padding:20px 24px;text-align:center">
            <p style="margin:0 0 14px;color:#68752a;font-weight:700">${escapeHtml(safeFromName)}</p>
            <div style="display:inline-block;vertical-align:middle;margin:0 10px">
              <img src="cid:email-signature-logo-1@zaytouna-platform" alt="منصة التعليم الزيتوني عن بعد" style="max-height:72px;max-width:160px;display:block">
            </div>
            <div style="display:inline-block;vertical-align:middle;margin:0 10px">
              <img src="cid:email-signature-logo-2@zaytouna-platform" alt="مشيخة التعليم الزيتوني وفروعه" style="max-height:72px;max-width:160px;display:block">
            </div>
          </div>
        </div>
      </div>
    `
  };
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function zoomConfig() {
  return {
    accountId: String(process.env.ZOOM_ACCOUNT_ID || "").trim(),
    clientId: String(process.env.ZOOM_CLIENT_ID || "").trim(),
    clientSecret: String(process.env.ZOOM_CLIENT_SECRET || "").trim(),
    hostUserId: String(process.env.ZOOM_HOST_USER_ID || "me").trim(),
    webhookSecretToken: String(process.env.ZOOM_WEBHOOK_SECRET_TOKEN || "").trim(),
    timezone: defaultZoomTimezone
  };
}

function requireZoomConfig() {
  const config = zoomConfig();
  const missing = [];
  if (!config.accountId) missing.push("ZOOM_ACCOUNT_ID");
  if (!config.clientId) missing.push("ZOOM_CLIENT_ID");
  if (!config.clientSecret) missing.push("ZOOM_CLIENT_SECRET");
  if (missing.length) {
    throw new Error(`Zoom is not configured. Missing: ${missing.join(", ")}`);
  }
  return config;
}

function publicZoomStatus() {
  const config = zoomConfig();
  return {
    configured: Boolean(config.accountId && config.clientId && config.clientSecret),
    webhookConfigured: Boolean(config.webhookSecretToken),
    hostUserId: config.hostUserId,
    timezone: config.timezone,
    webhookPath: "/api/zoom/webhook"
  };
}

async function readZoomRecordings() {
  const saved = await readJson(zoomRecordingsPath, { courses: {}, meetings: {}, updatedAt: "" });
  return {
    courses: saved && typeof saved.courses === "object" && !Array.isArray(saved.courses) ? saved.courses : {},
    meetings: saved && typeof saved.meetings === "object" && !Array.isArray(saved.meetings) ? saved.meetings : {},
    updatedAt: saved.updatedAt || ""
  };
}

async function writeZoomRecordings(value) {
  value.updatedAt = new Date().toISOString();
  await mkdir(dataDir, { recursive: true });
  const temporary = `${zoomRecordingsPath}.${crypto.randomUUID()}.tmp`;
  try {
    await writeFile(temporary, JSON.stringify(value, null, 2), "utf8");
    await rename(temporary, zoomRecordingsPath);
  } finally {
    await unlink(temporary).catch(() => {});
  }
}

async function getZoomAccessToken() {
  const config = requireZoomConfig();
  const now = Date.now();
  if (zoomTokenCache?.accessToken && zoomTokenCache.expiresAt > now + 60000) {
    return zoomTokenCache.accessToken;
  }

  const credentials = Buffer.from(`${config.clientId}:${config.clientSecret}`).toString("base64");
  const params = new URLSearchParams({
    grant_type: "account_credentials",
    account_id: config.accountId
  });
  const response = await fetch(`${zoomOauthTokenUrl}?${params}`, {
    method: "POST",
    signal: AbortSignal.timeout(15000),
    headers: {
      Authorization: `Basic ${credentials}`,
      "Content-Type": "application/x-www-form-urlencoded"
    }
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok || !data.access_token) {
    const error = new Error(
      data.error === "invalid_client"
        ? "Zoom rejected the configured client credentials. Check ZOOM_ACCOUNT_ID, ZOOM_CLIENT_ID, and ZOOM_CLIENT_SECRET."
        : data.message || data.error || `Zoom token request failed (${response.status})`
    );
    error.statusCode = 502;
    throw error;
  }

  zoomTokenCache = {
    accessToken: data.access_token,
    expiresAt: now + (Number(data.expires_in) || 3600) * 1000
  };
  return zoomTokenCache.accessToken;
}

async function zoomApi(pathname, options = {}) {
  const accessToken = await getZoomAccessToken();
  const response = await fetch(`${zoomApiBaseUrl}${pathname}`, {
    ...options,
    signal: options.signal || AbortSignal.timeout(15000),
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
      ...(options.headers || {})
    }
  });
  const text = await response.text();
  const data = text ? JSON.parse(text) : {};
  if (!response.ok) {
    throw Object.assign(new Error(data.message || data.error || `Zoom API request failed (${response.status})`), { statusCode: 502, zoomStatus: response.status, zoomCode: data.code });
  }
  return data;
}

function normalizeZoomStartTime(value) {
  const parsed = value ? new Date(value) : new Date(Date.now() + 5 * 60 * 1000);
  const date = Number.isNaN(parsed.getTime()) ? new Date(Date.now() + 5 * 60 * 1000) : parsed;
  return date.toISOString();
}

function zoomMeetingPayload(body) {
  const topic = String(body.title || "Cours en direct").trim().slice(0, 200);
  const duration = Math.max(1, Math.min(1440, Number(body.durationMinutes) || defaultZoomDurationMinutes || 60));
  return {
    topic,
    type: 2,
    start_time: normalizeZoomStartTime(body.startTime),
    duration,
    timezone: String(body.timezone || defaultZoomTimezone).trim() || "Africa/Tunis",
    agenda: String(body.description || "").trim().slice(0, 2000),
    settings: {
      ...classroomEntrySettings(),
      join_before_host: false,
      approval_type: 2,
      audio: "both",
      auto_recording: "cloud",
      waiting_room: false
    }
  };
}

function zoomRecordingSettingsPayload() {
  return {
    recording: {
      cloud_recording: true,
      record_speaker_view: true,
      record_gallery_view: true,
      record_shared_screen: true,
      recording_layout: "shared_screen_with_speaker_view",
      record_audio_file: true,
      save_chat_text: true,
      show_timestamp: true,
      auto_recording: "cloud"
    }
  };
}

async function ensureZoomRecordingLayout(hostUserId, requestZoom = zoomApi) {
  try {
    await requestZoom(`/users/${encodeURIComponent(hostUserId)}/settings`, {
      method: "PATCH",
      body: JSON.stringify(zoomRecordingSettingsPayload())
    });
  } catch (error) {
    console.warn(`Zoom recording layout sync skipped: ${error.message}`);
  }
}

function zoomCourseRecordFromMeeting(meeting, body = {}) {
  return {
    courseId: String(body.courseId || "").trim(),
    scheduleId: String(body.scheduleId || "").trim(),
    title: String(body.title || meeting.topic || "").trim(),
    teacherId: String(body.teacherId || "").trim(),
    teacherName: String(body.teacherName || "").trim(),
    teacherEmail: String(body.teacherEmail || "").trim(),
    meetingId: meeting.id ? String(meeting.id) : "",
    meetingUuid: meeting.uuid ? String(meeting.uuid) : "",
    joinUrl: meeting.join_url || "",
    startUrl: meeting.start_url || "",
    password: meeting.password || meeting.encrypted_password || "",
    startTime: meeting.start_time || body.startTime || "",
    durationMinutes: Number(meeting.duration) || Number(body.durationMinutes) || defaultZoomDurationMinutes,
    timezone: meeting.timezone || body.timezone || defaultZoomTimezone,
    recordingStatus: "waiting",
    recordingUpdatedAt: "",
    recordingAudioUrl: "",
    recordingVideoUrl: "",
    recordingPresentationUrl: "",
    files: [],
    createdAt: new Date().toISOString()
  };
}

function publicZoomMeetingRecord(record) {
  return {
    courseId: record.courseId || "",
    scheduleId: record.scheduleId || "",
    meetingId: record.meetingId || "",
    meetingUuid: record.meetingUuid || "",
    joinUrl: record.joinUrl || "",
    startUrl: record.startUrl || "",
    password: record.password || "",
    startTime: record.startTime || "",
    durationMinutes: record.durationMinutes || defaultZoomDurationMinutes,
    timezone: record.timezone || defaultZoomTimezone,
    recordingStatus: record.recordingStatus || "waiting"
  };
}

function publicZoomRecordingRecord(record) {
  if (!record) return null;
  return {
    courseId: record.courseId || "",
    meetingId: record.meetingId || "",
    meetingUuid: record.meetingUuid || "",
    recordingStatus: record.recordingStatus || "",
    recordingUpdatedAt: record.recordingUpdatedAt || "",
    recordingAudioUrl: record.recordingAudioUrl || "",
    recordingVideoUrl: record.recordingVideoUrl || "",
    recordingPresentationUrl: record.recordingPresentationUrl || "",
    files: Array.isArray(record.files) ? record.files : []
  };
}

function upsertZoomRecord(store, record) {
  const merge = (current = {}) => ({ ...current, ...record });
  if (record.courseId) store.courses[record.courseId] = merge(store.courses[record.courseId]);
  if (record.meetingId) store.meetings[record.meetingId] = merge(store.meetings[record.meetingId]);
  if (record.meetingUuid) store.meetings[record.meetingUuid] = merge(store.meetings[record.meetingUuid]);
}

function findZoomRecord(store, query = {}) {
  const courseId = String(query.courseId || "").trim();
  const meetingId = String(query.meetingId || "").trim();
  const uuid = String(query.uuid || query.meetingUuid || "").trim();
  if (uuid && store.meetings[uuid]) return store.meetings[uuid];
  if (meetingId && store.meetings[meetingId]) return store.meetings[meetingId];
  if (!uuid && !meetingId && courseId && store.courses[courseId]) return store.courses[courseId];
  return Object.values(store.meetings).find((record) => (
    (meetingId && String(record.meetingId) === meetingId) ||
    (uuid && String(record.meetingUuid) === uuid) ||
    (!uuid && !meetingId && courseId && String(record.courseId) === courseId)
  )) || null;
}

let zoomRecordWriteQueue = Promise.resolve();
function saveZoomRecord(record, readStore = readZoomRecordings, writeStore = writeZoomRecordings) {
  const run = async () => {
    const store = await readStore();
    upsertZoomRecord(store, record);
    await writeStore(store);
    return record;
  };
  const queued = zoomRecordWriteQueue.then(run, run);
  zoomRecordWriteQueue = queued.catch(() => {});
  return queued;
}

function zoomCourseForUser(state, user, query, { manage = false } = {}) {
  const courses = stateArray(state, "teacherCourses");
  const course = courses.find(item => query.courseId ? idsMatch(item.id, query.courseId) :
    (query.uuid && idsMatch(item.zoomMeetingUuid, query.uuid)) || (query.meetingId && idsMatch(item.zoomMeetingId, query.meetingId)));
  const allowed = course && (user.role === "admin" || (user.role === "teacher" && idsMatch(course.teacherId, user.id)) ||
    (!manage && user.role === "student" && course.publishedToStudents !== false && itemTargetsStudent(course, user)));
  if (!allowed) throw Object.assign(new Error("This lesson is not available to you."), { statusCode: 403 });
  if ((query.meetingId && !idsMatch(course.zoomMeetingId, query.meetingId)) || (query.uuid && !idsMatch(course.zoomMeetingUuid, query.uuid))) {
    throw Object.assign(new Error("Zoom meeting does not belong to this lesson."), { statusCode: 403 });
  }
  return course;
}

async function createZoomMeeting(body, dependencies = {}) {
  const config = (dependencies.requireZoomConfig || requireZoomConfig)();
  const requestZoom = dependencies.zoomApi || zoomApi;
  const readRecordings = dependencies.readZoomRecordings || readZoomRecordings;
  const writeRecordings = dependencies.writeZoomRecordings || writeZoomRecordings;
  const hostUserId = String(body.zoomUserId || config.hostUserId || "me").trim() || "me";
  const encodedHostUserId = encodeURIComponent(hostUserId);
  await ensureZoomRecordingLayout(hostUserId, requestZoom);
  const annotationPolicy = await ensureClassroomAnnotationPolicy(requestZoom, hostUserId);
  if (!annotationPolicy.applied) {
    // Annotation is a host-wide Zoom preference and may be locked or outside
    // this OAuth app's scopes. It must not block teachers from creating class.
    (dependencies.logger || console).warn(`Zoom annotation policy not applied (${annotationPolicy.reason}). Meeting creation continues.`);
  }
  const meeting = await requestZoom(`/users/${encodedHostUserId}/meetings`, {
    method: "POST",
    body: JSON.stringify(zoomMeetingPayload(body))
  });
  const record = zoomCourseRecordFromMeeting(meeting, body);
  await saveZoomRecord(record, readRecordings, writeRecordings);
  return publicZoomMeetingRecord(record);
}

async function endZoomMeeting(body = {}) {
  const meetingId = String(body.meetingId || body.uuid || "").trim();
  if (!meetingId) {
    const error = new Error("meetingId is required.");
    error.statusCode = 400;
    throw error;
  }
  await zoomApi(`/meetings/${zoomPathIdentifier(meetingId)}/status`, {
    method: "PUT",
    body: JSON.stringify({ action: "end" })
  });

  const store = await readZoomRecordings();
  const record = findZoomRecord(store, {
    courseId: body.courseId,
    meetingId: body.meetingId,
    uuid: body.uuid
  });
  if (record) {
    record.recordingStatus = "processing";
    record.endedAt = new Date().toISOString();
    await saveZoomRecord(record);
  }
  return { ended: true, recordingStatus: "processing" };
}

function zoomUrlWithPasscode(url, passcode) {
  if (!url || !passcode || url.includes("pwd=") || url.includes("/rec/download/")) return url || "";
  const separator = url.includes("?") ? "&" : "?";
  return `${url}${separator}pwd=${encodeURIComponent(passcode)}`;
}

function zoomPathIdentifier(value) {
  const cleanValue = String(value || "").trim();
  const encoded = encodeURIComponent(cleanValue);
  return cleanValue.includes("/") ? encodeURIComponent(encoded) : encoded;
}

function normalizeZoomRecordingFiles(recordingObject = {}) {
  const passcode = recordingObject.recording_play_passcode || recordingObject.password || "";
  const rawFiles = [
    ...(Array.isArray(recordingObject.recording_files) ? recordingObject.recording_files : []),
    ...(Array.isArray(recordingObject.participant_audio_files) ? recordingObject.participant_audio_files : [])
  ];
  const files = rawFiles
    .map((file) => {
      const playUrl = zoomUrlWithPasscode(file.play_url || recordingObject.share_url || "", passcode);
      const downloadUrl = file.download_url || "";
      return {
        id: file.id || file.file_id || "",
        fileType: file.file_type || file.file_extension || "",
        fileExtension: file.file_extension || "",
        recordingType: file.recording_type || "",
        status: file.status || recordingObject.status || "completed",
        playUrl,
        downloadUrl,
        fileSize: file.file_size || 0,
        recordingStart: file.recording_start || "",
        recordingEnd: file.recording_end || ""
      };
    })
    .filter((file) => file.status === "completed" && (file.playUrl || file.downloadUrl));

  const audio = files.find((file) => file.fileType === "M4A" || file.recordingType === "audio_only");
  const presentation = files.find((file) => /shared_screen|presentation/i.test(file.recordingType));
  const video = presentation || files.find((file) => file.fileType === "MP4") || null;
  return {
    files,
    recordingAudioUrl: audio?.playUrl || audio?.downloadUrl || "",
    recordingVideoUrl: video?.playUrl || video?.downloadUrl || "",
    recordingPresentationUrl: presentation?.playUrl || presentation?.downloadUrl || ""
  };
}

function zoomRecordingRecordFromObject(recordingObject = {}, previous = {}) {
  const normalized = normalizeZoomRecordingFiles(recordingObject);
  return {
    ...previous,
    meetingId: recordingObject.id ? String(recordingObject.id) : previous.meetingId || "",
    meetingUuid: recordingObject.uuid ? String(recordingObject.uuid) : previous.meetingUuid || "",
    title: recordingObject.topic || previous.title || "",
    startTime: recordingObject.start_time || previous.startTime || "",
    durationMinutes: Number(recordingObject.duration) || previous.durationMinutes || defaultZoomDurationMinutes,
    recordingStatus: normalized.files.length ? "completed" : "processing",
    recordingUpdatedAt: new Date().toISOString(),
    recordingAudioUrl: normalized.recordingAudioUrl || previous.recordingAudioUrl || "",
    recordingVideoUrl: normalized.recordingVideoUrl || previous.recordingVideoUrl || "",
    recordingPresentationUrl: normalized.recordingPresentationUrl || previous.recordingPresentationUrl || "",
    files: normalized.files
  };
}

async function refreshZoomRecording(identifier, query = {}) {
  const meetingIdentifier = String(identifier || query.uuid || query.meetingId || "").trim();
  if (!meetingIdentifier) return null;
  const data = await zoomApi(`/meetings/${zoomPathIdentifier(meetingIdentifier)}/recordings`);
  const store = await readZoomRecordings();
  const previous = findZoomRecord(store, query) || {};
  const record = zoomRecordingRecordFromObject(data, previous);
  if (query.courseId && !record.courseId) record.courseId = String(query.courseId);
  await saveZoomRecord(record);
  return record;
}

function zoomWebhookValidationResponse(body) {
  const config = zoomConfig();
  if (!config.webhookSecretToken) {
    throw new Error("ZOOM_WEBHOOK_SECRET_TOKEN is required for webhook validation.");
  }
  const plainToken = body?.payload?.plainToken || "";
  const encryptedToken = crypto
    .createHmac("sha256", config.webhookSecretToken)
    .update(plainToken)
    .digest("hex");
  return { plainToken, encryptedToken };
}

function timingSafeStringEqual(left, right) {
  const leftBuffer = Buffer.from(String(left));
  const rightBuffer = Buffer.from(String(right));
  if (leftBuffer.length !== rightBuffer.length) return false;
  return crypto.timingSafeEqual(leftBuffer, rightBuffer);
}

function verifyZoomWebhookSignature(headers, rawBody) {
  const config = zoomConfig();
  if (!config.webhookSecretToken) return false;
  const timestamp = headers["x-zm-request-timestamp"];
  const signature = headers["x-zm-signature"];
  if (!timestamp || !signature) return false;
  if (!/^\d+$/.test(String(timestamp)) || Math.abs(Date.now() / 1000 - Number(timestamp)) > 300) return false;
  const message = `v0:${timestamp}:${rawBody}`;
  const digest = crypto
    .createHmac("sha256", config.webhookSecretToken)
    .update(message)
    .digest("hex");
  return timingSafeStringEqual(signature, `v0=${digest}`);
}

async function handleZoomWebhook(request, response) {
  const rawBody = await parseRawBody(request);
  const body = rawBody ? JSON.parse(rawBody) : {};

  if (body.event === "endpoint.url_validation") {
    return sendJson(response, 200, zoomWebhookValidationResponse(body));
  }

  if (!verifyZoomWebhookSignature(request.headers, rawBody)) {
    return sendJson(response, 401, { ok: false, reason: "Invalid Zoom webhook signature." });
  }

  if (body.event === "recording.completed") {
    const recordingObject = body.payload?.object || {};
    const store = await readZoomRecordings();
    const previous = findZoomRecord(store, {
      meetingId: recordingObject.id,
      uuid: recordingObject.uuid
    }) || {};
    const record = zoomRecordingRecordFromObject(recordingObject, previous);
    await saveZoomRecord(record);
    return sendJson(response, 200, { ok: true });
  }

  return sendJson(response, 200, { ok: true, ignored: true });
}

async function sendActivationEmail(payload) {
  const settings = await readEmailSettings();
  if (!settings.fromEmail || !settings.appPassword) {
    return {
      sent: false,
      reason: "Gmail أو App Password غير مضبوطين في إعدادات البريد."
    };
  }

  const token = crypto.randomBytes(32).toString("base64url");
  const activationUrl = activationUrlForEmail(payload.activationBaseUrl, token);
  await storeActivationInvite(payload.user, token);

  const transporter = nodemailer.createTransport({
    host: settings.smtpHost || "smtp.gmail.com",
    port: Number(settings.smtpPort || 587),
    secure: Number(settings.smtpPort) === 465,
    auth: {
      user: settings.fromEmail,
      pass: settings.appPassword
    }
  });

  const template = activationEmailTemplate({
    name: payload.name,
    activationUrl,
    loginUrl: payload.loginUrl,
    fromName: settings.fromName
  });

  const info = await transporter.sendMail({
    from: `"${settings.fromName || defaultEmailSettings.fromName}" <${settings.fromEmail}>`,
    to: payload.to,
    subject: template.subject,
    text: template.text,
    html: template.html,
    attachments: emailLogoAttachments
  });

  return { sent: true, messageId: info.messageId, fromEmail: settings.fromEmail };
}

// The storage seam lets integration tests exercise real HTTP, cookies and auth
// against an isolated repository without touching the user's MySQL database.
function createRequestHandler(dependencies = {}) {
  const lookupUser = dependencies.findLoginUser || findLoginUser;
  const authenticate = request => authenticatedRequestUser(request, lookupUser);
  const rotateSession = dependencies.rotateUserSession || rotateUserSession;
  const readState = dependencies.readAppState || readAppStateFromDatabase;
  const writeState = dependencies.writeAppState || enqueueAppStateWrite;
  const mergeState = dependencies.mergeState || mergeRoleScopedStateWrite;
  const limiter = dependencies.limiter || loginLimiter;
  const mutateUser = dependencies.mutateUser || mutateUserAccessInDatabase;
  const readRecordings = dependencies.readZoomRecordings || readZoomRecordings;
  const refreshRecording = dependencies.refreshZoomRecording || refreshZoomRecording;
  const recordingRefreshes = new Map();
  return async function handleRequest(request, response) {
  if (request.method === "OPTIONS") return sendJsonForRequest(request, response, 204, {});

  try {
    const url = new URL(request.url || "/", "http://localhost");
    if (["POST", "PUT", "PATCH", "DELETE"].includes(request.method) && !requestHasTrustedOrigin(request)) {
      return sendJson(response, 403, { ok: false, reason: "Untrusted request origin." });
    }

    if (request.method === "GET" && url.pathname === "/api/health") {
      return sendJson(response, 200, { ok: true });
    }

    if (request.method === "POST" && url.pathname === "/api/auth/login") {
      const body = await parseBody(request);
      const identifier = body.email || body.login || body.identifier;
      const user = await lookupUser(identifier);
      // Email and user-ID login share the same account throttle.
      const rateLimit = limiter.status(requestIp(request), user?.id || identifier);
      if (!rateLimit.allowed) {
        return sendJson(response, 429, { ok: false, reason: "Too many login attempts. Try again later.", retryAfterSeconds: rateLimit.retryAfterSeconds }, {
          "Retry-After": String(rateLimit.retryAfterSeconds)
        });
      }
      if (!user || user.isDisabled || !user.emailConfirmed || !passwordMatches(user.password, body.password)) {
        limiter.fail(rateLimit.key);
        // Keep a generic failure and temporary protection; never mutate account
        // status or revoke a working session because someone guesses passwords.
        return sendJson(response, 401, { ok: false, reason: "Invalid credentials." });
      }
      limiter.clearUser(user);
      const rotatedUser = await rotateSession(user.id);
      if (!rotatedUser) return sendJson(response, 401, { ok: false, reason: "Invalid credentials." });
      const token = signJwt({ sub: String(rotatedUser.id), role: rotatedUser.role || "", sv: rotatedUser.sessionVersion });
      return sendJson(response, 200, { ok: true, user: publicAuthUser(rotatedUser) }, {
        "Set-Cookie": cookieHeader(sessionCookieName, token, { maxAge: sessionTtlSeconds })
      });
    }

    if (request.method === "GET" && url.pathname === "/api/auth/session") {
      const user = await authenticate(request);
      if (!user) {
        return sendJson(response, 401, { ok: false }, {
          "Set-Cookie": cookieHeader(sessionCookieName, "", { maxAge: 0 })
        });
      }
      return sendJson(response, 200, { ok: true, user: publicAuthUser(user) });
    }

    if (request.method === "POST" && url.pathname === "/api/auth/verify-password") {
      const user = await authenticate(request);
      if (!user) return sendJson(response, 401, { ok: false, reason: "Not authenticated." });
      const body = await parseBody(request);
      if (!passwordMatches(user.password, body.password)) return sendJson(response, 401, { ok: false, reason: "Invalid password." });
      return sendJson(response, 200, { ok: true });
    }

    if (request.method === "POST" && url.pathname === "/api/auth/profile") {
      const authUser = await authenticate(request);
      if (!authUser) return sendJson(response, 401, { ok: false, reason: "Not authenticated." });
      const result = await updateOwnProfile(authUser, await parseBody(request), mutateUser, async () => stateArray(await readState(), "acceptedUsers"));
      const headers = result.sessionRotated
        ? { "Set-Cookie": cookieHeader(sessionCookieName, signJwt({ sub: String(result.user.id), role: result.user.role || "", sv: result.user.sessionVersion }), { maxAge: sessionTtlSeconds }) }
        : {};
      return sendJson(response, 200, { ok: true, user: publicAuthUser(result.user) }, headers);
    }

    if (request.method === "POST" && url.pathname === "/api/auth/profile/avatar") {
      const authUser = await authenticate(request);
      if (!authUser) return sendJson(response, 401, { ok: false, reason: "Not authenticated." });
      const user = await updateOwnAvatar(authUser, (await parseBody(request)).avatar, mutateUser);
      return sendJson(response, 200, { ok: true, user: publicAuthUser(user) });
    }

    if (request.method === "POST" && url.pathname === "/api/auth/change-password") {
      const authUser = await authenticate(request);
      if (!authUser) return sendJson(response, 401, { ok: false, reason: "Not authenticated." });
      const user = await changeOwnPassword(authUser, await parseBody(request), mutateUser);
      return sendJson(response, 200, { ok: true, user: publicAuthUser(user) }, {
        "Set-Cookie": cookieHeader(sessionCookieName, signJwt({ sub: String(user.id), role: user.role || "", sv: user.sessionVersion }), { maxAge: sessionTtlSeconds })
      });
    }

    if (request.method === "POST" && url.pathname === "/api/auth/logout") {
      const user = await authenticate(request);
      if (user) await rotateSession(user.id);
      return sendJson(response, 200, { ok: true }, {
        "Set-Cookie": cookieHeader(sessionCookieName, "", { maxAge: 0 })
      });
    }

    if (request.method === "GET" && url.pathname === "/api/app-state") {
      const state = await readState();
      const user = await authenticate(request);
      const scoped = user ? roleScopedAppState(state, user) : publicAppState(state);
      return sendJson(response, 200, {
        ok: true,
        storage: "mysql",
        state: scoped, revisions: stateRevisions(scoped)
      });
    }

    if (request.method === "POST" && url.pathname === "/api/app-state") {
      const user = await authenticate(request);
      if (!user) return sendJson(response, 401, { ok: false, reason: "Not authenticated." });
      const body = await parseBody(request);
      assertStateWritePermissions(user, body.items || {});
      let result;
      if (!dependencies.writeAppState) {
        result = await writeState(body.items || {}, { user, revisions: body.revisions });
      } else {
        const current = await readState();
        assertStateRevisions(body.items || {}, body.revisions, roleScopedAppState(current, user));
        const items = await mergeState(user, body.items || {}, current);
        result = await writeState(items);
        const scoped = roleScopedAppState(await readState(), user);
        result = { ...result, items: Object.fromEntries(Object.keys(body.items || {}).map(key => [key, scoped[key]])), revisions: stateRevisions(scoped) };
      }
      return sendJson(response, 200, { ok: true, storage: "mysql", ...result });
    }

    if (request.method === "POST" && url.pathname === "/api/admin/users/status") {
      const actor = await authenticate(request);
      if (!actor) return sendJson(response, 401, { ok: false, reason: "Not authenticated." });
      if (actor.role !== "admin") return sendJson(response, 403, { ok: false, reason: "You are not allowed to perform this action." });
      const body = await parseBody(request);
      const run = () => changeAccountAccess({ actor, body, mutateUser, limiter });
      const queued = appStateWriteQueue.then(run, run);
      appStateWriteQueue = queued.catch(() => {});
      const user = await queued;
      return sendJson(response, 200, { ok: true, user: publicAuthUser(user) });
    }

    if (request.method === "GET" && url.pathname === "/api/zoom/status") {
      return sendJson(response, 200, { ok: true, zoom: publicZoomStatus() });
    }

    if (request.method === "GET" && url.pathname === "/api/zoom/recordings") {
      const user = await authenticate(request);
      if (!user) return sendJson(response, 401, { ok: false, reason: "Not authenticated." });
      const requested = {
        courseId: url.searchParams.get("courseId") || "",
        meetingId: url.searchParams.get("meetingId") || "",
        uuid: url.searchParams.get("uuid") || ""
      };
      const course = zoomCourseForUser(await readState(), user, requested);
      const query = { courseId: String(course.id), meetingId: course.zoomMeetingId || "", uuid: course.zoomMeetingUuid || "" };
      const store = await readRecordings();
      let record = findZoomRecord(store, query);
      const identifier = query.uuid || query.meetingId;
      let refreshError = "";
      if (url.searchParams.get("refresh") === "1" && identifier && Date.now() >= (recordingRefreshes.get(identifier) || 0)) {
        if (recordingRefreshes.size > 1000) recordingRefreshes.clear();
        recordingRefreshes.set(identifier, Date.now() + 30000);
        try {
          record = await refreshRecording(identifier, query);
        } catch (error) {
          // Missing recordings are normal before Zoom finishes processing.
          if (error.zoomStatus !== 404 && Number(error.zoomCode) !== 3301) refreshError = "تعذر تحديث التسجيل من Zoom. تحقق من صلاحية قراءة التسجيلات وتفعيل التسجيل السحابي.";
        }
      }
      return sendJson(response, 200, { ok: true, recording: publicZoomRecordingRecord(record), ...(refreshError ? { warning: refreshError } : {}) });
    }

    if (request.method === "GET" && url.pathname === "/api/email-settings") {
      return sendJson(response, 200, publicEmailSettings(await readEmailSettings()));
    }

    if (request.method === "POST" && url.pathname === "/api/activation-invite") {
      const body = await parseBody(request);
      const token = String(body.token || "").trim();
      const invites = await readActivationInvites();
      const tokenHash = activationTokenHash(token);
      const invite = token ? (invites[tokenHash] || invites[token]) : null;
      if (!invite?.user || activationInviteExpired(invite)) {
        if (invite) {
          delete invites[tokenHash];
          delete invites[token];
          await writeActivationInvites(invites);
        }
        return sendJson(response, 404, { ok: false, reason: "رابط التفعيل غير صالح." });
      }
      return sendJson(response, 200, { ok: true, user: invite.user });
    }

    if (request.method === "POST" && url.pathname === "/api/activation-complete") {
      const body = await parseBody(request);
      const user = await completeActivation(body.token, body.password);
      return sendJson(response, 200, { ok: true, user });
    }

    if (request.method === "POST" && url.pathname === "/api/registration-requests") {
      const body = await parseBody(request);
      const requestPayload = await appendRegistrationRequest(body.request || body);
      return sendJson(response, 201, { ok: true, request: requestPayload });
    }

    if (request.method === "POST" && url.pathname === "/api/email-settings") {
      await requireRequestRole(request, ["admin"]);
      const body = await parseBody(request);
      const previous = await readEmailSettings();
      const next = {
        ...previous,
        fromName: String(body.fromName || previous.fromName || defaultEmailSettings.fromName).trim(),
        fromEmail: String(body.fromEmail || previous.fromEmail || "").trim().toLowerCase(),
        smtpHost: String(body.smtpHost || previous.smtpHost || "smtp.gmail.com").trim(),
        smtpPort: String(body.smtpPort || previous.smtpPort || "587").trim(),
        appPassword: String(body.appPassword || previous.appPassword || "").trim(),
        autoSendActivation: body.autoSendActivation !== false
      };
      await writeEmailSettings(next);
      return sendJson(response, 200, publicEmailSettings(next));
    }

    if (request.method === "POST" && url.pathname === "/api/zoom/meetings") {
      const user = await authenticate(request);
      if (!user) return sendJson(response, 401, { ok: false, reason: "Not authenticated." });
      if (!["admin", "teacher"].includes(user.role)) return sendJson(response, 403, { ok: false });
      const body = await parseBody(request);
      if (!body.title) {
        return sendJson(response, 400, { ok: false, reason: "title is required." });
      }
      const current = await readState();
      if (body.courseId && stateArray(current, "teacherCourses").some(course => idsMatch(course.id, body.courseId))) zoomCourseForUser(current, user, { courseId: body.courseId }, { manage: true });
      if (user.role === "teacher" && body.scheduleId && !stateArray(current, "managedSchedule").some(item => idsMatch(item.id, body.scheduleId) && idsMatch(item.teacherId, user.id))) return sendJson(response, 403, { ok: false });
      delete body.zoomUserId;
      const meeting = await (dependencies.createZoomMeeting || createZoomMeeting)({ ...body, teacherId: user.id, teacherName: user.name, teacherEmail: user.email });
      return sendJson(response, 201, { ok: true, meeting });
    }

    if (request.method === "POST" && url.pathname === "/api/zoom/meetings/end") {
      const user = await authenticate(request);
      if (!user) return sendJson(response, 401, { ok: false, reason: "Not authenticated." });
      const body = await parseBody(request);
      const course = zoomCourseForUser(await readState(), user, body, { manage: true });
      const result = await (dependencies.endZoomMeeting || endZoomMeeting)({ courseId: course.id, meetingId: course.zoomMeetingId, uuid: course.zoomMeetingUuid });
      return sendJson(response, 200, { ok: true, ...result });
    }

    if (request.method === "POST" && url.pathname === "/api/zoom/meetings/start-link") {
      const user = await authenticate(request);
      if (!user) return sendJson(response, 401, { ok: false, reason: "Not authenticated." });
      const course = zoomCourseForUser(await readState(), user, await parseBody(request), { manage: true });
      if (!course.zoomMeetingId) return sendJson(response, 422, { error: "No Zoom meeting is linked to this lesson." });
      // Zoom host links expire. Fetch a fresh one only for this lesson's host.
      const meeting = await (dependencies.zoomApi || zoomApi)(`/meetings/${zoomPathIdentifier(course.zoomMeetingId)}`);
      if (!meeting.start_url) return sendJson(response, 502, { error: "Zoom did not return a host link. Check meeting read permissions." });
      return sendJson(response, 200, { ok: true, startUrl: meeting.start_url }, { "Cache-Control": "no-store" });
    }

    if (request.method === "POST" && url.pathname === "/api/zoom/webhook") {
      return handleZoomWebhook(request, response);
    }

    if (request.method === "POST" && url.pathname === "/api/send-activation-email") {
      await requireRequestRole(request, ["admin"]);
      const body = await parseBody(request);
      if (!body.to || !body.activationBaseUrl || !body.user?.id) {
        return sendJson(response, 400, { sent: false, reason: "بيانات دعوة التفعيل غير مكتملة." });
      }
      const result = await sendActivationEmail(body);
      return sendJson(response, result.sent ? 200 : 422, result);
    }

    return sendJson(response, 404, { error: "Not found" });
  } catch (error) {
    console.error(error);
    const statusCode = Number(error.statusCode) || 500;
    return sendJson(response, statusCode, statusCode === 500
      ? { error: "Backend error" }
      : { error: error.message });
  }
  };
}

const handleRequest = createRequestHandler();
const isMainModule = Boolean(process.argv[1]) && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMainModule) {
  http.createServer(handleRequest).listen(port, host, () => {
    console.log(`Backend API listening on http://${host}:${port}`);
  });
}

export { roleScopedAppState, stateWriteAllowedForRole, createRequestHandler, mergeUserSecrets, mutateUserAccessInDatabase, zoomMeetingPayload, createZoomMeeting, mergeRoleScopedStateWrite, normalizeZoomRecordingFiles, zoomRecordingRecordFromObject, zoomCourseForUser, findZoomRecord, saveZoomRecord, verifyZoomWebhookSignature, replaceArrayState };
