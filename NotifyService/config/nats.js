const { connect, StringCodec } = require("nats");

const NATS_URL = process.env.NATS_URL || "nats://nats:4222";

let nc;
let js;
const sc = StringCodec();

const connectNATS = async () => {
    if (nc) {
        return { nc, js };
    }

    nc = await connect({
        servers: NATS_URL
    });
    js = nc.jetstream();
    console.log("Connected to NATS JetStream");
    return { nc, js };
};

const getNATS = () => {
    if (!nc) {
        throw new Error("NATS is not connected");
    }
    return nc;
};

const getJetStream = () => {
    if (!js) {
        throw new Error("JetStream is not initialized");
    }
    return js;
};

const closeNATS = async () => {
    if (nc) {
        await nc.drain();
        nc = null;
        js = null;
    }
};

module.exports = { closeNATS, connectNATS, getNATS, getJetStream, sc };