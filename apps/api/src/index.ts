import './load-env.js';
import { Server } from 'socket.io';
import { config } from './lib/config.js';
import { buildApp } from './app.js';
import { assertGameMember } from './lib/game-access.js';

const app = await buildApp();

await app.listen({ port: config.port, host: config.host });

const io = new Server(app.server, {
  cors: {
    origin: config.corsOrigins === true ? true : config.corsOrigins,
    credentials: true,
  },
});
app.io = io;

io.on('connection', (socket) => {
  socket.on('game:join', async (payload: { gameId?: string; token?: string }) => {
    try {
      if (!payload?.gameId) return;
      let userId: string | undefined;
      if (payload.token) {
        const decoded = app.jwt.verify<{ sub: string }>(payload.token);
        userId = decoded.sub;
      }
      if (!userId) return;
      const access = await assertGameMember(userId, payload.gameId);
      if (!access.ok) return;
      socket.join(`game:${payload.gameId}`);
      socket.emit('game:joined', { gameId: payload.gameId });
    } catch {
      socket.emit('game:error', { message: 'Join failed' });
    }
  });
});

app.log.info(`API listening on ${config.host}:${config.port}`);
