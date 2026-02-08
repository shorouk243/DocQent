from sqlalchemy.ext.asyncio import AsyncSession # All DB operations using this must be awaited.
from sqlalchemy import select
from typing import Optional
import hashlib, hmac 
from model.Document import Document
from model.Collaboration import Collaboration
from model.User import User

# ---------- PASSWORD ----------
def hash_password(password: str) -> str: # This is a return type hint
    return hashlib.sha256(password.encode()).hexdigest()

def verify_password(password: str, hashed: str) -> bool:
    return hmac.compare_digest(hash_password(password), hashed)

# ---------- USERS ----------
async def create_user(db: AsyncSession, username: str, email: str, password: str): 
    user = User(
        username=username,
        email=email,
        password=hash_password(password)
    ) # Create a User ORM object
      # Password is hashed before saving
      # No DB call yet — just Python object
    db.add(user)
    await db.commit()
    await db.refresh(user) # Now user.id exists (auto-generated)
    return user # Returns SQLAlchemy User object

async def get_user_by_username(db: AsyncSession, username: str) -> Optional[User]:
    result = await db.execute(select(User).where(User.username == username))
    return result.scalars().first()


async def get_user_by_id(db: AsyncSession, user_id: int) -> Optional[User]:
    result = await db.execute(select(User).where(User.id == user_id))
    return result.scalars().first()
    print(result)

async def get_user_by_email(db: AsyncSession, email: str) -> Optional[User]:
    result = await db.execute(select(User).where(User.email == email))
    return result.scalars().first()

async def delete_user_by_id(db: AsyncSession, user_id: int):
    user = await get_user_by_id(db, user_id)
    if user:
        await db.delete(user)
        await db.commit()

# ---------- DOCUMENTS ----------
async def create_document(db: AsyncSession, title: str, content: str, owner_id: int):
    doc = Document(title=title, content=content, owner_id=owner_id)
    db.add(doc)
    await db.commit()
    await db.refresh(doc)
    return doc

async def get_document(db: AsyncSession, document_id: int) -> Optional[Document]:
    result = await db.execute(select(Document).where(Document.id == document_id))
    return result.scalars().first()

async def update_document(db: AsyncSession, document_id: int, title=None, content=None):
    doc = await get_document(db, document_id)
    if not doc:
        return None
    if title is not None:
        doc.title = title
    if content is not None:
        doc.content = content
    await db.commit()
    await db.refresh(doc)
    return doc

async def delete_document(db: AsyncSession, document_id: int):
    doc = await get_document(db, document_id)
    if doc:
        await db.delete(doc)
        await db.commit()

# ---------- ACCESS ----------
async def check_document_access(db: AsyncSession, document_id: int, user_id: int) -> Optional[Document]:
    doc = await get_document(db, document_id)
    if not doc:
        return None
    if doc.owner_id == user_id:
        return doc
    result = await db.execute(
        select(Collaboration).where(
            Collaboration.document_id == document_id,
            Collaboration.user_id == user_id
        )
    )
    collab = result.scalars().first()
    return doc if collab else None
