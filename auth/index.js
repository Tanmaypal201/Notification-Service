const app = require("./app");
const http = require("http");
const mongoose = require("mongoose");
const { connectNATS } = require("./nats/publisher");

const PORT = 3001;

const start = async () => {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("Get Connected to the Database !!");

    await connectNATS();

    const server = http.createServer(app);
    server.listen(PORT, "0.0.0.0", () => (
        console.log(`Server is running on http://0.0.0.0:${PORT}`)
    ));
};

start().catch((error) => {
    console.error("Auth Service failed to start:", error.message);
    process.exit(1);
});
