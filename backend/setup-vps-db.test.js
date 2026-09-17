import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { tables, connectionConfig, validateData, updateDatabase, safeErrorMessage } from "./setup-vps-db.mjs";

function fixture({ existing = [], busy = false, missingBase = false, badColumns = false, failInsert = false, nonTransactional = false } = {}) {
  const schema = new Map(missingBase ? [] : [["users", "InnoDB"], ["storage_meta", "InnoDB"]]);
  const state = { rows: new Map(), meta: new Set() };
  for (const table of existing) { schema.set(table, nonTransactional ? "MyISAM" : "InnoDB"); state.rows.set(table, new Map()); }
  let snapshot;
  const calls = [];
  const connection = {
    async query(sql) {
      calls.push({ sql });
      if (sql === "SELECT DATABASE() AS databaseName") return [[{ databaseName: "fixture_db" }]];
      if (sql.includes("information_schema.TABLES")) return [[...schema].map(([tableName, engine]) => ({ tableName, engine }))];
      if (sql.startsWith("SHOW COLUMNS")) {
        const table = sql.match(/`(\w+)`/)[1];
        const spec = tables.find(spec => spec.table === table);
        return [["id", ...spec.fields.map(([column]) => column), "sort_index", "payload", "updated_at"].filter(column => !badColumns || column !== "payload").map(Field => ({ Field, Key: Field === "id" ? "PRI" : "" }))];
      }
      if (sql.startsWith("CREATE TABLE")) {
        const table = sql.match(/EXISTS (\w+)/)[1];
        schema.set(table, "InnoDB"); state.rows.set(table, new Map()); return [{}];
      }
      if (sql.includes("MAX(sort_index)")) {
        const table = sql.match(/`(\w+)`/)[1];
        return [[{ maxIndex: Math.max(-1, ...[...state.rows.get(table).values()].map(row => row.sort_index)) }]];
      }
      if (sql.includes("@@SESSION.sql_mode")) return [[{ sqlMode: "NO_ENGINE_SUBSTITUTION" }]];
      throw new Error("Unexpected fixture query: " + sql);
    },
    async execute(sql, args) {
      calls.push({ sql, args });
      if (sql.includes("GET_LOCK")) return [[{ acquired: busy ? 0 : 1 }]];
      if (sql.includes("RELEASE_LOCK") || sql.startsWith("SET SESSION")) return [[{}]];
      if (sql.startsWith("SELECT state_key")) return [state.meta.has(args[0]) ? [{ state_key: args[0] }] : []];
      if (sql.startsWith("INSERT INTO storage_meta")) { state.meta.add(args[0]); return [{}]; }
      if (sql.startsWith("SELECT id")) {
        const table = sql.match(/`(\w+)`/)[1];
        return [state.rows.get(table).has(args[0]) ? [{ id: args[0] }] : []];
      }
      if (sql.startsWith("INSERT INTO `")) {
        const table = sql.match(/`(\w+)`/)[1];
        if (failInsert && table === "teacher_absences") throw Object.assign(new Error("Sensitive fixture SQL must not leak"), { code: "ER_DUP_ENTRY" });
        state.rows.get(table).set(args[0], { sort_index: args.at(-2), payload: args.at(-1) });
        return [{}];
      }
      throw new Error("Unexpected fixture execute: " + sql);
    },
    async beginTransaction() { calls.push({ sql: "BEGIN" }); snapshot = structuredClone(state); },
    async commit() { calls.push({ sql: "COMMIT" }); snapshot = undefined; },
    async rollback() { calls.push({ sql: "ROLLBACK" }); state.rows = snapshot.rows; state.meta = snapshot.meta; }
  };
  return { connection, calls, schema, state };
}

test("single-file updater embeds the exact reviewed additive migration", () => {
  const migration = readFileSync(new URL("./migrations/20260915_add_missing_tables.sql", import.meta.url), "utf8");
  const statements = migration.replace(/^--.*$/gm, "").split(";").map(sql => sql.trim()).filter(Boolean);
  const normalize = sql => sql.replace(/\s+/g, " ").trim();
  assert.deepEqual(tables.map(spec => normalize(spec.sql)), statements.map(normalize));
});

test("connection config requires an explicit application DB/user and preserves the secret without logging it", () => {
  assert.throws(() => connectionConfig({}), /MYSQL_DATABASE/);
  assert.throws(() => connectionConfig({ MYSQL_DATABASE: "mysql", MYSQL_USER: "fixture" }), /system database/);
  assert.throws(() => connectionConfig({ MYSQL_DATABASE: "fixture", MYSQL_USER: "fixture", MYSQL_PORT: "bad" }), /MYSQL_PORT/);
  const config = connectionConfig({ MYSQL_DATABASE: "fixture", MYSQL_USER: "fixture", MYSQL_PASSWORD: "fixture-secret" });
  assert.equal(config.password, "fixture-secret");
  assert.equal(config.multipleStatements, false);
});

