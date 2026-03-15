import { Redis } from 'ioredis';

const redis = new Redis(process.env.REDIS_URL, {
  maxRetriesPerRequest: null, // Required by BullMQ
  enableReadyCheck: false,
  tls: {}, // Upstash requires TLS (rediss://)
});

redis.on('error', (err) => console.error('Redis error:', err));

export default redis;
