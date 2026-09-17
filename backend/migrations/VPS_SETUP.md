# One-file VPS database update

Upload `backend/setup-vps-db.mjs` beside the VPS backend's existing `.env`, `package.json`, and installed `node_modules`. The SQL is embedded; the standalone updater does not need this migrations directory or the new application server files. It needs the backend's existing `mysql2` and `dotenv` packages.

Do not replace the VPS `.env` with the local Windows `.env` or a backup file. Keep the VPS's real connection settings. Existing process environment variables take precedence, matching the backend's dotenv behavior. The script does not print credentials, reset passwords, create grants, or guess database names.

After taking a database backup, run inside the VPS `backend` directory:

```sh
node setup-vps-db.mjs
```

The command connects using `MYSQL_HOST`, `MYSQL_PORT`, `MYSQL_USER`, `MYSQL_PASSWORD`, and `MYSQL_DATABASE`. It adds only the three missing tables: `exercise_submissions`, `teacher_absences`, `general_plans`. It requires an already initialized application database containing `users` and `storage_meta`; it is not a fresh MySQL/server installation or application deployment script.

It uses a named MySQL lock to prevent two copies of this updater from running together. This does not stop the application from writing. Existing tables are not altered; missing required columns or incompatible import engines cause an error. Repeating the command does not delete/recreate existing tables.

For a read-only connection/schema check:

```sh
node setup-vps-db.mjs --check
```

## Actual new records

There are no verified new production records accompanying these code changes. The default command therefore performs no data INSERT and does not seed demo users, marks, absences, or plans. Creating a new table is not the same as inventing records for it.

If real records are later supplied, use a JSON object with any subset of these array keys:

```json
{
  "exerciseSubmissions": [],
  "teacherAbsences": [],
  "generalPlans": []
}
```

Each record must be a complete application payload with a stable `id`. Preserve real reference IDs. Exercise rows map `courseId`, `userId`, `studentName`, `submittedAt`; absence rows map `scheduleId`, `teacherId`, `date`; plan rows map `niveauId`, `groupeId`. All additional payload fields are stored as provided. This tool does not validate the truth of grades/absence approvals, ownership, business rules, or foreign references: import only reviewed, trusted exports, not participant-supplied JSON.

Back up the database and pause application writes before an import. Then run:

```sh
node setup-vps-db.mjs --data /absolute/path/to/new-data.json
```

Only IDs missing from each destination table are inserted. An already-existing ID is skipped, even if its supplied content differs. Existing records and account tables are never updated. SQL strict mode prevents silent truncation during import. The data inserts and new storage markers use one transaction across InnoDB tables; an insert failure triggers rollback. DDL is not transactional: already-created empty tables can remain after a failure, and a later run safely resumes.

`--check` can be combined with `--data` to validate file shape and inspect the schema. It does not test all insert-value compatibility, reference validity, or conflicts with existing row IDs.

Limits: 10 MB JSON and 10,000 records per run. No raw SQL dump is automatically imported. The script does not read activation invites, email secrets, Zoom caches, frontend demo arrays, or legacy `app_state` records as a source of new data.

## Boundaries

This updates only the three missing database tables and optionally imports explicitly supplied records. It does not deploy/restart the backend, configure Zoom, fix credentials, or resolve the seven bugs in the review. No command was run against the VPS or the real local database during development. The included tests use isolated database fixtures; successful real deployment must be confirmed on the VPS.
