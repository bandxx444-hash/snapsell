"""
SnapSell FastAPI backend — wraps the real Claude API calls.
Run with:  uvicorn backend:app --reload --port 8000
"""
import asyncio
import json
import base64
import io
import uuid
import re
from datetime import datetime

from dotenv import load_dotenv
load_dotenv()

import os
import httpx
import anthropic
from fastapi import FastAPI, File, Form, UploadFile
from fastapi.responses import Response, FileResponse
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
from PIL import Image

from prompts import ANALYSIS_PROMPT, LISTING_PROMPT

app = FastAPI()


app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── eBay OAuth — auto-fetch Application Access Token ──────────────────────────

EBAY_APP_ID = os.environ.get("EBAY_APP_ID", "")
EBAY_CLIENT_SECRET = os.environ.get("EBAY_CLIENT_SECRET", "")

_ebay_token: str = ""
_ebay_token_expiry: float = 0.0

async def get_ebay_token() -> str:
    """Return a valid eBay Application Access Token, refreshing if expired."""
    global _ebay_token, _ebay_token_expiry
    import time
    if _ebay_token and time.time() < _ebay_token_expiry - 60:
        return _ebay_token
    if not EBAY_APP_ID or not EBAY_CLIENT_SECRET:
        return ""
    credentials = base64.b64encode(f"{EBAY_APP_ID}:{EBAY_CLIENT_SECRET}".encode()).decode()
    try:
        async with httpx.AsyncClient(timeout=10) as client:
            r = await client.post(
                "https://api.ebay.com/identity/v1/oauth2/token",
                headers={
                    "Authorization": f"Basic {credentials}",
                    "Content-Type": "application/x-www-form-urlencoded",
                },
                data={
                    "grant_type": "client_credentials",
                    "scope": "https://api.ebay.com/oauth/api_scope",
                },
            )
        data = r.json()
        if r.status_code == 200:
            _ebay_token = data["access_token"]
            _ebay_token_expiry = time.time() + data.get("expires_in", 7200)
            print(f"eBay token refreshed, expires in {data.get('expires_in', 7200)}s")
            return _ebay_token
        else:
            print(f"eBay token error: {data}")
            return ""
    except Exception as e:
        print(f"eBay token fetch error: {e}")
        return ""

async def ebay_sold_listings(query: str, limit: int = 6, price_low: float = 0, price_high: float = 0) -> list[dict]:
    """Fetch active eBay listings via the Browse API, filtered to used devices in price range."""
    token = await get_ebay_token()
    if not token:
        return []
    url = "https://api.ebay.com/buy/browse/v1/item_summary/search"
    # Filter: Used condition only, sort by Best Match, exclude accessories/cases/parts
    params = {
        "q": query,
        "limit": min(limit * 3, 18),  # fetch more so we can filter outliers
        "filter": "conditions:{USED}",
        "sort": "bestMatch",
    }
    # Narrow by price range if we have an estimate
    if price_low > 0 and price_high > 0:
        margin = (price_high - price_low) * 0.6
        params["filter"] += f",price:[{max(0, price_low - margin)}..{price_high + margin}],priceCurrency:USD"
    headers = {
        "Authorization": f"Bearer {token}",
        "X-EBAY-C-MARKETPLACE-ID": "EBAY_US",
    }
    # Keywords that indicate it's NOT a whole device listing
    EXCLUDE = {"case", "cover", "charger", "cable", "adapter", "screen protector",
               "battery", "repair", "parts only", "for parts", "skin", "sleeve"}
    try:
        async with httpx.AsyncClient(timeout=10) as client:
            r = await client.get(url, params=params, headers=headers)
        print(f"eBay Browse API status: {r.status_code}")
        data = r.json()
        if r.status_code != 200:
            print(f"eBay Browse API error: {data}")
            return []
        items = data.get("itemSummaries", [])
        results = []
        for item in items:
            if len(results) >= limit:
                break
            title = item.get("title", "").lower()
            # Skip accessories and non-device listings
            if any(kw in title for kw in EXCLUDE):
                continue
            price_val = float(item.get("price", {}).get("value", 0))
            if price_val <= 0:
                continue
            image_url = item.get("image", {}).get("imageUrl", "")
            image_url = image_url.replace("s-l225", "s-l500").replace("s-l140", "s-l500")
            results.append({
                "title": item.get("title", ""),
                "soldPrice": price_val,
                "condition": item.get("condition", "Used"),
                "soldDate": "",
                "variant": "",
                "imageUrl": image_url,
                "ebayUrl": item.get("itemWebUrl", "https://www.ebay.com"),
            })
        print(f"eBay Browse API returned {len(results)} filtered listings")
        return results
    except Exception as e:
        print(f"eBay Browse API error: {e}")
        return []


