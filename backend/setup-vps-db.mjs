#!/usr/bin/env node
// Copy this one file into the VPS backend directory, beside its existing .env
// and node_modules. It never imports server.js or runs its demo/legacy seeders.
import fs from "node:fs/promises";
import path from "node:path";
import { createHash } from "node:crypto";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";
import mysql from "mysql2/promise";

const directory = path.dirname(fileURLToPath(import.meta.url));
export const tables = [
  {
    key: "exerciseSubmissions", table: "exercise_submissions",
    fields: [["course_id", "courseId", 100], ["user_id", "userId", 80], ["student_name", "studentName", 255], ["submitted_at", "submittedAt", 40]],
    sql: `CREATE TABLE IF NOT EXISTS exercise_submissions (
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
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`
  },
  {
    key: "teacherAbsences", table: "teacher_absences",
    fields: [["schedule_id", "scheduleId", 100], ["teacher_id", "teacherId", 80], ["absence_date", "date", 40]],
    sql: `CREATE TABLE IF NOT EXISTS teacher_absences (
      id VARCHAR(140) NOT NULL PRIMARY KEY,
      schedule_id VARCHAR(100) NOT NULL DEFAULT '',
      teacher_id VARCHAR(80) NOT NULL DEFAULT '',
      absence_date VARCHAR(40) NOT NULL DEFAULT '',
      sort_index INT NOT NULL DEFAULT 0,
      payload LONGTEXT NOT NULL,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX idx_teacher_absences_schedule (schedule_id),
      INDEX idx_teacher_absences_teacher (teacher_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`
  },
  {
    key: "generalPlans", table: "general_plans",
    fields: [["niveau_id", "niveauId", 80], ["groupe_id", "groupeId", 80]],
    sql: `CREATE TABLE IF NOT EXISTS general_plans (
      id VARCHAR(140) NOT NULL PRIMARY KEY,
      niveau_id VARCHAR(80) NOT NULL DEFAULT '',
      groupe_id VARCHAR(80) NOT NULL DEFAULT '',
      sort_index INT NOT NULL DEFAULT 0,
      payload LONGTEXT NOT NULL,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX idx_general_plans_class (niveau_id, groupe_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`
  }
];

class SetupError extends Error {}
const fail = message => { throw new SetupError(message); };
const quote = identifier => `\`${identifier.replaceAll("`", "``")}\``;

export function connectionConfig(env) {
  const database = String(env.MYSQL_DATABASE || "").trim();
  const user = String(env.MYSQL_USER || "").trim();
  const port = Number(env.MYSQL_PORT || 3306);
  if (!database || !user) fail("Set MYSQL_DATABASE and MYSQL_USER in the VPS backend/.env; no database/root fallback is used.");
  if (["mysql", "sys", "information_schema", "performance_schema"].includes(database.toLowerCase())) fail("Refusing a MySQL system database.");
  if (!Number.isInteger(port) || port < 1 || port > 65535) fail("MYSQL_PORT is invalid.");
  return {
    host: env.MYSQL_HOST || "127.0.0.1", port, user,
    password: env.MYSQL_PASSWORD || "", database,
    charset: "utf8mb4", connectTimeout: 10000, multipleStatements: false
  };
}

export function validateData(data = {}) {
  if (!data || typeof data !== "object" || Array.isArray(data)) fail("The import JSON must be an object of named arrays.");
  if (Object.keys(data).some(key => !tables.some(table => table.key === key))) fail("Only exerciseSubmissions, teacherAbsences and generalPlans may be imported. Account imports are not supported.");
  let total = 0;
  for (const spec of tables) {
    const rows = data[spec.key] ?? [];
    if (!Array.isArray(rows)) fail(`${spec.key} must be an array.`);
    const ids = new Set();
    for (const [index, row] of rows.entries()) {
      const label = `${spec.key}, record ${index + 1}`;
      if (!row || typeof row !== "object" || Array.isArray(row)) fail(`${label}: expected an object.`);
      if (!["string", "number"].includes(typeof row.id) || (typeof row.id === "number" && !Number.isSafeInteger(row.id))) fail(`${label}: an explicit stable id is required.`);
      const id = String(row.id);
      if (!id || id !== id.trim() || [...id].length > 140) fail(`${label}: invalid id.`);
      if (ids.has(id)) fail(`${label}: duplicate id in import file.`);
      ids.add(id);
      for (const [, property, limit] of spec.fields) {
        if (row[property] != null && !["string", "number"].includes(typeof row[property])) fail(`${label}: invalid ${property}.`);
        if ([...String(row[property] ?? "").trim()].length > limit) fail(`${label}: ${property} exceeds the database column length.`);
      }
    }
    total += rows.length;
  }
  if (total > 10000) fail("Import is limited to 10,000 records per run. Split larger verified imports.");
  return data;
}

