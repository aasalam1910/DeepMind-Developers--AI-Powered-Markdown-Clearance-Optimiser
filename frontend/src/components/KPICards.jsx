import { useState } from 'react'

const CARDS = [
  { key: 'Red',   label: 'CRITICAL — RED',    sub: 'Immediate Action Required', icon: '!',  iconClass: 'red',    valueClass: 'red',    stroke: '#EF4444', accentRgb: '239,68,68' },
  { key: 'Amber', label: 'AT RISK — AMBER',   sub: 'Monitor Closely',           icon: '⚠',  iconClass: 'amber',  valueClass: 'amber',  stroke: '#F59E0B', accentRgb: '245,158,11' },
  { key: 'Green', label: 'ON TRACK — GREEN',  sub: 'Performing Well',           icon: '✓',  iconClass: 'green',  valueClass: 'green',  stroke: '#10B981', accentRgb: '16,185,129' },
  { key: 'Total', label: 'TOTAL SKU × STORE', sub: 'Across All Locations',      icon: '◫',  iconClass: 'indigo', valueClass: 'indigo', stroke: '#6366F1', accentRgb: '99,102,241' },
]

function Spark({ stroke }) {
  const id     = `g-${stroke.replace('#','')}`
  const fillId = `f-${stroke.replace('#','')}`
  const path     = "M0,22 Q8,16 16,18 T32,14 T48,16 T64,10 T80,12 T96,6"
  const fillPath = `${path} L96,28 L0,28 Z`
  return (
    <svg className="kpi-spark" viewBox="0 0 96 28" preserveAspectRatio="none">
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%"   stopColor={stroke} stopOpacity="0.4" />
          <stop offset="100%" stopColor={stroke} stopOpacity="1"   />
        </linearGradient>
        <linearGradient id={fillId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   stopColor={stroke} stopOpacity="0.18" />
          <stop offset="100%" stopColor={stroke} stopOpacity="0"    />
        </linearGradient>
      </defs>
      <path d={fillPath} fill={`url(#${fillId})`} />
      <path d={path} fill="none" stroke={`url(#${id})`} strokeWidth="2" strokeLinecap="round" />
    </svg>
  )
}

function formatRupees(val) {
  if (val >= 10000000) return `₹${(val / 10000000).toFixed(1)}Cr`
  if (val >= 100000)   return `₹${(val / 100000).toFixed(1)}L`
  if (val >= 1000)     return `₹${(val / 1000).toFixed(1)}K`
  return `₹${Math.round(val)}`
}

function skuLoss(r, hasPrices, isGreen) {
  const stock = r.stock_on_hand || 0
  const pct   = r.markdown_pct  || 0
  const price = r.price         || 0
  if (isGreen) return hasPrices ? stock * price : stock
  return hasPrices ? stock * (pct / 100) * price : stock * pct
}

function getCategoryBreakdown(recs, tier, hasPrices) {
  const isGreen = tier === 'Green'
  const catMap  = {}

  for (const r of recs) {
    if (tier !== 'Total' && r.urgency_tier !== tier) continue
    const cat = r.category || 'Other'
    if (!catMap[cat]) catMap[cat] = { loss: 0, skuRows: [], storeSet: new Set() }
    catMap[cat].storeSet.add(r.store)
    const loss = skuLoss(r, hasPrices, isGreen)
    catMap[cat].loss += loss
    catMap[cat].skuRows.push({ sku: r.sku, store: r.store, loss, pct: r.markdown_pct || 0, stock: r.stock_on_hand || 0 })
  }

  return Object.entries(catMap)
    .map(([cat, { loss, skuRows, storeSet }]) => ({
      cat, loss,
      skuCount: skuRows.length,
      stores: storeSet.size,
      topSkus: [...skuRows].sort((a, b) => b.loss - a.loss).slice(0, 3),
    }))
    .sort((a, b) => b.loss - a.loss)
}

function managerSummary(cat, loss, skuCount, stores, rank, totalLoss, tier, hasPrices) {
  const isRed   = tier === 'Red'
  const isGreen = tier === 'Green'
  const pct     = totalLoss > 0 ? Math.round((loss / totalLoss) * 100) : 0
  const lossStr = hasPrices ? formatRupees(loss) : `${Math.round(loss)} units`

  if (isGreen) {
    return `${cat} is performing well — ${lossStr} revenue protected across ${stores} store${stores !== 1 ? 's' : ''}.`
  }

  if (rank === 0) {
    return isRed
      ? `⚡ Highest loss category — ${cat} accounts for ${pct}% of total markdown exposure (${lossStr}). Immediate floor action needed across ${stores} store${stores !== 1 ? 's' : ''}.`
      : `${cat} is your biggest at-risk category (${pct}% of exposure, ${lossStr}). Monitor and prepare discounts across ${stores} store${stores !== 1 ? 's' : ''}.`
  }
  if (rank === 1) {
    return `Second highest — ${cat} contributes ${pct}% of loss (${lossStr}) across ${stores} store${stores !== 1 ? 's' : ''}.`
  }
  return `${cat} — ${pct}% of exposure (${lossStr}) across ${stores} store${stores !== 1 ? 's' : ''}.`
}

function SkuPill({ sku, store, loss, pct, hasPrices, stroke, accentRgb, isGreen, onSkuClick }) {
  return (
    <button
      className="kpi-sku-pill"
      style={{ borderColor: `rgba(${accentRgb},0.35)`, color: stroke }}
      onClick={e => { e.stopPropagation(); onSkuClick(sku, store) }}
      title={`Go to ${sku} at ${store} in the table`}
    >
      <span className="kpi-sku-id">{sku}</span>
      <span className="kpi-sku-store">{store}</span>
      {!isGreen && <span className="kpi-sku-pct">{pct}% off</span>}
      {hasPrices && <span className="kpi-sku-loss">{formatRupees(loss)}</span>}
      <span className="kpi-sku-goto">↓ go to row</span>
    </button>
  )
}

function CategoryBreakdown({ recs, tier, stroke, accentRgb, isGreen, onSkuClick }) {
  const [openCat, setOpenCat] = useState(null)
  const hasPrices = recs.some(r => r.price != null && Number(r.price) > 0)
  const rows      = getCategoryBreakdown(recs, tier, hasPrices)
  const totalLoss = rows.reduce((s, r) => s + r.loss, 0)

  if (rows.length === 0) return null

  return (
    <div className="kpi-breakdown">

      {/* Header */}
      <div className="kpi-breakdown-header">
        <span style={{ color: stroke }}>
          {isGreen ? '💰 Protected Revenue by Category' : '⚠ Loss Exposure by Category'}
        </span>
        {hasPrices
          ? <span className="kpi-breakdown-total" style={{ color: stroke }}>{formatRupees(totalLoss)}</span>
          : <span className="kpi-breakdown-note">Add price column for ₹ values</span>
        }
      </div>

      {/* Category rows */}
      {rows.map(({ cat, loss, skuCount, stores, topSkus }, rank) => {
        const barPct  = totalLoss > 0 ? (loss / totalLoss) * 100 : 0
        const isFirst = rank === 0 && !isGreen
        const catOpen = openCat === cat

        return (
          <div
            key={cat}
            className={`kpi-breakdown-row${isFirst ? ' kpi-bd-row-top' : ''}`}
            style={isFirst ? { background: `rgba(${accentRgb},0.05)`, borderRadius: 8, padding: '8px 8px 6px' } : {}}
          >
            {/* Summary line */}
            <div className="kpi-bd-summary">
              {isFirst && !isGreen && (
                <span className="kpi-bd-badge" style={{ background: `rgba(${accentRgb},0.15)`, color: stroke }}>
                  #1 LOSS
                </span>
              )}
              <p className="kpi-bd-insight">
                {managerSummary(cat, loss, skuCount, stores, rank, totalLoss, tier, hasPrices)}
              </p>
            </div>

            {/* Bar + numbers */}
            <div className="kpi-bd-top">
              <span className="kpi-bd-cat">{cat}</span>
              <span className="kpi-bd-meta">{skuCount} SKUs · {stores} store{stores !== 1 ? 's' : ''}</span>
              <span className="kpi-bd-val" style={{ color: stroke }}>
                {hasPrices ? formatRupees(loss) : `${Math.round(loss)} units`}
              </span>
            </div>
            <div className="kpi-bd-bar-bg">
              <div
                className="kpi-bd-bar-fill"
                style={{ width: `${barPct}%`, background: isFirst ? stroke : `rgba(${accentRgb},0.45)` }}
              />
            </div>

            {/* SKU expand toggle */}
            <button
              className="kpi-bd-sku-toggle"
              style={{ color: stroke }}
              onClick={e => { e.stopPropagation(); setOpenCat(prev => prev === cat ? null : cat) }}
            >
              {catOpen ? '▲ hide SKUs' : `▼ top SKUs (${Math.min(topSkus.length, 3)})`}
            </button>

            {/* Top SKUs */}
            {catOpen && (
              <div className="kpi-bd-skus">
                <div className="kpi-bd-skus-hint">Click any SKU to jump to its row in the table</div>
                {topSkus.map(s => (
                  <SkuPill
                    key={`${s.sku}-${s.store}`}
                    sku={s.sku}
                    store={s.store}
                    loss={s.loss}
                    pct={s.pct}
                    hasPrices={hasPrices}
                    stroke={stroke}
                    accentRgb={accentRgb}
                    isGreen={isGreen}
                    onSkuClick={onSkuClick}
                  />
                ))}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

export default function KPICards({ recommendations, onSkuClick }) {
  const [expanded, setExpanded] = useState(null)

  const counts = {
    Red:   recommendations.filter(r => r.urgency_tier === 'Red').length,
    Amber: recommendations.filter(r => r.urgency_tier === 'Amber').length,
    Green: recommendations.filter(r => r.urgency_tier === 'Green').length,
    Total: recommendations.length,
  }

  const toggle = (key) => setExpanded(prev => prev === key ? null : key)

  const activeCard = CARDS.find(c => c.key === expanded)

  return (
    <div className="kpi-section">
      <div className="kpi-grid">
        {CARDS.map(({ key, label, sub, icon, iconClass, valueClass, stroke, accentRgb }) => {
          const isOpen = expanded === key
          return (
            <div
              key={key}
              className={`kpi-card kpi-card-clickable${isOpen ? ' kpi-card-open' : ''}`}
              onClick={() => toggle(key)}
              title="Click to see category breakdown"
            >
              <div className="kpi-content">
                <div className="kpi-top">
                  <div className={`kpi-icon ${iconClass}`}>{icon}</div>
                  <Spark stroke={stroke} />
                </div>
                <div className={`kpi-value ${valueClass}`}>{counts[key]}</div>
                <div className={`kpi-label ${valueClass}`}>{label}</div>
                <div className="kpi-sub">
                  {sub}
                  <span className="kpi-expand-hint" style={{ color: stroke }}>
                    {isOpen ? '  ▲ hide' : '  ▼ details'}
                  </span>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {activeCard && (
        <div
          className="kpi-panel"
          style={{ borderColor: `rgba(${activeCard.accentRgb},0.25)`, boxShadow: `0 4px 24px rgba(${activeCard.accentRgb},0.08)` }}
        >
          <CategoryBreakdown
            recs={recommendations}
            tier={activeCard.key}
            stroke={activeCard.stroke}
            accentRgb={activeCard.accentRgb}
            isGreen={activeCard.key === 'Green'}
            onSkuClick={onSkuClick}
          />
        </div>
      )}
    </div>
  )
}
