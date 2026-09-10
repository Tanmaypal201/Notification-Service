# API Gateway

The API Gateway is the public HTTP entry point for the backend. The frontend sends requests to the gateway, and the gateway forwards authentication requests to the Auth Service.

```text
Frontend
   |
   | HTTP requests on port 4000
   v
API Gateway
   |
   | /api/auth/* requests are proxied
   v
Auth Service on port 3001
```

## What Is Implemented

The current gateway provides:

- Auth Service proxying through `/api/auth`
- CORS configuration for the frontend
- A health endpoint at `/health`
- JSON responses for unknown routes
- Upstream timeout handling
- A `502 Bad Gateway` response when the Auth Service cannot be reached

The Notification Service is a background NATS worker. It does not have HTTP routes and is not called through this gateway.

## Important Terms

### API Gateway

A single HTTP entry point used by clients before requests reach internal backend services. It can route requests, apply cross-origin rules, handle errors, and hide internal service addresses from the frontend.

### Service

An independently running backend application. This project has an Auth Service, an API Gateway, and a Notification Service, along with MongoDB, Redis, and NATS infrastructure.

### Reverse Proxy

A server that receives a client request and forwards it to another server. In this project, the gateway receives `/api/auth/...` and forwards it to the Auth Service.

### Upstream Service

The internal service that receives a proxied request. The Auth Service is the upstream service for this gateway.

Inside Docker, the gateway uses:

```text
http://auth-service:3001
```

`auth-service` is the Docker Compose service name. Containers communicate using service names, not `localhost`.

### Route

A URL pattern handled by the application. For example:

```text
GET /health
POST /api/auth/signup
POST /api/auth/login
```

### Route Prefix

A common URL beginning shared by a group of routes. The gateway mounts the Auth proxy at:

```text
/api/auth
```

Everything below this prefix is forwarded to the Auth Service.

### Path Rewrite

The gateway changes a public URL into the internal URL expected by the Auth Service.

Examples:

| Public gateway URL | Auth Service URL |
| --- | --- |
| `/api/auth/signup` | `/signup` |
| `/api/auth/login` | `/login` |
| `/api/auth/verify` | `/verify` |
| `/api/auth/oauth/google` | `/oauth/google` |
| `/api/auth/oauth/google/callback` | `/oauth/google/callback` |

The rewrite allows the frontend to use one consistent public prefix while the Auth Service keeps its own internal routes.

### CORS

CORS means Cross-Origin Resource Sharing. Browsers use it to decide whether a frontend running on one origin can call a backend running on another origin.

The gateway currently allows these frontend origins:

- `http://localhost:3000`
- `http://127.0.0.1:3000`

Credentials are enabled so browser cookies, including authentication cookies, can be sent with requests.

### Proxy Timeout

The gateway waits up to 60 seconds for the Auth Service to respond. If the Auth Service does not respond in time, the proxy request fails instead of waiting forever.

### HTTP 502 Bad Gateway

A `502` response means the gateway could not receive a valid response from the upstream Auth Service. It usually indicates that the Auth Service is stopped, unreachable, or unavailable.

### Health Check

The health endpoint confirms that the gateway process is running:

```http
GET /health
```

Example response:

```json
{
  "success": true,
  "message": "API Gateway is running",
  "port": 4000,
  "targets": {
    "auth": "http://localhost:3001"
  }
}
```

The displayed target is informational. Inside Docker, the actual default target is `http://auth-service:3001`.

## Project Structure

```text
api-gateway/
├── index.js                 # Starts Express and defines gateway-level routes
├── routes/
│   └── auth.routes.js       # Proxies authentication requests to Auth Service
├── package.json             # Dependencies and start scripts
├── package-lock.json        # Locked dependency versions
├── dockerfile               # Docker image definition
├── .dockerignore            # Files excluded from the Docker build context
├── .env                    # Local environment values; do not commit secrets
├── .gitignore              # Local ignore rules
├── config/                 # Reserved for future gateway configuration
├── middleware/             # Reserved for future gateway middleware
└── utils/                  # Reserved for future shared gateway utilities
```

