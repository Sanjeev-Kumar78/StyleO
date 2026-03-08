from fastapi_cache.decorator import cache
from fastapi import APIRouter, HTTPException, Depends
from db.CRUD import create_user, is_email_taken, is_username_taken, get_user_by_email, get_user_by_username, get_user_by_id, update_user_profile
from pydantic import BaseModel


user_router = APIRouter(prefix="/user", tags=["user"])
