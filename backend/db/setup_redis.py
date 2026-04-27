from redis import asyncio as aioredis
from core.config import settings
import asyncio
import logging

logger = logging.getLogger(__name__)

redis_client: aioredis.Redis | None = None


async def init_redis(max_retries: int = 5, initial_delay: float = 1.0):
    """Initialize Redis connection pool on startup with retry logic."""
    global redis_client

    for attempt in range(max_retries):
        try:
            redis_client = await aioredis.from_url(
                settings.REDIS_DB_URL,
                # Do NOT set decode_responses=True — fastapi-cache2 needs raw bytes
                max_connections=50,
                socket_keepalive=True,
                socket_connect_timeout=5,  # 5s timeout for socket connection
            )
            # Test the connection
            await redis_client.ping()
            logger.info("✓ Redis connected successfully")
            return redis_client
        except Exception as e:
            if attempt < max_retries - 1:
                delay = initial_delay * (2 ** attempt)  # Exponential backoff
                logger.warning(
                    f"Redis connection attempt {attempt + 1}/{max_retries} failed: {e}. "
                    f"Retrying in {delay}s..."
                )
                await asyncio.sleep(delay)
            else:
                logger.error(
                    f"Redis connection failed after {max_retries} attempts: {e}")
                raise


async def close_redis():
    """Close Redis connection pool on shutdown."""
    global redis_client
    if redis_client:
        await redis_client.close()
        logger.info("✓ Redis connection closed")
