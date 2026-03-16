"""
GridFS image service.

Provides save / fetch / delete helpers that wrap the shared AsyncGridFSBucket
initialised during application startup.
"""
import io
from beanie import PydanticObjectId
from fastapi import HTTPException, status
from gridfs.asynchronous import AsyncGridFSBucket
from db.setup_db import get_gridfs


async def save_image(
    data: bytes,
    filename: str,
    content_type: str = "image/jpeg",
    metadata: dict | None = None,
) -> str:
    """
    Upload *data* to GridFS and return the inserted file-id as a hex string.

    Parameters
    ----------
    data:         Raw image bytes.
    filename:     Logical filename stored alongside the file in GridFS.
    content_type: MIME type (default ``image/jpeg``).
    metadata:     Optional dict of extra fields stored in the ``metadata``
                  sub-document of the GridFS files collection.

    Returns
    -------
    str: File ID as a hex string (the ObjectId of the GridFS file document).
    """
    fs: AsyncGridFSBucket = get_gridfs()
    file_id = await fs.upload_from_stream(
        filename,
        io.BytesIO(data),
        metadata={
            "contentType": content_type,
            **(metadata or {}),
        },
    )
    return str(file_id)


async def fetch_image(image_id: str) -> tuple[bytes, str]:
    """
    Download a file from GridFS by its hex file-id.

    Returns
    -------
    (bytes, content_type)
        Raw bytes of the stored image and the MIME-type string that was
        saved with the file (falls back to ``application/octet-stream``).

    Raises
    ------
    HTTPException 404  if the file-id is not found in GridFS.
    HTTPException 400  if *image_id* is not a validPydanticObjectId hex string.
    """
    try:
        oid = PydanticObjectId(image_id)
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"'{image_id}' is not a valid image ID.",
        )

    fs: AsyncGridFSBucket = get_gridfs()
    buf = io.BytesIO()
    try:
        await fs.download_to_stream(oid, buf)
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Image '{image_id}' not found.",
        )

    # Retrieve content-type from the files collection metadata
    content_type = "application/octet-stream"
    try:
        cursor = fs.find({"_id": oid})
        async for doc in cursor:
            meta = doc.metadata or {}
            content_type = meta.get("contentType", content_type)
            break
    except Exception:
        pass

    return buf.getvalue(), content_type


async def delete_image(image_id: str) -> None:
    """
    Delete a GridFS file by its hex file-id.  Silently ignores missing files.

    Raises
    ------
    HTTPException 400  if *image_id* is not a validPydanticObjectId hex string.
    """
    try:
        oid = PydanticObjectId(image_id)
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"'{image_id}' is not a valid image ID.",
        )

    fs: AsyncGridFSBucket = get_gridfs()
    try:
        await fs.delete(oid)
    except Exception:
        # File may not exist – treat as a no-op
        pass


def preprocess_image(image_bytes: bytes, max_size: int = 768) -> tuple[bytes, tuple[int, int]]:
    """
    Standardize an image for both Gemini and the frontend UI:
      - Resize ensuring the largest dimension is `max_size` (aspect ratio preserved).
      - Converts to WEBP to save bandwidth.
      - Retains RGBA (transparency) from background removal so UI outfits look clean.

    Returns:
      (processed_bytes, (width, height))
    """
    try:
        from PIL import Image
    except ImportError:
        raise HTTPException(
            status_code=500, detail="Pillow library missing for image preprocessing."
        )

    try:
        img = Image.open(io.BytesIO(image_bytes))

        # We must keep RGBA if it exists (from rembg)
        if img.mode not in ("RGB", "RGBA"):
            # If it's P (palette) with transparency, safely convert to RGBA
            if "transparency" in img.info or img.mode == "P":
                img = img.convert("RGBA")
            else:
                img = img.convert("RGB")

        # Resize keeping aspect
        img.thumbnail((max_size, max_size), Image.Resampling.LANCZOS)

        # Save to WebP
        out_buf = io.BytesIO()
        
        # If the image has an alpha channel, WebP handles it automatically if format="WEBP"
        img.save(out_buf, format="WEBP", quality=85, method=6)
        
        return out_buf.getvalue(), img.size

    except Exception as e:
        raise HTTPException(
            status_code=400, detail=f"Image preprocessing failed: {e}"
        )
