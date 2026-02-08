from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from dotenv import load_dotenv
import os

load_dotenv()

SQLALCHEMY_DATABASE_URL = os.environ.get("SQLALCHEMY_DATABASE_URL")

async_engine = create_async_engine(SQLALCHEMY_DATABASE_URL, echo=True) # This creates an async engine which is a connection between Python and MySQL

# What is an engine?
# Think of it like a “pipe” connecting Python → MySQL.
# SQLAlchemy uses this engine to:
# send SQL queries
# receive results
# manage connections
async_session = async_sessionmaker(async_engine, class_=AsyncSession, expire_on_commit=False) 
# This creates a session factory, expire_on_commit=False is a SQLAlchemy function that tells SQLAlchemy to not expire the session after the request is finished, so that we can use the session for other requests


Base = declarative_base()


async def get_db(): # genrator function which yields a database session for each request
    async with async_session() as session:
        yield session

# This is a FastAPI dependency, used in your endpoints.
# What does it do?
# It creates a database session
# Gives it to the endpoint
# After the request finishes → closes the session

# Why do we use yield?
# FastAPI dependency system works like this:
# Before endpoint → start DB session
# After endpoint → finish and close the session
# 1. Open DB connection
# 2. `yield db` → give DB to endpoint
# 3. Pause function
# 4. Endpoint runs
# 5. Request finishes
# 6. Resume generator
# 7. Close DB connection
