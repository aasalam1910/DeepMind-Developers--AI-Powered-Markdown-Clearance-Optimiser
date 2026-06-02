# Store Poster & Rationale Impact Cards — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a premium printable store poster for Amber/Red stores (triggered from sidebar) and replace the "What Will Happen" text in the rationale panel with 4 visual impact stat cards.

**Architecture:** Feature 1 adds `posterStore` state to App.jsx, a new `StorePoster.jsx` component, and a 🖼 button on Amber/Red sidebar chips. Feature 2 adds `velocity_lift` to the backend recommendation data and a new `ImpactCards` sub-component inside `RationalePanel.jsx`. Both features are purely additive — no existing logic is removed.

**Tech Stack:** React 18, Vite, Python/FastAPI, pandas — no new dependencies.

---

## File Map

| File | Action | Purpose |
|---|---|---|
| `src/recommender.py` | Modify | Add `velocity_lift` column derived from `CATEGORY_LIFT_MULTIPLIERS` |
| `frontend/src/components/StorePoster.jsx` | Create | Premium poster component (Red/Amber themed) |
| `frontend/src/components/Sidebar.jsx` | Modify | Add `onShowPoster` prop + 🖼 button per Amber/Red store chip |
| `frontend/src/components/RationalePanel.jsx` | Modify | Add `ImpactCards` sub-component, replace `rationale_outcome` text |
| `frontend/src/App.jsx` | Modify | Wire `posterStore` state, `onShowPoster`, `seasonEndDate` prop |
| `frontend/src/index.css` | Modify | Add Google Fonts @import, poster styles, impact card styles, @media print |

---

## Task 1: Add `velocity_lift` to recommendation data (backend)

**Files:**
- Modify: `src/recommender.py`

- [ ] **Step 1: Open `src/recommender.py` and locate the end of `generate_recommendations()`**

The function ends at line ~156 with `return df`. Find the block that assigns columns just before `return df`:

```python
    df["urgency_tier"] = df.apply(_assign_tier, axis=1)
    details = df.apply(_assign_markdown_details, axis=1)
    df["markdown_pct"]    = details["markdown_pct"]
    df["markdown_band"]   = details["markdown_band"]
    df["markdown_reason"] = details["markdown_reason"]
    df["markdown_calc"]   = details["markdown_calc"]
    df["action_by_date"]  = df.apply(_assign_action_date, axis=1)

    return df
```

- [ ] **Step 2: Add `velocity_lift` column before `return df`**

Insert one line so the block becomes:

```python
    df["urgency_tier"] = df.apply(_assign_tier, axis=1)
    details = df.apply(_assign_markdown_details, axis=1)
    df["markdown_pct"]    = details["markdown_pct"]
    df["markdown_band"]   = details["markdown_band"]
    df["markdown_reason"] = details["markdown_reason"]
    df["markdown_calc"]   = details["markdown_calc"]
    df["action_by_date"]  = df.apply(_assign_action_date, axis=1)
    df["velocity_lift"]   = df["category"].map(CATEGORY_LIFT_MULTIPLIERS).fillna(
        CATEGORY_LIFT_MULTIPLIERS["Default"]
    )

    return df
```

`CATEGORY_LIFT_MULTIPLIERS` is already imported at the top of the file — no new import needed.

- [ ] **Step 3: Verify the existing test suite still passes**

```bash
cd "c:/Users/MadhanSaiV/OneDrive - GANIT BUSINESS SOLUTIONS PRIVATE LIMITED/Ideathon1"
python -m pytest tests/ -v
```

Expected: all tests pass (the new column is additive).

- [ ] **Step 4: Commit**

```bash
git add src/recommender.py
git commit -m "feat: add velocity_lift column to recommendation data"
```

---

## Task 2: Add Google Fonts import and poster CSS to `index.css`

**Files:**
- Modify: `frontend/src/index.css`

- [ ] **Step 1: Add `@import` for poster fonts at the very top of `index.css` (line 1, before the `*` reset)**

```css
@import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Cormorant+Garamond:ital,wght@0,600;1,400&family=Montserrat:wght@400;700&display=swap');
```