test("default run creates only three missing tables and inserts no invented data", async () => {
  const db = fixture();
  const result = await updateDatabase(db.connection);
  assert.deepEqual(result.created, tables.map(spec => spec.table));
  assert.equal(result.dataSourceProvided, false);
  assert.equal(db.calls.some(call => /^(INSERT|UPDATE|DELETE|DROP|ALTER|BEGIN)/.test(call.sql)), false);
  assert.ok(db.calls.at(-1).sql.includes("RELEASE_LOCK"));
});

test("rerunning after schema creation leaves all existing tables and rows intact", async () => {
  const db = fixture();
  await updateDatabase(db.connection);
  db.state.rows.get("general_plans").set("existing", { sort_index: 0, payload: "unchanged" });
  const result = await updateDatabase(db.connection);
  assert.deepEqual(result.created, []);
  assert.equal(db.state.rows.get("general_plans").get("existing").payload, "unchanged");
});

test("--check performs only read-only queries and reports missing tables", async () => {
  const db = fixture();
  const result = await updateDatabase(db.connection, { checkOnly: true, data: { generalPlans: [{ id: "fixture" }] } });
  assert.equal(result.plannedTables.length, 3);
  assert.ok(db.calls.every(call => /^(SELECT|SHOW)/.test(call.sql) && !call.sql.includes("GET_LOCK")));
  assert.equal(db.schema.size, 2);
});

test("import inserts only missing IDs, preserves existing payloads, and is repeatable", async () => {
  const db = fixture({ existing: tables.map(spec => spec.table) });
  db.state.rows.get("general_plans").set("existing", { sort_index: 5, payload: "existing-data" });
  const data = { generalPlans: [{ id: "existing", niveauId: "ignored-change" }, { id: "new-plan", niveauId: "n1" }] };
  const first = await updateDatabase(db.connection, { data });
  assert.equal(first.inserted.general_plans, 1);
  assert.equal(first.skippedExisting.general_plans, 1);
  assert.equal(db.state.rows.get("general_plans").get("existing").payload, "existing-data");
  assert.equal(db.state.rows.get("general_plans").get("new-plan").sort_index, 6);
  assert.equal(db.state.meta.has("generalPlans"), true);
  assert.ok(db.calls.some(call => call.sql.startsWith("SET SESSION") && call.args[0].includes("STRICT_ALL_TABLES")));
  const second = await updateDatabase(db.connection, { data });
  assert.equal(second.inserted.general_plans, 0);
  assert.equal(second.skippedExisting.general_plans, 2);
});

test("a later insert failure rolls back earlier inserts and metadata but not additive DDL", async () => {
  const db = fixture({ failInsert: true });
  await assert.rejects(updateDatabase(db.connection, { data: {
    exerciseSubmissions: [{ id: "exercise", userId: "s1", courseId: "c1" }],
    teacherAbsences: [{ id: "absence", teacherId: "t1", scheduleId: "slot1" }]
  } }), { code: "ER_DUP_ENTRY" });
  assert.equal(db.schema.size, 5);
  assert.equal([...db.state.rows.values()].reduce((sum, rows) => sum + rows.size, 0), 0);
  assert.equal(db.state.meta.size, 0);
  assert.ok(db.calls.some(call => call.sql === "ROLLBACK"));
  assert.ok(db.calls.at(-1).sql.includes("RELEASE_LOCK"));
});

test("invalid or account imports fail before database access", async () => {
  for (const data of [
    { acceptedUsers: [] }, { generalPlans: "bad" }, { generalPlans: [{ niveauId: "n1" }] },
    { generalPlans: [{ id: "a" }, { id: "a" }] }, { teacherAbsences: [{ id: "a", teacherId: "x".repeat(81) }] }
  ]) {
    const db = fixture();
    await assert.rejects(updateDatabase(db.connection, { data }));
    assert.equal(db.calls.length, 0);
  }
  assert.doesNotThrow(() => validateData({ generalPlans: [{ id: 123 }] }));
});

test("wrong database or incompatible existing schema is rejected before any DDL", async () => {
  for (const options of [{ missingBase: true }, { existing: ["general_plans"], badColumns: true }]) {
    const db = fixture(options);
    await assert.rejects(updateDatabase(db.connection));
    assert.equal(db.calls.some(call => call.sql.startsWith("CREATE")), false);
  }
});

test("nontransactional existing tables cannot receive an import", async () => {
  const db = fixture({ existing: ["general_plans"], nonTransactional: true });
  await assert.rejects(updateDatabase(db.connection, { data: { generalPlans: [{ id: "new" }] } }), /InnoDB/);
  assert.equal(db.calls.some(call => call.sql.startsWith("CREATE") || call.sql.startsWith("INSERT")), false);
});

test("busy migration lock causes no schema writes and is not released by the wrong process", async () => {
  const db = fixture({ busy: true });
  await assert.rejects(updateDatabase(db.connection), /Another database updater/);
  assert.equal(db.calls.some(call => call.sql.startsWith("CREATE") || call.sql.includes("RELEASE_LOCK")), false);
});

test("database/driver errors never expose secrets or raw record data", () => {
  assert.doesNotMatch(safeErrorMessage({ code: "ER_ACCESS_DENIED_ERROR", message: "secret-user secret-password" }), /secret-user|secret-password/);
  assert.doesNotMatch(safeErrorMessage({ message: "secret SQL and record values" }), /secret SQL/);
});
