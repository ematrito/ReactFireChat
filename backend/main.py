from fastapi import FastAPI, HTTPException, Depends, Request, WebSocket
from fastapi.middleware.cors import CORSMiddleware
from starlette.middleware.base import BaseHTTPMiddleware
from sqlalchemy.orm import Session
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from models import Base, ActiveUser, Message
from pydantic import BaseModel
from datetime import datetime, timedelta
from typing import List
import os
import re
import json
import asyncio
import secrets
import hashlib
import base64
from collections import defaultdict

ROOM_LIFETIME_MINUTES = 5

DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./chat.db")
engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base.metadata.create_all(bind=engine)

app = FastAPI()

allowed_origins_str = os.getenv("ALLOWED_ORIGINS", "")
allow_origins = [origin.strip() for origin in allowed_origins_str.split(",")]

app.add_middleware(
    CORSMiddleware,
    allow_origins=allow_origins,
    allow_credentials="*" not in allow_origins,
    allow_methods=["GET", "POST", "DELETE"],
    allow_headers=["*"],
    expose_headers=["*"],
)


class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request, call_next):
        response = await call_next(request)
        response.headers["Content-Security-Policy"] = (
            "default-src 'self'; style-src 'self' 'unsafe-inline'; "
            "img-src 'self' data:; connect-src 'self' ws: wss:;"
        )
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["Referrer-Policy"] = "no-referrer"
        return response


app.add_middleware(SecurityHeadersMiddleware)

message_timestamps = defaultdict(list)
room_tokens = {}
room_keys = {}


def hash_token(token):
    return hashlib.sha256(token.encode()).hexdigest()[:16]


def hash_nick(nick):
    return hashlib.sha256(nick.encode()).hexdigest()[:12]


def hash_user_id(token_hash, nick_hash):
    return hashlib.sha256(f"{token_hash}{nick_hash}".encode()).hexdigest()[:12]


def hash_ip(ip):
    return hashlib.sha256(ip.encode()).hexdigest()


@app.on_event("startup")
def startup():
    db = SessionLocal()
    try:
        users = db.query(ActiveUser).all()
        now = datetime.utcnow()
        for u in users:
            if u.token_hash not in room_tokens:
                room_tokens[u.token_hash] = {"room": "(rebuilt)", "created_at": now}
    finally:
        db.close()
    asyncio.create_task(scheduled_cleanup_loop())


def cleanup_old_rooms(db: Session):
    deleted = []
    try:
        now = datetime.utcnow()
        tokens_to_delete = []
        for token_hash, data in list(room_tokens.items()):
            if now - data["created_at"] > timedelta(minutes=ROOM_LIFETIME_MINUTES):
                tokens_to_delete.append(token_hash)
        for token_hash in tokens_to_delete:
            db.query(Message).filter(Message.token_hash == token_hash).delete()
            db.query(ActiveUser).filter(ActiveUser.token_hash == token_hash).delete()
            name = room_tokens[token_hash]["room"]
            del room_tokens[token_hash]
            room_keys.pop(token_hash, None)
            deleted.append((token_hash, name))
        db.commit()
    except Exception as e:
        print(f"[Cleanup] Error: {e}")
        db.rollback()
    return deleted


async def notify_and_disconnect_expired_rooms(deleted):
    for token_hash, _ in deleted:
        msg = json.dumps({"type": "room_expired"})
        dead = []
        for client in connected_clients.get(token_hash, []):
            try:
                await client.send_text(msg)
                await client.close()
            except Exception:
                pass
            dead.append(client)
        for d in dead:
            if d in connected_clients.get(token_hash, []):
                connected_clients[token_hash].remove(d)
        connected_clients.pop(token_hash, None)


async def scheduled_cleanup_loop():
    while True:
        try:
            await asyncio.sleep(30)
            db = SessionLocal()
            deleted = cleanup_old_rooms(db)
            db.close()
            if deleted:
                await notify_and_disconnect_expired_rooms(deleted)
        except Exception as e:
            pass


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


class CreateRoomRequest(BaseModel):
    nick: str
    room: str


class JoinRequest(BaseModel):
    nick: str
    token: str


class MessageRequest(BaseModel):
    ciphertext: str
    token_hash: str


def validate_nick_and_room(nick, room):
    nick = nick.strip()
    room = room.strip()
    if not nick or not room:
        raise HTTPException(status_code=400, detail="Nickname and room are required")
    if len(nick) > 50 or len(room) > 50:
        raise HTTPException(status_code=400, detail="Nickname/room too long")
    if not re.match(r"^[A-Za-z0-9_.-]+$", nick):
        raise HTTPException(status_code=400, detail="Nickname has invalid characters")
    if not re.match(r"^[A-Za-z0-9_.-]+$", room):
        raise HTTPException(status_code=400, detail="Room has invalid characters")
    return nick, room


