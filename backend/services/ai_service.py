from google.genai.errors import APIError
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

    response_text = None
    try:
        response = await client.aio.models.generate_content(
            model="gemini-3.1-flash-lite-preview",
            contents=contents,
            config=genai_types.GenerateContentConfig(
                response_mime_type="application/json",
            )
        )

        response_text = response.text.strip()
        parsed = json.loads(response_text)
        logger.info("%s", parsed)
    except APIError as api_exc:
        logger.error("Gemini API error: %s", api_exc)
        raise RuntimeError(f"Gemini API error: {api_exc}") from api_exc
    except json.JSONDecodeError as json_exc:
        logger.error("[gemini] JSON decode error: %s", json_exc)
        if response_text:
            logger.info("[gemini] raw_response_text: %s", response_text)
        raise RuntimeError(
            f"Failed to parse Gemini response as JSON: {json_exc}") from json_exc
    except Exception as exc:
        logger.error("[gemini] Unexpected error: %s", exc)
        if response_text:
            logger.info("[gemini] raw_response_text: %s", response_text)
        raise

    # return the raw JSON string.
    # The parsing and validation happens in the router (`wardrobe.py`).
    return response_text


async def get_gemini_outfit_recommendations(
    indexed_items: dict[int, dict],
    occasion: Optional[str] = None,
    user_preferences: Optional[str] = None,
    pin_instruction: Optional[str] = None,
    gender: Optional[str] = None,
    body_type: Optional[str] = None,
    style_preference: Optional[list[str]] = None,
    favorite_colors: Optional[list[str]] = None,
) -> str:
    """
    Ask Gemini to suggest structured outfit combinations from indexed items.
    Uses the user's gender, body type, and style preferences for personalised suggestions.
    """
    client = _get_gemini_client()

    #  User persona block
    gender_str = gender.strip() if gender else None
    persona_lines: list[str] = []
    if gender_str:
        persona_lines.append(f"Gender: {gender_str}")
    if body_type:
        persona_lines.append(f"Body type: {body_type}")
    if style_preference:
        persona_lines.append(
            f"Style preferences: {', '.join(style_preference)}")
    if favorite_colors:
        persona_lines.append(f"Favourite colors: {', '.join(favorite_colors)}")

    persona_block = ""
    if persona_lines:
        persona_block = "USER PROFILE\n" + "\n".join(persona_lines) + "\n\n"

    #  Gender-specific styling rules ─
    gender_lower = (gender_str or "").lower()
    if gender_lower in ("female", "woman", "girl", "f"):
        gender_rules = (
            "GENDER-SPECIFIC STYLING (Female)\n"
            "G1. Tops can be tucked, half-tucked, or knotted for different vibes — mention if applicable.\n"
            "G2. Dresses and skirts are fullbody equivalents; apply fullbody rules to skirt+top sets where the skirt is the anchor.\n"
            "G3. Monochromatic or tonal dressing (same hue in different shades) is highly encouraged.\n"
            "G4. Accessorise thoughtfully: earrings, necklaces, bags, and scarves elevate a look significantly.\n"
            "G5. Footwear changes the tone entirely — sneakers = casual, heels/mules = dressy, ankle boots = versatile.\n\n"
        )
    elif gender_lower in ("male", "man", "boy", "m"):
        gender_rules = (
            "GENDER-SPECIFIC STYLING (Male)\n"
            "G1. Pair slim-fit trousers with looser tops and vice-versa; avoid oversized top + wide-leg trouser in a formal setting.\n"
            "G2. Shirt tucking: formal → fully tucked; smart casual → half-tuck or untucked; streetwear → untucked only.\n"
            "G3. Monochromatic or tonal looks in neutrals (black, navy, grey) are very easy wins.\n"
            "G4. Accessories: watch, belt, cap or beanie can sharpen a look without overpowering it.\n"
            "G5. Footwear: sneakers for casual, chukka/Chelsea boots for smart casual, Oxford/Derby for formal.\n\n"
        )
    else:
        gender_rules = ""

    #  Occasion-specific dress code
    occ_lower = (occasion or "").lower()
    if any(w in occ_lower for w in ["formal", "office", "meeting", "interview", "business"]):
        occasion_rules = (
            "OCCASION RULES (Formal / Office)\n"
            "O1. Prioritise structured pieces: blazers, shirts, trousers, tailored skirts.\n"
            "O2. Avoid ripped pieces, graphic tees, or overly casual footwear.\n"
            "O3. Prefer muted palettes: navy, black, grey, white, burgundy, olive.\n\n"
        )
    elif any(w in occ_lower for w in ["wedding", "party", "gala", "event", "festive", "celebration"]):
        occasion_rules = (
            "OCCASION RULES (Festive / Event)\n"
            "O1. Bold colours, embroidery, and embellished pieces are appropriate.\n"
            "O2. Traditional or ethnic wear (lehenga, saree, sherwani) should be suggested if present in the wardrobe.\n"
            "O3. Accessories and footwear are crucial — elevate the look with them.\n\n"
        )
    elif any(w in occ_lower for w in ["gym", "workout", "sport", "run", "fitness", "exercise"]):
        occasion_rules = (
            "OCCASION RULES (Active / Gym)\n"
            "O1. Prioritise activewear; comfort and mobility over style.\n"
            "O2. Match athletic shoes with the outfit; avoid formal shoes.\n"
            "O3. Avoid jeans, blazers, or dress shoes entirely.\n\n"
        )
    elif any(w in occ_lower for w in ["date", "dinner", "evening", "night out"]):
        occasion_rules = (
            "OCCASION RULES (Evening / Date Night)\n"
            "O1. Lean into darker tones or rich colours (burgundy, deep green, navy, black).\n"
            "O2. A blazer, jacket, or statement outerwear elevates the look.\n"
            "O3. Avoid overly casual pieces (gym shorts, flip-flops).\n\n"
        )
    else:
        occasion_rules = ""

    #  Build per-item summaries ─
    item_summaries = []
    for idx, item in indexed_items.items():
        summary = (
            f"Item #{idx} [{item.get('category')}] {item.get('item_type')} — "
            f"{item.get('ai_description')} | "
            f"Color: {item.get('color')} | Pattern: {item.get('pattern', 'N/A')} | "
            f"Material: {item.get('material', 'N/A')} | Season: {item.get('season')} | "
            f"Worn {item.get('worn_count', 0)}×, last worn: {item.get('last_worn', 'never')}"
        )
        item_summaries.append(summary)

    occasion_line = f"Occasion: {occasion}" if occasion else "Occasion: general / casual"
    pref_line = f"User preferences: {user_preferences}" if user_preferences else ""
    pin_line = pin_instruction or ""

    context_lines = []
    if pin_line:
        context_lines.append(pin_line)
    context_lines.append(occasion_line)
    if pref_line:
        context_lines.append(pref_line)
    context_block = "\n".join(context_lines) + "\n\n"

    prompt = (
        "You are an expert personal stylist AI who deeply understands gender-specific fashion, "
        "occasion dress codes, colour theory, and garment proportions.\n"
        "Given the numbered wardrobe items below, suggest 2-3 complete, wearable outfits.\n\n"
        + persona_block
        + gender_rules
        + occasion_rules
        +
        "STRUCTURAL RULES\n"
        "1. A 'fullbody' item (dress, jumpsuit, saree, lehenga) MUST NOT be paired with a separate topwear or bottomwear, "
        "but CAN be paired with outerwear and accessories.\n"
        "2. An outfit without a 'fullbody' item MUST include at least one topwear AND one bottomwear.\n"
        "3. LAYERING: Suggest a lighter topwear (T-shirt, tank) UNDER a heavier topwear (shirt, overshirt) or outerwear (jacket, blazer) when it makes sense.\n"
        "4. Always include footwear if any is available in the wardrobe.\n"
        "5. Include an accessory only if it genuinely elevates the outfit — never force it.\n"
        "6. FULLBODY EXCLUSIVITY: A 'fullbody' item may appear in AT MOST ONE outfit. All other items CAN appear in multiple outfits — "
        "the same jeans or shoes can anchor different looks.\n"
        "7. Prefer items worn less recently when multiple similar items are available (lower worn_count / older last_worn date).\n\n"

        "COLOUR & PATTERN HARMONY\n"
        "8. Neutrals (black, white, grey, navy, beige, camel) pair with anything.\n"
        "9. Avoid combining two bold clashing colours unless intentionally streetwear-inspired.\n"
        "10. NEVER combine two strong prints/patterns (e.g. plaid + floral). One patterned + one solid is ideal.\n"
        "11. If the user has listed favourite colours, use them as accents or anchors when possible.\n\n"

        "OUTPUT FORMAT (strict JSON, no markdown fences)\n"
        "{ \"outfits\": [ { \"items\": [1, 5, 8], \"reason\": \"Why this works for the occasion and the user's style.\" } ] }\n"
        "The 'reason' must be 1-2 sentences, specific to this outfit + occasion + user.\n\n"
        + context_block
        + "AVAILABLE WARDROBE ITEMS:\n"
        + "\n".join(item_summaries)
    )

    try:
        response = await client.aio.models.generate_content(
            model="gemini-3-flash-preview",
            contents=prompt,
            config=genai_types.GenerateContentConfig(
                response_mime_type="application/json",
                temperature=0.4,
            )
        )
    except APIError as api_exc:
        logger.error("Gemini API error: %s", api_exc)
        raise RuntimeError(f"Gemini API error: {api_exc}") from api_exc
    except Exception as exc:
        logger.error("[gemini] Unexpected error: %s", exc)
        raise RuntimeError(f"Unexpected Gemini error: {exc}") from exc
    return response.text.strip()
