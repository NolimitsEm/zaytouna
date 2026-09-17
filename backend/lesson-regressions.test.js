import test from "node:test";
import assert from "node:assert/strict";
import { memoryApi, password } from "./test-support/memory-api.js";
import { stateRevision, assertStateRevisions } from "./state-revisions.js";
import { validateStudentSubmission } from "./academic-policy.js";
const {
  roleScopedAppState,
  mergeRoleScopedStateWrite,
  normalizeZoomRecordingFiles,
  zoomRecordingRecordFromObject,
  saveZoomRecord,
  findZoomRecord,
  replaceArrayState,
} = await import("./server.js");
const users = [
  { id: "a", role: "admin" },
  { id: "t", role: "teacher" },
  { id: "other", role: "teacher" },
  { id: "s", role: "student", niveauId: "n1", groupeId: "g1" },
  { id: "s2", role: "student", niveauId: "n2", groupeId: "g1" },
].map((user) => ({
  ...user,
  name: user.id,
  email: `${user.id}@example.invalid`,
  password,
  emailConfirmed: true,
  isDisabled: false,
  sessionVersion: 0,
}));
const student = users[3];
const teacher = users[1];
const course = {
  id: "lesson-string",
  teacherId: "t",
  niveauId: "n1",
  groupeId: "g1",
  studentIds: ["s"],
  publishedToStudents: true,
  zoomMeetingId: "123",
  zoomMeetingUuid: "/uuid/",
  zoomStartUrl: "https://zoom.invalid/start?zak=HOST",
  zoomJoinUrl: "https://zoom.invalid/join",
  exercise: { url: "https://fixture.invalid/exercise.pdf" },
};
const exam = {
  id: "exam1",
  teacherId: "t",
  niveauId: "n1",
  groupeId: "g1",
  opensAt: new Date(Date.now() - 60000).toISOString(),
  durationMinutes: 60,
  questionItems: [
    {
      text: "Q?",
      type: "qcm",
      points: 3,
      options: ["A", "B"],
      correctAnswers: ["A"],
    },
    { text: "Explain", type: "text", points: 2, correctAnswer: "private" },
  ],
  questions: 2,
};
const state = {
  teacherCourses: JSON.stringify([course]),
  managedExams: JSON.stringify([exam]),
  managedSchedule: JSON.stringify([{ id: "sch", teacherId: "t" }]),
  examSubmissions: "[]",
  exerciseSubmissions: "[]",
  teacherAbsences: "[]",
};

test("database collection precondition locks current rows and rejects conflicts before DELETE", async () => {
  let reads = 0;
  const connection = {
    query: async sql => {
      assert.match(sql, /^SELECT payload FROM courses .* FOR UPDATE$/);
      reads += 1;
      return [[{ payload: JSON.stringify(course) }, { payload: JSON.stringify({ ...course, id: "newer-course" }) }]];
    },
    execute: async () => assert.fail("No destructive write may happen after a conflict")
  };
  await assert.rejects(replaceArrayState(connection, "teacherCourses", "[]", { expectedArrays: { teacherCourses: JSON.stringify([course]) } }), { statusCode: 409 });
  assert.equal(reads, 1);
});

test("student payloads have no answer keys or host start token; teacher retains correction keys", () => {
  const scoped = roleScopedAppState(state, student);
  assert.equal(scoped.managedExams.includes("correctAnswer"), false);
  assert.equal(scoped.teacherCourses.includes("HOST"), false);
  assert.equal(JSON.parse(scoped.managedExams)[0].questions, 2);
  assert.ok(
    roleScopedAppState(state, teacher).managedExams.includes("correctAnswers"),
  );
});

