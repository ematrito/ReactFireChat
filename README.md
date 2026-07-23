# ReactFireChat — Ephemeral & Traceless

A no-leaks, no-tracks real-time chat. Rooms self-destruct 5 minutes after creation. Messages are encrypted end-to-end — the server never sees plaintext. No accounts, no logs, no cookies. Built for truly private, throwaway conversations.

**[Live Demo](https://malnutreetofirechat.duckdns.org)**

---

## Why Ephemeral & Traceless

| Layer | Protection |
|---|---|
| **Network** | HTTPS + WSS — messages encrypted in transit |
| **Application** | AES-256-GCM — messages encrypted in the browser, server stores only ciphertext |
| **Key delivery** | WSS only — AES key never touches HTTP response or nginx logs |
| **Database** | Zero plaintext — nicknames, room names, and message content are all opaque blobs |
| **Access** | One-time token URLs — no accounts, no email, no signup |
| **Rate limiting** | Hashed IPs — raw IPs never stored in memory |
| **Headers** | CSP, X-Content-Type-Options, X-Frame-Options, no-referrer |
| **Logging** | nginx access logs disabled — no connection records |
| **Retention** | 5-minute room lifetime — everything wiped on expiry, nothing persists |

- **Server sees nothing:** The encryption key lives in-memory on the server for 5 minutes, delivered once via WSS. All encryption/decryption happens in the browser.
- **DB dump = useless:** Every column is a SHA-256 hash or AES-GCM ciphertext. Even with full database access, there's nothing to read.
- **Room self-destruct is transparent:** A live countdown timer shows remaining life. When the room expires, all participants are notified.

---

## How it works

```
Creator opens site → enters room name + nickname → generates token URL + QR code
Creator shares URL with friends

Joiners open URL → enter nickname → join via token → receive AES key over WSS

All messages:
  SEND: browser encrypts → POST ciphertext → server stores + broadcasts
  RECV: server pushes ciphertext via WSS → browser decrypts

5 min from creation:
  → room token, AES key, messages, user data → all deleted
  → DB, memory, nothing recoverable
```

---

## Architecture

| Layer | Technology |
|---|---|
| Frontend | React 18, SCSS, Material UI |
| Backend | Python FastAPI, Uvicorn/Gunicorn |
| Real-time | Native WebSockets (server-to-client only) |
| Encryption | Web Crypto API — AES-256-GCM |
| Database | SQLite (ephemeral — schema is hash + ciphertext only) |
| Hosting | Oracle Cloud Always-Free (ARM, 4 OCPU, 24 GB RAM) |

### API Endpoints

| Method | Path | Body | Purpose |
|---|---|---|---|
| POST | `/create_room` | `{nick, room}` | Create room, returns token |
| POST | `/join` | `{nick, token}` | Join room via token (token in body, not URL) |
| GET | `/messages/{token_hash}` | — | Fetch message history (ciphertext only) |
| POST | `/messages` | `{ciphertext, token_hash}` | Send encrypted message |
| WS | `/ws/{token_hash}` | — | Real-time messages + key delivery |

---

## Features

- **End-to-end encrypted:** AES-256-GCM in the browser. Server stores and forwards ciphertext only.
- **Token-based rooms:** One-time shareable URL + QR code. No passwords.
- **Full DB opacity:** Nicknames, room names, messages — all encrypted or hashed. Nothing recoverable from the database file.
- **Real-time:** Instant message delivery via WebSockets.
- **5-minute lifetime:** Auto-expiry with countdown timer visible in the UI.
- **Graceful shutdown:** All participants notified when the room expires.
- **Room capacity:** Max 10 users per room.
- **Mobile-optimized:** Full-screen responsive design with sticky input.
- **Anti-spam:** Rate limiting (60 messages per 10 seconds) + input validation.
- **Automatic cleanup:** Background task clears expired rooms every 30 seconds.

---

## Tech Stack

### Frontend
- React 18, SCSS, Material-UI
- Web Crypto API (`crypto.subtle`) for AES-GCM
- `qrcode` for QR code generation
- WebSocket for real-time
- Create React App (Dockerized multi-stage build)

### Backend
- FastAPI (Python 3.11)
- Uvicorn + Gunicorn (`-w 1` for shared WebSocket state)
- SQLAlchemy ORM + SQLite
- In-memory token → room mapping (never touches disk)

---

## Configuration

| Env Variable | Default | Description |
|---|---|---|
| `DATABASE_URL` | `sqlite:///./chat.db` | Database connection string |
| `ALLOWED_ORIGINS` | `*` | CORS allowed origins |

Room lifetime is set in `backend/main.py`:

```python
ROOM_LIFETIME_MINUTES = 5
```

---

## DB Schema (opaque by design)

```
messages               active_users
├─ ciphertext (AES)    ├─ id (SHA-256)
├─ token_hash (SHA)    ├─ nick_hash (SHA-256)
├─ created_at          ├─ token_hash (SHA-256)
                       └─ entered_at
```

No columns contain human-readable nicknames, room names, or message content. Every column is either a cryptographic hash or an encrypted blob.

---

## License

MIT — see [LICENSE](LICENSE).
