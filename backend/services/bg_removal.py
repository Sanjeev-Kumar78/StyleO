import ctypes
import io
import os
import logging
from collections import deque
from PIL import Image
from rembg import remove, new_session
from core.config import settings

# Set up logging
logger = logging.getLogger(__name__)

os.environ["OMP_NUM_THREADS"] = "1"
os.environ["ORT_TENSORRT_FP16_ENABLE"] = "1"
os.environ.setdefault("ORT_LOG_SEVERITY_LEVEL", "3")  # suppress ORT verbosity


def _is_cuda_runtime_available() -> bool:
    """
    Probe CUDA runtime libraries before handing them to ONNXRuntime.
    - Windows: checks for the required .dll files in the DLL search path.
    - Linux/macOS: checks for the equivalent .so files via ctypes.CDLL.
    Returns True only when the libraries can actually be loaded.
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
    Build the ONNXRuntime execution-provider list from .env config.
    CUDA is prepended only when REMBG_ENABLE_GPU=true AND the runtime
    libs are actually present. CPUExecutionProvider is always the last
    entry so ORT can fall back automatically.
    """
    if settings.REMBG_ENABLE_GPU:
        if _is_cuda_runtime_available():
            logger.info("REMBG_ENABLE_GPU=true and CUDA runtime found — using GPU.")
            return ["CUDAExecutionProvider", "CPUExecutionProvider"]
        else:
            logger.warning(
                "REMBG_ENABLE_GPU=true but CUDA runtime libs are missing — "
                "falling back to CPU only."
            )
    else:
        logger.info("REMBG_ENABLE_GPU not set — using CPU only.")

    return ["CPUExecutionProvider"]


providers = _build_providers()


def _init_session(model_name: str):
    try:
        active_session = new_session(model_name, providers=providers)
        logger.info(
            "Initialized rembg session for model %s. Active providers: %s",
            model_name,
            active_session.inner_session.get_providers(),
        )
        return active_session
    except Exception as e:
        logger.warning(
            "Failed to initialize model %s with requested providers, falling back to CPU: %s",
            model_name,
            e,
        )
        return new_session(model_name, providers=["CPUExecutionProvider"])


generic_session = _init_session('u2net')
outfit_session = _init_session('u2net_cloth_seg')


def _prepare_image(image_bytes: bytes) -> Image.Image:
    image = Image.open(io.BytesIO(image_bytes))
    if image.mode != 'RGB' and image.mode != 'RGBA':
        image = image.convert('RGB')
    return image


def _extract_components(alpha_mask: Image.Image, min_area_ratio: float = 0.008) -> list[tuple[int, int, int, int]]:
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

    boxes.sort(key=lambda box: (box[1], box[0]))
    return boxes


def _image_to_png_bytes(image: Image.Image) -> bytes:
    output_buffer = io.BytesIO()
    image.save(output_buffer, format="PNG", optimize=True)
    return output_buffer.getvalue()


try:
    # This downloads the u2net model on first run to ~/.u2net/
    session = outfit_session
except Exception as e:
    logger.warning(f"Session fallback warning: {e}")
    session = outfit_session


def remove_background_generic(image_bytes: bytes) -> bytes:
    """
    Generic cloth image background removal for direct uploads.
    Uses u2net and returns PNG bytes preserving transparency.
    """
    try:
        input_image = _prepare_image(image_bytes)
        output_image = remove(input_image, session=generic_session)
        return _image_to_png_bytes(output_image)
    except Exception as e:
        logger.error(f"Generic background removal failed: {e}")
        return image_bytes


def segment_outfit_image(image_bytes: bytes) -> bytes:
    """
    Segment worn outfit images using u2net cloth segmentation model.
    Returns one PNG with transparent background where cloth regions are retained.
    """
    try:
        input_image = _prepare_image(image_bytes)
        output_image = remove(input_image, session=outfit_session)
        return _image_to_png_bytes(output_image)
    except Exception as e:
        logger.error(f"Outfit segmentation failed: {e}")
        return image_bytes


def extract_outfit_candidates(image_bytes: bytes, max_candidates: int = 6) -> list[bytes]:
    """
    Build per-item candidate crops from a segmented outfit image.
    Components are sorted top-to-bottom to keep stable UI order.
    """
    segmented_bytes = segment_outfit_image(image_bytes)

    try:
        segmented = Image.open(io.BytesIO(segmented_bytes)).convert("RGBA")
    except Exception as e:
        logger.error(f"Failed to parse segmented image: {e}")
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


def remove_background(image_bytes: bytes) -> bytes:
    """
    Takes a raw image byte string, removes the background using rembg (u2net),
    and returns a new image byte string (PNG format to preserve transparency).

    Latency expectation:
    - GPU (CUDA): ~100-300ms per image
    - CPU (Standard): ~1.5 - 3 seconds per image
    """
    return remove_background_generic(image_bytes)
