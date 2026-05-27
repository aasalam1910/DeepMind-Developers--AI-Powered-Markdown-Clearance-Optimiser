# Design Spec: AI-Powered Markdown & Clearance Optimiser

| Field | Details |
|---|---|
| **Date** | 2026-05-27 |
| **Team** | Team 27 – Deep Mind Developers |
| **Status** | Approved |
| **Version** | v1.0 |

---

## 1. Overview

A Streamlit app that ingests daily POS sales and inventory CSVs, computes sell-through rate / days-of-cover / velocity per SKU per store, classifies each into a Red/Amber/Green urgency tier, recommends a markdown percentage, and generates on-demand plain-English rationale via Groq (Llama 3.1). Output: interactive dashboard + one-click Excel action sheet.

---

## 2. Project Structure

```
markdown-optimiser/
├── app.py                        # Streamlit entry point — zero business logic
├── requirements.txt
├── runtime.txt                   # python-3.11
├── .gitignore
├── .streamlit/
│   ├── config.toml               # Wide layout, custom theme
│   └── secrets.toml              # GROQ_API_KEY (never committed)
├── config/
│   └── settings.py               # All thresholds, season dates, LLM params
├── src/
│   ├── __init__.py
│   ├── ingestion.py              # CSV validation + column alias mapping
│   ├── features.py               # Sell-through, days-of-cover, velocity
│   ├── recommender.py            # Red/Amber/Green tiering + markdown %
│   ├── rationale.py              # Groq on-demand call per SKU click
│   └── export.py                 # Formatted .xlsx BytesIO output
└── data/
    └── sample/
        ├── pos_sales_sample.csv  # 5 stores × 50 SKUs × 30 days
        └── inventory_sample.csv  # matching snapshot
```

---

## 3. UI Layout — Sidebar + Main Area

### Sidebar
- **Data Input section**: Upload POS CSV, Upload Inventory CSV, "Load Sample Data" button
- **Season Config section**: Season Start date input, Season End date input (feeds runtime thresholds)
- **Filters section**: Store multiselect, Urgency Tier multiselect, Category multiselect
- **Export section**: Download .xlsx button (always visible, exports current filtered view)

### Main Area
1. **Header** — app title + short description
2. **KPI Cards** (4 columns) — Red count, Amber count, Green count, Total SKUs
3. **Charts** (2 columns) — Bar: sell-through by store | Scatter: Days of Cover vs Velocity
4. **Treemap** — inventory at risk by category/store, colour-coded by tier
5. **Season progress bar** — "X days left in season" derived from sidebar dates
6. **Filterable SKU table** — one row per SKU × Store with a per-row "Generate Rationale" button

### SKU Table Columns
SKU | Store | Category | Urgency Tier | Markdown % | Stock | Velocity | Days of Cover | Sell-Through % | Rationale

---

## 4. Data Ingestion (`ingestion.py`)

**Inputs:** `pos_file` (UploadedFile or path), `inventory_file` (UploadedFile or path)

**Outputs:** `pos_df` (sku, store, date, units_sold), `inventory_df` (sku, store, stock_on_hand)

**Column alias mapping** (defined in `config/settings.py`):
```python
COLUMN_ALIASES = {
    "sku":           ["sku", "sku_id", "product_id", "item_code"],
    "store":         ["store", "store_id", "branch", "location"],
    "date":          ["date", "txn_date", "sale_date", "transaction_date"],
    "units_sold":    ["units_sold", "qty", "quantity", "sold_units"],
    "stock_on_hand": ["stock_on_hand", "soh", "closing_stock", "inventory"],
    "category":      ["category", "category_name", "dept", "department"],  # optional
}
```

`category` is **optional**; sourced from inventory CSV. If absent, defaults to `"Default"` for all SKUs (uses `CATEGORY_LIFT_MULTIPLIERS["Default"]` in rationale prompt).

**Validation rules:**
| Rule | On failure |
|---|---|
| Required columns present | `st.error()`, halt |
| Null values in key columns | Drop row, `st.warning()` with count |
| `date` parseable as datetime | Coerce; flag unparseable rows |
| `units_sold` / `stock_on_hand` numeric | Cast; drop non-numeric rows |
| Duplicate SKU × Store × Date | Aggregate (sum units_sold) |

