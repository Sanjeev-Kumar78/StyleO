from redis import asyncio as aioredis
from core.config import settings

redis_client: aioredis.Redis | None = None


async def init_redis():
    """Initialize Redis connection pool on startup."""
    global redis_client
    redis_client = await aioredis.from_url(
        settings.REDIS_DB_URL,
        # Do NOT set decode_responses=True — fastapi-cache2 needs raw bytes
        max_connections=50,
        socket_keepalive=True,
    )
    print("Redis connected successfully")
    return redis_client


async def close_redis():
    """Close Redis connection pool on shutdown."""
    global redis_client
    if redis_client:
        await redis_client.close()
        print("Redis connection closed")
