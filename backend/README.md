# StyleO Backend

FastAPI backend for StyleO, an AI-assisted digital wardrobe platform.

This service provides:

- Authentication (email/password + Google OAuth)
- Availability checks for username/email
- User profile and avatar management
- Wardrobe ingestion with image preprocessing and metadata extraction
- Recommendation generation using wardrobe state + AI services
- Background embedding generation with Taskiq workers

## Stack

- Python 3.11+
- FastAPI
- Beanie + MongoDB
- Redis + fastapi-cache
- Taskiq + Redis result backend
- Google Gemini API
- Voyage AI embeddings
- rembg + ONNXRuntime for background removal/segmentation

## Requirements

- Python 3.11 or newer
- MongoDB instance (local or remote)
- Redis instance (or run `docker-compose up -d` from repo root)
- API keys:
  - Google Gemini
  - Voyage AI
  - Google OAuth client id (if Google login is enabled)

## Setup

### 1. Create and activate virtual environment

Windows PowerShell:

```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1
```

macOS/Linux:

```bash
cd backend
python -m venv .venv
source .venv/bin/activate
```

### 2. Install dependencies

Recommended (project is uv-managed):

```bash
uv sync
```

If uv is not installed:

```bash
pip install fastapi beanie taskiq taskiq-redis taskiq-fastapi email-validator \
	fastapi-cache2 google-auth google-genai passlib[argon2] pydantic-settings \
	pyjwt pymongo python-dotenv python-multipart redis requests aiohttp uvicorn \
	voyageai rembg[gpu] onnxruntime-gpu
```

### 3. Configure environment

Create `backend/.env`:

```env
DATABASE_URL=mongodb://localhost:27017/styleo
SECRET_KEY=your-secret-key
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30

GOOGLE_CLIENT_ID=your-google-client-id

REDIS_DB_URL=redis://localhost:6379
REDIS_PASSWORD=
COOKIE_SECURE=false

GEMINI_API_KEY=your-gemini-api-key
VOYAGE_API_KEY=your-voyage-api-key
VOYAGE_EMBEDDING_MODEL=voyage-multimodal-3.5

REMBG_ENABLE_GPU=false
LOG_LEVEL=INFO
```

Notes:

- Use `COOKIE_SECURE=false` for local HTTP development.
- Set `COOKIE_SECURE=true` in production behind HTTPS.

### 4. Start dependencies

From repository root:

```bash
docker-compose up -d
```

This starts Redis and RedisInsight. MongoDB must be available separately.

## Running the backend

From `backend/` with the environment active:

```bash
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

Health check:

- `GET http://localhost:8000/health`

OpenAPI docs:

- `http://localhost:8000/docs`

## Running the worker

In another terminal from `backend/`:

```bash
taskiq worker workers.main:broker
```

The worker processes async tasks such as embedding generation after wardrobe confirmation.

## API Overview

### Public routes

- `GET /health`
- `POST /auth/register`
- `POST /auth/login`
- `POST /auth/logout`
- `POST /auth/google`
- `GET /check/username-available`
- `GET /check/email-available`

### Protected route groups

- `/user/*`
- `/profile/*`
- `/wardrobe/*`
- `/recommend/*`

Authentication is cookie-first (`access_token` HttpOnly cookie), with bearer token compatibility.

## Core Flow Summary

1. User uploads garment image(s) via `/wardrobe/analyze/*`.
2. Backend preprocesses images and may extract outfit candidates.
3. Metadata is generated via Gemini (`/wardrobe/analyze/metadata`).
4. Frontend confirms metadata at `/wardrobe/confirm`.
5. Backend stores images in GridFS, creates wardrobe document, enqueues background embedding task.
6. Recommendation route (`/recommend/`) combines clean-state filtering, vector search fallback, and AI synthesis.

## Project Structure

```text
backend/
	main.py
	pyproject.toml
	core/
	db/
	models/
	routes/
	services/
	workers/
```

## Troubleshooting

- 503 on startup:
  - Check MongoDB/Redis availability and `.env` values.
- 401 on protected routes:
  - Ensure cookie is being sent (`withCredentials` from frontend).
- Google auth failure:
  - Verify `GOOGLE_CLIENT_ID` matches the frontend OAuth client id.
- Worker tasks not executing:
  - Confirm worker terminal is running and connected to Redis.

## Related Docs

- Root project docs: `../README.md`
- Detailed architecture reference: `../STYLEO_CODEBASE_REFERENCE.tex`
