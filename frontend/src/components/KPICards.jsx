const CARDS = [
  { key: 'Red',   label: 'CRITICAL — RED',    sub: 'Immediate Action Required', icon: '!',  iconClass: 'red',    valueClass: 'red',    stroke: '#EF4444' },
  { key: 'Amber', label: 'AT RISK — AMBER',   sub: 'Monitor Closely',            icon: '⚠',  iconClass: 'amber',  valueClass: 'amber',  stroke: '#F59E0B' },
  { key: 'Green', label: 'ON TRACK — GREEN',  sub: 'Performing Well',            icon: '✓',  iconClass: 'green',  valueClass: 'green',  stroke: '#10B981' },
  { key: 'Total', label: 'TOTAL SKU × STORE', sub: 'Across All Locations',       icon: '◫',  iconClass: 'indigo', valueClass: 'indigo', stroke: '#6366F1' },
]

function Spark({ stroke }) {
  const id = `g-${stroke.replace('#','')}`
  const fillId = `f-${stroke.replace('#','')}`
  const path = "M0,22 Q8,16 16,18 T32,14 T48,16 T64,10 T80,12 T96,6"
  const fillPath = `${path} L96,28 L0,28 Z`
  return (
    <svg className="kpi-spark" viewBox="0 0 96 28" preserveAspectRatio="none">
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%"  stopColor={stroke} stopOpacity="0.4" />
          <stop offset="100%" stopColor={stroke} stopOpacity="1" />
        </linearGradient>
        <linearGradient id={fillId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"  stopColor={stroke} stopOpacity="0.18" />
          <stop offset="100%" stopColor={stroke} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={fillPath} fill={`url(#${fillId})`} />
      <path d={path} fill="none" stroke={`url(#${id})`} strokeWidth="2" strokeLinecap="round" />
    </svg>
  )
}

export default function KPICards({ recommendations }) {
  const counts = {
    Red:   recommendations.filter(r => r.urgency_tier === 'Red').length,
    Amber: recommendations.filter(r => r.urgency_tier === 'Amber').length,
    Green: recommendations.filter(r => r.urgency_tier === 'Green').length,
    Total: recommendations.length,
  }

  return (
    <div className="kpi-grid">
      {CARDS.map(({ key, label, sub, icon, iconClass, valueClass, stroke }) => (
        <div key={key} className="kpi-card">
          <div className="kpi-top">
            <div className={`kpi-icon ${iconClass}`}>{icon}</div>
            <Spark stroke={stroke} />
          </div>
          <div className={`kpi-value ${valueClass}`}>{counts[key]}</div>
          <div className={`kpi-label ${valueClass}`}>{label}</div>
          <div className="kpi-sub">{sub}</div>
        </div>
      ))}
    </div>
  )
}