test("exam marks and question metadata are computed from server questions, not client marks", async () => {
  const item = {
    id: "sub",
    userId: "s",
    examId: "exam1",
    score: "999/999",
    awardedPoints: 999,
    answers: [
      { answer: ["B"], points: 999, correctAnswers: ["B"] },
      { answer: "reason", awardedPoints: 999 },
    ],
  };
  const result = await mergeRoleScopedStateWrite(
    student,
    { examSubmissions: JSON.stringify([item]) },
    state,
  );
  const saved = JSON.parse(result.examSubmissions)[0];
  assert.equal(saved.awardedPoints, 0);
  assert.equal(saved.totalPoints, 5);
  assert.equal(saved.pendingManualCount, 1);
  assert.deepEqual(saved.answers[0].correctAnswers, ["a"]);
  assert.equal(
    roleScopedAppState(
      { ...state, examSubmissions: result.examSubmissions },
      student,
    ).examSubmissions.includes("correctAnswer"),
    false,
  );
});

for (const [label, changes, now] of [
  ["unknown exam", { examId: "missing" }],
  ["another owner", { userId: "s2" }],
  ["future exam", {}, Date.now() - 3600000],
  ["expired exam", {}, Date.now() + 7200000],
])
  test(`student submission rejects ${label}`, () => {
    assert.throws(
      () =>
        validateStudentSubmission(
          "examSubmissions",
          { id: "sub", examId: "exam1", userId: "s", answers: [], ...changes },
          null,
          student,
          state,
          now,
        ),
      { statusCode: 403 },
    );
  });

test("student cannot alter or delete a submitted grade, or submit to another class", async () => {
  const saved = { id: "sub", userId: "s", examId: "exam1", score: "1/5" };
  const current = { ...state, examSubmissions: JSON.stringify([saved]) };
  const altered = await mergeRoleScopedStateWrite(
    student,
    { examSubmissions: JSON.stringify([{ ...saved, score: "5/5" }]) },
    current,
  );
  assert.deepEqual(JSON.parse(altered.examSubmissions), [saved]);
  assert.deepEqual(
    JSON.parse(
      (
        await mergeRoleScopedStateWrite(
          student,
          { examSubmissions: "[]" },
          current,
        )
      ).examSubmissions,
    ),
    [saved],
  );
  assert.throws(
    () =>
      validateStudentSubmission(
        "examSubmissions",
        { id: "x", userId: "s2", examId: "exam1" },
        null,
        users[4],
        state,
      ),
    { statusCode: 403 },
  );
});

test("a student cannot bypass one-attempt policy with duplicate submissions in one batch", async () => {
  const first = { id: "one", userId: "s", examId: "exam1", answers: [] };
  await assert.rejects(
    mergeRoleScopedStateWrite(
      student,
      { examSubmissions: JSON.stringify([first, { ...first, id: "two" }]) },
      state,
    ),
    { statusCode: 403 },
  );
});

test("exercise score fields are discarded and content ownership is checked", () => {
  const saved = validateStudentSubmission(
    "exerciseSubmissions",
    {
      id: "x",
      userId: "s",
      courseId: course.id,
      fileUrl: "data:application/pdf;base64,WA==",
      fileType: "application/pdf",
      fileName: "answer.pdf",
      score: 100,
      correctedAt: "fake",
    },
    null,
    student,
    state,
  );
  assert.equal(saved.score, undefined);
  assert.equal(saved.correctedAt, undefined);
  assert.equal(saved.fileName, "answer.pdf");
  assert.equal(saved.fileUrl, "data:application/pdf;base64,WA==");
  assert.throws(
    () =>
      validateStudentSubmission(
        "exerciseSubmissions",
        { id: "x", userId: "s", courseId: "unknown", url: "x" },
        null,
        student,
        state,
      ),
    { statusCode: 403 },
  );
});

