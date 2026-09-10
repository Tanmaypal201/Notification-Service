const { getJetStream, getNATS, sc } = require("../config/nats");
const { sendWelcomeEmail } = require("../services/email.service");

const STREAM_NAME = "USER_EVENTS";
const CONSUMER_NAME = "notification-worker";
const SUBJECT = "user.created";

const ensureUserEventsInfrastructure = async () => {
    const jsm = await getNATS().jetstreamManager();

    try {
        await jsm.streams.info(STREAM_NAME);
    } catch (error) {
        await jsm.streams.add({
            name: STREAM_NAME,
            subjects: [SUBJECT],
            retention: "limits",
            storage: "file"
        });
    }

    try {
        await jsm.consumers.info(STREAM_NAME, CONSUMER_NAME);
    } catch (error) {
        await jsm.consumers.add(STREAM_NAME, {
            durable_name: CONSUMER_NAME,
            ack_policy: "explicit",
            filter_subject: SUBJECT,
            max_deliver: 5,
            ack_wait: 30 * 1e9
        });
    }
};

const isValidUserCreatedEvent = (data) => (
    data
    && data.eventType === SUBJECT
    && typeof data.userId === "string"
    && data.userId.length > 0
    && typeof data.name === "string"
    && data.name.length > 0
    && typeof data.email === "string"
    && data.email.length > 0
);

const startUserCreatedConsumer = async () => {
    const consumer = await getJetStream().consumers.get(STREAM_NAME, CONSUMER_NAME);
    const messages = await consumer.consume();

    console.log(`Listening for ${SUBJECT} events`);

    for await (const message of messages) {
        try {
            const data = JSON.parse(sc.decode(message.data));

            if (!isValidUserCreatedEvent(data)) {
                throw new Error("Invalid user.created event");
            }

            await sendWelcomeEmail({
                name: data.name,
                email: data.email
            });

            message.ack();
            console.log(`Welcome email sent for user ${data.userId}`);
        } catch (error) {
            console.error("Notification processing failed:", error.message);
        }
    }
};

module.exports = {
    ensureUserEventsInfrastructure,
    startUserCreatedConsumer
};
