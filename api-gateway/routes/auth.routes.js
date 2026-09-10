const express = require("express");
const { createProxyMiddleware } = require("http-proxy-middleware");
const router = express.Router();

const AUTH_SERVICE_URL = process.env.AUTH_SERVICE_URL || "http://auth-service:3001";

router.use(
    "/",
    createProxyMiddleware({
        target: AUTH_SERVICE_URL,
        changeOrigin: true,
        timeout: 60000,
        proxyTimeout: 60000,
        pathRewrite: (path, req) => {
            const cleanPath = path
                .replace(/^\/api\/auth\/oauth/, "/oauth")
                .replace(/^\/api\/oauth/, "/oauth")
                .replace(/^\/api\/auth/, "")
                .replace(/^\/auth/, "");
            return cleanPath || "/";
        },
        on: {
            error: (err, req, res) => {
                console.error("[API Gateway - Auth Proxy Error]:", err.message);
                if (!res.headersSent) {
                    res.status(502).json({
                        success: false,
                        message: "Auth service is currently unreachable via API Gateway.",
                        error: err.message,
                    });
                }
            },
        },
    })
);

module.exports = router;