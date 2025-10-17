let ioInstance = null;

const setSocket = (io) => {
  ioInstance = io;
};

const getSocket = () => {
  if (!ioInstance) throw new Error('Socket.io not initialized');
  return ioInstance;
};

module.exports = {
  setSocket,
  getSocket
};