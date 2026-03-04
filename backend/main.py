from fastapi import FastAPI, Request, Depends
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from starlette.exceptions import HTTPException as StarletteHTTPException
from db import init_db, close_db
from routes import auth_router, user_router
from routes.auth import get_current_user
app = FastAPI(title="StyleO API",
              description="API for StyleO", version="1.0.0")

# Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],  # update for production
    allow_methods=["*"],
    allow_headers=["*"],
    allow_credentials=True,
)

# Routes
app.include_router(auth_router)
app.include_router(user_router, dependencies=[Depends(get_current_user)])


@app.on_event("startup")
async def startup_event():
    await init_db()


@app.on_event("shutdown")
async def shutdown_event():
    await close_db()


@app.get("/health")
async def health_check():
    return {"status": "ok"}

class ServiceUnavailable(Exception):
    def __init__(self, detail: str = "Service temporarily unavailable"):
        self.detail = detail
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