The file currently starts with `*, *::before, *::after { ... }`. The @import must come before it.

- [ ] **Step 2: Append the poster styles at the end of `index.css`**

```css
/* ── Store Poster ──────────────────────────────────────────────── */
.store-poster {
  width: 320px;
  border-radius: 18px;
  overflow: hidden;
  position: relative;
  box-shadow: 0 40px 100px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.06);
  margin: 0 auto 32px;
  animation: poster-slide-in 0.3s ease;
}
@keyframes poster-slide-in {
  from { opacity: 0; transform: translateY(-12px); }
  to   { opacity: 1; transform: translateY(0); }
}

/* Red theme */
.sp-red { background: #fff; }
.sp-red .sp-hero { background: #C0392B; }
.sp-red .sp-hero-circle { border-color: rgba(255,255,255,0.12); }
.sp-red .sp-hero-pct { color: #fff; }
.sp-red .sp-hero-off { color: rgba(255,255,255,0.8); }
.sp-red .sp-hero-badge { border-color: rgba(255,255,255,0.45); color: rgba(255,255,255,0.9); }
.sp-red .sp-corner-tag { background: #1a1a1a; }
.sp-red .sp-rule { background: linear-gradient(90deg, #C0392B, #ff6b6b, transparent); }
.sp-red .sp-pulse-dot { background: #C0392B; box-shadow: 0 0 8px #C0392B; }
.sp-red .sp-stat-n { color: #C0392B; }
.sp-red .sp-print { background: #C0392B; }
.sp-red .sp-tagline { background: #fdf0ef; }
.sp-red .sp-stat { border-color: #f0d0ce; background: #fdf8f8; }
.sp-red .sp-headline, .sp-red .sp-store-name { color: #1a1a1a; }
.sp-red .sp-subline, .sp-red .sp-stat-l { color: #bbb; }
.sp-red .sp-tagline { color: #333; }

/* Amber theme */
.sp-amber { background: #fffdf5; }
.sp-amber .sp-hero { background: linear-gradient(140deg, #1a1200 0%, #3d2800 40%, #7c4f00 70%, #c88b00 100%); }
.sp-amber .sp-hero-circle { border-color: rgba(245,158,11,0.2); }
.sp-amber .sp-hero-pct { color: #fbbf24; text-shadow: 0 0 40px rgba(245,158,11,0.8); }
.sp-amber .sp-hero-off { color: rgba(251,191,36,0.8); }
.sp-amber .sp-hero-badge { border-color: rgba(245,158,11,0.6); color: #fbbf24; }
.sp-amber .sp-corner-tag { background: #d97706; }
.sp-amber .sp-rule { background: linear-gradient(90deg, #d97706, #fbbf24, transparent); }
.sp-amber .sp-pulse-dot { background: #d97706; box-shadow: 0 0 8px #d97706; }
.sp-amber .sp-stat-n { color: #d97706; }
.sp-amber .sp-print { background: linear-gradient(135deg, #d97706, #b45309); }
.sp-amber .sp-tagline { background: #fffbeb; border: 1px solid #fde68a; color: #333; }
.sp-amber .sp-stat { border-color: #fde68a; background: #fffbeb; }
.sp-amber .sp-headline, .sp-amber .sp-store-name { color: #1a1a1a; }
.sp-amber .sp-subline, .sp-amber .sp-stat-l { color: #888; }

/* Hero */
.sp-hero {
  height: 200px; position: relative; overflow: hidden;
  display: flex; align-items: center; justify-content: center;
}
.sp-hero-grid {
  position: absolute; inset: 0;
  background-image:
    linear-gradient(45deg, rgba(245,158,11,0.06) 1px, transparent 1px),
    linear-gradient(-45deg, rgba(245,158,11,0.06) 1px, transparent 1px);
  background-size: 30px 30px;
}
.sp-hero-circle { position: absolute; border-radius: 50%; border: 1px solid; }
.sp-hero-circle-lg { width: 220px; height: 220px; top: -80px; right: -60px; }
.sp-hero-circle-sm { width: 130px; height: 130px; top: -30px; right: -20px; }
.sp-corner-tag {
  position: absolute; top: 0; left: 0; color: #fff;
  font-size: 0.5rem; font-weight: 800; letter-spacing: 2px; text-transform: uppercase;
  padding: 6px 18px 6px 12px;
  clip-path: polygon(0 0, 100% 0, 88% 100%, 0 100%);
  font-family: 'Montserrat', sans-serif;
}
.sp-close {
  position: absolute; top: 10px; right: 12px; z-index: 10;
  background: rgba(255,255,255,0.12); border: none; border-radius: 50%;
  width: 26px; height: 26px; color: rgba(255,255,255,0.7);
  font-size: 0.75rem; cursor: pointer;
  display: flex; align-items: center; justify-content: center;
}
.sp-hero-inner { position: relative; z-index: 2; text-align: center; }
.sp-hero-badge {
  display: inline-block; border: 1.5px solid; border-radius: 30px;
  font-size: 0.5rem; letter-spacing: 3px; text-transform: uppercase;
  padding: 4px 14px; margin-bottom: 8px;
  font-family: 'Montserrat', sans-serif; font-weight: 700;
}
.sp-hero-pct {
  font-family: 'Bebas Neue', sans-serif;
  font-size: 6rem; line-height: 0.9; letter-spacing: 2px;
  text-shadow: 0 8px 32px rgba(0,0,0,0.3);
}
.sp-hero-off {
  font-family: 'Cormorant Garamond', serif;
  font-size: 1.4rem; font-style: italic; letter-spacing: 4px; margin-top: 2px;
}

/* Body */
.sp-body { padding: 20px 22px 22px; }
.sp-store-row {
  display: flex; align-items: center; justify-content: space-between; margin-bottom: 10px;
}
.sp-store-name {
  font-family: 'Cormorant Garamond', serif;
  font-size: 1.3rem; font-weight: 700; letter-spacing: 0.5px;
}
.sp-pulse-dot {
  width: 8px; height: 8px; border-radius: 50%;
  animation: sp-pulse 1.5s ease-in-out infinite;
}
@keyframes sp-pulse { 0%,100%{opacity:1} 50%{opacity:0.3} }
.sp-headline {
  font-family: 'Bebas Neue', sans-serif;
  font-size: 1.8rem; letter-spacing: 1.5px; line-height: 1; margin-bottom: 4px;
}
.sp-subline {
  font-family: 'Cormorant Garamond', serif;
  font-size: 0.82rem; font-style: italic; margin-bottom: 12px;
}
.sp-rule { height: 2px; border-radius: 2px; margin-bottom: 12px; }
.sp-tagline { border-radius: 10px; padding: 12px 14px; margin-bottom: 14px; font-size: 0.72rem; line-height: 1.6; }
.sp-stats { display: flex; gap: 8px; margin-bottom: 16px; }
.sp-stat {
  flex: 1; border: 1.5px solid; border-radius: 8px; padding: 9px 6px;
  text-align: center; display: flex; flex-direction: column; gap: 2px;
}
.sp-stat-n { font-family: 'Bebas Neue', sans-serif; font-size: 1.1rem; letter-spacing: 1px; }
.sp-stat-l { font-size: 0.5rem; text-transform: uppercase; letter-spacing: 0.5px; }
.sp-print {
  width: 100%; border: none; border-radius: 8px; padding: 12px;
  color: #fff; font-family: 'Montserrat', sans-serif;
  font-weight: 700; font-size: 0.72rem; letter-spacing: 2px; text-transform: uppercase; cursor: pointer;
}
.sp-print:hover { opacity: 0.88; }

/* Poster button in sidebar */
.sp-trigger-btn {
  padding: 3px 7px; border-radius: 4px; border: 1px solid; cursor: pointer;
  font-size: 0.65rem; font-weight: 700; background: transparent;
}
.sp-trigger-btn.red  { border-color: #C0392B; color: #C0392B; }
.sp-trigger-btn.amber { border-color: #d97706; color: #d97706; }
.sp-trigger-btn:hover { opacity: 0.75; }

/* Print: show only poster */
@media print {
  body > * { display: none !important; }
  .store-poster-print { display: block !important; box-shadow: none; border-radius: 0; width: 100%; }
  .sp-close, .sp-print { display: none !important; }
}

/* ── Rationale Impact Cards ──────────────────────────────────────── */
.impact-cards {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 8px;
  margin: 4px 0 12px;
}
@media (max-width: 900px) {
  .impact-cards { grid-template-columns: repeat(2, 1fr); }
}
.impact-card {
  background: rgba(15, 23, 42, 0.6);
  border: 1px solid rgba(255,255,255,0.08);
  border-radius: 10px;
  padding: 12px 14px;
  display: flex; flex-direction: column; gap: 4px;
}
.impact-card-label {
  font-size: 0.58rem; text-transform: uppercase;
  letter-spacing: 0.8px; color: var(--text-dim);
}
.impact-card-value { font-size: 0.95rem; font-weight: 700; color: #f8fafc; }
.impact-card-sub { font-size: 0.58rem; color: #475569; }
.impact-section-title {
  font-size: 0.65rem; text-transform: uppercase; letter-spacing: 1px;
  color: var(--text-dim); margin-bottom: 6px; margin-top: 2px;
}
```

