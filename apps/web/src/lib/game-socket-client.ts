import { io, type Socket } from 'socket.io-client';

let socket: Socket | null = null;
let activeGameId: string | null = null;

export type GameDeletedPayload = {
  gameId?: string;
  actorUserId?: string;
};

const gameDeletedListeners = new Set<(payload: GameDeletedPayload) => void>();

function notifyGameDeleted(payload: GameDeletedPayload): void {
  for (const listener of gameDeletedListeners) {
    listener(payload);
  }
}

function createSocket(): Socket {
  const forcePolling = import.meta.env.VITE_SOCKET_POLLING_ONLY === 'true';
  const transports: ('polling' | 'websocket')[] = forcePolling
    ? ['polling']
    : ['websocket', 'polling'];

  const s = io(window.location.origin, {
    path: '/socket.io',
    withCredentials: true,
    transports,
    reconnection: true,
    reconnectionAttempts: Infinity,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 10000,
  });

  s.on('game:deleted', (payload: GameDeletedPayload) => {
    notifyGameDeleted(payload);
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

/** Connect the shared Socket.IO client (joins user room on the server). */
export function ensureAccountSocket(): Socket {
  if (!socket) {
    socket = createSocket();
  }
  if (!socket.connected) {
    socket.connect();
  }
  return socket;
}

/** @deprecated Use ensureAccountSocket */
export function getGameSocket(): Socket {
  return ensureAccountSocket();
}

export function subscribeGameDeleted(
  listener: (payload: GameDeletedPayload) => void,
): () => void {
  ensureAccountSocket();
  gameDeletedListeners.add(listener);
  return () => {
    gameDeletedListeners.delete(listener);
  };
}

export function registerGameSocket(gameId: string): Socket {
  activeGameId = gameId;
  return ensureAccountSocket();
}

export function joinGameRoom(gameId: string): void {
  activeGameId = gameId;
  ensureAccountSocket().emit('game:join', { gameId });
}

export function leaveGameRoom(gameId: string): void {
  if (activeGameId === gameId) {
    activeGameId = null;
  }
  if (socket?.connected) {
    socket.emit('game:leave', { gameId });
  }
}

export function unregisterGameSocket(gameId: string): void {
  leaveGameRoom(gameId);
}

/** Disconnect socket entirely (logout). */
export function disconnectAccountSocket(): void {
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

/** @deprecated Use disconnectAccountSocket */
export function leaveActiveGameSocket(): void {
  disconnectAccountSocket();
}
