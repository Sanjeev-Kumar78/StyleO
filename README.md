# StyleO - Intelligent Digital Closet and Outfit Recommendation Engine

[![Python](https://img.shields.io/badge/Python-3.11%2B-3776AB?logo=python&logoColor=white)](https://www.python.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.128%2B-009688?logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com/)
[![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=000000)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.9%2B-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![Status](https://img.shields.io/badge/Status-Active%20Development-2ea44f)](https://github.com/Sanjeev-Kumar78/StyleO)

StyleO is a personalized digital wardrobe management system that combines artificial intelligence with wardrobe tracking to deliver smart outfit recommendations. The platform tracks clothing inventory, maintains the state of garments (clean, dirty, worn), and uses machine learning to generate contextual outfit suggestions based on user preferences and availability.

## Overview

StyleO addresses a common problem: managing an ever-growing wardrobe efficiently. Unlike generic outfit recommendation apps, StyleO maintains persistent wardrobe state and tracks garment usage patterns to optimize wardrobe rotation and prevent repetitive outfit choices. The system uses advanced image processing for garment extraction and Google's Gemini AI for intelligent recommendation generation.

This is a full-stack application with a React frontend and a FastAPI backend, designed for local development and personal use. The architecture emphasizes scalability through asynchronous task processing and efficient caching strategies.

## Roadmap

Following features are planned for future releases:

- Advanced outfit recommendations with weather integration
- Social sharing of outfits and wardrobe collections
- Mobile application for iOS and Android
- Computer vision for outfit detection in photos
- Integration with e-commerce platforms for shopping suggestions
- Seasonal wardrobe analysis and recommendations
- Collaboration features for stylists
- Analytics dashboard for outfit usage patterns

## Features

The following features are currently available in the application:

### Authentication & User Management

- User registration with email and password
- Secure login with JWT-based authentication
- Google OAuth 2.0 integration for seamless sign-in
- User profile management with personalization settings
- Email validation and password security with Argon2 hashing

### Wardrobe Management

- Digital wardrobe inventory system
- Garment status tracking (clean, dirty, recently worn)
- Garment descriptions and metadata storage
- Support for multiple upload methods

### Image Processing & Upload

- Direct image upload for individual garments
- Portrait photo segmentation using U2Net deep learning model
- Automatic background removal for cleaner classification
- Support for multiple clothing items from a single portrait photograph
- Image storage and retrieval through MongoDB GridFS

### AI Services

- Automated garment description generation using Google Gemini 3.1 Flash Lite
- Intelligent outfit recommendations powered by Gemini 3 Flash
- Context-aware suggestions based on user preferences
- Multimodal embeddings using Voyage AI for semantic understanding

### Recommendation Engine

- Personalized outfit recommendations
- Profile-based preference matching
- AI-generated descriptions for recommended outfits

## Technology Stack

### Backend

- **Framework:** FastAPI 0.128.0+ (Python 3.11+)
- **Runtime:** Uvicorn ASGI server
- **Database:** MongoDB (async via PyMongo driver)
- **ODM:** Beanie for MongoDB object mapping
- **Cache:** Redis 7.2+ with fastapi-cache2
- **Task Queue:** Taskiq with Redis backend
- **Authentication:** PyJWT, Passlib with Argon2
- **AI/ML:**
  - Google Gemini API for description and recommendation generation
  - Voyage AI for multimodal embeddings
  - Rembg with ONNXRuntime for background removal
  - U2Net for portrait segmentation
- **Image Processing:** PIL (Pillow)
- **HTTP Client:** aiohttp and requests
- **Validation:** Pydantic and email-validator

### Frontend

- **Framework:** React 19.2.0 with TypeScript 5.9+
- **Build Tool:** Vite with Rolldown (Next-gen bundler)
- **Styling:** Tailwind CSS 4.1+ for utility-first styling
- **Routing:** React Router 7.12+ for navigation
- **Forms:** React Hook Form for efficient form management
- **HTTP Client:** Axios for API communication
- **Animation:** Framer Motion 12.34+ for interactive transitions
- **Authentication:** Google OAuth (@react-oauth/google)
- **Linting:** ESLint with TypeScript support

### Infrastructure

- **Containerization:** Docker and Docker Compose
- **Additional Services:** Redis Insight for cache monitoring

## Architecture Overview

The application follows a three-tier architecture pattern:

```
User Interface Layer (React/TypeScript)
         |
         | HTTP/REST API
         |
    Backend Services
    |    |    |    |
 Auth  User  AI   Image
Service  CRUD Service Services
    |    |    |    |
    |    |----|----|
    |         |
  Database  Cache
  (MongoDB) (Redis)
```

The backend processes requests asynchronously for I/O-bound operations and dispatches heavy computational tasks (image processing, AI analysis) to background workers via the Taskiq queue.

## Prerequisites

Before setting up StyleO locally, ensure your system meets these requirements:

### System Requirements

- Python 3.11 or higher
- Node.js 18.0 or higher with npm or yarn
- Docker and Docker Compose (optional, for containerized Redis and MongoDB)

### Required External Services

- MongoDB instance (local or cloud)
- Redis cache server
- Google Cloud Console project with Gemini API enabled
- Voyage AI API key for embeddings
- Google OAuth 2.0 credentials for frontend authentication

### Optional

- NVIDIA GPU support for accelerated background removal (with ONNX Runtime GPU)

## Installation

### Step 1: Clone the Repository

```bash
git clone https://github.com/Sanjeev-Kumar78/StyleO.git
cd StyleO
```

### Step 2: Backend Setup

#### 2.1 Navigate to Backend Directory

```bash
cd backend
```

#### 2.2 Create Python Virtual Environment

```bash
python -m venv .venv
```

#### 2.3 Activate Virtual Environment

On Windows:

```bash
.\.venv\Scripts\activate
```

On macOS/Linux:

```bash
source .venv/bin/activate
```

#### 2.4 Install Python Dependencies

```bash
pip install -e .
```

This installs all dependencies listed in `pyproject.toml`, including FastAPI, Beanie, Redis client, and AI/ML libraries.

#### 2.5 Environment Configuration

Create a `.env` file in the `backend` directory with the following variables:

```env
# Database Configuration
DATABASE_URL=mongodb://localhost:27017/styleo

# Security
SECRET_KEY=your-generated-secret-key-here
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30
COOKIE_SECURE=true

# Redis Configuration
REDIS_DB_URL=redis://localhost:6379
REDIS_PASSWORD=

# Google OAuth
GOOGLE_CLIENT_ID=your-google-client-id-here

# AI Services
GEMINI_API_KEY=your-gemini-api-key-here
VOYAGE_API_KEY=your-voyage-api-key-here
VOYAGE_EMBEDDING_MODEL=voyage-multimodal-3.5

# Image Processing
REMBG_ENABLE_GPU=false

# Logging
LOG_LEVEL=INFO
```

#### 2.6 Generate Secret Key

Open a Python terminal and run:

```python
import secrets
print(secrets.token_urlsafe(32))
```

### Step 3: Frontend Setup

#### 3.1 Navigate to Frontend Directory

```bash
cd ../frontend
```

#### 3.2 Install Dependencies

```bash
npm install
```

#### 3.3 Environment Configuration

Create a `.env` file in the `frontend` directory:

```env
VITE_API_BASE_URL=http://localhost:8000
VITE_GOOGLE_CLIENT_ID=your-google-client-id-here
```

### Step 4: Start Services with Docker Compose

From the project root, start MongoDB and Redis:

```bash
docker-compose up -d
```

This starts:

- MongoDB on port 27017
- Redis on port 6379
- Redis Insight on port 5540 (UI for Redis management)

Verify services are running:

```bash
docker-compose ps
```

## Development Workflow

### Starting the Backend Server

Navigate to the `backend` directory with the virtual environment activated:

```bash
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

The API will be available at `http://localhost:8000`
API documentation available at `http://localhost:8000/docs` (Swagger UI)

### Starting the Frontend Development Server

Navigate to the `frontend` directory:

```bash
npm run dev
```

The application will be available at `http://localhost:5173`

### Running Background Workers

In a separate terminal, start the Taskiq worker process:

```bash
cd backend
taskiq worker workers.main:broker
```

This process handles asynchronous tasks like image processing and AI analysis.

## Configuration Details

### Database Setup

MongoDB is configured with Beanie ORM. Collections are automatically created on first use. The database URL in `DATABASE_URL` should point to your MongoDB instance.

For MongoDB Atlas (cloud):

```env
DATABASE_URL=mongodb+srv://username:password@cluster0.mongodb.net/styleo
```

### Redis Caching

Redis caches API responses and stores session data. Configure the connection URL in `REDIS_DB_URL`. Optional authentication can be set with `REDIS_PASSWORD`.

### Google OAuth Configuration

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create a new project or select existing one
3. Enable Google Sign-In API
4. Create OAuth 2.0 credentials (Web application)
5. Add authorized redirect URIs for your frontend (e.g., `http://localhost:5173` for development)
6. Copy the Client ID to both backend and frontend `.env` files

### Gemini AI Setup

1. Visit [Google AI Studio](https://aistudio.google.com)
2. Create an API key
3. Add the key to `GEMINI_API_KEY` in backend `.env`

### Voyage AI Setup

1. Sign up at [Voyage AI](https://www.voyageai.com)
2. Generate an API key from the dashboard
3. Add the key to `VOYAGE_API_KEY` in backend `.env`

## Project Structure

```
StyleO/
├── backend/
│   ├── main.py                 # FastAPI application entry point
│   ├── pyproject.toml          # Python dependencies and project metadata
│   ├── core/
│   │   ├── config.py          # Settings and configuration management
│   │   ├── security.py        # JWT and authentication utilities
│   │   └── logging_config.py  # Logging configuration
│   ├── db/
│   │   ├── setup_db.py        # MongoDB initialization
│   │   ├── setup_redis.py     # Redis connection setup
│   │   └── CRUD/              # Database operations
│   │       └── users.py       # User CRUD operations
│   ├── models/
│   │   └── Model.py           # Beanie document definitions
│   ├── routes/
│   │   ├── auth.py            # Authentication endpoints
│   │   ├── users.py           # User management endpoints
│   │   ├── profile.py         # User profile endpoints
│   │   ├── wardrobe.py        # Wardrobe management endpoints
│   │   ├── availability.py    # Username/email availability check endpoints
│   │   └── recommend.py       # Recommendation engine endpoints
│   ├── services/
│   │   ├── ai_service.py      # Gemini and Voyage AI integration
│   │   ├── image_service.py   # Image processing and storage
│   │   └── bg_removal.py      # Background removal service
│   └── workers/
│       ├── main.py            # Taskiq broker and worker setup
│       └── tasks.py           # Background task definitions
│
├── frontend/
│   ├── package.json           # Node dependencies
│   ├── vite.config.ts         # Vite bundler configuration
│   ├── tsconfig.json          # TypeScript configuration
│   ├── index.html             # HTML entry point
│   ├── src/
│   │   ├── main.tsx           # React root entry
│   │   ├── App.tsx            # Main application component
│   │   ├── api/
│   │   │   └── config.ts      # API client configuration
│   │   ├── pages/
│   │   │   ├── HomePage.tsx
│   │   │   ├── Login.tsx
│   │   │   ├── Signup.tsx
│   │   │   ├── Dashboard.tsx
│   │   │   ├── ProfilePage.tsx
│   │   │   ├── Wardrobe.tsx
│   │   │   ├── UploadItem.tsx
│   │   │   ├── Recommendations.tsx
│   │   │   └── AboutPage.tsx
│   │   ├── components/
│   │   │   ├── NavBar.tsx
│   │   │   ├── ThemeButton.tsx
│   │   │   └── upload/        # Image upload components
│   │   ├── context/           # React Context for global state
│   │   ├── hooks/             # Custom React hooks
│   │   └── services/          # API service layer
│   └── public/                # Static assets
│
├── docker-compose.yml         # Docker service definitions
└── README.md                 # This file
```

## Application Flow

The following diagram illustrates the main workflows in the StyleO application:

```mermaid
graph TD
    A[User] -->|Navigate to App| B[Frontend React App]

    B -->|Not Authenticated| C{Authentication}
    C -->|Email/Password| D[Login Page]
    C -->|Google OAuth| E[Google Sign-in]
    D -->|Submit Credentials| F[Backend Auth Endpoint]
    E -->|OAuth Token| F
    F -->|Validate & Generate JWT| G[MongoDB - User Collection]
    G -->|Token Response| B

    B -->|Authenticated| H[Dashboard]
    H -->|Browse Profile| I[Profile Page]
    H -->|Manage Wardrobe| J[Wardrobe Page]
    H -->|Get Recommendations| K[Recommendations Page]

    J -->|Add Item - Direct Upload| L[Select Image]
    J -->|Add Item - Portrait Mode| M[Upload Full Body Photo]

    L -->|Send Image| N[Backend Upload Endpoint]
    M -->|Send Photo| O[Backend Segmentation Endpoint]

    N -->|Process Image| P[Image Service]
    O -->|Extract Clothing US2Net| Q[Portrait Segmentation]

    P -->|Remove Background| R[Rembg Service]
    Q -->|Isolate Garments| R

    R -->|Store Images| S[MongoDB - GridFS]

    N -->|Dispatch Task| T[Taskiq Worker Queue]
    O -->|Dispatch Task| T

    T -->|Generate Embedding| U[Voyage AI Multimodal]
    T -->|Create Description| V[Gemini 3.1 Flash Lite]

    U -->|Store Vector| W[MongoDB - Wardrobe Collection]
    V -->|Store Description| W

    K -->|Request Recommendations| X[Backend Recommend Endpoint]
    X -->|Get User Wardrobe| W
    X -->|Analyze Preferences| Y[Profile Data]

    W -->|Garment Data| Z[Gemini 3 Flash]
    Y -->|User Preferences| Z

    Z -->|Generate Outfit| AA[Recommendation Data]
    AA -->|Display to User| K

    H -->|Mark Garment Status| AB[Update Wardrobe]
    AB -->|Clean/Dirty/Worn| W

    style A fill:#e1f5ff
    style B fill:#fff3e0
    style F fill:#f3e5f5
    style W fill:#e8f5e9
    style T fill:#fce4ec
    style Z fill:#fff9c4
```

## API Documentation

The complete API documentation is available through Swagger UI when running the backend:

```
http://localhost:8000/docs
```

Key endpoint groups:

- **Auth**: `/auth/` - Registration, login, logout, token validation
- **Users**: `/users/` - User profile and management
- **Wardrobe**: `/wardrobe/` - Garment management and queries
- **Profile**: `/profile/` - User preference and style settings
- **Recommendations**: `/recommend/` - Outfit suggestions
- **Availability**: `/check/` - Username and email availability checks

## Troubleshooting

### MongoDB Connection Issues

- Verify MongoDB is running: `docker-compose ps`
- Check connection URL in `.env` file
- Ensure MongoDB port 27017 is not blocked by firewall

### Redis Connection Issues

- Ensure Redis container is running: `docker-compose logs redis`
- Check Redis connection URL in `.env`
- Access Redis Insight at `http://localhost:5540` to debug

### Frontend Not Connecting to Backend

- Verify backend is running on port 8000
- Check `VITE_API_BASE_URL` in frontend `.env`
- Check browser console for CORS errors
- Ensure CORS is properly configured in FastAPI (check `main.py`)

### API Key Errors

- Verify all API keys (Gemini, Voyage AI, Google OAuth) are correctly set in `.env`
- Check Google Cloud Console for API enablement and quota limits
- Ensure API keys have not expired

### Python Package Installation Issues

- Try upgrading pip: `pip install --upgrade pip`
- Delete `.venv` and recreate: `rm -r .venv && python -m venv .venv`
- On Windows, ensure you're using PowerShell with administrator privileges

## Contributing

Contributions to StyleO are welcome. When contributing:

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/your-feature-name`
3. Make your changes following the existing code style
4. Write clear commit messages
5. Push to your fork and submit a pull request

### Development Guidelines

- Follow PEP 8 for Python code
- Use TypeScript for all frontend code (avoid JavaScript)
- Write meaningful commit messages
- Test your changes locally before submitting
- Ensure all environment variables are documented

## Production Considerations

While StyleO is currently configured for development, the following should be considered for production deployment:

- Replace SQLite configurations with production-grade database backups
- Use environment-based configuration management (secrets vault)
- Implement rate limiting and request throttling
- Add request logging and monitoring
- Use HTTPS for all endpoints
- Implement proper CORS restrictions
- Add API authentication rate limits
- Consider CDN for static assets
- Monitor Redis memory usage and set eviction policies
- Implement database indexing for frequently queried fields
- Set up automated database backups

## License

This project is licensed under the MIT License. See the LICENSE file for details.

## Support

For issues, questions, or suggestions, please open an issue on the GitHub repository:
[https://github.com/Sanjeev-Kumar78/StyleO](https://github.com/Sanjeev-Kumar78/StyleO)

## Acknowledgments

StyleO leverages several key open-source projects and services:

- FastAPI for the web framework
- React for the user interface
- Google Gemini AI for intelligent recommendations
- Voyage AI for multimodal embeddings
- Rembg and U2Net for image processing
- MongoDB and Redis communities
- All other open-source libraries used throughout the stack
