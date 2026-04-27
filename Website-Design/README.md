# SnapSell

SnapSell is an AI-powered resale assistant that turns item photos or short videos into a practical selling plan. It identifies the item, estimates resale value, compares similar marketplace listings, and generates a ready-to-post eBay listing.

## Core Flow

1. Upload photos or a short video of an item.
2. Let AI identify the item name, brand, variant, category, and condition.
3. Confirm the details page and fix anything uncertain.
4. Review a value range backed by comparable listings.
5. Generate a listing title, description, tags, price, and shipping suggestion.

## Frontend

- React
- Vite
- TypeScript
- Tailwind CSS
- shadcn/ui-style components

## Running Locally

SnapSell needs API credentials before the backend can identify items or fetch marketplace comparables. Create a `.env` file in the project root, one directory above `Website-Design`:

```bash
ANTHROPIC_API_KEY=your_anthropic_api_key
EBAY_APP_ID=your_ebay_app_id
EBAY_CLIENT_SECRET=your_ebay_client_secret
```

`ANTHROPIC_API_KEY` is required for the AI analysis and listing generation. `EBAY_APP_ID` and `EBAY_CLIENT_SECRET` are required for eBay comparable listing data.

Start the backend from the project root. If you are currently inside `Website-Design`, run `cd ..` first.

```bash
python3 -m pip install -r requirements.txt
python3 -m uvicorn backend:app --reload --port 8000
```

In a second terminal, start the frontend:

```bash
cd Website-Design
npm install
npm run dev
```

Open the app at:

```text
http://127.0.0.1:8080/
```

The frontend proxies `/api` requests to the backend at `http://localhost:8000`.

## Backend API

The FastAPI backend exposes:

- `POST /api/identify` for AI photo identification.
- `POST /api/analyze` for valuation and comparable listing analysis.
- `POST /api/listing` for marketplace listing generation.

The backend expects API credentials in the project root `.env` file.
