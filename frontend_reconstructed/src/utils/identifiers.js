export /* HIGH CONFIDENCE behavior; INFERRED name/boundary. Evidence: legacyApp-Cum0wzIn.js:2794-3106 (rc). */
function createNumericId(items = [], t = {}) {
  const r = Math.max(0, Math.trunc(Number(t.now ?? Date.now())));
  const a = Math.abs(Math.trunc(Number(t.entropy ?? randomEntropy()))) % 1e3;
  const uniqueValues = new Set(items.map((s) => String(s?.id)));
  let i = r * 1e3 + a;
  for (; uniqueValues.has(String(i)); ) i += 1;
  if (!Number.isSafeInteger(i)) throw new Error("Unable to generate a safe numeric identifier.");
  return i;
}
export /* HIGH CONFIDENCE behavior; INFERRED name/boundary. Evidence: legacyApp-Cum0wzIn.js:3106-3220 (gm). */
function encodeEntityReference(e, t) {
  const r = String(e || "").trim();
  const a = String(t ?? "").trim();
  return !r || !a || r.includes(":") ? "" : `${r}:${a}`;
}
export /* HIGH CONFIDENCE behavior; INFERRED name/boundary. Evidence: legacyApp-Cum0wzIn.js:3220-3346 (xm). */
function decodeEntityReference(e, t) {
  const r = String(e || "").trim();
  const a = String(t || "").trim();
  const n = `${r}:`;
  return r && a.startsWith(n) ? a.slice(n.length) : "";
}
export /* HIGH CONFIDENCE behavior; INFERRED name/boundary. Evidence: legacyApp-Cum0wzIn.js:3346-3436 (vm). */
function randomEntropy() {
  const e = new Uint32Array(1);
  globalThis.crypto.getRandomValues(e);
  return e[0];
}
