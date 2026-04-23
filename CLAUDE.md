# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What is SnapSell

SnapSell is an AI-powered resale value scanner. Users photograph any item, Claude identifies it and estimates its resale value via eBay market data, and the app generates a ready-to-post eBay listing. There are two separate runnable layers: a legacy Streamlit app (`app.py`) and the current production stack (FastAPI backend + React/Vite frontend).

## Running the app (production stack)

**Backend** (FastAPI, port 8000):
```bash
uvicorn backend:app --reload --port 8000
```

**Frontend** (React/Vite, port 8080):
```bash
cd Website-Design
npm install
npm run dev
```

The Vite dev server proxies all `/api/*` requests to `http://localhost:8000`, so both must run together. The frontend reads `VITE_API_URL` from the environment; if unset it defaults to a relative path (correct for dev proxy and production serving).

**Production build** (backend serves the React SPA):
```bash
cd Website-Design && npm run build
uvicorn backend:app --port 8000
```
`backend.py` mounts `Website-Design/dist` and serves `index.html` for all non-API routes.

**Legacy Streamlit app** (standalone, not connected to FastAPI):
```bash
streamlit run app.py
```

**Required `.env` variables:**
```
ANTHROPIC_API_KEY=...
EBAY_APP_ID=...
EBAY_CLIENT_SECRET=...
```

## Frontend commands

```bash
cd Website-Design
npm run build        # production build
npm run lint         # ESLint
npm run test         # Vitest (unit)
npm run test:watch   # Vitest watch mode
```

## Architecture

### User flow (page sequence)

```
/ (Index) → /upload (UploadPage) → /diagnostics (DiagnosticsPage)
  → /loading (LoadingPage) → /listings-preview (ListingsPreviewPage)
  → /results (ResultsPage) → /listing (ListingPage)
```

`/dashboard` shows scan history from the session. `/how-it-works` is a static explainer.

### State management — `ScanContext`

All scan state flows through a single React context (`src/context/ScanContext.tsx`). The shape is:

- `files: File[]` — uploaded images/videos
- `diagnostics: DiagnosticsData` — AI-identified item details (editable by user on DiagnosticsPage)
- `result: ScanResult | null` — full valuation from `/api/analyze`
- `listing: ListingData | null` — generated eBay listing from `/api/listing`
- `scanHistory: ScanResult[]` — persisted to `sessionStorage`

Pages read/write this context rather than passing props. `resetScan()` clears all state for a new scan.

### API layer (`src/lib/api.ts`)

Three functions map to three backend endpoints. All use `FormData` (multipart), not JSON bodies:

| Function | Endpoint | Purpose |
|---|---|---|
| `identifyDevice(files)` | `POST /api/identify` | Vision → item identity |
| `analyzeDevice(diagnostics, files)` | `POST /api/analyze` | Valuation + eBay comps |
| `generateListing(result)` | `POST /api/listing` | Generate eBay listing copy |

eBay images are proxied through `/api/image-proxy?url=...` to avoid eBay's hotlink blocking — this rewrite happens in `analyzeDevice` before data reaches the context.

### Backend pipeline (`backend.py`)

1. **`/api/identify`** — sends up to 4 images to Claude (`claude-sonnet-4-5`) with `IDENTIFY_PROMPT`. Returns structured confidence flags per field (`certain`/`likely`/`unknown`). Fields marked `unknown` trigger "NEEDS YOUR INPUT" prompts on DiagnosticsPage.

2. **`/api/analyze`** — sends images + user-confirmed diagnostics to Claude with `ANALYSIS_PROMPT` (from `prompts.py`). Runs the eBay Browse API search concurrently (using the price range from Claude's response to filter outliers). Falls back to Claude's own comparable listings if eBay returns nothing.

3. **`/api/listing`** — sends the `ScanResult` to Claude with `LISTING_PROMPT` (from `prompts.py`) to generate a title, description, price, and shipping recommendation.

eBay OAuth tokens are auto-refreshed via `get_ebay_token()` using client credentials flow; the token is cached in module-level globals with a 60-second expiry buffer.

### Prompts (`prompts.py`)

`ANALYSIS_PROMPT` and `LISTING_PROMPT` are Python format strings with `{name}`, `{brand}`, `{model}`, `{year}` etc. slots. Both instruct Claude to return **only raw JSON** (no markdown). The `extract_json()` helper in `backend.py` strips any accidental markdown fences before parsing.

`IDENTIFY_PROMPT` is defined inline in `backend.py` (not in `prompts.py`) and uses a richer per-field confidence schema.

### Frontend structure

- `src/pages/` — one file per route; pages orchestrate API calls and context writes
- `src/components/` — shared UI pieces; `BackgroundOrbs.tsx` is a `position:fixed` decorative layer with `will-change-transform` and `contain:strict`
- `src/components/ui/` — shadcn/ui primitives (Radix-based, auto-generated)
- `src/lib/api.ts` — all fetch calls; `@` alias resolves to `src/`

Animations: Framer Motion for entrance animations; CSS keyframes (`blob`, `float`, `shimmer`, `particleRise`) for ambient effects. Keep animated elements GPU-composited (`transform`/`opacity` only, `will-change-transform`). Avoid CSS `filter: blur()` on large elements — it causes expensive repaints.
