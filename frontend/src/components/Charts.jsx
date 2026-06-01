import {
  BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer,
  ScatterChart, Scatter, ZAxis, CartesianGrid,
} from 'recharts'

const TIER_COLORS = { Red: '#EF4444', Amber: '#F59E0B', Green: '#10B981' }
const CHART_STYLE = {
  background: '#161B27',
  fontSize: 11,
  fontFamily: 'Inter, sans-serif',
}
const AXIS_STYLE = { fill: '#64748B', fontSize: 11 }
const GRID_STYLE = { stroke: '#2A3045', strokeDasharray: '3 3' }

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null
  return (
    <div style={{
      background: '#1E2535', border: '1px solid #2A3045',
      borderRadius: 8, padding: '10px 14px', fontSize: 12,
    }}>
      {label && <div style={{ color: '#F1F5F9', fontWeight: 600, marginBottom: 6 }}>{label}</div>}
      {payload.map((p, i) => (
        <div key={i} style={{ color: p.color || '#94A3B8', marginBottom: 2 }}>
          {p.name}: <strong>{typeof p.value === 'number' ? p.value.toFixed(1) : p.value}</strong>
        </div>
      ))}
    </div>
  )
}

function BarChartCard({ recommendations }) {
  // Aggregate avg sell-through per store × tier
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
      <div className="chart-title">Avg Sell-Through Rate by Store</div>
      <ResponsiveContainer width="100%" height={240}>
        <BarChart data={data} style={CHART_STYLE} margin={{ top: 4, right: 8, left: -10, bottom: 0 }}>
          <CartesianGrid {...GRID_STYLE} />
          <XAxis dataKey="store" tick={AXIS_STYLE} axisLine={false} tickLine={false} />
          <YAxis tick={AXIS_STYLE} axisLine={false} tickLine={false} unit="%" />
          <Tooltip content={<CustomTooltip />} cursor={{ fill: '#ffffff08' }} />
          <Legend wrapperStyle={{ fontSize: 11, color: '#94A3B8' }} />
          {['Red','Amber','Green'].map(t => (
            <Bar key={t} dataKey={t} fill={TIER_COLORS[t]} radius={[3,3,0,0]} maxBarSize={24} />
          ))}
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}

function ScatterCard({ recommendations }) {
  const byTier = { Red: [], Amber: [], Green: [] }
  for (const r of recommendations) {
    if (r.days_of_cover != null && r.velocity_14d != null) {
      byTier[r.urgency_tier]?.push({
        x: +r.velocity_14d.toFixed(2),
        y: +r.days_of_cover.toFixed(1),
        z: r.stock_on_hand,
        sku: r.sku,
        store: r.store,
      })
    }
  }

  return (
    <div className="chart-card">
      <div className="chart-title">Days of Cover vs Velocity</div>
      <ResponsiveContainer width="100%" height={240}>
        <ScatterChart style={CHART_STYLE} margin={{ top: 4, right: 8, left: -10, bottom: 0 }}>
          <CartesianGrid {...GRID_STYLE} />
          <XAxis dataKey="x" name="Velocity/day" tick={AXIS_STYLE} axisLine={false} tickLine={false} label={{ value: 'Velocity (u/day)', position: 'insideBottom', offset: -2, fill: '#64748B', fontSize: 10 }} />
          <YAxis dataKey="y" name="Days Cover" tick={AXIS_STYLE} axisLine={false} tickLine={false} />
          <ZAxis dataKey="z" range={[40, 400]} />
          <Tooltip
            cursor={{ strokeDasharray: '3 3', stroke: '#2A3045' }}
            content={({ active, payload }) => {
              if (!active || !payload?.length) return null
              const d = payload[0].payload
              return (
                <div style={{ background: '#1E2535', border: '1px solid #2A3045', borderRadius: 8, padding: '10px 14px', fontSize: 12 }}>
                  <div style={{ color: '#F1F5F9', fontWeight: 600, marginBottom: 4 }}>{d.sku} @ {d.store}</div>
                  <div style={{ color: '#94A3B8' }}>Velocity: <strong>{d.x}</strong> u/day</div>
                  <div style={{ color: '#94A3B8' }}>Days Cover: <strong>{d.y}</strong></div>
                  <div style={{ color: '#94A3B8' }}>Stock: <strong>{d.z}</strong></div>
                </div>
              )
            }}
          />
          <Legend wrapperStyle={{ fontSize: 11, color: '#94A3B8' }} />
          {['Red','Amber','Green'].map(t => (
            <Scatter key={t} name={t} data={byTier[t]} fill={TIER_COLORS[t]} fillOpacity={0.8} />
          ))}
        </ScatterChart>
      </ResponsiveContainer>
    </div>
  )
}

export default function Charts({ recommendations }) {
  return (
    <div className="charts-row">
      <BarChartCard recommendations={recommendations} />
      <ScatterCard  recommendations={recommendations} />
    </div>
  )
}
