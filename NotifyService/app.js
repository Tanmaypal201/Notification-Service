require("dotenv").config();

const { closeNATS, connectNATS } = require("./config/nats");
const {
    ensureUserEventsInfrastructure,
    startUserCreatedConsumer
} = require("./controllers/userCreated.controller");

let shuttingDown = false;

const shutdown = async (signal) => {
    if (shuttingDown) {
        return;
    }

    shuttingDown = true;
    console.log(`Received ${signal}; shutting down Notification Service`);

    try {
        await closeNATS();
        process.exit(0);
    } catch (error) {
        console.error("Notification Service shutdown failed:", error.message);
        process.exit(1);
    }
};

const start = async () => {
    await connectNATS();
    await ensureUserEventsInfrastructure();
    await startUserCreatedConsumer();
    console.log("Notification Service has started");
};

process.once("SIGINT", () => shutdown("SIGINT"));
process.once("SIGTERM", () => shutdown("SIGTERM"));

start().catch((error) => {
    console.error("Notification Service failed to start:", error.message);
    process.exit(1);
});