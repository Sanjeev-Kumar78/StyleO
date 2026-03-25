import logging
from fastapi import FastAPI, Request, Depends
from contextlib import asynccontextmanager
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from starlette.exceptions import HTTPException as StarletteHTTPException
from db import init_db, close_db, init_redis, close_redis
from fastapi_cache import FastAPICache
from fastapi_cache.backends.redis import RedisBackend
from routes import auth_router, user_router, availability_router, wardrobe_router, profile_router
from routes.recommend import recommend_router
from routes.auth import get_current_user
from workers.main import broker
from core.logging_config import configure_logging
from core.config import settings


configure_logging()
logger = logging.getLogger(__name__)


class ServiceUnavailable(Exception):
    def __init__(self, detail: str = "Service temporarily unavailable"):
        self.detail = detail


# Startup and Shutdown Events
@asynccontextmanager
async def lifespan(app: FastAPI):
    try:
        # Start the Taskiq broker in the web process only.
        # The worker process manages its own lifecycle via taskiq_fastapi.
        if not broker.is_worker_process:
            await broker.startup()
        await init_db()
        redis_client = await init_redis()
        FastAPICache.init(RedisBackend(redis_client), prefix="fastapi-cache")
        yield
    except Exception as e:
        logger.exception("Error during startup: %s", e)
        raise ServiceUnavailable("Failed to initialize services")
    finally:
        await close_db()
        await close_redis()
        if not broker.is_worker_process:
            await broker.shutdown()

# App Instance
app = FastAPI(title="StyleO API", lifespan=lifespan,
              description="API for StyleO", version="1.0.0")

# Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        settings.FRONTEND_URL,
    ],
    allow_methods=["*"],
    allow_headers=["*"],
    allow_credentials=True,
)


@app.middleware("http")
async def add_coop_header(request: Request, call_next):
    response = await call_next(request)
    response.headers["Cross-Origin-Opener-Policy"] = "same-origin-allow-popups"
    return response


# Routes
app.include_router(auth_router)
app.include_router(availability_router)
app.include_router(user_router, dependencies=[Depends(get_current_user)])
app.include_router(wardrobe_router, dependencies=[Depends(get_current_user)])
app.include_router(recommend_router, dependencies=[Depends(get_current_user)])
app.include_router(profile_router, dependencies=[Depends(get_current_user)])



@app.get("/health")
async def health_check():
    return {"status": "ok"}


@app.exception_handler(StarletteHTTPException)
async def http_exception_handler(request: Request, exc: StarletteHTTPException):
    if exc.status_code == 404:
        return JSONResponse(
            status_code=404,
            content={
                "error": "unreachable_path",
                "message": f"Path '{request.url.path}' not found"
            },
        )
    if exc.status_code == 503:
        return JSONResponse(
            status_code=503,
            content={
                "error": "service_unavailable",
                "message": exc.detail or "Service temporarily unavailable"
            },
        )
    return JSONResponse(
        status_code=exc.status_code,
        content={"error": "http_error", "message": exc.detail},
    )


@app.exception_handler(ServiceUnavailable)
async def service_unavailable_handler(request: Request, exc: ServiceUnavailable):
    return JSONResponse(
        status_code=503,
        content={"error": "service_unavailable", "message": exc.detail},
    )


@app.exception_handler(Exception)
async def generic_exception_handler(request: Request, exc: Exception):
    return JSONResponse(
        status_code=503,
        content={
            "error": "service_unavailable",
            "message": "An unexpected error occurred. Please try again later."
        },
    )
