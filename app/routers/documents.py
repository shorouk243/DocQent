from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import List
from database import get_db
from crud import (
    create_document, get_document, update_document, delete_document, check_document_access
)
from schema import DocumentCreate, DocumentUpdate, DocumentResponse
from model.Document import Document
from model.Collaboration import Collaboration

router = APIRouter()

# -------------------- LIST DOCUMENTS --------------------
@router.get("/documents", response_model=List[DocumentResponse])
async def list_documents( user_id: int = Query(..., description="User ID to get documents for"), db: AsyncSession = Depends(get_db)):
    """Get all documents owned by or shared with a user."""
    # Get owned documents
    result_owned = await db.execute(select(Document).where(Document.owner_id == user_id))
    owned_docs = result_owned.scalars().all()

    # Get shared documents (via collaborations)
    result_shared = await db.execute(
        select(Document).join(Collaboration).where(Collaboration.user_id == user_id)
    )
    shared_docs = result_shared.scalars().all()

    # Combine and deduplicate
    all_doc_ids = set()
    all_docs = []
    for doc in owned_docs + shared_docs:
        if doc.id not in all_doc_ids:
            all_doc_ids.add(doc.id)
            all_docs.append(doc)

    return all_docs

# -------------------- CREATE DOCUMENT --------------------
@router.post("/documents", response_model=DocumentResponse)
async def create_document_endpoint(document: DocumentCreate, db: AsyncSession = Depends(get_db)):
    doc = await create_document(db, document.title, document.content, document.owner_id)
    return doc

# -------------------- GET DOCUMENT --------------------
@router.get("/documents/{document_id}", response_model=DocumentResponse)
async def get_document_endpoint(document_id: int, db: AsyncSession = Depends(get_db)):
    doc = await get_document(db, document_id)
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    return doc

# -------------------- UPDATE DOCUMENT --------------------
@router.put("/documents/{document_id}", response_model=DocumentResponse)
async def update_document_endpoint(
    document_id: int,
    update_request: DocumentUpdate,
    user_id: int = Query(..., description="Current user"),
    db: AsyncSession = Depends(get_db)
):
    doc = await check_document_access(db, document_id, user_id)
    if not doc:
        raise HTTPException(status_code=403, detail="You don't have access to this document")
    updated = await update_document(db, document_id, update_request.title, update_request.content)
    return updated

# -------------------- DELETE DOCUMENT --------------------
@router.delete("/documents/{document_id}")
async def delete_document_endpoint(
    document_id: int,
    user_id: int = Query(..., description="Current user"),
    db: AsyncSession = Depends(get_db)
):
    doc = await check_document_access(db, document_id, user_id)
    if not doc:
        raise HTTPException(status_code=403, detail="You don't have access to this document")
    await delete_document(db, document_id)
    return {"message": "Document deleted"}
