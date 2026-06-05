import { io, type Socket } from 'socket.io-client';

let socket: Socket | null = null;
let activeGameId: string | null = null;

function createSocket(): Socket {
  // Production uses HTTP/2 on 443 — polling works; WebSocket upgrade does not.
  const transports: ('polling' | 'websocket')[] = import.meta.env.PROD
    ? ['polling']
    : ['polling', 'websocket'];

  const s = io(window.location.origin, {
    path: '/socket.io',
    withCredentials: true,
    transports,
    reconnection: true,
    reconnectionAttempts: Infinity,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 10000,
  });

  s.on('connect', () => {
    if (activeGameId) {
      s.emit('game:join', { gameId: activeGameId });
    }
  });

  s.io.on('reconnect', () => {
    if (activeGameId) {
      s.emit('game:join', { gameId: activeGameId });
    }
  });

  return s;
}

/** Shared Socket.IO connection — one per browser tab, reused across game pages. */
export function getGameSocket(): Socket {
  if (!socket) {
    socket = createSocket();
  }
  if (!socket.connected) {
    socket.connect();
  }
  return socket;
}

/** Track active game and return the shared socket (does not emit join — call joinGameRoom after handlers are attached). */
export function registerGameSocket(gameId: string): Socket {
  activeGameId = gameId;
  return getGameSocket();
}

export function joinGameRoom(gameId: string): void {
  activeGameId = gameId;
  getGameSocket().emit('game:join', { gameId });
}

export function unregisterGameSocket(gameId: string): void {
  if (activeGameId === gameId) {
    activeGameId = null;
  }
  const s = socket;
  if (s?.connected) {
    s.emit('game:leave', { gameId });
  }
}

/** Leave the active game room and disconnect (navigation, logout, etc.). */
export function leaveActiveGameSocket(): void {
  const s = socket;
  const gameId = activeGameId;
  activeGameId = null;
  socket = null;
  if (!s) return;
  if (s.connected && gameId) {
    s.emit('game:leave', { gameId });
  }
  s.removeAllListeners();
  s.disconnect();
}
