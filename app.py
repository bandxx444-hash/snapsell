import json
import random
import io
import base64
import tempfile
import os
from datetime import datetime

import anthropic
import streamlit as st
from dotenv import load_dotenv
from PIL import Image

try:
    import cv2
    CV2_AVAILABLE = True
except ImportError:
    CV2_AVAILABLE = False

from facts import MARKETPLACE_TIPS
from prompts import ANALYSIS_PROMPT, LISTING_PROMPT

load_dotenv()

st.set_page_config(
    page_title="SnapSell | Instant Item Value Scanner",
    page_icon="💰",
    layout="wide",
)

# ─── CSS ─────────────────────────────────────────────────────────────────────
st.markdown("""
<style>
@import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;500;600;700;800;900&family=DM+Sans:wght@300;400;500;600;700&display=swap');

*, *::before, *::after { box-sizing: border-box; }

/* ── CSS custom properties (mirrors React index.css) ── */
:root {
  --bg:          hsl(240,20%,97%);
  --fg:          hsl(240,15%,12%);
  --card:        #FFFFFF;
  --primary:     hsl(262,75%,55%);
  --primary-dk:  hsl(262,75%,42%);
  --primary-lt:  hsl(262,65%,65%);
  --accent:      hsl(38,95%,52%);
  --border:      hsl(240,12%,87%);
  --secondary:   hsl(240,18%,93%);
  --subtle:      hsl(240,6%,55%);
  --faintest:    hsl(240,4%,72%);
  --shadow-card: 0 4px 24px rgba(0,0,0,0.06), 0 0 0 1px rgba(0,0,0,0.03);
  --shadow-cta:  0 4px 20px rgba(124,58,237,0.25), 0 0 60px rgba(124,58,237,0.08);
  --shadow-nav:  0 4px 30px rgba(0,0,0,0.06);
}

/* ── Global reset & background ── */
html, body { background: var(--bg) !important; margin: 0; }
html, body, div, span, p, li, a, button, input, select, textarea, [class*="css"] {
    font-family: 'DM Sans', system-ui, sans-serif !important;
    color: var(--fg);
}
h1, h2, h3, h4, h5, h6 {
    font-family: 'Playfair Display', Georgia, serif !important;
    color: var(--fg) !important;
}
p { color: var(--subtle); }

/* Force Streamlit containers to use bg */
.stApp, .main, div[data-testid="stAppViewContainer"],
div[data-testid="stMain"], div[data-testid="stMainBlockContainer"],
section[data-testid="stSidebar"], [class*="css"] {
    background: var(--bg) !important;
}

#MainMenu, footer, header, [data-testid="collapsedControl"] { display: none !important; }
div[data-testid="stMainBlockContainer"] { padding-top: 0 !important; }
.block-container { padding: 0 !important; max-width: 100% !important; }

/* ── Animations ─────────────────────────────────────────── */
@keyframes fadeInUp  { from{opacity:0;transform:translateY(28px)} to{opacity:1;transform:translateY(0)} }
@keyframes fadeIn    { from{opacity:0} to{opacity:1} }
@keyframes slideInLeft  { from{opacity:0;transform:translateX(-28px)} to{opacity:1;transform:translateX(0)} }
@keyframes slideInRight { from{opacity:0;transform:translateX(28px)}  to{opacity:1;transform:translateX(0)} }
@keyframes blob { 0%,100%{transform:translate(0,0) scale(1)} 33%{transform:translate(20px,-20px) scale(1.05)} 66%{transform:translate(-10px,15px) scale(0.95)} }
@keyframes shimmer { 0%{background-position:300% center} 100%{background-position:-300% center} }
@keyframes float  { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-10px)} }
@keyframes spin   { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }
@keyframes ping   { 75%,100%{transform:scale(2);opacity:0} }
@keyframes scanLine { 0%{top:-2px;opacity:.9} 100%{top:100%;opacity:0} }
@keyframes pulseGlow { 0%,100%{box-shadow:0 0 15px rgba(124,58,237,.2)} 50%{box-shadow:0 0 40px rgba(124,58,237,.45)} }

/* ── eBay listing cards ─────────────────────────────────── */
.ebay-card {
    background: var(--card) !important;
    border: 1px solid var(--border);
    border-radius: 12px; padding: 12px 14px; margin-bottom: 8px;
    display: flex; align-items: center; gap: 12px;
    text-decoration: none; color: inherit;
    transition: all 0.22s ease;
    position: relative; overflow: hidden;
}
.ebay-card:hover {
    border-color: rgba(124,58,237,0.35) !important;
    background: rgba(124,58,237,0.04) !important;
    transform: translateX(4px);
    box-shadow: 0 4px 20px rgba(124,58,237,0.08);
}

/* ── Background Orbs ─────────────────────────────────────── */
.orb { position:fixed; border-radius:50%; filter:blur(80px); pointer-events:none; z-index:0; }
.orb-1 { width:700px;height:700px; background:radial-gradient(circle,rgba(124,58,237,.06) 0%,transparent 70%); top:-128px;right:-128px; animation:blob 14s ease-in-out infinite; }
.orb-2 { width:500px;height:500px; background:radial-gradient(circle,rgba(245,158,11,.04) 0%,transparent 70%); top:33%;left:-80px; animation:blob 18s ease-in-out infinite 4s; }
.orb-3 { width:400px;height:400px; background:radial-gradient(circle,rgba(124,58,237,.03) 0%,transparent 70%); bottom:-160px;right:25%; animation:blob 11s ease-in-out infinite 8s; }

/* ── Navbar ──────────────────────────────────────────────── */
[data-testid="stHorizontalBlock"]:has(.nav-logo) {
    background: linear-gradient(90deg,hsl(0,0%,100%,.95),hsl(240,20%,97%,.95)) !important;
    backdrop-filter: blur(24px) !important; -webkit-backdrop-filter: blur(24px) !important;
    position: sticky !important; top: 0 !important; z-index: 100 !important;
    padding: 0 24px !important; min-height: 68px !important;
    border-bottom: 1px solid var(--border) !important;
    box-shadow: var(--shadow-nav) !important;
    align-items: center !important;
}
[data-testid="stHorizontalBlock"]:has(.nav-logo) > div { display:flex !important; align-items:center !important; }

.nav-logo {
    font-size: 22px; font-weight: 800; letter-spacing: -0.5px;
    font-family: 'Playfair Display', Georgia, serif;
    display: flex; align-items: center; gap: 10px; color: var(--fg);
}
.nav-dot {
    width: 32px; height: 32px; border-radius: 50%;
    background: linear-gradient(135deg, rgba(124,58,237,.2), rgba(245,158,11,.15));
    border: 1px solid rgba(124,58,237,.25);
    display: flex; align-items: center; justify-content: center; font-size: 15px;
}

/* Nav link buttons */
[data-testid="stHorizontalBlock"]:has(.nav-logo) [data-testid="stColumn"]:has(.nav-link) [data-testid="stButton"] > button {
    background: transparent !important; color: var(--subtle) !important;
    border: none !important; border-radius: 8px !important;
    padding: 6px 16px !important; width: auto !important;
    font-size: 14px !important; font-weight: 500 !important;
    font-family: 'DM Sans', sans-serif !important;
    box-shadow: none !important; transition: all 0.2s ease !important;
}
[data-testid="stHorizontalBlock"]:has(.nav-logo) [data-testid="stColumn"]:has(.nav-link) [data-testid="stButton"] > button:hover {
    color: var(--fg) !important; background: var(--secondary) !important;
}
/* Start Scan pill */
[data-testid="stHorizontalBlock"]:has(.nav-logo) [data-testid="stColumn"]:has(.nav-scan) [data-testid="stButton"] > button {
    background: linear-gradient(135deg, var(--primary), var(--primary-dk)) !important;
    border: none !important; color: #fff !important; border-radius: 999px !important;
    padding: 8px 22px !important; width: auto !important;
    font-size: 14px !important; font-weight: 700 !important;
    box-shadow: var(--shadow-cta) !important; transition: all 0.2s ease !important;
}
[data-testid="stHorizontalBlock"]:has(.nav-logo) [data-testid="stColumn"]:has(.nav-scan) [data-testid="stButton"] > button:hover {
    transform: translateY(-1px) !important; box-shadow: 0 6px 24px rgba(124,58,237,.4) !important;
}

/* ── Glass Cards ─────────────────────────────────────────── */
.glass-card {
    background: var(--card) !important;
    border: 1px solid var(--border);
    border-radius: 16px; padding: 32px; margin-bottom: 16px;
    box-shadow: var(--shadow-card);
    transition: border-color .3s, box-shadow .3s, transform .3s;
    animation: fadeInUp 0.45s ease both;
}
.glass-card:hover {
    border-color: rgba(124,58,237,.35);
    box-shadow: 0 8px 40px rgba(124,58,237,.08), 0 0 0 1px rgba(124,58,237,.05);
    transform: translateY(-1px);
}
.neon-border { border: 1px solid var(--primary) !important; animation: pulseGlow 3s infinite !important; }

/* ── Gradient & shimmer text ─────────────────────────────── */
.gradient-text {
    background: linear-gradient(135deg, hsl(262,75%,45%), hsl(38,95%,52%));
    -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text;
    font-weight: 800;
}
.text-shimmer {
    background: linear-gradient(90deg,hsl(262,75%,45%) 0%,hsl(38,95%,52%) 35%,hsl(262,75%,45%) 70%,hsl(38,95%,52%) 100%);
    background-size: 300% auto;
    -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text;
    animation: shimmer 6s linear infinite;
    font-weight: 800; font-family: 'Playfair Display', Georgia, serif;
}

/* ── Icon container (gradient border box) ───────────────── */
.icon-box {
    width: 56px; height: 56px; border-radius: 16px; margin: 0 auto 16px;
    display: flex; align-items: center; justify-content: center; font-size: 24px;
    background: linear-gradient(135deg,rgba(124,58,237,.1),rgba(245,158,11,.05));
    border: 1px solid rgba(124,58,237,.25);
}
.gradient-border-box {
    position: relative; border-radius: 16px;
    background: linear-gradient(135deg,rgba(124,58,237,.1),rgba(245,158,11,.05));
}
.gradient-border-box::before {
    content:''; position:absolute; inset:0; border-radius:inherit; padding:1px;
    background: linear-gradient(135deg,rgba(124,58,237,.4),rgba(245,158,11,.3));
    -webkit-mask: linear-gradient(#fff 0 0) content-box,linear-gradient(#fff 0 0);
    -webkit-mask-composite:xor; mask-composite:exclude; pointer-events:none;
}

/* ── Step tag ────────────────────────────────────────────── */
.step-tag {
    color: var(--primary); font-size: 11px; letter-spacing: 2px;
    font-weight: 700; margin-bottom: 12px; text-transform: uppercase;
    font-family: 'DM Sans', sans-serif; display: block;
}

/* ── Progress bar ───────────────────────────────────────── */
.progress-wrap { height: 3px; background: var(--border); border-radius: 999px; margin-bottom: 24px; overflow: hidden; }
.progress-fill  { height: 100%; border-radius: 999px; background: linear-gradient(90deg,var(--primary),var(--accent)); transition: width 0.6s cubic-bezier(.4,0,.2,1); }

/* ── Main CTA buttons (NOT inside navbar) ───────────────── */
[data-testid="stMainBlockContainer"] div[data-testid="stButton"] > button,
[data-testid="stVerticalBlock"] div[data-testid="stButton"] > button {
    background: linear-gradient(135deg, var(--primary), var(--primary-dk)) !important;
    color: #fff !important; border: none !important;
    border-radius: 12px !important; padding: 14px 28px !important;
    font-weight: 700 !important; font-size: 15px !important;
    font-family: 'DM Sans', sans-serif !important;
    width: 100% !important;
    box-shadow: var(--shadow-cta) !important;
    transition: all 0.2s ease !important;
}
[data-testid="stMainBlockContainer"] div[data-testid="stButton"] > button:hover,
[data-testid="stVerticalBlock"] div[data-testid="stButton"] > button:hover {
    transform: translateY(-2px) !important; box-shadow: 0 8px 28px rgba(124,58,237,.4) !important;
}

/* ── Form inputs ─────────────────────────────────────────── */
.stTextInput input, .stNumberInput input {
    background: var(--card) !important; border: 1px solid var(--border) !important;
    color: var(--fg) !important; border-radius: 12px !important;
    padding: 11px 14px !important; font-size: 14px !important;
    font-family: 'DM Sans', sans-serif !important;
    transition: border-color .2s, box-shadow .2s !important;
}
.stTextInput input:focus, .stNumberInput input:focus {
    border-color: var(--primary) !important;
    box-shadow: 0 0 0 3px rgba(124,58,237,.12) !important; outline: none !important;
}
.stTextInput label, .stNumberInput label, .stSelectbox label {
    color: var(--subtle) !important; font-size: 13px !important; font-family: 'DM Sans', sans-serif !important;
}
.stSelectbox > div > div {
    background: var(--card) !important; border: 1px solid var(--border) !important;
    color: var(--fg) !important; border-radius: 12px !important;
}
.stRadio label { color: var(--fg) !important; font-size: 14px !important; font-family: 'DM Sans', sans-serif !important; }
.stRadio > div { gap: 12px !important; }
.stSlider > div > div > div { background: var(--primary) !important; }
.stSlider label { color: var(--subtle) !important; font-size: 13px !important; }

/* File uploader */
[data-testid="stFileUploader"] section {
    background: var(--bg) !important; border: 1px dashed var(--border) !important;
    border-radius: 16px !important; transition: border-color .2s, background .2s !important;
}
[data-testid="stFileUploader"] section:hover {
    border-color: rgba(124,58,237,.4) !important; background: rgba(124,58,237,.03) !important;
}
/* Hero drop zone */
.home-uploader [data-testid="stFileUploader"] section {
    min-height: 100px !important; height: 100px !important;
    border: 1px solid var(--border) !important; border-radius: 16px !important;
    background: var(--bg) !important; display: flex !important;
    align-items: center !important; justify-content: center !important;
    cursor: pointer !important; width: 100% !important;
}
.home-uploader [data-testid="stFileUploader"] section:hover {
    border-color: rgba(124,58,237,.4) !important; box-shadow: 0 0 40px rgba(124,58,237,.08) !important;
}

[data-testid="stForm"] { border: none !important; padding: 0 !important; background: transparent !important; }
[data-testid="stMetric"] {
    background: var(--card) !important; border: 1px solid var(--border);
    border-radius: 14px; padding: 16px 20px; transition: transform .2s, border-color .2s;
    box-shadow: var(--shadow-card);
}
[data-testid="stMetric"]:hover { transform: translateY(-2px); border-color: rgba(124,58,237,.3); }
[data-testid="stMetricValue"] { color: var(--primary) !important; font-size: 22px !important; font-weight: 700 !important; font-family: 'Playfair Display', Georgia, serif !important; }
[data-testid="stMetricLabel"] { color: var(--subtle) !important; font-size: 12px !important; }
details > summary { color: var(--subtle) !important; }
.stTabs [data-baseweb="tab-list"] { background: var(--secondary) !important; border-radius: 12px !important; padding: 4px !important; gap: 4px !important; border: none !important; }
.stTabs [data-baseweb="tab"] { background: transparent !important; color: var(--subtle) !important; border-radius: 8px !important; border: none !important; font-family: 'DM Sans', sans-serif !important; }
.stTabs [aria-selected="true"] { background: var(--card) !important; color: var(--fg) !important; box-shadow: 0 1px 4px rgba(0,0,0,.08) !important; }
.stCode, pre { background: var(--bg) !important; border: 1px solid var(--border) !important; border-radius: 10px !important; }
pre { color: var(--primary) !important; }
hr { border-color: var(--border) !important; }

::-webkit-scrollbar { width: 5px; }
::-webkit-scrollbar-track { background: var(--bg); }
::-webkit-scrollbar-thumb { background: rgba(124,58,237,.3); border-radius: 3px; }

/* ── Hero badge ─────────────────────────────────────────── */
.hero-badge {
    display: inline-flex; align-items: center; gap: 10px;
    background: linear-gradient(135deg, rgba(124,58,237,.08), rgba(245,158,11,.05));
    border: 1px solid rgba(124,58,237,.2);
    border-radius: 999px; padding: 8px 20px;
    font-size: 12px; color: var(--subtle); font-weight: 500;
    letter-spacing: .02em; margin-bottom: 28px; animation: fadeInUp 0.3s ease both;
    font-family: 'DM Sans', sans-serif;
}
.badge-dot {
    width: 8px; height: 8px; border-radius: 50%;
    background: linear-gradient(135deg, hsl(262,75%,55%), hsl(38,95%,52%));
    display: inline-block; animation: ping 1.5s infinite; flex-shrink: 0;
}

/* ── Stat cards ─────────────────────────────────────────── */
.stat-card {
    background: var(--card) !important; border: 1px solid var(--border);
    border-radius: 16px; padding: 24px 16px; text-align: center;
    transition: all .3s ease; animation: fadeInUp 0.5s ease both;
    box-shadow: var(--shadow-card);
}
.stat-card:hover { transform: translateY(-4px); border-color: rgba(124,58,237,.3); box-shadow: 0 12px 40px rgba(124,58,237,.1); }

/* ── How It Works step cards ────────────────────────────── */
.how-card {
    background: var(--card) !important; border: 1px solid var(--border);
    border-radius: 16px; padding: 32px; transition: all .3s ease;
    animation: fadeInUp 0.5s ease both; position: relative; overflow: hidden;
    box-shadow: var(--shadow-card);
}
.how-card::after { content:''; position:absolute; top:0; left:0; right:0; height:2px; background:linear-gradient(90deg,transparent,var(--primary),transparent); opacity:0; transition:opacity .3s; }
.how-card:hover { border-color:rgba(124,58,237,.25); transform:translateY(-4px); box-shadow:0 12px 40px rgba(124,58,237,.1); }
.how-card:hover::after { opacity:1; }

/* ── Dashboard scan history cards ──────────────────────── */
.scan-hist-card {
    background: var(--card) !important; border: 1px solid var(--border);
    border-radius: 16px; padding: 20px 24px; margin-bottom: 12px;
    transition: all .2s ease; animation: fadeInUp 0.4s ease both;
    box-shadow: var(--shadow-card);
}
.scan-hist-card:hover { border-color:rgba(124,58,237,.25); transform:translateX(4px); }

/* ── Loading scan line ──────────────────────────────────── */
.img-scan-wrap { position:relative; overflow:hidden; border-radius:12px; }
.scan-line-anim { position:absolute; left:0; right:0; height:2px; background:linear-gradient(90deg,transparent,var(--primary),transparent); animation:scanLine 2.5s ease-in-out infinite; }
</style>
""", unsafe_allow_html=True)

