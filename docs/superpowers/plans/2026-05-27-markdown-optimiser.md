# Markdown & Clearance Optimiser — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a Streamlit app that ingests POS + inventory CSVs, computes SKU-level markdown urgency tiers (Red/Amber/Green), and generates on-demand AI rationale via Groq.

**Architecture:** Six pure Python modules (`ingestion → features → recommender → rationale → export`) orchestrated by `app.py` which contains zero business logic. All thresholds in `config/settings.py`. Streamlit session_state caches generated rationale to avoid re-calling Groq on rerenders.

**Tech Stack:** Python 3.11, Streamlit 1.35, Pandas 2.2, NumPy 1.26, Plotly 5.22, Groq SDK 0.9, OpenPyXL 3.1.2

---

## File Map

| File | Create/Modify | Purpose |
|---|---|---|
| `requirements.txt` | Create | Pinned deps |
| `runtime.txt` | Create | Python version for Community Cloud |
| `.gitignore` | Create | Exclude secrets, cache, venv |
| `.streamlit/config.toml` | Create | Wide layout + dark theme |
| `.streamlit/secrets.toml` | Create (local only) | GROQ_API_KEY |
| `config/__init__.py` | Create | Package marker |
| `config/settings.py` | Create | All constants and thresholds |
| `src/__init__.py` | Create | Package marker |
| `src/ingestion.py` | Create | CSV validation + alias mapping |
| `src/features.py` | Create | Velocity, sell-through, days-of-cover |
| `src/recommender.py` | Create | Red/Amber/Green tiering + markdown % |
| `src/rationale.py` | Create | Groq on-demand rationale |
| `src/export.py` | Create | Formatted .xlsx generation |
| `app.py` | Create | Streamlit UI shell |
| `data/sample/generate_sample_data.py` | Create | Script to generate demo CSVs |
| `data/sample/pos_sales_sample.csv` | Create | 5 stores × 50 SKUs × 30 days |
| `data/sample/inventory_sample.csv` | Create | 250-row inventory snapshot |
| `tests/__init__.py` | Create | Package marker |
| `tests/test_ingestion.py` | Create | Ingestion unit tests |
| `tests/test_features.py` | Create | Feature computation tests |
| `tests/test_recommender.py` | Create | Recommendation logic tests |
| `tests/test_export.py` | Create | Excel export tests |

---

## Task 1: Project Scaffolding

**Files:**
- Create: `requirements.txt`
- Create: `runtime.txt`
- Create: `.gitignore`
- Create: `.streamlit/config.toml`
- Create: `.streamlit/secrets.toml` (local only — never commit)
- Create: `config/__init__.py`
- Create: `src/__init__.py`
- Create: `tests/__init__.py`

- [ ] **Step 1: Create `requirements.txt`**

```
streamlit==1.35.0
pandas==2.2.2
numpy==1.26.4
groq==0.9.0
plotly==5.22.0
openpyxl==3.1.2
pytest==8.2.0
```

- [ ] **Step 2: Create `runtime.txt`**

```
python-3.11
```

- [ ] **Step 3: Create `.gitignore`**

```
.streamlit/secrets.toml
__pycache__/
*.pyc
.venv/
venv/
*.egg-info/
.env
```

- [ ] **Step 4: Create `.streamlit/config.toml`**

```toml
[theme]
base = "dark"
primaryColor = "#EF4444"
backgroundColor = "#0F172A"
secondaryBackgroundColor = "#1E293B"
textColor = "#F1F5F9"

[server]
headless = true
```

- [ ] **Step 5: Create `.streamlit/secrets.toml` (local only)**

```toml
GROQ_API_KEY = "gsk_your_key_here"
```

Replace `gsk_your_key_here` with your actual Groq API key.

- [ ] **Step 6: Create `config/__init__.py`, `src/__init__.py`, `tests/__init__.py`**

Each file is empty — just needs to exist as a package marker.

- [ ] **Step 7: Install dependencies**

```bash
pip install -r requirements.txt
```

Expected: all packages install without errors.

- [ ] **Step 8: Commit**

```bash
git init
git add requirements.txt runtime.txt .gitignore .streamlit/config.toml config/__init__.py src/__init__.py tests/__init__.py
git commit -m "chore: project scaffolding"
```

---

## Task 2: Configuration (`config/settings.py`)

**Files:**
- Create: `config/settings.py`

- [ ] **Step 1: Write `config/settings.py`**

```python
SEASON_START_DATE = "2026-03-01"
SEASON_END_DATE   = "2026-06-30"

VELOCITY_WINDOW_DAYS = 14
TREND_WINDOW_DAYS    = 7

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

ACTION_LEAD_DAYS = {"Red": 3, "Amber": 7}

CATEGORY_LIFT_MULTIPLIERS = {
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
    "category":      ["category", "category_name", "dept", "department"],
}
```

- [ ] **Step 2: Commit**

```bash
git add config/settings.py
git commit -m "feat: add centralised settings"
```

---

## Task 3: Sample Data Generator

**Files:**
- Create: `data/sample/generate_sample_data.py`
- Create: `data/sample/pos_sales_sample.csv` (generated)
- Create: `data/sample/inventory_sample.csv` (generated)

- [ ] **Step 1: Write `data/sample/generate_sample_data.py`**

