from database import Base
from sqlalchemy import (Column, DateTime, ForeignKey, Integer, String, Text)
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func


class Document(Base):
	__tablename__ = "documents"

	id = Column(Integer, primary_key=True, index=True)
	title = Column(String(255), nullable=False)
	content = Column(Text, default="")
	owner_id = Column(Integer, ForeignKey("users.id"), nullable=False)
	created_at = Column(DateTime(timezone=True), server_default=func.now()) 


	owner = relationship("User", back_populates="documents")
	collaborations = relationship("Collaboration", back_populates="document", cascade="all, delete-orphan") # cascade="all, delete-orphan" is a SQLAlchemy relationship that allows us to delete the collaboration if the document is deleted

