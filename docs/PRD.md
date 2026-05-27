# Product Requirements Document (PRD)

## AI-Powered Markdown & Clearance Optimiser

| Field | Details |
|---|---|
| **Product Name** | AI-Powered Markdown & Clearance Optimiser |
| **Team** | Team 27 – Deep Mind Developers |
| **Domain** | Retail |
| **Version** | v1.0 |
| **Date** | 27 May 2026 |
| **Status** | Draft |

---

## 1. Executive Summary

Retailers managing hundreds of SKUs across multiple stores face a recurring, high-stakes decision at the end of every season: when to mark down prices, by how much, and for which products. Today, this is driven by gut feel or rigid blanket rules, resulting in 15–20% unsold stock and 8–12% gross margin loss from over-discounting.

This product is an AI engine that ingests daily POS and inventory data, computes sell-through rate and days-of-cover per SKU per store, and generates prioritised, explainable markdown recommendations. Merchandisers interact through a Red/Amber/Green dashboard and can download a one-click action sheet. Target outcome: 3–5% gross margin recovery and residual unsold stock reduced to under 5%.

---

## 2. Problem Statement

### 2.1 Background

Seasonal retailers – apparel, footwear, home goods, and similar categories – operate on fixed sell windows. Unsold inventory at season-end must be liquidated at deep discounts or written off, both of which erode margins significantly.

### 2.2 Current State

- Markdown decisions are made manually by merchandisers reviewing aging inventory reports.
- Discount rules are blanket and chain-wide (e.g., "30% off all items in week 8").
- No SKU-level or store-level granularity exists in the current decision process.
- Action is typically taken reactively – too late in the season to avoid deep discounts.

### 2.3 Quantified Pain

| Metric | Current State |
|---|---|
| Residual unsold stock | 15–20% of seasonal inventory |
| Gross margin lost to over-discounting | 8–12% |
| Potential annual impact (₹100Cr retailer) | ₹3Cr+ recoverable |

---

## 3. Goals & Success Metrics

### 3.1 Business Goals

- Recover 3–5% gross margin per season.
- Reduce residual unsold stock from 15–20% to under 5%.
- Improve merchandiser confidence and speed in markdown decisions.

### 3.2 Product Goals

- Deliver SKU × store level markdown recommendations with timing and depth.
- Provide plain-English rationale for every recommendation.
- Require zero ERP integration – run on standard CSV exports.

### 3.3 Key Performance Indicators (KPIs)

| KPI | Target |
|---|---|
| Sell-through rate improvement | +10–15% vs. baseline |
| Gross margin recovery | 3–5% |
| Residual unsold stock | < 5% |
| Merchandiser time on markdown planning | Reduced by ≥ 50% |
| Recommendation adoption rate | ≥ 70% of flagged SKUs acted on |

---

## 4. Target Users

### 4.1 Primary User – Merchandiser / Category Manager

- Reviews aging inventory and makes markdown decisions weekly.
- Currently works with spreadsheets and manual reports.
- Needs to trust and understand recommendations before acting on them.
- Values speed, clarity, and auditability.

### 4.2 Secondary User – Store / Regional Manager

- Needs visibility into which SKUs are at risk in their store or region.
- Reviews and approves markdown actions at store level.

### 4.3 Tertiary User – Business Analyst / Finance

- Tracks margin impact of markdown decisions.
- Downloads action sheets for reporting and reconciliation.

---

## 5. Scope

### 5.1 In Scope (v1.0)

- Daily ingestion of POS sales CSV and inventory snapshot.
- Feature computation: sell-through rate, days-of-cover, velocity trend per SKU per store.
- Markdown recommendation engine: urgency tier (Red / Amber / Green) and discount percentage.
- GenAI-generated plain-English rationale per SKU recommendation.
- Streamlit dashboard with Red/Amber/Green visual classification.
- One-click Excel action sheet download.
- Support for multi-store, multi-SKU datasets.

### 5.2 Out of Scope (v1.0)

