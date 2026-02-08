from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, UniqueConstraint
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from database import Base

class Collaboration(Base):
	__tablename__ = "collaborations"
	__table_args__ = (UniqueConstraint("document_id", "user_id"),)

	id = Column(Integer, primary_key=True, index=True)
	document_id = Column(Integer, ForeignKey("documents.id"), nullable=False)
	user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
	created_at = Column(DateTime(timezone=True), server_default=func.now())

	document = relationship("Document", back_populates="collaborations") # back_populates is a SQLAlchemy relationship that allows us to access the document from the collaboration and vice versa
	user = relationship("User", back_populates="collaborations") # back_populates is a SQLAlchemy relationship that allows us to access the user from the collaboration and vice versa, If you change the relationship on one side, SQLAlchemy updates the other side automatically in memory.


# ORM relationships
# They are NOT database columns
# They exist to make querying and navigation easy in Python