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

Run locally:

```bash
npm install
npm run dev
```

## Backend API

The FastAPI backend exposes:

- `POST /api/identify` for AI photo identification.
- `POST /api/analyze` for valuation and comparable listing analysis.
- `POST /api/listing` for marketplace listing generation.

The backend expects API credentials in the project `.env` file.