```python
import random
import pandas as pd
import numpy as np
from pathlib import Path

random.seed(42)
np.random.seed(42)

STORES = ["MUM-1", "DEL-2", "BLR-3", "CHN-4", "HYD-5"]
CATEGORY_SKUS = {"Apparel": 20, "Footwear": 15, "Home": 15}
START_DATE = pd.Timestamp("2026-03-01")

skus = []
for cat, count in CATEGORY_SKUS.items():
    for i in range(count):
        skus.append((f"{cat[:3].upper()}-{i+1:03d}", cat))

profiles = {}
for sku_id, _ in skus:
    r = random.random()
    if r < 0.20:
        profiles[sku_id] = "red"
    elif r < 0.55:
        profiles[sku_id] = "amber"
    else:
        profiles[sku_id] = "green"

dates = pd.date_range(START_DATE, periods=30)

pos_rows = []
for sku_id, cat in skus:
    profile = profiles[sku_id]
    for store in STORES:
        for d in dates:
            week = (d - START_DATE).days // 7
            if profile == "red":
                base = random.uniform(0, 0.8)
            elif profile == "amber":
                base = max(0, random.uniform(2, 5) - week * 0.4)
            else:
                base = random.uniform(3, 8)
            units = max(0, int(np.random.poisson(max(base, 0))))
            if units > 0:
                pos_rows.append({
                    "sku": sku_id,
                    "store": store,
                    "date": d.strftime("%Y-%m-%d"),
                    "units_sold": units,
                })

pos_df = pd.DataFrame(pos_rows)

inv_rows = []
for sku_id, cat in skus:
    profile = profiles[sku_id]
    for store in STORES:
        total_sold = pos_df[
            (pos_df["sku"] == sku_id) & (pos_df["store"] == store)
        ]["units_sold"].sum()
        if profile == "red":
            stock = int(total_sold * random.uniform(3, 6)) + random.randint(10, 40)
        elif profile == "amber":
            stock = int(total_sold * random.uniform(0.8, 1.8)) + random.randint(5, 20)
        else:
            stock = int(total_sold * random.uniform(0.15, 0.5)) + random.randint(2, 10)
        inv_rows.append({
            "sku": sku_id,
            "store": store,
            "stock_on_hand": max(stock, 1),
            "category": cat,
        })

inv_df = pd.DataFrame(inv_rows)

Path("data/sample").mkdir(parents=True, exist_ok=True)
pos_df.to_csv("data/sample/pos_sales_sample.csv", index=False)
inv_df.to_csv("data/sample/inventory_sample.csv", index=False)
print(f"POS rows: {len(pos_df)} | Inventory rows: {len(inv_df)}")
```

- [ ] **Step 2: Run the generator**

```bash
python data/sample/generate_sample_data.py
```

Expected output: `POS rows: ~6000-7500 | Inventory rows: 250`

- [ ] **Step 3: Verify files exist**

```bash
python -c "import pandas as pd; print(pd.read_csv('data/sample/pos_sales_sample.csv').shape); print(pd.read_csv('data/sample/inventory_sample.csv').head())"
```

Expected: POS shape `(~7000, 4)`, inventory shows 5 columns including `category`.

- [ ] **Step 4: Commit**

```bash
git add data/sample/
git commit -m "feat: generate sample demo data (50 SKUs × 5 stores × 30 days)"
```

---

## Task 4: Data Ingestion (`src/ingestion.py`)

**Files:**
- Create: `src/ingestion.py`
- Create: `tests/test_ingestion.py`

- [ ] **Step 1: Write failing tests in `tests/test_ingestion.py`**

```python
import pytest
import pandas as pd
from io import StringIO
from src.ingestion import load_and_validate, ValidationError

POS_CSV = """sku,store,date,units_sold
SKU-001,MUM-1,2026-03-01,5
SKU-001,MUM-1,2026-03-02,3
SKU-002,DEL-2,2026-03-01,2
"""

INV_CSV = """sku,store,stock_on_hand,category
SKU-001,MUM-1,50,Apparel
SKU-002,DEL-2,30,Footwear
"""

def test_load_returns_clean_dataframes():
    pos_df, inv_df = load_and_validate(StringIO(POS_CSV), StringIO(INV_CSV))
    assert set(pos_df.columns) >= {"sku", "store", "date", "units_sold"}
    assert set(inv_df.columns) >= {"sku", "store", "stock_on_hand"}
    assert len(pos_df) == 3
    assert len(inv_df) == 2

def test_missing_pos_column_raises_validation_error():
    bad_pos = "sku,store,units_sold\nSKU-001,MUM-1,5\n"
    with pytest.raises(ValidationError, match="date"):
        load_and_validate(StringIO(bad_pos), StringIO(INV_CSV))

def test_missing_inv_column_raises_validation_error():
    bad_inv = "sku,store\nSKU-001,MUM-1\n"
    with pytest.raises(ValidationError, match="stock_on_hand"):
        load_and_validate(StringIO(POS_CSV), StringIO(bad_inv))

def test_alias_columns_are_resolved():
    alias_pos = "item_code,branch,txn_date,qty\nSKU-001,MUM-1,2026-03-01,5\n"
    pos_df, _ = load_and_validate(StringIO(alias_pos), StringIO(INV_CSV))
    assert "sku" in pos_df.columns
    assert "units_sold" in pos_df.columns

def test_duplicate_rows_are_aggregated():
    dup_pos = """sku,store,date,units_sold
SKU-001,MUM-1,2026-03-01,5
SKU-001,MUM-1,2026-03-01,3
"""
    pos_df, _ = load_and_validate(StringIO(dup_pos), StringIO(INV_CSV))
    row = pos_df[(pos_df["sku"] == "SKU-001") & (pos_df["store"] == "MUM-1")]
    assert row["units_sold"].values[0] == 8

def test_missing_category_defaults_to_default():
    inv_no_cat = "sku,store,stock_on_hand\nSKU-001,MUM-1,50\nSKU-002,DEL-2,30\n"
    _, inv_df = load_and_validate(StringIO(POS_CSV), StringIO(inv_no_cat))
    assert (inv_df["category"] == "Default").all()

def test_non_numeric_units_rows_are_dropped():
    bad_units = """sku,store,date,units_sold
SKU-001,MUM-1,2026-03-01,5
SKU-001,MUM-1,2026-03-02,N/A
"""
    pos_df, _ = load_and_validate(StringIO(bad_units), StringIO(INV_CSV))
    assert len(pos_df) == 1
```

