# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

KeepSqueak is an AI-powered memory book generator. Users upload photos, answer AI-generated questions about their relationship, and the system generates a personalized photo book with AI-written text, customizable layouts, and PDF export. The app supports a freemium credit model, marketplace for design templates, admin dashboard, and multi-language i18n.

## Repository Structure

Monorepo with two top-level directories:
- `frontend/` — React 19 SPA (Vite, Tailwind v4, Zustand)
- `backend/` — Python FastAPI server (Gemini AI, Playwright PDF, Supabase)
- `docker-compose.yml` — orchestrates both services

## Build & Run Commands

### Frontend (from `frontend/`)
```bash
npm run dev          # Vite dev server on :5173, proxies /api to backend
npm run build        # Production build to dist/
npm run lint         # ESLint (flat config, eslint.config.js)
npm run preview      # Preview production build
```

### Backend (from `backend/`)
```bash
pip install -r requirements.txt
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```
Requires `.env` file with: `GEMINI_API_KEY`, `SUPABASE_URL`, `SUPABASE_SERVICE_KEY`, `SUPABASE_JWT_SECRET` or `SUPABASE_JWKS_URL`, `STRIPE_API_KEY`, `STRIPE_WEBHOOK_SECRET`, and Stripe price IDs.

### Docker (from project root)
```bash
docker-compose up --build    # Runs both frontend (:5173) and backend (:8000)
```

### Database
Schema is in `backend/supabase_schema.sql`. Run in Supabase Dashboard SQL Editor. Tables: `profiles`, `purchases`, `credit_ledger`, `marketplace_designs`, `user_owned_designs`, `design_submissions`, `generation_history`, `payment_audit_log`, `contact_submissions`, `referrals`, `book_drafts`, `book_draft_photos`, `pdf_downloads`, `events` (partitioned), `admin_audit_log`. Atomic RPC functions handle credit operations (`deduct_credits`, `increment_credits`, `use_credit`, `refund_credit`, `process_referral`).

## Frontend Architecture

### State Management — Zustand Slices Pattern
All app state lives in a single Zustand store (`src/stores/bookStore.js`) composed from 6 slices:

| Slice | Responsibility |
|---|---|
| `wizardSlice` | Multi-step wizard: template, images, vibe, partner names, constraints |
| `questionsSlice` | AI-generated questions, answers, progressive reveal |
| `settingsSlice` | Image look, density, page size, add-ons, custom theme |
| `generationSlice` | Multi-step generation pipeline (upload → analyze → plan → write), SSE progress, session caching |
| `viewerSlice` | Page navigation, view mode (spread/grid), edit mode toggle |
| `editorSlice` | Full editor state: undo/redo history, override maps, shape overlays, photo/text manipulation |

### Override Key System
The editor uses string keys `${chapterIdx}-${spreadIdx}-${slotIdx}` to store per-element visual overrides. Nine override maps exist: `cropOverrides`, `filterOverrides`, `positionOffsets`, `blendOverrides`, `textStyleOverrides`, `textPositionOffsets`, `sizeOverrides`, `imageFrameOverrides`, `pageFrameOverrides`, plus `shapeOverlays`. Synthetic pages use string keys: `bcf` (book_cover_front), `cov` (cover), `ded` (dedication), `bck` (back_cover), `bcb` (book_cover_back).

When spreads are reordered, removed, duplicated, or photos moved between pages, all override maps must be re-keyed via `remapOverrideKeys()` in `editorSlice.js`.

### Page Model
`rebuildPages()` in `editorSlice.js` creates a flat `pages[]` array from `draft.chapters[].spreads[]`. The page sequence is: book_cover_front → cover → dedication → [content spreads] → back_cover → book_cover_back. Mixed layouts (`PHOTO_PLUS_QUOTE`, `COLLAGE_PLUS_LETTER`) produce two flat pages (left/right). `gridUtils.js:buildPageToSpreadMap()` provides the reverse mapping from flat page index back to chapter/spread/slot.

### Layout System
Layouts are defined in `src/features/viewer/layouts/`. Each layout component renders a specific photo arrangement. Layout IDs: `HERO_FULLBLEED`, `TWO_BALANCED`, `THREE_GRID`, `FOUR_GRID`, `SIX_MONTAGE`, `WALL_8_10`, `PHOTO_PLUS_QUOTE`, `COLLAGE_PLUS_LETTER`, `QUOTE_PAGE`, `DEDICATION`, `TOC_SIMPLE`, `BOOK_COVER`.