# ── GET /api/image-proxy ───────────────────────────────────────────────────────

@app.get("/api/image-proxy")
async def image_proxy(url: str):
    """Proxy eBay images to avoid hotlink blocking."""
    if not ("ebayimg.com" in url):
        return Response(status_code=403)
    async with httpx.AsyncClient() as client:
        r = await client.get(url, headers={"Referer": "https://www.ebay.com/"}, follow_redirects=True)
    return Response(content=r.content, media_type=r.headers.get("content-type", "image/jpeg"))


# ── Helpers ────────────────────────────────────────────────────────────────────

IDENTIFY_PROMPT = """
You are an expert resale item identifier. Study every photo carefully and combine evidence across all images. The product can be electronics, shoes, clothing, collectibles, home goods, toys, instruments, books/media, jewelry/watches, sports gear, or another sellable item.

Your job is to pre-fill a resale details form as much as possible. Use visible evidence first: logos, labels, model text, tags, packaging, ports/buttons, materials, size markings, color, edition, generation, damage, wear, and included accessories. If a field is a strong visual inference, fill it and mark it "likely". Only use null when the photo truly does not show enough evidence.

Return ONLY valid JSON — no markdown, no explanation:
{
  "item_name":      {"value": null, "confidence": "certain"},
  "brand":          {"value": null, "confidence": "certain"},
  "model_variant":  {"value": null, "confidence": "likely"},
  "year_or_age":    {"value": null, "confidence": "likely"},
  "category":       {"value": null, "confidence": "certain"},
  "condition":      {"value": null, "confidence": "likely"},
  "condition_notes":{"value": null, "confidence": "likely"},
  "powers_on":      {"value": null, "confidence": "unknown"},
  "screen_condition":{"value": null, "confidence": "unknown"}
}

Field rules:
- item_name: concise marketplace-ready name. Include the exact product line when visible or strongly inferable, e.g. "Sony WH-1000XM4 Headphones", "Nike Air Force 1 Low", "Xbox Series X", "Levi's Denim Jacket". Avoid vague names like "Electronic Device" unless nothing else is possible.
- brand: manufacturer or designer. If an item is clearly generic/unbranded, use "Unbranded" with "likely" confidence.
- model_variant: useful resale variant details. For electronics, include model/generation/storage/screen size/color when visible or inferable. For clothes/shoes, include size, gender, color, material, style, or edition. For collectibles, include edition, set, year, or character. Keep it short.
- year_or_age: best estimate as a four-digit year if possible. For non-electronics, use manufacture/release year only if visible or strongly inferable; otherwise null.
- category: MUST be exactly one of:
  "Electronics", "Clothing & Apparel", "Footwear", "Collectibles & Art", "Sports & Outdoors", "Home & Garden", "Toys & Games", "Musical Instruments", "Books & Media", "Jewelry & Watches", "Other"
- condition: MUST be exactly one of "Like New", "Good", "Fair", "Poor".
  * Like New: no visible wear or damage.
  * Good: light normal wear, fully usable.
  * Fair: obvious wear, scratches, stains, dents, missing minor pieces, but still usable.
  * Poor: cracked, broken, heavily damaged, not working, or major missing parts.
- condition_notes: one short sentence explaining visible condition evidence.
- Electronics cues:
  * MacBook Pro 14 vs 16: the 14-inch has a noticeably smaller chassis. The 16-inch is significantly wider and taller. Without a clear size reference object in the frame, use "likely" not "certain" for screen size.
  * iPhone: count camera lenses, look for Dynamic Island vs notch vs no notch, check button layout.
  * iPad: look at bezel width, home button vs Face ID, Smart Connector placement.
  * powers_on: "Yes" if screen shows activity or indicator light is on. "No" if clearly off or broken. "unknown" if ambiguous or not electronic.
  * screen_condition: "Flawless", "Minor Scratches", "Cracked", "Screen is off/broken", or "unknown".

Confidence rules (be honest — this affects how much the user trusts the result):
- "certain": you can clearly see direct evidence in the photo
- "likely": strong inference from visible design cues, but not 100% certain
- "unknown": genuinely cannot determine from the photos provided
"""