test("teachers cannot approve absences or move their course to another owner", async () => {
  await assert.rejects(
    mergeRoleScopedStateWrite(
      teacher,
      {
        teacherAbsences: JSON.stringify([
          { id: "ab", teacherId: "t", scheduleId: "sch", status: "approved" },
        ]),
      },
      state,
    ),
    { statusCode: 403 },
  );
  const valid = await mergeRoleScopedStateWrite(
    teacher,
    {
      teacherAbsences: JSON.stringify([
        {
          id: "ab",
          teacherId: "t",
          scheduleId: "sch",
          status: "pending",
          reason: "test",
        },
      ]),
    },
    state,
  );
  assert.equal(JSON.parse(valid.teacherAbsences)[0].status, "pending");
  await assert.rejects(
    mergeRoleScopedStateWrite(
      teacher,
      { teacherCourses: JSON.stringify([{ ...course, teacherId: "other" }]) },
      state,
    ),
    { statusCode: 403 },
  );
});

test("teachers cannot bind another host's meeting to their own lesson", async () => {
  const items = {
    teacherCourses: JSON.stringify([
      { ...course, zoomMeetingId: "999", zoomMeetingUuid: "other-meeting" },
    ]),
  };
  const read = async () => ({
    courses: {},
    meetings: {
      "other-meeting": {
        meetingId: "999",
        meetingUuid: "other-meeting",
        teacherId: "other",
      },
    },
  });
  await assert.rejects(mergeRoleScopedStateWrite(teacher, items, state, read), {
    statusCode: 403,
  });
});

test("revisions ignore JSON key/row ordering but reject stale edits and legacy unguarded writes", () => {
  const initial = JSON.stringify([
    { id: 1, a: 2 },
    { id: 2, a: 3 },
  ]);
  const reordered = JSON.stringify([
    { a: 3, id: 2 },
    { a: 2, id: 1 },
  ]);
  assert.equal(stateRevision(initial), stateRevision(reordered));
  assert.throws(
    () => assertStateRevisions({ x: initial }, undefined, { x: initial }),
    { statusCode: 428 },
  );
  assert.throws(
    () =>
      assertStateRevisions(
        { x: initial },
        { x: stateRevision(initial) },
        { x: "[]" },
      ),
    { statusCode: 409 },
  );
});

test("recording normalization excludes processing files; empty results remain processing", () => {
  const raw = {
    password: "pass",
    recording_files: [
      {
        file_type: "MP4",
        recording_type: "shared_screen",
        status: "processing",
        play_url: "https://zoom.invalid/pending",
      },
      {
        file_type: "M4A",
        recording_type: "audio_only",
        status: "completed",
        play_url: "https://zoom.invalid/audio",
      },
    ],
  };
  const normalized = normalizeZoomRecordingFiles(raw);
  assert.equal(normalized.files.length, 1);
  assert.equal(normalized.recordingVideoUrl, "");
  assert.match(normalized.recordingAudioUrl, /pwd=pass/);
  assert.equal(
    zoomRecordingRecordFromObject({ recording_files: [] }).recordingStatus,
    "processing",
  );
});

test("simultaneous recording writes preserve both meetings and UUID takes precedence over stale course cache", async () => {
  let store = { courses: {}, meetings: {} };
  const read = async () => structuredClone(store);
  const write = async (next) => {
    await new Promise((resolve) => setTimeout(resolve, 2));
    store = next;
  };
  await Promise.all([
    saveZoomRecord(
      { courseId: "c", meetingId: "1", meetingUuid: "one" },
      read,
      write,
    ),
    saveZoomRecord(
      { courseId: "d", meetingId: "2", meetingUuid: "two" },
      read,
      write,
    ),
  ]);
  assert.equal(Object.keys(store.courses).length, 2);
  assert.equal(
    findZoomRecord(store, { courseId: "c", uuid: "two" }).meetingId,
    "2",
  );
});