### Rendering Pipeline
- `PageViewer.jsx` — navigates pages, manages spread/grid views
- `PageRenderer.jsx` — read-only page rendering with text styles, position offsets
- `EditablePageRenderer.jsx` — wraps PageRenderer with edit capabilities: context menu, text drag (px-based), photo add/swap, inline text editing
- `PageShell.jsx` — renders individual photos with crop/filter/blend/size overrides. Uses `object-contain` by default; `object-cover` only when explicit user crop exists
- `ShapeOverlay.jsx` — decorative shape layer (z-30, above text cursor layer)
- `SelectionContext.jsx` — tracks selected element (photo or text), click-outside-to-deselect
- `FloatingToolbar.jsx` — context-sensitive toolbar near selected element

### Text Positioning
Text positions use **pixel units** (`{ xPx, yPx }`) stored in `textPositionOffsets`, applied via `transform: translate(Xpx, Ypx)`. Legacy percentage format (`xPct/yPct`) is still supported for backward compat in `PageRenderer.jsx:getTextStyle()`.

### API Layer
- `src/lib/api.js` — `apiFetch()` with auth token management, auto-refresh, retry with exponential backoff
- `src/api/bookApi.js` — all book API calls, SSE streaming for generation progress
- `src/api/draftsApi.js` — CRUD for saved book drafts

### Auth
`authStore.js` (separate Zustand store with persist middleware) wraps `@supabase/supabase-js`. Validates tokens server-side via `getUser()` rather than trusting localStorage. `src/lib/supabase.js` creates the client from `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` env vars.

### i18n
Uses `react-i18next` with HTTP backend loading from `/locales/{lang}/{namespace}.json`. 13 supported languages, RTL support for Arabic. Namespaces: `common`, `nav`, `auth`, `wizard`, `viewer`, `pricing`, `marketplace`, `profile`, `pages`, `referral`, `admin`.

### Logging
All frontend modules use `src/lib/editorLogger.js` which logs `[KS:category] action` to console in dev mode and stores last 200 entries in memory. Access via `window.__ksLog.dump()` for debugging.

### Key Libraries
- `framer-motion` — animations
- `@dnd-kit` — drag and drop for photo/text reordering between pages
- `html2canvas` — page capture for video export
- `react-pageflip` — book flip animation in spread view
- `@imgly/background-removal` — client-side background removal (ONNX/WebGPU)
- `react-dropzone` — image upload
- `lucide-react` — icons

## Backend Architecture

### FastAPI Application (`app/main.py`)
- Request context middleware injects `request_id`, `http_method`, `http_path`, `user_id` into structlog contextvars
- Global exception handlers return JSON responses with CORS headers
- Session store initialized on startup with configurable TTL and max count

### Dependency Injection (`app/dependencies.py`)
Services are created as singletons via `@lru_cache` or module-level globals. All service interfaces are abstract (`app/interfaces/`): `AbstractAIService`, `AbstractImageEnhancer`, `AbstractPdfGenerator`, `AbstractPromptBuilder`, `AbstractResponseParser`, `AbstractSTTService`. Concrete implementations: `GeminiService`, `GeminiImageEnhancer`, `PlaywrightPdfGenerator`, `MemoryBookPromptBuilder`, `MemoryBookResponseParser`, `WhisperService`.

### Multi-Step Generation Pipeline
The generation is session-based to avoid re-uploading images:

1. **Upload** (`POST /api/books/upload`) — validates images, creates session in `SessionStore`
2. **Analyze** (`GET /api/books/analyze/{session_id}`) — SSE stream. Runs metadata extraction → quality scoring → duplicate detection → AI photo analysis + clustering
3. **Plan** (`POST /api/books/plan/{session_id}`) — generates book layout plan using template + structure rules
4. **Write** (`POST /api/books/write/{session_id}`) — SSE stream. Generates full book content, deducts credits atomically

The `MemoryBookOrchestrator` orchestrates the pipeline using only abstract interfaces (DIP). Progress is streamed via Server-Sent Events (SSE).

### Session Store (`app/services/session_store.py`)
In-memory store for generation sessions. Each session caches: `image_bytes`, `mime_types`, `photo_analyses`, `clusters`, `quality_scores`, `duplicate_groups`, `metadata`, `plan`, `draft`. Background cleanup task evicts expired sessions. Configured via `SESSION_TTL_SECONDS` (default 30min) and `SESSION_MAX_COUNT` (default 100).