# ─── Background orbs (always on) ─────────────────────────────────────────────
st.markdown("""
<div class="orb orb-1"></div>
<div class="orb orb-2"></div>
<div class="orb orb-3"></div>
""", unsafe_allow_html=True)

# ─── Session state ────────────────────────────────────────────────────────────
for key, val in [
    ("step", 1), ("device_data", {}), ("scan_history", []), ("prefill", {})
]:
    if key not in st.session_state:
        st.session_state[key] = val


def move_to(step):
    st.session_state.step = step
    st.rerun()


# ─── AI helpers ───────────────────────────────────────────────────────────────
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


IDENTIFY_PROMPT = """
Look at these photos of an item and identify it as accurately as possible.
For each field provide a value AND confidence: "certain", "likely", or "unknown".
Return ONLY valid JSON — no markdown:
{
  "device_name":      {"value": "e.g. Air Jordan 1",  "confidence": "certain|likely|unknown"},
  "brand":            {"value": "e.g. Nike",           "confidence": "certain|likely|unknown"},
  "model":            {"value": "e.g. Size 10, Red",   "confidence": "certain|likely|unknown"},
  "year":             {"value": 2020,                  "confidence": "certain|likely|unknown"},
  "item_category":    {"value": "e.g. Footwear",       "confidence": "certain|likely|unknown"},
  "item_condition":   {"value": "Like New|Good|Fair|Poor", "confidence": "certain|likely|unknown"}
}
If unknown, set value to null and confidence to "unknown".
"""


