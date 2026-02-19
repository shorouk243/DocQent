from database import Base
from sqlalchemy import (Column, DateTime, ForeignKey, Integer,
                        UniqueConstraint)
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func


class Collaboration(Base):
	__tablename__ = "collaborations"
	__table_args__ = (UniqueConstraint("document_id", "user_id"),)

	id = Column(Integer, primary_key=True, index=True)
	document_id = Column(Integer, ForeignKey("documents.id"), nullable=False)
	user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
	created_at = Column(DateTime(timezone=True), server_default=func.now())

	document = relationship("Document", back_populates="collaborations") 
	user = relationship("User", back_populates="collaborations") 