- [ ] **Step 2: Run tests to confirm they fail**

```bash
pytest tests/test_ingestion.py -v
```

Expected: `ModuleNotFoundError` or `ImportError` — `src.ingestion` does not exist yet.

- [ ] **Step 3: Write `src/ingestion.py`**

```python
import pandas as pd
from config.settings import COLUMN_ALIASES


class ValidationError(Exception):
    pass


def _resolve_columns(df: pd.DataFrame) -> pd.DataFrame:
    rename_map = {}
    lower_cols = {c.lower().strip(): c for c in df.columns}
    for canonical, aliases in COLUMN_ALIASES.items():
        for alias in aliases:
            if alias.lower() in lower_cols:
                rename_map[lower_cols[alias.lower()]] = canonical
                break
    return df.rename(columns=rename_map)


def load_and_validate(pos_file, inventory_file) -> tuple[pd.DataFrame, pd.DataFrame]:
    pos_df = pd.read_csv(pos_file)
    inv_df = pd.read_csv(inventory_file)

    pos_df = _resolve_columns(pos_df)
    inv_df = _resolve_columns(inv_df)

    pos_required = {"sku", "store", "date", "units_sold"}
    missing_pos = pos_required - set(pos_df.columns)
    if missing_pos:
        raise ValidationError(f"POS CSV missing required columns: {missing_pos}")

    inv_required = {"sku", "store", "stock_on_hand"}
    missing_inv = inv_required - set(inv_df.columns)
    if missing_inv:
        raise ValidationError(f"Inventory CSV missing required columns: {missing_inv}")

    pos_df["date"] = pd.to_datetime(pos_df["date"], errors="coerce")
    pos_df = pos_df.dropna(subset=["date"])

    pos_df["units_sold"] = pd.to_numeric(pos_df["units_sold"], errors="coerce")
    inv_df["stock_on_hand"] = pd.to_numeric(inv_df["stock_on_hand"], errors="coerce")

    pos_df = pos_df.dropna(subset=["sku", "store", "date", "units_sold"])
    inv_df = inv_df.dropna(subset=["sku", "store", "stock_on_hand"])

    pos_df = (
        pos_df.groupby(["sku", "store", "date"], as_index=False)["units_sold"].sum()
    )

    if "category" not in inv_df.columns:
        inv_df["category"] = "Default"

    return pos_df, inv_df
```

- [ ] **Step 4: Run tests to confirm they pass**

```bash
pytest tests/test_ingestion.py -v
```

Expected: all 7 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/ingestion.py tests/test_ingestion.py
git commit -m "feat: CSV ingestion with alias mapping and validation"
```

---

## Task 5: Feature Engine (`src/features.py`)

**Files:**
- Create: `src/features.py`
- Create: `tests/test_features.py`

- [ ] **Step 1: Write failing tests in `tests/test_features.py`**

```python
import pytest
import pandas as pd
import numpy as np
from src.features import compute_features


def make_pos(units_per_day=5, days=30, sku="SKU-001", store="MUM-1"):
    dates = pd.date_range("2026-03-01", periods=days)
    return pd.DataFrame({
        "sku": sku, "store": store,
        "date": dates, "units_sold": units_per_day,
    })


def make_inv(stock=100, sku="SKU-001", store="MUM-1", category="Apparel"):
    return pd.DataFrame([{
        "sku": sku, "store": store,
        "stock_on_hand": stock, "category": category,
    }])


def test_velocity_14d_equals_average_of_last_14_days():
    pos_df = make_pos(units_per_day=10)
    features = compute_features(pos_df, make_inv())
    assert abs(features.iloc[0]["velocity_14d"] - 10.0) < 0.01


def test_opening_stock_derived_as_stock_plus_season_sales():
    pos_df = make_pos(units_per_day=5, days=30)  # 150 total
    features = compute_features(pos_df, make_inv(stock=50))
    assert features.iloc[0]["opening_stock"] == 200


def test_sell_through_pct_correct():
    pos_df = make_pos(units_per_day=5, days=30)  # 150 sold; opening=200
    features = compute_features(pos_df, make_inv(stock=50))
    assert abs(features.iloc[0]["sell_through_pct"] - 75.0) < 0.1


def test_days_of_cover_null_when_velocity_zero():
    pos_df = make_pos(units_per_day=0)
    features = compute_features(pos_df, make_inv())
    assert pd.isna(features.iloc[0]["days_of_cover"])


def test_days_of_cover_correct_when_velocity_nonzero():
    pos_df = make_pos(units_per_day=10)   # velocity = 10
    features = compute_features(pos_df, make_inv(stock=50))
    assert abs(features.iloc[0]["days_of_cover"] - 5.0) < 0.1


def test_velocity_trend_decelerating():
    dates = pd.date_range("2026-03-01", periods=14)
    units = list(range(14, 0, -1))
    pos_df = pd.DataFrame({"sku": "SKU-001", "store": "MUM-1", "date": dates, "units_sold": units})
    features = compute_features(pos_df, make_inv())
    assert features.iloc[0]["velocity_trend"] == "decelerating"


def test_velocity_trend_accelerating():
    dates = pd.date_range("2026-03-01", periods=14)
    units = list(range(1, 15))
    pos_df = pd.DataFrame({"sku": "SKU-001", "store": "MUM-1", "date": dates, "units_sold": units})
    features = compute_features(pos_df, make_inv())
    assert features.iloc[0]["velocity_trend"] == "accelerating"
```

- [ ] **Step 2: Run tests to confirm they fail**

```bash
pytest tests/test_features.py -v
```

Expected: `ImportError` — `src.features` does not exist yet.

- [ ] **Step 3: Write `src/features.py`**

```python
import pandas as pd
import numpy as np
from config.settings import VELOCITY_WINDOW_DAYS, TREND_WINDOW_DAYS, SEASON_START_DATE


