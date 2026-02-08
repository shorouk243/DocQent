from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey, UniqueConstraint
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from database import Base

class Document(Base):
	__tablename__ = "documents"

	id = Column(Integer, primary_key=True, index=True)
	title = Column(String(255), nullable=False)
	content = Column(Text, default="")
	owner_id = Column(Integer, ForeignKey("users.id"), nullable=False)
	created_at = Column(DateTime(timezone=True), server_default=func.now()) 

	# server_default=func.now() is a SQLAlchemy function that sets the default value of the created_at column to the current timestamp
	# default=func.now(): Python (SQLAlchemy)
	# server_default=func.now(): Database (MySQL/Postgres/etc.)
	# Time comes from DB server (single source of truth)

	owner = relationship("User", back_populates="documents")
	collaborations = relationship("Collaboration", back_populates="document", cascade="all, delete-orphan") # cascade="all, delete-orphan" is a SQLAlchemy relationship that allows us to delete the collaboration if the document is deleted

