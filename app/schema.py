from datetime import datetime
from typing import Optional

from pydantic import BaseModel


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