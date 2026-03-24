from typing import List, Optional
from beanie import PydanticObjectId
from fastapi_cache.decorator import cache
from fastapi import APIRouter, HTTPException, Depends, status
from db.CRUD.users import get_user_by_id, update_user_profile
from models.Model import User, Profile
from routes.auth import get_current_user
from pydantic import BaseModel, Field


user_router = APIRouter(prefix="/user", tags=["user"])


class ProfileResponse(BaseModel):
    gender: Optional[str] = None
    age: Optional[int] = None
    country: Optional[str] = None
    bio: Optional[str] = None
    # Will convert PydanticObjectId to str
    profile_picture_url: Optional[str] = None
    style_preference: List[str] = []
    body_type: Optional[str] = None
    favorite_colors: List[str] = []
    fitness_level: Optional[str] = None

    class Config:
        from_attributes = True


class ProfileUpdate(BaseModel):
    gender: Optional[str] = None
    age: Optional[int] = None
    country: Optional[str] = None
    bio: Optional[str] = None
    style_preference: Optional[List[str]] = None
    body_type: Optional[str] = None
    favorite_colors: Optional[List[str]] = None
    fitness_level: Optional[str] = None


@user_router.get("/profile", response_model=ProfileResponse)
async def get_profile(user: User = Depends(get_current_user)):
    """Fetch the profile for the current user."""
    profile = await Profile.find_one(Profile.user_id == user.id)
    if not profile:
        # Return empty profile if none exists yet
        return ProfileResponse()

    # Convert profile_picture_url if it exists
    res = profile.model_dump()
    if profile.profile_picture_url:
        res["profile_picture_url"] = str(profile.profile_picture_url)

    return res


@user_router.put("/profile", response_model=ProfileResponse)
async def update_profile(
    body: ProfileUpdate,
    user: User = Depends(get_current_user)
):
    """Update or create the profile for the current user."""
    # Only update fields that were provided
    update_data = body.model_dump(exclude_unset=True)

    try:
        profile = await update_user_profile(user.id, update_data)

        res = profile.model_dump()
        if profile.profile_picture_url:
            res["profile_picture_url"] = str(profile.profile_picture_url)
        return res
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail=str(e))
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update profile"
        )
