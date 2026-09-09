const http = require('http');
const { Server } = require('socket.io');

const { env, assertRequiredEnv } = require('./config/env');
const { connectDB } = require('./config/db');
const { createApp } = require('./app');
const { verifyToken } = require('./utils/jwt');

async function main() {
  assertRequiredEnv();
  await connectDB();

  const app = createApp();
  const httpServer = http.createServer(app);

  // Socket.IO handles real-time application events (live attempt status,
  // supervisor dashboard updates, proctoring alerts). It is NOT used to
  // carry raw camera/microphone media — that belongs to a separate
  // WebRTC/media layer (see MEDIA_SERVER_URL in .env.example).
  const io = new Server(httpServer, {
    cors: { origin: env.CLIENT_URL, credentials: true },
  });

  io.use((socket, next) => {
    try {
      const token = socket.handshake.auth?.token;
      if (!token) return next(new Error('Authentication required'));
      const payload = verifyToken(token);
      socket.user = { id: payload.sub, role: payload.role };
      return next();
    } catch (err) {
      return next(new Error('Invalid or expired session'));
    }
  });

  io.on('connection', (socket) => {
    // Students join their own attempt room; supervisors join exam rooms.
    // Real event handlers (attempt:status, proctoring:event, supervisor:*)
    // are added alongside proctoringService as that module is completed.
    socket.on('attempt:join', ({ attemptId }) => {
      if (socket.user.role === 'STUDENT') {
        socket.join(`attempt:${attemptId}`);
      }
    });

    socket.on('exam:supervise', ({ examId }) => {
      if (socket.user.role === 'SUPERVISOR' || socket.user.role === 'ADMIN') {
        socket.join(`exam:${examId}:supervisors`);
      }
    });
  });

  app.set('io', io);

  httpServer.listen(env.PORT, () => {
    console.log(`[server] University CBT backend listening on port ${env.PORT} (${env.NODE_ENV})`);
  });

  process.on('unhandledRejection', (err) => {
    console.error('[fatal] Unhandled promise rejection:', err);
  });
}

main().catch((err) => {
  console.error('[fatal] Failed to start server:', err);
  process.exit(1);
});
