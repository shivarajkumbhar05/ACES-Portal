require('dotenv').config();
const http = require('http');
const { Server } = require('socket.io');
const { createApp } = require('./app');
const { connectDB } = require('./config/db');
const Admin = require('./models/Admin');
const { verifyAdminToken } = require('./utils/jwt');
const { getCorsOptions } = require('./config/cors');

async function main() {
  await connectDB();

  const app = createApp();
  const server = http.createServer(app);

  const io = new Server(server, {
    cors: getCorsOptions()
  });

  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth?.token;
      const payload = verifyAdminToken(token);
      const admin = await Admin.findById(payload.sub);
      if (payload.type !== 'admin' || !admin?.isActive) return next(new Error('Unauthorized'));
      socket.admin = admin;
      next();
    } catch {
      next(new Error('Unauthorized'));
    }
  });

  // Broadcast-only channel: admins join to receive live dashboard/leaderboard
  // refresh signals. No sensitive data is ever emitted over the socket itself -
  // clients still re-fetch via the authenticated REST endpoints on signal.
  io.on('connection', (socket) => {
    socket.on('admin:subscribe', () => {
      socket.join('admins');
    });
  });

  app.set('io', io);

  const port = process.env.PORT || 4000;
  server.listen(port, () => {
    console.log(`[server] ACES Quiz backend listening on port ${port}`);
  });
}

main().catch((err) => {
  console.error('[server] Fatal startup error:', err);
  process.exit(1);
});
