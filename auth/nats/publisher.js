const crypto = require("crypto");
const { connect, StringCodec } = require("nats");

const NATS_URL = process.env.NATS_URL || "nats://nats:4222";

let nc = null;
let js = null;

const sc = StringCodec();
const connectNATS = async () => {
    if (nc) {
        return nc;
    }

    nc = await connect({
        servers: NATS_URL
    });

    js = nc.jetstream();
    console.log("Connected to NATS JetStream");

    return nc;
};


const publishUserCreated = async (user) => {
    try {
        const connection = await connectNATS();

        const event = {
            eventId: crypto.randomUUID(),
            eventType: "user.created",
            timestamp: new Date().toISOString(),

            userId: user._id.toString(),
            name: user.name || user.username,
            email: user.email
        };

        await js.publish(
            "user.created",
            sc.encode(JSON.stringify(event))
        );

        console.log(
            `Published user.created event for ${user.email}`
        );

        return event;

    } catch (error) {
        console.error(
            "Failed to publish user.created event:",
            error.message
        );

        throw error;
    }
};


module.exports = {
    connectNATS,
    publishUserCreated
};