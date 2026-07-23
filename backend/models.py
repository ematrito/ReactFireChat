from sqlalchemy import Column, Integer, String, DateTime, Text
from sqlalchemy.ext.declarative import declarative_base
from datetime import datetime

Base = declarative_base()

class ActiveUser(Base):
    __tablename__ = "active_users"
    id = Column(String(32), primary_key=True)
    nick_hash = Column(String(32), nullable=False)
    token_hash = Column(String(64), nullable=False, index=True)
    entered_at = Column(DateTime, default=datetime.utcnow)

class Message(Base):
    __tablename__ = "messages"
    id = Column(Integer, primary_key=True, autoincrement=True)
    ciphertext = Column(Text, nullable=False)
    token_hash = Column(String(64), nullable=False, index=True)
    created_at = Column(DateTime, default=datetime.utcnow)
