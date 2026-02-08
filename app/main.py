from fastapi import FastAPI # This class is the core component that provides all the functionality for your web application, including routing, handling requests, and generating documentation.
from fastapi.middleware.cors import CORSMiddleware
from database import async_engine, Base, create_async_engine
from routers import users, documents, collaboration
from routers import ai

app = FastAPI()

# Add CORS middleware to allow frontend requests
app.add_middleware(
    CORSMiddleware, # Cross-Origin Resource Sharing (CORS) middleware to allow requests from other domains
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000", "http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("startup")
async def on_startup():
    async with async_engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

app.include_router(users.router) # Include the users router
app.include_router(documents.router) # Include the documents router
app.include_router(collaboration.router) # Include the collaboration router
app.include_router(ai.router, prefix="/ai", tags=["ai"])


# Example:
# - Frontend: http://localhost:3000
# - Backend: http://localhost:8000

# ❌ Different ports → different origins
# ❌ Browser blocks request by default
