# Deployment Guide

This guide describes how to deploy the authoritative state service and its supporting infrastructure with Docker Compose.

## Prerequisites

- Docker 20.10+
- Docker Compose v2+

## Environment configuration

1. Copy `backend/services/.env.example` to `backend/services/.env` and adjust the values as needed. At a minimum configure `DATABASE_URL` when using external PostgreSQL instances.
2. Ensure the `BACKUP_DIRECTORY` path maps to a persistent volume on your host if you need to keep backups across container restarts.

## Bootstrapping the stack

1. Build and start the stack:
   ```bash
   docker compose up --build
   ```
2. The first start runs database migrations automatically before launching the HTTP/WebSocket server.
3. The backend service is available on `http://localhost:4000`. WebSocket clients connect to `ws://localhost:4000`.

## Database migrations

Migrations run automatically on container start via `node scripts/run-migrations.js`. To run migrations manually on your host:

```bash
cd backend/services
npm install
npm run migrate
```

## Automated backups

A dedicated `backup` service invokes `node scripts/backup.js` hourly. Backups are written to the `backend-backups` volume, which you can map to a host directory for retention:

```yaml
volumes:
  - ./backups:/app/backups
```

## Packaging world assets

The `npm run build` script lints, tests, and writes packaged world assets to `backend/services/dist/world`. The Docker image includes the built assets under `/app/dist/world`.

## Continuous Integration

See `.github/workflows/ci.yml` for linting, testing, and packaging automation that mirrors the deployment build process.
