import { useState, useEffect, useRef } from 'react'

const TIER_COLORS = { Red: '#EF4444', Amber: '#F59E0B', Green: '#10B981' }
const TIER_BG = { Red: '#2D1515', Amber: '#2D2010', Green: '#0F2D1E' }

const COLS = [
  { key: 'sku', label: 'SKU', bold: true },
  { key: 'store', label: 'Store', bold: true },
  { key: 'category', label: 'Category' },
  { key: 'urgency_tier', label: 'Tier' },
  { key: 'selling_price', label: 'Selling Price', num: true },
  { key: 'markdown_band', label: 'Band' },
  { key: 'markdown_pct', label: 'Discount %', num: true },
  { key: 'stock_on_hand', label: 'Stock', num: true },
  { key: 'velocity_14d', label: 'Vel/day', num: true },
  { key: 'days_of_cover', label: 'Days Cover', num: true },
  { key: 'sell_through_pct', label: 'Sell-Thru %', num: true },
]

function formatCellValue(value, isNumeric, colKey) {
  if (value == null || value === '') return '-'
  if (!isNumeric) return value

  const num = Number(value)
  if (!Number.isFinite(num)) return value

  if (colKey === 'days_of_cover') {
    if (num >= 365) return `${(num / 30).toFixed(0)}mo ⚠`
    if (num >= 90)  return `${Math.round(num)}d`
    return `${num.toFixed(1)}d`
  }

  return num.toFixed(1)
}

export default function SKUTable({ data, selectedRow, onSelect }) {
  const [sortKey, setSortKey] = useState('urgency_tier')
  const [sortDir, setSortDir] = useState('asc')
  const [search,  setSearch]  = useState('')
  const selectedRowRef = useRef(null)

  useEffect(() => {
    if (selectedRow && selectedRowRef.current) {
      selectedRowRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }
  }, [selectedRow])

  const availableCols = COLS.filter(
    (col) => col.key === 'urgency_tier' || data.some((row) => row?.[col.key] != null)
  )

  const handleSort = (key) => {
    if (sortKey === key) {
      setSortDir((dir) => (dir === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortKey(key)
      setSortDir('asc')
    }
  }

  const q = search.trim().toLowerCase()
  const filtered = q
    ? data.filter(r =>
        (r.sku      || '').toLowerCase().includes(q) ||
        (r.store    || '').toLowerCase().includes(q) ||
        (r.category || '').toLowerCase().includes(q)
      )
    : data

  const sorted = [...filtered].sort((a, b) => {
    let av = a[sortKey]
    let bv = b[sortKey]

    if (sortKey === 'urgency_tier') {
      const order = { Red: 0, Amber: 1, Green: 2 }
      av = order[av] ?? 9
      bv = order[bv] ?? 9
    }

    if (av == null) return 1
    if (bv == null) return -1
    if (typeof av === 'string') av = av.toLowerCase()
    if (typeof bv === 'string') bv = bv.toLowerCase()

    return sortDir === 'asc' ? (av > bv ? 1 : -1) : (av < bv ? 1 : -1)
  })

  const selectedKey = selectedRow ? `${selectedRow.sku}_${selectedRow.store}` : null

  return (
    <div className="table-outer">
      <div className="table-search-bar">
        <span className="table-search-icon">🔍</span>
        <input
          className="table-search-input"
          type="text"
          placeholder="Search by SKU, store or category…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          autoComplete="off"
          spellCheck={false}
        />
        {search && (
          <>
            <span className="table-search-count">
              {sorted.length} result{sorted.length !== 1 ? 's' : ''}
            </span>
            <button
              className="table-search-clear"
              onClick={() => setSearch('')}
              title="Clear search"
            >✕</button>
          </>
        )}
      </div>

      <div className="table-wrap">
      <table className="sku-table">
        <thead>
          <tr>
            {availableCols.map((col) => (
              <th
                key={col.key}
                onClick={() => handleSort(col.key)}
                className={sortKey === col.key ? 'sorted' : ''}
                style={{ textAlign: col.num ? 'right' : 'left' }}
              >
                {col.label}
                <span className="sort-icon">
                  {sortKey === col.key ? (sortDir === 'asc' ? ' ↑' : ' ↓') : ' ↕'}
                </span>
              </th>
            ))}
          </tr>
        </thead>

        <tbody>
          {sorted.map((row) => {
            const rowKey = `${row.sku}_${row.store}`
            const tier = row.urgency_tier
            const color = TIER_COLORS[tier] || '#94A3B8'
            const bg = TIER_BG[tier] || '#1E293B'

            return (
              <tr
                key={rowKey}
                ref={selectedKey === rowKey ? selectedRowRef : null}
                onClick={() => onSelect(row)}
                className={selectedKey === rowKey ? 'selected' : ''}
              >
                {availableCols.map((col) => {
                  if (col.key === 'urgency_tier') {
                    return (
                      <td key={col.key}>
                        <span
                          className="tier-badge"
                          style={{ color, borderColor: color, background: bg }}
                        >
                          {tier}
                        </span>
                        {row.festival_name && row.markdown_pct > 0 && (
                          <span className="festival-badge" title={`${row.festival_name} boost: ${row.festival_boost}x velocity — markdown reduced`}>
                            🎉 {row.festival_name}
                          </span>
                        )}
                      </td>
                    )
                  }

                  return (
                    <td
                      key={col.key}
                      className={col.bold ? 'bold' : ''}
                      style={{ textAlign: col.num ? 'right' : 'left' }}
                    >
                      {formatCellValue(row[col.key], col.num, col.key)}
                    </td>
                  )
                })}
              </tr>
            )
          })}
        </tbody>
      </table>
      </div>
    </div>
  )
}
