# Tech Stack

## AI-Powered Markdown & Clearance Optimiser

| Field | Details |
|---|---|
| **Team** | Team 27 – Deep Mind Developers |
| **Domain** | Retail |
| **Version** | v2.0 |
| **Date** | June 2026 |
| **Deployment Target** | FastAPI + React/Vite (local / cloud) |

---

## Proposed Solution

An AI-powered markdown recommendation engine that ingests daily POS sales data and inventory snapshots, computes sell-through rates, days-of-cover, and 14-day velocity trends per SKU per store, and applies a rule-based urgency engine to tier every SKU as Red, Amber, or Green with an exact markdown percentage and optimal action deadline. A festival velocity boost system uses an AI layer (Groq Llama 3.3 70B) to detect regional festivals within any season window — automatically reducing recommended markdowns for boosted categories to reflect real demand uplift, with multiple festivals compounding multiplicatively. Merchandisers get a dark-themed interactive dashboard with sortable SKU tables, coverage distribution charts, store-level printable marketing posters, and projected clearance impact cards. A GenAI rationale (Why / Outcome / Risk / Confidence) is generated on demand per SKU, and a one-click Excel action sheet can be downloaded with all recommendations and rationale included.

---

## Stack Overview

| Layer | Technology | Version | Cost |
|---|---|---|---|
| Frontend UI | React | 18 | Free |
| Frontend Bundler | Vite | 5 | Free |
| Charts | Recharts | 2.x | Free |
| Backend API | FastAPI | 0.111+ | Free |
| API Server | Uvicorn | 0.29+ | Free |
| Data Processing | Python | 3.11+ | Free |
| Dataframe Engine | Pandas | ≥ 2.2.0 | Free |
| Numerical Computing | NumPy | ≥ 1.26.0 | Free |
| LLM Provider | Groq API | Latest | Free tier |
| LLM Model | Llama 3.3 70B Versatile | Meta | Free tier |
| Excel Export | OpenPyXL (via Pandas) | ≥ 3.1.2 | Free |
| Secrets Management | `.env` / `python-dotenv` | Built-in | Free |

---

## Layer-by-Layer Breakdown

### 1. Frontend UI – React 18 + Vite

**Purpose:** Full interactive single-page application — sidebar controls, KPI cards, charts, SKU table, discount detail panels, store posters, and export button.

**Key components:**

| Component | Responsibility |
|---|---|
| `Sidebar.jsx` | Data upload, season config, filters, festival boost controls |
| `KPICards.jsx` | Red/Amber/Green/Total counts + festival impact bar |
| `Charts.jsx` | Sell-through by store + stock coverage distribution |
| `TreemapChart.jsx` | Inventory at risk by category (block size = units) |
| `SKUTable.jsx` | Sortable SKU list with tier badge + festival badge |
| `DiscountCard.jsx` | Premium poster-style card: markdown %, reason, metrics, calculation steps |
| `RationalePanel.jsx` | Impact projection cards + AI rationale expander |
| `StorePoster.jsx` | Printable Red/Amber marketing poster per store |

**Config notes:**
- Dev server: `npm run dev` (port 5173)
- Proxy: all `/api` requests forwarded to `http://127.0.0.1:8000` via `vite.config.js`
- No direct CORS calls — all API traffic goes through Vite proxy

---

### 2. Backend API – FastAPI + Uvicorn

**Purpose:** REST API that handles CSV ingestion, feature computation, recommendation generation, festival detection, rationale generation, and Excel export.

**Endpoints:**

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/recommend` | Upload POS + inventory CSVs, returns recommendations |
| `POST` | `/api/recommend/sample` | Run on built-in sample data (JSON body) |
| `POST` | `/api/festivals/detect` | AI-powered festival detection for region/year/season |
| `POST` | `/api/rationale` | Generate AI rationale for a single SKU row |
| `POST` | `/api/export` | Return formatted `.xlsx` action sheet |

**Config notes:**
- Start server: `uvicorn api.main:app --reload --port 8000`
- CORS origins: `http://localhost:5173`, `http://localhost:3000`
- Festival JSON body parsed via `Body(default={})` — required for FastAPI to read JSON POST body

---

### 3. Data Processing – Python 3.11+ / Pandas / NumPy

**Purpose:** Core business logic — CSV validation, feature engineering, urgency tiering, markdown calculation.

**Feature computations:**

| Feature | Formula |
|---|---|
| Sell-Through Rate | `Units Sold Season / Opening Stock × 100` |
| Daily Velocity (14d) | `Units Sold (last 14 days) / 14` |
| Days of Cover | `Stock on Hand / Daily Velocity` |
| Velocity Trend | `Slope of 21-day rolling daily sales (polyfit degree 1)` |
| Festival Boost | `Multiplicative product of all active festival boosts, capped at 3.0×` |
| Boosted DoC | `Stock / (Velocity × Festival Boost)` — used for tier assignment only |

