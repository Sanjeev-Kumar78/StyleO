from pymongo import AsyncMongoClient
from gridfs.asynchronous import AsyncGridFSBucket
from beanie import init_beanie
from core.config import settings
from models import User, Profile, Outfit, WardrobeItem, StyleRecommendation

_client: AsyncMongoClient | None = None
_fs: AsyncGridFSBucket | None = None


async def init_db():
    global _client, _fs
    _client = AsyncMongoClient(settings.DATABASE_URL)
    db = _client["styleo_db"]
    await init_beanie(database=db, document_models=[User, Profile, Outfit, WardrobeItem, StyleRecommendation])
    _fs = AsyncGridFSBucket(db, bucket_name="images")
    print("Database initialized successfully")


def get_gridfs() -> AsyncGridFSBucket:
    """Return the shared GridFS bucket. Must be called after init_db()."""
    if _fs is None:
        raise RuntimeError(
            "GridFS bucket is not initialised – call init_db() first.")
    return _fs


async def close_db():
    global _client, _fs
    if _client is not None:
        _client.close()
        _client = None
        _fs = None
    print("Database connection closed")
