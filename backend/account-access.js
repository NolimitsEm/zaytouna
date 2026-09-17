function error(statusCode, message) {
  return Object.assign(new Error(message), { statusCode });
}

export function changedAccountAccess(user, actor, isDisabled) {
  if (actor?.role !== "admin") throw error(403, "You are not allowed to perform this action.");
  if (!user) throw error(404, "Account not found.");
  if (typeof isDisabled !== "boolean") throw error(400, "isDisabled must be a boolean.");
  if (String(user.id) === String(actor.id)) throw error(400, "لا يمكنك تغيير حالة الحساب الذي تستعمله الآن.");
  if (!isDisabled && !user.emailConfirmed) throw error(409, "الحساب غير مؤكد. استخدم إرسال التفعيل بالبريد أولًا؛ تشغيل الحساب لا يرسل إيميل ولا يغيّر تأكيده.");
  const next = { ...user, isDisabled };
  if (isDisabled) {
    if (!user.isDisabled) next.sessionVersion = Math.max(0, Number(user.sessionVersion) || 0) + 1;
    next.disabledAt = new Date().toISOString();
    next.disabledReason = "admin_disabled";
  } else {
    delete next.disabledAt;
    delete next.disabledReason;
  }
  // Password, emailConfirmed, confirmedAt and activation metadata stay intact.
  return next;
}

export async function changeAccountAccess({ actor, body, mutateUser, limiter }) {
  if (actor?.role !== "admin") throw error(403, "You are not allowed to perform this action.");
  if (!body?.id || typeof body.isDisabled !== "boolean") throw error(400, "Account id and boolean isDisabled are required.");
  const user = await mutateUser(String(body.id), stored => changedAccountAccess(stored, actor, body.isDisabled));
  // Only clear throttles after a successful committed save, across IPs/aliases.
  if (!user.isDisabled) limiter.clearUser(user);
  return user;
}
