import { useMemo, useState } from 'react'

const TIER_THEME = {
  Red: {
    accent: '#ef4444',
    accentSoft: 'rgba(239, 68, 68, 0.10)',
    panel: 'linear-gradient(135deg, #FFF5F5 0%, #FFFFFF 55%, #FEF2F2 100%)',
    glow: 'rgba(239, 68, 68, 0.12)',
    icon: '●',
    strap: 'Clear now',
  },
  Amber: {
    accent: '#f59e0b',
    accentSoft: 'rgba(245, 158, 11, 0.10)',
    panel: 'linear-gradient(135deg, #FFFBEB 0%, #FFFFFF 55%, #FFFBEB 100%)',
    glow: 'rgba(245, 158, 11, 0.12)',
    icon: '◆',
    strap: 'Act early',
  },
  Green: {
    accent: '#10b981',
    accentSoft: 'rgba(16, 185, 129, 0.10)',
    panel: 'linear-gradient(135deg, #ECFDF5 0%, #FFFFFF 55%, #ECFDF5 100%)',
    glow: 'rgba(16, 185, 129, 0.12)',
    icon: '▲',
    strap: 'Hold steady',
  },
}

function formatValue(value, suffix = '') {
  if (value == null || value === '') return 'N/A'
  const num = Number(value)
  if (!Number.isFinite(num)) return `${value}${suffix}`
  return `${num.toFixed(num % 1 === 0 ? 0 : 1)}${suffix}`
}

function formatDaysOfCover(doc) {
  if (doc == null) return 'N/A'
  const n = Number(doc)
  if (!Number.isFinite(n)) return 'N/A'
  if (n >= 365) return `${(n / 30).toFixed(0)} months (chronic overstock)`
  if (n >= 90)  return `${Math.round(n)} days (${(n / 30).toFixed(1)} mo)`
  return `${Math.round(n)} days`
}

function buildPosterStory(row, daysUntilAction) {
  const pct = Math.round(row.markdown_pct || 0)
  const stock = row.stock_on_hand ?? 0
  const tier = row.urgency_tier
  const velocity = Number(row.velocity_14d || 0)
  const sellThrough = Number(row.sell_through_pct || 0)

  if (tier === 'Red') {
    return {
      headline: `Move ${stock} units before demand slows further`,
      kicker: `${pct}% markdown is the fastest path to reduce aged stock and avoid late-season residue.`,
      urgency: daysUntilAction != null && daysUntilAction <= 1
        ? 'Immediate execution recommended'
        : 'Critical inventory pressure',
    }
  }

  if (tier === 'Amber') {
    return {
      headline: `Protect margin while accelerating sell-through`,
      kicker: `${pct}% markdown gives this SKU a measured push before a steeper correction is needed.`,
      urgency: velocity > 0
        ? `${formatValue(velocity, ' u/day')} current velocity`
        : 'Watchlist inventory',
    }
  }

  return {
    headline: `Healthy sell-through at ${formatValue(sellThrough, '%')}`,
    kicker: 'This SKU is moving well enough to preserve price integrity and stay full-price for now.',
    urgency: 'No markdown required',
  }
}

