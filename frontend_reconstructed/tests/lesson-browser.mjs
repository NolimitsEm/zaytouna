import assert from "node:assert/strict";
import path from "node:path";
import { chromium } from "playwright";
import { root, serve, isolatedContext, ready, navigate } from "./support.mjs";
import { defaultCourses } from "../src/data/defaults.js";
const course = {
  ...defaultCourses[0],
  id: "lesson-string",
  scheduleId: null,
  title: "Original lesson",
  description: "Original description",
  zoomStartTime: "",
  zoomMeetingId: "",
  zoomMeetingUuid: "",
  zoomDurationMinutes: 60,
  attachments: [
    {
      name: "lesson.pdf",
      label: "PDF",
      type: "application/pdf",
      url: "data:application/pdf;base64,WA==",
    },
    {
      name: "Video",
      label: "Video",
      type: "youtube",
      url: "https://www.youtube.com/watch?v=abcdefghijk",
    },
  ],
};
const baseline = {
  teacherCourses: JSON.stringify([course]),
  managedExams: "[]",
};
const server = await serve(path.join(root, "build"), 0);
const browser = await chromium.launch({ channel: "chrome", headless: true });
let reject = false,
  saved = structuredClone(baseline),
  writes = 0;
const { context, backend } = await isolatedContext(
  browser,
  "admin",
  undefined,
  {
    state: structuredClone(baseline),
  respond({ url, request, body }) {
    if (url.pathname === "/api/zoom/meetings/start-link") {
      return { status: 200, response: { startUrl: `http://127.0.0.1:${server.address().port}/fixture-fresh-host` } };
    }
      if (url.pathname === "/api/app-state") {
        if (request.method() === "GET") return { response: { state: saved } };
        if (body?.items?.teacherCourses) {
          writes++;
          if (reject)
            return { status: 503, response: { error: "Fixture save failed" } };
          Object.assign(saved, body.items);
        }
      }
    },
  },
);
try {
  const page = await context.newPage();
  page.setDefaultTimeout(12000);
  await ready(page, `http://127.0.0.1:${server.address().port}/`);
  await navigate(page, "#lessons");
  const editor = page.locator("[data-course-edit-form]").first();
  await editor.locator("xpath=ancestor::details").locator("summary").click();
  await editor.locator("[name=title]").fill("Edited without Zoom");
  // Exercise the real 1-second polling timer with the edit disclosure open.
  await page.waitForTimeout(2200);
  assert.equal(
    await editor.locator("[name=title]").inputValue(),
    "Edited without Zoom",
  );
  await editor.locator("button[type=submit]").click();
  await page.waitForFunction(
    () => !document.querySelector("[data-course-edit-form][data-saving]"),
  );
  assert.equal(
    JSON.parse(saved.teacherCourses)[0].title,
    "Edited without Zoom",
  );
  assert.equal(JSON.parse(saved.teacherCourses)[0].attachments.length, 2);
  console.log(
    "PASS string-ID edit without Zoom, open editor survives polling, attachments retained",
  );
  await editor.locator("xpath=ancestor::details").locator("summary").click();
  await editor.locator("[name=title]").fill("Retry title");
  reject = true;
  const failure = page.waitForResponse((response) => response.status() === 503);
  await editor.locator("button[type=submit]").click();
  await failure;
  await editor.locator("button[type=submit]:enabled").waitFor();
  assert.equal(
    await editor.locator("[name=title]").inputValue(),
    "Retry title",
  );
  assert.equal(
    JSON.parse(saved.teacherCourses)[0].title,
    "Edited without Zoom",
  );
  reject = false;
  const before = writes;
  await editor.locator("button[type=submit]").click();
  await page.waitForFunction(
    () => !document.querySelector("[data-course-edit-form][data-saving]"),
  );
  assert.equal(writes, before + 1);
  assert.equal(JSON.parse(saved.teacherCourses)[0].title, "Retry title");
  console.log(
    "PASS failed lesson save preserves form and supports successful retry",
  );
  assert.deepEqual(backend.errors, []);
  const hostCourse = { ...JSON.parse(saved.teacherCourses)[0], zoomMeetingId: "fixture-meeting", zoomStartUrl: "https://example.invalid/expired-host", conferenceLink: "https://example.invalid/join" };
  saved.teacherCourses = JSON.stringify([hostCourse]);
  await page.reload({ waitUntil: "load" });
  await page.locator("[data-course-edit-form]").waitFor({ state: "attached" });
  await page.locator(".teacher-course-summary-card .exam-summary-actions a").first().click();
  const response = page.waitForResponse(result => result.url().endsWith("/api/zoom/meetings/start-link"));
  const popupPromise = page.waitForEvent("popup");
  await page.locator("[data-open-lesson-conference]").click();
  const popup = await popupPromise;
  assert.equal((await response).status(), 200);
  await popup.waitForURL("**/fixture-fresh-host");
  await popup.close();
  assert.deepEqual(backend.errors, []);
  console.log("PASS admin host entry fetches a fresh link instead of using the stored expired URL");
} finally {
  await context.close();
  await browser.close();
  await new Promise((resolve) => server.close(resolve));
}