def extract_video_frames(video_bytes: bytes, max_frames: int = 5) -> list:
    if not CV2_AVAILABLE:
        return []
    with tempfile.NamedTemporaryFile(suffix=".mp4", delete=False) as tmp:
        tmp.write(video_bytes)
        tmp_path = tmp.name
    try:
        cap = cv2.VideoCapture(tmp_path)
        total = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
        if total == 0:
            return []
        frames = []
        for i in range(max_frames):
            cap.set(cv2.CAP_PROP_POS_FRAMES, int(i * total / max_frames))
            ret, frame = cap.read()
            if ret:
                _, buf = cv2.imencode(".jpg", frame)
                frames.append(buf.tobytes())
        cap.release()
        return frames
    finally:
        os.unlink(tmp_path)


def identify_device(photo_bytes_list: list) -> dict:
    client = anthropic.Anthropic()
    blocks = [make_image_block(b) for b in photo_bytes_list[:4]]
    blocks.append({"type": "text", "text": IDENTIFY_PROMPT})
    resp = client.messages.create(
        model="claude-sonnet-4-5", max_tokens=600,
        messages=[{"role": "user", "content": blocks}],
    )
    return extract_json(resp.content[0].text)


def analyze_device(name, brand, model, year, photo_bytes_list):
    client = anthropic.Anthropic()
    blocks = [make_image_block(b) for b in photo_bytes_list]
    blocks.append({"type": "text", "text": ANALYSIS_PROMPT.format(
        name=name, brand=brand, model=model, year=year)})
    resp = client.messages.create(
        model="claude-sonnet-4-5", max_tokens=1500,
        tools=[{"type": "web_search_20250305", "name": "web_search", "max_uses": 3}],
        messages=[{"role": "user", "content": blocks}],
    )
    for block in reversed(resp.content):
        if block.type == "text" and block.text.strip():
            return extract_json(block.text)
    raise ValueError("No response from Claude.")


def generate_listing(r, brand, model, year, final_price):
    client = anthropic.Anthropic()
    resp = client.messages.create(
        model="claude-sonnet-4-5", max_tokens=1500,
        messages=[{"role": "user", "content": LISTING_PROMPT.format(
            device=r["device_identified"], brand=brand, model=model, year=year,
            condition=r["condition"], notes=r["condition_notes"],
            low=final_price, high=final_price,
        )}],
    )
    return extract_json(resp.content[0].text)


# ─── Progress bar helper ──────────────────────────────────────────────────────
STEP_PROGRESS = {2: 10, 3: 35, 4: 55, "listings_preview": 72, 5: 85, 6: 100}

def show_progress(step):
    pct = STEP_PROGRESS.get(step, 0)
    st.markdown(f"""
    <div class="progress-wrap">
        <div class="progress-fill" style="width:{pct}%;"></div>
    </div>
    """, unsafe_allow_html=True)


# ─── Navbar ───────────────────────────────────────────────────────────────────
def navbar():
    c_logo, c_gap1, c_home, c_how, c_dash, c_gap2, c_scan = st.columns(
        [2.2, 1.5, 0.9, 1.2, 1.3, 1.5, 1.0]
    )
    c_logo.markdown("""
        <div class="nav-logo">
            <div class="nav-dot">💰</div> SnapSell
        </div>
    """, unsafe_allow_html=True)

    with c_home:
        st.markdown('<div class="nav-link">', unsafe_allow_html=True)
        if st.button("Home", key="nb_home"):
            move_to(1)
        st.markdown('</div>', unsafe_allow_html=True)

    with c_how:
        st.markdown('<div class="nav-link">', unsafe_allow_html=True)
        if st.button("How It Works", key="nb_how"):
            move_to("howitworks")
        st.markdown('</div>', unsafe_allow_html=True)

    with c_dash:
        st.markdown('<div class="nav-link">', unsafe_allow_html=True)
        if st.button("My Dashboard", key="nb_dash"):
            move_to("dashboard")
        st.markdown('</div>', unsafe_allow_html=True)

    with c_scan:
        st.markdown('<div class="nav-scan">', unsafe_allow_html=True)
        if st.button("Snap & Sell", key="nb_scan"):
            move_to(2)
        st.markdown('</div>', unsafe_allow_html=True)


# ══════════════════════════════════════════════════════════════════════════════
# PAGE 1 — HERO
# ══════════════════════════════════════════════════════════════════════════════
def page_hero():
    navbar()
    _, col, _ = st.columns([1, 3, 1])
    with col:
        # Badge
        st.markdown("""
        <div style="text-align:center; padding:80px 0 0;">
        <div class="hero-badge">
            <span class="badge-dot"></span>
            AI-Powered · Any Item · Free to Use
        </div>
        """, unsafe_allow_html=True)

        # Headline
        st.markdown("""
        <h1 style="font-size:clamp(40px,5vw,64px); font-weight:800; line-height:1.08;
                   margin:0 0 24px; color:var(--fg); letter-spacing:-1px; text-align:center;
                   font-family:'Playfair Display',Georgia,serif; animation:fadeInUp .4s ease both .1s;">
            Snap Anything.<br><span class="text-shimmer">Know Its Worth.</span>
        </h1>
        <p style="color:var(--subtle); font-size:18px; max-width:520px; margin:0 auto 48px;
                  line-height:1.75; text-align:center; animation:fadeInUp .5s ease both .2s;
                  font-family:'DM Sans',sans-serif;">
            Photograph any item — from sneakers to game consoles — and instantly discover its
            resale value, comparable sold listings, and a ready-to-post eBay listing.
        </p>
        </div>
        """, unsafe_allow_html=True)

        # CTA row: button + drop zone
        btn_col, up_col = st.columns([1, 1], gap="large")
        with btn_col:
            st.markdown("<div style='padding-top:4px;'>", unsafe_allow_html=True)
            if st.button("Start Scanning →", key="hero_cta"):
                move_to(2)
            st.markdown("</div>", unsafe_allow_html=True)

        with up_col:
            st.markdown("""
            <p style="font-size:14px; font-weight:600; color:var(--fg); margin:0 0 8px;">
                Drop a photo or video to begin
            </p>""", unsafe_allow_html=True)
            st.markdown('<div class="home-uploader">', unsafe_allow_html=True)
            hero_files = st.file_uploader(
                "Upload", type=["jpg","jpeg","png","webp","mp4","mov","avi"],
                accept_multiple_files=True, label_visibility="collapsed", key="hero_upload",
            )
            st.markdown('</div>', unsafe_allow_html=True)

            if hero_files:
                photo_bytes_list = []
                for f in hero_files:
                    f.seek(0); data = f.read()
                    if f.name.lower().endswith((".mp4",".mov",".avi",".mkv")):
                        photo_bytes_list.extend(extract_video_frames(data, max_frames=5))
                    else:
                        photo_bytes_list.append(data)
                if photo_bytes_list:
                    st.markdown(f"""
                    <div style="background:rgba(124,58,237,.07);border:1px solid rgba(124,58,237,.2);
                         border-radius:10px;padding:8px 14px;font-size:13px;color:var(--primary);margin:8px 0 6px;">
                        ✓ {len(photo_bytes_list)} file(s) ready
                    </div>""", unsafe_allow_html=True)
                    if st.button("Scan Now — AI will auto-identify →", key="hero_scan_now"):
                        st.session_state.photo_bytes = photo_bytes_list
                        with st.spinner("Identifying your item..."):
                            try:
                                st.session_state.prefill = identify_device(photo_bytes_list)
                            except Exception:
                                st.session_state.prefill = {}
                        move_to(3)

        st.markdown("<br>", unsafe_allow_html=True)

        # 3-step explainer card
        st.markdown("""
        <div class="glass-card" style="animation-delay:.4s;">
          <div style="display:flex;justify-content:space-around;align-items:center;flex-wrap:wrap;gap:24px;">
            <div style="display:flex;align-items:center;gap:12px;">
              <span class="gradient-text" style="font-size:28px;font-family:'Playfair Display',serif;">01</span>
              <div>
                <div style="font-size:14px;font-weight:600;color:var(--fg);">Upload Media</div>
                <div style="font-size:12px;color:var(--subtle);">Photo or video</div>
              </div>
            </div>
            <span style="color:var(--faintest);font-size:18px;">→</span>
            <div style="display:flex;align-items:center;gap:12px;">
              <span class="gradient-text" style="font-size:28px;font-family:'Playfair Display',serif;">02</span>
              <div>
                <div style="font-size:14px;font-weight:600;color:var(--fg);">AI Analysis</div>
                <div style="font-size:12px;color:var(--subtle);">Instant detection</div>
              </div>
            </div>
            <span style="color:var(--faintest);font-size:18px;">→</span>
            <div style="display:flex;align-items:center;gap:12px;">
              <span class="gradient-text" style="font-size:28px;font-family:'Playfair Display',serif;">03</span>
              <div>
                <div style="font-size:14px;font-weight:600;color:var(--fg);">Get Your Listing</div>
                <div style="font-size:12px;color:var(--subtle);">Sell in minutes</div>
              </div>
            </div>
          </div>
        </div>
        """, unsafe_allow_html=True)

        st.markdown("<div style='height:64px;'></div>", unsafe_allow_html=True)

        # Stats row
        s1, s2, s3, s4 = st.columns(4, gap="small")
        for col_obj, num, label, delay in [
            (s1, "50K+",  "Items Scanned",   "0.4s"),
            (s2, "$2.1M", "Value Recovered",  "0.5s"),
            (s3, "120+",  "Item Categories",  "0.6s"),
            (s4, "4.9★",  "User Rating",      "0.7s"),
        ]:
            col_obj.markdown(f"""
            <div class="stat-card" style="animation-delay:{delay};">
                <div class="gradient-text" style="font-size:clamp(22px,2vw,30px);font-family:'Playfair Display',serif;">{num}</div>
                <div style="font-size:12px;color:var(--subtle);margin-top:4px;font-weight:500;">{label}</div>
            </div>
            """, unsafe_allow_html=True)