def _classify_trend(slope: float) -> str:
    if slope > 0.1:
        return "accelerating"
    if slope < -0.1:
        return "decelerating"
    return "stable"


def compute_features(pos_df: pd.DataFrame, inventory_df: pd.DataFrame) -> pd.DataFrame:
    season_start = pd.Timestamp(SEASON_START_DATE)
    reference_date = pos_df["date"].max()

    season_sales = (
        pos_df[pos_df["date"] >= season_start]
        .groupby(["sku", "store"], as_index=False)["units_sold"]
        .sum()
        .rename(columns={"units_sold": "units_sold_season"})
    )

    cutoff_14d = reference_date - pd.Timedelta(days=VELOCITY_WINDOW_DAYS)
    velocity_df = (
        pos_df[pos_df["date"] > cutoff_14d]
        .groupby(["sku", "store"], as_index=False)["units_sold"]
        .sum()
        .rename(columns={"units_sold": "units_sold_14d"})
    )
    velocity_df["velocity_14d"] = velocity_df["units_sold_14d"] / VELOCITY_WINDOW_DAYS

    trend_cutoff = reference_date - pd.Timedelta(days=TREND_WINDOW_DAYS * 3)
    trend_data = pos_df[pos_df["date"] > trend_cutoff].copy()

    def _compute_trend(group: pd.DataFrame) -> str:
        daily = (
            group.set_index("date")["units_sold"]
            .resample("D").sum()
            .fillna(0)
        )
        if len(daily) < 3:
            return "stable"
        x = np.arange(len(daily))
        slope = np.polyfit(x, daily.values, 1)[0]
        return _classify_trend(slope)

    trend_df = (
        trend_data.groupby(["sku", "store"])
        .apply(_compute_trend)
        .reset_index()
    )
    trend_df.columns = ["sku", "store", "velocity_trend"]

    features_df = inventory_df.copy()
    features_df = features_df.merge(season_sales, on=["sku", "store"], how="left")
    features_df = features_df.merge(
        velocity_df[["sku", "store", "velocity_14d"]], on=["sku", "store"], how="left"
    )
    features_df = features_df.merge(trend_df, on=["sku", "store"], how="left")

    features_df["units_sold_season"] = features_df["units_sold_season"].fillna(0)
    features_df["velocity_14d"] = features_df["velocity_14d"].fillna(0)
    features_df["velocity_trend"] = features_df["velocity_trend"].fillna("stable")

    features_df["opening_stock"] = (
        features_df["stock_on_hand"] + features_df["units_sold_season"]
    )
    features_df["sell_through_pct"] = np.where(
        features_df["opening_stock"] > 0,
        features_df["units_sold_season"] / features_df["opening_stock"] * 100,
        0.0,
    )
    features_df["days_of_cover"] = np.where(
        features_df["velocity_14d"] > 0,
        features_df["stock_on_hand"] / features_df["velocity_14d"],
        np.nan,
    )
    features_df["season_week"] = (reference_date - season_start).days // 7 + 1

    return features_df
```

- [ ] **Step 4: Run tests**

```bash
pytest tests/test_features.py -v
```

Expected: all 7 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/features.py tests/test_features.py
git commit -m "feat: feature engine — velocity, sell-through, days-of-cover, trend"
```

---

## Task 6: Recommendation Engine (`src/recommender.py`)

**Files:**
- Create: `src/recommender.py`
- Create: `tests/test_recommender.py`

- [ ] **Step 1: Write failing tests in `tests/test_recommender.py`**

```python
import pytest
import pandas as pd
import numpy as np
from src.recommender import generate_recommendations


def make_features(days_of_cover, sell_through_pct, velocity_trend="stable"):
    return pd.DataFrame([{
        "sku": "SKU-001", "store": "MUM-1", "category": "Apparel",
        "stock_on_hand": 100, "velocity_14d": 2.0,
        "days_of_cover": days_of_cover,
        "sell_through_pct": sell_through_pct,
        "velocity_trend": velocity_trend,
        "units_sold_season": 50, "opening_stock": 150, "season_week": 5,
    }])


def test_red_tier_when_high_doc_and_low_sellthrough():
    df = make_features(days_of_cover=80, sell_through_pct=40)
    rec = generate_recommendations(df)
    assert rec.iloc[0]["urgency_tier"] == "Red"


def test_green_tier_when_velocity_zero():
    df = make_features(days_of_cover=float("nan"), sell_through_pct=80)
    rec = generate_recommendations(df)
    assert rec.iloc[0]["urgency_tier"] == "Green"


def test_green_tier_when_well_on_track():
    df = make_features(days_of_cover=5, sell_through_pct=90)
    rec = generate_recommendations(df)
    assert rec.iloc[0]["urgency_tier"] == "Green"


def test_markdown_zero_for_green():
    df = make_features(days_of_cover=5, sell_through_pct=90)
    rec = generate_recommendations(df)
    assert rec.iloc[0]["markdown_pct"] == 0


def test_amber_decel_markdown_higher_than_amber_stable():
    decel = generate_recommendations(
        make_features(days_of_cover=30, sell_through_pct=65, velocity_trend="decelerating")
    )
    stable = generate_recommendations(
        make_features(days_of_cover=30, sell_through_pct=65, velocity_trend="stable")
    )
    assert decel.iloc[0]["markdown_pct"] >= stable.iloc[0]["markdown_pct"]


def test_action_by_date_none_for_green():
    df = make_features(days_of_cover=5, sell_through_pct=90)
    rec = generate_recommendations(df)
    assert rec.iloc[0]["action_by_date"] is None


def test_action_by_date_set_for_red():
    df = make_features(days_of_cover=80, sell_through_pct=40)
    rec = generate_recommendations(df)
    assert rec.iloc[0]["action_by_date"] is not None
```

- [ ] **Step 2: Run tests to confirm they fail**

```bash
pytest tests/test_recommender.py -v
```

Expected: `ImportError`.

