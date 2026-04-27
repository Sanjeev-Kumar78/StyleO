import asyncio
import ctypes
import io
import os
import logging
from collections import deque
from concurrent.futures import ThreadPoolExecutor
from PIL import Image
from rembg import remove, new_session
from core.config import settings

logger = logging.getLogger(__name__)

# Keep ORT single-threaded so it doesn't fight uvicorn workers for cores
os.environ["OMP_NUM_THREADS"] = "1"
os.environ["ORT_TENSORRT_FP16_ENABLE"] = "1"
os.environ.setdefault("ORT_LOG_SEVERITY_LEVEL", "3")  # silence ORT noise

# Dedicated thread pool for rembg inference so we never block the event loop
_executor = ThreadPoolExecutor(max_workers=2, thread_name_prefix="rembg")

# Sessions are None at startup and get filled in by preload_models().
# We never initialise them at import time because the download (~100 MB each)
# would block the first request and blow past the 30 s timeout.
generic_session = None   # u2net            plain cloth / direct upload
outfit_session  = None   # u2net_cloth_seg  segmenting worn outfits

_models_ready: bool = False              # flips to True once both sessions are live
_preload_task: asyncio.Task | None = None  # strong reference so GC won't kill the task


def _is_cuda_runtime_available() -> bool:
    """
    Try to load the CUDA shared libraries before passing them to ONNXRuntime.
    On Windows we look for .dll files; on Linux/macOS for the matching .so files.
    Returns True only if every required library actually loads.
    """
    if os.name == "nt":
        required = ("cublasLt64_12.dll", "cudart64_12.dll")
        loader = ctypes.WinDLL
    else:
        required = ("libcublas.so.12", "libcudart.so.12")
        loader = ctypes.CDLL  # type: ignore[assignment]

    try:
        for lib in required:
            loader(lib)
        return True
    except OSError:
        return False


def _build_providers() -> list[str]:
    """
    Decide which ONNXRuntime execution providers to use.
    GPU is only enabled when REMBG_ENABLE_GPU=true *and* the CUDA libs are
    actually present on this machine. CPU is always the last fallback so ORT
    can degrade gracefully without crashing.
    """
    if settings.REMBG_ENABLE_GPU:
        if _is_cuda_runtime_available():
            logger.info("REMBG_ENABLE_GPU=true and CUDA runtime found  using GPU.")
            return ["CUDAExecutionProvider", "CPUExecutionProvider"]
        else:
            logger.warning(
                "REMBG_ENABLE_GPU=true but CUDA runtime libs are missing  "
                "falling back to CPU only."
            )
    else:
        logger.info("REMBG_ENABLE_GPU not set  using CPU only.")

    return ["CPUExecutionProvider"]


def _blocking_init_session(model_name: str, providers: list[str]):
    """
    Download the ONNX weights if they aren't cached yet, then build the session.
    This is intentionally a plain blocking function it runs inside the thread
    pool, never on the asyncio event loop.
    """
    try:
        session = new_session(model_name, providers=providers)
        logger.info(
            "Initialized rembg session for model %s. Active providers: %s",
            model_name,
            session.inner_session.get_providers(),
        )
        return session
    except Exception as exc:
        logger.warning(
            "Failed to initialize model %s with requested providers, "
            "falling back to CPU: %s",
            model_name,
            exc,
        )
        return new_session(model_name, providers=["CPUExecutionProvider"])


async def preload_models() -> None:
    """
    Download and warm up both rembg models in the background.

    This is meant to be scheduled as a fire-and-forget task during FastAPI
    startup so the server comes online immediately. Any request that arrives
    while the models are still loading will get a 503 via models_ready().
    """
    global generic_session, outfit_session, _models_ready, _preload_task

    if _models_ready:
        return

    logger.info("Starting background preload of rembg models ...")
    loop = asyncio.get_event_loop()
    providers = _build_providers()

    try:
        # Download both models at the same time rather than one after the other
        generic_session, outfit_session = await asyncio.gather(
            loop.run_in_executor(_executor, _blocking_init_session, "u2net", providers),
            loop.run_in_executor(_executor, _blocking_init_session, "u2net_cloth_seg", providers),
        )
        _models_ready = True
        logger.info("rembg models preloaded and ready.")
    except Exception as exc:
        logger.error("rembg preload failed: %s", exc)
        # _models_ready stays False so callers keep getting 503 until a restart


def schedule_preload() -> None:
    """
    Kick off preload_models() as a background task and return immediately.
    Call this inside the FastAPI lifespan after the event loop is running.
    We store the task reference so the garbage collector doesn't cancel it.
    """
    global _preload_task
    _preload_task = asyncio.create_task(preload_models(), name="rembg-preload")
    logger.info("rembg preload task scheduled (non-blocking).")


