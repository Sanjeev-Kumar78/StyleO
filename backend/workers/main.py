"""
Taskiq Worker broker definition.

Run the worker with::

    cd backend
    taskiq worker workers.main:broker

The worker connects to Redis, initialises Beanie/GridFS via FastAPI's
lifespan (wired up by ``taskiq_fastapi.init``), then processes tasks
defined in ``workers/tasks.py``.

Available tasks
---------------
- ``generate_and_store_embedding``  – fetch image → Atlas Embedding → WardrobeItem.embedding
"""
import logging
import taskiq_fastapi
from taskiq_redis import ListQueueBroker, RedisAsyncResultBackend

from core.config import settings
from core.logging_config import configure_logging


configure_logging()
logger = logging.getLogger(__name__)

# stores task results in Redis for 1 hour.
result_backend = RedisAsyncResultBackend(
    redis_url=settings.REDIS_DB_URL,
    result_ex_time=3600,
)

# Broker FIFO list-based queue backed by Redis.
broker = ListQueueBroker(
    url=settings.REDIS_DB_URL,
).with_result_backend(result_backend)

logger.info("Taskiq broker configured. Redis Connetected")

# Wire Taskiq into the FastAPI app so tasks can use FastAPI dependencies
taskiq_fastapi.init(broker, "main:app")