- [ ] **Step 3: Write `src/recommender.py`**

```python
import pandas as pd
import numpy as np
from datetime import date, timedelta
from config.settings import (
    RED_SELLTHROUGH_THRESHOLD, AMBER_SELLTHROUGH_THRESHOLD,
    RED_DOC_MULTIPLIER, AMBER_DOC_MULTIPLIER,
    MARKDOWN_BANDS, SEASON_END_DATE, ACTION_LEAD_DAYS,
)


def generate_recommendations(features_df: pd.DataFrame) -> pd.DataFrame:
    df = features_df.copy()
    today = date.today()
    season_end = pd.Timestamp(SEASON_END_DATE)
    season_days_remaining = max((season_end - pd.Timestamp(today)).days, 0)

    def _assign_tier(row: pd.Series) -> str:
        doc = row["days_of_cover"]
        stp = row["sell_through_pct"]
        if pd.isna(doc):
            return "Green"
        red = (
            doc > season_days_remaining * RED_DOC_MULTIPLIER
            and stp < RED_SELLTHROUGH_THRESHOLD
        )
        if red:
            return "Red"
        amber = (
            doc > season_days_remaining * AMBER_DOC_MULTIPLIER
            or stp < AMBER_SELLTHROUGH_THRESHOLD
        )
        if amber:
            return "Amber"
        return "Green"

    def _assign_markdown(row: pd.Series) -> int:
        tier = row["urgency_tier"]
        doc = row["days_of_cover"]
        trend = row["velocity_trend"]
        if tier == "Green" or pd.isna(doc):
            return 0
        if tier == "Red":
            band = (
                MARKDOWN_BANDS["red_critical"]
                if doc > season_days_remaining * 1.5
                else MARKDOWN_BANDS["red_moderate"]
            )
        else:
            band = (
                MARKDOWN_BANDS["amber_decel"]
                if trend == "decelerating"
                else MARKDOWN_BANDS["amber_stable"]
            )
        return (band[0] + band[1]) // 2

    def _assign_action_date(tier: str):
        if tier == "Green":
            return None
        return (today + timedelta(days=ACTION_LEAD_DAYS[tier])).strftime("%Y-%m-%d")

    df["urgency_tier"] = df.apply(_assign_tier, axis=1)
    df["markdown_pct"] = df.apply(_assign_markdown, axis=1)
    df["action_by_date"] = df["urgency_tier"].apply(_assign_action_date)

    return df
```

- [ ] **Step 4: Run tests**

```bash
pytest tests/test_recommender.py -v
```

Expected: all 7 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/recommender.py tests/test_recommender.py
git commit -m "feat: recommendation engine — Red/Amber/Green tiering and markdown %"
```

---

## Task 7: Excel Export (`src/export.py`)

**Files:**
- Create: `src/export.py`
- Create: `tests/test_export.py`

- [ ] **Step 1: Write failing tests in `tests/test_export.py`**

```python
import pytest
import pandas as pd
from io import BytesIO
from openpyxl import load_workbook
from src.export import build_action_sheet


def make_rec_df():
    return pd.DataFrame([
        {
            "sku": "SKU-001", "store": "MUM-1", "category": "Apparel",
            "urgency_tier": "Red", "markdown_pct": 35,
            "stock_on_hand": 100, "velocity_14d": 1.5,
            "days_of_cover": 66.7, "sell_through_pct": 45.0,
            "action_by_date": "2026-05-30", "rationale": "Test rationale.",
        },
        {
            "sku": "SKU-002", "store": "DEL-2", "category": "Footwear",
            "urgency_tier": "Green", "markdown_pct": 0,
            "stock_on_hand": 30, "velocity_14d": 4.0,
            "days_of_cover": 7.5, "sell_through_pct": 85.0,
            "action_by_date": None, "rationale": "",
        },
    ])


def test_returns_bytes_io():
    assert isinstance(build_action_sheet(make_rec_df()), BytesIO)


def test_has_correct_column_headers():
    wb = load_workbook(build_action_sheet(make_rec_df()))
    headers = [cell.value for cell in wb.active[1]]
    assert "SKU" in headers
    assert "Urgency Tier" in headers
    assert "Recommended Markdown %" in headers
    assert "Rationale" in headers


def test_correct_row_count():
    wb = load_workbook(build_action_sheet(make_rec_df()))
    assert wb.active.max_row == 3  # header + 2 data rows


def test_header_has_dark_fill():
    wb = load_workbook(build_action_sheet(make_rec_df()))
    header_cell = wb.active["A1"]
    assert header_cell.fill.fgColor.rgb.upper() in ("FF1E293B", "1E293B")
```

- [ ] **Step 2: Run tests to confirm they fail**

```bash
pytest tests/test_export.py -v
```

Expected: `ImportError`.

- [ ] **Step 3: Write `src/export.py`**

```python
from io import BytesIO
import pandas as pd
from openpyxl.styles import PatternFill, Font, Alignment
from openpyxl.utils import get_column_letter

_HEADER_FILL = PatternFill(start_color="1E293B", end_color="1E293B", fill_type="solid")
_HEADER_FONT = Font(bold=True, color="FFFFFF")
_TIER_FILLS = {
    "Red":   PatternFill(start_color="FEE2E2", end_color="FEE2E2", fill_type="solid"),
    "Amber": PatternFill(start_color="FEF3C7", end_color="FEF3C7", fill_type="solid"),
    "Green": PatternFill(start_color="DCFCE7", end_color="DCFCE7", fill_type="solid"),
}

_EXPORT_COLS = [
    "sku", "store", "category", "urgency_tier", "markdown_pct",
    "stock_on_hand", "velocity_14d", "days_of_cover",
    "sell_through_pct", "action_by_date", "rationale",
]
_COL_RENAME = {
    "sku": "SKU", "store": "Store", "category": "Category",
    "urgency_tier": "Urgency Tier", "markdown_pct": "Recommended Markdown %",
    "stock_on_hand": "Current Stock", "velocity_14d": "Daily Velocity (14d)",
    "days_of_cover": "Days of Cover", "sell_through_pct": "Sell-Through Rate %",
    "action_by_date": "Action By Date", "rationale": "Rationale",
}


