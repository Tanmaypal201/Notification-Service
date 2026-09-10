const redis = require("../config/redis");

const ratelimiter = async (req, res, next) => {
    const key = `rate:${req.ip}`
    const limit = 5;
    const window = 120;

    const current = await redis.incr(key);
    if (current === 1) {
        await redis.expire(key, window);
    }

    if (current > limit) {
        return res.status(429).json({
            message: "Too many requests"
        });
    }

    next();
}

module.exports = {
    ratelimiter
}