- ERP or POS API integration (future phase).
- Automated markdown execution / pricing system push.
- Demand forecasting beyond days-of-cover calculation.
- Customer segmentation or loyalty-driven pricing.
- Mobile application.

---

## 6. Functional Requirements

### 6.1 Data Ingestion

| ID | Requirement |
|---|---|
| FR-01 | System shall accept a daily POS sales CSV with columns: SKU, Store, Date, Units Sold. |
| FR-02 | System shall accept an inventory snapshot CSV with columns: SKU, Store, Stock on Hand. |
| FR-03 | System shall validate uploaded files for required columns and flag missing/malformed data. |
| FR-04 | System shall support multi-store data in a single upload. |

### 6.2 Feature Computation

| ID | Requirement |
|---|---|
| FR-05 | System shall compute **sell-through rate** per SKU per store. |
| FR-06 | System shall compute **days-of-cover** per SKU per store based on trailing velocity. |
| FR-07 | System shall compute **velocity trend** (accelerating / stable / decelerating) per SKU per store. |
| FR-08 | Feature computation shall refresh on every new data upload. |

### 6.3 Recommendation Engine

| ID | Requirement |
|---|---|
| FR-09 | System shall classify each SKU × store combination into one of three urgency tiers: **Red** (critical), **Amber** (at-risk), **Green** (on-track). |
| FR-10 | System shall recommend a markdown percentage for Red and Amber SKUs. |
| FR-11 | Recommendations shall be generated at SKU × store granularity, not chain-wide. |
| FR-12 | System shall flag at-risk SKUs at least **3 weeks before** stock becomes critical. |

### 6.4 GenAI Rationale Layer

| ID | Requirement |
|---|---|
| FR-13 | System shall generate a plain-English rationale for every markdown recommendation. |
| FR-14 | Rationale shall include: current velocity, days remaining to clear, expected velocity lift at recommended discount, and historical category response. |
| FR-15 | GenAI shall be used only for rationale generation; all business logic shall run in deterministic Python rules. |
| FR-16 | Rationale shall be ≤ 3 sentences per SKU recommendation. |

### 6.5 Dashboard & Output

| ID | Requirement |
|---|---|
| FR-17 | System shall display a Red/Amber/Green summary dashboard showing all SKUs by urgency tier. |
| FR-18 | Users shall be able to filter the dashboard by store, category, and urgency tier. |
| FR-19 | Each SKU row shall display: SKU ID, Store, Urgency Tier, Recommended Markdown %, Days of Cover, Sell-Through Rate, and Rationale. |
| FR-20 | System shall provide a one-click export of the full recommendation table as an Excel (.xlsx) action sheet. |

---

## 7. Non-Functional Requirements

| ID | Requirement |
|---|---|
| NFR-01 | System shall process a dataset of up to 10,000 SKU × store rows in under 60 seconds. |
| NFR-02 | Dashboard shall load within 5 seconds after data upload completes. |
| NFR-03 | System shall run locally or on Streamlit Community Cloud with no infrastructure setup. |
| NFR-04 | All data shall remain within the user's environment; no data shall be sent to external servers except LLM API calls for rationale generation. |
| NFR-05 | System shall operate entirely on free-tier tools and APIs (no paid dependencies in v1.0). |
| NFR-06 | System shall handle missing values and incomplete rows gracefully without crashing. |

---

## 8. Technical Architecture

```
┌─────────────────────────────────────────────────────┐
│                   Streamlit UI                       │
│   File Upload  →  Dashboard  →  Excel Export         │
└──────────────────────┬──────────────────────────────┘
                       │
          ┌────────────▼──────────┐
          │   Feature Engine      │
          │  (Python + Pandas)    │
          │  Sell-Through Rate    │
          │  Days of Cover        │
          │  Velocity Trend       │
          └────────────┬──────────┘
                       │
          ┌────────────▼──────────┐
          │  Recommendation       │
          │  Logic (Python        │
          │  Rules Engine)        │
          │  Red / Amber / Green  │
          │  Markdown %           │
          └────────────┬──────────┘
                       │
          ┌────────────▼──────────┐
          │  GenAI Rationale      │
          │  Layer                │
          │  Gemini 1.5 Flash     │
          │  (or Groq + Llama)    │
          └────────────┬──────────┘
                       │
          ┌────────────▼──────────┐
          │  Output Layer         │
          │  Plotly Dashboard     │
          │  Pandas .to_excel()   │
          └───────────────────────┘
```

