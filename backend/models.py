from sqlalchemy import Column, Integer, String, DateTime, Text
from sqlalchemy.ext.declarative import declarative_base
from datetime import datetime

Base = declarative_base()

class ActiveUser(Base):
    __tablename__ = "active_users"
    id = Column(String, primary_key=True)  # room_nick
    nick = Column(String, nullable=False)
    room = Column(String, nullable=False)
    entered_at = Column(DateTime, default=datetime.utcnow)

class Message(Base):
    __tablename__ = "messages"
    id = Column(Integer, primary_key=True, autoincrement=True)
    text = Column(Text, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    user = Column(String, nullable=False)
    room = Column(String, nullable=False)

class RoomSession(Base):
    __tablename__ = "room_sessions"
    nick = Column(String, primary_key=True)
    room = Column(String, primary_key=True)
    last_exit = Column(DateTime, default=datetime.utcnow)