import './load-env.js';
import { Server } from 'socket.io';
import { config } from './lib/config.js';
import { buildApp } from './app.js';
import { assertGameMember } from './lib/game-access.js';
import {
  addGamePresence,
  removeGamePresence,
  removeSocketPresence,
  trackGameJoin,
  trackGameLeave,
} from './lib/game-presence.js';
import { getUserIdFromSocketCookie } from './lib/game-socket.js';
import { scheduleDataRetention } from './services/data-retention.js';

const app = await buildApp();

await app.listen({ port: config.port, host: config.host });

const io = new Server(app.server, {
  cors: {
    origin: config.corsOrigins,
    credentials: true,
  },
  // Generous timeouts for clients behind TLS-terminating reverse proxies (nginx).
  pingInterval: 25_000,
  pingTimeout: 60_000,
  connectTimeout: 45_000,
});
app.io = io;

io.use((socket, next) => {
  const userId = getUserIdFromSocketCookie(app, socket.handshake.headers.cookie);
  if (!userId) {
    next(new Error('Authentication required'));
    return;
  }
  socket.data.userId = userId;
  next();
});

io.on('connection', (socket) => {
  const userId = socket.data.userId as string;
  socket.join(`user:${userId}`);
  app.log.info({ socketId: socket.id, userId }, 'socket connected');

  socket.on('game:join', async (payload: { gameId?: string }) => {
    try {
      const gameId = payload?.gameId;
      const userId = socket.data.userId as string | undefined;
      if (!gameId || !userId) return;
      const access = await assertGameMember(userId, gameId);
      if (!access.ok) {
        socket.emit('game:error', { message: access.message });
        return;
      }
      socket.join(`game:${gameId}`);
      trackGameJoin(socket, gameId);
      await addGamePresence(io, gameId, userId, socket.id);
      socket.emit('game:joined', { gameId });
    } catch {
      socket.emit('game:error', { message: 'Join failed' });
    }
  });

  socket.on('game:leave', (payload: { gameId?: string }) => {
    const gameId = payload?.gameId;
    const userId = socket.data.userId as string | undefined;
    if (!gameId || !userId) return;
    void socket.leave(`game:${gameId}`);
    trackGameLeave(socket, gameId);
    removeGamePresence(io, gameId, userId, socket.id);
  });

  const clearPresence = () => {
    removeSocketPresence(io, socket);
  };

  // Rooms are still populated on disconnecting; disconnect fires after cleanup.
  socket.on('disconnecting', clearPresence);
  socket.on('disconnect', (reason) => {
    clearPresence();
    app.log.info(
      { socketId: socket.id, userId: socket.data.userId, reason },
      'socket disconnected',
    );
  });
});

app.log.info(`API listening on ${config.host}:${config.port}`);

scheduleDataRetention(app.log);