## Main Files

### `index.js`

This is the gateway entrypoint. It:

1. Loads environment variables with `dotenv`.
2. Creates the Express application.
3. Configures CORS.
4. Mounts the Auth proxy at `/api/auth`.
5. Exposes `/health`.
6. Returns JSON for unknown routes.
7. Listens on `0.0.0.0` and the configured port.

### `routes/auth.routes.js`

This file uses `http-proxy-middleware` to forward Auth requests. It defines:

- The Auth Service target URL
- Origin handling with `changeOrigin`
- Request and proxy timeouts
- Public-to-internal path rewriting
- A proxy error response

### `package.json`

Important dependencies:

| Package | Purpose |
| --- | --- |
| `express` | HTTP server and routing framework |
| `cors` | Configures browser cross-origin access |
| `dotenv` | Loads environment variables |
| `http-proxy-middleware` | Forwards requests to Auth Service |
| `nodemon` | Restarts the service during development |

## Environment Variables

The gateway uses these values in `api-gateway/.env`:

```env
PORT=4000
AUTH_SERVICE_URL=http://auth-service:3001
```

### `PORT`

The port where the gateway listens. The Docker Compose configuration publishes port `4000`.

### `AUTH_SERVICE_URL`

The internal Auth Service address used by the proxy.

Docker value:

```env
AUTH_SERVICE_URL=http://auth-service:3001
```

Local value, when Auth Service runs directly on the host:

```env
AUTH_SERVICE_URL=http://localhost:3001
```

Do not put SMTP credentials, database credentials, or NATS credentials in this service. The gateway does not send email, access MongoDB, or consume NATS events.

## Running Locally

From the `api-gateway` directory:

```powershell
npm install
npm run dev
```

The gateway will be available at:

```text
http://localhost:4000
```

Start the Auth Service separately when testing proxied routes.

## Running With Docker Compose

From the repository root:

```powershell
docker compose up -d --build api-gateway auth-service
```

The gateway is available at:

```text
http://localhost:4000
```

Check the gateway health endpoint:

```powershell
Invoke-RestMethod http://localhost:4000/health
```

View gateway logs:

```powershell
docker compose logs -f api-gateway
```

## Testing Auth Through the Gateway

The frontend should call the gateway, not the Auth Service directly:

```text
POST http://localhost:4000/api/auth/signup
POST http://localhost:4000/api/auth/login
POST http://localhost:4000/api/auth/verify
POST http://localhost:4000/api/auth/resend
POST http://localhost:4000/api/auth/logout
```

The gateway forwards these requests to the Auth Service and preserves the request method, body, headers, and response.

## Error Behavior

### Unknown Gateway Route

```json
{
  "success": false,
  "message": "Route GET /unknown not found on API Gateway"
}
```

This returns HTTP `404`.

### Auth Service Unavailable

```json
{
  "success": false,
  "message": "Auth service is currently unreachable via API Gateway.",
  "error": "..."
}
```

This returns HTTP `502`.

## Request Flow Example

For a login request:

```text
1. Frontend sends POST /api/auth/login to port 4000.
2. API Gateway matches the /api/auth route.
3. The gateway rewrites the path to /login.
4. The gateway forwards the request to http://auth-service:3001/login.
5. Auth Service validates the login.
6. Auth Service returns the response.
7. API Gateway returns that response to the frontend.
```

For account creation and welcome email delivery:

```text
Frontend
  -> API Gateway
  -> Auth Service signup
  -> OTP verification
  -> Auth Service publishes user.created to NATS JetStream
  -> Notification Service consumes the event
  -> Nodemailer sends the welcome email
```

The gateway only handles the HTTP part of this flow. It does not publish or consume the notification event.
