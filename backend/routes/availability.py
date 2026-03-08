from fastapi_cache.decorator import cache
from fastapi import APIRouter, Request, Response
from db.CRUD import is_email_taken, is_username_taken
from pydantic import BaseModel


class AvailabilityResponse(BaseModel):
    available: bool


availability_router = APIRouter(prefix="/check", tags=["availability"])


# Custom cache key builders to include query parameters
def username_key_builder(func, namespace="", *, request: Request = None, response: Response = None, **kwargs):
    username = request.query_params.get("username", "").lower()
    return f"availability:username:{username}"


# Custom cache key builders to include query parameters
def email_key_builder(func, namespace="", *, request: Request = None, response: Response = None, **kwargs):
    email = request.query_params.get("email", "").lower()
    return f"availability:email:{email}"


@availability_router.get("/username-available", response_model=AvailabilityResponse)
@cache(expire=60, key_builder=username_key_builder)
async def check_username_availability(username: str):
    return AvailabilityResponse(available=not await is_username_taken(username))


@availability_router.get("/email-available", response_model=AvailabilityResponse)
@cache(expire=60, key_builder=email_key_builder)
async def check_email_availability(email: str):
    return AvailabilityResponse(available=not await is_email_taken(email))