test("real HTTP: Zoom recordings/end are authenticated and audience-bound, refresh is throttled", async () => {
  let refreshes = 0,
    ends = 0;
  const record = {
    courseId: course.id,
    meetingId: "123",
    meetingUuid: "/uuid/",
    recordingVideoUrl: "https://zoom.invalid/recording",
  };
  const api = await memoryApi({
    users,
    state,
    dependencies: {
      readZoomRecordings: async () => ({
        courses: { [course.id]: record },
        meetings: { "/uuid/": record },
      }),
      refreshZoomRecording: async () => {
        refreshes++;
        return record;
      },
      endZoomMeeting: async () => {
        ends++;
        return { ended: true };
      },
    },
  });
  const request = async (path, body, cookie) => {
    const response = await fetch(api.origin + path, {
      method: body ? "POST" : "GET",
      headers: {
        "Content-Type": "application/json",
        ...(cookie ? { Cookie: cookie } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
    });
    return {
      status: response.status,
      body: await response.json(),
      cookie: response.headers.get("set-cookie")?.split(";")[0],
    };
  };
  try {
    const url = `/api/zoom/recordings?courseId=${course.id}&refresh=1`;
    assert.equal((await request(url)).status, 401);
    assert.equal(refreshes, 0);
    const s = await request("/api/auth/login", { email: "s", password });
    assert.equal((await request(url, undefined, s.cookie)).status, 200);
    assert.equal((await request(url, undefined, s.cookie)).status, 200);
    assert.equal(refreshes, 1);
    assert.equal(
      (await request(url + "&meetingId=999", undefined, s.cookie)).status,
      403,
    );
    assert.equal(
      (
        await request(
          "/api/zoom/meetings/end",
          { courseId: course.id },
          s.cookie,
        )
      ).status,
      403,
    );
    const other = await request("/api/auth/login", {
      email: "other",
      password,
    });
    assert.equal((await request(url, undefined, other.cookie)).status, 403);
    const t = await request("/api/auth/login", { email: "t", password });
    assert.equal(
      (
        await request(
          "/api/zoom/meetings/end",
          { courseId: course.id },
          t.cookie,
        )
      ).status,
      200,
    );
    assert.equal(ends, 1);
  } finally {
    await api.close();
  }
});

test("fresh Zoom host links are returned only to the lesson's teacher and admin", async () => {
  const calls = [];
  const api = await memoryApi({
    users,
    state,
    dependencies: {
      zoomApi: async (path) => {
        calls.push(path);
        return { start_url: "https://zoom.invalid/fresh-host" };
      },
    },
  });
  const request = async (path, body, cookie) => {
    const response = await fetch(api.origin + path, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(cookie ? { Cookie: cookie } : {}),
      },
      body: JSON.stringify(body),
    });
    return {
      status: response.status,
      body: await response.json(),
      cookie: response.headers.get("set-cookie")?.split(";")[0],
    };
  };
  try {
    for (const [id, status] of [
      ["s", 403],
      ["other", 403],
      ["t", 200],
      ["a", 200],
    ]) {
      const login = await request("/api/auth/login", { email: id, password });
      const link = await request(
        "/api/zoom/meetings/start-link",
        { courseId: course.id },
        login.cookie,
      );
      assert.equal(link.status, status);
      if (status === 200)
        assert.equal(link.body.startUrl, "https://zoom.invalid/fresh-host");
    }
    assert.deepEqual(calls, ["/meetings/123", "/meetings/123"]);
  } finally {
    await api.close();
  }
});

