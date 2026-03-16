import io
import json
import logging
import voyageai
from PIL import Image

from typing import Optional
from google import genai
from google.genai import types as genai_types

from core.config import settings


logger = logging.getLogger(__name__)


# Lazy Gemini client
_gemini_client: genai.Client | None = None


def _get_gemini_client() -> genai.Client:
    global _gemini_client
    if _gemini_client is None:
        if not settings.GEMINI_API_KEY:
            raise RuntimeError(
                "GEMINI_API_KEY is not set.  Add it to your .env file."
            )
        _gemini_client = genai.Client(api_key=settings.GEMINI_API_KEY)
    return _gemini_client


# Voyage AI Multimodal Embeddings
async def get_voyage_multimodal_embedding(
    *,
    text: str,
    image_data: bytes,
    image_data2: Optional[bytes] = None,
    input_type: str = "document",
) -> list[float]:
    """
    Generate a multimodal float-vector embedding via the Voyage AI SDK.

    Parameters
    ----------
    text:        Textual description of the item (e.g. ai_description).
    image_data:  Raw image bytes.
    input_type:  "document" for storing items, "query" for retrieval.

    Returns
    -------
    list[float]
        The 1024-dimensional embedding vector produced by voyage-multimodal-3.5.
    """
    if not settings.VOYAGE_API_KEY:
        raise RuntimeError(
            "VOYAGE_API_KEY is not set."
        )

    vo = voyageai.AsyncClient(api_key=settings.VOYAGE_API_KEY)

    # PIL Image object
    img = Image.open(io.BytesIO(image_data))
    img2 = Image.open(io.BytesIO(image_data2)) if image_data2 else None

    # Interleaved format: list containing both text and image
    # We wrap in another list because the SDK takes a batch of inputs
    result = await vo.multimodal_embed(
        inputs=[[text, img, img2]] if img2 else [[text, img]],
        model=settings.VOYAGE_EMBEDDING_MODEL,
        input_type=input_type,
    )

    try:
        embedding = result.embeddings[0]
        # total_tokens = result.usage.total_tokens
        # logger.info(f"Voyage AI embedding generated with {total_tokens} tokens.")
    except (IndexError, AttributeError) as exc:
        raise RuntimeError(
            f"Unexpected Voyage SDK response shape: {result}"
        ) from exc

    return embedding


async def get_voyage_query_embedding(query_text: str) -> list[float]:
    """
    Generate a text-only query embedding via the Voyage SDK for semantic search.
    Defaults to input_type="query".
    """
    if not settings.VOYAGE_API_KEY:
        raise RuntimeError("VOYAGE_API_KEY is not set.")

    vo = voyageai.AsyncClient(api_key=settings.VOYAGE_API_KEY)

    result = await vo.multimodal_embed(
        inputs=[[query_text]],
        model=settings.VOYAGE_EMBEDDING_MODEL,
        input_type="query",
    )
    return result.embeddings[0]


# Gemini helpers
async def generate_wardrobe_ai_description(
    front_image_data: bytes,
    back_image_data: Optional[bytes] = None,
) -> str:
    """
    Ask Gemini to produce a rich, JSON-structured profile of a wardrobe item.

    Returns
    -------
    str
        JSON string representing the generated metadata including category,
        item_type, color, and ai_description.
    """
    client = _get_gemini_client()

    text_prompt = (
        "You are an expert AI fashion cataloguer. "
        "First, determine if the provided image(s) actually contain an item of clothing, footwear, or a fashion accessory. "
        "If it is NOT clothing (e.g., a car, a dog, a random object, pure text), set 'is_clothing' to false and you can leave the other fields empty. "
        "If it IS clothing, perform a detailed analysis. "
        "Return a descriptive profile in VALID JSON FORMAT exactly matching this schema:\n"
        "{\n"
        '  "is_clothing": true, // boolean, mandatory\n'
        '  "category": "topwear", // EXACTLY ONE OF: [topwear, bottomwear, fullbody, outerwear, activewear, footwear, accessory]\n'
        '  "item_type": "T-shirt", // Granular name, e.g. T-shirt, Denim Jacket, Sneakers\n'
        '  "color": "Navy Blue",\n'
        '  "pattern": "Solid",\n'
        '  "season": "Summer",\n'
        '  "material": "Cotton",\n'
        '  "ai_description": "A detailed 2-3 sentence semantic description of the design, style, fit, and visual texture of the item."\n'
        "}\n\n"
        "Return the JSON purely; do not use markdown fences."
    )

    contents: list = [genai_types.Part.from_text(text=text_prompt)]

    contents.append(genai_types.Part.from_bytes(
        data=front_image_data, mime_type="image/webp"))
    if back_image_data:
        contents.append(genai_types.Part.from_bytes(
            data=back_image_data, mime_type="image/webp"))

    response = await client.aio.models.generate_content(
        model="gemini-3.1-flash-lite-preview",
        contents=contents,
        config=genai_types.GenerateContentConfig(
            response_mime_type="application/json",
        )
    )

    response_text = response.text.strip()
    try:
        parsed = json.loads(response_text)
        logger.info("%s", parsed)
    except Exception:
        logger.info("[gemini] raw_response_text: %s", response_text)

    # return the raw JSON string.
    # The parsing and validation happens in the router (`wardrobe.py`).
    return response_text


