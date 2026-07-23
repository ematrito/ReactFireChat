from fastapi import FastAPI, HTTPException, Depends, Request
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from models import Base, ActiveUser, Message, RoomSession
from pydantic import BaseModel
from datetime import datetime
from typing import List
import os
import re
import json
import asyncio
from collections import defaultdict
from datetime import datetime, timedelta
from fastapi import WebSocket
from fastapi.responses import HTMLResponse

ROOM_LIFETIME_MINUTES = 5
COOLDOWN_MINUTES = 5

DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./chat.db")

engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base.metadata.create_all(bind=engine)

app = FastAPI()

allowed_origins_str = os.getenv("ALLOWED_ORIGINS", "*")
allow_origins = [origin.strip() for origin in allowed_origins_str.split(",")]

# Can't use credentials with wildcard origin
allow_credentials = "*" not in allow_origins

app.add_middleware(
    CORSMiddleware,
    allow_origins=allow_origins,
    allow_credentials=allow_credentials,
    allow_methods=["GET", "POST", "DELETE"],
    allow_headers=["*"],
    expose_headers=["*"],
)

message_timestamps = defaultdict(list)
room_created_at = {}  # Track when each room was created

# On every server restart, reads active users from DB to repopulate room_created_at — so room expiry cleanup keeps working after Render spins the service back up.
@app.on_event("startup")
def startup_rebuild_room_state():
    db = SessionLocal()
    try:
        users = db.query(ActiveUser).all()
        for user in users:
            if user.room not in room_created_at:
                room_created_at[user.room] = user.entered_at
        print(f"[Startup] Rebuilt room state: {list(room_created_at.keys())}")
    finally:
        db.close()
    asyncio.create_task(scheduled_cleanup_loop())


def cleanup_old_rooms(db: Session):
    """Delete rooms that have existed for more than ROOM_LIFETIME_MINUTES.
    Returns list of rooms that were deleted so callers can notify WebSocket clients."""
    deleted = []
    try:
        now = datetime.utcnow()
        rooms_to_delete = []

        for room, created_time in list(room_created_at.items()):
            if now - created_time > timedelta(minutes=ROOM_LIFETIME_MINUTES):
                rooms_to_delete.append(room)

        for room in rooms_to_delete:
            db.query(Message).filter(Message.room == room).delete()
            db.query(ActiveUser).filter(ActiveUser.room == room).delete()
            db.query(RoomSession).filter(RoomSession.room == room).delete()

            del room_created_at[room]
            deleted.append(room)

            print(f"[Cleanup] Deleted room '{room}' ({ROOM_LIFETIME_MINUTES} min lifecycle expired)")

        db.commit()
    except Exception as e:
        print(f"[Cleanup] Error: {e}")
        db.rollback()
    return deleted

async def notify_and_disconnect_expired_rooms(deleted_rooms: List[str]):
    """Broadcast room expiry and close WebSocket connections for deleted rooms."""
    for room in deleted_rooms:
        msg = json.dumps({"type": "room_expired", "message": f"This room has been closed after {ROOM_LIFETIME_MINUTES} minutes of inactivity.", "room": room})
        dead = []
        for client in connected_clients.get(room, []):
            try:
                await client.send_text(msg)
                await client.close()
            except Exception:
                pass
            dead.append(client)
        for d in dead:
            if d in connected_clients.get(room, []):
                connected_clients[room].remove(d)
        if room in connected_clients and not connected_clients[room]:
            del connected_clients[room]


async def scheduled_cleanup_loop():
    """Background task that periodically cleans up expired rooms and notifies clients."""
    while True:
        try:
            await asyncio.sleep(30)
            db = SessionLocal()
            deleted = cleanup_old_rooms(db)
            db.close()
            if deleted:
                await notify_and_disconnect_expired_rooms(deleted)
        except Exception as e:
            print(f"[ScheduledCleanup] Error: {e}")


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

class UserCreate(BaseModel):
    nick: str
    room: str

class MessageCreate(BaseModel):
    text: str
    user: str
    room: str

class SessionCreate(BaseModel):
    nick: str
    room: str