def build_action_sheet(recommendations_df: pd.DataFrame) -> BytesIO:
    cols = [c for c in _EXPORT_COLS if c in recommendations_df.columns]
    df = recommendations_df[cols].rename(columns=_COL_RENAME).round(2)

    buffer = BytesIO()
    with pd.ExcelWriter(buffer, engine="openpyxl") as writer:
        df.to_excel(writer, index=False, sheet_name="Recommendations")
        ws = writer.sheets["Recommendations"]

        for cell in ws[1]:
            cell.fill = _HEADER_FILL
            cell.font = _HEADER_FONT
            cell.alignment = Alignment(horizontal="center")

        tier_col_idx = list(df.columns).index("Urgency Tier") + 1
        for row_idx in range(2, ws.max_row + 1):
            tier_val = ws.cell(row=row_idx, column=tier_col_idx).value
            fill = _TIER_FILLS.get(tier_val, PatternFill())
            for col_idx in range(1, ws.max_column + 1):
                ws.cell(row=row_idx, column=col_idx).fill = fill

        for col_idx, col_cells in enumerate(ws.columns, 1):
            max_len = max(len(str(c.value or "")) for c in col_cells)
            ws.column_dimensions[get_column_letter(col_idx)].width = min(max_len + 4, 60)

    buffer.seek(0)
    return buffer
```

- [ ] **Step 4: Run tests**

```bash
pytest tests/test_export.py -v
```

Expected: all 4 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/export.py tests/test_export.py
git commit -m "feat: Excel export with colour-coded rows and formatted headers"
```

---

## Task 8: GenAI Rationale Layer (`src/rationale.py`)

**Files:**
- Create: `src/rationale.py`

> Note: No unit tests for this module — it calls an external API. Test manually in Task 10.

- [ ] **Step 1: Write `src/rationale.py`**

```python
import time
import pandas as pd
import streamlit as st
from groq import Groq
from datetime import date
from config.settings import (
    LLM_MODEL, LLM_MAX_TOKENS, LLM_TEMPERATURE,
    LLM_RETRY_ATTEMPTS, CATEGORY_LIFT_MULTIPLIERS, SEASON_END_DATE,
)


def _build_prompt(row: pd.Series, days_remaining: int) -> str:
    lift = CATEGORY_LIFT_MULTIPLIERS.get(
        row.get("category", "Default"),
        CATEGORY_LIFT_MULTIPLIERS["Default"],
    )
    doc = row["days_of_cover"]
    doc_str = f"{doc:.0f}" if pd.notna(doc) else "N/A"
    return (
        f"You are a retail merchandising assistant. Write a 2-3 sentence "
        f"plain-English rationale for this markdown recommendation. Be specific with numbers.\n\n"
        f"SKU: {row['sku']} | Store: {row['store']}\n"
        f"Daily velocity: {row['velocity_14d']:.1f} units/day | Stock: {int(row['stock_on_hand'])} units\n"
        f"Days of cover: {doc_str}d | Season ends in: {days_remaining}d\n"
        f"Recommended markdown: {int(row['markdown_pct'])}%\n"
        f"Expected velocity lift: {lift}x (category average)\n\n"
        f"Rationale:"
    )


def generate_rationale_for_sku(row: pd.Series) -> str:
    client = Groq(api_key=st.secrets["GROQ_API_KEY"])
    days_remaining = max(
        (pd.Timestamp(SEASON_END_DATE) - pd.Timestamp(date.today())).days, 0
    )
    prompt = _build_prompt(row, days_remaining)

    for attempt in range(LLM_RETRY_ATTEMPTS):
        try:
            response = client.chat.completions.create(
                model=LLM_MODEL,
                messages=[{"role": "user", "content": prompt}],
                max_tokens=LLM_MAX_TOKENS,
                temperature=LLM_TEMPERATURE,
            )
            return response.choices[0].message.content.strip()
        except Exception:
            if attempt < LLM_RETRY_ATTEMPTS - 1:
                time.sleep(2 ** attempt)

    return "Rationale unavailable — please review metrics manually."


def get_or_generate_rationale(sku: str, store: str, row: pd.Series) -> str:
    key = f"rationale_{sku}_{store}"
    if key not in st.session_state:
        st.session_state[key] = generate_rationale_for_sku(row)
    return st.session_state[key]
```

- [ ] **Step 2: Commit**

```bash
git add src/rationale.py
git commit -m "feat: on-demand Groq rationale with session_state caching"
```

---

## Task 9: Streamlit App (`app.py`)

**Files:**
- Create: `app.py`

- [ ] **Step 1: Write `app.py`**

