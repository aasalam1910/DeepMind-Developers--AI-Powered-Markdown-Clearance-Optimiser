import {
  BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer,
  CartesianGrid, ReferenceLine,
} from 'recharts'

const TIER_COLORS = { Red: '#EF4444', Amber: '#F59E0B', Green: '#10B981' }
const CHART_STYLE = { fontSize: 11, fontFamily: 'Inter, sans-serif' }
const AXIS_STYLE  = { fill: '#94A3B8', fontSize: 11 }
const GRID_STYLE  = { stroke: '#E5E7EB', strokeDasharray: '3 3' }

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null
  return (
    <div style={{
      background: '#0F172A', border: '1px solid #1E293B',
      borderRadius: 10, padding: '10px 14px', fontSize: 12,
      boxShadow: '0 10px 30px rgba(15,23,42,0.18)',
    }}>
      {label && <div style={{ color: '#F8FAFC', fontWeight: 700, marginBottom: 6 }}>{label}</div>}
      {payload.map((p, i) => (
        <div key={i} style={{ color: p.color || '#CBD5E1', marginBottom: 2 }}>
          {p.name}: <strong>{typeof p.value === 'number' ? p.value.toFixed(1) : p.value}</strong>
        </div>
      ))}
    </div>
  )
}

function BarChartCard({ recommendations }) {
  const agg = {}
  for (const r of recommendations) {
    const k = r.store
    if (!agg[k]) agg[k] = { store: k, Red: [], Amber: [], Green: [] }
    if (agg[k][r.urgency_tier]) agg[k][r.urgency_tier].push(r.sell_through_pct)
  }
  const data = Object.values(agg).map(d => ({
    store: d.store,
    Red:   d.Red.length   ? +(d.Red.reduce((a,b)=>a+b,0)   / d.Red.length).toFixed(1)   : null,
    Amber: d.Amber.length ? +(d.Amber.reduce((a,b)=>a+b,0) / d.Amber.length).toFixed(1) : null,
    Green: d.Green.length ? +(d.Green.reduce((a,b)=>a+b,0) / d.Green.length).toFixed(1) : null,
  }))

  return (
    <div className="chart-card">
      <div className="chart-title"><span style={{ color: '#6366F1', fontWeight: 700 }}>📊</span> Avg Sell-Through Rate by Store</div>
      <ResponsiveContainer width="100%" height={240}>
        <BarChart data={data} style={CHART_STYLE} margin={{ top: 4, right: 8, left: -10, bottom: 0 }}>
          <CartesianGrid {...GRID_STYLE} />
          <XAxis dataKey="store" tick={AXIS_STYLE} axisLine={false} tickLine={false} />
          <YAxis tick={AXIS_STYLE} axisLine={false} tickLine={false} unit="%" />
          <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(99,102,241,0.06)' }} />
          <Legend wrapperStyle={{ fontSize: 11, color: '#475569' }} />
          {['Red','Amber','Green'].map(t => (
            <Bar key={t} dataKey={t} fill={TIER_COLORS[t]} radius={[3,3,0,0]} maxBarSize={24} />
          ))}
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}

function CoverageRiskCard({ recommendations }) {
  // Bucket days_of_cover into readable ranges, count SKUs per bucket per tier
  const BUCKETS = [
    { label: '0–30d',   min: 0,   max: 30   },
    { label: '30–90d',  min: 30,  max: 90   },
    { label: '90–180d', min: 90,  max: 180  },
    { label: '180–365d',min: 180, max: 365  },
    { label: '365d+',   min: 365, max: Infinity },
  ]

  const data = BUCKETS.map(b => {
    const row = { label: b.label, Red: 0, Amber: 0, Green: 0 }
    for (const r of recommendations) {
      const doc = r.days_of_cover
      if (doc == null) continue
      if (doc >= b.min && doc < b.max) row[r.urgency_tier]++
    }
    return row
  })

  // Season days remaining for reference line
  const seasonDaysRemaining = Math.max(
    0,
    Math.round((new Date('2026-06-30') - new Date()) / 86_400_000)
  )

  // Find which bucket the season end falls in for a reference label
  const refBucket = BUCKETS.findIndex(
    b => seasonDaysRemaining >= b.min && seasonDaysRemaining < b.max
  )
  const refLabel = refBucket >= 0 ? BUCKETS[refBucket].label : null

  return (
    <div className="chart-card">
      <div className="chart-title">
        <span style={{ color: '#6366F1', fontWeight: 700 }}>📦</span>
        Stock Coverage Distribution
        <span style={{ fontSize: '0.68rem', color: '#94A3B8', fontWeight: 500, marginLeft: 8, textTransform: 'none', letterSpacing: 0 }}>
          SKUs by days-of-cover range
        </span>
      </div>
      <ResponsiveContainer width="100%" height={240}>
        <BarChart data={data} style={CHART_STYLE} margin={{ top: 4, right: 8, left: -10, bottom: 0 }}>
          <CartesianGrid {...GRID_STYLE} />
          <XAxis dataKey="label" tick={AXIS_STYLE} axisLine={false} tickLine={false} />
          <YAxis tick={AXIS_STYLE} axisLine={false} tickLine={false} allowDecimals={false} />
          <Tooltip
            content={({ active, payload, label }) => {
              if (!active || !payload?.length) return null
              const total = payload.reduce((s, p) => s + (p.value || 0), 0)
              return (
                <div style={{ background: '#0F172A', border: '1px solid #1E293B', borderRadius: 10, padding: '10px 14px', fontSize: 12, boxShadow: '0 10px 30px rgba(15,23,42,0.18)' }}>
                  <div style={{ color: '#F8FAFC', fontWeight: 700, marginBottom: 6 }}>{label} coverage</div>
                  {payload.map((p, i) => (
                    <div key={i} style={{ color: p.fill, marginBottom: 2 }}>
                      {p.name}: <strong>{p.value} SKUs</strong>
                    </div>
                  ))}
                  <div style={{ color: '#94A3B8', marginTop: 4, borderTop: '1px solid #1E293B', paddingTop: 4 }}>
                    Total: <strong style={{ color: '#F8FAFC' }}>{total}</strong>
                  </div>
                </div>
              )
            }}
            cursor={{ fill: 'rgba(99,102,241,0.06)' }}
          />
          <Legend wrapperStyle={{ fontSize: 11, color: '#475569' }} />
          {['Red','Amber','Green'].map(t => (
            <Bar key={t} dataKey={t} name={t} stackId="a" fill={TIER_COLORS[t]} maxBarSize={52} />
          ))}
          {refLabel && (
            <ReferenceLine
              x={refLabel}
              stroke="#6366F1"
              strokeDasharray="5 3"
              strokeWidth={2}
              label={{ value: `Season ends ~here`, position: 'top', fill: '#6366F1', fontSize: 10 }}
            />
          )}
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}

export default function Charts({ recommendations }) {
  return (
    <div className="charts-row">
      <BarChartCard      recommendations={recommendations} />
      <CoverageRiskCard  recommendations={recommendations} />
    </div>
  )
}
