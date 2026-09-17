/**
 * INFERRED repair: the production bundle calls this missing helper from three
 * sites. The provided fallback arguments establish the required failure behavior.
 * See docs/UNCERTAINTIES.md. No other original behavior is intentionally changed.
 */
export function safeJsonParse(value, fallback) {
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}
