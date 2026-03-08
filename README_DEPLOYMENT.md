# Interactive Physics Platform - Deployment Guide

This project has been packaged for production deployment using Docker and Docker Compose. It uses Nginx as a reverse proxy, a Python/FastAPI backend, and PostgreSQL for persistent data. Existing labs and logic remain fully backward-compatible.

## Prerequisites
- A target server (e.g., VPS) running Ubuntu/Debian or similar.
- **Docker** installed (`curl -fsSL https://get.docker.com -o get-docker.sh && sh get-docker.sh`).
- **Docker Compose** plugin installed.

## 1. Setup Environment
1. Clone the repository to the production server.
2. Navigate to the project directory:
   ```bash
   cd project_name
   ```
3. Copy the `.env.example` to `.env`:
   ```bash
   cp .env.example .env
   ```
4. Edit `.env` to set secure passwords for production:
   ```bash
   nano .env
   ```
   *Note: Make sure `DATABASE_URL` matches the credentials used for `POSTGRES_USER` and `POSTGRES_PASSWORD`.*

## 2. Start Application
To run the platform in the background (detached mode):

```bash
docker compose up -d --build
```

This command will:
1. Build the lightweight Python FastAPI container.
2. Download and start a PostgreSQL 15 database container.
3. Start the Nginx reverse-proxy container on port `80`.

## 3. Verify Deployment
Check the running containers: 
```bash
docker compose ps
```
Both `web`, `db`, and `nginx` should report as "Up".

If Nginx is correctly binding to port 80, navigating to your VPS IP address or assigned domain name in a browser will load the platform.

### Storage Persistence
- Uploaded files from the interactive lab are stored in `./data/uploads` on the host machine.
- PostgreSQL data is safely stored in a managed Docker volume (`postgres_data`).

## 4. Troubleshooting
If anything fails, you can check the logs:

```bash
# View all logs
docker compose logs -f

# View specifically the web app logs
docker compose logs -f web

# View db logs
docker compose logs -f db
```

To stop the deployment without losing data:
```bash
docker compose down
```
