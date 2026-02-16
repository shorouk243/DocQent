from fastapi import APIRouter, HTTPException, Depends, WebSocket, WebSocketDisconnect
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from database import get_db
from crud import check_document_access, update_document
from model.Collaboration import Collaboration
from model.User import User
from auth import get_current_user, decode_access_token
import redis.asyncio as redis
import json
import asyncio

router = APIRouter()

REDIS_URL = "redis://localhost:6379"

async def get_redis():
    return redis.from_url(REDIS_URL, decode_responses=True)

# ---------- SHARE DOCUMENT ----------
@router.post("/collaboration/share")
async def share_document(
    document_id: int,
    collaborator_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    doc = await check_document_access(db, document_id, current_user.id)
    if not doc or doc.owner_id != current_user.id:
        raise HTTPException(status_code=403, detail="Only the owner can share this document.")

    # Prevent duplicate collaboration
    existing = await db.execute(
        select(Collaboration).where(
            (Collaboration.document_id == document_id) &
            (Collaboration.user_id == collaborator_id)
        )
    )
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="User is already a collaborator.")

    collab = Collaboration(document_id=document_id, user_id=collaborator_id)
    db.add(collab)
    await db.commit()
    await db.refresh(collab)
    return {"message": "Collaborator added", "collaborator_id": collaborator_id}

# ---------- REMOVE COLLABORATOR ----------
@router.delete("/collaboration/share")
async def remove_collaborator(
    document_id: int,
    collaborator_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    doc = await check_document_access(db, document_id, current_user.id)
    if not doc or doc.owner_id != current_user.id:
        raise HTTPException(status_code=403, detail="Only the owner can remove collaborators.")

    existing = await db.execute(
        select(Collaboration).where(
            (Collaboration.document_id == document_id) &
            (Collaboration.user_id == collaborator_id)
        )
    )
    collab = existing.scalar_one_or_none()
    if not collab:
        raise HTTPException(status_code=404, detail="Collaborator not found.")

    await db.delete(collab)
    await db.commit()
    return {"message": "Collaborator removed", "collaborator_id": collaborator_id}

# ---------- WEBSOCKET COLLABORATION ----------
@router.websocket("/ws/collaboration/{document_id}")
async def websocket_collaboration(websocket: WebSocket, document_id: int, db: AsyncSession = Depends(get_db)):
    try:
        token = websocket.query_params.get("token")
        if not token:
            await websocket.close(code=1008, reason="token is required")
            return
        user_id = decode_access_token(token)
    except (ValueError, TypeError):
        await websocket.close(code=1008, reason="Invalid token")
        return

    # Validate document and user access
    document = await check_document_access(db, document_id, user_id)
    if not document:
        await websocket.close(code=1008, reason="Access denied")
        return

    await websocket.accept()

    try:
        redis_client = await get_redis()
        print(f"Backend: Redis client created for document {document_id}, user {user_id}")
    except Exception as e:
        print(f"Backend: Failed to create Redis client: {e}")
        await websocket.close(code=1011, reason="Redis connection failed")
        return
    
    pubsub = redis_client.pubsub()
    channel_name = f"doc:{document_id}"
    try:
        await pubsub.subscribe(channel_name)
        print(f"Backend: Subscribed to Redis channel {channel_name} for document {document_id}, user {user_id}")
    except Exception as e:
        print(f"Backend: Failed to subscribe to Redis channel: {e}")
        await websocket.close(code=1011, reason="Redis subscription failed")
        return

    server_doc = document.content

    async def listen_to_websocket():
        nonlocal server_doc
        while True:
            msg = await websocket.receive_text()
            try:
                op = json.loads(msg)
                op["user_id"] = user_id
                print(f"Backend: Received operation from user {user_id}, op: {op.get('op')}")
            except json.JSONDecodeError:
                print(f"Backend: Failed to parse message: {msg}")
                continue

            # Apply operation
            if op["op"] == "insert":
                pos = op["position"]
                server_doc = server_doc[:pos] + op["text"] + server_doc[pos:]
            elif op["op"] == "delete":
                pos = op["position"]
                length = op.get("length", 1)
                server_doc = server_doc[:pos] + server_doc[pos + length:]
            elif op["op"] == "sync":
                # Full-document sync (JSON string) - full‑document snapshot
                server_doc = op.get("content", server_doc)
                # Persist latest snapshot to DB so refresh/logout keeps data
                try:
                    await update_document(db, document_id, content=server_doc)
                except Exception as e:
                    print(f"Failed to persist document {document_id}: {e}")

            # Broadcast to Redis
            print(f"Backend: Publishing to Redis channel {channel_name}, user_id: {op.get('user_id')}")
            try:
                subscribers = await redis_client.publish(channel_name, json.dumps(op))
                print(f"Backend: Published to Redis, {subscribers} subscribers received the message")
            except Exception as e:
                print(f"Backend: Failed to publish to Redis: {e}")

    async def listen_to_redis():
        try:
            async for message in pubsub.listen():
                if message and message['type'] == 'message':
                    try:
                        op_data = json.loads(message["data"])
                        print(f"Backend: Received from Redis, broadcasting to user {user_id}, op from user {op_data.get('user_id')}")
                    except Exception as e:
                        print(f"Backend: Failed to parse Redis message: {e}")
                    
                    try:
                        await websocket.send_text(message["data"])
                    except Exception as e:
                        print(f"Backend: Failed to send WebSocket message: {e}")
                        break
        except Exception as e:
            print(f"Backend: Redis listener error: {e}")

    try:
        await asyncio.gather(listen_to_websocket(), listen_to_redis())
    except WebSocketDisconnect:
        print(f"Client {user_id} disconnected from document {document_id}")
    except Exception as e:
        print(f"Collaboration error: {e}")
    finally:
        await pubsub.unsubscribe(channel_name)
        await pubsub.close()
        await redis_client.close()
