// Temporary throttling is separate from an administrator disabling an account.
// In particular, an attacker must not be able to permanently disable a user.
export function createLoginLimiter({ maxAttempts = 5, windowMs = 900000, blockMs = 900000, now = Date.now } = {}) {
  const attempts = new Map();
  const normalize = value => String(value ?? "").trim().toLowerCase();
  function status(ip, identifier) {
    const time = now();
    for (const [key, entry] of attempts) {
      if (entry.blockedUntil ? entry.blockedUntil <= time : time - entry.firstAttemptAt >= windowMs) attempts.delete(key);
    }
    const key = JSON.stringify([String(ip), normalize(identifier)]);
    const entry = attempts.get(key);
    return { key, allowed: !entry?.blockedUntil, retryAfterSeconds: entry?.blockedUntil ? Math.max(1, Math.ceil((entry.blockedUntil - time) / 1000)) : 0 };
  }
  function fail(key) {
    const time = now();
    let entry = attempts.get(key);
    if (!entry || (entry.blockedUntil ? entry.blockedUntil <= time : time - entry.firstAttemptAt >= windowMs)) entry = { count: 0, firstAttemptAt: time, blockedUntil: 0 };
    entry.count += 1;
    if (entry.count >= maxAttempts) entry.blockedUntil = time + blockMs;
    attempts.set(key, entry);
    return { ...entry };
  }
  function clearUser(user) {
    const identifiers = new Set([user?.id, user?.email].filter(v => v != null).map(normalize));
    for (const key of attempts.keys()) if (identifiers.has(JSON.parse(key)[1])) attempts.delete(key);
  }
  return { status, fail, clear: key => attempts.delete(key), clearUser };
}
