import test from "node:test";
import assert from "node:assert/strict";
import { roleScopedAppState, stateWriteAllowedForRole } from "./server.js";

const asState = (value) => JSON.stringify(value);

test("student receives only their own bulletin distribution marker", () => {
  const state = {
    acceptedUsers: asState([
      { id: "student-a", name: "A", role: "student", niveauId: "n1", groupeId: "ga" },
      { id: "student-b", name: "B", role: "student", niveauId: "n2", groupeId: "gb" }
    ]),
    gradeSettings: asState({
      academicYear: "2026-2027",
      subjectCoefficients: { "n1::quran": 2 },
      bulletinDistributions: {
        "2026-2027::n1::ga": "2026-08-31T12:00:00.000Z",
        "2026-2027::n2::gb": "2026-08-31T13:00:00.000Z"
      }
    })
  };

  const scoped = roleScopedAppState(state, { id: "student-a", role: "student", niveauId: "n1", groupeId: "ga" });
  const settings = JSON.parse(scoped.gradeSettings);
  assert.deepEqual(settings, {
    academicYear: "2026-2027",
    bulletinDistributions: { "2026-2027::n1::ga": "2026-08-31T12:00:00.000Z" }
  });
  assert.equal(settings.subjectCoefficients, undefined);
});

test("student receives assigned published exams and questionnaires", () => {
  const state = {
    acceptedUsers: asState([{ id: "student-a", name: "A", role: "student", niveauId: "n1", groupeId: "ga" }]),
    managedExams: asState([
      { id: 1, niveauId: "n1", groupeId: "ga", publishedToStudents: true },
      { id: 2, niveauId: "n2", groupeId: "gb", publishedToStudents: true }
    ]),
    managedQuestionnaires: asState([
      { id: 3, niveauId: "n1", groupeId: "ga", targetAudience: "students" },
      { id: 4, niveauId: "n2", groupeId: "gb", targetAudience: "students" }
    ]),
    gradeSettings: asState({ academicYear: "2026-2027" })
  };

  const scoped = roleScopedAppState(state, { id: "student-a", role: "student", niveauId: "n1", groupeId: "ga" });
  assert.deepEqual(JSON.parse(scoped.managedExams).map((item) => item.id), [1]);
  assert.deepEqual(JSON.parse(scoped.managedQuestionnaires).map((item) => item.id), [3]);
});

test("teacher can save only their own questionnaire response", () => {
  assert.equal(stateWriteAllowedForRole("teacher", "questionnaireSubmissions"), true);
  assert.equal(stateWriteAllowedForRole("teacher", "acceptedUsers"), false);
});

test("student receives only approved absences for their own schedule", () => {
  const state = {
    acceptedUsers: asState([{ id: "student-a", name: "A", role: "student", niveauId: "n1", groupeId: "ga" }]),
    managedSchedule: asState([
      { id: "slot-a", niveauId: "n1", groupeId: "ga" },
      { id: "slot-b", niveauId: "n2", groupeId: "gb" }
    ]),
    teacherAbsences: asState([
      { id: "a", scheduleId: "slot-a", status: "approved" },
      { id: "b", scheduleId: "slot-a", status: "pending" },
      { id: "c", scheduleId: "slot-b", status: "approved" }
    ]),
    gradeSettings: asState({ academicYear: "2026-2027" })
  };

  const scoped = roleScopedAppState(state, { id: "student-a", role: "student", niveauId: "n1", groupeId: "ga" });
  assert.deepEqual(JSON.parse(scoped.teacherAbsences).map((item) => item.id), ["a"]);
});