CARBON_SAVINGS = {
    "smartphone": 44, "iphone": 44, "android": 44, "phone": 44,
    "laptop": 357, "macbook": 357, "notebook": 357,
    "desktop": 718, "imac": 718, "pc": 718,
    "tablet": 86, "ipad": 86,
    "monitor": 530, "display": 530,
    "printer": 185,
    "television": 1050, "tv": 1050,
    "keyboard": 22,
    "camera": 55,
    "watch": 22, "smartwatch": 22,
}


def extract_json(text: str) -> dict:
    text = text.strip()
    if "```" in text:
        for part in text.split("```"):
            part = part.strip().lstrip("json").strip()
            if part.startswith("{"):
                text = part
                break
    s, e = text.find("{"), text.rfind("}") + 1
    if s == -1 or e == 0:
        raise ValueError("No JSON found in response.")
    return json.loads(text[s:e])


def make_image_block(b: bytes) -> dict:
    img = Image.open(io.BytesIO(b))
    img.thumbnail((1568, 1568))
    buf = io.BytesIO()
    img.save(buf, format="JPEG", quality=85)
    b64 = base64.standard_b64encode(buf.getvalue()).decode()
    return {"type": "image", "source": {"type": "base64", "media_type": "image/jpeg", "data": b64}}


async def fetch_ebay_image(url: str) -> str:
    """Scrape the first product image from an eBay listing page."""
    if not url or "ebay.com" not in url:
        return ""
    try:
        async with httpx.AsyncClient(timeout=8) as client:
            r = await client.get(url, headers={
                "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/120 Safari/537.36",
                "Accept-Language": "en-US,en;q=0.9",
            }, follow_redirects=True)
        text = r.text
        # Look for i.ebayimg.com image URLs in the page
        import re
        matches = re.findall(r'https://i\.ebayimg\.com/images/g/[^"\'\\s]+s-l[0-9]+\.jpg', text)
        if matches:
            # Prefer s-l500 size
            for m in matches:
                if "s-l500" in m or "s-l400" in m:
                    return m
            return matches[0]
    except Exception:
        pass
    return ""


def carbon_saving(device_name: str) -> int:
    lower = device_name.lower()
    for key, val in CARBON_SAVINGS.items():
        if key in lower:
            return val
    return 100


# ── POST /api/identify ─────────────────────────────────────────────────────────

