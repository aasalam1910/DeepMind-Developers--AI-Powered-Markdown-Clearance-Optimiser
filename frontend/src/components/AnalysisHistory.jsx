import { useState } from 'react'

const STORAGE_KEY = 'markdown_analysis_history'
const MAX_RUNS = 10

// ── Save a run (called from App on every load/upload) ─────────────
export function saveAnalysisRun(recommendations, appliedDates, source) {
  const red   = recommendations.filter(r => r.urgency_tier === 'Red').length
  const amber = recommendations.filter(r => r.urgency_tier === 'Amber').length
  const green = recommendations.filter(r => r.urgency_tier === 'Green').length

  // Top at-risk SKUs with full recommendation context
  const atRiskSkus = recommendations
    .filter(r => r.urgency_tier === 'Red' || r.urgency_tier === 'Amber')
    .sort((a, b) => {
      // Sort Red first, then by stock at risk descending
      if (a.urgency_tier !== b.urgency_tier) return a.urgency_tier === 'Red' ? -1 : 1
      return (b.stock_on_hand || 0) - (a.stock_on_hand || 0)
    })
    .slice(0, 8)
    .map(r => ({
      sku:          r.sku,
      store:        r.store,
      category:     r.category || 'Unknown',
      tier:         r.urgency_tier,
      stock:        r.stock_on_hand || 0,
      velocity:     r.velocity_14d != null ? Number(r.velocity_14d).toFixed(2) : null,
      markdown_pct: r.markdown_pct || 0,
      markdown_band:r.markdown_band || '',
      days_cover:   r.days_of_cover != null ? Math.round(r.days_of_cover) : null,
      sell_through: r.sell_through_pct != null ? Math.round(r.sell_through_pct) : null,
      price:        r.price || null,
    }))

  const categories = [...new Set(recommendations.map(r => r.category).filter(Boolean))]

  const run = {
    id:          Date.now(),
    runAt:       new Date().toISOString(),
    source,
    seasonStart: appliedDates.start,
    seasonEnd:   appliedDates.end,
    total:       recommendations.length,
    red, amber, green,
    atRiskSkus,
    categories,
  }

  try {
    const existing = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]')
    const updated  = [run, ...existing].slice(0, MAX_RUNS)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated))
  } catch (_) {}
}

export function loadHistory() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]')
  } catch (_) {
    return []
  }
}

// ── Helpers ───────────────────────────────────────────────────────
function formatDate(iso) {
  const d = new Date(iso)
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
    + ' · ' + d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })
}

function formatSeason(start, end) {
  const fmt = str => {
    if (!str) return '?'
    const [y, m, d] = str.split('-')
    const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
    return `${parseInt(d)} ${months[parseInt(m) - 1]} '${y.slice(2)}`
  }
  return `${fmt(start)} → ${fmt(end)}`
}

// Generate a plain-English recommendation for each at-risk SKU
function buildRecommendation(sku) {
  const lines = []

  if (sku.tier === 'Red') {
    if (sku.markdown_pct >= 30) {
      lines.push(`Apply ${sku.markdown_pct}% markdown immediately — stock is critically high relative to velocity.`)
    } else if (sku.markdown_pct > 0) {
      lines.push(`Apply ${sku.markdown_pct}% discount now to prevent end-of-season dead stock.`)
    } else {
      lines.push(`Initiate markdown — no discount applied yet despite critical stock level.`)
    }
    if (sku.days_cover !== null && sku.days_cover > 30) {
      lines.push(`Days of cover: ${sku.days_cover}d — far exceeds season remaining. Aggressive action needed.`)
    }
  } else {
    if (sku.markdown_pct > 0) {
      lines.push(`Monitor closely — ${sku.markdown_pct}% discount recommended to reduce at-risk inventory.`)
    } else {
      lines.push(`Watch velocity trend — consider a light discount (10–15%) if sell-through stays low.`)
    }
    if (sku.sell_through !== null && sku.sell_through < 50) {
      lines.push(`Only ${sku.sell_through}% sold through — under half the opening stock moved.`)
    }
  }

  if (sku.velocity !== null && Number(sku.velocity) < 0.5) {
    lines.push(`Very slow mover: ${sku.velocity} units/day. Consider bundling or cross-store transfer.`)
  }

  if (sku.price && sku.stock > 0 && sku.markdown_pct > 0) {
    const loss = Math.round(sku.stock * (sku.markdown_pct / 100) * sku.price)
    if (loss >= 1000) {
      const display = loss >= 100000
        ? `₹${(loss / 100000).toFixed(1)}L`
        : loss >= 1000
        ? `₹${(loss / 1000).toFixed(0)}K`
        : `₹${loss}`
      lines.push(`Estimated markdown cost: ${display} if full stock is discounted.`)
    }
  }

  return lines
}

