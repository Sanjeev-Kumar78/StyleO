import json
import logging
from datetime import datetime, timezone, timedelta
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field

from models.Model import User, WardrobeItem, ClothingCategory, Profile
from routes.auth import get_current_user
from services.ai_service import get_voyage_query_embedding, get_gemini_outfit_recommendations
from beanie import PydanticObjectId

recommend_router = APIRouter(prefix="/recommend", tags=["Recommendation"])
logger = logging.getLogger(__name__)


def _normalize_doc(raw_doc) -> dict:
    """Normalize aggregate dicts and Beanie documents into one dict shape."""
    if isinstance(raw_doc, dict):
        doc = dict(raw_doc)
    else:
        doc = raw_doc.model_dump(by_alias=True)

    if "_id" not in doc and "id" in doc:
        doc["_id"] = doc.pop("id")

    category_value = doc.get("category")
    if hasattr(category_value, "value"):
        doc["category"] = category_value.value

    return doc


def _dedupe_docs_by_id(docs: list[dict]) -> list[dict]:
    seen_ids: set[str] = set()
    deduped: list[dict] = []
    for doc in docs:
        doc_id = str(doc.get("_id"))
        if not doc_id or doc_id in seen_ids:
            continue
        seen_ids.add(doc_id)
        deduped.append(doc)
    return deduped


def _is_vector_search_not_enabled(exc: Exception) -> bool:
    text = str(exc)
    return "SearchNotEnabled" in text or "requires additional configuration" in text


def _vector_result_preview(results: list[dict], max_items: int = 5) -> list[dict]:
    """Return a compact preview of vector-search results for logging."""
    preview: list[dict] = []
    for raw in results[:max_items]:
        doc = _normalize_doc(raw)
        preview.append(
            {
                "_id": str(doc.get("_id")),
                "category": doc.get("category"),
                "item_type": doc.get("item_type"),
                "color": doc.get("color"),
                "score": doc.get("score"),
            }
        )
    return preview


#  Request Schema
class RecommendRequest(BaseModel):
    # e.g. "formal meeting", "casual brunch"
    occasion: Optional[str] = None
    # free-text: "I want something minimal"
    preferences: Optional[str] = None
    exclude_item_ids: list[str] = Field(default_factory=list)
    # "build an outfit around this item"
    pin_item_id: Optional[str] = None
    # skip topwear/fullbody worn in last N days
    recently_worn_days: int = Field(default=3, ge=0)


# Category-aware cooldown: some items (jeans, jackets, shoes) are commonly re-worn
CATEGORY_COOLDOWN_MULTIPLIER: dict[str, float] = {
    "topwear": 1.0,      # full cooldown (e.g. 3 days)
    "fullbody": 1.0,     # full cooldown
    "activewear": 0.33,  # ~1 day cooldown (wash after gym)
    "bottomwear": 0.0,   # no cooldown — jeans/trousers are re-worn
    "outerwear": 0.0,    # no cooldown — jackets are re-worn
    "footwear": 0.0,     # no cooldown — shoes are re-worn daily
    "accessory": 0.0,    # no cooldown — watches/belts worn daily
}


#  Route

