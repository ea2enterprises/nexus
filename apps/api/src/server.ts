import Fastify from 'fastify';
import cors from '@fastify/cors';
import fastifyJwt from '@fastify/jwt';
import { Server } from 'socket.io';
import { config } from './config/index.js';
import { testConnection, closeConnection } from './db/client.js';
import { authRoutes } from './routes/auth.js';
import { signalRoutes } from './routes/signals.js';
import { tradeRoutes } from './routes/trades.js';
import { riskRoutes } from './routes/risk.js';
import { dashboardRoutes } from './routes/dashboard.js';
import { userRoutes } from './routes/users.js';
import { brokerRoutes } from './routes/broker.js';
import { setupSocketHandlers } from './ws/socket.js';

const app = Fastify({ logger: true });

// ─── Decorate (before routes) ────────────────────────────────
app.decorate('io', null as any);

// ─── Plugins ─────────────────────────────────────────────────
await app.register(cors, { origin: config.cors.origin, credentials: true });
await app.register(fastifyJwt, { secret: config.jwt.secret });

// ─── Health Check ────────────────────────────────────────────
app.get('/health', async () => {
  const dbOk = await testConnection();
  return {
    status: dbOk ? 'ok' : 'degraded',
    timestamp: new Date().toISOString(),
    services: {
      database: dbOk ? 'connected' : 'disconnected',
    },
  };
});

// ─── Routes ──────────────────────────────────────────────────
await app.register(authRoutes, { prefix: '/auth' });
await app.register(signalRoutes, { prefix: '/signals' });
await app.register(tradeRoutes, { prefix: '/trades' });
await app.register(riskRoutes, { prefix: '/risk' });
await app.register(dashboardRoutes, { prefix: '/dashboard' });
await app.register(userRoutes, { prefix: '/users' });
await app.register(brokerRoutes, { prefix: '/broker' });

// ─── Start Server ────────────────────────────────────────────
const start = async () => {
  try {
    const server = await app.listen({ port: config.port, host: config.host });
    console.log(`NEXUS API running at ${server}`);

    // Socket.IO on same HTTP server
    const io = new Server(app.server, {
      cors: { origin: config.cors.origin, credentials: true },
    });

    setupSocketHandlers(io);
    // Update the io reference for routes
    (app as any).io = io;

    console.log('Socket.IO attached');
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
};

// Graceful shutdown
const shutdown = async () => {
  console.log('Shutting down...');
  await closeConnection();
  await app.close();
  process.exit(0);
};

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

start();

export { app };
