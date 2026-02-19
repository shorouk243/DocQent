from typing import List

from auth import get_current_user
from crud import (check_document_access, create_document, delete_document,
                  update_document)
from database import get_db
from fastapi import APIRouter, Depends, HTTPException
from model.Collaboration import Collaboration
from model.Document import Document
from model.User import User
from schema import DocumentCreate, DocumentResponse, DocumentUpdate
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

router = APIRouter()

@router.get("/documents", response_model=List[DocumentResponse])
async def list_documents(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get all documents owned by or shared with a user."""
    result_owned = await db.execute(select(Document).where(Document.owner_id == current_user.id))
    owned_docs = result_owned.scalars().all()

    result_shared = await db.execute(
        select(Document).join(Collaboration).where(Collaboration.user_id == current_user.id)
    )
    shared_docs = result_shared.scalars().all()

    all_doc_ids = set()
    all_docs = []
    for doc in owned_docs + shared_docs:
        if doc.id not in all_doc_ids:
            all_doc_ids.add(doc.id)
            all_docs.append(doc)

    return all_docs

@router.post("/documents", response_model=DocumentResponse)
async def create_document_endpoint(
    document: DocumentCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    doc = await create_document(db, document.title, document.content, current_user.id)
    return doc

@router.get("/documents/{document_id}", response_model=DocumentResponse)
async def get_document_endpoint(
    document_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    doc = await check_document_access(db, document_id, current_user.id)
    if not doc:
        raise HTTPException(status_code=403, detail="You don't have access to this document")
    return doc

@router.put("/documents/{document_id}", response_model=DocumentResponse)
async def update_document_endpoint(
    document_id: int,
    update_request: DocumentUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    doc = await check_document_access(db, document_id, current_user.id)
    if not doc:
        raise HTTPException(status_code=403, detail="You don't have access to this document")
    updated = await update_document(db, document_id, update_request.title, update_request.content)
    return updated

@router.delete("/documents/{document_id}")
async def delete_document_endpoint(
    document_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    doc = await check_document_access(db, document_id, current_user.id)
    if not doc:
        raise HTTPException(status_code=403, detail="You don't have access to this document")
    if doc.owner_id != current_user.id:
        raise HTTPException(status_code=403, detail="Only the owner can delete this document")
    await delete_document(db, document_id)
    return {"message": "Document deleted"}
