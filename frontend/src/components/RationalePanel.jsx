import { useState } from 'react'
import { fetchRationale } from '../api'

const IMPACT_THEME = {
  Red:   { accent: '#ef4444', accentSoft: 'rgba(239,68,68,0.18)',   panel: 'linear-gradient(135deg,#2a0e12 0%,#120b15 55%,#361117 100%)', glow: 'rgba(239,68,68,0.22)' },
  Amber: { accent: '#f59e0b', accentSoft: 'rgba(245,158,11,0.18)',  panel: 'linear-gradient(135deg,#2b1806 0%,#16100b 55%,#35240f 100%)', glow: 'rgba(245,158,11,0.22)' },
  Green: { accent: '#10b981', accentSoft: 'rgba(16,185,129,0.18)',  panel: 'linear-gradient(135deg,#082018 0%,#091314 55%,#103126 100%)', glow: 'rgba(16,185,129,0.22)' },
}

function ImpactCards({ row, seasonEndDate }) {
  const lift          = Number(row.velocity_lift) || 1.4
  const oldVel        = Number(row.velocity_14d)  || 0
  const newVel        = oldVel * lift
  const stock         = Number(row.stock_on_hand) || 0
  const daysRemaining = Math.max(0, (new Date(seasonEndDate) - new Date()) / 86_400_000)
  const unitsCleaned  = Math.min(Math.round(newVel * daysRemaining), stock)
  const unitsAtRisk   = Math.max(0, stock - unitsCleaned)
  const newDoc        = newVel > 0 ? stock / newVel : 0
  const daysSaved     = Math.max(0, Math.round((Number(row.days_of_cover) || 0) - newDoc))

  const theme = IMPACT_THEME[row.urgency_tier] || IMPACT_THEME.Green
  const riskColor = unitsAtRisk === 0 ? '#10b981' : '#ef4444'
  const riskSoft  = unitsAtRisk === 0 ? 'rgba(16,185,129,0.18)' : 'rgba(239,68,68,0.18)'

  return (
    <section
      className="poster-card"
      style={{
        background:  theme.panel,
        borderColor: `${theme.accent}55`,
        boxShadow:   `0 18px 40px ${theme.glow}`,
        marginTop:   12,
      }}
    >
      <div className="poster-card-orb" style={{ background: theme.glow }} />

      <div className="poster-card-topline">
        <span className="poster-strap" style={{ color: theme.accent }}>📈 Impact After Applying Discount</span>
      </div>

      <div className="poster-card-main">
        <div className="poster-copy">
          <div className="poster-discount-line">
            <span className="poster-discount" style={{ color: theme.accent, fontSize: '3.2rem' }}>
              {daysSaved}
            </span>
            <div className="poster-discount-meta">
              <div className="poster-discount-title">days sooner</div>
              <div className="poster-discount-band">vs current velocity</div>
            </div>
          </div>
          <h3 className="poster-headline">
            {unitsCleaned} of {stock} units expected to clear
          </h3>
          <p className="poster-kicker">
            With a {lift}x velocity lift applied, {unitsCleaned} units will sell in the{' '}
            {Math.round(daysRemaining)} days remaining this season.
          </p>
        </div>

        <div className="poster-side-panel">
          <div
            className="poster-badge"
            style={{ background: riskSoft, borderColor: `${riskColor}55` }}
          >
            <span>Units at risk</span>
            <strong style={{ color: riskColor }}>
              {unitsAtRisk === 0 ? 'Full clearance expected' : `${unitsAtRisk} may remain unsold`}
            </strong>
          </div>
          <div className="poster-badge" style={{ background: 'rgba(15,23,42,0.45)' }}>
            <span>Velocity lift</span>
            <strong>{lift}x applied</strong>
          </div>
          <div className="poster-badge" style={{ background: 'rgba(15,23,42,0.45)' }}>
            <span>Season remaining</span>
            <strong>{Math.round(daysRemaining)} days</strong>
          </div>
        </div>
      </div>

      <div className="poster-metrics">
        <div className="poster-metric">
          <span>Velocity After Markdown</span>
          <strong>{oldVel.toFixed(1)} → {newVel.toFixed(1)} u/day</strong>
        </div>
        <div className="poster-metric">
          <span>Units Expected to Clear</span>
          <strong>{unitsCleaned} of {stock}</strong>
        </div>
        <div className="poster-metric">
          <span>Units Still at Risk</span>
          <strong style={{ color: riskColor }}>{unitsAtRisk}</strong>
        </div>
        <div className="poster-metric">
          <span>Days Saved</span>
          <strong style={{ color: theme.accent }}>{daysSaved} days sooner</strong>
        </div>
      </div>
    </section>
  )
}

