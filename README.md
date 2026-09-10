# Notification Backend System

A Docker Compose microservices backend containing an API Gateway, an Auth Service, and a Notification Service.

The system currently implements two connected flows:

1. Frontend HTTP requests go through the API Gateway to the Auth Service.
2. After successful signup and OTP verification, Auth publishes a `user.created` event through NATS JetStream. Notification Service consumes it and sends a welcome email.

## Architecture

```text
Frontend
   |
   | HTTP :4000
   v
API Gateway
   |
   | HTTP proxy: /api/auth/*
   v
Auth Service :3001
   |
   | MongoDB, Redis
   |
   | after successful OTP verification
   v
NATS JetStream :4222
   |
   | user.created
   v
Notification Service
   |
   | Nodemailer / SMTP
   v
Welcome Email
```

## Services

### API Gateway

The public HTTP entry point for the frontend. It runs on port `4000` and proxies authentication requests to Auth Service.

Responsibilities:

- Accept frontend HTTP requests.
- Apply CORS rules.
- Forward `/api/auth/*` requests.
- Rewrite public paths into Auth Service paths.
- Return a health response from `/health`.
- Return `404` for unknown gateway routes.
- Return `502 Bad Gateway` when Auth Service is unavailable.

The gateway does not send emails, access MongoDB, consume NATS events, or implement notification logic.

### Auth Service

The user-facing authentication service. It runs on port `3001` and owns user creation, login, cookies, OTP verification, password operations, and OAuth routes.

Responsibilities:

- Start the Express HTTP server.
- Connect to MongoDB.
- Connect to Redis.
- Connect to NATS JetStream.
- Begin signup and store temporary signup data and OTP values.
- Verify the signup OTP.
- Create the user only after successful verification.
- Publish `user.created` only after successful user creation and update/save operations.
- Never publish `user.created` during normal login.

### Notification Service

The Notification Service is a background worker, not an HTTP API. It does not expose port `6000` and does not have REST routes.

Responsibilities:

- Connect to NATS JetStream.
- Ensure the `USER_EVENTS` stream exists.
- Ensure the durable `notification-worker` consumer exists.
- Consume `user.created` messages.
- Validate event data.
- Send one generic welcome email.
- ACK only after the email is sent successfully.
- Leave failed messages unacknowledged so JetStream can redeliver them.
- Shut down gracefully on `SIGINT` and `SIGTERM`.

Only this notification is implemented currently:

```text
user.created -> welcome email
```

SMS, push notifications, password reset notifications, OTP notifications, and generic notification types are not implemented in Notification Service.

## Infrastructure Services

### MongoDB

MongoDB is the persistent document database used by Auth Service for user records. The configured database name is `Notifyme`.

Docker Compose exposes MongoDB on host port `27017` and stores data in the `mongo-data` named volume.

### Redis

Redis is the temporary key-value store used by Auth Service for signup data and OTP values with expiration times.

Examples of temporary data:

```text
signup:user:<email>
signup:otp:<email>
forget:otp:<email>
verify:forgetotp:<email>
```

Inside Docker, services connect to `redis://redis:6379`. They must not use `localhost` for container-to-container Redis communication.

### NATS

NATS is the messaging system used for communication between Auth Service and Notification Service. NATS runs with JetStream enabled using `command: ["-js"]`.

The NATS client URL inside Docker is:

```text
nats://nats:4222
```

### NATS JetStream

JetStream is the durable messaging layer built into NATS. Unlike plain Core NATS publish/subscribe, JetStream stores messages and supports durable consumers, acknowledgements, redelivery, and delivery limits.

This project uses JetStream because a welcome email event must not disappear if Notification Service is temporarily unavailable.

### SMTP

SMTP is the email delivery protocol used by Nodemailer. Gmail SMTP is configured through environment variables. Credentials are never hardcoded in source code or Dockerfiles.

### Docker Compose

Docker Compose runs the backend services together and provides a private network where service names resolve to containers.

Compose service names include:

```text
mongo
redis
nats
auth-service
api-gateway
notify-service
```

For example, the gateway reaches Auth at `http://auth-service:3001`, and Auth reaches Redis at `redis://redis:6379`.

## Important Terms

### Microservice