# ══════════════════════════════════════════════════════════════════════════════
# PAGE: HOW IT WORKS
# ══════════════════════════════════════════════════════════════════════════════
def page_how_it_works():
    navbar()
    _, col, _ = st.columns([1, 4, 1])
    with col:
        st.markdown("""
        <div style='text-align:center; padding:40px 0 48px; animation: fadeInUp 0.4s ease both;'>
            <div class="step-tag">SnapSell · How It Works</div>
            <h1 style='font-size:48px; font-weight:800; margin-bottom:12px;
                       font-family:"Playfair Display",Georgia,serif; letter-spacing:-0.5px;'>
                Simple. Smart. <span class="text-shimmer">Instant.</span>
            </h1>
            <p style='color:var(--subtle); font-size:17px; max-width:520px; margin:0 auto; line-height:1.75;'>
                Four easy steps from any item to cash in your pocket.
            </p>
        </div>
        """, unsafe_allow_html=True)

    # 4 step cards
    c1, c2 = st.columns(2, gap="large")
    steps = [
        ("📸", "Step 1", "Upload Your Item", "01",
         "Take a photo or record a short video of the item you want to sell. Show the front, back, labels, and any visible wear or damage. The more angles the better — our AI uses every pixel to assess condition.",
         "Supports JPG, PNG, WEBP photos and MP4, MOV, AVI videos.", "0.3s"),
        ("🤖", "Step 2", "AI Auto-Identification", "02",
         "Claude AI analyzes your media and automatically identifies the item name, brand, model, category, and condition — with a confidence score for each field.",
         "You only need to fill in what the AI isn't sure about.", "0.4s"),
        ("📊", "Step 3", "Live Market Pricing", "03",
         "SnapSell searches real eBay listings in real time to find what your exact item is actually selling for — not guesses, not outdated data. Prices reflect today's resale market.",
         "Compares against 3+ sold listings with condition matching.", "0.5s"),
        ("📋", "Step 4", "Your Ready-to-Post Listing", "04",
         "Receive a fully written eBay listing: keyword-rich title, honest condition description, suggested shipping method, and relevant search tags. One click to copy, paste, and sell.",
         "Or choose Trade-In for store credit, or Donate to a good cause.", "0.6s"),
    ]

    for i, (icon, tag, title, num, desc, sub, delay) in enumerate(steps):
        target_col = c1 if i % 2 == 0 else c2
        with target_col:
            st.markdown(f"""
            <div class="how-card" style="animation-delay:{delay};">
                <div style="display:flex; align-items:flex-start; gap:20px; margin-bottom:20px;">
                    <div style="font-size:36px; animation: float 4s ease-in-out infinite;">{icon}</div>
                    <div>
                        <div style="font-size:10px; color:var(--primary); letter-spacing:2px; font-weight:700;
                                    text-transform:uppercase; margin-bottom:4px;">{tag}</div>
                        <h3 style="font-size:20px; font-weight:700; margin:0;">{title}</h3>
                    </div>
                    <div style="margin-left:auto; font-size:48px; font-weight:800;
                                color:rgba(124,58,237,0.1); line-height:1;">{num}</div>
                </div>
                <p style="color:#4b5563; font-size:14px; line-height:1.75; margin-bottom:12px;">{desc}</p>
                <div style="background:rgba(124,58,237,0.06); border:1px solid rgba(124,58,237,0.15);
                     border-radius:8px; padding:10px 14px; font-size:12px; color:var(--primary);">
                    ✦ {sub}
                </div>
            </div>
            """, unsafe_allow_html=True)

    st.markdown("<br><br>", unsafe_allow_html=True)

    # Why SnapSell section
    _, mid, _ = st.columns([1, 4, 1])
    with mid:
        st.markdown("""
        <h2 style='font-size:34px; font-weight:800; text-align:center; margin-bottom:36px;
                   animation: fadeInUp 0.5s ease both;'>
            Why <span class="gradient-text">SnapSell?</span>
        </h2>
        """, unsafe_allow_html=True)

        w1, w2, w3 = st.columns(3)
        for wcol, icon, title, body in [
            (w1, "⚡", "Instant Results",
             "No waiting. AI analysis + market search completes in under 30 seconds with real-time eBay data."),
            (w2, "🎯", "Accurate Pricing",
             "We search actual sold listings — not asking prices. You see what buyers are really paying right now."),
            (w3, "📦", "Any Item Category",
             "Sneakers, electronics, clothing, collectibles, furniture — if it sells on eBay, SnapSell can price it."),
        ]:
            wcol.markdown(f"""
            <div class="glass-card" style="text-align:center; padding:28px 24px;">
                <div style="font-size:32px; margin-bottom:14px; animation: float 5s ease-in-out infinite;">{icon}</div>
                <h4 style="font-size:16px; font-weight:700; margin-bottom:10px;">{title}</h4>
                <p style="color:#4b5563; font-size:13px; line-height:1.7; margin:0;">{body}</p>
            </div>
            """, unsafe_allow_html=True)

        st.markdown("<br>", unsafe_allow_html=True)

        # FAQ
        st.markdown("<h3 style='font-size:26px; font-weight:700; margin-bottom:8px;'>Frequently Asked Questions</h3>", unsafe_allow_html=True)
        st.markdown("<hr>", unsafe_allow_html=True)

        faqs = [
            ("Is SnapSell free to use?",
             "Yes, completely free. Just add your Anthropic API key in the .env file and you're ready to go."),
            ("What items can I scan?",
             "Anything resellable: sneakers, electronics, clothing, collectibles, games, instruments, jewelry, furniture, and more. If eBay sells it, SnapSell can price it."),
            ("How accurate are the prices?",
             "Very accurate — we pull from real completed eBay listings filtered by condition. Prices update in real time with each scan."),
            ("What happens to my photos?",
             "Photos are sent directly to Claude AI for analysis and are never stored. Each scan is processed fresh."),
            ("Can I use this for trade-ins or donations too?",
             "Absolutely. After the AI analysis, you can choose to get a sell listing, trade-in links (Best Buy, Apple, Amazon), or donation center locations."),
        ]
        for q, a in faqs:
            with st.expander(q):
                st.markdown(f"<p style='color:#4b5563; font-size:14px; line-height:1.75; margin:0;'>{a}</p>",
                            unsafe_allow_html=True)

        st.markdown("<br>", unsafe_allow_html=True)
        if st.button("Start Your First Scan →", key="hiw_cta"):
            move_to(2)