const TIER_COLORS = { Red: '#EF4444', Amber: '#F59E0B', Green: '#10B981' }
const TIER_ICONS  = { Red: '🔴', Amber: '🟡', Green: '🟢' }

export default function RationalePanel({ row, rationales, setRationales, seasonEndDate }) {
  const [loading,  setLoading]  = useState(false)
  const [open,     setOpen]     = useState(false)
  const [error,    setError]    = useState(null)

  const tier  = row.urgency_tier
  const key   = `${row.sku}_${row.store}`
  const rd    = rationales[key]
  const color = TIER_COLORS[tier] || '#64748B'
  const icon  = TIER_ICONS[tier]  || '⚪'

  const handleGenerate = async () => {
    setLoading(true); setError(null)
    try {
      const result = await fetchRationale(row)
      setRationales(prev => ({ ...prev, [key]: result }))
      setOpen(true)
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  if (tier === 'Green') {
    return (
      <div className="green-notice">
        ✅ Green SKU — selling well, no markdown needed.
      </div>
    )
  }

  const confLabel = rd?.confidence?.split('\n')[0]?.slice(0, 60) ?? 'N/A'

  return (
    <div style={{ marginTop: 8 }}>
      <ImpactCards row={row} seasonEndDate={seasonEndDate} />

      <div style={{ marginTop: 12 }}>
        {!rd ? (
          <>
            <button
              className="btn btn-primary"
              style={{ width: 'auto', paddingLeft: 20, paddingRight: 20 }}
              onClick={handleGenerate}
              disabled={loading}
            >
              {loading
                ? <><span className="spinner" style={{ width: 14, height: 14, borderWidth: 2, display: 'inline-block', verticalAlign: 'middle', marginRight: 8 }} />Generating…</>
                : `✨ Generate AI Rationale for ${row.sku} @ ${row.store}`}
            </button>
            {error && <div className="alert-error" style={{ marginTop: 8 }}>{error}</div>}
          </>
        ) : (
          <div className="rationale-expander">
            <button
              className={`rationale-toggle ${open ? 'open' : ''}`}
              onClick={() => setOpen(o => !o)}
            >
              <span>
                {icon}&nbsp;
                <strong style={{ color }}>AI Rationale</strong>
                &nbsp;— {row.sku} @ {row.store}
                &nbsp;·&nbsp;Confidence: {confLabel}
              </span>
              <span className="chevron" style={{ color: 'var(--text-dim)', fontSize: 12 }}>▼</span>
            </button>

            {open && (
              <div className="rationale-body">
                <div className="rat-col">
                  <div>
                    <div className="rat-section-title">📊 Why This Discount</div>
                    <div className="rat-section-body">{rd.rationale_why || '—'}</div>
                  </div>
                </div>
                <div className="rat-col">
                  <div>
                    <div className="rat-section-title">⚠️ If Not Applied</div>
                    <div className="rat-section-body">{rd.rationale_consequence || '—'}</div>
                  </div>
                  <div>
                    <div className="rat-section-title">🎯 Confidence</div>
                    <div className="rat-section-body">{rd.confidence || '—'}</div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