An independently running application that owns a focused responsibility. Auth and Notification Service can be built, restarted, and scaled separately.

### API Gateway

A single public HTTP entry point that routes client requests to internal services. It hides internal service addresses from the frontend.

### Reverse Proxy

A server that receives a request and forwards it to another server. The API Gateway is a reverse proxy for Auth Service.

### Upstream Service

The internal destination of a proxied request. In this project, Auth Service is the gateway's upstream service.

### Route

A URL and HTTP method handled by a service, such as `POST /login`.

### Route Prefix

A shared URL beginning for related routes. The gateway exposes Auth routes below `/api/auth`.

### Path Rewrite

Changing a public path into the internal path expected by the destination service.

| Public URL | Auth Service URL |
| --- | --- |
| `/api/auth/signup` | `/signup` |
| `/api/auth/login` | `/login` |
| `/api/auth/verify` | `/verify` |
| `/api/auth/oauth/google` | `/oauth/google` |

### CORS

Cross-Origin Resource Sharing. It controls which browser origins may call the gateway. The current configuration allows the local frontend at ports `3000` and `4000` and allows cookies.

### Cookie

A browser-managed value used here for access and refresh authentication tokens. The gateway allows credentialed requests so authentication cookies can travel between the frontend and backend.

### OTP

One-Time Password. Auth sends a temporary verification code during signup. The user must provide the correct, unexpired code before the account is created.

### Authentication

The process of proving a user's identity, including password login, signup OTP verification, refresh tokens, and Google OAuth.

### Access Token

A short-lived token used to authenticate API requests.

### Refresh Token

A longer-lived token used to obtain or maintain access after an access token expires.

### Middleware

Code that runs during request processing before the final route handler. Examples in Auth include authentication checks, refresh-token checks, rate limiting, CORS, and cookie parsing.

### Rate Limiting

Restricting how frequently a client can call selected routes. Auth applies rate limiting to protect authentication endpoints.

### Event

A message describing something that happened. Auth publishes a `user.created` event after a verified user has been saved.

### Event Subject

The NATS routing name used to publish and consume an event. This project uses `user.created`.

### Event Payload

The JSON data carried by the event:

```json
{
  "eventId": "unique-id",
  "eventType": "user.created",
  "timestamp": "ISO timestamp",
  "userId": "user-id",
  "name": "user-name",
  "email": "user-email"
}
```

### Publisher

The component that sends an event. Auth's `publishUserCreated(user)` function publishes to JetStream using `js.publish()`.

### Consumer

The component that reads events. Notification Service uses a durable consumer named `notification-worker`.

### Stream

A JetStream storage definition containing messages for one or more subjects. This project uses:

```text
Stream: USER_EVENTS
Subject: user.created
Storage: file
Retention: limits
```

### Durable Consumer

A named consumer whose position survives restarts. The durable name is `notification-worker`.

### Explicit ACK

An explicit acknowledgement tells JetStream that a consumer successfully processed a message. Notification Service calls `message.ack()` only after `sendWelcomeEmail()` succeeds.

### Redelivery

If a message is not acknowledged before the acknowledgement wait expires, JetStream sends it again. Email failures intentionally leave messages unacknowledged.

### Maximum Delivery Count

The maximum number of delivery attempts for a message. The notification consumer is configured with `max_deliver: 5`.

### Nodemailer

The Node.js library used by Notification Service and Auth Service to send email through SMTP.

### Graceful Shutdown

A controlled shutdown that drains the NATS connection and exits cleanly when Docker sends `SIGTERM` or the process receives `SIGINT`.

### Environment Variable

A configuration value supplied outside source code. Examples include `NATS_URL`, `MONGODB_URI`, `EMAIL_USER`, and `EMAIL_PASS`.

## Repository Structure

```text
trams/
├── api-gateway/
│   ├── index.js
│   ├── routes/auth.routes.js
│   ├── package.json
│   └── dockerfile
├── auth/
│   ├── index.js
│   ├── app.js
│   ├── controller/user.js
│   ├── models/users.js
│   ├── routes/
│   ├── middleware/
│   ├── services/
│   ├── nats/publisher.js
│   └── dockerfile
├── NotifyService/
│   ├── app.js
│   ├── config/nats.js
│   ├── controllers/userCreated.controller.js
│   ├── services/email.service.js
│   ├── package.json
│   └── Dockerfile
├── docker-compose.yml
├── .env.example
└── README.md
```

