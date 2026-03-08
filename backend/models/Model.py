from enum import Enum
from typing import List, Optional
from pydantic import BaseModel, EmailStr, Field, SecretStr, field_validator
from beanie import Document, PydanticObjectId, before_event, Replace, Update
from datetime import datetime, timezone
from pymongo import IndexModel, ASCENDING, DESCENDING


def _utcnow() -> datetime:
    """Timezone-aware UTC now (replaces deprecated datetime.utcnow)."""
    return datetime.now(timezone.utc)


# MongoDB Documents

class Provider(str, Enum):
    local = "local"
    google = "google"


class User(Document):
    id: PydanticObjectId = Field(None, alias="_id")
    username: str
    email: EmailStr
    hashed_password: Optional[SecretStr] = None
    provider: Provider = Field(default=Provider.local)
    is_active: bool = True
    created_at: datetime = Field(default_factory=_utcnow)
    updated_at: datetime = Field(default_factory=_utcnow)

    @before_event([Replace, Update])
    def update_timestamp(self):
        self.updated_at = _utcnow()

    class Settings:
        name = "users"
        indexes = [
            IndexModel([("email", ASCENDING)], unique=True),
            IndexModel([("username", ASCENDING)], unique=True),
        ]


class Profile(Document):
    id: PydanticObjectId = Field(None, alias="_id")
    user_id: PydanticObjectId
    gender: Optional[str] = None
    age: Optional[int] = None
    country: Optional[str] = None
    bio: Optional[str] = None
    # stored in GridFS (fileid)
    profile_picture_url: Optional[PydanticObjectId] = None
    outfits: List[PydanticObjectId] = Field(default_factory=list)
    wardrobe_items: List[PydanticObjectId] = Field(default_factory=list)
    created_at: datetime = Field(default_factory=_utcnow)
    updated_at: datetime = Field(default_factory=_utcnow)

    @before_event([Replace, Update])
    def update_timestamp(self):
        self.updated_at = _utcnow()

    class Settings:
        name = "profiles"
        indexes = [
            # One profile per user; also the primary lookup key
            IndexModel([("user_id", ASCENDING)], unique=True),
        ]


# Outfit image will be stored in GridFS; the URL is stored here
class Outfit(Document):
    id: PydanticObjectId = Field(None, alias="_id")
    user_id: PydanticObjectId
    image_url: PydanticObjectId
    tags: List[str] = Field(default_factory=list)
    occasion: Optional[str] = None
    worn_count: int = 0
    last_worn: Optional[datetime] = None
    created_at: datetime = Field(default_factory=_utcnow)
    updated_at: datetime = Field(default_factory=_utcnow)

    class Settings:
        name = "outfits"
        indexes = [
            IndexModel([("user_id", ASCENDING)]),
            # Paginating a user's outfits by date is the most common query
            IndexModel([("user_id", ASCENDING), ("created_at", DESCENDING)]),
        ]


class StyleRecommendation(Document):
    id: PydanticObjectId = Field(None, alias="_id")
    user_id: PydanticObjectId
    outfit_ids: List[PydanticObjectId] = Field(default_factory=list)
    recommendation: str
    occasion: Optional[str] = None
    created_at: datetime = Field(default_factory=_utcnow)

    class Settings:
        name = "style_recommendations"
        indexes = [
            IndexModel([("user_id", ASCENDING)]),
            IndexModel([("user_id", ASCENDING), ("created_at", DESCENDING)]),
        ]


class WardrobeItem(Document):
    id: PydanticObjectId = Field(None, alias="_id")
    user_id: PydanticObjectId
    item_type: str
    color: str
    pattern: Optional[str] = None
    season: Optional[str] = None
    material: Optional[str] = None
    is_clean: bool = True
    worn_count: int = 0
    last_worn: Optional[datetime] = None
    created_at: datetime = Field(default_factory=_utcnow)
    updated_at: datetime = Field(default_factory=_utcnow)

    @before_event([Replace, Update])
    def update_timestamp(self):
        self.updated_at = _utcnow()

    class Settings:
        name = "wardrobe_items"
        indexes = [
            IndexModel([("user_id", ASCENDING)]),
            # Filtering by type/season/color within a user's wardrobe
            IndexModel([("user_id", ASCENDING), ("item_type", ASCENDING)]),
            IndexModel([("user_id", ASCENDING), ("season", ASCENDING)]),
            IndexModel([("user_id", ASCENDING), ("color", ASCENDING)]),
            # Clean-only outfit suggestions (high-frequency query)
            IndexModel([("user_id", ASCENDING), ("is_clean", ASCENDING)]),
        ]


# Request / Response schemas (Pydantic only – not stored in MongoDB)
class UserCreate(BaseModel):
    username: str
    email: EmailStr
    password: str

    # runs when a request hits "/ register" and ensures consistent formatting
    @field_validator('username', 'email')
    @classmethod
    def sanitize_and_lowercase(cls, value: str) -> str:
        return value.lower().strip()


class UserResponse(BaseModel):
    id: Optional[PydanticObjectId] = Field(None, alias="_id")
    username: str
    email: EmailStr
    is_active: bool
    created_at: datetime

    model_config = {"populate_by_name": True}
