# ReactFireChat — Ephemeral & Traceless

A no-leaks, no-tracks real-time chat. Every room self-destructs after 5 minutes from creation. No chat history persists — your conversations leave zero footprint. Built for private, throwaway discussions.

**[Live Demo](https://malnutreetofirechat.duckdns.org)**

---

## Why Ephemeral

- **No storage:** Messages live only while the room is active. 5 minutes after creation, everything is wiped.
- **No accounts:** Just pick a nickname and a room name. No email, no signup, no identity tracking.
- **No traces:** No message logs, no user analytics, no cookies. Once a room expires, nothing remains.
- **Countdown visible:** Every room shows a live countdown timer so you know exactly when it self-destructs.
- **Graceful exit:** When a room expires, all participants are notified in-app with a clear message.

---

## Architecture

Originally Firebase-powered, now fully refactored to a **FastAPI + SQLite + WebSocket** stack:

| Layer | Technology |
|---|---|
| Frontend | React 18, SCSS, Material UI |
| Backend | Python FastAPI, Uvicorn/Gunicorn |
| Real-time | Native WebSockets |
| Database | SQLite (in-memory workflow, no durable storage needed) |
| Hosting | Oracle Cloud Always-Free (ARM, 4 OCPU, 24 GB RAM) |

### The Migration (Firebase → FastAPI)
- **Old:** React talking directly to Firebase (serverless, vendor-locked)
- **New:** React communicates via REST and WebSockets to a self-hosted FastAPI backend with full control over validation, rate limiting, and state.

---

## Features

- **Real-time:** Instant message delivery via WebSockets.
- **5-minute rooms:** Rooms auto-expire 5 minutes after creation. A countdown timer shows remaining life.
- **Graceful expiry:** All participants receive an in-app notification when the room closes.
- **Room capacity:** Max 10 users per room.
- **Mobile-optimized:** Full-screen responsive design with sticky input and touch-friendly UI.
- **Nickname cooldown:** 5-minute lockout after leaving a room (prevents rapid rejoin spam).
- **Anti-spam:** Input validation, rate limiting (60 messages per 10s), and automatic cleanup.
- **Unique colors:** Avatar colors derived from nickname hash.

---

## Tech Stack

### Frontend
- React 18, SCSS, Material-UI
- React Hooks + WebSocket event listeners
- Create React App (Dockerized multi-stage build)

### Backend
- FastAPI (Python 3.11)
- Uvicorn + Gunicorn (`-w 1` for shared WebSocket state)
- SQLAlchemy ORM + SQLite
- REST API + WebSocket

---

## Run Locally

Requires Docker and Docker Compose:

```bash
git clone https://github.com/ematrito/ReactFireChat.git
cd ReactFireChat
docker compose up --build
```

- Frontend: http://localhost:3002
- Backend API: http://localhost:8080

Or without Docker:

```bash
# Backend
cd backend
pip install -r requirements.txt
gunicorn -w 1 -k uvicorn.workers.UvicornWorker main:app -b 127.0.0.1:8080

# Frontend
npm install && npm start
```

---

## Deployment

### Oracle Cloud Always-Free

1. Provision a **VM.Standard.A1.Flex** instance (4 OCPU, 24 GB RAM, Ubuntu 22.04)
2. Install dependencies: `python3-pip`, `nginx`, `nodejs`
3. Clone the repo, build the frontend (`npm run build`)
4. Point nginx to `build/` as root, proxy `/api/*` and `/ws/*` to gunicorn on `127.0.0.1:8000`
5. Enable the systemd service for the backend

```nginx
server {
    listen 80;
    root /home/ubuntu/reactfirechat/build;
    index index.html;

    location / { try_files $uri /index.html; }
    location /api/ { proxy_pass http://127.0.0.1:8000/api/; }
    location /ws/  {
        proxy_pass http://127.0.0.1:8000/ws/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }
}
```

---

## Configuration

| Env Variable | Default | Description |
|---|---|---|
| `DATABASE_URL` | `sqlite:///./chat.db` | Database connection string |
| `ALLOWED_ORIGINS` | `*` | CORS allowed origins (comma-separated) |

Room lifetime and cooldown are set in `backend/main.py`:
```python
ROOM_LIFETIME_MINUTES = 5
COOLDOWN_MINUTES = 5
```

---

## License

MIT — see [LICENSE](LICENSE).