async function inspectSchema(connection, data) {
  const [rows] = await connection.query("SELECT TABLE_NAME AS tableName, ENGINE AS engine FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE()");
  const existing = new Map(rows.map(row => [row.tableName, row.engine]));
  if (!existing.has("users") || !existing.has("storage_meta")) fail("This is not an initialized application database (users/storage_meta missing). Check MYSQL_DATABASE; this updater is not a fresh-install script.");
  const importing = tables.some(spec => data[spec.key]?.length);
  if (importing && existing.get("storage_meta")?.toLowerCase() !== "innodb") fail("storage_meta must use InnoDB before importing transactional data.");
  for (const spec of tables) {
    if (!existing.has(spec.table)) continue;
    const [columns] = await connection.query(`SHOW COLUMNS FROM ${quote(spec.table)}`);
    const byName = new Map(columns.map(column => [column.Field, column]));
    const required = ["id", ...spec.fields.map(([column]) => column), "sort_index", "payload", "updated_at"];
    if (required.some(name => !byName.has(name)) || byName.get("id")?.Key !== "PRI") fail(`${spec.table} has an incompatible existing schema. No automatic ALTER or replacement will be attempted.`);
    if (importing && existing.get(spec.table)?.toLowerCase() !== "innodb") fail(`${spec.table} must use InnoDB before importing transactional data.`);
  }
  return existing;
}

export async function updateDatabase(connection, { data = {}, checkOnly = false } = {}) {
  validateData(data);
  const [identity] = await connection.query("SELECT DATABASE() AS databaseName");
  const database = identity[0]?.databaseName;
  if (!database) fail("No database selected.");
  const lockName = "zaytouna-setup-" + createHash("sha256").update(database).digest("hex").slice(0, 40);
  let locked = false;
  let transaction = false;
  const report = { database, checkOnly, created: [], alreadyPresent: [], plannedTables: [], inserted: {}, skippedExisting: {}, dataSourceProvided: Object.keys(data).length > 0 };
  try {
    if (!checkOnly) {
      const [lock] = await connection.execute("SELECT GET_LOCK(?, 10) AS acquired", [lockName]);
      if (Number(lock[0]?.acquired) !== 1) fail("Another database updater is running. Retry after it finishes.");
      locked = true;
    }
    const existing = await inspectSchema(connection, data);
    for (const spec of tables) {
      if (existing.has(spec.table)) report.alreadyPresent.push(spec.table);
      else report.plannedTables.push(spec.table);
    }
    if (checkOnly) return report;
    // MySQL DDL implicitly commits: a failed run can leave already-created
    // empty tables. No existing table is altered; rerunning safely resumes.
    for (const spec of tables) {
      if (!existing.has(spec.table)) {
        await connection.query(spec.sql);
        report.created.push(spec.table);
      }
    }
    if (!tables.some(spec => data[spec.key]?.length)) return report;
    // An older VPS may not enable strict SQL mode. Reject truncation/coercion
    // instead of quietly importing shortened IDs or invalid column values.
    const [modes] = await connection.query("SELECT @@SESSION.sql_mode AS sqlMode");
    const sqlModes = String(modes[0]?.sqlMode || "").split(",").filter(Boolean);
    if (!sqlModes.includes("STRICT_ALL_TABLES")) {
      await connection.execute("SET SESSION sql_mode = ?", [[...sqlModes, "STRICT_ALL_TABLES"].join(",")]);
    }
    await connection.beginTransaction();
    transaction = true;
    for (const spec of tables) {
      report.inserted[spec.table] = 0;
      report.skippedExisting[spec.table] = 0;
      const incoming = data[spec.key] || [];
      if (!incoming.length) continue;
      const [maxRows] = await connection.query(`SELECT COALESCE(MAX(sort_index), -1) AS maxIndex FROM ${quote(spec.table)}`);
      let nextIndex = Number(maxRows[0].maxIndex) + 1;
      if (!Number.isSafeInteger(nextIndex) || nextIndex < 0 || nextIndex + incoming.length > 2147483647) fail(`${spec.table}: sort_index capacity exceeded.`);
      for (const row of incoming) {
        const [saved] = await connection.execute(`SELECT id FROM ${quote(spec.table)} WHERE id = ? FOR UPDATE`, [String(row.id)]);
        if (saved.length) { report.skippedExisting[spec.table]++; continue; }
        const columns = ["id", ...spec.fields.map(([column]) => column), "sort_index", "payload"];
        const values = [String(row.id), ...spec.fields.map(([, property]) => String(row[property] ?? "").trim()), nextIndex++, JSON.stringify(row)];
        await connection.execute(`INSERT INTO ${quote(spec.table)} (${columns.map(quote).join(", ")}) VALUES (${values.map(() => "?").join(", ")})`, values);
        report.inserted[spec.table]++;
      }
      if (report.inserted[spec.table]) {
        const [meta] = await connection.execute("SELECT state_key FROM storage_meta WHERE state_key = ? FOR UPDATE", [spec.key]);
        if (!meta.length) await connection.execute("INSERT INTO storage_meta (state_key) VALUES (?)", [spec.key]);
      }
    }
    await connection.commit();
    transaction = false;
    return report;
  } catch (error) {
    if (transaction) await connection.rollback();
    throw error;
  } finally {
    if (locked) await connection.execute("SELECT RELEASE_LOCK(?)", [lockName]);
  }
}