### 8.1 Tech Stack

| Layer | Technology | Cost |
|---|---|---|
| UI | Streamlit | Free |
| Data Processing | Python, Pandas, NumPy | Free |
| LLM (Primary) | Google Gemini 1.5 Flash | Free (1M tokens/day) |
| LLM (Fallback) | Groq + Llama 3.1 | Free |
| Visualisation | Plotly | Free |
| Output | Pandas `.to_excel()` | Free |

### 8.2 Data Inputs

| Input | Format | Columns Required |
|---|---|---|
| Daily POS Sales | CSV | SKU, Store, Date, Units Sold |
| Inventory Snapshot | CSV | SKU, Store, Stock on Hand |

---

## 9. Build Timeline

| Phase | Days | Deliverables |
|---|---|---|
| **Phase 1 – Data Foundation** | Day 1–2 | CSV ingestion, validation, feature computation (sell-through, days-of-cover, velocity) |
| **Phase 2 – Intelligence Layer** | Day 3–5 | Recommendation logic, urgency tiering, GenAI rationale generation per SKU |
| **Phase 3 – UI & Polish** | Day 6–7 | Streamlit dashboard, Red/Amber/Green visualisation, Excel export, demo polish |

---

## 10. Risks & Mitigations

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| Price elasticity data unavailable in standard CSVs | High | Medium | Use historical category-level multipliers as proxy; document assumption clearly |
| LLM rate limits during large batch processing | Medium | Medium | Batch rationale calls; implement retry logic; use Groq fallback |
| Retailer CSV formats vary significantly | High | High | Build a flexible column-mapping step at ingestion; provide a template CSV |
| Merchandiser distrust of AI recommendations | Medium | High | Emphasise explainability; rationale is central UX, not a tooltip |
| Streamlit Community Cloud latency for large datasets | Low | Low | Cap demo dataset size; note local-run option in documentation |

---

## 11. Assumptions & Constraints

### Assumptions
- Retailers have daily POS sales and inventory data available as CSV exports.
- Historical sell-through data (minimum 4 weeks) is available for velocity computation.
- Category-level price elasticity multipliers can be approximated from historical markdowns in the dataset.

### Constraints
- v1.0 must run entirely on free-tier tools with no paid API dependencies.
- No ERP or live POS API integration in v1.0.
- Build must be completable within 7 days (hackathon constraint).

---

## 12. Open Questions

| # | Question | Owner | Due |
|---|---|---|---|
| 1 | Which retail vertical is the primary pilot target – apparel, footwear, or home goods? | Product | Pre-build |
| 2 | What is the minimum historical data window required for reliable velocity computation? | Engineering | Day 1 |
| 3 | Should rationale generation be synchronous (per upload) or on-demand (per SKU click)? | Product + Engineering | Day 2 |
| 4 | What column naming conventions do target retailers use in their POS exports? | Product | Day 1 |

---

## 13. Glossary

| Term | Definition |
|---|---|
| **SKU** | Stock Keeping Unit – a unique identifier for a product variant |
| **Sell-Through Rate** | Percentage of inventory sold within a given period (Units Sold / Opening Stock) |
| **Days of Cover** | Number of days remaining stock will last at current sales velocity |
| **Velocity** | Average daily units sold over a trailing window (e.g., last 7 or 14 days) |
| **Markdown** | A permanent price reduction to stimulate demand and clear inventory |
| **Urgency Tier** | Red (critical – act now), Amber (at-risk – act soon), Green (on-track) |
| **Action Sheet** | Downloadable Excel file containing all markdown recommendations for execution |
