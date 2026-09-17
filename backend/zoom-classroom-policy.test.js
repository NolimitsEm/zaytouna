import test from "node:test";
import assert from "node:assert/strict";
import { classroomEntrySettings, classroomHostSettings, ensureClassroomAnnotationPolicy } from "./zoom-classroom-policy.js";
import { zoomMeetingPayload, createZoomMeeting } from "./server.js";

test("new lessons keep host video on while participant microphones and video start off", () => {
  const payload = zoomMeetingPayload({
    title: "Fixture lesson", durationMinutes: 90,
    startTime: "2026-10-01T10:00:00Z", timezone: "Africa/Tunis",
    settings: { host_video: true, participant_video: true, mute_upon_entry: false },
    participant_video: true, mute_upon_entry: false
  });
  for (const [key, value] of Object.entries(classroomEntrySettings())) {
    assert.equal(payload.settings[key], value);
  }
  assert.equal(payload.duration, 90);
  assert.equal(payload.settings.auto_recording, "cloud");
  assert.equal(payload.settings.join_before_host, false);
  assert.equal(payload.settings.audio, "both");
  assert.equal(payload.settings.annotation, undefined, "annotation is not a meeting-level REST field");
});

test("annotation policy changes only the host annotation setting and verifies it", async () => {
  const calls = [];
  const result = await ensureClassroomAnnotationPolicy(async (pathname, options) => {
    calls.push({ pathname, ...options });
    return options.method === "GET" ? { in_meeting: { annotation: false } } : {};
  }, "teacher+fixture@example.invalid");
  assert.deepEqual(classroomHostSettings(), { in_meeting: { annotation: false } });
  assert.deepEqual(calls.map(call => call.method), ["PATCH", "GET"]);
  assert.equal(calls[0].pathname, "/users/teacher%2Bfixture%40example.invalid/settings");
  assert.deepEqual(JSON.parse(calls[0].body), classroomHostSettings());
  assert.deepEqual(result, { applied: true, reason: "confirmed" });
});

for (const [description, effective] of [
  ["enabled", { in_meeting: { annotation: true } }],
  ["missing", {}],
  ["invalid string value", { in_meeting: { annotation: "false" } }]
]) {
  test(`annotation policy reports ${description} effective annotation setting without blocking`, async () => {
    const result = await ensureClassroomAnnotationPolicy(async () => effective, "fixture");
    assert.deepEqual(result, { applied: false, reason: "not_confirmed" });
  });
}

for (const failingMethod of ["PATCH", "GET"]) {
  test(`annotation ${failingMethod} permission failure is non-blocking`, async () => {
    const calls = [];
    const result = await ensureClassroomAnnotationPolicy(async (_path, options) => {
      calls.push(options.method);
      if (options.method === failingMethod) throw new Error("Fixture scope/transport failure");
      return {};
    }, "fixture");
    assert.deepEqual(result, { applied: false, reason: "unavailable" });
    assert.deepEqual(calls, failingMethod === "PATCH" ? ["PATCH"] : ["PATCH", "GET"]);
  });
}

function isolatedCreation({ annotation = false, failAnnotationPatch = false, failSettingsRead = false } = {}) {
  const calls = [];
  const warnings = [];
  const store = { courses: {}, meetings: {} };
  let writes = 0;
  const dependencies = {
    requireZoomConfig: () => ({ hostUserId: "fixture-host" }),
    zoomApi: async (pathname, options) => {
      const body = options.body ? JSON.parse(options.body) : null;
      calls.push({ pathname, method: options.method, body });
      if (pathname.endsWith("/settings")) {
        if (body?.in_meeting && failAnnotationPatch) throw new Error("Fixture missing write scope");
        if (options.method === "GET" && failSettingsRead) throw new Error("Fixture missing read scope");
        return options.method === "GET" ? { in_meeting: { annotation } } : {};
      }
      assert.equal(pathname, "/users/fixture-host/meetings");
      assert.equal(options.method, "POST");
      return { id: 123, uuid: "fixture-uuid", join_url: "https://example.invalid/join", start_url: "https://example.invalid/host", settings: body.settings };
    },
    readZoomRecordings: async () => structuredClone(store),
    writeZoomRecordings: async next => { writes++; Object.assign(store, next); },
    logger: { warn: message => warnings.push(message) }
  };
  return { calls, warnings, store, dependencies, writes: () => writes };
}

test("production meeting creation applies and verifies policy before meeting creation and persistence", async () => {
  const fixture = isolatedCreation();
  const result = await createZoomMeeting({ title: "Fixture", courseId: "fixture-course" }, fixture.dependencies);
  assert.deepEqual(fixture.calls.map(call => [call.method, call.pathname]), [
    ["PATCH", "/users/fixture-host/settings"], // existing recording layout
    ["PATCH", "/users/fixture-host/settings"], // classroom annotation policy
    ["GET", "/users/fixture-host/settings"],
    ["POST", "/users/fixture-host/meetings"]
  ]);
  const settings = fixture.calls.at(-1).body.settings;
  assert.equal(settings.participant_video, false);
  assert.equal(settings.host_video, true);
  assert.equal(settings.mute_upon_entry, true);
  assert.deepEqual(fixture.warnings, []);
  assert.equal(fixture.writes(), 1);
  assert.equal(fixture.store.courses["fixture-course"].meetingId, "123");
  assert.equal(result.joinUrl, "https://example.invalid/join");
});

for (const failure of [{ annotation: true }, { failAnnotationPatch: true }, { failSettingsRead: true }]) {
  test(`meeting creation continues when optional annotation policy fails: ${JSON.stringify(failure)}`, async () => {
    const fixture = isolatedCreation(failure);
    const result = await createZoomMeeting({ title: "Fixture" }, fixture.dependencies);
    assert.equal(fixture.calls.some(call => call.pathname.endsWith("/meetings")), true);
    const settings = fixture.calls.find(call => call.pathname.endsWith("/meetings")).body.settings;
    assert.equal(settings.participant_video, false);
    assert.equal(settings.mute_upon_entry, true);
    assert.equal(settings.host_video, true);
    assert.equal(fixture.writes(), 1);
    assert.equal(result.meetingId, "123");
    assert.equal(fixture.warnings.length, 1);
  });
}
