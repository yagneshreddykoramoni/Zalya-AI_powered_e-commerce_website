import io, { Socket } from 'socket.io-client';
import { API_BASE_URL } from './api';

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || API_BASE_URL.replace(/\/api$/, '');

let socket: Socket | null = null;
let activeToken: string | null = null;

export const initializeSocket = (token: string) => {
  if (socket && activeToken === token && !socket.disconnected) {
    return socket;
  }

  if (socket) {
    socket.disconnect();
  }

  socket = io(SOCKET_URL, {
    auth: { token }
  });
  activeToken = token;

  return socket;
};

export const getSocket = () => {
  if (!socket) throw new Error('Socket not initialized');
  return socket;
};

export const disconnectSocket = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
    activeToken = null;
  }
};