@recommend_router.post("/")
async def recommend_outfits(
    request: RecommendRequest,
    current_user: User = Depends(get_current_user),
):
    """
    MVP Outfit Recommendation Pipeline

    Conditions evaluated (MVP):
      1. Occasion
      2. Clean / Dirty status       → Vector Search filter
      3. Category matching          → Category-scoped searches
      4. Color compatibility        → Gemini prompt rules
      5. Recently worn items        → Category-aware post-filter
    """

    #  1. Build the semantic query
    query_parts = []
    if request.occasion:
        query_parts.append(request.occasion)
    if request.preferences:
        query_parts.append(request.preferences)

    query_text = " ".join(query_parts).strip() or "casual everyday outfit"

    query_vector: Optional[list[float]] = None
    search_state = {"vector_enabled": True}

    #  2. Category-Scoped Vector Searches (with is_clean filter)

    async def search_category(category: ClothingCategory, limit: int):
        if not search_state["vector_enabled"]:
            return await WardrobeItem.find(
                WardrobeItem.user_id == current_user.id,
                WardrobeItem.category == category,
                WardrobeItem.is_clean == True
            ).sort("-created_at").limit(limit).to_list()

        nonlocal query_vector
        if query_vector is None:
            try:
                query_vector = await get_voyage_query_embedding(query_text)
            except Exception as e:
                search_state["vector_enabled"] = False
                logger.warning(
                    "Disabling vector search for this request due to embedding failure: %s",
                    e,
                )
                return await WardrobeItem.find(
                    WardrobeItem.user_id == current_user.id,
                    WardrobeItem.category == category,
                    WardrobeItem.is_clean == True
                ).sort("-created_at").limit(limit).to_list()

        try:
            pipeline = [
                {
                    "$vectorSearch": {
                        "index": "embedding",
                        "path": "embedding",
                        "queryVector": query_vector,
                        "numCandidates": 50,
                        "limit": limit,
                        "filter": {
                            "$and": [
                                {"user_id": current_user.id},
                                {"category": category.value},
                                {"is_clean": True},
                            ]
                        },
                    }
                },
                {
                    "$addFields": {
                        "score": {"$meta": "vectorSearchScore"}
                    }
                },
            ]
            vector_results = await WardrobeItem.aggregate(pipeline).to_list()
            logger.info(
                "Vector search result for category=%s count=%d preview=%s",
                category.value,
                len(vector_results),
                _vector_result_preview(vector_results),
            )
            return vector_results
        except Exception as search_exc:
            if _is_vector_search_not_enabled(search_exc):
                search_state["vector_enabled"] = False
                logger.warning(
                    "Vector search unavailable in current MongoDB deployment; "
                    "falling back to standard search for this request."
                )
            else:
                logger.warning(
                    "Fallback to standard search for %s due to: %s",
                    category.value,
                    search_exc,
                )
            return await WardrobeItem.find(
                WardrobeItem.user_id == current_user.id,
                WardrobeItem.category == category,
                WardrobeItem.is_clean == True
            ).sort("-created_at").limit(limit).to_list()

    topwear = await search_category(ClothingCategory.topwear, limit=5)
    bottomwear = await search_category(ClothingCategory.bottomwear, limit=5)
    fullbody = await search_category(ClothingCategory.fullbody, limit=3)
    outerwear = await search_category(ClothingCategory.outerwear, limit=3)
    activewear = await search_category(ClothingCategory.activewear, limit=3)
    footwear = await search_category(ClothingCategory.footwear, limit=3)
    accessories = await search_category(ClothingCategory.accessory, limit=3)

    all_results = (
        topwear + bottomwear + fullbody
        + outerwear + activewear + footwear + accessories
    )

    all_results = _dedupe_docs_by_id(
        [_normalize_doc(doc) for doc in all_results])

    if not all_results:
        return {"outfits": [], "message": "No matching clean clothes found in your wardrobe."}

    #  3. Post-filters: Recently Worn (category-aware) + Excludes

    base_cooldown_days = request.recently_worn_days
    exclude_ids = set(request.exclude_item_ids)

    filtered_items = []
    for doc in all_results:
        doc_id = str(doc["_id"])

        # Skip explicitly excluded items
        if doc_id in exclude_ids:
            continue

        # Category-aware cooldown: jeans/shoes/jackets can be re-worn
        category = doc.get("category", "")
        multiplier = CATEGORY_COOLDOWN_MULTIPLIER.get(category, 1.0)
        cooldown_days = base_cooldown_days * multiplier

        if cooldown_days > 0:
            cutoff = datetime.now(timezone.utc) - timedelta(days=cooldown_days)
            last_worn_list = doc.get("last_worn")
            if last_worn_list:
                most_recent = max(last_worn_list)
                if most_recent.tzinfo is None:
                    most_recent = most_recent.replace(tzinfo=timezone.utc)
                if most_recent >= cutoff:
                    continue

        filtered_items.append(doc)

    # If filtering removed everything, fall back to the unfiltered set
    if not filtered_items:
        filtered_items = all_results

    #  3b. Fetch user profile for personalised context
    user_profile = await Profile.find_one(Profile.user_id == current_user.id)
    gender: Optional[str] = None
    body_type: Optional[str] = None
    style_preference: list[str] = []
    favorite_colors: list[str] = []
    if user_profile:
        gender = user_profile.gender
        body_type = user_profile.body_type
        style_preference = user_profile.style_preference or []
        favorite_colors = user_profile.favorite_colors or []

    #  4. Pin item (if requested)

    pinned_doc = None
    if request.pin_item_id:
        try:
            pinned_object_id = PydanticObjectId(request.pin_item_id)
        except Exception:
            raise HTTPException(status_code=400, detail="Invalid pin_item_id")

        pinned = await WardrobeItem.get(pinned_object_id)
        if pinned and pinned.user_id == current_user.id:
            pinned_doc = _normalize_doc(pinned)
            pinned_ids = {str(d["_id"]) for d in filtered_items}
            if request.pin_item_id not in pinned_ids:
                filtered_items.insert(0, pinned_doc)

    #  5. Index Mapping

    indexed_items: dict[int, dict] = {}
    db_lookup: dict[int, dict] = {}

    for idx, doc in enumerate(filtered_items, start=1):
        worn_count = doc.get("worn_count", 0)
        last_worn_list = doc.get("last_worn")
        last_worn_str = (
            max(last_worn_list).strftime(
                "%Y-%m-%d") if last_worn_list else "never"
        )

        indexed_items[idx] = {
            "category": doc.get("category"),
            "item_type": doc.get("item_type"),
            "color": doc.get("color"),
            "pattern": doc.get("pattern"),
            "season": doc.get("season"),
            "material": doc.get("material"),
            "ai_description": doc.get("ai_description"),
            "worn_count": worn_count,
            "last_worn": last_worn_str,
        }
        db_lookup[idx] = doc

    #  6. Build the pinned item instruction

    pin_instruction = ""
    if request.pin_item_id and pinned_doc:
        for idx, doc in db_lookup.items():
            if str(doc["_id"]) == request.pin_item_id:
                pin_instruction = f"MANDATORY: Item #{idx} must appear in EVERY outfit."
                break

    #  7. Call Gemini

    try:
        response_json = await get_gemini_outfit_recommendations(
            indexed_items=indexed_items,
            occasion=request.occasion,
            user_preferences=request.preferences,
            pin_instruction=pin_instruction,
            gender=gender,
            body_type=body_type,
            style_preference=style_preference,
            favorite_colors=favorite_colors,
        )
        gemini_outfits = json.loads(response_json).get("outfits") or []
    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Outfit generation failed: {e}"
        )

    #  8. Validate Mapping

    validated_outfits = []
    # fullbody items can only appear in one Look
    used_fullbody_ids: set[str] = set()

    for outfit in gemini_outfits:
        item_indices = outfit.get("items", [])
        reason = outfit.get("reason", "")

        # Guard against LLM returning duplicate item indices in one outfit.
        seen_indices: set[int] = set()
        unique_item_indices: list[int] = []
        for idx in item_indices:
            if not isinstance(idx, int) or idx in seen_indices:
                continue
            seen_indices.add(idx)
            unique_item_indices.append(idx)

        valid_docs = []
        for idx in unique_item_indices:
            if idx in db_lookup:
                doc = db_lookup[idx].copy()
                item_id = str(doc["_id"])
                # Only block fullbody items from being reused across looks;
                # bottomwear, footwear, outerwear etc. can anchor multiple outfits.
                if doc.get("category") == "fullbody" and item_id in used_fullbody_ids:
                    continue
                doc["_id"] = item_id
                doc["user_id"] = str(doc["user_id"])
                doc.pop("embedding", None)
                valid_docs.append(doc)

        if valid_docs:
            # Register any fullbody items used so they are not repeated
            for d in valid_docs:
                if d.get("category") == "fullbody":
                    used_fullbody_ids.add(d["_id"])
            validated_outfits.append({"items": valid_docs, "reason": reason})

    return {
        "outfits": validated_outfits,
        "message": "Outfit recommendations generated successfully.",
    }
