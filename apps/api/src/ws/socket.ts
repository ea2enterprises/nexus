import type { Server as SocketIOServer } from 'socket.io';

export function setupSocketHandlers(io: SocketIOServer) {
  io.on('connection', (socket) => {
    console.log(`Client connected: ${socket.id}`);

    // Join user-specific room for targeted events
    socket.on('join', (userId: string) => {
      socket.join(`user:${userId}`);
      console.log(`Socket ${socket.id} joined room user:${userId}`);
    });

    // Subscribe to instrument-specific signals
    socket.on('subscribe:instrument', (instrument: string) => {
      socket.join(`instrument:${instrument}`);
    });

    socket.on('unsubscribe:instrument', (instrument: string) => {
      socket.leave(`instrument:${instrument}`);
    });

    socket.on('disconnect', () => {
      console.log(`Client disconnected: ${socket.id}`);
    });
  });
}

// Helper to broadcast events
export function broadcastSignal(io: SocketIOServer, signal: any) {
  io.emit('signal:new', signal);
  io.to(`instrument:${signal.instrument}`).emit('signal:instrument', signal);
}

export function broadcastTradeUpdate(io: SocketIOServer, userId: string, trade: any) {
  io.to(`user:${userId}`).emit('trade:update', trade);
}

export function broadcastMartingaleUpdate(io: SocketIOServer, userId: string, state: any) {
  io.to(`user:${userId}`).emit('martingale:update', state);
}

export function broadcastBrokerStatus(io: SocketIOServer, status: any) {
  io.emit('broker:status', status);
}
