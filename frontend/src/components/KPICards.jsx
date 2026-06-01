const CARDS = [
  { key: 'Red',   label: 'Critical — Red',    color: '#EF4444' },
  { key: 'Amber', label: 'At Risk — Amber',   color: '#F59E0B' },
  { key: 'Green', label: 'On Track — Green',  color: '#10B981' },
  { key: 'Total', label: 'Total SKU × Store', color: '#6366F1' },
]

export default function KPICards({ recommendations }) {
  const counts = {
    Red:   recommendations.filter(r => r.urgency_tier === 'Red').length,
    Amber: recommendations.filter(r => r.urgency_tier === 'Amber').length,
    Green: recommendations.filter(r => r.urgency_tier === 'Green').length,
    Total: recommendations.length,
  }

  return (
    <div className="kpi-grid">
      {CARDS.map(({ key, label, color }) => (
        <div key={key} className="kpi-card" style={{ borderTopColor: color }}>
          <div className="kpi-value" style={{ color }}>{counts[key]}</div>
          <div className="kpi-label">{label}</div>
        </div>
      ))}
    </div>
  )
}