def models_ready() -> bool:
    """Returns True only when both rembg sessions have been loaded successfully."""
    return _models_ready


def _prepare_image(image_bytes: bytes) -> Image.Image:
    image = Image.open(io.BytesIO(image_bytes))
    if image.mode not in ("RGB", "RGBA"):
        image = image.convert("RGB")
    return image


def _extract_components(
    alpha_mask: Image.Image, min_area_ratio: float = 0.008
) -> list[tuple[int, int, int, int]]:
    width, height = alpha_mask.size
    alpha = alpha_mask.load()
    visited: set[tuple[int, int]] = set()
    min_area = max(400, int(width * height * min_area_ratio))
    boxes: list[tuple[int, int, int, int]] = []

    for y in range(height):
        for x in range(width):
            if (x, y) in visited:
                continue
            if alpha[x, y] == 0:
                continue

            queue = deque([(x, y)])
            visited.add((x, y))
            min_x = max_x = x
            min_y = max_y = y
            area = 0

            while queue:
                cx, cy = queue.popleft()
                area += 1
                min_x = min(min_x, cx)
                max_x = max(max_x, cx)
                min_y = min(min_y, cy)
                max_y = max(max_y, cy)

                for nx, ny in ((cx + 1, cy), (cx - 1, cy), (cx, cy + 1), (cx, cy - 1)):
                    if nx < 0 or nx >= width or ny < 0 or ny >= height:
                        continue
                    if (nx, ny) in visited:
                        continue
                    if alpha[nx, ny] == 0:
                        continue
                    visited.add((nx, ny))
                    queue.append((nx, ny))

            if area >= min_area:
                boxes.append((min_x, min_y, max_x + 1, max_y + 1))

    # Sort top-to-bottom so the UI can display items in a natural reading order
    boxes.sort(key=lambda box: (box[1], box[0]))
    return boxes


def _image_to_png_bytes(image: Image.Image) -> bytes:
    output_buffer = io.BytesIO()
    image.save(output_buffer, format="PNG", optimize=True)
    return output_buffer.getvalue()


# These two are the actual blocking workers that rembg runs inside the thread pool
def _blocking_remove_generic(image_bytes: bytes) -> bytes:
    input_image = _prepare_image(image_bytes)
    output_image = remove(input_image, session=generic_session)
    return _image_to_png_bytes(output_image)


def _blocking_segment_outfit(image_bytes: bytes) -> bytes:
    input_image = _prepare_image(image_bytes)
    output_image = remove(input_image, session=outfit_session)
    return _image_to_png_bytes(output_image)


async def remove_background_generic(image_bytes: bytes) -> bytes:
    """
    Remove the background from a directly uploaded cloth image.
    Uses the u2net model and returns PNG bytes with transparency preserved.
    Inference runs in the thread pool so the event loop stays free.
    """
    loop = asyncio.get_event_loop()
    try:
        return await loop.run_in_executor(_executor, _blocking_remove_generic, image_bytes)
    except Exception as exc:
        logger.error("Generic background removal failed: %s", exc)
        return image_bytes


async def segment_outfit_image(image_bytes: bytes) -> bytes:
    """
    Segment a worn-outfit photo using the u2net cloth segmentation model.
    Returns a PNG where only the garment regions are kept (transparent background).
    """
    loop = asyncio.get_event_loop()
    try:
        return await loop.run_in_executor(_executor, _blocking_segment_outfit, image_bytes)
    except Exception as exc:
        logger.error("Outfit segmentation failed: %s", exc)
        return image_bytes


async def extract_outfit_candidates(
    image_bytes: bytes, max_candidates: int = 6
) -> list[bytes]:
    """
    Segment an outfit photo and return individual garment crops as PNG bytes.
    Components are sorted top-to-bottom so the UI order stays consistent.
    """
    segmented_bytes = await segment_outfit_image(image_bytes)

    try:
        segmented = Image.open(io.BytesIO(segmented_bytes)).convert("RGBA")
    except Exception as exc:
        logger.error("Failed to parse segmented image: %s", exc)
        return []

    alpha = segmented.split()[-1]
    boxes = _extract_components(alpha)
    if not boxes:
        return []

    candidates: list[bytes] = []
    for box in boxes[:max_candidates]:
        crop = segmented.crop(box)
        refined = crop.getbbox()
        if refined:
            crop = crop.crop(refined)
        candidates.append(_image_to_png_bytes(crop))

    return candidates


async def remove_background(image_bytes: bytes) -> bytes:
    """
    Public alias for remove_background_generic.

    Expected latency:
      GPU (CUDA)    ~100-300 ms per image
      CPU           ~1.5-3 s per image
    """
    return await remove_background_generic(image_bytes)