## Environment Variables

Never commit real `.env` files. Use the example files as templates.

Common values:

```env
NODE_ENV=production
NATS_URL=nats://nats:4222
MONGODB_URI=mongodb://mongo:27017/Notifyme
REDIS_URL=redis://redis:6379
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
EMAIL_USER=your-email@example.com
EMAIL_PASS=your-app-password
```

Gateway values:

```env
PORT=4000
AUTH_SERVICE_URL=http://auth-service:3001
```

When a service runs directly on the host instead of inside Docker, `localhost` may be used for local dependencies. Inside Docker, use Compose service names such as `mongo`, `redis`, `nats`, and `auth-service`.

## HTTP Flow: Signup and Login

### Signup and OTP Verification

```text
1. Frontend sends POST /api/auth/signup to API Gateway.
2. Gateway rewrites and forwards the request to Auth Service /signup.
3. Auth stores temporary signup data and an OTP in Redis.
4. Auth sends the OTP email.
5. Frontend sends POST /api/auth/verify.
6. Gateway forwards the request to Auth Service /verify.
7. Auth validates the OTP.
8. Auth creates and saves the user in MongoDB.
9. Auth publishes user.created to NATS JetStream.
10. Auth returns the successful signup response.
```

### Normal Login

```text
1. Frontend sends POST /api/auth/login to API Gateway.
2. Gateway forwards the request to Auth Service /login.
3. Auth verifies the username and password.
4. Auth creates access and refresh cookies.
5. Auth returns the login response.
```

Normal login does not publish `user.created`.

## Event Flow: Welcome Email

```text
Auth Service
  |
  | js.publish("user.created", encoded JSON)
  v
NATS JetStream
  |
  | USER_EVENTS / notification-worker
  v
Notification Service
  |
  | parse and validate JSON
  v
Nodemailer / SMTP
  |
  | successful email
  v
message.ack()
```

If JSON is malformed, the event is invalid, or SMTP sending fails, the consumer logs the error and does not ACK the message. JetStream can then redeliver it, up to the configured delivery limit.

## Running the System

From the repository root:

```powershell
docker compose up -d --build
```

Check service status:

```powershell
docker compose ps
```

View logs:

```powershell
docker compose logs -f api-gateway
docker compose logs -f auth-service
docker compose logs -f notify-service
```

Check the gateway:

```powershell
Invoke-RestMethod http://localhost:4000/health
```

Stop the system:

```powershell
docker compose down
```

Stop the system and remove named data volumes:

```powershell
docker compose down -v
```

The `-v` option deletes MongoDB, Redis, and NATS stored data. Use it only when that data can be discarded.

## Troubleshooting

### `Cannot find module 'nats'`

Confirm `nats` is listed in `auth/package.json`, then rebuild:

```powershell
docker compose up -d --build auth-service
```

### Redis connects to `127.0.0.1`

Inside Docker, use:

```env
REDIS_URL=redis://redis:6379
```

### NATS does not connect

Confirm NATS is running with JetStream enabled and that services use:

```env
NATS_URL=nats://nats:4222
```

### SMTP returns `535 BadCredentials`

Use a valid SMTP account and app password in `.env`. Do not put credentials in source code or Dockerfiles. Recreate the affected service after changing environment values:

```powershell
docker compose up -d --build auth-service notify-service
```

### Docker says a container name is already in use

List containers:

```powershell
docker ps -a
```

Stop and remove only the old conflicting container, then retry Compose. Avoid deleting containers that belong to another active project unless you know they are no longer needed.

## Current Scope

Implemented:

- Auth HTTP routes through the API Gateway
- MongoDB user persistence
- Redis signup and OTP state
- NATS JetStream event publishing
- Durable JetStream event consumption
- Generic welcome email delivery
- Docker Compose deployment

Not implemented yet:

- SMS notifications
- Push notifications
- Password reset notification events
- OTP notification events from Notification Service
- Notification database persistence
- Kafka communication
- Notification Service REST API