# ══════════════════════════════════════════════════════════════════════════════
# PAGE: MY DASHBOARD
# ══════════════════════════════════════════════════════════════════════════════
def page_dashboard():
    navbar()
    _, col, _ = st.columns([1, 4, 1])
    with col:
        history = st.session_state.scan_history

        st.markdown("""
        <div style='padding:40px 0 32px; animation: fadeInUp 0.4s ease both;'>
            <div class="step-tag">My Dashboard</div>
            <h1 style='font-size:40px; font-weight:800; margin-bottom:8px;
                       font-family:"Playfair Display",Georgia,serif;'>Your Scan History</h1>
            <p style='color:var(--subtle); margin-bottom:32px;'>Every item you've scanned this session.</p>
        </div>
        """, unsafe_allow_html=True)

        if not history:
            st.markdown("""
            <div class="glass-card" style="text-align:center; padding:64px 40px;">
                <div style="font-size:52px; margin-bottom:20px; animation: float 4s ease-in-out infinite;">📭</div>
                <h3 style="font-size:22px; font-weight:700; margin-bottom:10px;">No scans yet</h3>
                <p style="color:#4b5563; font-size:15px; margin-bottom:28px; max-width:360px; margin-left:auto; margin-right:auto; line-height:1.7;">
                    Scan your first item and it'll show up here with the full analysis, condition grade, and estimated value.
                </p>
            </div>
            """, unsafe_allow_html=True)
            if st.button("Scan Your First Item →", key="dash_cta"):
                move_to(2)
        else:
            # Summary metrics
            total_value = sum(s.get("value", 0) for s in history)
            m1, m2 = st.columns(2)
            m1.metric("Items Scanned", len(history))
            m2.metric("Total Est. Value", f"${total_value:,}")

            st.markdown("<br>", unsafe_allow_html=True)

            condition_colors = {"Excellent": "hsl(262,75%,55%)", "Good": "hsl(262,65%,65%)", "Fair": "#C9A227", "Poor": "#ef4444"}
            decision_icons = {"sell": "💰", "trade-in": "🏪", "donate": "🎁"}

            for i, scan in enumerate(reversed(history)):
                cond  = scan.get("condition", "—")
                dec   = scan.get("decision", "donate")
                color = condition_colors.get(cond, "#6b7280")
                icon  = decision_icons.get(dec, "🎁")
                delay = f"{0.1 * i:.1f}s"

                st.markdown(f"""
                <div class="scan-hist-card" style="animation-delay:{delay};">
                    <div style="display:flex; align-items:center; justify-content:space-between; flex-wrap:wrap; gap:12px;">
                        <div style="display:flex; align-items:center; gap:16px;">
                            <div style="font-size:28px;">{icon}</div>
                            <div>
                                <div style="font-size:16px; font-weight:700;">{scan.get("device", "Unknown Item")}</div>
                                <div style="font-size:12px; color:#6b7280; margin-top:2px;">
                                    {scan.get("date", "")} &nbsp;·&nbsp; Brand: {scan.get("brand", "—")}
                                </div>
                            </div>
                        </div>
                        <div style="display:flex; align-items:center; gap:20px;">
                            <div style="text-align:right;">
                                <div style="font-size:22px; font-weight:800; color:var(--primary);">
                                    ${scan.get("value", 0)}
                                </div>
                                <div style="font-size:11px; color:#6b7280;">Est. Value</div>
                            </div>
                            <div style="padding:5px 14px; border-radius:999px; font-size:11px;
                                        font-weight:700; letter-spacing:1px; text-transform:uppercase;
                                        background:rgba(124,58,237,0.08); border:1px solid {color};
                                        color:{color};">
                                {cond}
                            </div>
                        </div>
                    </div>
                </div>
                """, unsafe_allow_html=True)

            st.markdown("<br>", unsafe_allow_html=True)
            c1, c2 = st.columns(2)
            with c1:
                if st.button("Scan Another Item →", key="dash_scan"):
                    move_to(2)
            with c2:
                st.markdown('<div style="opacity:0.6;">', unsafe_allow_html=True)
                if st.button("Clear History", key="dash_clear"):
                    st.session_state.scan_history = []
                    st.rerun()
                st.markdown('</div>', unsafe_allow_html=True)


# ══════════════════════════════════════════════════════════════════════════════
# PAGE 2 — UPLOAD
# ══════════════════════════════════════════════════════════════════════════════
def page_upload():
    navbar()
    show_progress(2)
    _, col, _ = st.columns([1, 2, 1])
    with col:
        st.markdown("""
        <div style='text-align:center; padding:32px 0 24px; animation:fadeInUp .4s ease both;'>
            <span class="step-tag">Step 1 of 4</span>
            <div class="icon-box">📸</div>
            <h2 style='font-size:clamp(24px,3vw,36px); font-weight:800; margin-bottom:8px;
                       font-family:"Playfair Display",Georgia,serif;'>Upload Your Item</h2>
            <p style='color:var(--subtle); font-size:14px; max-width:400px; margin:0 auto; line-height:1.65;'>
                Show us the item from multiple angles for the most accurate valuation.
            </p>
        </div>
        """, unsafe_allow_html=True)

        tab_photos, tab_video = st.tabs(["📷  Photos", "🎥  Video"])
        photo_bytes_list = []

        with tab_photos:
            uploaded = st.file_uploader(
                "Upload item photos", type=["jpg","jpeg","png","webp"],
                accept_multiple_files=True, label_visibility="collapsed", key="photo_up",
            )
            if uploaded:
                pcols = st.columns(min(len(uploaded), 4))
                for i, f in enumerate(uploaded[:4]):
                    try:
                        f.seek(0); pcols[i].image(f, use_container_width=True)
                    except Exception:
                        pcols[i].caption("Preview unavailable")
                for f in uploaded:
                    f.seek(0); photo_bytes_list.append(f.read())

        with tab_video:
            if not CV2_AVAILABLE:
                st.warning("Video support requires opencv-python.")
            else:
                vfile = st.file_uploader(
                    "Upload item video", type=["mp4","mov","avi","mkv"],
                    accept_multiple_files=False, label_visibility="collapsed", key="video_up",
                )
                if vfile:
                    st.video(vfile)
                    st.markdown("<p style='color:var(--subtle);font-size:12px;margin-top:8px;'>5 frames will be extracted and sent to AI.</p>", unsafe_allow_html=True)
                    vfile.seek(0)
                    frames = extract_video_frames(vfile.read(), max_frames=5)
                    if frames:
                        photo_bytes_list = frames
                    else:
                        st.error("Could not extract frames. Try photos instead.")

        st.markdown("<br>", unsafe_allow_html=True)

        if photo_bytes_list:
            st.markdown(f"""
            <div style="background:linear-gradient(135deg,rgba(124,58,237,.08),rgba(245,158,11,.04));
                 border:1px solid rgba(124,58,237,.2); border-radius:12px;
                 padding:12px 16px; font-size:13px; color:var(--primary); margin-bottom:16px;
                 display:flex; align-items:center; gap:8px;">
                ✓ {len(photo_bytes_list)} image(s) ready · AI will auto-identify your item
            </div>
            """, unsafe_allow_html=True)
            if st.button("Continue — AI will auto-fill details →", key="up_next"):
                st.session_state.photo_bytes = photo_bytes_list
                with st.spinner("Identifying item..."):
                    try:
                        st.session_state.prefill = identify_device(photo_bytes_list)
                    except Exception:
                        st.session_state.prefill = {}
                move_to(3)
        else:
            st.markdown("<p style='text-align:center;color:var(--faintest);font-size:13px;margin-top:8px;'>Drop photos here or click Browse above</p>", unsafe_allow_html=True)

        st.markdown("<br>", unsafe_allow_html=True)
        if st.button("← Back", key="up_back"):
            move_to(1)


