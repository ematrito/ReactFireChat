## Real-Time Chat (React + FastAPI)

Lightweight real-time chat migrated from Firebase to a FastAPI + SQLite backend, containerized with Docker, and ready for Render deployment. Join any room with a nickname; messages sync live via WebSockets.

### What’s Included
- React frontend (built assets served by `serve` in the container)
- FastAPI backend with SQLAlchemy (SQLite local, Postgres in production)
- WebSocket messaging + REST for joins/sessions
- Security hardening: nickname/room validation, message length caps, rate limiting, CORS safeguards, stale session cleanup

### Try It (Render demo)
- Frontend (share this link): **<your-frontend-URL>**
- Backend (API): hidden behind the frontend; CORS allows the frontend origin

To deploy your own on Render:
1) Create a Web Service for the backend (gunicorn + uvicorn worker) using `render.yaml` or manual setup.
	- Env: `DATABASE_URL` (Render Postgres), `ALLOWED_ORIGINS=<your-frontend-URL>`
2) Deploy the frontend as a Static Site or via the provided Dockerfile.
	- Build env: `REACT_APP_API_BASE=<your-backend-URL>` so the bundle calls your API.

### Quick Run (Docker)
```bash
docker compose up --build
```
- Frontend: http://localhost:3002
- Backend API docs: http://localhost:8080/docs
- Multi-device LAN: share `http://<your-lan-ip>:3002`; backend listens on 8080.

### Refactors vs Firebase version
- Swapped Firestore for FastAPI + SQLAlchemy (SQLite local, Postgres in prod)
- Real-time via WebSocket server instead of Firestore listeners
- Server-side validation: nickname/room regex + length caps, 2000-char message cap
- Abuse controls: 5 msgs / 10s rate limiting, cooldown tracking in room sessions
- CORS hardening: credentials disabled when origins contain `*`, explicit allowed origins for prod
- DB hygiene: stale session cleanup and message retention cap per room

### Local Dev (without Docker)
- Backend: `cd backend && python3 -m venv venv && source venv/bin/activate && pip install -r requirements.txt && uvicorn main:app --reload`
- Frontend: `npm install && npm start` (expects backend at http://localhost:8080)

### API (short list)
- `GET /messages/{room}` — fetch room messages
- `POST /messages` — send a message (validated + rate limited)
- `GET /active_users/{room}/{nick}` — nickname availability
- `POST /active_users` / `DELETE /active_users/{room}/{nick}` — join/leave
- `GET /room_sessions/{nick}/{room}` / `POST /room_sessions` — cooldown tracking
- `WebSocket /ws/{room}` — live message stream

### Why the Firebase Migration
- Avoid vendor lock-in and unexpected costs
- Direct WebSocket control and server-side validation
- Runs anywhere: Docker locally, Render in prod

### Contributing
PRs and issues are welcome. MIT licensed.