**Function signature:**
```python
def load_and_validate(pos_file, inventory_file) -> tuple[pd.DataFrame, pd.DataFrame]
```

---

## 5. Feature Engine (`features.py`)

**Input:** `pos_df`, `inventory_df`
**Output:** `features_df` — one row per SKU × Store

| Feature | Column | Formula | Notes |
|---|---|---|---|
| Daily velocity | `velocity_14d` | `sum(units_sold, last 14d) / 14` | Trailing 14-day window |
| Opening stock | `opening_stock` | `stock_on_hand + units_sold_season` | Derived — no opening stock in source data |
| Sell-through rate | `sell_through_pct` | `units_sold_season / opening_stock × 100` | Season-to-date |
| Days of cover | `days_of_cover` | `stock_on_hand / velocity_14d` | Null if velocity = 0 (flagged Green) |
| Velocity trend | `velocity_trend` | Slope of 7-day rolling units_sold | `accelerating / stable / decelerating` |
| Season week | `season_week` | `(date - SEASON_START_DATE).days // 7` | From `settings.py` |

**Config dependencies:** `VELOCITY_WINDOW_DAYS=14`, `TREND_WINDOW_DAYS=7`, `SEASON_START_DATE`

**Function signature:**
```python
def compute_features(pos_df: pd.DataFrame, inventory_df: pd.DataFrame) -> pd.DataFrame
```

---

## 6. Recommendation Engine (`recommender.py`)

**Input:** `features_df`
**Output:** `recommendations_df` = `features_df` + `urgency_tier`, `markdown_pct`, `action_by_date`

### Urgency Tier Rules

| Tier | Condition | Colour |
|---|---|---|
| Red | `days_of_cover > season_days_remaining` AND `sell_through_pct < 60%` | `#EF4444` |
| Amber | `days_of_cover > season_days_remaining × 0.75` OR `sell_through_pct < 75%` | `#F59E0B` |
| Green | All other SKUs | `#10B981` |

### Markdown % Rules

| Condition | Markdown Band |
|---|---|
| Red + `days_of_cover > season_remaining × 1.5` | 30–40% |
| Red + `days_of_cover` within 1.0–1.5× season remaining | 20–30% |
| Amber + decelerating velocity | 15–20% |
| Amber + stable velocity | 10–15% |
| Green | 0% |

`action_by_date` = today + `ACTION_LEAD_DAYS[tier]` (from `settings.py`; Green: null)

**Config dependencies:** `RED_SELLTHROUGH_THRESHOLD=60`, `AMBER_SELLTHROUGH_THRESHOLD=75`, `SEASON_END_DATE`, `MARKDOWN_BANDS`

**Function signature:**
```python
def generate_recommendations(features_df: pd.DataFrame) -> pd.DataFrame
```

---

## 7. GenAI Rationale Layer (`rationale.py`)

**Trigger:** Per-row "Generate" button click in SKU table — on-demand, not batch.

**Flow:**
1. Button passes SKU row data to `generate_rationale_for_sku()`
2. Builds prompt, calls Groq `llama-3.1-8b-instant` (`max_tokens=150`, `temperature=0.3`)
3. Retry up to 3× with exponential backoff (1s, 2s, 4s) on rate limit / errors
4. Result stored in `st.session_state[f"{sku}_{store}"]` — persists across rerenders, no re-calls
5. On failure: `"Rationale unavailable — please review metrics manually."`

**Prompt template:**
```
You are a retail merchandising assistant. Write a 2–3 sentence plain-English
rationale for this markdown recommendation. Be specific with numbers.

SKU: {sku} | Store: {store}
Daily velocity: {velocity:.1f} units/day | Stock: {stock} units
Days of cover: {days_cover:.0f}d | Season ends in: {days_remaining}d
Recommended markdown: {markdown_pct}%
Expected velocity lift: {lift}x (category average)

Rationale:
```

**Config dependencies:** `LLM_MODEL`, `LLM_MAX_TOKENS=150`, `LLM_TEMPERATURE=0.3`, `LLM_RETRY_ATTEMPTS=3`

**Function signatures:**
```python
def generate_rationale_for_sku(row: pd.Series) -> str
def get_or_generate_rationale(sku: str, store: str, row: pd.Series) -> str
```

---

## 8. Export (`export.py`)

