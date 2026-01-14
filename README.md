## Real-Time Chat (React + FastAPI)

Lightweight real-time chat migrated from Firebase to a FastAPI + SQLite backend, containerized with Docker, and ready for Render deployment. Join any room with a nickname; messages sync live via WebSockets.

### Recent Updates
- **Security**: Fixed CVE-2024-24762 (python-multipart ReDoS vulnerability)
- **Dependencies**: Updated FastAPI, Starlette, SQLAlchemy, and other packages to latest secure versions
- **Docker**: Optimized Dockerfile configuration for production deployment

### What’s Included
- React frontend (built assets served by `serve` in the container)
- FastAPI backend with SQLAlchemy (SQLite local, Postgres in production)
- WebSocket messaging + REST for joins/sessions
- Security hardening: nickname/room validation, message length caps, rate limiting, CORS safeguards, stale session cleanup

### Live Demo
🚀 **[Try it now!](https://reactfirechat-fe.onrender.com)** 

**Note:** Best experience on desktop browsers. Mobile support is currently being investigated.

> ⚠️ Free tier services spin down after 15 minutes of inactivity. First load may take 30-50 seconds.

### Key Features
- **Real-time messaging** via WebSockets
- **Room-based chat** - create or join any room with a nickname
- **Anti-spam protection** - rate limiting (5 messages per 10 seconds)
- **Security** - input validation, message length limits, session management
- **No authentication required** - just pick a nickname and start chatting

### Technical Stack
- **Frontend**: React + Material-UI
- **Backend**: Python FastAPI + SQLAlchemy
- **Database**: PostgreSQL (production) / SQLite (local)
- **Real-time**: WebSocket server
- **Hosting**: Render.com (free tier)

### License
MIT - See LICENSE file for details.
