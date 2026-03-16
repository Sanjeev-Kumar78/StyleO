import base64
import json
from typing import Optional
from fastapi import APIRouter, Depends, UploadFile, File, HTTPException, status
from fastapi.responses import JSONResponse, Response
from beanie import PydanticObjectId
from fastapi_cache.decorator import cache

from models.Model import User, WardrobeItem, ClothingCategory, WardrobeIngestionMode
from routes.auth import get_current_user
from services.image_service import preprocess_image, save_image, fetch_image, delete_image
from services.ai_service import generate_wardrobe_ai_description
from services.bg_removal import remove_background_generic, extract_outfit_candidates
from workers.tasks import generate_and_store_embedding
from pydantic import BaseModel

wardrobe_router = APIRouter(prefix="/wardrobe", tags=["Wardrobe"])


def _assert_image_upload(file: UploadFile, field_name: str) -> None:
    if not file.content_type or not file.content_type.startswith("image/"):
        raise HTTPException(
            status_code=400, detail=f"Invalid image format for {field_name}")


def _to_data_uri(image_bytes: bytes, mime_type: str = "image/webp") -> str:
    return f"data:{mime_type};base64," + base64.b64encode(image_bytes).decode("utf-8")


def _decode_data_uri(data_uri: str) -> bytes:
    return base64.b64decode(data_uri.split(",")[-1])


def _parse_ai_metadata(metadata_json_str: str) -> dict:
    try:
        metadata = json.loads(metadata_json_str)
    except json.JSONDecodeError:
        raise HTTPException(
            status_code=500, detail="Failed to parse AI metadata response.")

    if not metadata.get("is_clothing", True):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="The uploaded image does not appear to be an item of clothing, footwear, or an accessory. Please upload a clear photo of your garment.",
        )

    metadata.pop("is_clothing", None)
    return metadata


class ConfirmItemRequest(BaseModel):
    front_image_b64: str
    back_image_b64: Optional[str] = None
    ingestion_mode: WardrobeIngestionMode = WardrobeIngestionMode.direct_item
    category: ClothingCategory
    item_type: str
    color: str
    pattern: Optional[str] = None
    season: Optional[str] = None
    material: Optional[str] = None
    ai_description: str


class AnalyzeMetadataRequest(BaseModel):
    front_image_b64: str
    back_image_b64: Optional[str] = None


class ProductLinkAnalyzeRequest(BaseModel):
    url: str


async def _prepare_direct_images(
    front_image: UploadFile,
    back_image: Optional[UploadFile],
) -> tuple[bytes, Optional[bytes], str, Optional[str]]:
    """
    Shared direct-upload image pipeline.
    Returns:
      front_webp, back_webp, front_b64, back_b64
    """
    _assert_image_upload(front_image, "front_image")

    front_raw = await front_image.read()
    front_no_bg = remove_background_generic(front_raw)
    front_webp, _ = preprocess_image(front_no_bg)
    front_b64 = _to_data_uri(front_webp)

    back_webp: Optional[bytes] = None
    back_b64: Optional[str] = None
    if back_image:
        _assert_image_upload(back_image, "back_image")
        back_raw = await back_image.read()
        back_no_bg = remove_background_generic(back_raw)
        back_webp, _ = preprocess_image(back_no_bg)
        back_b64 = _to_data_uri(back_webp)

    return front_webp, back_webp, front_b64, back_b64


