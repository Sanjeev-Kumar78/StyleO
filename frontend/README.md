# StyleO Frontend

React + TypeScript client for StyleO.

This app provides:

- Authentication flows (email/password + Google OAuth)
- Protected route experience after login
- Wardrobe upload and AI-assisted metadata confirmation
- Wardrobe browsing and item state updates
- Outfit recommendation request and result display

## Stack

- React 19
- TypeScript 5
- Vite (Rolldown)
- React Router 7
- Axios
- React Hook Form
- Framer Motion
- Tailwind CSS 4

## Requirements

- Node.js 18+
- npm 9+
- Running backend API (default: `http://localhost:8000`)
- Google OAuth client id for sign-in

## Setup

From repository root:

```bash
cd frontend
npm install
```

Create `frontend/.env`:

```env
VITE_BACKEND_URL=http://localhost:8000
VITE_GOOGLE_CLIENT_ID=your-google-client-id
```

Notes:

- `VITE_BACKEND_URL` is used by Axios and route config utilities.
- Keep `VITE_GOOGLE_CLIENT_ID` aligned with backend `GOOGLE_CLIENT_ID`.

## Available Scripts

```bash
npm run dev      # local dev server (host exposed)
npm run build    # type-check + production build
npm run preview  # preview production build
npm run lint     # eslint
```

## Run in Development

```bash
npm run dev
```

Default dev URL:

- `http://localhost:5173`

## App Architecture

### Entry and Providers

- `src/main.tsx`
  - Wraps app with `GoogleOAuthProvider`
  - Wraps app with `AuthProvider`

### Routing and Access Control

- `src/App.tsx`
  - Public routes: `/`, `/about`, `/contact`, `/login`, `/signup`
  - Protected routes: `/dashboard`, `/profile`, `/item/new`, `/closet`, `/outfits`
  - `ProtectedRoute` redirects unauthenticated users to `/login`

### Auth State Management

- `src/context/AuthProvider.tsx`
  - Session bootstrap using `GET /auth/me`
  - Actions: `login`, `signup`, `googleLogin`, `logout`, `refreshUser`
- `src/hooks/useAuth.tsx`
  - Typed access to auth context from components/pages

### Networking

- `src/services/api.ts`
  - Central Axios instance
  - `withCredentials: true` for HttpOnly cookie auth
- `src/api/config.ts`
  - Route path helpers derived from configured API base URL

## UI Structure

### Shared Components

- `src/components/NavBar.tsx`
- `src/components/Protected_NavBar.tsx`
- `src/components/Logo.tsx`
- `src/components/ThemeButton.tsx`

### Upload Components

- `src/components/upload/UploadModeTabs.tsx`
- `src/components/upload/UploadImageSlot.tsx`
- `src/components/upload/OutfitCandidateGrid.tsx`
- `src/components/upload/UploadSelectField.tsx`
- `src/components/upload/UploadConfirmModal.tsx`

### Wardrobe Components

- `src/components/wardrobe/WardrobeCard.tsx`

### Pages

- `src/pages/HomePage.tsx`
- `src/pages/AboutPage.tsx`
- `src/pages/ContactPage.tsx`
- `src/pages/Login.tsx`
- `src/pages/Signup.tsx`
- `src/pages/Dashboard.tsx`
- `src/pages/ProfilePage.tsx`
- `src/pages/UploadItem.tsx`
- `src/pages/Wardrobe.tsx`
- `src/pages/Recommendations.tsx`

## Backend Contract Notes

- Auth endpoints are cookie-based and require `withCredentials`.
- Upload flow aligns with:
  - `POST /wardrobe/analyze/direct`
  - `POST /wardrobe/analyze/outfit`
  - `POST /wardrobe/analyze/metadata`
  - `POST /wardrobe/confirm`
- Recommendation flow uses `POST /recommend/`.
- Availability checks use:
  - `GET /check/username-available`
  - `GET /check/email-available`

## Troubleshooting

- 401 on protected pages:
  - Ensure backend is running and cookie is set after login.
  - Verify backend CORS includes `http://localhost:5173`.
- Google login popup issues:
  - Check `VITE_GOOGLE_CLIENT_ID` value and OAuth origin settings.
- API calls failing to connect:
  - Confirm `VITE_BACKEND_URL` points to active backend.
- Upload or recommendation errors:
  - Check backend logs for AI provider or image-processing failures.

## Related Docs

- Root project docs: `../README.md`
- Backend service docs: `../backend/README.md`
- Full architecture reference: `../STYLEO_CODEBASE_REFERENCE.tex`
