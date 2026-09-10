require("dotenv").config();
const express = require("express");
const cors = require("cors");

const authRouter = require("./routes/auth.routes");
const app = express();
const PORT = process.env.PORT || 4000;

app.use(
    cors({
        origin: ["http://localhost:3000", "http://127.0.0.1:3000"],
        credentials: true,
        methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
        allowedHeaders: ["Content-Type", "Authorization", "Cookie", "X-Requested-With"],
        exposedHeaders: ["Set-Cookie"],
    })
);

const AUTH_SERVICE_URL = process.env.AUTH_SERVICE_URL || "http://auth-service:3001";
app.use("/api/auth", authRouter);
app.get("/health", (req, res) => {
    res.json({
        success: true,
        message: "API Gateway is running",
        port: PORT,
        targets: {
            auth: process.env.AUTH_SERVICE_URL || "http://localhost:3001",
        },
    });
});
app.use((req, res) => {
    res.status(404).json({
        success: false,
        message: `Route ${req.method} ${req.originalUrl} not found on API Gateway`,
    });
});
app.listen(PORT, "0.0.0.0", () => {
    console.log(`🚀 API Gateway is running on http://0.0.0.0:${PORT}`);
});