**Input:** `recommendations_df` (post-filter, including any cached rationales from session_state)
**Output:** `BytesIO` Excel file for `st.download_button()`

**Action sheet columns:** SKU, Store, Category, Urgency Tier, Recommended Markdown %, Current Stock, Daily Velocity (14d), Days of Cover, Sell-Through Rate %, Action By Date, Rationale

**Formatting:**
- Header: bold, white text, `#1E293B` background
- Red rows: `#FEE2E2` fill | Amber: `#FEF3C7` | Green: `#DCFCE7`
- Column widths: auto-fit to content

**Function signature:**
```python
def build_action_sheet(recommendations_df: pd.DataFrame) -> BytesIO
```

---

## 9. Sample Data

`data/sample/pos_sales_sample.csv` — 5 stores × 50 SKUs × 30 days = 7,500 rows
- Stores: MUM-1, DEL-2, BLR-3, CHN-4, HYD-5
- Categories: Apparel, Footwear, Home
- Velocity profile: ~20% SKUs barely move (Red candidates), ~35% decelerate mid-season (Amber), ~45% sell well (Green)

`data/sample/inventory_sample.csv` — 250 rows (5 × 50), stock calibrated to match velocity profile

Generated with fixed `random.seed(42)` for reproducibility.

---

## 10. Configuration (`config/settings.py`)

```python
SEASON_START_DATE           = "2026-03-01"
SEASON_END_DATE             = "2026-06-30"
VELOCITY_WINDOW_DAYS        = 14
TREND_WINDOW_DAYS           = 7
RED_SELLTHROUGH_THRESHOLD   = 60
AMBER_SELLTHROUGH_THRESHOLD = 75
RED_DOC_MULTIPLIER          = 1.0
AMBER_DOC_MULTIPLIER        = 0.75
MARKDOWN_BANDS = {
    "red_critical": (30, 40),
    "red_moderate": (20, 30),
    "amber_decel":  (15, 20),
    "amber_stable": (10, 15),
}
LLM_MODEL          = "llama-3.1-8b-instant"
LLM_MAX_TOKENS     = 150
LLM_TEMPERATURE    = 0.3
LLM_RETRY_ATTEMPTS = 3
ACTION_LEAD_DAYS   = {"Red": 3, "Amber": 7}   # days from today for action_by_date
CATEGORY_LIFT_MULTIPLIERS = {                  # expected velocity lift at recommended markdown
    "Apparel":  1.5,
    "Footwear": 1.4,
    "Home":     1.3,
    "Default":  1.4,
}
COLUMN_ALIASES = {
    "sku":           ["sku", "sku_id", "product_id", "item_code"],
    "store":         ["store", "store_id", "branch", "location"],
    "date":          ["date", "txn_date", "sale_date", "transaction_date"],
    "units_sold":    ["units_sold", "qty", "quantity", "sold_units"],
    "stock_on_hand": ["stock_on_hand", "soh", "closing_stock", "inventory"],
    "category":      ["category", "category_name", "dept", "department"],  # optional
}
```

---

## 11. Error Handling

| Error | Module | Handling |
|---|---|---|
| Missing required CSV columns | ingestion.py | `st.error()`, halt processing |
| Unparseable dates | ingestion.py | Drop rows, `st.warning()` with count |
| velocity = 0 (div by zero) | features.py | `days_of_cover = null`, tier → Green |
| Groq rate limit (429) | rationale.py | Retry ×3 with backoff |
| Groq failure after retries | rationale.py | Fallback text, dashboard unblocked |
| Empty DataFrame after filters | app.py | `st.info("No SKUs match current filters")` |
| Excel generation failure | export.py | `st.error()`, download button disabled |

---

## 12. Suggested Enhancements (v1.0 additions, low effort)

1. **Inventory-at-risk KPI card** — total units × notional price for Red SKUs (makes business impact tangible in demo)
2. **Treemap chart** — Red/Amber/Green breakdown by category using `px.treemap()` (~5 lines)
3. **Season progress bar** — `st.progress()` showing days elapsed / total season days in sidebar

---

## 13. Out of Scope (v1.0)

- ERP / live POS API integration
- Automated markdown execution
- Demand forecasting beyond days-of-cover
- Customer segmentation / loyalty pricing
- Mobile application
- Email / Slack alerts (planned v1.3)