@app.post("/create_room")
def create_room(req: CreateRoomRequest, db: Session = Depends(get_db)):
    nick, room = validate_nick_and_room(req.nick, req.room)
    token = secrets.token_urlsafe(16)
    token_hash = hash_token(token)
    key_b64 = base64.b64encode(secrets.token_bytes(32)).decode()

    room_tokens[token_hash] = {"room": room, "created_at": datetime.utcnow()}
    room_keys[token_hash] = key_b64

    nh = hash_nick(nick)
    uid = hash_user_id(token_hash, nh)
    db.add(ActiveUser(id=uid, nick_hash=nh, token_hash=token_hash))
    db.commit()

    return {
        "token": token,
        "token_hash": token_hash,
        "room": room,
        "room_expires_in_seconds": ROOM_LIFETIME_MINUTES * 60,
    }


@app.post("/join")
def join_room(req: JoinRequest, db: Session = Depends(get_db)):
    nick = req.nick.strip()
    if not nick or len(nick) > 50 or not re.match(r"^[A-Za-z0-9_.-]+$", nick):
        raise HTTPException(status_code=400, detail="Invalid nickname")

    token_hash = hash_token(req.token)
    if token_hash not in room_tokens:
        raise HTTPException(status_code=404, detail="Room not found or expired")

    nh = hash_nick(nick)
    uid = hash_user_id(token_hash, nh)
    if db.query(ActiveUser).filter(ActiveUser.id == uid).first():
        raise HTTPException(status_code=409, detail="Nickname already taken")

    if db.query(ActiveUser).filter(ActiveUser.token_hash == token_hash).count() >= 10:
        raise HTTPException(status_code=403, detail="Room is full (max 10)")

    db.add(ActiveUser(id=uid, nick_hash=nh, token_hash=token_hash))
    db.commit()

    room_name = room_tokens[token_hash]["room"]
    remaining = max(0, ROOM_LIFETIME_MINUTES * 60 - int(
        (datetime.utcnow() - room_tokens[token_hash]["created_at"]).total_seconds()
    ))

    return {
        "token_hash": token_hash,
        "room": room_name,
        "room_expires_in_seconds": remaining,
    }


@app.get("/messages/{token_hash}")
def get_messages(token_hash: str, db: Session = Depends(get_db)):
    if token_hash not in room_tokens:
        return []
    cleanup_old_rooms(db)
    msgs = db.query(Message).filter(Message.token_hash == token_hash).order_by(Message.created_at).all()
    return [{"id": m.id, "ciphertext": m.ciphertext, "created_at": m.created_at.isoformat(), "token_hash": m.token_hash} for m in msgs]


@app.post("/messages")
async def create_message(msg: MessageRequest, request: Request, db: Session = Depends(get_db)):
    if msg.token_hash not in room_tokens:
        raise HTTPException(status_code=404, detail="Room not found or expired")

    deleted_rooms = cleanup_old_rooms(db)

    if len(msg.ciphertext) > 10000:
        raise HTTPException(status_code=400, detail="Message too long")

    ip_hash = hash_ip(request.client.host)
    now = datetime.utcnow()
    message_timestamps[ip_hash] = [
        ts for ts in message_timestamps[ip_hash] if now - ts < timedelta(seconds=10)
    ]
    if len(message_timestamps[ip_hash]) >= 60:
        raise HTTPException(status_code=429, detail="Too many messages. Slow down.")
    message_timestamps[ip_hash].append(now)

    from starlette.concurrency import run_in_threadpool
    db_msg = await run_in_threadpool(lambda: Message(ciphertext=msg.ciphertext, token_hash=msg.token_hash))
    await run_in_threadpool(db.add, db_msg)
    await run_in_threadpool(db.commit)
    await run_in_threadpool(db.refresh, db_msg)

    msg_data = {
        "type": "message",
        "id": db_msg.id,
        "ciphertext": db_msg.ciphertext,
        "created_at": db_msg.created_at.isoformat(),
    }

    dead = []
    for client in connected_clients.get(msg.token_hash, []):
        try:
            await client.send_text(json.dumps(msg_data))
        except Exception:
            dead.append(client)
    for d in dead:
        clients = connected_clients.get(msg.token_hash, [])
        if d in clients:
            clients.remove(d)

    if deleted_rooms:
        await notify_and_disconnect_expired_rooms(deleted_rooms)

    return msg_data


connected_clients = {}


@app.websocket("/ws/{token_hash}")
async def websocket_endpoint(websocket: WebSocket, token_hash: str):
    await websocket.accept()

    if token_hash not in room_tokens:
        await websocket.close(code=1008, reason="Room not found or expired")
        return

    key = room_keys.get(token_hash)
    if key:
        await websocket.send_text(json.dumps({"type": "room_key", "key": key}))

    if token_hash not in connected_clients:
        connected_clients[token_hash] = []
    connected_clients[token_hash].append(websocket)

    try:
        while True:
            await websocket.receive_text()
    except Exception:
        pass
    finally:
        clients = connected_clients.get(token_hash, [])
        if websocket in clients:
            clients.remove(websocket)
        if not clients:
            connected_clients.pop(token_hash, None)


@app.post("/cleanup")
def manual_cleanup(db: Session = Depends(get_db)):
    deleted = cleanup_old_rooms(db)
    return {"deleted_rooms": len(deleted)}


@app.get("/health")
def health():
    return {"status": "ok", "rooms": len(room_tokens)}
