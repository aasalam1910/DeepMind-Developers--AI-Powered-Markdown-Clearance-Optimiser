import { useState } from 'react'

const TIER_COLORS = { Red: '#EF4444', Amber: '#F59E0B', Green: '#10B981' }
const TIER_BG     = { Red: '#1A0808',  Amber: '#1A1400',  Green: '#071A0F' }
const TIER_ICONS  = { Red: '🔴', Amber: '🟡', Green: '🟢' }

export default function DiscountCard({ row }) {
  const [showCalc, setShowCalc] = useState(false)

  const tier    = row.urgency_tier
  const color   = TIER_COLORS[tier] || '#64748B'
  const bg      = TIER_BG[tier]     || '#161B27'
  const icon    = TIER_ICONS[tier]  || '⚪'
  const pct     = Math.round(row.markdown_pct || 0)
  const band    = row.markdown_band || `${pct}%`
  const reason  = row.markdown_reason || ''
  const actDate = row.action_by_date  || ''
  const steps   = Array.isArray(row.markdown_calc) ? row.markdown_calc : []

  // Action deadline urgency
  const daysUntilAction = actDate
    ? Math.ceil((new Date(actDate) - new Date()) / 86400000)
    : null
  const actionUrgencyColor = daysUntilAction == null ? color
    : daysUntilAction <= 1  ? '#EF4444'
    : daysUntilAction <= 3  ? '#F59E0B'
    : '#94A3B8'
  const actionLabel = daysUntilAction == null ? ''
    : daysUntilAction <= 0  ? 'TODAY — overdue!'
    : daysUntilAction === 1 ? 'tomorrow'
    : `in ${daysUntilAction} days`

  return (
    <>
      {/* SKU header */}
      <div className="sku-detail-header">
        <span style={{ fontSize: '1.4rem' }}>{icon}</span>
        <span className="sku-detail-name" style={{ color: '#F1F5F9' }}>{row.sku}</span>
        <span className="sku-detail-store">@</span>
        <span className="sku-detail-name" style={{ color: '#F1F5F9' }}>{row.store}</span>
        <span
          className="tier-badge"
          style={{ color, borderColor: color, background: TIER_BG[tier] || '#1E293B', marginLeft: 8 }}
        >
          {tier}
        </span>
      </div>

      {/* Discount card */}
      <div className="discount-card" style={{ background: bg, borderLeftColor: color }}>
        <div className="discount-pct" style={{ color }}>
          {pct}% Discount
          <span className="discount-range">recommended range: {band}</span>
        </div>
        <div className="discount-reason">{reason}</div>
        {actDate && (
          <div style={{
            marginTop: 10,
            padding: '8px 12px',
            background: `${actionUrgencyColor}18`,
            border: `1px solid ${actionUrgencyColor}44`,
            borderRadius: 6,
            display: 'flex',
            flexDirection: 'column',
            gap: 3,
          }}>
            <div style={{ fontSize: '0.72rem', color: actionUrgencyColor, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 6 }}>
              ⏰ Action Required — {actionLabel}
            </div>
            <div style={{ fontSize: '0.75rem', color: '#E2E8F0' }}>
              Apply <strong style={{ color }}>{pct}% markdown</strong> to <strong>{row.sku}</strong> at <strong>{row.store}</strong> by <strong style={{ color: actionUrgencyColor }}>{actDate}</strong>
            </div>
            <div style={{ fontSize: '0.68rem', color: '#64748B', marginTop: 2 }}>
              {tier === 'Red'
                ? `Stock covers ${row.days_of_cover?.toFixed(0)} days but only ${daysUntilAction} days until action deadline. Delay risks ${row.stock_on_hand} unsold units at season end.`
                : `Sell-through at ${row.sell_through_pct?.toFixed(0)}% — early action prevents a deeper discount later.`}
            </div>
          </div>
        )}

        {/* Calculation breakdown */}
        {steps.length > 0 && (
          <div style={{ marginTop: 12 }}>
            <button
              onClick={() => setShowCalc(v => !v)}
              style={{
                background: 'none', border: `1px solid ${color}33`, borderRadius: 4,
                color: color, fontSize: '0.72rem', padding: '3px 10px',
                cursor: 'pointer', opacity: 0.85,
              }}
            >
              {showCalc ? 'Hide' : 'Show'} Calculation
            </button>

            {showCalc && (
              <div style={{
                marginTop: 8, padding: '10px 12px',
                background: 'rgba(0,0,0,0.3)', borderRadius: 6,
                borderLeft: `3px solid ${color}55`,
              }}>
                <div style={{ fontSize: '0.7rem', color: '#94A3B8', marginBottom: 6, fontWeight: 600, letterSpacing: '0.05em' }}>
                  HOW THIS DISCOUNT WAS CALCULATED
                </div>
                {steps.map((step, i) => (
                  <div key={i} style={{
                    fontFamily: 'monospace', fontSize: '0.72rem',
                    color: i === steps.length - 1 ? color : '#CBD5E1',
                    fontWeight: i === steps.length - 1 ? 700 : 400,
                    padding: '2px 0',
                    borderTop: i === steps.length - 1 ? `1px solid ${color}33` : 'none',
                    marginTop: i === steps.length - 1 ? 6 : 0,
                    paddingTop: i === steps.length - 1 ? 8 : 2,
                  }}>
                    {step}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Mini metrics */}
      <div className="metrics-row">
        {[
          { label: 'Stock on Hand',  value: `${row.stock_on_hand ?? '—'} units`             },
          { label: 'Daily Velocity', value: `${row.velocity_14d?.toFixed(1) ?? '—'} u/day`  },
          { label: 'Days of Cover',  value: row.days_of_cover != null ? `${row.days_of_cover.toFixed(0)} days` : 'N/A' },
          { label: 'Sell-Through',   value: `${row.sell_through_pct?.toFixed(1) ?? '—'}%`   },
        ].map(m => (
          <div key={m.label} className="metric-mini">
            <div className="metric-mini-value">{m.value}</div>
            <div className="metric-mini-label">{m.label}</div>
          </div>
        ))}
      </div>
    </>
  )
}
