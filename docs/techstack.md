# Tech Stack

## AI-Powered Markdown & Clearance Optimiser

| Field | Details |
|---|---|
| **Team** | Team 27 – Deep Mind Developers |
| **Domain** | Retail |
| **Version** | v1.0 |
| **Date** | 27 May 2026 |
| **Deployment Target** | Streamlit Community Cloud |

---

## Stack Overview

| Layer | Technology | Version | Cost |
|---|---|---|---|
| UI & App Framework | Streamlit | ≥ 1.35.0 | Free |
| Data Processing | Python | 3.11+ | Free |
| Dataframe Engine | Pandas | ≥ 2.2.0 | Free |
| Numerical Computing | NumPy | ≥ 1.26.0 | Free |
| LLM Provider | Groq API | Latest | Free tier |
| LLM Model | Llama 3.1 8B / 70B | Meta Llama 3.1 | Free |
| Visualisation | Plotly | ≥ 5.22.0 | Free |
| Excel Export | OpenPyXL (via Pandas) | ≥ 3.1.2 | Free |
| Deployment | Streamlit Community Cloud | – | Free |
| Secrets Management | Streamlit Secrets (`secrets.toml`) | Built-in | Free |

---

## Layer-by-Layer Breakdown

### 1. UI & App Framework – Streamlit `≥ 1.35.0`

**Purpose:** Provides the entire front-end – file upload, dashboard, filters, and export button – without any HTML/CSS/JS.

**Key features used:**
- `st.file_uploader()` – drag-and-drop CSV ingestion for POS and inventory files
- `st.dataframe()` / `st.plotly_chart()` – interactive Red/Amber/Green dashboard
- `st.selectbox()` / `st.multiselect()` – store, category, and urgency tier filters
- `st.download_button()` – one-click Excel action sheet export
- `st.spinner()` / `st.progress()` – loading state during feature computation and LLM calls

**Config notes:**
- Pin version in `requirements.txt`: `streamlit==1.35.0`
- Set page config in `app.py`:
  ```python
  st.set_page_config(page_title="Markdown Optimiser", layout="wide")
  ```
- For Community Cloud deployment, add `streamlit` to `requirements.txt` (not `setup.py`)

---

### 2. Data Processing – Python `3.11+`

**Purpose:** Runtime for all business logic, feature engineering, and orchestration.

**Config notes:**
- Specify runtime in `.python-version` or `runtime.txt` for Community Cloud:
  ```
  python-3.11
  ```
- Use `3.11` over `3.12` for broader library compatibility on Community Cloud.

---

### 3. Dataframe Engine – Pandas `≥ 2.2.0`

**Purpose:** Core data wrangling – CSV ingestion, feature computation, and output formatting.

**Key operations:**
- `pd.read_csv()` – ingest POS sales and inventory snapshots
- `.groupby(['SKU', 'Store'])` – compute per-SKU-per-store metrics
- Rolling window functions – trailing 7/14-day velocity trend
- `.merge()` – join sales and inventory datasets on SKU × Store key

**Feature computations (all in Pandas):**

| Feature | Formula |
|---|---|
| Sell-Through Rate | `Units Sold / Opening Stock × 100` |
| Daily Velocity | `Units Sold (last 14 days) / 14` |
| Days of Cover | `Stock on Hand / Daily Velocity` |
| Velocity Trend | `Slope of 7-day rolling units sold` |

**Config notes:**
- Pin in `requirements.txt`: `pandas==2.2.2`
- Use `pd.ArrowDtype` for faster CSV parsing on large datasets (optional optimisation)

---

### 4. Numerical Computing – NumPy `≥ 1.26.0`

**Purpose:** Supports Pandas operations; used directly for elasticity multiplier lookups and urgency threshold calculations.

**Config notes:**
- Pin in `requirements.txt`: `numpy==1.26.4`
- No direct user-facing usage; primarily a Pandas dependency.

---