@wardrobe_router.post("/analyze/direct")
async def analyze_direct_upload(
    front_image: UploadFile = File(...),
    back_image: Optional[UploadFile] = File(None),
    current_user: User = Depends(get_current_user),
):
    try:
        _, _, front_b64, back_b64 = await _prepare_direct_images(front_image, back_image)

        return {
            "mode": WardrobeIngestionMode.direct_item,
            "images": {
                "front_image_b64": front_b64,
                "back_image_b64": back_b64,
            },
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@wardrobe_router.post("/analyze/outfit")
async def analyze_outfit_photo(
    image: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
):
    _assert_image_upload(image, "image")

    try:
        image_raw = await image.read()
        candidate_images = extract_outfit_candidates(
            image_raw, max_candidates=6)
        if not candidate_images:
            raise HTTPException(
                status_code=400,
                detail="No garment candidates could be extracted from this outfit photo.",
            )

        candidates = []
        for index, candidate in enumerate(candidate_images, start=1):
            candidate_webp, dimensions = preprocess_image(candidate)
            candidates.append(
                {
                    "candidate_id": f"candidate_{index}",
                    "label": f"item_{index}",
                    "front_image_b64": _to_data_uri(candidate_webp),
                    "width": dimensions[0],
                    "height": dimensions[1],
                }
            )

        return {
            "mode": WardrobeIngestionMode.outfit_photo,
            "candidates": candidates,
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@wardrobe_router.post("/analyze/metadata")
async def analyze_metadata(
    payload: AnalyzeMetadataRequest,
    current_user: User = Depends(get_current_user),
):
    try:
        front_image_data = _decode_data_uri(payload.front_image_b64)
        back_image_data = _decode_data_uri(
            payload.back_image_b64) if payload.back_image_b64 else None

        metadata_json_str = await generate_wardrobe_ai_description(
            front_image_data=front_image_data,
            back_image_data=back_image_data,
        )
        metadata = _parse_ai_metadata(metadata_json_str)
        return {"metadata": metadata}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@wardrobe_router.post("/analyze/product-link", status_code=status.HTTP_501_NOT_IMPLEMENTED)
async def analyze_product_link(
    payload: ProductLinkAnalyzeRequest,
    current_user: User = Depends(get_current_user),
):
    return JSONResponse(
        status_code=status.HTTP_501_NOT_IMPLEMENTED,
        content={
            "mode": WardrobeIngestionMode.product_link,
            "implemented": False,
            "message": "Product-link ingestion is planned but not implemented yet.",
            "url": payload.url,
        },
    )


@wardrobe_router.post("/confirm", status_code=status.HTTP_202_ACCEPTED)
async def confirm_wardrobe_item(
    payload: ConfirmItemRequest,
    current_user: User = Depends(get_current_user),
):
    """
    Stateful endpoint: Receives Base64 images and confirmed metadata, 
    saves to GridFS, saves to MongoDB, and dispatches embedding task.
    """
    try:
        # 1. Decode Base64 and save to GridFS
        front_b64_data = payload.front_image_b64.split(",")[-1]
        front_bytes = base64.b64decode(front_b64_data)
        front_file_id = await save_image(
            data=front_bytes,
            filename=f"front_{current_user.id}.webp",
            content_type="image/webp"
        )

        back_file_id = None
        if payload.back_image_b64:
            back_b64_data = payload.back_image_b64.split(",")[-1]
            back_bytes = base64.b64decode(back_b64_data)
            back_file_id = await save_image(
                data=back_bytes,
                filename=f"back_{current_user.id}.webp",
                content_type="image/webp"
            )

        # 2. Create WardrobeItem in Database (embedding is None initially)
        new_item = WardrobeItem(
            user_id=current_user.id,
            ingestion_mode=payload.ingestion_mode,
            front_image_id=front_file_id,
            back_image_id=back_file_id,
            category=payload.category,
            item_type=payload.item_type,
            color=payload.color,
            pattern=payload.pattern,
            season=payload.season,
            material=payload.material,
            ai_description=payload.ai_description,
        )
        await new_item.insert()

        # 3. Dispatch TaskIQ worker for Voyage embedding
        embedding_task = await generate_and_store_embedding.kiq(
            item_id=str(new_item.id),
            image_id=front_file_id
        )

        return {
            "message": "Upload confirmed. Embedding in background.",
            "item_id": str(new_item.id),
            "embedding_task_id": embedding_task.task_id,
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@wardrobe_router.get("/")
@cache(expire=300)
async def get_wardrobe_items(skip: int, limit: int, current_user: User = Depends(get_current_user)):
    items = await WardrobeItem.find(WardrobeItem.user_id == current_user.id).skip(skip).limit(limit).to_list()
    if items is None:
        raise HTTPException(status_code=404, detail="No wardrobe items found")
    return items


@wardrobe_router.get("/image/{image_id}")
async def get_image(image_id: str):
    try:
        file_bytes, content_type = await fetch_image(image_id)
        return Response(content=file_bytes, media_type=content_type)
    except Exception:
        raise HTTPException(status_code=404, detail="Image not found")


@wardrobe_router.get("/{item_id}")
async def get_wardrobe_item(item_id: str, current_user: User = Depends(get_current_user)):
    try:
        object_id = PydanticObjectId(item_id)
    except Exception:
        raise HTTPException(status_code=404, detail="Item not found")

    item = await WardrobeItem.get(object_id)
    if not item or item.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="Item not found")
    return item


@wardrobe_router.delete("/{item_id}")
async def delete_wardrobe_item(item_id: str, current_user: User = Depends(get_current_user)):
    try:
        object_id = PydanticObjectId(item_id)
    except Exception:
        raise HTTPException(status_code=404, detail="Item not found")

    item = await WardrobeItem.get(object_id)
    if not item or item.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="Item not found")

    # Delete images from GridFS
    if item.front_image_id:
        await delete_image(item.front_image_id)
    if item.back_image_id:
        await delete_image(item.back_image_id)

    await item.delete()
    return {"message": "Item deleted successfully"}
