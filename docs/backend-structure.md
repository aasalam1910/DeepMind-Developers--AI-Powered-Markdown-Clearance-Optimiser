# Backend Structure

## AI-Powered Markdown & Clearance Optimiser

| Field | Details |
|---|---|
| **Team** | Team 27 – Deep Mind Developers |
| **Version** | v1.0.0 |
| **Last Updated** | 27 May 2026 |
| **Status** | Active |

---

## How to Use This Document

This is a **living document**. Every time a new feature is added, a module is refactored, or an API changes:

1. Update the relevant section below.
2. Bump the version number in the header table (`v1.0.0` → `v1.1.0` for features, `v1.0.1` for fixes).
3. Add a one-line entry to the [Changelog](#changelog) at the bottom.
4. If a new module is added, copy the [Module Template](#module-template) and fill it in.

> **Rule of thumb:** If you touched the code, touch this doc.

---

## Table of Contents

- [Directory Structure](#directory-structure)
- [Module Reference](#module-reference)
  - [app.py – Entry Point](#1-apppy--entry-point)
  - [ingestion.py – Data Ingestion](#2-ingestionpy--data-ingestion)
  - [features.py – Feature Engine](#3-featurespy--feature-engine)
  - [recommender.py – Recommendation Logic](#4-recommenderpy--recommendation-logic)
  - [rationale.py – GenAI Rationale Layer](#5-rationalepy--genai-rationale-layer)
  - [export.py – Output & Export](#6-exportpy--output--export)
- [Data Flow](#data-flow)
- [API Contracts](#api-contracts)
  - [Internal Function Signatures](#internal-function-signatures)
  - [External API – Groq](#external-api--groq)
- [Configuration & Environment](#configuration--environment)
- [Error Handling Strategy](#error-handling-strategy)
- [Adding a New Feature – Checklist](#adding-a-new-feature--checklist)
- [Module Template](#module-template)
- [Changelog](#changelog)

---

## Directory Structure

```
markdown-optimiser/
├── app.py                        # Streamlit entry point; orchestrates all modules
├── requirements.txt              # Pinned Python dependencies
├── runtime.txt                   # Python version (python-3.11)
├── .gitignore
├── .streamlit/
│   ├── config.toml               # Theme, layout, server config
│   └── secrets.toml              # Local secrets – never commit
├── src/
│   ├── __init__.py
│   ├── ingestion.py              # CSV upload, schema validation, parsing
│   ├── features.py               # Sell-through, days-of-cover, velocity
│   ├── recommender.py            # Urgency tiering + markdown % rules
│   ├── rationale.py              # Groq API calls + prompt management
│   └── export.py                 # Excel action sheet generation
├── config/
│   └── settings.py               # Centralised constants and thresholds
├── tests/
│   ├── test_ingestion.py
│   ├── test_features.py
│   ├── test_recommender.py
│   └── test_rationale.py
└── data/
    └── sample/
        ├── pos_sales_sample.csv
        └── inventory_sample.csv
```

> **Adding a new module?** Place it in `src/`, register it in `src/__init__.py`, add its section to [Module Reference](#module-reference), and add tests in `tests/`.

---

## Module Reference

---

### 1. `app.py` – Entry Point

| Field | Details |
|---|---|
| **Version** | v1.0.0 |
| **Last Updated** | 27 May 2026 |
| **Status** | Stable |

**Responsibility:** Streamlit UI shell. Imports and calls all `src/` modules in sequence. Contains no business logic.

**Flow:**
```
Upload CSVs → validate → compute features → run recommender → generate rationale → render dashboard → export
```

**Key Streamlit components:**
| Component | Purpose |
|---|---|
| `st.file_uploader()` | Accept POS + inventory CSVs |
| `st.plotly_chart()` | Render Red/Amber/Green dashboard |
| `st.multiselect()` | Filter by store / category / tier |
| `st.download_button()` | Excel action sheet export |
| `st.spinner()` | Loading state during LLM calls |

**Update this section when:** UI layout changes, new pages/tabs added, filter options change.

---

### 2. `ingestion.py` – Data Ingestion

| Field | Details |
|---|---|
| **Version** | v1.0.0 |
| **Last Updated** | 27 May 2026 |
| **Status** | Stable |

**Responsibility:** Accept uploaded CSV files, validate schema, clean and return standardised DataFrames.

**Input:**
- `pos_file` – raw POS sales CSV upload (`st.UploadedFile`)
- `inventory_file` – raw inventory snapshot CSV upload (`st.UploadedFile`)

**Output:**
- `pos_df` – cleaned DataFrame with columns: `sku`, `store`, `date`, `units_sold`
- `inventory_df` – cleaned DataFrame with columns: `sku`, `store`, `stock_on_hand`

**Validation rules:**
| Rule | Action on failure |
|---|---|
| Required columns present | Show error, halt processing |
| No null values in key columns | Drop row, log warning |
| `date` column parseable as datetime | Coerce; flag unparseable rows |
| `units_sold` and `stock_on_hand` are numeric | Cast; non-numeric rows dropped |
| Duplicate SKU × Store × Date rows | Aggregate (sum units_sold) |

**Column mapping (flexible ingestion):**

To handle varied retailer CSV formats, ingestion supports alias mapping defined in `config/settings.py`:

```python
# config/settings.py
COLUMN_ALIASES = {
    "sku":          ["sku", "sku_id", "product_id", "item_code"],
    "store":        ["store", "store_id", "branch", "location"],
    "date":         ["date", "txn_date", "sale_date", "transaction_date"],
    "units_sold":   ["units_sold", "qty", "quantity", "sold_units"],
    "stock_on_hand":["stock_on_hand", "soh", "closing_stock", "inventory"]
}
```

**Update this section when:** New input formats supported, validation rules change, column aliases added.

---

### 3. `features.py` – Feature Engine

| Field | Details |
|---|---|
| **Version** | v1.0.0 |
| **Last Updated** | 27 May 2026 |
| **Status** | Stable |

**Responsibility:** Compute all analytical features per SKU per store from cleaned DataFrames.

**Input:** `pos_df`, `inventory_df` (output of `ingestion.py`)

**Output:** `features_df` – one row per SKU × Store with computed features

**Computed features:**

| Feature | Column Name | Formula | Notes |
|---|---|---|---|
| Daily Velocity | `velocity_14d` | `sum(units_sold, last 14d) / 14` | Trailing 14-day window |
| Sell-Through Rate | `sell_through_pct` | `units_sold_season / opening_stock × 100` | Season-to-date |
| Days of Cover | `days_of_cover` | `stock_on_hand / velocity_14d` | Infinity-safe (velocity = 0 → `null`) |
| Velocity Trend | `velocity_trend` | Slope of 7-day rolling `units_sold` | `accelerating / stable / decelerating` |
| Season Week | `season_week` | Derived from `date` and season start config | Set in `settings.py` |

**Config dependency (`config/settings.py`):**
```python
VELOCITY_WINDOW_DAYS = 14       # Trailing window for velocity computation
TREND_WINDOW_DAYS    = 7        # Rolling window for trend slope
SEASON_START_DATE    = "2026-03-01"  # Update each season
```

**Update this section when:** New features added, window sizes changed, season start date updated, new derived columns introduced.

---

### 4. `recommender.py` – Recommendation Logic

| Field | Details |
|---|---|
| **Version** | v1.0.0 |
| **Last Updated** | 27 May 2026 |
| **Status** | Stable |

**Responsibility:** Apply Python rules to `features_df` and assign urgency tier + recommended markdown percentage per SKU × Store.

**Input:** `features_df` (output of `features.py`)

**Output:** `recommendations_df` – `features_df` + `urgency_tier`, `markdown_pct`, `action_by_date`

**Urgency tier rules:**

| Tier | Condition | Colour |
|---|---|---|
| 🔴 Red | `days_of_cover > season_days_remaining` AND `sell_through_pct < 60%` | `#EF4444` |
| 🟡 Amber | `days_of_cover > (season_days_remaining × 0.75)` OR `sell_through_pct < 75%` | `#F59E0B` |
| 🟢 Green | All other SKUs | `#10B981` |

**Markdown percentage rules:**

| Condition | Recommended Markdown |
|---|---|
| Red + `days_of_cover > season_remaining × 1.5` | 30–40% |
| Red + `days_of_cover` within 1.0–1.5× season remaining | 20–30% |
| Amber + decelerating velocity trend | 15–20% |
| Amber + stable velocity trend | 10–15% |
| Green | No markdown |

**Config dependency (`config/settings.py`):**
```python
RED_SELLTHROUGH_THRESHOLD   = 60    # % sell-through below which SKU is Red
AMBER_SELLTHROUGH_THRESHOLD = 75    # % sell-through below which SKU is Amber
SEASON_END_DATE             = "2026-06-30"  # Update each season
```

**Update this section when:** Threshold values change, new tiers added, markdown bands adjusted, new urgency conditions introduced.

---

### 5. `rationale.py` – GenAI Rationale Layer

| Field | Details |
|---|---|
| **Version** | v1.0.0 |
| **Last Updated** | 27 May 2026 |
| **Status** | Stable |

**Responsibility:** Call Groq API with Llama 3.1 to generate plain-English rationale for each Red/Amber recommendation.

**Input:** `recommendations_df` filtered to Red and Amber rows

**Output:** `recommendations_df` with `rationale` column populated

**LLM config:**

| Parameter | Value | Notes |
|---|---|---|
| Provider | Groq | Free tier |
| Model | `llama-3.1-8b-instant` | Switch to `70b` for richer output |
| `max_tokens` | 150 | Keeps rationale concise |
| `temperature` | 0.3 | Low randomness for factual rationale |
| Batch size | 10 SKUs per call | Stays within rate limits |
| Retry attempts | 3 | Exponential backoff: 1s, 2s, 4s |

**Prompt template** (stored in `rationale.py`, update here when changed):
```
You are a retail merchandising assistant.
Write a 2–3 sentence plain-English rationale for this markdown recommendation. Be specific with numbers.

SKU: {sku_id} | Store: {store}
Current daily velocity: {velocity:.1f} units/day
Stock on hand: {stock} units | Days of cover: {days_cover:.0f} days
Season ends in: {days_remaining} days
Recommended markdown: {markdown_pct}%
Expected velocity lift: {lift}x (historical category average)

Rationale:
```

**Fallback behaviour:**
- If Groq API call fails after 3 retries → populate `rationale` with: `"Rationale unavailable – please review metrics manually."`
- Do not block dashboard rendering on LLM failure.

**Update this section when:** Model changed, prompt template updated, temperature/token settings changed, new fallback logic added.

---

### 6. `export.py` – Output & Export

| Field | Details |
|---|---|
| **Version** | v1.0.0 |
| **Last Updated** | 27 May 2026 |
| **Status** | Stable |

**Responsibility:** Format `recommendations_df` and generate a downloadable Excel action sheet.

**Input:** `recommendations_df` (full, with rationale)

**Output:** In-memory `BytesIO` Excel file passed to `st.download_button()`

**Action sheet columns:**

| # | Column | Source |
|---|---|---|
| 1 | SKU | `recommendations_df.sku` |
| 2 | Store | `recommendations_df.store` |
| 3 | Urgency Tier | `recommendations_df.urgency_tier` |
| 4 | Recommended Markdown % | `recommendations_df.markdown_pct` |
| 5 | Current Stock | `recommendations_df.stock_on_hand` |
| 6 | Daily Velocity (14d) | `recommendations_df.velocity_14d` |
| 7 | Days of Cover | `recommendations_df.days_of_cover` |
| 8 | Sell-Through Rate % | `recommendations_df.sell_through_pct` |
| 9 | Action By Date | `recommendations_df.action_by_date` |
| 10 | Rationale | `recommendations_df.rationale` |

**Excel formatting applied:**
- Header row: bold, white text, dark background (`#1E293B`)
- Red rows: light red fill (`#FEE2E2`)
- Amber rows: light amber fill (`#FEF3C7`)
- Green rows: light green fill (`#DCFCE7`)
- Column widths: auto-fit to content

**Update this section when:** New columns added to action sheet, formatting changes, additional export formats added (e.g., CSV export).

---

## Data Flow

```
┌─────────────────────────────────────────────────────────────┐
│  USER UPLOADS                                               │
│  pos_sales.csv  +  inventory.csv                            │
└──────────────────────┬──────────────────────────────────────┘
                       │
              ┌────────▼────────┐
              │  ingestion.py   │  Validate, clean, standardise
              │                 │  → pos_df, inventory_df
              └────────┬────────┘
                       │
              ┌────────▼────────┐
              │  features.py    │  Compute sell-through,
              │                 │  days-of-cover, velocity
              │                 │  → features_df
              └────────┬────────┘
                       │
              ┌────────▼────────┐
              │ recommender.py  │  Apply tier rules + markdown %
              │                 │  → recommendations_df
              └────────┬────────┘
                       │
              ┌────────▼────────┐
              │  rationale.py   │  Groq API → Llama 3.1
              │                 │  Plain-English rationale
              │                 │  → recommendations_df + rationale
              └────────┬────────┘
                       │
           ┌───────────┴───────────┐
           │                       │
  ┌────────▼────────┐   ┌──────────▼──────────┐
  │   app.py        │   │    export.py         │
  │   Dashboard     │   │    Excel download     │
  │   Red/Amber/    │   │    action sheet       │
  │   Green UI      │   └──────────────────────┘
  └─────────────────┘
```

---

## API Contracts

### Internal Function Signatures

These are the agreed interfaces between modules. Update here when signatures change.

```python
# ingestion.py
def load_and_validate(pos_file, inventory_file) -> tuple[pd.DataFrame, pd.DataFrame]:
    """Returns (pos_df, inventory_df) or raises ValidationError."""

# features.py
def compute_features(pos_df: pd.DataFrame, inventory_df: pd.DataFrame) -> pd.DataFrame:
    """Returns features_df with one row per SKU × Store."""

# recommender.py
def generate_recommendations(features_df: pd.DataFrame) -> pd.DataFrame:
    """Returns recommendations_df with urgency_tier, markdown_pct, action_by_date."""

# rationale.py
def generate_rationale(recommendations_df: pd.DataFrame) -> pd.DataFrame:
    """Returns recommendations_df with rationale column populated."""

# export.py
def build_action_sheet(recommendations_df: pd.DataFrame) -> BytesIO:
    """Returns in-memory Excel file for st.download_button()."""
```

### External API – Groq

| Field | Value |
|---|---|
| Endpoint | `https://api.groq.com/openai/v1/chat/completions` |
| Auth | Bearer token via `st.secrets["GROQ_API_KEY"]` |
| Model | `llama-3.1-8b-instant` |
| Rate limit (free) | 30 req/min, 14,400 tokens/min |
| SDK | `groq==0.9.0` |

**Update this section when:** API version changes, model upgraded, new external APIs integrated.

---

## Configuration & Environment

All tuneable constants live in `config/settings.py`. **Never hardcode thresholds in module files.**

```python
# config/settings.py  –  Update this file for new seasons or threshold changes

# ── Season Config ──────────────────────────────────────────
SEASON_START_DATE           = "2026-03-01"
SEASON_END_DATE             = "2026-06-30"

# ── Feature Engine ─────────────────────────────────────────
VELOCITY_WINDOW_DAYS        = 14
TREND_WINDOW_DAYS           = 7

# ── Urgency Tier Thresholds ────────────────────────────────
RED_SELLTHROUGH_THRESHOLD   = 60    # %
AMBER_SELLTHROUGH_THRESHOLD = 75    # %
RED_DOC_MULTIPLIER          = 1.0   # days_of_cover > season_remaining × this → Red
AMBER_DOC_MULTIPLIER        = 0.75  # → Amber

# ── Markdown Band Rules ────────────────────────────────────
MARKDOWN_BANDS = {
    "red_critical":  (30, 40),   # (min%, max%)
    "red_moderate":  (20, 30),
    "amber_decel":   (15, 20),
    "amber_stable":  (10, 15),
}

# ── LLM Config ─────────────────────────────────────────────
LLM_MODEL                   = "llama-3.1-8b-instant"
LLM_MAX_TOKENS              = 150
LLM_TEMPERATURE             = 0.3
LLM_BATCH_SIZE              = 10
LLM_RETRY_ATTEMPTS          = 3
```

**Update this section when:** Any threshold, window, or LLM parameter changes.

---

## Error Handling Strategy

| Error Type | Where it occurs | Handling |
|---|---|---|
| Missing required CSV columns | `ingestion.py` | `st.error()` shown; processing halted |
| Unparseable date values | `ingestion.py` | Rows dropped; `st.warning()` with count |
| Division by zero (velocity = 0) | `features.py` | `days_of_cover` set to `null`; flagged as Green |
| Groq API rate limit (429) | `rationale.py` | Retry with exponential backoff (3×) |
| Groq API failure after retries | `rationale.py` | Fallback text inserted; dashboard unblocked |
| Empty DataFrame after filters | `recommender.py` | `st.info()` – "No SKUs match current filters" |
| Excel generation failure | `export.py` | `st.error()` with download disabled |

---

## Adding a New Feature – Checklist

Use this checklist every time a new backend feature is added:

```
[ ] New logic added to the correct src/ module
[ ] Function signature updated in API Contracts section
[ ] New config constants added to config/settings.py and documented above
[ ] New columns added to features_df or recommendations_df listed in the relevant module section
[ ] Error handling case added to Error Handling Strategy table (if applicable)
[ ] Data Flow diagram updated (if new module or new step)
[ ] Tests written in tests/
[ ] Version bumped in header (minor bump x.Y.z for features, patch x.y.Z for fixes)
[ ] Changelog entry added at the bottom of this document
```

---

## Module Template

Copy this block when adding a new module to `src/`:

```markdown
### N. `filename.py` – Module Name

| Field | Details |
|---|---|
| **Version** | v1.0.0 |
| **Last Updated** | DD MMM YYYY |
| **Status** | Stable / In Progress / Deprecated |

**Responsibility:** One sentence describing what this module owns.

**Input:** What it receives and from where.

**Output:** What it returns and what consumes it.

**Key logic / rules:**
(Table or bullets describing the main logic)

**Config dependency (`config/settings.py`):**
(Any constants this module reads)

**Update this section when:** Conditions that should trigger a doc update.
```

---

## Changelog

All notable changes to the backend are recorded here. Newest entries at the top.

Format: `[vX.Y.Z] – YYYY-MM-DD – Brief description – Author`

---

| Version | Date | Change | Author |
|---|---|---|---|
| v1.0.0 | 2026-05-27 | Initial backend structure defined | Deep Mind Developers |

---

> **Next planned updates:**
> - v1.1.0 – Add category-level elasticity multiplier lookup to `recommender.py`
> - v1.2.0 – Add multi-season historical comparison to `features.py`
> - v1.3.0 – Add email/Slack notification module for Red-tier alerts