### 5. LLM Provider – Groq API (Free Tier)

**Purpose:** Hosts inference for the Llama 3.1 model. Selected for its extremely low latency (typically < 1s per call) and generous free tier.

**Free tier limits:**
| Model | Requests/min | Tokens/min | Tokens/day |
|---|---|---|---|
| Llama 3.1 8B | 30 | 14,400 | 500,000 |
| Llama 3.1 70B | 30 | 6,000 | 500,000 |

**Config notes:**
- Install SDK: `groq==0.9.0` (pin in `requirements.txt`)
- Store API key in Streamlit secrets – **never hardcode**:
  ```toml
  # .streamlit/secrets.toml (local)
  GROQ_API_KEY = "gsk_xxxxxxxxxxxxxxxxxxxx"
  ```
  On Community Cloud, add via **App Settings → Secrets**.
- Initialise client:
  ```python
  from groq import Groq
  client = Groq(api_key=st.secrets["GROQ_API_KEY"])
  ```
- Implement retry logic with exponential backoff for rate limit handling:
  ```python
  import time
  for attempt in range(3):
      try:
          response = client.chat.completions.create(...)
          break
      except Exception:
          time.sleep(2 ** attempt)
  ```

---

### 6. LLM Model – Meta Llama 3.1

**Purpose:** Generates plain-English rationale for each markdown recommendation. Used only as an explainability layer – all business logic runs in Python.

**Model selection:**

| Model | Use case | Latency | Token cost |
|---|---|---|---|
| `llama-3.1-8b-instant` | Default – fast, good for structured rationale | ~0.3s | Lower |
| `llama-3.1-70b-versatile` | Fallback – richer language, slower | ~1–2s | Higher |

**Recommended prompt structure:**
```python
prompt = f"""
You are a retail merchandising assistant. Write a 2-3 sentence plain-English rationale 
for the following markdown recommendation. Be specific with numbers.

SKU: {sku_id}
Store: {store}
Current daily velocity: {velocity:.1f} units/day
Stock on hand: {stock} units
Days of cover: {days_cover:.0f} days
Recommended markdown: {markdown_pct}%
Expected velocity lift at this discount: {lift}x (historical category average)

Rationale:
"""
```

**Config notes:**
- Start with `llama-3.1-8b-instant`; upgrade to `70b` only if rationale quality is insufficient.
- Set `max_tokens=150` to keep rationales concise and control API usage.
- Process rationale calls in batches of 10 to stay within rate limits.

---

### 7. Visualisation – Plotly `≥ 5.22.0`

**Purpose:** Interactive dashboard charts rendered inside Streamlit.

**Charts used:**
- `px.bar()` – SKU sell-through rate by store (colour-coded by urgency tier)
- `px.scatter()` – Days of Cover vs. Velocity (bubble size = stock on hand)
- `px.treemap()` – inventory at risk by category/store
- Colour mapping: Red `#EF4444`, Amber `#F59E0B`, Green `#10B981`

**Config notes:**
- Pin in `requirements.txt`: `plotly==5.22.0`
- Render with: `st.plotly_chart(fig, use_container_width=True)`

---

### 8. Excel Export – OpenPyXL via Pandas

**Purpose:** Generates the one-click action sheet download as a formatted `.xlsx` file.

**Output columns in action sheet:**

| Column | Description |
|---|---|
| SKU | Product identifier |
| Store | Store name/code |
| Urgency Tier | Red / Amber / Green |
| Recommended Markdown % | Suggested discount |
| Current Stock | Units on hand |
| Daily Velocity | Avg units/day (14-day trailing) |
| Days of Cover | Days to stockout at current velocity |
| Sell-Through Rate | % sold of opening stock |
| Rationale | GenAI-generated plain-English explanation |

