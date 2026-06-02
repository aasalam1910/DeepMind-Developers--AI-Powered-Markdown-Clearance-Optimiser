# Design Spec: Store Poster & Rationale Impact Cards

**Date:** 2026-05-28  
**Status:** Approved

---

## Overview

Two visual features added to the Markdown Optimiser dashboard:

1. **Store Poster** — a premium, printable marketing poster for each Amber/Red store, triggered from the sidebar store chip. Shows discount %, catchy copy, and store stats.
2. **Rationale Impact Cards** — replaces the "What Will Happen" text paragraph in the AI Rationale panel with 4 visual stat cards showing the before/after impact of the markdown.

---

## Feature 1: Store Poster

### Trigger

- In the sidebar **Store filter** section, each Amber/Red store chip gets a small `🖼 Poster` button rendered inline next to it.
- Green store chips get no button.
- Clicking the button sets `posterStore` state in `App.jsx` to that store's name (or clears it if already open — toggle).

### Placement

- When `posterStore` is non-null, a `<StorePoster>` component renders in the **main content area**, above the SKU table section. It slides in smoothly.
- Only one poster is shown at a time (clicking a different store's button switches to that store's poster).

### Poster Visual Design (approved)

- **Fonts:** Bebas Neue (display numbers/headlines) + Cormorant Garamond (italic sublines) + Montserrat (body)
- **Red tier:** White body, solid `#C0392B` hero area with decorative circles, giant discount number, corner tag "⚠ CLEARANCE"
- **Amber tier:** Cream body (`#fffdf5`), dark-gold gradient hero (`#1a1200 → #c88b00`) with diagonal grid texture, glowing gold discount number, corner tag "⚡ LIMITED OFFER"
- Both: pulsing urgency dot next to store name, gradient accent rule, frosted-glass tagline box, stats row, print button

### Poster Content (computed, no API calls)

All data derived from the `recommendations` array already in state:

| Field | Source |
|---|---|
| Store name | `posterStore` state |
| Avg discount % | `mean(r.markdown_pct)` for that store (Amber/Red only) |
| SKU count | `count` of Amber/Red recs for that store |
| Earliest act-by date | `min(r.action_by_date)` for that store |
| Category count | `new Set(r.category)` for that store |
| Headline copy | Template function keyed on `tier + discount_bucket` |

### Copy Templates (built-in, no LLM)

**Red tier:**
- `pct >= 40%` → "SEASON-END BLOWOUT — Everything Must Go! Stock Running Out FAST!"
- `pct 25–39%` → "FINAL CLEARANCE — Last Chance Before The Season Ends. Don't Miss Out!"
- `pct < 25%` → "CLEARANCE SALE — Grab Your Favourites At Jaw-Dropping Prices!"

**Amber tier:**
- `pct >= 25%` → "SPECIAL SAVINGS EVENT — Limited Time Deal. While Stocks Last!"
- `pct < 25%` → "EXCLUSIVE OFFER — Fresh Deals, Real Value. Act Before It's Too Late!"

### Print

- `window.print()` scoped to the poster element via `@media print` CSS: hide everything except `.store-poster-print`.

### Files Changed

| File | Change |
|---|---|
| `frontend/src/components/StorePoster.jsx` | New component |
| `frontend/src/components/Sidebar.jsx` | Add `onShowPoster` prop + 🖼 button per Amber/Red chip |
| `frontend/src/App.jsx` | Add `posterStore` state, pass `onShowPoster` to Sidebar, render `<StorePoster>` |
| `frontend/src/index.css` | Poster layout styles + `@media print` rule |

---

## Feature 2: Rationale Impact Cards

### Problem

The "What Will Happen" section in `RationalePanel.jsx` renders the LLM-generated `rationale_outcome` as a plain text paragraph. This is hard to scan quickly.

### Solution

Replace that text section with **4 visual stat cards** showing computed before/after impact data. The LLM paragraph is removed from that slot (it's already implied by the cards). The other 3 sections (Why, If Not Applied, Confidence) stay as text.

### Cards Layout

Displayed as a 2×2 grid (or 4-column row on wide screens), styled to match the `DiscountCard` component's dark card aesthetic:

| Card | Label | Value |
|---|---|---|
| 1 | Velocity (before → after) | `0.4 u/day → 0.56 u/day` |
| 2 | Units expected to clear | `42 of 60 units` |
| 3 | Units still at risk | `18 units` (after markdown) |
| 4 | Days saved | `72 days sooner` |

### Computations (frontend, no API)

```
lift          = row.velocity_lift                    // new field added to rec data
new_velocity  = row.velocity_14d * lift
days_remaining = max(0, (new Date(seasonEndDate) - new Date()) / 86400000)
                                                     // computed in component from seasonEndDate prop
units_cleared = min(new_velocity * days_remaining, row.stock_on_hand)
units_at_risk = max(0, row.stock_on_hand - units_cleared)
new_doc       = row.stock_on_hand / new_velocity
days_saved    = max(0, row.days_of_cover - new_doc)
```

`seasonEndDate` (string, e.g. `"2026-06-30"`) is passed as a prop from `App.jsx` via `appliedDates.end`.

### Backend Change Required

`recommender.py`: add `velocity_lift` column by looking up `CATEGORY_LIFT_MULTIPLIERS[category]` (already imported). This is one line added in `generate_recommendations()`.

`api/main.py`: no change — the lift is included automatically since `_to_records(rec_df)` serialises all columns.

### Files Changed

| File | Change |
|---|---|
| `src/recommender.py` | Add `df["velocity_lift"] = df["category"].map(CATEGORY_LIFT_MULTIPLIERS).fillna(1.4)` |
| `frontend/src/components/RationalePanel.jsx` | Add `seasonEndDate` prop; replace `rationale_outcome` text with `<ImpactCards row={row} seasonEndDate={seasonEndDate} />` sub-component |
| `frontend/src/App.jsx` | Pass `appliedDates.end` as `seasonEndDate` to `RationalePanel` |
| `frontend/src/index.css` | Impact card grid styles |

---

## Out of Scope

- No LLM calls for poster copy
- No image generation (poster is pure HTML/CSS)
- No changes to the export/Excel sheet
- No changes to other rationale sections (Why, If Not Applied, Confidence stay as text)
