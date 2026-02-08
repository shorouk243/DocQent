from pydantic import BaseModel # smart data container, When you create a class that inherits from BaseModel
from typing import Optional
from datetime import datetime

class UserCreate(BaseModel):
	username: str
	email: str
	password: str

class UserResponse(BaseModel):
	id: int
	username: str
	email: str
	created_at: datetime
	class Config:
		from_attributes = True

class UserLogin(BaseModel):
	username: str
	password: str

class DocumentCreate(BaseModel):
	title: str
	content: str
	owner_id: int

class DocumentUpdate(BaseModel):
	title: Optional[str] = None
	content: Optional[str] = None

class DocumentResponse(BaseModel):
	id: int
	title: str
	content: str
	owner_id: int
	created_at: datetime
	class Config:
		from_attributes = True

# Config is a special inner class in a Pydantic model
# It is used to configure how the model behaves
# Think of it as settings / rules for that Pydantic model

# It only tells Pydantic how to read and validate data

# SQLAlchemy
# ➡ returns Python objects

# Pydantic
# ➡ validates & serializes data
# ➡ prefers dicts
# ➡ BUT can read objects if from_attributes = True

# FastAPI
# ➡ uses Pydantic to convert output → JSON

# Serialization Convert to dict / JSON
# Deserialization Convert from dict / JSON