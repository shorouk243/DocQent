from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey, UniqueConstraint
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from database import Base

class User(Base):
	__tablename__ = "users"

	id = Column(Integer, primary_key=True, index=True)
	username = Column(String(255), unique=True, nullable=False, index=True)
	email = Column(String(255), unique=True, nullable=False, index=True)
	password = Column(String(255), nullable=False)
	created_at = Column(DateTime(timezone=True), server_default=func.now())
	documents = relationship("Document", back_populates="owner", cascade="all, delete-orphan")
	collaborations = relationship("Collaboration", back_populates="user", cascade="all, delete-orphan")

