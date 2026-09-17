// Test-only repository. The real HTTP router, password checks, signed cookies,
// permission checks and role-scoped responses still execute from server.js.
import http from "node:http";
process.env.NODE_ENV = "test";
process.env.COOKIE_SECURE = "false";
process.env.JWT_SECRET = "test-only-secret-".repeat(8);
const { createRequestHandler, mergeUserSecrets } = await import("../server.js");
const { createLoginLimiter } = await import("../login-security.js");
export const password = "FixturePassword@123";
export async function memoryApi({ users, state = {}, now = Date.now, maxAttempts = 5, staticHandler, dependencies = {} } = {}) {
  const store = { users: structuredClone(users), state: structuredClone(state), requests: [], mutationCount: 0 };
  const limiter = createLoginLimiter({ maxAttempts, windowMs: 900000, blockMs: 900000, now });
  const handler = createRequestHandler({
    limiter,
    findLoginUser: async identifier => structuredClone(store.users.find(user => [user.id, user.email].some(value => String(value).trim().toLowerCase() === String(identifier).trim().toLowerCase())) || null),
    rotateUserSession: async id => {
      const user = store.users.find(user => String(user.id) === String(id));
      if (!user) return null;
      user.sessionVersion = (Number(user.sessionVersion) || 0) + 1;
      return structuredClone(user);
    },
    mutateUser: async (id, mutate) => {
      const index = store.users.findIndex(user => String(user.id) === id);
      const next = await mutate(index < 0 ? null : structuredClone(store.users[index]));
      store.users[index] = next;store.mutationCount += 1;return structuredClone(next);
    },
    readAppState: async () => ({ ...store.state, acceptedUsers: JSON.stringify(store.users.map(({password,activationToken,...user}) => user)) }),
    writeAppState: async items => {
      if (items.acceptedUsers) {
        const connection = { query: async () => [store.users.map(user => ({payload: JSON.stringify(user)}))] };
        store.users = await mergeUserSecrets(connection, JSON.parse(items.acceptedUsers), { preserveUserSecurity: true });
      }
      Object.assign(store.state, items);return {saved:Object.keys(items).length,deleted:0};
    },
    readZoomRecordings: async () => ({ courses: {}, meetings: {} }),
    ...dependencies,
  });
  const server = http.createServer((request, response) => {
    store.requests.push({method:request.method,path:request.url});
    if (!request.url.startsWith('/api/') && staticHandler) return staticHandler(request,response);
    return handler(request,response);
  });
  await new Promise(resolve => server.listen(0,"127.0.0.1",resolve));
  const origin = `http://127.0.0.1:${server.address().port}`;
  return {store,limiter,origin,close:()=>new Promise(resolve=>server.close(resolve))};
}
