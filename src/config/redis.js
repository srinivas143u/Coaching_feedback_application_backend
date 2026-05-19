const Redis = require('ioredis');

let redis;

const getRedisClient = () => {
  if (!redis) {
    redis = new Redis({
      host: process.env.REDIS_HOST || '127.0.0.1',
      port: parseInt(process.env.REDIS_PORT) || 6379,
      lazyConnect: true,
      retryStrategy: (times) => {
        if (times > 3) {
          console.warn('⚠️  Redis not available, caching disabled.');
          return null; // stop retrying
        }
        return Math.min(times * 100, 3000);
      },
    });

    redis.on('connect', () => console.log('✅ Redis Connected'));
    redis.on('error', (err) => console.warn('⚠️  Redis Error:', err.message));
  }
  return redis;
};

module.exports = { getRedisClient };
