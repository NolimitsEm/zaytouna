// Local HTTP development only. Production startup/settings remain unchanged.
import http from "node:http";
process.env.NODE_ENV = "development";
process.env.COOKIE_SECURE = "false";
process.env.HOST = "127.0.0.1";
const { createRequestHandler } = await import("./server.js");
const port = Number(process.env.PORT || 3001);
http.createServer(createRequestHandler()).listen(port, "127.0.0.1", () => {
  console.log(`Local backend API: http://127.0.0.1:${port} (MySQL credentials from backend/.env)`);
});
