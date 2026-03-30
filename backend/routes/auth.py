import json
from beanie import PydanticObjectId
from core.security import (
    create_access_token,
    verify_access_token,
    hash_password,
    verify_password,
    validate_password,
)
from db.CRUD import create_user, is_email_taken, is_username_taken
from core.config import settings
from fastapi import APIRouter, Request, Response, HTTPException, Depends, status, Form
from fastapi.security import OAuth2PasswordBearer
from google.oauth2 import id_token
from google.auth.transport import requests as google_requests
from models.Model import User, UserCreate, UserResponse, Provider
from pydantic import BaseModel
from db import setup_redis


class GoogleAuthRequest(BaseModel):
    credential: str


class LoginRequestForm:
    def __init__(
        self,
        email: str = Form(),
        password: str = Form(),
    ):
        self.email = email
        self.password = password


auth_router = APIRouter(prefix="/auth", tags=["auth"])
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login", auto_error=False)
CURRENT_USER_CACHE_TTL_SECONDS = 120
CURRENT_USER_CACHE_PREFIX = "auth:get_current_user:"


async def invalidate_user_auth_cache(user_id: str | PydanticObjectId) -> None:
    redis_client = setup_redis.redis_client
    if redis_client is None:
        return
    try:
        await redis_client.delete(f"{CURRENT_USER_CACHE_PREFIX}{user_id}")
    except Exception:
        pass


# Dependency
async def get_current_user(
    request: Request,
    token: str | None = Depends(oauth2_scheme),
) -> User:
    """
    FastAPI dependency – resolves the JWT to a User document.
    Checks the `access_token` cookie first, then the Authorization header.
    Raises HTTP 401 if no valid token is found.
    """
    credentials_exc = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    # Try cookie first, then Bearer header
    jwt_token = request.cookies.get("access_token") or token
    if not jwt_token:
        # Try header
        jwt_token = request.headers.get("access_token")
        if not jwt_token:
            raise credentials_exc
    payload = verify_access_token(jwt_token)
    user_id: str | None = payload.get("sub")
    if not user_id:
        raise credentials_exc

    cache_key = f"{CURRENT_USER_CACHE_PREFIX}{user_id}"
    redis_client = setup_redis.redis_client
    if redis_client is not None:
        try:
            cached_user_raw = await redis_client.get(cache_key)
            if cached_user_raw:
                cached_user_data = json.loads(cached_user_raw)
                cached_user = User.model_validate(cached_user_data)
                if not cached_user.is_active:
                    raise credentials_exc
                await redis_client.expire(
                    cache_key,
                    CURRENT_USER_CACHE_TTL_SECONDS,
                )
                return cached_user
        except Exception:
            # Ignore cache failures and continue with DB lookup.
            pass

    user = await User.get(PydanticObjectId(user_id))
    if user is None or not user.is_active:
        raise credentials_exc

    if redis_client is not None:
        try:
            await redis_client.set(
                cache_key,
                user.model_dump_json(by_alias=True),
                ex=CURRENT_USER_CACHE_TTL_SECONDS,
            )
        except Exception:
            # Ignore cache write failures so auth flow remains available.
            pass

    return user


@auth_router.post("/register", status_code=status.HTTP_201_CREATED)
async def register(body: UserCreate, response: Response):
    """
    Create a new user account.

    - Rejects duplicate email or username (HTTP 409).
    - Stores an Argon2 hash of the password – plain text is never persisted.
    """
    # perform availability checks early so we can return a clear 409 before
    # doing expensive password hashing or touching the database further.
    if await is_email_taken(body.email):
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Email already registered",
        )
    if await is_username_taken(body.username):
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Username already taken",
        )

    try:
        validate_password(body.password)
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    # hashed password after validation checks
    hashed_password = hash_password(body.password)
    try:
        user: User = await create_user(body.username, body.email, hashed_password)
    except ValueError as e:
        # create_user still raises on duplicates incase of race conditions;
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT, detail=str(e))
    except RuntimeError as e:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=str(e)
        )
    # Set the cookie or return the token as needed
    token = create_access_token(data={"sub": str(user.id)})
    # Cookie delivery (browser clients)
    response.set_cookie(
        key="access_token",
        value=token,
        httponly=True,
        secure=settings.COOKIE_SECURE,
        samesite="none",
        max_age=60 * 60 * 24,
    )
    # Header delivery (API / mobile clients)
    return {"access_token": token, "token_type": "bearer"}


@auth_router.post("/login")
async def login(
    response: Response,
    form_data: LoginRequestForm = Depends(),
):
    """
    Authenticate with e-mail) + password

    Returns a signed JWT as both:
    - a JSON body
    ```{"access_token": "...", "token_type": "bearer"}``` 
    (for API / mobile clients), and
    - an `httponly` cookie (for browser clients).
    """
    user = await User.find_one(User.email == form_data.email)
    if user is None or user.hashed_password is None or not verify_password(
        form_data.password, user.hashed_password.get_secret_value()
    ):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    if not user.is_active:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN,
                            detail="Account is disabled")

    await invalidate_user_auth_cache(user.id)
    token = create_access_token(data={"sub": str(user.id)})

    # Cookie delivery (browser clients)
    response.set_cookie(
        key="access_token",
        value=token,
        httponly=True,
        secure=settings.COOKIE_SECURE,
        samesite="none",
        max_age=60 * 60 * 24,
    )
    # Header delivery (API / mobile clients)
    return {"access_token": token, "token_type": "bearer"}


@auth_router.post("/logout")
async def logout(response: Response):
    """Clear the auth cookie (browser logout)."""
    response.delete_cookie(key="access_token")
    return {"message": "Logged out successfully"}


@auth_router.post("/google")
async def google_auth(body: GoogleAuthRequest, response: Response):
    """
    Authenticate via Google Sign-In.

    - Verifies the Google ID token.
    - If the email already exists, merges with the existing account
      (updates provider to 'google').
    - If new email, creates a new user (no password, provider='google').
    - Sets JWT cookie for session.
    """
    try:
        payload = id_token.verify_oauth2_token(
            body.credential,
            google_requests.Request(),
            settings.GOOGLE_CLIENT_ID,
        )
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid Google token",
        )

    email = payload.get("email")
    name = payload.get("name", "")
    if not email:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Google account has no email",
        )

    # Check if user already exists with this email
    user = await User.find_one(User.email == email)

    if user:
        # Merge: update provider to google if it was local-only
        if user.provider == Provider.local:
            user.provider = Provider.google
            user.hashed_password = None  # clear local password since Google is now the provider
            await user.save()
            await invalidate_user_auth_cache(user.id)
    else:
        # New user from Google — generate a unique username
        import secrets
        base_username = name.replace(" ", "_").lower() or "user"
        username = base_username
        # ensure the username is not already taken; append random suffix until it is
        # unique (using the same helper as the availability route).
        while await is_username_taken(username):
            username = f"{base_username}_{secrets.token_hex(3)}"

        user = User(
            username=username,
            email=email,
            provider=Provider.google,
            hashed_password=None,
        )
        await user.insert()

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account is disabled",
        )

    token = create_access_token(data={"sub": str(user.id)})
    response.set_cookie(
        key="access_token",
        value=token,
        httponly=True,
        secure=settings.COOKIE_SECURE,
        samesite="none",
        max_age=60 * 60 * 24,
    )
    return {"access_token": token, "token_type": "bearer"}


@auth_router.get("/me", response_model=UserResponse)
async def me(user: User = Depends(get_current_user)):
    """Return the currently authenticated user."""
    return user
