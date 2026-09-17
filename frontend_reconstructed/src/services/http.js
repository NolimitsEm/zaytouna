export /* HIGH CONFIDENCE behavior; INFERRED name/boundary. Evidence: legacyApp-Cum0wzIn.js:396417-396698 (ur). */
async function postJson(e, t) {
  const response = await fetch(e, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    credentials: "same-origin",
    body: JSON.stringify(t),
  });
  const a = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(a.reason || a.detail || a.error || "تعذر الاتصال بالـ backend.");
    error.status = response.status;
    error.retryAfterSeconds = Number(a.retryAfterSeconds || response.headers.get("Retry-After")) || 0;
    throw error;
  }
  return a;
}
export /* HIGH CONFIDENCE behavior; INFERRED name/boundary. Evidence: legacyApp-Cum0wzIn.js:396754-396952 (Cc). */
async function getJson(e) {
  const response = await fetch(e, {
    credentials: "same-origin",
  });
  const r = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(r.reason || r.detail || r.error || "تعذر الاتصال بالـ backend.");
  return r;
}