# Validation helpers
def validate_nick_and_room(nick: str, room: str):
    nick = nick.strip()
    room = room.strip()

    if not nick or not room:
        raise HTTPException(status_code=400, detail="Nickname and room are required")

    if len(nick) > 50 or len(room) > 50:
        raise HTTPException(status_code=400, detail="Nickname/room too long (max 50 characters)")

    pattern = re.compile(r"^[A-Za-z0-9_.-]+$")
    if not pattern.match(nick):
        raise HTTPException(status_code=400, detail="Nickname has invalid characters (use letters, numbers, _ . -)")
    if not pattern.match(room):
        raise HTTPException(status_code=400, detail="Room has invalid characters (use letters, numbers, _ . -)")

    return nick, room

# Active Users
@app.get("/active_users/{room}/{nick}")
def check_user(room: str, nick: str, db: Session = Depends(get_db)):
    user_id = f"{room}_{nick}"
    user = db.query(ActiveUser).filter(ActiveUser.id == user_id).first()
    if user:
        # Check if entered_at is more than 1 hour ago, if so, consider inactive and delete
        if datetime.utcnow() - user.entered_at > timedelta(hours=1):
            db.delete(user)
            db.commit()
            return {"exists": False}
        return {"exists": True}
    return {"exists": False}

@app.post("/active_users")
def create_user(user: UserCreate, db: Session = Depends(get_db)):
    nick, room = validate_nick_and_room(user.nick, user.room)


    session_entry = db.query(RoomSession).filter(RoomSession.nick == nick, RoomSession.room == room).first()
    if session_entry and session_entry.last_exit:
         minutes_since_exit = (datetime.utcnow() - session_entry.last_exit).total_seconds() / 60
         if minutes_since_exit < COOLDOWN_MINUTES:
             wait_time = int(COOLDOWN_MINUTES - minutes_since_exit)
             raise HTTPException(status_code=429, detail=f"Nickname cooldown active. Wait {wait_time}m.")

    # 2. Check Duplicates
    user_id = f"{room}_{nick}"
    existing = db.query(ActiveUser).filter(ActiveUser.id == user_id).first()
    if existing:
        if datetime.utcnow() - existing.entered_at > timedelta(hours=1):
            db.delete(existing)
            db.commit()
        else:
            raise HTTPException(status_code=409, detail=f"Nickname '{nick}' is already taken in this room")

    # 3. Check Room Capacity (max 10 users)
    room_user_count = db.query(ActiveUser).filter(ActiveUser.room == room).count()
    if room_user_count >= 10:
        raise HTTPException(status_code=403, detail="Room is full (max 10 users)")

    # 4. Track room creation on first user join
    if room not in room_created_at:
        room_created_at[room] = datetime.utcnow()
        print(f"[Room Created] '{room}' - will expire in {ROOM_LIFETIME_MINUTES} minutes")

    # 5. Create User
    db_user = ActiveUser(id=user_id, nick=nick, room=room)
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    room_created = room_created_at.get(room, datetime.utcnow())
    expires_in_seconds = max(0, int((room_created + timedelta(minutes=ROOM_LIFETIME_MINUTES) - datetime.utcnow()).total_seconds()))
    return {
        "id": db_user.id,
        "nick": db_user.nick,
        "room": db_user.room,
        "entered_at": db_user.entered_at.isoformat(),
        "room_expires_in_seconds": expires_in_seconds
    }

