import crypto from "node:crypto";

function canonical(value) {
  if (Array.isArray(value)) return value.map(canonical);
  if (value && typeof value === "object")
    return Object.fromEntries(
      Object.keys(value)
        .sort()
        .map((key) => [key, canonical(value[key])]),
    );
  return value;
}

export function stateRevision(value) {
  let parsed = value ?? null;
  try {
    parsed = JSON.parse(value);
  } catch {
    /* Flags are plain strings. */
  }
  // Collection row ordering is not an edit conflict (SQL applies sort_index).
  if (Array.isArray(parsed))
    parsed = parsed
      .map(canonical)
      .sort((a, b) => JSON.stringify(a).localeCompare(JSON.stringify(b)));
  return crypto
    .createHash("sha256")
    .update(JSON.stringify(canonical(parsed)))
    .digest("hex");
}

export function stateRevisions(state) {
  return Object.fromEntries(
    Object.entries(state).map(([key, value]) => [key, stateRevision(value)]),
  );
}

export function staleStateError() {
  return Object.assign(
    new Error(
      "تغيّرت البيانات في جلسة أخرى. انسخ تعديلاتك ثم حدّث الصفحة وأعد المحاولة.",
    ),
    { statusCode: 409 },
  );
}

export function assertStateRevisions(items, revisions, current) {
  if (!revisions || typeof revisions !== "object") {
    throw Object.assign(
      new Error("حدّث الصفحة لتحميل النسخة الجديدة قبل الحفظ."),
      { statusCode: 428 },
    );
  }
  for (const key of Object.keys(items)) {
    if ((revisions[key] ?? stateRevision(null)) !== stateRevision(current[key]))
      throw staleStateError();
  }
}
