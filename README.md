# Open World Game Platform

This repository hosts a prototype platform for an open-world multiplayer experience. It includes:

- **Authoritative backend services** (`backend/services`) offering REST APIs and WebSocket transport for player state, sessions, and combat events.
- **Client networking toolkit** (`client/network`) for reconnect logic, interpolation, and conflict resolution across first- and third-person views.
- **Infrastructure automation**: PostgreSQL migrations, automated backups, Docker Compose deployment, and CI workflows.

## Getting started

1. Install dependencies for the backend service:
   ```bash
   cd backend/services
   npm install
   ```
2. Copy the environment template and update values when necessary:
   ```bash
   cp .env.example .env
   ```
3. Run migrations and start the HTTP/WebSocket server:
   ```bash
   npm run migrate
   npm start
   ```
4. Execute the automated test suite (REST, WebSocket, and client networking):
   ```bash
   npm test
   ```

## Key directories

- `backend/services/src` – Express application, PostgreSQL integration, and real-time PresenceHub implementation.
- `backend/services/migrations` – SQL migrations defining players, sessions, and position tracking tables.
- `backend/services/scripts` – Utility scripts for migrations, backups, and world asset packaging.
- `client/network` – Reusable WebSocket client with reconnection, interpolation, and first-/third-person conflict handling.
- `docs/DEPLOYMENT.md` – Docker Compose deployment walkthrough.
- `.github/workflows/ci.yml` – Continuous integration pipeline for linting, testing, and packaging artifacts.

## API overview

| Method | Endpoint | Description |
| ------ | -------- | ----------- |
| `GET`  | `/health` | Service status probe. |
| `POST` | `/players` | Create or update a player profile. |
| `GET`  | `/players/:playerId` | Fetch a player profile. |
| `GET`  | `/players/:playerId/position` | Load the latest saved transform for a player. |
| `POST` | `/players/:playerId/position` | Persist the latest transform for an active session. |
| `POST` | `/sessions` | Create a new gameplay session. |
| `DELETE` | `/sessions/:sessionId` | Close an active session. |
| `GET` | `/sessions/:sessionId` | Inspect session metadata. |
| `GET` | `/sessions/active` | Enumerate active sessions. |

WebSocket clients connect to `ws://<host>:4000`, send a `join` payload, and can broadcast `presence:update`, `animation:update`, and `combat:event` messages. A `replay` command returns recent event history for late joiners.

## Continuous integration

The GitHub Actions workflow performs the following for every push:

1. Install dependencies and lint source files.
2. Execute the Jest test suite, including replayable WebSocket integration tests.
3. Package world assets via `npm run build` and expose them as CI artifacts.

Refer to `docs/DEPLOYMENT.md` for containerized deployment details.
