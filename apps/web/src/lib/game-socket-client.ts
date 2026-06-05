import type { Socket } from 'socket.io-client';

let activeSocket: Socket | null = null;
let activeGameId: string | null = null;

export function registerGameSocket(socket: Socket, gameId: string): void {
  activeSocket = socket;
  activeGameId = gameId;
}

export function unregisterGameSocket(socket: Socket): void {
  if (activeSocket === socket) {
    activeSocket = null;
    activeGameId = null;
  }
}

/** Leave the active game room and disconnect (navigation, logout, etc.). */
export function leaveActiveGameSocket(): void {
  const socket = activeSocket;
  const gameId = activeGameId;
  activeSocket = null;
  activeGameId = null;
  if (!socket) return;
  if (socket.connected && gameId) {
    socket.emit('game:leave', { gameId });
  }
  socket.disconnect();
}
