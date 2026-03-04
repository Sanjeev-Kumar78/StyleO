from motor.motor_asyncio import AsyncIOMotorClient as MongoClient
from beanie import init_beanie
from core.config import settings
from models import User, Profile, Outfit, WardrobeItem, StyleRecommendation

_client: MongoClient | None = None


async def init_db():
    global _client
    _client = MongoClient(settings.DATABASE_URL)
    db = _client["styleo_db"]
    await init_beanie(database=db, document_models=[User, Profile, Outfit, WardrobeItem, StyleRecommendation])
    print("Database initialized successfully")


async def close_db():
    global _client
    if _client is not None:
        _client.close()
        _client = None
    print("Database connection closed")
