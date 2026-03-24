import json
import logging
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, status, Response
from pydantic import BaseModel, Field

from models.Model import Profile, User
from routes.auth import get_current_user
from services.image_service import fetch_image, delete_image
from db import setup_redis


logger = logging.getLogger(__name__)

profile_router = APIRouter(prefix="/profile", tags=["Profile"])

# Cache key template — we bust this whenever a profile is written
PROFILE_CACHE_KEY = "profile:{user_id}"
PROFILE_CACHE_TTL = 300  # 5 minutes


async def _bust_profile_cache(user_id: str) -> None:
    """Delete the user's cached profile so the next GET fetches fresh data."""
    client = setup_redis.redis_client
    if client is None:
        return
    try:
        cache_key = f"fastapi-cache:{PROFILE_CACHE_KEY.format(user_id=user_id)}"
        await client.delete(cache_key)
    except Exception as exc:
        logger.warning("Could not bust profile cache for %s: %s", user_id, exc)


# Pydantic schemas for profile read and write

class ProfileResponse(BaseModel):
    """What the frontend receives when reading a profile."""
    id: Optional[str] = None
    gender: Optional[str] = None
    age: Optional[int] = None
    country: Optional[str] = None
    bio: Optional[str] = None
    # avatar is served at /profile/avatar — we only expose the id so the client
    # can construct the URL itself (same pattern wardrobe uses for item images)
    avatar_url: Optional[str] = None
    style_preference: List[str] = Field(default_factory=list)
    body_type: Optional[str] = None
    favorite_colors: List[str] = Field(default_factory=list)
    fitness_level: Optional[str] = None
    # Tells the frontend whether the user has filled in the basics yet
    # If not, we show an onboarding prompt
    is_complete: bool = False

    model_config = {"populate_by_name": True}


class ProfileUpdateRequest(BaseModel):
    """All fields that can be changed via PUT /profile/."""
    gender: Optional[str] = None
    age: Optional[int] = None
    country: Optional[str] = None
    bio: Optional[str] = None
    style_preference: Optional[List[str]] = None
    body_type: Optional[str] = None
    favorite_colors: Optional[List[str]] = None
    fitness_level: Optional[str] = None


def _serialize_profile(profile: Profile, api_base: str = "") -> dict:
    """Turn a Profile document into the wire format the frontend expects."""
    avatar_url = None
    if profile.profile_picture_url:
        avatar_url = f"{api_base}/profile/avatar/{profile.profile_picture_url}"

    # A profile counts as "complete" once the user has set gender + at least one style preference
    is_complete = bool(profile.gender and profile.style_preference)

    return {
        "id": str(profile.id),
        "gender": profile.gender,
        "age": profile.age,
        "country": profile.country,
        "bio": profile.bio,
        "avatar_url": avatar_url,
        "style_preference": profile.style_preference,
        "body_type": profile.body_type,
        "favorite_colors": profile.favorite_colors,
        "fitness_level": profile.fitness_level,
        "is_complete": is_complete,
    }


async def _get_or_create_profile(user: User) -> Profile:
    """Fetch the user's profile, creating an empty one on first visit."""
    profile = await Profile.find_one(Profile.user_id == user.id)
    if profile is None:
        # First time hitting the profile endpoint — bootstrap an empty record
        profile = Profile(user_id=user.id)
        await profile.insert()
        logger.info("Created new profile for user %s", user.id)
    return profile


@profile_router.get("/", response_model=dict)
async def get_profile(current_user: User = Depends(get_current_user)):
    """Return the current user's profile. Creates it if it doesn't exist yet."""
    redis = setup_redis.redis_client
    cache_key = f"fastapi-cache:{PROFILE_CACHE_KEY.format(user_id=str(current_user.id))}"

    # Try to return a cached result first so we don't hit MongoDB every request
    if redis is not None:
        try:
            cached = await redis.get(cache_key)
            if cached:
                return json.loads(cached)
        except Exception as exc:
            logger.warning("Profile cache read failed for %s: %s",
                           current_user.id, exc)

    profile = await _get_or_create_profile(current_user)
    result = _serialize_profile(profile)

    # Warm the cache for next time
    if redis is not None:
        try:
            await redis.set(cache_key, json.dumps(result), ex=PROFILE_CACHE_TTL)
        except Exception as exc:
            logger.warning(
                "Profile cache write failed for %s: %s", current_user.id, exc)

    return result


@profile_router.put("/", response_model=dict)
async def update_profile(
    payload: ProfileUpdateRequest,
    current_user: User = Depends(get_current_user),
):
    """Update editable profile fields. Only provided fields are changed (PATCH semantics)."""
    profile = await _get_or_create_profile(current_user)

    update_data = payload.model_dump(exclude_none=True)
    if not update_data:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No fields provided to update.",
        )

    for field, value in update_data.items():
        setattr(profile, field, value)

    await profile.save()

    # Bust the cache so the next GET reflects the changes immediately
    await _bust_profile_cache(str(current_user.id))

    logger.info("Updated profile for user %s: %s",
                current_user.id, list(update_data.keys()))
    return _serialize_profile(profile)


@profile_router.post("/avatar", response_model=dict)
async def upload_avatar(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
):
    """
    Replace the user's avatar.

    Accepts JPEG, PNG, or WebP. The old image is deleted from GridFS before
    the new one is stored to avoid orphan files.
    """
    allowed_types = {"image/jpeg", "image/png", "image/webp"}
    if file.content_type not in allowed_types:
        raise HTTPException(
            status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
            detail="Avatar must be a JPEG, PNG, or WebP image.",
        )

    # Read the whole file into memory — avatars are small so this is fine
    image_bytes = await file.read()
    if len(image_bytes) > 5 * 1024 * 1024:  # 5 MB cap
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail="Avatar file must be smaller than 5 MB.",
        )

    profile = await _get_or_create_profile(current_user)

    from services.image_service import save_image

    # Delete the old avatar before storing the new one
    if profile.profile_picture_url:
        try:
            await delete_image(str(profile.profile_picture_url))
        except Exception as exc:
            logger.warning("Could not delete old avatar %s: %s",
                           profile.profile_picture_url, exc)

    file_id = await save_image(
        data=image_bytes,
        filename=f"avatar_{current_user.id}",
        content_type=file.content_type or "image/jpeg",
        metadata={"user_id": str(current_user.id), "purpose": "avatar"},
    )
    profile.profile_picture_url = file_id
    await profile.save()

    await _bust_profile_cache(str(current_user.id))

    return {"avatar_url": f"/profile/avatar/{file_id}"}


@profile_router.get("/avatar/{image_id}")
async def get_avatar(image_id: str):
    """Serve an avatar image from GridFS. No auth required — avatars are semi-public."""
    try:
        file_bytes, content_type = await fetch_image(image_id)
        return Response(content=file_bytes, media_type=content_type)
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Avatar not found.")
