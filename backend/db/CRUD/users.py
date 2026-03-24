from pymongo.errors import DuplicateKeyError
from beanie import PydanticObjectId
from models import User, Profile


# New User
async def create_user(username: str, email: str, hashed_password: str) -> User:
    # Normalize username to lowercase on insert so index always matches
    user = User(username=username.lower().strip(), email=email.lower().strip(),
                hashed_password=hashed_password)
    try:
        await user.insert()
    except DuplicateKeyError as e:
        error_msg = str(e)
        if "email" in error_msg:
            raise ValueError("Email already registered")
        elif "username" in error_msg:
            raise ValueError("Username already taken")
        raise ValueError("User already exists")
    except Exception as e:
        print(f"Error creating user: {e}")
        raise ValueError("Failed to create user")
    return user


async def is_email_taken(email: str) -> bool:
    return await User.find_one({"email": email.lower().strip()}) is not None


async def is_username_taken(username: str) -> bool:
    return await User.find_one({"username": username.lower().strip()}) is not None


async def get_user_by_email(email: str) -> User | None:
    # query using indexed field
    return await User.find_one({"email": email})


async def get_user_by_username(username: str) -> User | None:
    # query using indexed field
    return await User.find_one({"username": username})


async def get_user_by_id(user_id: str | PydanticObjectId) -> User | None:
    return await User.get(user_id)


async def update_user_profile(user_id: PydanticObjectId, profile_data: dict) -> Profile:
    profile = await Profile.find_one({"user_id": user_id})
    if profile is None:
        # Create new profile if it doesn't exist
        profile = Profile(user_id=user_id, **profile_data)
        await profile.insert()
    else:
        # Update existing profile
        for key, value in profile_data.items():
            setattr(profile, key, value)
        await profile.save()
    return profile
