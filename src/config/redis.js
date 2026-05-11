const Redis = require('ioredis');
const env = require('./env');

let redisClient = null;

if (env.redisUrl) {
  redisClient = new Redis(env.redisUrl, {
    maxRetriesPerRequest: 3,
    retryDelayOnFailover: 100,
    enableReadyCheck: true,
    lazyConnect: true
  });

  redisClient.on('error', (err) => {
    console.error('Redis connection error:', err);
  });

  redisClient.on('connect', () => {
    console.log('Redis connected successfully');
  });
}

module.exports = redisClient;