async def get_gemini_outfit_recommendations(
    indexed_items: dict[int, dict],
    occasion: Optional[str] = None,
    user_preferences: Optional[str] = None,
    pin_instruction: Optional[str] = None,
) -> str:
    """
    Ask Gemini to suggest structured outfit combinations from indexed items.

    The prompt instructs Gemini to craft outfits by considering the specific occasion,
    ensuring category compatibility and color harmony, and weighing how recently
    each item was worn & dirty items have already been filtered out.
    """
    client = _get_gemini_client()

    # Build per-item summaries with worn metadata for Gemini to weigh
    item_summaries = []
    for idx, item in indexed_items.items():
        summary = (
            f"Item #{idx} ({item.get('category')}): {item.get('ai_description')} | "
            f"Color: {item.get('color')} | Pattern: {item.get('pattern', 'N/A')} | "
            f"Material: {item.get('material', 'N/A')} | Season: {item.get('season')} | "
            f"Worn {item.get('worn_count', 0)} times, last worn: {item.get('last_worn', 'never')}"
        )
        item_summaries.append(summary)

    occasion_line = f"Occasion: {occasion}" if occasion else "Occasion: general / casual"
    pref_line = f"User preferences: {user_preferences}" if user_preferences else ""
    pin_line = pin_instruction or ""

    # Build dynamic context block
    context_lines = []
    if pin_line:
        context_lines.append(pin_line)
    context_lines.append(occasion_line)
    if pref_line:
        context_lines.append(pref_line)
    context_block = "\n".join(context_lines) + "\n\n"

    prompt = (
        "You are a personal stylist AI. "
        "Given the wardrobe items listed below by their # number, suggest 2-3 complete outfits.\n\n"

        "STRUCTURAL RULES\n"
        "1. A 'fullbody' item (dress, jumpsuit) MUST NOT be paired with a standard topwear or bottomwear, but CAN be paired with outerwear and accessories.\n"
        "2. An outfit without a 'fullbody' item MUST include at least one topwear AND one bottomwear.\n"
        "3. LAYERING IS ENCOURAGED: Suggest a lighter topwear (T-shirt, tank top) UNDER a heavier topwear (unbuttoned shirt, overshirt) or outerwear (jacket, blazer).\n"
        "4. Always include footwear if available.\n"
        "5. Include an accessory only if it genuinely complements the outfit.\n\n"

        "COLOR & PATTERN HARMONY\n"
        "6. Prefer complementary or analogous color pairings. Neutrals (black, white, grey, navy, beige) pair with anything.\n"
        "7. Avoid combining two bold clashing colors (e.g. bright red top + bright green bottom) unless intentionally streetwear.\n"
        "8. NEVER combine two strong prints/patterns (e.g. plaid + floral). One patterned item + one solid is ideal.\n\n"

        "OUTPUT FORMAT\n"
        "Output strictly in JSON:\n"
        "{ \"outfits\": [ { \"items\": [1, 5, 8, 12], \"reason\": \"Explanation...\" } ] }\n\n"
        + context_block
        + "Available Items:\n"
        + "\n".join(item_summaries)
    )

    response = await client.aio.models.generate_content(
        model="gemini-3-flash-preview",
        contents=prompt,
        config=genai_types.GenerateContentConfig(
            response_mime_type="application/json",
            temperature=0.4,
        )
    )
    return response.text.strip()