test("real HTTP: stale collection cannot delete a newer account; profile/avatar touch only self", async () => {
  const api = await memoryApi({ users, state });
  const call = async (path, body, cookie) => {
    const response = await fetch(api.origin + path, {
      method: body ? "POST" : "GET",
      headers: {
        "Content-Type": "application/json",
        ...(cookie ? { Cookie: cookie } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
    });
    return {
      status: response.status,
      body: await response.json(),
      cookie: response.headers.get("set-cookie")?.split(";")[0],
    };
  };
  try {
    const a = await call("/api/auth/login", { email: "a", password });
    const before = await call("/api/app-state", undefined, a.cookie);
    api.store.users.push({
      ...student,
      id: "new",
      email: "new@example.invalid",
    });
    const stale = await call(
      "/api/app-state",
      {
        items: { acceptedUsers: before.body.state.acceptedUsers },
        revisions: before.body.revisions,
      },
      a.cookie,
    );
    assert.equal(stale.status, 409);
    assert.ok(api.store.users.some((user) => user.id === "new"));
    const s = await call("/api/auth/login", { email: "s", password });
    const others = structuredClone(
      api.store.users.filter((user) => user.id !== "s"),
    );
    assert.equal(
      (
        await call(
          "/api/auth/profile/avatar",
          { avatar: "data:image/png;base64,aGVsbG8=" },
          s.cookie,
        )
      ).status,
      200,
    );
    assert.equal(
      (
        await call(
          "/api/auth/profile",
          {
            email: student.email,
            phone: "1234",
            birthDate: "2000-01-01",
            residence: "Tunis",
          },
          s.cookie,
        )
      ).status,
      200,
    );
    assert.deepEqual(
      api.store.users.filter((user) => user.id !== "s"),
      others,
    );
  } finally {
    await api.close();
  }
});

test("real HTTP: teacher lesson save round-trips; student grade comes back authoritative", async () => {
  const api = await memoryApi({ users, state });
  const request = async (path, body, cookie) => {
    const response = await fetch(api.origin + path, {
      method: body ? "POST" : "GET",
      headers: {
        "Content-Type": "application/json",
        ...(cookie ? { Cookie: cookie } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
    });
    return {
      status: response.status,
      body: await response.json(),
      cookie: response.headers.get("set-cookie")?.split(";")[0],
    };
  };
  try {
    const t = await request("/api/auth/login", { email: "t", password });
    const initial = await request("/api/app-state", undefined, t.cookie);
    const saved = await request(
      "/api/app-state",
      {
        items: {
          teacherCourses: JSON.stringify([
            { ...course, title: "Edited lesson" },
          ]),
        },
        revisions: initial.body.revisions,
      },
      t.cookie,
    );
    assert.equal(saved.status, 200);
    assert.equal(
      JSON.parse(saved.body.items.teacherCourses)[0].title,
      "Edited lesson",
    );
    const s = await request("/api/auth/login", { email: "s", password });
    const studentState = await request("/api/app-state", undefined, s.cookie);
    const grade = await request(
      "/api/app-state",
      {
        items: {
          examSubmissions: JSON.stringify([
            {
              id: "answer",
              userId: "s",
              examId: exam.id,
              awardedPoints: 999,
              answers: [{ answer: ["A"] }, { answer: "Manual answer" }],
            },
          ]),
        },
        revisions: studentState.body.revisions,
      },
      s.cookie,
    );
    assert.equal(grade.status, 200);
    const result = JSON.parse(grade.body.items.examSubmissions)[0];
    assert.equal(result.awardedPoints, 3);
    assert.equal(result.totalPoints, 5);
    assert.equal(result.pendingManualCount, 1);
    assert.equal(JSON.stringify(result).includes("correctAnswer"), false);
    const current = await request("/api/app-state", undefined, s.cookie);
    const exercise = await request(
      "/api/app-state",
      {
        items: {
          exerciseSubmissions: JSON.stringify([
            {
              id: "exercise",
              userId: "s",
              courseId: course.id,
              fileUrl: "data:application/pdf;base64,WA==",
              fileType: "application/pdf",
              fileName: "answer.pdf",
            },
          ]),
        },
        revisions: current.body.revisions,
      },
      s.cookie,
    );
    assert.equal(exercise.status, 200);
    assert.equal(
      JSON.parse(exercise.body.items.exerciseSubmissions)[0].fileName,
      "answer.pdf",
    );
  } finally {
    await api.close();
  }
});
