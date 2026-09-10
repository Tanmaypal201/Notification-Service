const Redis = require("ioredis");

const redisUrl = process.env.REDIS_URL || "redis://127.0.0.1:6379";

const redis = new Redis(redisUrl, {
    retryStrategy(times) {
        const delay = Math.min(times * 200, 3000);
        return delay;
    },
    maxRetriesPerRequest: 3,
});

redis.on("connect", () => {
    console.log(`[Redis] Connected to Redis at ${redisUrl}`);
});

redis.on("error", (err) => {
    console.error("[Redis] Redis error:", err.message);
});

module.exports = redis;
