import { useMemo } from 'react'

const TIER_COLORS = { Red: '#EF4444', Amber: '#F59E0B', Green: '#10B981' }
const TIER_BG     = { Red: '#3D1515', Amber: '#3D2800', Green: '#0D3320' }

function buildMatrix(recommendations) {
  const storeSet = new Set()
  const catSet   = new Set()

  for (const r of recommendations) {
    storeSet.add(r.store)
    catSet.add(r.category || 'Unknown')
  }

  // Sort stores by numeric suffix (MUM-1 < DEL-2 < BLR-3 …)
  const storeNum = s => parseInt(s.split('-').pop(), 10) || 0
  const stores = [...storeSet].sort((a, b) => storeNum(a) - storeNum(b))

  const data = {}
  for (const cat of catSet) {
    data[cat] = {}
    for (const store of stores) {
      data[cat][store] = { red: 0, amber: 0, green: 0, total: 0, skus: 0, markdownSum: 0 }
    }
  }

  for (const r of recommendations) {
    const cat   = r.category || 'Unknown'
    const store = r.store
    const tier  = (r.urgency_tier || 'Green').toLowerCase()
    const cell  = data[cat]?.[store]
    if (!cell) continue
    const stock = Number(r.stock_on_hand) || 0
    cell[tier]       += stock
    cell.total       += stock
    cell.skus        += 1
    cell.markdownSum += Number(r.markdown_pct) || 0
  }

  // Sort categories by at-risk stock descending (most urgent first)
  const categories = [...catSet].sort((a, b) => {
    const riskA = stores.reduce((s, st) => s + (data[a][st]?.red || 0) + (data[a][st]?.amber || 0), 0)
    const riskB = stores.reduce((s, st) => s + (data[b][st]?.red || 0) + (data[b][st]?.amber || 0), 0)
    return riskB - riskA
  })

  return { data, stores, categories }
}

function Cell({ cell, storeLabel }) {
  if (!cell || cell.skus === 0) {
    return (
      <div style={{
        background: '#0F1117',
        border: '1px solid #1d2940',
        borderRadius: 6,
        height: 84,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}>
        <span style={{ color: '#374151', fontSize: 11 }}>-</span>
      </div>
    )
  }

  const { red, amber, green, total, skus, markdownSum } = cell
  const dominant  = red >= amber && red >= green ? 'Red' : amber >= green ? 'Amber' : 'Green'
  const color     = TIER_COLORS[dominant]
  const bg        = TIER_BG[dominant]
  const riskPct   = total > 0 ? ((red + amber) / total * 100).toFixed(0) : 0
  const avgMd     = skus > 0 ? (markdownSum / skus).toFixed(0) : 0
  const redPct    = total > 0 ? red / total * 100 : 0
  const amberPct  = total > 0 ? amber / total * 100 : 0
  const greenPct  = total > 0 ? green / total * 100 : 0

  return (
    <div
      title={`${storeLabel || ''} | ${skus} SKUs | ${total.toLocaleString()} units | At-risk: ${riskPct}% | Avg markdown: ${avgMd}%`}
      style={{
        background: bg,
        border: `1px solid ${color}`,
        borderRadius: 6,
        padding: '8px 10px',
        height: 84,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        transition: 'background 0.35s, border-color 0.35s',
      }}
    >
      <div style={{ fontSize: 12, fontWeight: 700, color }}>
        {skus} SKU{skus !== 1 ? 's' : ''}
      </div>
      <div style={{ fontSize: 10, color: '#94A3B8' }}>
        {total.toLocaleString()} units
      </div>
      <div style={{ display: 'flex', height: 5, borderRadius: 3, overflow: 'hidden', gap: 1 }}>
        {redPct   > 0 && <div style={{ flex: redPct,   background: TIER_COLORS.Red   }} />}
        {amberPct > 0 && <div style={{ flex: amberPct, background: TIER_COLORS.Amber }} />}
        {greenPct > 0 && <div style={{ flex: greenPct, background: TIER_COLORS.Green }} />}
      </div>
      <div style={{ fontSize: 9, color: '#64748B' }}>
        {avgMd}% avg markdown
      </div>
    </div>
  )
}

export default function TreemapChart({ recommendations, totalCount }) {
  const { data, stores, categories } = useMemo(
    () => buildMatrix(recommendations),
    [recommendations]
  )

  const isFiltered = totalCount && recommendations.length < totalCount

  return (
    <div className="risk-heatmap-card">
      <div className="risk-heatmap-title-wrap">
        <div className="risk-heatmap-title">
          Inventory Risk Heatmap - Store x Category
          {isFiltered && (
            <span style={{
              marginLeft: 10,
              fontSize: '0.7rem',
              fontWeight: 500,
              color: '#F59E0B',
              background: 'rgba(245,158,11,0.12)',
              border: '1px solid rgba(245,158,11,0.3)',
              borderRadius: 4,
              padding: '2px 7px',
              verticalAlign: 'middle',
            }}>
              Filtered: {recommendations.length} / {totalCount} SKUs
            </span>
          )}
        </div>
        <div style={{ display: 'flex', gap: 14, fontSize: '0.72rem', alignItems: 'center' }}>
          {['Red', 'Amber', 'Green'].map(t => (
            <span key={t} style={{ color: TIER_COLORS[t] }}>
              {t}
            </span>
          ))}
        </div>
      </div>

      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: '6px', minWidth: 400 }}>
          <thead>
            <tr>
              <th style={{
                textAlign: 'left', fontSize: 11, color: '#64748B',
                fontWeight: 500, paddingBottom: 6, width: 110,
              }}>
                Category
              </th>
              {stores.map((store, i) => (
                <th key={store} title={store} style={{
                  textAlign: 'center', fontSize: 11, color: '#94A3B8',
                  fontWeight: 600, paddingBottom: 6,
                }}>
                  Store {i + 1}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {categories.map(cat => (
              <tr key={cat}>
                <td style={{
                  fontSize: 12, color: '#E2E8F0', fontWeight: 600,
                  paddingRight: 8, whiteSpace: 'nowrap', verticalAlign: 'middle',
                }}>
                  {cat}
                </td>
                {stores.map((store, i) => (
                  <td key={store} style={{ verticalAlign: 'top', minWidth: 130 }}>
                    <Cell cell={data[cat][store]} storeLabel={`Store ${i + 1} (${store})`} />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