**Urgency tier logic (`src/recommender.py`):**

| Tier | Condition |
|---|---|
| Red | DoC > `season_days_remaining × 1.0` AND sell-through < 60% |
| Amber | DoC > `season_days_remaining × 0.75` OR sell-through < 75% |
| Green | All other SKUs |

**Markdown % formula:**
- **Red:** `base = 20 + (coverage_ratio − 1) × 8` + sell-through penalty, clamped 20–70%
- **Amber:** `base = 10 + ST_deficit × 0.25 + time_urgency`, trend-adjusted ×1.2 if decelerating, clamped 10–35%
- **Festival reduction:** `new_pct = orig_pct × (1 − min(0.40, (boost − 1) × 0.5))`

---

### 4. Festival Velocity Boost System

**Purpose:** Reflects real seasonal demand uplift — festivals reduce the markdown needed because demand naturally rises. Higher festival demand = smaller discount required to clear stock.

**How it works:**
1. User selects region, year, and season window in the sidebar
2. Click **Auto-detect** → backend calls Groq LLM to identify festivals whose month overlaps the season window
3. LLM returns festival names + months; backend attaches category-level boost multipliers from `FESTIVAL_DEFAULT_BOOSTS`
4. User can also type any festival name → AI fetches its month automatically
5. Click **Apply Festival Boosts** → recommendations re-run with boosts applied
6. Multiple active festivals compound: `boost = f1 × f2 × f3 ... (capped 3.0×)`

**Supported festivals and sample boosts (Apparel):**

| Festival | Apparel Boost | Kurtas Boost |
|---|---|---|
| Ramzan | 1.6× | 1.7× |
| Eid ul-Fitr | 1.6× | 1.7× |
| Diwali | 1.5× | 1.6× |
| Navratri | 1.5× | 1.6× |
| Holi | 1.3× | 1.3× |
| Christmas | 1.4× | 1.2× |
| New Year | 1.3× | 1.2× |
| Onam | 1.4× | 1.5× |
| Pongal / Ugadi / Baisakhi | 1.3× | 1.4× |

**Visual indicators:**
- Golden 🎉 impact bar below KPI cards: shows festival names + count of SKUs boosted
- 🎉 festival badge on each boosted row in the SKU table
- Festival pill (e.g. `🎉 Holi + Ramzan 3.0×`) in the DiscountCard header

---

### 5. LLM Provider – Groq API (Free Tier)

**Purpose:** Powers two AI features — festival detection and SKU rationale generation. Selected for < 1s latency and a generous free tier.

**Free tier limits (Llama 3.3 70B):**

| Metric | Limit |
|---|---|
| Requests / minute | 30 |
| Tokens / minute | 6,000 |
| Tokens / day | 500,000 |

**Config notes:**
- Store API key in `.env`: `GROQ_API_KEY=gsk_xxxxxxxxxxxxxxxxxxxx`
- Loaded via `python-dotenv` in `config/settings.py`
- Retry logic: 3 attempts with exponential backoff (`sleep(2 ** attempt)`)
- Model: `llama-3.3-70b-versatile` (set in `config/settings.py` as `LLM_MODEL`)

---

### 6. LLM Model – Meta Llama 3.3 70B Versatile

**Purpose:** Two distinct uses:
1. **Festival detection** — given region + year + season window, returns festival names and months as JSON
2. **SKU rationale** — generates structured 5-section rationale (Recommended Discount / Why / What Will Happen / If Not Applied / Confidence)

**Rationale prompt structure:**
```
You are a retail merchandising analyst. Respond with EXACTLY these 5 numbered sections.
1. RECOMMENDED DISCOUNT
2. WHY THIS DISCOUNT  — cite velocity, days of cover, days remaining
3. WHAT WILL HAPPEN   — cite velocity lift (e.g. 1.5×)
4. IF THIS IS NOT APPLIED — cite units at risk
5. CONFIDENCE         — HIGH / MEDIUM / LOW + reason
```

**Config notes:**
- `max_tokens = 512`, `temperature = 0.1` (festival) / `0.2` (rationale)
- Rationale is generated on demand (user clicks per SKU) to stay within rate limits

---

### 7. Charts – Recharts

**Purpose:** Interactive charts embedded in the React dashboard.

**Charts used:**

