import test from "node:test";
import assert from "node:assert/strict";
import { state } from "../src/context/state.js";
import { editCourse } from "../src/services/teaching-management.js";
import { renderZoomScheduleFields } from "../src/components/teaching.js";

const pdf = {
  name: "lesson.pdf",
  label: "PDF",
  type: "application/pdf",
  url: "data:application/pdf;base64,WA==",
};
const video = {
  name: "Video",
  label: "Video",
  type: "youtube",
  url: "https://www.youtube.com/watch?v=abcdefghijk",
};
const course = {
  id: "lesson-string",
  title: "Old",
  description: "Description",
  attachments: [pdf, video],
  files: ["PDF", "Video"],
};
function data() {
  const form = new FormData();
  for (const [key, value] of Object.entries({
    title: "Edited",
    description: "Description",
    files: "PDF",
    removedAttachmentIndexes: "[]",
    subjectId: "s",
    niveauId: "n",
    groupeId: "",
  }))
    form.set(key, value);
  return form;
}
test("string lesson IDs save; existing PDF data and hidden YouTube link survive ordinary editing", async () => {
  state.courses = [structuredClone(course)];
  await editCourse("lesson-string", data());
  assert.equal(state.courses[0].title, "Edited");
  assert.deepEqual(state.courses[0].attachments, [pdf, video]);
});
test("explicit attachment deletion removes only the selected file", async () => {
  state.courses = [structuredClone(course)];
  const form = data();
  form.set("removedAttachmentIndexes", "[0]");
  await editCourse(course.id, form);
  assert.deepEqual(state.courses[0].attachments, [video]);
});
test("invalid exercise upload leaves every original course field untouched", async () => {
  state.courses = [structuredClone(course)];
  const form = data();
  form.set(
    "exerciseFile",
    new File(["bad"], "bad.txt", { type: "text/plain" }),
  );
  await assert.rejects(editCourse(course.id, form));
  assert.deepEqual(state.courses, [course]);
});
test("unknown lesson ID reports failure instead of pretending to save", async () => {
  state.courses = [structuredClone(course)];
  await assert.rejects(editCourse("missing", data()));
  assert.deepEqual(state.courses, [course]);
});
test("ordinary course forms do not make optional Zoom dates required HTML inputs", () => {
  state.schedule = [];
  assert.doesNotMatch(renderZoomScheduleFields("test", {}), /\brequired\b/);
});
