"""
Taskiq background-task definitions.

Tasks are registered on the broker defined in ``workers/main.py``.
Call them from any async context with::

    await generate_and_store_embedding.kiq(item_id, image_id)

The worker process picks them up and runs them with full access to
Beanie / GridFS via the FastAPI lifespan wired up by taskiq_fastapi.
"""


from beanie import PydanticObjectId
import logging
from models.Model import WardrobeItem
from services import fetch_image, get_voyage_multimodal_embedding
from workers.main import broker

logger = logging.getLogger(__name__)


# Task: generate_and_store_embedding
@broker.task
async def generate_and_store_embedding(
    item_id: str,
    image_id: str,
) -> dict:
    """
    Background task: fetch an image from GridFS, retrieve the WardrobeItem's 
    ai_description, generate a multimodal embedding via the Voyage AI SDK, 
    then update the ``WardrobeItem`` document.

    Parameters
    ----------
    item_id:   Hex string of the ``WardrobeItem._id`` to update.
    image_id:  Hex string of the GridFS file to embed.

    Returns
    -------
    dict
        ``{"status": "ok", "item_id": item_id}`` on success.
    """
    logger.info("[embedding] start  item=%s  image=%s", item_id, image_id)

    # 1. Retrieve the WardrobeItem
    try:
        item = await WardrobeItem.get(PydanticObjectId(item_id))
        if item is None:
            logger.warning("[embedding] item not found  item=%s", item_id)
            return {"status": "not_found", "item_id": item_id}
    except Exception as exc:
        logger.error(
            "[embedding] db read failed  item=%s  err=%s", item_id, exc)
        raise

    if not item.ai_description:
        logger.warning(
            "[embedding] item missing ai_description  item=%s", item_id)
        return {"status": "missing_description", "item_id": item_id}

    logger.info(
        "[embedding] input ready  item=%s  has_description=%s  has_back=%s",
        item_id,
        bool(item.ai_description),
        bool(item.back_image_id),
    )

    # 2. Fetch image bytes from GridFS
    try:
        front_image_bytes, _ = await fetch_image(image_id)
        logger.info(
            "[embedding] front image fetched  item=%s  bytes=%d",
            item_id,
            len(front_image_bytes) if front_image_bytes else 0,
        )

        back_image_bytes = None
        if item.back_image_id:
            back_image_bytes, _ = await fetch_image(item.back_image_id)
            logger.info(
                "[embedding] back image fetched  item=%s  bytes=%d",
                item_id,
                len(back_image_bytes) if back_image_bytes else 0,
            )

    except Exception as exc:
        logger.error("[embedding] fetch failed  item=%s  err=%s", item_id, exc)
        raise

    # 3. Generate the vector via Voyage AI SDK (Multimodal)
    try:
        vector = await get_voyage_multimodal_embedding(
            text=item.ai_description,
            image_data=front_image_bytes,
            image_data2=back_image_bytes,
            input_type="document"
        )
    except Exception as exc:
        logger.error(
            "[embedding] voyage api failed  item=%s  err=%s", item_id, exc)
        raise

    # 4. Persist the embedding onto the WardrobeItem document
    try:
        await item.set({WardrobeItem.embedding: vector})
    except Exception as exc:
        logger.error(
            "[embedding] db update failed  item=%s  err=%s", item_id, exc)
        raise

    logger.info(
        "[embedding] done  item=%s  dims=%d", item_id, len(vector)
    )
    return {"status": "ok", "item_id": item_id}