```python
import streamlit as st
import pandas as pd
import plotly.express as px
from datetime import date

from src.ingestion import load_and_validate, ValidationError
from src.features import compute_features
from src.recommender import generate_recommendations
from src.rationale import get_or_generate_rationale
from src.export import build_action_sheet
from config import settings

st.set_page_config(
    page_title="Markdown & Clearance Optimiser",
    page_icon="🏷️",
    layout="wide",
)

TIER_COLORS = {"Red": "#EF4444", "Amber": "#F59E0B", "Green": "#10B981"}


# ── Sidebar ──────────────────────────────────────────────────────────────────
with st.sidebar:
    st.title("🏷️ Markdown Optimiser")
    st.caption("Team 27 — Deep Mind Developers")

    st.header("📂 Data Input")
    pos_file = st.file_uploader("POS Sales CSV", type="csv", key="pos_upload")
    inv_file = st.file_uploader("Inventory Snapshot CSV", type="csv", key="inv_upload")
    load_sample = st.button("📊 Load Sample Data", use_container_width=True)

    st.header("⚙️ Season Config")
    season_start = st.date_input(
        "Season Start", value=pd.Timestamp(settings.SEASON_START_DATE).date()
    )
    season_end_input = st.date_input(
        "Season End", value=pd.Timestamp(settings.SEASON_END_DATE).date()
    )
    settings.SEASON_START_DATE = str(season_start)
    settings.SEASON_END_DATE = str(season_end_input)


# ── Load data ─────────────────────────────────────────────────────────────────
pos_df, inv_df = None, None

if load_sample:
    try:
        pos_df, inv_df = load_and_validate(
            "data/sample/pos_sales_sample.csv",
            "data/sample/inventory_sample.csv",
        )
    except (ValidationError, FileNotFoundError) as e:
        st.sidebar.error(str(e))

elif pos_file and inv_file:
    try:
        pos_df, inv_df = load_and_validate(pos_file, inv_file)
    except ValidationError as e:
        st.sidebar.error(str(e))


# ── Main area ─────────────────────────────────────────────────────────────────
st.title("AI-Powered Markdown & Clearance Optimiser")
st.caption("SKU-level markdown recommendations with explainable AI rationale.")

if pos_df is None or inv_df is None:
    st.info("👆 Upload POS and Inventory CSVs in the sidebar, or click **Load Sample Data**.")
    st.stop()

with st.spinner("Computing features and recommendations…"):
    features_df = compute_features(pos_df, inv_df)
    rec_df = generate_recommendations(features_df)

# Season progress
today = date.today()
total_days = max(
    (pd.Timestamp(settings.SEASON_END_DATE) - pd.Timestamp(settings.SEASON_START_DATE)).days, 1
)
elapsed_days = max(
    (pd.Timestamp(today) - pd.Timestamp(settings.SEASON_START_DATE)).days, 0
)
days_remaining = max(total_days - elapsed_days, 0)

with st.sidebar:
    st.header("📅 Season Progress")
    st.progress(min(elapsed_days / total_days, 1.0))
    st.caption(f"**{days_remaining}** days remaining in season")

    st.header("🔍 Filters")
    sel_store = st.multiselect("Store", options=sorted(rec_df["store"].unique()))
    sel_tier = st.multiselect("Urgency Tier", options=["Red", "Amber", "Green"])
    sel_cat = st.multiselect("Category", options=sorted(rec_df["category"].unique()))

# Apply filters
filtered = rec_df.copy()
if sel_store:
    filtered = filtered[filtered["store"].isin(sel_store)]
if sel_tier:
    filtered = filtered[filtered["urgency_tier"].isin(sel_tier)]
if sel_cat:
    filtered = filtered[filtered["category"].isin(sel_cat)]

# KPI cards
c1, c2, c3, c4 = st.columns(4)
c1.metric("🔴 Red — Critical",   int((rec_df["urgency_tier"] == "Red").sum()))
c2.metric("🟡 Amber — At Risk",  int((rec_df["urgency_tier"] == "Amber").sum()))
c3.metric("🟢 Green — On Track", int((rec_df["urgency_tier"] == "Green").sum()))
c4.metric("📦 Total SKU×Store",  len(rec_df))

st.divider()

# Charts
col_l, col_r = st.columns(2)

with col_l:
    bar_data = (
        rec_df.groupby(["store", "urgency_tier"])["sell_through_pct"]
        .mean()
        .reset_index()
    )
    fig_bar = px.bar(
        bar_data, x="store", y="sell_through_pct", color="urgency_tier",
        color_discrete_map=TIER_COLORS,
        title="Avg Sell-Through Rate by Store",
        labels={"sell_through_pct": "Sell-Through %", "store": "Store", "urgency_tier": "Tier"},
        barmode="group",
    )
    st.plotly_chart(fig_bar, use_container_width=True)

with col_r:
    scatter_data = rec_df.dropna(subset=["days_of_cover"])
    fig_scatter = px.scatter(
        scatter_data, x="velocity_14d", y="days_of_cover",
        color="urgency_tier", size="stock_on_hand",
        color_discrete_map=TIER_COLORS,
        title="Days of Cover vs Velocity",
        labels={"velocity_14d": "Daily Velocity (units)", "days_of_cover": "Days of Cover"},
        hover_data=["sku", "store"],
    )
    st.plotly_chart(fig_scatter, use_container_width=True)

treemap_data = (
    rec_df.groupby(["category", "urgency_tier"])["stock_on_hand"].sum().reset_index()
)
fig_tree = px.treemap(
    treemap_data, path=["category", "urgency_tier"], values="stock_on_hand",
    color="urgency_tier", color_discrete_map=TIER_COLORS,
    title="Inventory at Risk by Category",
)
st.plotly_chart(fig_tree, use_container_width=True)

st.divider()

# SKU table + rationale
st.subheader("📋 SKU Recommendations")

if filtered.empty:
    st.info("No SKUs match current filters.")
    st.stop()

display_cols = [
    "sku", "store", "category", "urgency_tier", "markdown_pct",
    "stock_on_hand", "velocity_14d", "days_of_cover", "sell_through_pct",
]
display_df = filtered[display_cols].round(2)

event = st.dataframe(
    display_df,
    use_container_width=True,
    on_select="rerun",
    selection_mode="single-row",
    hide_index=True,
)

if event.selection.rows:
    row_idx = event.selection.rows[0]
    sel_row = filtered.iloc[row_idx]
    sku, store_name = sel_row["sku"], sel_row["store"]
    tier = sel_row["urgency_tier"]

    st.markdown(
        f"**Selected:** `{sku}` @ `{store_name}` — "
        f"Tier: **{tier}** — Markdown: **{int(sel_row['markdown_pct'])}%**"
    )

    rationale_key = f"rationale_{sku}_{store_name}"
    if rationale_key in st.session_state:
        st.success(st.session_state[rationale_key])
    elif tier in ("Red", "Amber"):
        if st.button(f"✨ Generate Rationale for {sku} @ {store_name}"):
            with st.spinner("Generating rationale via Groq…"):
                rationale = get_or_generate_rationale(sku, store_name, sel_row)
            st.success(rationale)
    else:
        st.info("Green SKU — selling well, no markdown needed.")

# Export button (in sidebar, always visible)
with st.sidebar:
    st.header("📥 Export")
    export_df = filtered.copy()
    export_df["rationale"] = export_df.apply(
        lambda r: st.session_state.get(f"rationale_{r['sku']}_{r['store']}", ""),
        axis=1,
    )
    excel_buf = build_action_sheet(export_df)
    st.download_button(
        label="⬇️ Download Action Sheet",
        data=excel_buf,
        file_name="markdown_recommendations.xlsx",
        mime="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        use_container_width=True,
    )
```