@app.post("/api/identify")
async def identify(files: list[UploadFile] = File(...)):
    """Upload device photos → returns DiagnosticsData."""
    photo_bytes = [await f.read() for f in files[:8]]
    blocks = [make_image_block(b) for b in photo_bytes]
    blocks.append({"type": "text", "text": IDENTIFY_PROMPT})

    client = anthropic.Anthropic()
    resp = client.messages.create(
        model="claude-sonnet-4-5",
        max_tokens=900,
        messages=[{"role": "user", "content": blocks}],
    )
    raw = extract_json(resp.content[0].text)

    def val(field):
        return raw.get(field, {}).get("value") or ""

    def first_val(*fields):
        for field in fields:
            value = val(field)
            if value:
                return value
        return ""

    # Weight confidence: certain=1.0, likely=0.6, unknown=0.0
    CONF_WEIGHT = {"certain": 1.0, "likely": 0.6, "unknown": 0.0}

    def conf_weight(*fields):
        return max((CONF_WEIGHT.get(raw.get(field, {}).get("confidence", "unknown"), 0.0) for field in fields), default=0.0)

    def is_confident(*fields):
        # "unknown" triggers NEEDS YOUR INPUT — certain and likely are both fine
        return any(raw.get(field, {}).get("confidence") in ("certain", "likely") for field in fields)

    powers_on_raw = val("powers_on")
    powers_on = True if str(powers_on_raw).lower() == "yes" else (
        False if str(powers_on_raw).lower() == "no" else None
    )

    allowed_categories = {
        "Electronics", "Clothing & Apparel", "Footwear", "Collectibles & Art",
        "Sports & Outdoors", "Home & Garden", "Toys & Games", "Musical Instruments",
        "Books & Media", "Jewelry & Watches", "Other",
    }

    def normalize_category(value: str) -> str:
        cleaned = str(value or "").strip()
        if cleaned in allowed_categories:
            return cleaned
        lower = cleaned.lower()
        if any(k in lower for k in ("phone", "laptop", "computer", "console", "camera", "tablet", "headphone", "electronic")):
            return "Electronics"
        if any(k in lower for k in ("shoe", "sneaker", "boot", "footwear")):
            return "Footwear"
        if any(k in lower for k in ("shirt", "jacket", "pants", "clothing", "apparel", "dress", "hoodie")):
            return "Clothing & Apparel"
        if any(k in lower for k in ("watch", "jewelry", "ring", "necklace")):
            return "Jewelry & Watches"
        return "Other" if cleaned else ""

    def normalize_condition(value: str) -> str:
        lower = str(value or "").strip().lower()
        if lower in ("like new", "new", "excellent", "mint", "open box"):
            return "Like New"
        if lower in ("good", "very good", "used - good", "minor wear"):
            return "Good"
        if lower in ("fair", "acceptable", "used - acceptable", "worn"):
            return "Fair"
        if lower in ("poor", "broken", "for parts", "damaged", "not working"):
            return "Poor"
        return ""

    # Overall confidence = weighted average of all fields, capped at 96%
    weights = [
        conf_weight("item_name", "device_name"),
        conf_weight("brand"),
        conf_weight("model_variant", "model"),
        conf_weight("year_or_age", "year"),
        conf_weight("category"),
        conf_weight("condition"),
    ]
    overall_confidence = round(min(96, (sum(weights) / len(weights)) * 100))

    # Keep useful resale variants but avoid full explanatory sentences.
    model_raw = first_val("model_variant", "model")
    model_clean = model_raw if (len(model_raw) <= 80 and len(model_raw.split()) <= 10) else ""
    year_value = first_val("year_or_age", "year")
    try:
        year_value = int(year_value)
    except (TypeError, ValueError):
        year_value = datetime.now().year

    item_category = normalize_category(val("category"))
    item_condition = normalize_condition(val("condition"))

    return {
        "productName": first_val("item_name", "device_name"),
        "brand": val("brand") or "",
        "modelNumber": model_clean,
        "yearOfPurchase": year_value,
        "itemCategory": item_category,
        "itemCondition": item_condition,
        "conditionNotes": val("condition_notes") or "",
        "powersOn": powers_on,
        "screenCondition": val("screen_condition") or "",
        "overallConfidence": overall_confidence,
        "aiConfidence": {
            "productName": is_confident("item_name", "device_name"),
            "brand": is_confident("brand"),
            "modelNumber": is_confident("model_variant", "model"),
            "yearOfPurchase": is_confident("year_or_age", "year"),
            "itemCategory": bool(item_category) and is_confident("category"),
            "itemCondition": bool(item_condition) and is_confident("condition"),
            "powersOn": is_confident("powers_on"),
            "screenCondition": is_confident("screen_condition"),
        },
    }


# ── POST /api/analyze ──────────────────────────────────────────────────────────