# ══════════════════════════════════════════════════════════════════════════════
# PAGE 3 — DIAGNOSTICS
# ══════════════════════════════════════════════════════════════════════════════
def page_diagnostics():
    navbar()
    show_progress(3)

    pf = st.session_state.get("prefill", {})

    def pf_val(key, fallback=None):
        f = pf.get(key, {})
        if f.get("confidence") in ("certain", "likely") and f.get("value") not in (None, ""):
            return f["value"]
        return fallback

    def pf_unknown(key):
        return pf.get(key, {}).get("confidence", "unknown") == "unknown"

    _, col, _ = st.columns([1, 2, 1])
    with col:
        st.markdown("""
        <div style='text-align:center; padding:32px 0 20px; animation:fadeInUp .4s ease both;'>
            <span class="step-tag">Step 2 of 4</span>
            <div class="icon-box">🔍</div>
            <h2 style='font-size:clamp(24px,3vw,36px); font-weight:800; margin-bottom:6px;
                       font-family:"Playfair Display",Georgia,serif;'>Item Details</h2>
        </div>
        """, unsafe_allow_html=True)

        if pf:
            filled  = sum(1 for k in ("device_name","brand","model","year","item_category","item_condition") if not pf_unknown(k))
            unknown = 6 - filled
            if unknown > 0:
                st.markdown(f"""
                <div style='background:linear-gradient(135deg,rgba(124,58,237,.06),rgba(245,158,11,.04));
                     border:1px solid rgba(124,58,237,.2); border-radius:12px;
                     padding:12px 16px; font-size:13px; margin-bottom:16px; animation:fadeInUp .3s ease both;
                     display:flex; align-items:flex-start; gap:8px;'>
                    <span style="color:var(--primary);">✓</span>
                    <span>
                        <span style="color:var(--primary);font-weight:600;">AI filled in {filled} field(s) automatically.</span>
                        <span style="color:var(--accent);"> {unknown} field(s) couldn't be determined — please complete them below.</span>
                    </span>
                </div>
                """, unsafe_allow_html=True)
            else:
                st.markdown("""
                <div style='background:linear-gradient(135deg,rgba(124,58,237,.08),transparent);
                     border:1px solid rgba(124,58,237,.2); border-radius:12px;
                     padding:12px 16px; font-size:13px; color:var(--primary); margin-bottom:16px;
                     display:flex; align-items:center; gap:8px; animation:fadeInUp .3s ease both;'>
                    ✓ AI identified all fields from your media
                </div>
                """, unsafe_allow_html=True)
        else:
            st.markdown("<p style='color:var(--subtle);margin-bottom:16px;font-size:14px;'>A few details help us nail the market price.</p>", unsafe_allow_html=True)

        def flabel(label, key):
            return f"{label} ⚠️" if pf and pf_unknown(key) else label

        st.markdown('<div class="glass-card">', unsafe_allow_html=True)
        with st.form("diag_form"):
            name  = st.text_input(flabel("Item Name", "device_name"), value=pf_val("device_name", ""), placeholder="e.g. Air Jordan 1, Xbox Series X, Levi's Jacket")
            brand = st.text_input(flabel("Brand (if any)", "brand"), value=pf_val("brand", ""), placeholder="e.g. Nike, Microsoft, Sony")
            model = st.text_input(flabel("Model / Variant (optional)", "model"), value=pf_val("model", ""), placeholder="e.g. Size 10, 1TB, Blue")

            py = pf_val("year", 2020)
            try: py = int(py)
            except: py = 2020
            year = st.number_input(flabel("Year / Age", "year"), min_value=1990, max_value=2030, value=py, step=1)

            category_opts = ["Electronics", "Clothing & Apparel", "Footwear", "Collectibles & Art", "Sports & Outdoors", "Home & Garden", "Toys & Games", "Musical Instruments", "Books & Media", "Jewelry & Watches", "Other"]
            pc = pf_val("item_category", "Electronics")
            cat_idx = category_opts.index(pc) if pc in category_opts else 0
            category = st.selectbox(flabel("Item Category", "item_category"), category_opts, index=cat_idx)

            condition_opts = ["Like New", "Good", "Fair", "Poor"]
            pcond = pf_val("item_condition", "Good")
            cond_idx = condition_opts.index(pcond) if pcond in condition_opts else 1
            item_condition = st.selectbox(flabel("Item Condition", "item_condition"), condition_opts, index=cond_idx)

            submitted = st.form_submit_button("Analyze & Price Item →")
        st.markdown('</div>', unsafe_allow_html=True)

        if pf:
            st.markdown("<p style='color:var(--faintest);font-size:11px;margin-top:4px;'>⚠️ marks fields the AI was unsure about — please verify.</p>", unsafe_allow_html=True)

        if submitted:
            if not name or not brand:
                st.error("Please provide at least an Item Name and Brand.")
            else:
                st.session_state.device_data = {
                    "name": name, "brand": brand,
                    "model": model or name, "year": int(year),
                    "item_category": category, "item_condition": item_condition,
                }
                move_to(4)

        st.markdown("<br>", unsafe_allow_html=True)
        if st.button("← Back", key="diag_back"):
            move_to(2)


# ══════════════════════════════════════════════════════════════════════════════
# PAGE 4 — LOADING
# ══════════════════════════════════════════════════════════════════════════════
def page_loading():
    navbar()
    show_progress(4)
    _, col, _ = st.columns([1, 2, 1])
    with col:
        st.markdown("""
        <div style='text-align:center; padding:60px 0 32px; animation: fadeInUp 0.4s ease both;'>
            <div style='font-size:56px; animation: spin 2s linear infinite; display:inline-block; margin-bottom:24px;'>⟳</div>
            <h2 style='font-size:32px; font-weight:800; margin-bottom:8px;
                       font-family:"Playfair Display",Georgia,serif;'>Analyzing Marketplace</h2>
            <p style='color:var(--primary); font-size:14px; font-weight:500;'>Searching live eBay listings · Grading condition · Building valuation</p>
        </div>
        """, unsafe_allow_html=True)

        st.markdown(f"""
        <div style='background:rgba(124,58,237,0.07); border:1px solid rgba(124,58,237,0.2);
             border-radius:14px; padding:22px 28px; color:#4b5563; font-size:14px; line-height:1.75;
             animation: fadeInUp 0.5s ease both 0.3s;'>
            <span style='color:var(--primary); font-weight:700;'>💡 Did you know?</span><br>
            {random.choice(MARKETPLACE_TIPS)}
        </div>
        """, unsafe_allow_html=True)

    if "analysis" not in st.session_state:
        p = st.session_state.device_data
        with st.spinner(""):
            try:
                result = analyze_device(
                    p["name"], p["brand"], p["model"], p["year"],
                    st.session_state.photo_bytes,
                )
                st.session_state.analysis = result
                low  = result.get("estimated_value_low", 0)
                high = result.get("estimated_value_high", 0)
                st.session_state.scan_history.append({
                    "device":    result.get("device_identified", p["name"]),
                    "brand":     p["brand"],
                    "condition": result.get("condition", "—"),
                    "decision":  result.get("decision", "donate"),
                    "value":     int((low + high) / 2),
                    "date":      datetime.now().strftime("%b %d, %Y"),
                })
                move_to("listings_preview")
            except Exception as e:
                st.error(f"Something went wrong: {e}")
                _, c, _ = st.columns([2, 1, 2])
                with c:
                    if st.button("← Try Again"):
                        move_to(3)
    else:
        move_to("listings_preview")


# ══════════════════════════════════════════════════════════════════════════════
# PAGE 4.5 — COMPARABLE LISTINGS GALLERY
# ══════════════════════════════════════════════════════════════════════════════
PLACEHOLDER_IMG = "https://via.placeholder.com/600x400/0f172a/7c3aed?text=No+Image"

def _parse_listing(item):
    if isinstance(item, dict):
        price = item.get("price", 0)
        return {
            "title":      item.get("title", "eBay Listing"),
            "price":      int(price) if isinstance(price, (int, float)) else 0,
            "price_str":  f"${int(price)}" if isinstance(price, (int, float)) else "—",
            "condition":  item.get("condition", "Used"),
            "sold_date":  item.get("sold_date", ""),
            "variant":    item.get("variant", ""),
            "url":        item.get("url", "https://www.ebay.com"),
            "images":     [u for u in item.get("image_urls", []) if u and u.startswith("http")],
        }
    q = "+".join(str(item).split()[:6])
    return {
        "title": str(item), "price": 0, "price_str": "—",
        "condition": "Used", "sold_date": "", "variant": "", "images": [],
        "url": f"https://www.ebay.com/sch/i.html?_nkw={q}&LH_Complete=1&LH_Sold=1",
    }