- [ ] **Step 3: Commit**

```bash
git add frontend/src/index.css
git commit -m "feat: add poster and impact card CSS + Google Fonts import"
```

---

## Task 3: Create `StorePoster.jsx`

**Files:**
- Create: `frontend/src/components/StorePoster.jsx`

- [ ] **Step 1: Create the file with this exact content**

```jsx
const COPY = {
  Red: {
    ge40: { badge: '⚠ Clearance Alert',  event: 'SEASON-END BLOWOUT',   tagline: 'Stock running out FAST — grab your favourites at jaw-dropping prices. Last chance before the season ends!' },
    ge25: { badge: '⚠ Final Clearance',  event: 'FINAL CLEARANCE SALE', tagline: "Last chance before the season ends. Don't miss out on massive savings across all categories!" },
    lt25: { badge: '⚠ Clearance',        event: 'CLEARANCE SALE',        tagline: 'Grab your favourites at jaw-dropping prices. Stock is moving fast — act now!' },
  },
  Amber: {
    ge25: { badge: '⚡ Limited Offer',   event: 'SPECIAL SAVINGS EVENT', tagline: 'Limited-time deal — save big on handpicked items. Quality products at unbeatable prices. While stocks last!' },
    lt25: { badge: '⚡ Exclusive Deal',  event: 'EXCLUSIVE OFFER',        tagline: "Fresh deals, real value. Save on selected items before they're gone. Act before it's too late!" },
  },
}

function getPosterCopy(tier, pct) {
  if (tier === 'Red') {
    if (pct >= 40) return COPY.Red.ge40
    if (pct >= 25) return COPY.Red.ge25
    return COPY.Red.lt25
  }
  if (pct >= 25) return COPY.Amber.ge25
  return COPY.Amber.lt25
}

export default function StorePoster({ store, recommendations, onClose }) {
  const storeRecs = recommendations.filter(
    r => r.store === store && (r.urgency_tier === 'Red' || r.urgency_tier === 'Amber')
  )
  const tier      = storeRecs.some(r => r.urgency_tier === 'Red') ? 'Red' : 'Amber'
  const avgPct    = Math.round(
    storeRecs.reduce((s, r) => s + (r.markdown_pct || 0), 0) / (storeRecs.length || 1)
  )
  const skuCount  = storeRecs.length
  const catCount  = new Set(storeRecs.map(r => r.category).filter(Boolean)).size
  const actBy     = storeRecs.map(r => r.action_by_date).filter(Boolean).sort()[0] ?? null
  const daysUntil = actBy ? Math.ceil((new Date(actBy) - new Date()) / 86400000) : null
  const actLabel  = daysUntil == null ? 'Monitor' : daysUntil <= 0 ? 'TODAY' : `${daysUntil}d`

  const { badge, event, tagline } = getPosterCopy(tier, avgPct)
  const isRed = tier === 'Red'

  return (
    <div className={`store-poster store-poster-print ${isRed ? 'sp-red' : 'sp-amber'}`}>
      {/* Hero */}
      <div className="sp-hero">
        <div className="sp-hero-circle sp-hero-circle-lg" />
        <div className="sp-hero-circle sp-hero-circle-sm" />
        {!isRed && <div className="sp-hero-grid" />}
        <div className="sp-corner-tag">{isRed ? '⚠ CLEARANCE' : '⚡ LIMITED OFFER'}</div>
        <button className="sp-close" onClick={onClose}>✕</button>
        <div className="sp-hero-inner">
          <div className="sp-hero-badge">{badge}</div>
          <div className="sp-hero-pct">{avgPct}</div>
          <div className="sp-hero-off">% OFF</div>
        </div>
      </div>

      {/* Body */}
      <div className="sp-body">
        <div className="sp-store-row">
          <span className="sp-store-name">{store}</span>
          <span className="sp-pulse-dot" />
        </div>
        <div className="sp-headline">{event}</div>
        <div className="sp-subline">"Exclusive discounts — because every shopper deserves the best deal!"</div>
        <div className="sp-rule" />
        <div className="sp-tagline">{tagline}</div>
        <div className="sp-stats">
          <div className="sp-stat">
            <span className="sp-stat-n">{skuCount}</span>
            <span className="sp-stat-l">SKUs</span>
          </div>
          <div className="sp-stat">
            <span className="sp-stat-n">{actLabel}</span>
            <span className="sp-stat-l">Act By</span>
          </div>
          <div className="sp-stat">
            <span className="sp-stat-n">{catCount || '—'}</span>
            <span className="sp-stat-l">Categories</span>
          </div>
        </div>
        <button className="sp-print" onClick={() => window.print()}>
          🖨 &nbsp;Print This Poster
        </button>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Confirm the file exists**

```bash
ls "frontend/src/components/StorePoster.jsx"
```

- [ ] **Step 3: Commit**

```bash
git add frontend/src/components/StorePoster.jsx
git commit -m "feat: add StorePoster component (premium Red/Amber design)"
```

---

## Task 4: Wire up Sidebar — add 🖼 Poster button

**Files:**
- Modify: `frontend/src/components/Sidebar.jsx`

- [ ] **Step 1: Add `onShowPoster` to the destructured props at line 7**

Current:
```jsx
export default function Sidebar({
  onLoadSample, onUpload, onRecalculate, datesChanged, loading,
  recommendations, filters, setFilters,
  rationales, seasonDates, setSeasonDates,
}) {
```

Change to:
```jsx
export default function Sidebar({
  onLoadSample, onUpload, onRecalculate, datesChanged, loading,
  recommendations, filters, setFilters,
  rationales, seasonDates, setSeasonDates,
  onShowPoster,
}) {
```

- [ ] **Step 2: Add `storeTiers` computation after the existing `stores`/`categories` derivations (after line 16)**

Current:
```jsx
  const stores     = recommendations ? [...new Set(recommendations.map(r => r.store))].sort() : []
  const categories = recommendations ? [...new Set(recommendations.map(r => r.category))].sort() : []
```

Change to:
```jsx
  const stores     = recommendations ? [...new Set(recommendations.map(r => r.store))].sort() : []
  const categories = recommendations ? [...new Set(recommendations.map(r => r.category))].sort() : []
  const storeTiers = recommendations
    ? Object.fromEntries(stores.map(s => {
        const recs = recommendations.filter(r => r.store === s)
        const tier = recs.some(r => r.urgency_tier === 'Red')   ? 'Red'
                   : recs.some(r => r.urgency_tier === 'Amber') ? 'Amber'
                   : 'Green'
        return [s, tier]
      }))
    : {}
```

- [ ] **Step 3: Replace the store chips render block**

Find this block inside the JSX (around line 164–173):
```jsx
            <div style={{ fontSize: '0.74rem', color: 'var(--text-dim)', marginBottom: 4 }}>Store</div>
            <div className="multi-select" style={{ marginBottom: 10 }}>
              {stores.map(s => (
                <button
                  key={s}
                  className={`chip ${filters.store.includes(s) ? 'active' : ''}`}
                  onClick={() => toggleFilter('store', s)}
                >
                  {s}
                </button>
              ))}
            </div>
```

Replace with:
```jsx
            <div style={{ fontSize: '0.74rem', color: 'var(--text-dim)', marginBottom: 4 }}>Store</div>
            <div className="multi-select" style={{ marginBottom: 10, flexDirection: 'column', alignItems: 'flex-start' }}>
              {stores.map(s => (
                <div key={s} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <button
                    className={`chip ${filters.store.includes(s) ? 'active' : ''}`}
                    onClick={() => toggleFilter('store', s)}
                  >
                    {s}
                  </button>
                  {(storeTiers[s] === 'Red' || storeTiers[s] === 'Amber') && (
                    <button
                      className={`sp-trigger-btn ${storeTiers[s] === 'Red' ? 'red' : 'amber'}`}
                      onClick={() => onShowPoster(s)}
                      title="View store poster"
                    >
                      🖼
                    </button>
                  )}
                </div>
              ))}
            </div>
```

- [ ] **Step 4: Commit**

```bash
git add frontend/src/components/Sidebar.jsx
git commit -m "feat: add poster trigger button to Amber/Red store chips in sidebar"
```

---

## Task 5: Wire up `App.jsx` for the poster

**Files:**
- Modify: `frontend/src/App.jsx`

- [ ] **Step 1: Import `StorePoster` at the top of `App.jsx`**

After the existing imports (around line 9), add:
```jsx
import StorePoster    from './components/StorePoster'
```

- [ ] **Step 2: Add `posterStore` state after the existing `useState` declarations (after line 22)**

```jsx
  const [posterStore,  setPosterStore]  = useState(null)
```

- [ ] **Step 3: Add `handleShowPoster` handler after `handleRecalculate` (after line 74)**

```jsx
  const handleShowPoster = (store) =>
    setPosterStore(prev => (prev === store ? null : store))
```

- [ ] **Step 4: Pass `onShowPoster` to `<Sidebar>` (in the existing `<Sidebar ... />` block)**

Add one prop to the existing `<Sidebar>` JSX:
```jsx
        onShowPoster={handleShowPoster}
```

- [ ] **Step 5: Render `<StorePoster>` in `main` — place it just before the `<div ref={tableRef} ...>` section-header div**

Find this block inside `{recommendations && !loading && ( <> ... )}`:
```jsx
            <div ref={tableRef} className="section-header" ...>
```

Insert before it:
```jsx
            {posterStore && (
              <StorePoster
                store={posterStore}
                recommendations={recommendations}
                onClose={() => setPosterStore(null)}
              />
            )}
```

- [ ] **Step 6: Commit**

```bash
git add frontend/src/App.jsx
git commit -m "feat: wire posterStore state and StorePoster into App"
```

---

## Task 6: Add `ImpactCards` sub-component and wire `RationalePanel`

**Files:**
- Modify: `frontend/src/components/RationalePanel.jsx`

- [ ] **Step 1: Add `ImpactCards` function above the `export default function RationalePanel` line**

```jsx
function ImpactCards({ row, seasonEndDate }) {
  const lift         = Number(row.velocity_lift) || 1.4
  const oldVel       = Number(row.velocity_14d)  || 0
  const newVel       = oldVel * lift
  const stock        = Number(row.stock_on_hand) || 0
  const daysRemaining = Math.max(
    0,
    (new Date(seasonEndDate) - new Date()) / 86_400_000
  )
  const unitsCleaned = Math.min(Math.round(newVel * daysRemaining), stock)
  const unitsAtRisk  = Math.max(0, stock - unitsCleaned)
  const newDoc       = newVel > 0 ? stock / newVel : 0
  const daysSaved    = Math.max(0, Math.round((Number(row.days_of_cover) || 0) - newDoc))

  const cards = [
    {
      label: 'Velocity after markdown',
      value: `${oldVel.toFixed(1)} → ${newVel.toFixed(1)} u/day`,
      sub:   `${lift}x lift applied`,
    },
    {
      label: 'Units expected to clear',
      value: `${unitsCleaned} of ${stock}`,
      sub:   `in ${Math.round(daysRemaining)} days remaining`,
    },
    {
      label: 'Units still at risk',
      value: String(unitsAtRisk),
      sub:   unitsAtRisk === 0 ? 'Full clearance expected' : 'may remain unsold',
    },
    {
      label: 'Days saved',
      value: `${daysSaved} days sooner`,
      sub:   'vs current velocity',
    },
  ]

  return (
    <div>
      <div className="impact-section-title">📈 Impact After Applying Discount</div>
      <div className="impact-cards">
        {cards.map(({ label, value, sub }) => (
          <div key={label} className="impact-card">
            <span className="impact-card-label">{label}</span>
            <strong className="impact-card-value">{value}</strong>
            <span className="impact-card-sub">{sub}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Add `seasonEndDate` to the `RationalePanel` props**

Current signature:
```jsx
export default function RationalePanel({ row, rationales, setRationales }) {
```

Change to:
```jsx
export default function RationalePanel({ row, rationales, setRationales, seasonEndDate }) {
```

- [ ] **Step 3: Replace the "What Will Happen" text block in the JSX**

Find this block (inside `{open && ( <div className="rationale-body"> ... )}`):
```jsx
                <div>
                  <div className="rat-section-title">✅ What Will Happen</div>
                  <div className="rat-section-body">{rd.rationale_outcome || '—'}</div>
                </div>
```

Replace with:
```jsx
                <ImpactCards row={row} seasonEndDate={seasonEndDate} />
```

- [ ] **Step 4: Commit**

```bash
git add frontend/src/components/RationalePanel.jsx
git commit -m "feat: replace rationale outcome text with ImpactCards visual stat cards"
```

---

## Task 7: Pass `seasonEndDate` from `App.jsx` to `RationalePanel`

**Files:**
- Modify: `frontend/src/App.jsx`

- [ ] **Step 1: Find the `<RationalePanel>` usage in `App.jsx`**

It is rendered inside the `{selectedRow && ( ... )}` block:
```jsx
                <RationalePanel
                  row={selectedRow}
                  rationales={rationales}
                  setRationales={setRationales}
                />
```

- [ ] **Step 2: Add the `seasonEndDate` prop**

```jsx
                <RationalePanel
                  row={selectedRow}
                  rationales={rationales}
                  setRationales={setRationales}
                  seasonEndDate={appliedDates.end}
                />
```

- [ ] **Step 3: Commit**

```bash
git add frontend/src/App.jsx
git commit -m "feat: pass seasonEndDate to RationalePanel for impact card computation"
```

---

## Task 8: End-to-end smoke test

- [ ] **Step 1: Start the API server**

```bash
cd "c:/Users/MadhanSaiV/OneDrive - GANIT BUSINESS SOLUTIONS PRIVATE LIMITED/Ideathon1"
uvicorn api.main:app --reload --port 8000
```

- [ ] **Step 2: Start the frontend dev server (new terminal)**

```bash
cd "c:/Users/MadhanSaiV/OneDrive - GANIT BUSINESS SOLUTIONS PRIVATE LIMITED/Ideathon1/frontend"
npm run dev
```

Open http://localhost:5173.

- [ ] **Step 3: Test the Store Poster**

  1. Click **Load Sample Data**
  2. In the sidebar → Store section, confirm Amber/Red stores show a 🖼 button; Green stores do not
  3. Click 🖼 on a Red store → poster slides in above the SKU table with crimson hero, correct discount %, store name, and stats
  4. Click 🖼 on the same store again → poster closes (toggle)
  5. Click 🖼 on an Amber store → poster switches to amber/gold version
  6. Click **Print This Poster** → browser print dialog appears, only the poster is visible

- [ ] **Step 4: Test the Impact Cards**

  1. Click any Red or Amber row in the SKU table
  2. Click **Generate AI Rationale** on a Red/Amber SKU
  3. Once the rationale loads, expand it
  4. Confirm the "What Will Happen" paragraph is gone and 4 stat cards appear: Velocity, Units to Clear, Units at Risk, Days Saved
  5. Confirm the values are non-zero and make sense (e.g. new velocity > old velocity)

- [ ] **Step 5: Final commit**

```bash
git add .
git commit -m "feat: complete store poster + impact cards features"
```
