from enum import Enum
from typing import List, Optional
from pydantic import BaseModel, EmailStr, Field, SecretStr, field_validator
from beanie import Document, PydanticObjectId, before_event, Replace, Update
from datetime import datetime, timezone, timedelta
from pymongo import IndexModel, ASCENDING, DESCENDING


def _utcnow() -> datetime:
    """Timezone-aware UTC now (replaces deprecated datetime.utcnow)."""
    return datetime.now(timezone.utc)


# MongoDB Documents

class Provider(str, Enum):
    local = "local"
    google = "google"


class ClothingCategory(str, Enum):
    topwear = "topwear"
    bottomwear = "bottomwear"
    fullbody = "fullbody"
    outerwear = "outerwear"
    activewear = "activewear"
    footwear = "footwear"
    accessory = "accessory"


class WardrobeIngestionMode(str, Enum):
    direct_item = "direct_item"
    outfit_photo = "outfit_photo"
    product_link = "product_link"


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
        use_cache = True
        cache_expiration_time = timedelta(seconds=60)
        cache_capacity = 100
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

    # AI Recommendation
    style_preference: List[str] = Field(
        default_factory=list)  # e.g., ["Minimalist", "Casual"]
    body_type: Optional[str] = None  # e.g., "Athletic", "Slim"
    favorite_colors: List[str] = Field(default_factory=list)
    fitness_level: Optional[str] = None  # For activewear suggestions

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


# # Outfit image will be stored in GridFS; the URL is stored here
# class Outfit(Document):
#     id: PydanticObjectId = Field(None, alias="_id")
#     user_id: PydanticObjectId
#     image_url: list[PydanticObjectId] = Field(default_factory=list)
#     tags: List[str] = Field(default_factory=list)
#     occasion: Optional[str] = None
#     worn_count: int = 0
#     last_worn: Optional[List[datetime]] = None
#     created_at: datetime = Field(default_factory=_utcnow)
#     updated_at: datetime = Field(default_factory=_utcnow)

#     class Settings:
#         name = "outfits"
#         indexes = [
#             IndexModel([("user_id", ASCENDING)]),
#             # Paginating a user's outfits by date is the most common query
#             # updated_at (descending can be performance heavy)
#             IndexModel([("user_id", ASCENDING), ("updated_at", DESCENDING)]),
#         ]


# class StyleRecommendation(Document):
#     id: PydanticObjectId = Field(None, alias="_id")
#     user_id: PydanticObjectId
#     outfit_ids: List[PydanticObjectId] = Field(default_factory=list)
#     recommendation: str
#     occasion: Optional[str] = None
#     created_at: datetime = Field(default_factory=_utcnow)

#     class Settings:
#         name = "style_recommendations"
#         indexes = [
#             IndexModel([("user_id", ASCENDING)]),
#             IndexModel([("user_id", ASCENDING), ("created_at", DESCENDING)]),
#         ]


# single clothing item in a user's wardrobe.  It includes metadata fields, references to images stored in GridFS, and fields for AI-generated content like embeddings and descriptions.
class WardrobeItem(Document):
    id: Optional[PydanticObjectId] = Field(None, alias="_id")
    user_id: PydanticObjectId
    ingestion_mode: WardrobeIngestionMode = Field(
        default=WardrobeIngestionMode.direct_item)

    # GridFS File References (Max 2 images)
    front_image_id: Optional[str] = None
    back_image_id: Optional[str] = None

    # Metadata
    category: Optional[ClothingCategory] = None
    item_type: Optional[str] = None
    color: Optional[str] = None
    pattern: Optional[str] = None
    season: Optional[str] = None
    material: Optional[str] = None

    # AI/ML Fields
    embedding: Optional[List[float]] = None
    ai_description: Optional[str] = Field(
        default=None,
        description="Detailed description generated upon upload containing design, size, type, color, and fitting attributes to be used by AI for outfit suggestions."
    )

    # State tracking
    is_clean: bool = True
    worn_count: int = 0
    last_worn: Optional[List[datetime]] = None
    created_at: datetime = Field(default_factory=_utcnow)
    updated_at: datetime = Field(default_factory=_utcnow)

    @before_event([Replace, Update])
    def update_timestamp(self):
        self.updated_at = _utcnow()

    class Settings:
        name = "wardrobe_items"
        indexes = [
            IndexModel([("user_id", ASCENDING)]),
            IndexModel([("user_id", ASCENDING), ("category", ASCENDING)]),
            IndexModel([("user_id", ASCENDING), ("item_type", ASCENDING)]),
            IndexModel([("user_id", ASCENDING), ("season", ASCENDING)]),
            IndexModel([("user_id", ASCENDING), ("color", ASCENDING)]),
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
    created_at: datetime

    model_config = {"populate_by_name": True}