@app.delete("/active_users/{room}/{nick}")
def delete_user(room: str, nick: str, db: Session = Depends(get_db)):
    user_id = f"{room}_{nick}"
    user = db.query(ActiveUser).filter(ActiveUser.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    db.delete(user)
    db.commit()
    return {"message": "User deleted"}

# Messages
@app.get("/messages/{room}")
def get_messages(room: str, db: Session = Depends(get_db)):
    cleanup_old_rooms(db)
    messages = db.query(Message).filter(Message.room == room).order_by(Message.created_at).all()
    return [{"id": m.id, "text": m.text, "created_at": m.created_at.isoformat(), "user": m.user, "room": m.room} for m in messages]

@app.post("/messages")
async def create_message(message: MessageCreate, request: Request,db: Session = Depends(get_db)):
    deleted_rooms = cleanup_old_rooms(db)

    if len(message.text) > 2000:
        raise HTTPException(status_code=400, detail="Message too long (max 2000 characters)")

    if len(message.text.strip()) == 0:
        raise HTTPException(status_code=400, detail="Message cannot be empty")

    client_ip = request.client.host
    now = datetime.utcnow()

    message_timestamps[client_ip] = [
        ts for ts in message_timestamps[client_ip]
         if now - ts < timedelta(seconds=10)
    ]  

    if len(message_timestamps[client_ip]) >= 60:
        raise HTTPException(status_code=429, detail="Too many messages sent. Please slow down.")
    
    message_timestamps[client_ip].append(now)
    
    from starlette.concurrency import run_in_threadpool
    db_message = await run_in_threadpool(lambda: Message(text=message.text, user=message.user, room=message.room))
    await run_in_threadpool(db.add, db_message)
    await run_in_threadpool(db.commit)
    await run_in_threadpool(db.refresh, db_message)
    # Broadcast to WebSocket clients
    msg_data = {"id": db_message.id, "text": db_message.text, "created_at": db_message.created_at.isoformat(), "user": db_message.user, "room": db_message.room}
    print(f"Broadcasting message to room {message.room}: {msg_data}")
    
    dead = []
    for client in connected_clients.get(message.room, []):
        try: 
            print(f"Sending to client in room {message.room}")
            await client.send_text(json.dumps(msg_data))
        except Exception as e:
            print(f"Error sending to client in room {message.room}: {e}")
            dead.append(client)

    for client in dead:
        if client in connected_clients.get(message.room, []):
            connected_clients[message.room].remove(client)

    if deleted_rooms:
        await notify_and_disconnect_expired_rooms(deleted_rooms)

    return msg_data

# Room Sessions
@app.get("/room_sessions/{nick}/{room}")
def get_session(nick: str, room: str, db: Session = Depends(get_db)):
    session = db.query(RoomSession).filter(RoomSession.nick == nick, RoomSession.room == room).first()
    if session:
        return {"last_exit": session.last_exit.isoformat()}
    return {"last_exit": None}

@app.post("/room_sessions")
def create_session(session: SessionCreate, db: Session = Depends(get_db)):
    db_session = db.query(RoomSession).filter(RoomSession.nick == session.nick, RoomSession.room == session.room).first()
    if db_session:
        db_session.last_exit = datetime.utcnow()
    else:
        db_session = RoomSession(nick=session.nick, room=session.room, last_exit=datetime.utcnow())
        db.add(db_session)
    db.commit()
    return {"nick": db_session.nick, "room": db_session.room, "last_exit": db_session.last_exit.isoformat()}

# Database maintenance
@app.post("/cleanup")
def cleanup_old_data(db: Session = Depends(get_db)):
    """Delete old data to prevent unbounded DB growth."""
    try:
        # Delete room_sessions older than 7 days
        cutoff = datetime.utcnow() - timedelta(days=7)
        deleted_sessions = db.query(RoomSession).filter(RoomSession.last_exit < cutoff).delete()
        db.commit()
        print(f"Deleted {deleted_sessions} old room sessions")
        
        # Keep only last 1000 messages per room
        rooms = db.query(Message.room).distinct()
        deleted_messages = 0
        for (room,) in rooms:
            # Get message count in this room
            count = db.query(Message).filter(Message.room == room).count()
            if count > 1000:
                # Delete messages beyond the first 1000
                to_delete = db.query(Message).filter(Message.room == room).order_by(Message.id.desc()).offset(1000).all()
                for msg in to_delete:
                    db.delete(msg)
                deleted_messages += len(to_delete)
        
        db.commit()
        print(f"Deleted {deleted_messages} old messages")
        return {"status": "cleanup done", "deleted_sessions": deleted_sessions, "deleted_messages": deleted_messages}
    except Exception as e:
        print(f"Cleanup error: {e}")
        raise HTTPException(status_code=500, detail="Cleanup failed")

# WebSocket for real-time
connected_clients = {}

@app.websocket("/ws/{room}")
async def websocket_endpoint(websocket: WebSocket, room: str, db: Session = Depends(get_db)):
    await websocket.accept()
    print(f"WebSocket accepted for room {room}")
    if room not in connected_clients:
        connected_clients[room] = []
    connected_clients[room].append(websocket)
    print(f"Clients in room {room}: {len(connected_clients[room])}")
    try:
        while True:
            data = await websocket.receive_text()
            # Broadcast to all in room
            for client in connected_clients.get(room, []):
                await client.send_text(data)
    except Exception as e:
        print(f"WebSocket error: {e}")
    finally:
        connected_clients[room].remove(websocket)
        print(f"WebSocket disconnected for room {room}")