@app.post("/api/analyze")
async def analyze(
    diagnostics: str = Form(...),
    files: list[UploadFile] = File(default=[]),
):
    """Run full AI analysis → returns ScanResult."""
    diag = json.loads(diagnostics)
    name = diag.get("productName", "")
    brand = diag.get("brand", "")
    model = diag.get("modelNumber", "")
    year = diag.get("yearOfPurchase", datetime.now().year)
    category = diag.get("itemCategory", "")
    condition = diag.get("itemCondition", "")
    condition_notes = diag.get("conditionNotes", "")

    photo_bytes = [await f.read() for f in files]
    blocks = [make_image_block(b) for b in photo_bytes]
    blocks.append({"type": "text", "text": ANALYSIS_PROMPT.format(
        name=name,
        brand=brand,
        model=model,
        year=year,
        category=category,
        condition=condition,
        condition_notes=condition_notes,
    )})

    # Build a tight eBay query: brand + device name + year (skip model number — too specific)
    ebay_query = " ".join(filter(None, [brand, name, str(year) if year else ""])).strip()
    client = anthropic.Anthropic()
    # Start Claude analysis first so we get price range before eBay search
    resp = client.messages.create(
        model="claude-sonnet-4-5",
        max_tokens=1000,
        messages=[{"role": "user", "content": blocks}],
    )
    raw = None
    for block in reversed(resp.content):
        if hasattr(block, "text") and block.text.strip():
            raw = extract_json(block.text)
            break
    if not raw:
        raise ValueError("No analysis response from Claude.")

    price_low = raw.get("estimated_value_low", 0)
    price_high = raw.get("estimated_value_high", 0)
    ebay_task = ebay_sold_listings(ebay_query, limit=6, price_low=price_low, price_high=price_high)

    # Use real eBay listings if available, else fall back to Claude's estimates
    comparables = await ebay_task
    if not comparables:
        # Fall back to comparable listings Claude generated in its analysis
        claude_comps = raw.get("comparable_listings", [])
        comparables = []
        for c in claude_comps[:3]:
            image_urls = c.get("image_urls", [])
            comparables.append({
                "title": c.get("title", ""),
                "soldPrice": float(c.get("price", 0)),
                "condition": c.get("condition", "Used"),
                "soldDate": c.get("sold_date", ""),
                "variant": c.get("variant", ""),
                "imageUrl": image_urls[0] if image_urls else "",
                "ebayUrl": c.get("url", "https://www.ebay.com"),
            })

    low = raw.get("estimated_value_low", 0)
    high = raw.get("estimated_value_high", 0)
    estimated = round((low + high) / 2)
    device_name = raw.get("device_identified", f"{brand} {name}".strip())

    return {
        "id": str(uuid.uuid4()),
        "deviceName": device_name,
        "brand": brand,
        "modelNumber": model,
        "year": year,
        "condition": raw.get("condition", "Fair"),
        "conditionNotes": raw.get("condition_notes", ""),
        "estimatedValue": estimated,
        "valueLow": low,
        "valueHigh": high,
        "comparables": comparables,
        "recommendation": raw.get("decision", "sell"),
        "recommendationReason": raw.get("decision_reasoning", ""),
        
        "scannedAt": datetime.now().isoformat(),
        "decision": raw.get("decision", "sell"),
        "adjustedPrice": estimated,
    }


# ── POST /api/listing ──────────────────────────────────────────────────────────

@app.post("/api/listing")
async def listing(result: str = Form(...)):
    """Generate a ready-to-post eBay listing from a ScanResult."""
    r = json.loads(result)

    client = anthropic.Anthropic()
    resp = client.messages.create(
        model="claude-sonnet-4-5",
        max_tokens=1500,
        messages=[{"role": "user", "content": LISTING_PROMPT.format(
            device=r.get("deviceName", ""),
            brand=r.get("brand", ""),
            model=r.get("modelNumber", ""),
            year=r.get("year", ""),
            condition=r.get("condition", ""),
            notes=r.get("conditionNotes", ""),
            low=r.get("adjustedPrice", r.get("valueLow", 0)),
            high=r.get("adjustedPrice", r.get("valueHigh", 0)),
        )}],
    )
    raw = extract_json(resp.content[0].text)

    # Format as a clean plain-text listing
    title = raw.get("title", r.get("deviceName", ""))
    cond = raw.get("condition_grade", f"Used - {r.get('condition', 'Good')}")
    desc = re.sub(r"<[^>]+>", "", raw.get("description", "")).strip()
    price = raw.get("suggested_price", r.get("adjustedPrice", 0))
    shipping = raw.get("shipping_recommendation", "")
    tags = raw.get("keywords", [])

    return {
        "title": title,
        "condition": cond,
        "description": desc,
        "price": price,
        "shipping": shipping,
        "tags": tags,
    }


# ── Serve React frontend (must be last) ────────────────────────────────────────

DIST = os.path.join(os.path.dirname(__file__), "Website-Design", "dist")

if os.path.isdir(DIST):
    app.mount("/assets", StaticFiles(directory=os.path.join(DIST, "assets")), name="assets")

    @app.get("/{full_path:path}")
    async def serve_spa(full_path: str):
        file = os.path.join(DIST, full_path)
        if os.path.isfile(file):
            return FileResponse(file)
        # Never cache index.html so browsers always get the latest JS bundle
        return FileResponse(
            os.path.join(DIST, "index.html"),
            headers={"Cache-Control": "no-store, no-cache, must-revalidate"},
        )
