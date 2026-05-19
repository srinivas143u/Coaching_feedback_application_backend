const { Server } = require('socket.io');

let io;

const initSocket = (httpServer) => {
  io = new Server(httpServer, {
    cors: {
      origin: process.env.CLIENT_URL || 'http://localhost:3000',
      methods: ['GET', 'POST'],
      credentials: true,
    },
  });

  io.on('connection', (socket) => {
    console.log(`🔌 Client connected: ${socket.id}`);

    // Handle reconnect gracefully — socket.io handles this natively
    socket.on('disconnect', (reason) => {
      console.log(`❌ Client disconnected: ${socket.id} — reason: ${reason}`);
    });

    // Prevent duplicate events: client sends ACK after receiving new_feed
    socket.on('ack_new_feed', (data) => {
      console.log(`✅ ACK received from ${socket.id} for feed: ${data?.feedId}`);
    });
  });

  return io;
};

const getIO = () => io;

module.exports = { initSocket, getIO };