### Auth Middleware (`app/middleware/auth.py`)
Decodes Supabase JWTs using JWKS (ES256) with fallback to HS256. Caches JWKS keys for 1 hour. `get_current_user()` dependency returns user dict. `check_user_ban()` verifies user isn't banned.

### AI Integration
- `GeminiService` — wraps Google GenAI SDK for text generation (Gemini 2.0 Flash)
- `GeminiImageEnhancer` — image enhancement, cartoon generation, style transfer (Gemini 2.5 Flash Image)
- Rate limiting via `GeminiRateLimiter` with token bucket per model
- Prompts loaded from `app/prompts/data/*.yaml` via `yaml_loader.py`, combined with `system_prompt.txt`, `vibe_guides.py`, `structure_guides.py`, `layout_rules.py`

### PDF Generation
`PlaywrightPdfGenerator` renders HTML templates via headless Chromium. Templates in `app/pdf_templates/` with Jinja-like HTML (`base.html`), CSS (`pdf_styles.css`, `pdf_fonts.css`), per-layout HTML files, and `template_styles.py` for design-system token mapping.

### Design Templates
JSON files in `app/templates/` (e.g., `romantic.json`, `vintage.json`) define color palettes, typography, spacing. Structure templates in `app/templates/structures/` define chapter organization patterns. `TemplateService` loads and caches them.

### Supabase Service (`app/services/supabase_service.py`)
Server-side Supabase client using `SUPABASE_SERVICE_KEY` (bypasses RLS). Used for all database operations: profile management, credit operations (via RPC), purchases, generation history, marketplace.

### Logging
All backend files use `structlog` with context vars (`request_id`, `user_id`, `http_path`). Config in `app/logging_config.py`. Format: `console` for dev, `json` for prod (via `LOG_FORMAT` env var).

### Configuration (`app/config.py`)
`pydantic-settings` `BaseSettings` class reads from `.env`. Key settings: `gemini_api_key`, `gemini_model` (default `gemini-2.0-flash`), `gemini_art_model` (default `gemini-2.5-flash-image`), Supabase credentials, Stripe credentials, PayPal credentials, session config.

## Routing

### Frontend Routes (App.tsx)
- `/` — Landing page
- `/create` — Wizard (4 steps: Setup, Photos, Story, Generate)
- `/book/view` — Book viewer/editor (`?edit=true` for edit mode)
- `/login`, `/signup`, `/forgot-password`, `/auth/callback` — Auth
- `/pricing`, `/checkout/success`, `/checkout/cancel` — Payments
- `/marketplace`, `/marketplace/submit` — Design marketplace
- `/profile`, `/usage`, `/referral`, `/my-books` — Protected user pages
- `/admin/*` — Admin dashboard (requires `role: 'admin'` in profile)

### Backend API Routes
- `/api/books/*` — Generation pipeline, AI image/text operations, PDF download
- `/api/templates` — Design template listing
- `/api/drafts` — CRUD for saved book drafts
- `/api/payments/*` — Stripe checkout, webhook, PayPal
- `/api/marketplace/*` — Browse/purchase/submit designs
- `/api/profile/*` — User profile management
- `/api/usage/*` — Credit/generation history
- `/api/stt/transcribe` — Speech-to-text (Whisper)
- `/api/contact` — Contact form
- `/api/referral/*` — Referral code system
- `/api/events/track` — Batched analytics events
- `/api/admin/*` — Admin endpoints (dashboard, users, revenue, content, system)
- `/api/health` — Health check

## Conventions

- Frontend is primarily **JavaScript (.js/.jsx)** with a few TypeScript files (.ts/.tsx) for type definitions. The ESLint config handles both.
- The `@` import alias maps to `frontend/src/` (configured in `vite.config.js`).
- All user-facing text must use i18n keys via `useTranslation()` hook (namespace corresponds to feature area).
- Editor operations that modify visual state should call `pushHistory()` before `set()` for undo support.
- Override map operations on spread reorder/remove/add must use `remapOverrideKeys()` to keep keys consistent.
- Image IDs include a random suffix to prevent collisions: `user-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`.
- Backend services follow DIP — depend on abstract interfaces, injected via FastAPI `Depends()`.
- All Supabase credit operations use atomic RPC functions to prevent race conditions.
- The frontend proxies `/api` requests to the backend via Vite dev server config (or Docker network in production).
