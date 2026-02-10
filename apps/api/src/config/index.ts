import 'dotenv/config';

export const config = {
  port: parseInt(process.env.API_PORT || '3001', 10),
  host: process.env.API_HOST || '0.0.0.0',
  nodeEnv: process.env.NODE_ENV || 'development',

  database: {
    url: process.env.DATABASE_URL || 'postgresql://nexus:nexus_dev_password@localhost:5432/nexus',
  },

  redis: {
    url: process.env.REDIS_URL || 'redis://localhost:6379',
  },

  jwt: {
    secret: process.env.JWT_SECRET || 'dev-jwt-secret-change-in-production',
    refreshSecret: process.env.JWT_REFRESH_SECRET || 'dev-refresh-secret-change-in-production',
    accessExpiresIn: '15m',
    refreshExpiresIn: '7d',
  },

  signalEngine: {
    url: process.env.SIGNAL_ENGINE_URL || 'http://localhost:8000',
    apiKey: process.env.SIGNAL_ENGINE_API_KEY || 'dev-signal-key',
  },

  cors: {
    origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
  },
} as const;