def page_listings_preview():
    r = st.session_state.analysis
    p = st.session_state.device_data
    raw_listings = r.get("comparable_listings", [])
    listings = [_parse_listing(x) for x in raw_listings]
    low  = r.get("estimated_value_low", 0)
    high = r.get("estimated_value_high", 0)
    mid  = int((low + high) / 2)

    # Gallery state
    if "gallery_sel" not in st.session_state or st.session_state.get("gallery_reset"):
        st.session_state.gallery_sel = 0
        st.session_state.gallery_img = 0
        st.session_state.gallery_reset = False
    if "gallery_img" not in st.session_state:
        st.session_state.gallery_img = 0

    navbar()
    show_progress("listings_preview")

    # ── Header ────────────────────────────────────────────
    _, hdr, _ = st.columns([1, 4, 1])
    with hdr:
        st.markdown(f"""
        <div style='padding:24px 0 20px; animation: fadeInUp 0.4s ease both;'>
            <div class="step-tag">Analysis Complete · Step 3½ of 4</div>
            <div style='display:flex; align-items:center; justify-content:space-between; flex-wrap:wrap; gap:12px;'>
                <div>
                    <h2 style='font-size:30px; font-weight:800; margin:0 0 4px;'>Comparable Sold Listings</h2>
                    <p style='color:#4b5563; font-size:14px; margin:0;'>
                        Click through the photos · Click a card to switch listing · Click a listing to open on eBay
                    </p>
                </div>
                <div style='display:flex; gap:20px; flex-shrink:0;'>
                    <div style='text-align:center;'>
                        <div style='font-size:22px; font-weight:800; color:var(--primary);'>${mid}</div>
                        <div style='font-size:10px; color:#6b7280; text-transform:uppercase; letter-spacing:1px;'>Est. Value</div>
                    </div>
                    <div style='text-align:center;'>
                        <div style='font-size:22px; font-weight:800; color:#4b5563;'>${low}–${high}</div>
                        <div style='font-size:10px; color:#6b7280; text-transform:uppercase; letter-spacing:1px;'>Range</div>
                    </div>
                </div>
            </div>
        </div>
        """, unsafe_allow_html=True)

    if not listings:
        st.markdown("<div style='text-align:center; padding:48px; color:#6b7280;'>No comparable listings found.</div>", unsafe_allow_html=True)
    else:
        sel_idx = st.session_state.gallery_sel
        img_idx = st.session_state.gallery_img
        sel     = listings[min(sel_idx, len(listings) - 1)]
        images  = sel["images"] or [PLACEHOLDER_IMG]
        img_idx = min(img_idx, len(images) - 1)

        # ── Listing selector tabs ──────────────────────────
        _, tab_area, _ = st.columns([1, 4, 1])
        with tab_area:
            tab_cols = st.columns(len(listings))
            for i, (tc, lst) in enumerate(zip(tab_cols, listings)):
                with tc:
                    is_sel  = (i == sel_idx)
                    bg      = "rgba(124,58,237,0.1)" if is_sel else "hsl(240,18%,95%)"
                    border  = "1px solid hsl(262,75%,55%)" if is_sel else "1px solid hsl(240,12%,87%)"
                    st.markdown(f"""
                    <div style='background:{bg}; border:{border}; border-radius:10px;
                         padding:8px 12px; margin-bottom:4px; text-align:center;
                         animation: fadeInUp 0.3s ease both {i*0.08:.2f}s;'>
                        <div style='font-size:16px; font-weight:800;
                             color:{"hsl(262,75%,55%)" if is_sel else "#111827"};'>{lst["price_str"]}</div>
                        <div style='font-size:10px; color:#6b7280; margin-top:2px;
                             white-space:nowrap; overflow:hidden; text-overflow:ellipsis;'>
                            {lst["condition"]}
                        </div>
                    </div>
                    """, unsafe_allow_html=True)
                    if st.button(f"Select listing {i+1}", key=f"lstsel_{i}",
                                 help=lst["title"]):
                        st.session_state.gallery_sel = i
                        st.session_state.gallery_img = 0
                        st.rerun()

            st.markdown("<br>", unsafe_allow_html=True)

        # ── Gallery area ───────────────────────────────────
        _, gallery_area, _ = st.columns([1, 4, 1])
        with gallery_area:
            thumb_col, main_col = st.columns([1, 5], gap="small")

            # Thumbnail strip (left)
            with thumb_col:
                st.markdown("<div style='display:flex; flex-direction:column; gap:6px;'>", unsafe_allow_html=True)
                for j, img_url in enumerate(images[:6]):
                    is_active = (j == img_idx)
                    border_style = "2px solid hsl(262,75%,55%)" if is_active else "2px solid hsl(240,12%,87%)"
                    opacity      = "1.0" if is_active else "0.5"
                    st.markdown(f"""
                    <div style='border:{border_style}; border-radius:8px; overflow:hidden;
                         opacity:{opacity}; transition:all 0.2s ease; cursor:pointer;
                         animation: fadeInUp 0.3s ease both {j*0.06:.2f}s;
                         box-shadow: {"0 0 10px rgba(124,58,237,0.3)" if is_active else "none"};'>
                    """, unsafe_allow_html=True)
                    try:
                        st.image(img_url, use_container_width=True)
                    except Exception:
                        st.image(PLACEHOLDER_IMG, use_container_width=True)
                    st.markdown("</div>", unsafe_allow_html=True)
                    if st.button(f"{'▶' if is_active else '○'}", key=f"thumb_{sel_idx}_{j}",
                                 help=f"Image {j+1}"):
                        st.session_state.gallery_img = j
                        st.rerun()

            # Main image (right)
            with main_col:
                st.markdown("""
                <div style='background:hsl(240,20%,97%); border:1px solid hsl(240,12%,87%);
                     border-radius:16px; overflow:hidden; position:relative;
                     animation: fadeIn 0.35s ease both;'>
                """, unsafe_allow_html=True)
                try:
                    st.image(images[img_idx], use_container_width=True)
                except Exception:
                    st.image(PLACEHOLDER_IMG, use_container_width=True)
                st.markdown("</div>", unsafe_allow_html=True)

                # Prev / Next + image counter
                nav_l, nav_mid, nav_r = st.columns([1, 4, 1])
                with nav_l:
                    if st.button("← Prev", key="img_prev", disabled=(img_idx == 0)):
                        st.session_state.gallery_img = img_idx - 1
                        st.rerun()
                with nav_mid:
                    st.markdown(f"""
                    <div style='text-align:center; padding:8px 0; color:#6b7280; font-size:12px;'>
                        {img_idx + 1} / {len(images)}
                        {'&nbsp;·&nbsp; <span style="color:#9ca3af; font-size:10px;">no images returned by AI — try rescanning</span>' if images[0] == PLACEHOLDER_IMG else ''}
                    </div>
                    """, unsafe_allow_html=True)
                with nav_r:
                    if st.button("Next →", key="img_next", disabled=(img_idx >= len(images) - 1)):
                        st.session_state.gallery_img = img_idx + 1
                        st.rerun()

                # Listing detail card
                st.markdown(f"""
                <div class="glass-card" style='padding:20px 24px; margin-top:12px;
                     animation: fadeInUp 0.4s ease both 0.1s;'>
                    <div style='display:flex; align-items:flex-start; justify-content:space-between; gap:12px; flex-wrap:wrap;'>
                        <div style='flex:1; min-width:0;'>
                            <div style='font-size:15px; font-weight:700; color:#111827;
                                        margin-bottom:8px; line-height:1.4;'>{sel["title"]}</div>
                            <div style='display:flex; align-items:center; gap:8px; flex-wrap:wrap;'>
                                <span style='background:rgba(124,58,237,0.08); border:1px solid rgba(124,58,237,0.2);
                                      color:var(--primary); padding:3px 10px; border-radius:999px;
                                      font-size:11px; font-weight:700;'>{sel["condition"]}</span>
                                {"<span style='background:hsl(240,18%,95%); border-radius:4px; padding:3px 8px; font-size:11px; color:#6b7280;'>" + sel["variant"] + "</span>" if sel["variant"] else ""}
                                {"<span style='color:#6b7280; font-size:12px;'>Sold " + sel["sold_date"] + "</span>" if sel["sold_date"] else ""}
                            </div>
                        </div>
                        <div style='text-align:right; flex-shrink:0;'>
                            <div style='font-size:28px; font-weight:800; color:var(--primary);'>{sel["price_str"]}</div>
                            <div style='font-size:10px; color:#6b7280; text-transform:uppercase; letter-spacing:1px;'>Sold Price</div>
                        </div>
                    </div>
                </div>
                """, unsafe_allow_html=True)

                # Open on eBay button
                st.link_button("↗  View This Listing on eBay", sel["url"], use_container_width=True)

        st.markdown("<br>", unsafe_allow_html=True)

    # ── Navigation ────────────────────────────────────────
    _, nav_col, _ = st.columns([1, 4, 1])
    with nav_col:
        c1, c2 = st.columns(2)
        with c1:
            if st.button("← Back to Item Details", key="preview_back"):
                del st.session_state["analysis"]
                st.session_state.gallery_reset = True
                move_to(3)
        with c2:
            if st.button("View Full Analysis & Pricing →", key="preview_next"):
                st.session_state.gallery_reset = True
                move_to(5)


# ══════════════════════════════════════════════════════════════════════════════
# PAGE 5 — RESULTS
# ══════════════════════════════════════════════════════════════════════════════
def page_results():
    r        = st.session_state.analysis
    p        = st.session_state.device_data
    decision = r.get("decision", "donate")

    navbar()
    show_progress(5)

    _, col, _ = st.columns([1, 2, 1])
    with col:
        device_name = r.get("device_identified", f"{p['brand']} {p['name']}")
        condition   = r.get("condition", "—")
        notes       = r.get("condition_notes", "")
        low  = r.get("estimated_value_low", 0)
        high = r.get("estimated_value_high", 0)
        mid  = int((low + high) / 2)

        cond_colors = {"Excellent":"hsl(262,75%,55%)","Good":"hsl(262,65%,65%)","Fair":"#C9A227","Poor":"#ef4444"}
        cond_color  = cond_colors.get(condition, "#6b7280")

        # Header
        st.markdown(f"""
        <div style='padding:32px 0 16px; animation:fadeInUp .4s ease both;'>
            <h2 style='font-size:clamp(22px,3vw,32px); font-weight:800; margin-bottom:8px;
                       font-family:"Playfair Display",Georgia,serif;'>{device_name}</h2>
            <span style='background:rgba(124,58,237,.08); border:1px solid {cond_color};
                   color:{cond_color}; padding:4px 14px; border-radius:999px;
                   font-size:11px; font-weight:700; letter-spacing:1px; text-transform:uppercase;'>
                {condition}
            </span>
        </div>
        """, unsafe_allow_html=True)

        # Condition notes card
        st.markdown(f"""
        <div class="glass-card" style="animation-delay:.05s;">
            <h3 style="font-size:13px;font-weight:700;margin-bottom:6px;">Condition Notes</h3>
            <p style="font-size:14px;color:var(--subtle);line-height:1.75;margin:0;">{notes}</p>
        </div>
        """, unsafe_allow_html=True)

        # Market valuation card
        st.markdown(f"""
        <div class="glass-card" style="text-align:center; animation-delay:.1s;">
            <p style="font-size:12px;color:var(--subtle);margin-bottom:4px;">Market Valuation</p>
            <p class="gradient-text" style="font-size:clamp(32px,5vw,48px);font-family:'Playfair Display',serif;margin:0;">${mid}</p>
            <p style="font-size:12px;color:var(--faintest);margin-top:4px;">${low} – ${high} range · {len(r.get("comparable_listings",[]))} listings</p>
        </div>
        """, unsafe_allow_html=True)

        # AI recommendation card
        st.markdown(f"""
        <div class="glass-card" style="animation-delay:.15s;">
            <span style="display:inline-block; padding:4px 12px; border-radius:6px; font-size:10px;
                  font-weight:700; letter-spacing:1.5px; text-transform:uppercase; margin-bottom:8px;
                  background:linear-gradient(135deg,rgba(124,58,237,.12),rgba(245,158,11,.08));
                  color:var(--primary);">AI Recommends: {decision.upper()}</span>
            <p style="font-size:14px;color:var(--subtle);margin:0;line-height:1.65;">{r.get("decision_reasoning","")}</p>
        </div>
        """, unsafe_allow_html=True)

        # Decision picker
        st.markdown('<div class="glass-card" style="animation-delay:.2s;">', unsafe_allow_html=True)
        st.markdown("<h3 style='font-size:13px;font-weight:700;margin-bottom:12px;'>Your Decision</h3>", unsafe_allow_html=True)
        override = st.radio(
            "Your choice:", ["Keep AI recommendation", "Sell it", "Trade it in", "Donate it"],
            horizontal=True, label_visibility="collapsed",
        )
        st.markdown('</div>', unsafe_allow_html=True)

        decision_map = {"Keep AI recommendation": decision, "Sell it": "sell", "Trade it in": "trade-in", "Donate it": "donate"}
        st.session_state.final_decision = decision_map[override]

        # Price slider (for sell)
        if override in ("Sell it", "Keep AI recommendation"):
            st.markdown('<div class="glass-card" style="animation-delay:.25s;">', unsafe_allow_html=True)
            st.markdown("<h3 style='font-size:13px;font-weight:700;margin-bottom:8px;'>Adjust Your Price</h3>", unsafe_allow_html=True)
            final_price = st.slider("Price", min_value=max(1, low-50), max_value=high+100, value=mid, step=5, format="$%d", label_visibility="collapsed")
            st.session_state.final_price = final_price
            st.markdown(f"""<div style="display:flex;justify-content:space-between;font-size:12px;color:var(--subtle);margin-top:4px;">
                <span>${low}</span>
                <span class="gradient-text" style="font-size:18px;font-family:'Playfair Display',serif;">${final_price}</span>
                <span>${high}</span>
            </div>""", unsafe_allow_html=True)
            st.markdown('</div>', unsafe_allow_html=True)
        else:
            st.session_state.final_price = mid

        if st.button("Generate My Listing →", key="res_next"):
            move_to(6)

        st.markdown("<br>", unsafe_allow_html=True)
        if st.button("← Back", key="res_back"):
            del st.session_state["analysis"]
            move_to("listings_preview")