**Config notes:**
- Pin in `requirements.txt`: `openpyxl==3.1.2`
- Export pattern:
  ```python
  from io import BytesIO
  buffer = BytesIO()
  df.to_excel(buffer, index=False, engine='openpyxl')
  st.download_button("⬇️ Download Action Sheet", buffer.getvalue(),
                     file_name="markdown_recommendations.xlsx",
                     mime="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")
  ```

---

### 9. Deployment – Streamlit Community Cloud

**Purpose:** Free, zero-infrastructure hosting directly from a GitHub repository.

**Deployment steps:**
1. Push code to a **public** GitHub repository.
2. Go to [share.streamlit.io](https://share.streamlit.io) → **New app**.
3. Select repo, branch (`main`), and entry point (`app.py`).
4. Add `GROQ_API_KEY` under **App Settings → Secrets**.
5. Click **Deploy** → live URL generated in ~2 minutes.

**Required files in repo root:**

| File | Purpose |
|---|---|
| `app.py` | Streamlit entry point |
| `requirements.txt` | All Python dependencies |
| `runtime.txt` | Python version (`python-3.11`) |
| `.streamlit/config.toml` | Optional – theme and server config |

**Community Cloud constraints:**
- 1 GB RAM limit – keep dataset sizes under ~500K rows for safety.
- App sleeps after 7 days of inactivity (free tier); wakes on next visit.
- Secrets are encrypted at rest; never commit `secrets.toml` to Git.
- Add `.streamlit/secrets.toml` to `.gitignore`.

---

### 10. Secrets Management – Streamlit Secrets

**Purpose:** Securely store and access the Groq API key without hardcoding.

**Local development (`secrets.toml`):**
```toml
# .streamlit/secrets.toml – DO NOT commit to Git
GROQ_API_KEY = "gsk_xxxxxxxxxxxxxxxxxxxx"
```

**Access in code:**
```python
import streamlit as st
api_key = st.secrets["GROQ_API_KEY"]
```

**Config notes:**
- Add `.streamlit/secrets.toml` to `.gitignore` immediately.
- On Community Cloud, manage secrets via the web UI (Settings → Secrets tab).

---

## `requirements.txt`

```txt
streamlit==1.35.0
pandas==2.2.2
numpy==1.26.4
groq==0.9.0
plotly==5.22.0
openpyxl==3.1.2
```

---

## Project Structure

```
markdown-optimiser/
├── app.py                        # Streamlit entry point
├── requirements.txt              # Python dependencies
├── runtime.txt                   # Python version for Community Cloud
├── .gitignore                    # Excludes secrets.toml, __pycache__, etc.
├── .streamlit/
│   ├── config.toml               # Theme and layout config
│   └── secrets.toml              # Local secrets (never commit)
├── src/
│   ├── ingestion.py              # CSV upload, validation, parsing
│   ├── features.py               # Sell-through, days-of-cover, velocity
│   ├── recommender.py            # Urgency tiering + markdown % logic
│   ├── rationale.py              # Groq API calls + prompt templates
│   └── export.py                 # Excel action sheet generation
└── data/
    └── sample/
        ├── pos_sales_sample.csv  # Demo POS data
        └── inventory_sample.csv  # Demo inventory snapshot
```

---

## Environment Setup (Local)

```bash
# 1. Clone the repo
git clone https://github.com/your-org/markdown-optimiser.git
cd markdown-optimiser

# 2. Create and activate virtual environment
python -m venv venv
source venv/bin/activate        # macOS/Linux
venv\Scripts\activate           # Windows

# 3. Install dependencies
pip install -r requirements.txt

# 4. Add your Groq API key
mkdir -p .streamlit
echo 'GROQ_API_KEY = "gsk_xxxxxxxxxxxxxxxxxxxx"' > .streamlit/secrets.toml

# 5. Run the app
streamlit run app.py
```

---

## Groq API – Getting Started

1. Sign up at [console.groq.com](https://console.groq.com)
2. Navigate to **API Keys** → **Create API Key**
3. Copy the key (shown only once) and paste into `secrets.toml`
4. Free tier is activated automatically – no credit card required
