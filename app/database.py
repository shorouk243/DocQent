import os

from dotenv import load_dotenv
from sqlalchemy import create_engine
from sqlalchemy.ext.asyncio import (AsyncSession, async_sessionmaker,
                                    create_async_engine)
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker

load_dotenv()

SQLALCHEMY_DATABASE_URL = os.environ.get("SQLALCHEMY_DATABASE_URL")

async_engine = create_async_engine(SQLALCHEMY_DATABASE_URL, echo=True) 

async_session = async_sessionmaker(async_engine, class_=AsyncSession, expire_on_commit=False) 


Base = declarative_base()


async def get_db(): 
    async with async_session() as session:
        yield session


