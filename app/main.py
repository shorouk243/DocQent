from database import Base, async_engine, create_async_engine
from fastapi import \
    FastAPI  # This class is the core component that provides all the functionality for your web application, including routing, handling requests, and generating documentation.
from fastapi.middleware.cors import CORSMiddleware
from routers import ai, collaboration, documents, users

app = FastAPI()

app.add_middleware(
    CORSMiddleware, 
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000", "http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("startup")
async def on_startup():
    async with async_engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

app.include_router(users.router) 
app.include_router(documents.router) 
app.include_router(collaboration.router)
app.include_router(ai.router, prefix="/ai", tags=["ai"])



