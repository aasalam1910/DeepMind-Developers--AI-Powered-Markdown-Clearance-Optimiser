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

  const boostedRecs = recommendations.filter(r => r.festival_name && r.markdown_pct > 0)
  const boostedCount = boostedRecs.length
  const festNames = [...new Set(boostedRecs.map(r => r.festival_name).filter(Boolean).flatMap(n => n.split(' + ')))]

  return (
    <>
      <div className="kpi-grid">
        {CARDS.map(({ key, label, color }) => (
          <div key={key} className="kpi-card" style={{ borderTopColor: color }}>
            <div className="kpi-value" style={{ color }}>{counts[key]}</div>
            <div className="kpi-label">{label}</div>
          </div>
        ))}
      </div>
      {boostedCount > 0 && (
        <div className="festival-impact-bar">
          <span className="festival-impact-icon">🎉</span>
          <div className="festival-impact-text">
            <strong>{festNames.join(' + ')}</strong> boost active —
            <strong> {boostedCount} SKUs</strong> received reduced markdowns
          </div>
          <div className="festival-impact-stat">
            avg boost {(boostedRecs.reduce((s, r) => s + (r.festival_boost || 1), 0) / boostedCount).toFixed(1)}x velocity
          </div>
        </div>
      )}
    </>
  )
}