export default function DiscountCard({ row }) {
  const [showCalc, setShowCalc] = useState(false)

  const tier = row.urgency_tier
  const theme = TIER_THEME[tier] || TIER_THEME.Green
  const pct = Math.round(row.markdown_pct || 0)
  const band = row.markdown_band || `${pct}%`
  const reason = row.markdown_reason || ''
  const actDate = row.action_by_date || ''
  const steps = Array.isArray(row.markdown_calc) ? row.markdown_calc : []

  const daysUntilAction = actDate
    ? Math.ceil((new Date(actDate) - new Date()) / 86400000)
    : null

  const actionLabel = daysUntilAction == null
    ? 'No deadline'
    : daysUntilAction <= 0
      ? '⚠ Act today'
      : daysUntilAction === 1
        ? '⚠ Act tomorrow'
        : `Act within ${daysUntilAction} days`

  const posterStory = useMemo(
    () => buildPosterStory(row, daysUntilAction),
    [row, daysUntilAction]
  )

  return (
    <>
      <div className="sku-detail-header">
        <span style={{ fontSize: '1.15rem', color: theme.accent }}>{theme.icon}</span>
        <span className="sku-detail-name" style={{ color: '#0F172A' }}>{row.sku}</span>
        <span className="sku-detail-store">@</span>
        <span className="sku-detail-name" style={{ color: '#0F172A' }}>{row.store}</span>
        <span
          className="tier-badge"
          style={{
            color: theme.accent,
            borderColor: theme.accent,
            background: theme.accentSoft,
            marginLeft: 8,
          }}
        >
          {tier}
        </span>
      </div>

      <section
        className="poster-card"
        style={{
          background: theme.panel,
          borderColor: `${theme.accent}55`,
          boxShadow: `0 18px 40px ${theme.glow}`,
        }}
      >
        <div className="poster-card-orb" style={{ background: theme.glow }} />

        <div className="poster-card-topline">
          <span className="poster-strap" style={{ color: theme.accent }}>{theme.strap}</span>
          <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
            {row.festival_name && row.markdown_pct > 0 && (
              <span style={{
                fontSize: '0.65rem', fontWeight: 700, padding: '2px 9px',
                borderRadius: 20, background: 'rgba(251,191,36,0.15)',
                border: '1px solid rgba(251,191,36,0.35)', color: '#f59e0b',
                letterSpacing: '0.4px',
              }}>
                🎉 {row.festival_name} {row.festival_boost}x
              </span>
            )}
            <span className="poster-deadline" style={{ borderColor: `${theme.accent}44`, color: '#475569', background: '#F8FAFC' }}>
              {actionLabel}
            </span>
          </div>
        </div>

        <div className="poster-card-main">
          <div className="poster-copy">
            <div className="poster-discount-line">
              <span className="poster-discount" style={{ color: theme.accent }}>{pct}%</span>
              <div className="poster-discount-meta">
                <div className="poster-discount-title">Recommended markdown</div>
                <div className="poster-discount-band">Range {band}</div>
              </div>
            </div>

            <h3 className="poster-headline">{posterStory.headline}</h3>
            <p className="poster-kicker">{posterStory.kicker}</p>
            <p className="poster-reason">{reason}</p>
          </div>

          <div className="poster-side-panel">
            <div className="poster-badge" style={{ background: theme.accentSoft, borderColor: `${theme.accent}55` }}>
              <span>Priority</span>
              <strong style={{ color: theme.accent }}>{posterStory.urgency}</strong>
            </div>

            <div className="poster-badge" style={{ background: '#F8FAFC', borderColor: '#E5E7EB' }}>
              <span>Action by</span>
              <strong>{actDate || 'Monitor only'}</strong>
            </div>

            <div className="poster-badge" style={{ background: '#F8FAFC', borderColor: '#E5E7EB' }}>
              <span>Store x SKU</span>
              <strong>{row.store} · {row.sku}</strong>
            </div>
          </div>
        </div>

        <div className="poster-metrics">
          <div className="poster-metric">
            <span>Stock on Hand</span>
            <strong>{formatValue(row.stock_on_hand)}</strong>
          </div>
          <div className="poster-metric">
            <span>Daily Velocity</span>
            <strong>{formatValue(row.velocity_14d, ' u/day')}</strong>
          </div>
          <div className="poster-metric">
            <span>Days of Cover</span>
            <strong>{formatDaysOfCover(row.days_of_cover)}</strong>
          </div>
          <div className="poster-metric">
            <span>Sell-Through</span>
            <strong>{formatValue(row.sell_through_pct, '%')}</strong>
          </div>
        </div>

        {steps.length > 0 && (
          <div className="poster-calc-wrap">
            <button
              className="poster-calc-toggle"
              style={{ borderColor: `${theme.accent}55`, color: theme.accent }}
              onClick={() => setShowCalc((value) => !value)}
            >
              {showCalc ? 'Hide' : 'Show'} calculation
            </button>

            {showCalc && (
              <div className="poster-calc-panel">
                <div className="poster-calc-title">Calculation breakdown</div>
                {steps.map((step, index) => (
                  <div
                    key={`${row.sku}-${index}`}
                    className={`poster-calc-line ${index === steps.length - 1 ? 'final' : ''}`}
                    style={index === steps.length - 1 ? { color: theme.accent, borderTopColor: `${theme.accent}33` } : undefined}
                  >
                    {step}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </section>
    </>
  )
}