// ── Single at-risk SKU card (timeline style) ─────────────────────
function SkuTimelineCard({ sku, color, accentRgb, isLast }) {
  const [open, setOpen] = useState(false)
  const recs = buildRecommendation(sku)

  return (
    <div className="ah-tl-item" style={{ borderLeftColor: isLast ? 'transparent' : 'var(--border2)' }}>
      <div className="ah-tl-dot" style={{ background: color }} />

      <div className="ah-tl-meta">
        <span className={`ah-sku-tier ah-sku-tier-${sku.tier.toLowerCase()}`}>{sku.tier}</span>
        <span className="ah-tl-sku">{sku.sku}</span>
        <span className="ah-tl-store">{sku.store}</span>
        <span className="ah-tl-cat">{sku.category}</span>
        <span className="ah-tl-stock">{sku.stock} units</span>
        {sku.markdown_pct > 0 && (
          <span className="ah-tl-pct" style={{ color }}>{sku.markdown_pct}% off</span>
        )}
      </div>

      <button className="ah-tl-toggle" style={{ color }} onClick={() => setOpen(p => !p)}>
        {open ? '▲ hide' : '▼ recommendation'}
      </button>

      {open && (
        <ul className="ah-tl-recs">
          {recs.map((line, i) => <li key={i}>{line}</li>)}
        </ul>
      )}
    </div>
  )
}

// ── One past run card ─────────────────────────────────────────────
function PastRunCard({ run, index }) {
  const [open, setOpen] = useState(false)
  const hasRisk = run.atRiskSkus && run.atRiskSkus.length > 0

  return (
    <div className="ah-run-card">
      {/* Timeline connector dot */}
      <div className="ah-run-dot" />

      <div className="ah-run-header">
        <div className="ah-run-meta">
          <span className="ah-run-time">{formatDate(run.runAt)}</span>
          <span className="ah-run-source">
            {run.source === 'sample' ? '📊 Sample data' : '📂 Uploaded data'}
            {' · '}{formatSeason(run.seasonStart, run.seasonEnd)}
          </span>
        </div>
        <div className="ah-run-pills">
          {run.red   > 0 && <span className="ah-pill ah-pill-red">{run.red} critical</span>}
          {run.amber > 0 && <span className="ah-pill ah-pill-amber">{run.amber} at risk</span>}
          {run.green > 0 && <span className="ah-pill ah-pill-green">{run.green} on track</span>}
        </div>
      </div>

      {hasRisk && (
        <button className="ah-run-toggle" onClick={() => setOpen(p => !p)}>
          {open
            ? '▲ hide recommendations'
            : `▼ ${run.atRiskSkus.length} at-risk SKU${run.atRiskSkus.length !== 1 ? 's' : ''} — view recommendations`}
        </button>
      )}

      {!hasRisk && (
        <p className="ah-no-risk">All SKUs were on track in this run.</p>
      )}

      {open && hasRisk && (
        <div className="ah-tl-list">
          {run.atRiskSkus.map((s, i) => (
            <SkuTimelineCard
              key={i}
              sku={s}
              color={s.tier === 'Red' ? '#EF4444' : '#F59E0B'}
              accentRgb={s.tier === 'Red' ? '239,68,68' : '245,158,11'}
              isLast={i === run.atRiskSkus.length - 1}
            />
          ))}
        </div>
      )}
    </div>
  )
}

// ── Main export ───────────────────────────────────────────────────
export default function AnalysisHistory({ visible }) {
  const [open, setOpen] = useState(false)

  if (!visible) return null

  const history = loadHistory()
  const pastRuns = history.slice(1) // skip current run

  if (pastRuns.length === 0) {
    return (
      <div className="ah-wrapper">
        <button className="ah-trigger-btn" disabled title="No past analyses yet">
          <span className="ah-trigger-icon">🕓</span>
          <span className="ah-trigger-label">Past Analyses</span>
          <span className="ah-trigger-count ah-trigger-count-empty">0</span>
        </button>
      </div>
    )
  }

  const totalAtRisk = pastRuns.reduce((s, r) => s + r.red + r.amber, 0)

  return (
    <div className="ah-wrapper">
      <button
        className={`ah-trigger-btn${open ? ' ah-trigger-open' : ''}`}
        onClick={() => setOpen(p => !p)}
      >
        <span className="ah-trigger-icon">🕓</span>
        <span className="ah-trigger-label">Past Analyses</span>
        <span className="ah-trigger-count">{pastRuns.length}</span>
        {totalAtRisk > 0 && (
          <span className="ah-trigger-risk">{totalAtRisk} at-risk SKUs across runs</span>
        )}
        <span className="ah-trigger-chevron">{open ? '▲' : '▼'}</span>
      </button>

      {open && (
        <div className="ah-panel">
          <div className="ah-panel-header">
            <span className="ah-panel-title">🕐 Past Analysis Runs</span>
            <span className="ah-panel-sub">
              {pastRuns.length} previous run{pastRuns.length !== 1 ? 's' : ''} · expand any to see at-risk SKUs & recommendations
            </span>
          </div>
          <div className="ah-runs-list">
            {pastRuns.map((run, i) => (
              <PastRunCard key={run.id} run={run} index={i} />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
