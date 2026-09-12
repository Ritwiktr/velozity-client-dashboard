import http from "node:http";
import { env } from "./config.js";
import { createApp } from "./app.js";
import { initSocket } from "./realtime/socket.js";
import { startOverdueJob } from "./jobs/overdue.js";
import { prisma } from "./lib/prisma.js";

const app = createApp();
const server = http.createServer(app);
initSocket(server);
startOverdueJob();

server.listen(env.port, () => {
  console.log(`API listening on http://localhost:${env.port}`);
});

async function shutdown() {
  server.close();
  await prisma.$disconnect();
  process.exit(0);
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
