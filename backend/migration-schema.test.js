import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = relative => readFileSync(new URL(relative, import.meta.url), "utf8");
const server = read("./server.js");
const original = read("./data/zaytouna-platform-mysql.sql");
const migration = read("./migrations/20260915_add_missing_tables.sql");
const tableDefinitions = source => new Map([...source.matchAll(
  /CREATE TABLE IF NOT EXISTS `?(\w+)`?\s*\(([\s\S]*?)\)\s*(?:CHARACTER SET|ENGINE=)/g
)].map(match => [match[1], match[2]]));
const currentTables = tableDefinitions(server);
const originalTables = tableDefinitions(original);
const migratedTables = tableDefinitions(migration);
const normalize = text => text.replaceAll("`", "").replace(/\s+/g, " ").trim();

test("additive migration covers exactly the tables missing from the bundled SQL", () => {
  const missing = [...currentTables.keys()].filter(name => !originalTables.has(name)).sort();
  assert.deepEqual(missing, ["exercise_submissions", "general_plans", "teacher_absences"]);
  assert.deepEqual([...migratedTables.keys()].sort(), missing);
});

test("migration columns and indexes match current backend definitions exactly", () => {
  for (const [name, definition] of migratedTables) {
    assert.equal(normalize(definition), normalize(currentTables.get(name)), name);
  }
});

test("migration contains only conditional InnoDB table creation, no data writes", () => {
  const statements = migration.replace(/^--.*$/gm, "").split(";").map(part => part.trim()).filter(Boolean);
  assert.equal(statements.length, 3);
  for (const statement of statements) {
    assert.match(statement, /^CREATE TABLE IF NOT EXISTS /);
    assert.match(statement, /ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci$/);
    assert.doesNotMatch(statement, /\b(DROP|TRUNCATE|DELETE|INSERT|REPLACE|ALTER)\b/i);
  }
});