# ══════════════════════════════════════════════════════════════════════════════
# PAGE 6 — LISTING / OUTCOME
# ══════════════════════════════════════════════════════════════════════════════
def page_listing():
    r              = st.session_state.analysis
    p              = st.session_state.device_data
    final_decision = st.session_state.get("final_decision", r.get("decision","donate"))
    final_price    = st.session_state.get("final_price", r.get("estimated_value_low", 0))

    navbar()
    show_progress(6)

    _, col, _ = st.columns([1, 2, 1])
    with col:
        st.markdown("""
        <div style='text-align:center; padding:32px 0 16px; animation:fadeInUp .4s ease both;'>
            <span class="step-tag gradient-text">Step 4 of 4 — Complete</span>
        </div>
        """, unsafe_allow_html=True)

        # ── SELL ──────────────────────────────────────────────────────────────
        if final_decision == "sell":
            st.markdown("<h2 style='font-size:clamp(22px,3vw,30px);font-weight:800;text-align:center;font-family:\"Playfair Display\",serif;margin-bottom:20px;'>Your Ready-to-Post Listing</h2>", unsafe_allow_html=True)

            if "listing" not in st.session_state:
                with st.spinner("Writing your eBay listing..."):
                    try:
                        st.session_state.listing = generate_listing(r, p["brand"], p["model"], p["year"], final_price)
                    except Exception as e:
                        st.error(f"Something went wrong: {e}")
                        st.stop()

            lst = st.session_state.listing
            fields = [
                ("Title",       lst.get("title", "")),
                ("Condition",   lst.get("condition_grade", "")),
                ("Description", lst.get("description", "")),
                ("Price",       f"${final_price}"),
                ("Shipping",    lst.get("shipping_recommendation", "")),
                ("Keywords",    ", ".join(lst.get("keywords", []))),
            ]
            listing_text = "\n\n".join([f"{l}:\n{v}" for l, v in fields])
            listing_block = "\n".join([f"# {lbl}:\n{val}\n" for lbl, val in fields])

            st.markdown(f"""
            <div class="glass-card" style="animation-delay:.05s;">
              <pre style="white-space:pre-wrap;font-size:13px;font-family:monospace;
                          color:var(--fg);line-height:1.8;margin:0;background:var(--bg);
                          border:1px solid var(--border);border-radius:12px;padding:20px;">
{listing_block.strip()}
              </pre>
            </div>
            """, unsafe_allow_html=True)

            c1, c2 = st.columns(2, gap="small")
            with c1:
                st.download_button(
                    "⬇ Download .txt", data=listing_text,
                    file_name=f"snapsell_{lst.get('title','listing')[:30].replace(' ','_')}.txt",
                    mime="text/plain", use_container_width=True,
                )
            with c2:
                device_name = r.get("device_identified", p["name"])
                st.link_button("↗ Search on eBay", f"https://www.ebay.com/sch/i.html?_nkw={device_name.replace(' ','+')}",
                               use_container_width=True)

        # ── TRADE-IN ───────────────────────────────────────────────────────────
        elif final_decision == "trade-in":
            st.markdown(f"""
            <div style="text-align:center; padding:8px 0 24px;">
                <div class="icon-box">💰</div>
                <p style="font-size:12px;color:var(--subtle);margin-bottom:4px;">Expected Value</p>
                <p class="gradient-text" style="font-size:clamp(32px,5vw,48px);font-family:'Playfair Display',serif;margin:0 0 32px;">${final_price} USD</p>
            </div>
            """, unsafe_allow_html=True)
            for href, icon, name, desc in [
                ("https://www.bestbuy.com/trade-in", "🏪", "Best Buy Trade-In", "Trade in electronics for Best Buy gift cards."),
                ("https://www.apple.com/shop/trade-in", "🍎", "Apple Trade In", "Get credit toward a new Apple device or Gift Card."),
                ("https://www.amazon.com/trade-in", "📦", "Amazon Trade-In", "Trade eligible devices for Amazon gift cards."),
            ]:
                st.markdown(f"""
                <a href="{href}" target="_blank" class="glass-card" style="display:flex;align-items:center;gap:16px;text-decoration:none;margin-bottom:12px;">
                    <span style="font-size:28px;">{icon}</span>
                    <div style="flex:1;">
                        <p style="font-weight:700;font-size:14px;color:var(--fg);margin:0 0 2px;">{name}</p>
                        <p style="font-size:12px;color:var(--subtle);margin:0;">{desc}</p>
                    </div>
                    <span style="color:var(--faintest);font-size:16px;">↗</span>
                </a>
                """, unsafe_allow_html=True)

        # ── DONATE ─────────────────────────────────────────────────────────────
        else:
            st.markdown(f"""
            <div style="text-align:center; padding:8px 0 24px;">
                <div class="icon-box">🎁</div>
            </div>
            <div style="background:linear-gradient(135deg,rgba(124,58,237,.08),transparent);
                 border:1px solid rgba(124,58,237,.2); border-radius:12px;
                 padding:12px 16px; font-size:14px; color:var(--primary);
                 display:flex; align-items:center; gap:8px; margin-bottom:20px;">
                💜 Donating this item gives it a second life and helps someone in need.
            </div>
            """, unsafe_allow_html=True)
            for href, icon, name, desc in [
                ("https://www.goodwill.org/donate/donate-stuff/", "🏬", "Goodwill", "Drop off items at any Goodwill location."),
                ("https://www.salvationarmyusa.org/usn/ways-to-give/", "❤️", "The Salvation Army", "Free item pickup from your home."),
                ("https://www.habitat.org/restores/donate-goods", "🏠", "Habitat ReStores", "Donate home goods, furniture, and appliances."),
            ]:
                st.markdown(f"""
                <a href="{href}" target="_blank" class="glass-card" style="display:flex;align-items:center;gap:16px;text-decoration:none;margin-bottom:12px;">
                    <span style="font-size:28px;">{icon}</span>
                    <div style="flex:1;">
                        <p style="font-weight:700;font-size:14px;color:var(--fg);margin:0 0 2px;">{name}</p>
                        <p style="font-size:12px;color:var(--subtle);margin:0;">{desc}</p>
                    </div>
                    <span style="color:var(--faintest);font-size:16px;">↗</span>
                </a>
                """, unsafe_allow_html=True)

        st.markdown("<br>", unsafe_allow_html=True)
        if st.button("↺ Scan Another Item →", key="restart"):
            for key in ["photo_bytes","device_data","analysis","listing","final_decision","final_price","prefill"]:
                st.session_state.pop(key, None)
            st.session_state.step = 1
            st.rerun()


# ─── Router ───────────────────────────────────────────────────────────────────
step = st.session_state.step
if   step == 1:                     page_hero()
elif step == "howitworks":          page_how_it_works()
elif step == "dashboard":           page_dashboard()
elif step == 2:                     page_upload()
elif step == 3:                     page_diagnostics()
elif step == 4:                     page_loading()
elif step == "listings_preview":    page_listings_preview()
elif step == 5:                     page_results()
elif step == 6:                     page_listing()