export function safeErrorMessage(error) {
  if (error instanceof SetupError) return error.message;
  const messages = {
    ER_ACCESS_DENIED_ERROR: "MySQL rejected the credentials. Correct MYSQL_USER/MYSQL_PASSWORD in the VPS .env; no password was changed.",
    ER_BAD_DB_ERROR: "MYSQL_DATABASE does not exist. Select the existing application database; this script does not create or guess a database.",
    ECONNREFUSED: "MySQL is not reachable. Check the service, MYSQL_HOST and MYSQL_PORT.",
    ETIMEDOUT: "MySQL connection timed out. Check host, port and firewall.",
    ER_TABLEACCESS_DENIED_ERROR: "The database user lacks a required CREATE/SELECT/INSERT permission.",
    ER_DUP_ENTRY: "Concurrent or conflicting data was detected. Import inserts were rolled back; existing data was not overwritten.",
    ENOENT: "A required file was not found. Keep this script beside backend/.env and check the --data path."
  };
  return messages[error?.code] || "Setup failed. Check the VPS configuration and schema. No raw SQL, record content, or credentials are printed. Created empty tables may remain; retry is safe.";
}

async function main() {
  const args = process.argv.slice(2);
  if (args.includes("--help")) {
    console.log("Usage: node setup-vps-db.mjs [--check] [--data /path/to/new-data.json]\nDefault: connect using backend/.env and add the three missing tables.\n--check: read-only connection/schema check; no table creation or data import.\n--data: insert only missing IDs from exerciseSubmissions/teacherAbsences/generalPlans arrays.\nBack up the database and pause application writes before importing records.\nNo demo data, credential changes, service restart, or seven-bug fixes are included.");
    return;
  }
  let dataPath;
  let checkOnly = false;
  for (let index = 0; index < args.length; index++) {
    if (args[index] === "--check") checkOnly = true;
    else if (args[index] === "--data" && args[index + 1] && !dataPath && !args[index + 1].startsWith("--")) dataPath = path.resolve(args[++index]);
    else fail("Invalid arguments. Run with --help.");
  }
  let data = {};
  if (dataPath) {
    if ((await fs.stat(dataPath)).size > 10 * 1024 * 1024) fail("Import JSON exceeds 10 MB.");
    try { data = JSON.parse((await fs.readFile(dataPath, "utf8")).replace(/^\uFEFF/, "")); }
    catch (error) { if (error instanceof SyntaxError) fail("Import file is not valid JSON."); throw error; }
  }
  validateData(data);
  const env = { ...dotenv.parse(await fs.readFile(path.join(directory, ".env"))), ...process.env };
  const connection = await mysql.createConnection(connectionConfig(env));
  try {
    console.log(JSON.stringify(await updateDatabase(connection, { data, checkOnly }), null, 2));
    if (!dataPath) console.log("No new record file supplied: no data INSERT was performed. No demo records were generated.");
    if (checkOnly) console.log("Read-only check complete. Import row conflicts and SQL value compatibility are not tested in --check mode.");
  } finally {
    await connection.end();
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch(error => { console.error(safeErrorMessage(error)); process.exitCode = 1; });
}