| Chart | Type | Description |
|---|---|---|
| Sell-Through by Store | Grouped BarChart | Avg sell-through % per store, colour-coded by tier |
| Stock Coverage Distribution | Stacked BarChart | SKU count by days-of-cover bucket (0–30d, 30–90d, 90–180d, 180–365d, 365d+) with season-end reference line |
| Inventory at Risk | Treemap (custom) | Block size = units on hand, colour = tier, grouped by category |

**Config notes:**
- Recharts v2 — import individual chart components, not the whole library
- Removed scatter chart (replaced with coverage distribution) — scatter was unreadable with 250+ overlapping points

---

### 8. Excel Export – OpenPyXL via Pandas

**Purpose:** One-click downloadable action sheet with all recommendations and AI rationale.

**Output columns:**

| Column | Description |
|---|---|
| SKU | Product identifier |
| Store | Store name/code |
| Urgency Tier | Red / Amber / Green |
| Markdown % | Recommended discount (festival-adjusted if active) |
| Markdown Band | Recommended range (e.g. 37–47%) |
| Markdown Reason | Plain-English reason including festival reduction if applied |
| Action By Date | Deadline for applying markdown |
| Stock on Hand | Units in inventory |
| Daily Velocity | Avg units/day (14-day trailing) |
| Days of Cover | Days to stockout at current velocity |
| Sell-Through % | % of opening stock sold this season |
| Festival Boost | Festival multiplier applied (1.0 = no boost) |
| Festival Name | Active festival(s) that reduced the markdown |
| Rationale | Full AI-generated WHY / OUTCOME / RISK / CONFIDENCE |

---

## Project Structure

```
ideathon1/
├── api/
│   └── main.py                    # FastAPI app — all endpoints
├── src/
│   ├── ingestion.py               # CSV upload, validation, column aliasing
│   ├── features.py                # Sell-through, days-of-cover, velocity, trend
│   ├── recommender.py             # Urgency tiering, markdown %, festival boost logic
│   ├── rationale.py               # Groq API calls + 5-section prompt template
│   └── export.py                  # Excel action sheet generation
├── config/
│   └── settings.py                # LLM config, thresholds, FESTIVAL_DEFAULT_BOOSTS
├── data/
│   └── sample/
│       ├── pos_sales_sample.csv   # Demo POS data (250 SKU×Store rows)
│       └── inventory_sample.csv   # Demo inventory snapshot
├── frontend/
│   ├── src/
│   │   ├── App.jsx                # Root layout, state, API orchestration
│   │   ├── api.js                 # fetch wrappers for all API endpoints
│   │   ├── index.css              # Full design system (dark theme)
│   │   └── components/
│   │       ├── Sidebar.jsx        # Upload, season config, filters, festivals, export
│   │       ├── KPICards.jsx       # KPI tiles + festival impact bar
│   │       ├── Charts.jsx         # Bar + stacked coverage chart
│   │       ├── TreemapChart.jsx   # Inventory-at-risk treemap
│   │       ├── SKUTable.jsx       # Sortable recommendations table
│   │       ├── DiscountCard.jsx   # Poster-style markdown detail card
│   │       ├── RationalePanel.jsx # Impact projection cards + AI rationale
│   │       └── StorePoster.jsx    # Printable Red/Amber store poster
│   ├── vite.config.js             # Vite dev server + /api proxy to :8000
│   └── package.json
├── docs/
│   └── techstack.md               # This file
├── app.py                         # Legacy Streamlit entry point (kept for reference)
├── requirements.txt               # Python dependencies
└── .env                           # GROQ_API_KEY (never commit)
```

---

## Environment Setup (Local)

```bash
# 1. Clone the repo
git clone https://github.com/your-org/markdown-optimiser.git
cd markdown-optimiser

# 2. Backend — Python virtual environment
python -m venv venv
venv\Scripts\activate           # Windows
pip install -r requirements.txt

# 3. Add Groq API key
echo GROQ_API_KEY=gsk_xxxxxxxxxxxxxxxxxxxx > .env

# 4. Start FastAPI backend (port 8000)
uvicorn api.main:app --reload --port 8000

# 5. Frontend — in a second terminal
cd frontend
npm install
npm run dev                     # Vite dev server at http://localhost:5173
```

---

## `requirements.txt`

```txt
fastapi>=0.111.0
uvicorn>=0.29.0
pandas>=2.2.0
numpy>=1.26.0
groq>=0.9.0
openpyxl>=3.1.2
python-dotenv>=1.0.0
python-multipart>=0.0.9
```

---

## Groq API – Getting Started

1. Sign up at [console.groq.com](https://console.groq.com)
2. Navigate to **API Keys** → **Create API Key**
3. Copy the key and add to `.env`: `GROQ_API_KEY=gsk_xxxxxxxxxxxxxxxxxxxx`
4. Free tier activates automatically — no credit card required