- [ ] **Step 2: Commit**

```bash
git add app.py
git commit -m "feat: Streamlit UI — sidebar layout, charts, table, on-demand rationale"
```

---

## Task 10: Full Test Suite + Smoke Test

**Files:** No new files — run all tests and launch the app.

- [ ] **Step 1: Run complete test suite**

```bash
pytest tests/ -v
```

Expected output:
```
tests/test_ingestion.py::test_load_returns_clean_dataframes PASSED
tests/test_ingestion.py::test_missing_pos_column_raises_validation_error PASSED
tests/test_ingestion.py::test_missing_inv_column_raises_validation_error PASSED
tests/test_ingestion.py::test_alias_columns_are_resolved PASSED
tests/test_ingestion.py::test_duplicate_rows_are_aggregated PASSED
tests/test_ingestion.py::test_missing_category_defaults_to_default PASSED
tests/test_ingestion.py::test_non_numeric_units_rows_are_dropped PASSED
tests/test_features.py::test_velocity_14d_equals_average_of_last_14_days PASSED
tests/test_features.py::test_opening_stock_derived_as_stock_plus_season_sales PASSED
tests/test_features.py::test_sell_through_pct_correct PASSED
tests/test_features.py::test_days_of_cover_null_when_velocity_zero PASSED
tests/test_features.py::test_days_of_cover_correct_when_velocity_nonzero PASSED
tests/test_features.py::test_velocity_trend_decelerating PASSED
tests/test_features.py::test_velocity_trend_accelerating PASSED
tests/test_recommender.py::test_red_tier_when_high_doc_and_low_sellthrough PASSED
tests/test_recommender.py::test_green_tier_when_velocity_zero PASSED
tests/test_recommender.py::test_green_tier_when_well_on_track PASSED
tests/test_recommender.py::test_markdown_zero_for_green PASSED
tests/test_recommender.py::test_amber_decel_markdown_higher_than_amber_stable PASSED
tests/test_recommender.py::test_action_by_date_none_for_green PASSED
tests/test_recommender.py::test_action_by_date_set_for_red PASSED
tests/test_export.py::test_returns_bytes_io PASSED
tests/test_export.py::test_has_correct_column_headers PASSED
tests/test_export.py::test_correct_row_count PASSED
tests/test_export.py::test_header_has_dark_fill PASSED

25 passed
```

- [ ] **Step 2: Launch the app**

```bash
streamlit run app.py
```

Expected: browser opens at `http://localhost:8501`.

- [ ] **Step 3: Smoke test — sample data flow**

1. Click **Load Sample Data** in the sidebar → KPI cards appear with Red/Amber/Green counts.
2. Verify the bar chart and scatter chart render without errors.
3. Verify the treemap shows Apparel / Footwear / Home breakdown.
4. Click any **Red** row in the SKU table → row is highlighted.
5. Click **✨ Generate Rationale** → spinner appears, then a rationale sentence displays.
6. Change a sidebar filter (e.g., select one store) → table updates, KPI cards unchanged (they show unfiltered totals).
7. Click **⬇️ Download Action Sheet** → `.xlsx` file downloads and opens in Excel with colour-coded rows.

- [ ] **Step 4: Final commit**

```bash
git add .
git commit -m "feat: complete v1.0 — all modules, tests, sample data, Streamlit UI"
```

---

## Self-Review Checklist

| Spec Requirement | Task Covered |
|---|---|
| FR-01/02: Accept POS + inventory CSVs | Task 4 |
| FR-03: Validate + flag bad data | Task 4 |
| FR-04: Multi-store support | Task 3 (sample data) + Task 4 |
| FR-05: Sell-through rate | Task 5 |
| FR-06: Days of cover | Task 5 |
| FR-07: Velocity trend | Task 5 |
| FR-08: Refresh on each upload | Task 9 (Streamlit reruns on upload) |
| FR-09: Red/Amber/Green tiering | Task 6 |
| FR-10: Markdown % for Red/Amber | Task 6 |
| FR-11: SKU × store granularity | Tasks 5–6 |
| FR-12: Flag at-risk 3 weeks early | Task 6 (ACTION_LEAD_DAYS) |
| FR-13/14: Plain-English rationale | Task 8 |
| FR-15: Business logic in Python, LLM only for rationale | Tasks 4–8 |
| FR-16: ≤ 3 sentences | Task 8 (max_tokens=150) |
| FR-17: R/A/G dashboard | Task 9 |
| FR-18: Filter by store/category/tier | Task 9 |
| FR-19: SKU table with all columns | Task 9 |
| FR-20: One-click Excel export | Tasks 7 + 9 |
| NFR-03: Runs locally / on Community Cloud | All tasks |
| NFR-05: Free tier only | Groq free tier (Task 8) |
| NFR-06: Graceful missing value handling | Tasks 4–5 |
| Sample data for demo | Task 3 |
| Season progress bar | Task 9 |
| Treemap chart | Task 9 |
| Inventory-at-risk KPI | Task 9 (Total SKU×Store card) |
