from fastapi import APIRouter, HTTPException, Depends # manage components like database sessions
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.ext.asyncio import AsyncSession
from database import get_db
from crud import create_user, get_user_by_username, get_user_by_email, get_user_by_id, verify_password, delete_user_by_id
from schema import UserCreate, UserLogin, UserResponse
from auth import create_access_token, get_current_user
from model.User import User

router = APIRouter() # router instance


@router.post("/users/register", response_model=UserResponse) # FastAPI uses Pydantic to: Serialize response, Hide sensitive fields (like password), Just endpoint registration
async def register_user_endpoint(user_data: UserCreate, db: AsyncSession = Depends(get_db)): # db: Session = Depends(get_db): get_db is a function that creates a database session.Depends(get_db) tells FastAPI: "Give me a database session automatically when this endpoint is called."
    # bcrypt accepts at most 72 bytes for password input.
    if len(user_data.password.encode("utf-8")) > 72:
        raise HTTPException(status_code=400, detail="Password is too long (max 72 bytes)")
    existing_user = await get_user_by_username(db, user_data.username)
    if existing_user:
        raise HTTPException(status_code=400, detail="Username already exists")
    existing_email = await get_user_by_email(db, user_data.email)
    if existing_email:
        raise HTTPException(status_code=400, detail="Email already exists")
    db_user = await create_user(db, user_data.username, user_data.email, user_data.password)
    # user_response = UserResponse.from_orm(db_user)
    # print(user_response.json())
    return db_user

@router.post("/users/login")
async def login_user_endpoint(login_data: UserLogin, db: AsyncSession = Depends(get_db)):
    db_user = await get_user_by_username(db, login_data.username)  
    # user_response = UserResponse.from_orm(db_user)
    # print(user_response.json())
    if not db_user or not verify_password(login_data.password, db_user.password):
        raise HTTPException(status_code=401, detail="Invalid username or password")
    token = create_access_token(db_user.id)
    return {"message": "Login successful", "access_token": token, "token_type": "bearer"}

@router.post("/users/token")
async def token_user_endpoint(
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: AsyncSession = Depends(get_db),
):
    db_user = await get_user_by_username(db, form_data.username)
    if not db_user or not verify_password(form_data.password, db_user.password):
        raise HTTPException(status_code=401, detail="Invalid username or password")
    token = create_access_token(db_user.id)
    return {"access_token": token, "token_type": "bearer"}


@router.get("/users/me", response_model=UserResponse)
async def get_current_user_endpoint(current_user: User = Depends(get_current_user)):
    return current_user

@router.get("/users/{user_id}", response_model=UserResponse)
async def get_user_endpoint(
    user_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if current_user.id != user_id:
        raise HTTPException(status_code=403, detail="Access denied")
    db_user = await get_user_by_id(db, user_id)
    # user_response = UserResponse.from_orm(db_user)
    # print(user_response.json())
    if not db_user:
        raise HTTPException(status_code=404, detail="User not found")
    return db_user

@router.delete("/users/{user_id}")
async def delete_user_endpoint(
    user_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if current_user.id != user_id:
        raise HTTPException(status_code=403, detail="Access denied")
    db_user = await get_user_by_id(db, user_id)
    if not db_user:
        raise HTTPException(status_code=404, detail="User not found")
    await delete_user_by_id(db, user_id)
    return {"message": "User deleted successfully"}
