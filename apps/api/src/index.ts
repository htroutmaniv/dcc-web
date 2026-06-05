import './load-env.js';
import { Server } from 'socket.io';
import { config } from './lib/config.js';
import { buildApp } from './app.js';
import { assertGameMember } from './lib/game-access.js';
import { getUserIdFromSocketCookie } from './lib/game-socket.js';

const app = await buildApp();

await app.listen({ port: config.port, host: config.host });

const io = new Server(app.server, {
  cors: {
    origin: config.corsOrigins === true ? true : config.corsOrigins,
    credentials: true,
  },
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
      socket.emit('game:joined', { gameId });
    } catch {
      socket.emit('game:error', { message: 'Join failed' });
    }
  });
});

app.log.info(`API listening on ${config.host}:${config.port}`);
