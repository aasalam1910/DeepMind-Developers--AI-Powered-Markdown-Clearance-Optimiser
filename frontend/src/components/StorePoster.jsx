import { useState } from 'react'

const CONFIG = {
  Red: {
    ribbon:          'CLEARANCE',
    icon:            '👗',
    heroBg:          '#f5e6d8',
    heroPattern:     'radial-gradient(circle, #d4a898 1px, transparent 1px)',
    heroPatternSize: '20px 20px',
    accentColor:     '#C0392B',
    boxBg:           '#C0392B',
    bodyBg:          '#fdf8f5',
    headlineWords:   () => ['Season-End', 'Clearance', 'Sale'],
    discLabel:       'FLAT DISCOUNT',
    discTagline:     '🔥 Stock running out FAST — Grab yours now!',
    copy: (skus, cats) =>
      `Unbeatable deals on {${skus}} SKUs across {${cats}} categories. Limited inventory. First come, first served. Don't wait — this offer ends soon!`,
  },
  Amber: {
    ribbon:          'LIMITED OFFER',
    icon:            '🛍️',
    heroBg:          '#ffd54f',
    heroPattern:     'repeating-linear-gradient(45deg, rgba(255,255,255,0.3) 0px, rgba(255,255,255,0.3) 10px, transparent 10px, transparent 20px)',
    heroPatternSize: 'auto',
    accentColor:     '#d97706',
    boxBg:           'linear-gradient(135deg, #d97706 0%, #f59e0b 100%)',
    bodyBg:          '#fffde7',
    headlineWords:   () => ['Special', 'Savings', 'Offer'],
    discLabel:       'EXCLUSIVE DISCOUNT',
    discTagline:     '⚡ Limited time — act before it\'s too late!',
    copy: (skus, cats) =>
      `Save big on {${skus}} handpicked SKUs across {${cats}} categories. Quality products at unbeatable prices. Offer valid while stocks last!`,
  },
}

function CopyWithHighlights({ text, color }) {
  const parts = text.split(/\{([^}]+)\}/)
  return (
    <span>
      {parts.map((part, i) =>
        i % 2 === 1
          ? <strong key={i} style={{ color }}>{part}</strong>
          : <span key={i}>{part}</span>
      )}
    </span>
  )
}

const TIER_COLOR = { Red: '#C0392B', Amber: '#d97706', Green: '#10b981' }

function DetailPanel({ type, baseRecs, accentColor, actLabel }) {
  if (type === 'skus') {
    const rows = [...baseRecs]
      .sort((a, b) => (b.markdown_pct || 0) - (a.markdown_pct || 0))
      .slice(0, 20)
    return (
      <div className="sp2-detail">
        <div className="sp2-detail-title">SKUs on Discount</div>
        <div className="sp2-detail-scroll">
          {rows.map((r, i) => (
            <div key={i} className="sp2-detail-row">
              <span className="sp2-detail-sku">{r.sku}</span>
              <span className="sp2-detail-badge" style={{ color: TIER_COLOR[r.urgency_tier] || accentColor }}>
                {r.urgency_tier}
              </span>
              <span className="sp2-detail-pct" style={{ color: accentColor }}>
                {Math.round(r.markdown_pct || 0)}% OFF
              </span>
            </div>
          ))}
          {baseRecs.length > 20 && (
            <div className="sp2-detail-more">+{baseRecs.length - 20} more SKUs</div>
          )}
        </div>
      </div>
    )
  }

  if (type === 'actby') {
    const sorted = [...baseRecs]
      .filter(r => r.action_by_date)
      .sort((a, b) => a.action_by_date.localeCompare(b.action_by_date))
      .slice(0, 12)
    return (
      <div className="sp2-detail">
        <div className="sp2-detail-title">Action Dates by SKU</div>
        <div className="sp2-detail-scroll">
          {sorted.map((r, i) => {
            const days = Math.ceil((new Date(r.action_by_date) - new Date()) / 86400000)
            return (
              <div key={i} className="sp2-detail-row">
                <span className="sp2-detail-sku">{r.sku}</span>
                <span className="sp2-detail-pct" style={{ color: days <= 3 ? '#C0392B' : accentColor }}>
                  {days <= 0 ? 'Today!' : `${days}d left`}
                </span>
                <span className="sp2-detail-date">{r.action_by_date}</span>
              </div>
            )
          })}
        </div>
      </div>
    )
  }

  if (type === 'cats') {
    const catMap = {}
    baseRecs.forEach(r => {
      const cat = r.category || 'Unknown'
      if (!catMap[cat]) catMap[cat] = { total: 0, pctSum: 0, skus: 0 }
      catMap[cat].pctSum += r.markdown_pct || 0
      catMap[cat].skus   += 1
    })
    return (
      <div className="sp2-detail">
        <div className="sp2-detail-title">Discount by Category</div>
        <div className="sp2-detail-scroll">
          {Object.entries(catMap)
            .sort((a, b) => b[1].pctSum / b[1].skus - a[1].pctSum / a[1].skus)
            .map(([cat, { pctSum, skus }], i) => (
              <div key={i} className="sp2-detail-row">
                <span className="sp2-detail-sku">{cat}</span>
                <span style={{ fontSize: '0.62rem', color: '#888' }}>{skus} SKUs</span>
                <span className="sp2-detail-pct" style={{ color: accentColor }}>
                  avg {Math.round(pctSum / skus)}% OFF
                </span>
              </div>
            ))}
        </div>
      </div>
    )
  }

  return null
}

export default function StorePoster({ store, tier, recommendations, onClose }) {
  const [activeDetail, setActiveDetail] = useState(null)

  const allRecs   = recommendations.filter(r => r.store === store)
  const storeRecs = tier
    ? allRecs.filter(r => r.urgency_tier === tier)
    : allRecs.filter(r => r.urgency_tier === 'Red' || r.urgency_tier === 'Amber')
  const baseRecs  = storeRecs.length > 0 ? storeRecs : allRecs

  if (baseRecs.length === 0) {
    return (
      <div className="sp2-card" style={{ background: '#fdf8f5' }}>
        <div className="sp2-body" style={{ textAlign: 'center', padding: '32px 20px' }}>
          <button type="button" className="sp2-close" onClick={onClose}>✕</button>
          <div style={{ fontSize: '2rem', marginBottom: 12 }}>🏪</div>
          <div style={{ fontFamily: "'Montserrat', sans-serif", fontWeight: 700, fontSize: '0.9rem', color: '#333', marginBottom: 8 }}>
            {store}
          </div>
          <div style={{ fontFamily: "'Montserrat', sans-serif", fontSize: '0.72rem', color: '#999' }}>
            No data available for this store.
          </div>
        </div>
      </div>
    )
  }

  const derivedTier = tier || (baseRecs.some(r => r.urgency_tier === 'Red') ? 'Red' : 'Amber')
  const cfg      = CONFIG[derivedTier]
  const avgPct   = Math.round(
    baseRecs.reduce((s, r) => s + (r.markdown_pct || 0), 0) / (baseRecs.length || 1)
  ) || 0
  const skuCount  = baseRecs.length
  const catCount  = new Set(baseRecs.map(r => r.category).filter(Boolean)).size
  const actBy     = baseRecs.map(r => r.action_by_date).filter(Boolean).sort()[0] ?? null
  const daysUntil = actBy ? Math.ceil((new Date(actBy) - new Date()) / 86400000) : null
  const actLabel  = daysUntil == null ? '—' : daysUntil <= 0 ? 'TODAY' : `${daysUntil}d`

  const [w1, w2, w3] = cfg.headlineWords()

  const toggleDetail = (key) => setActiveDetail(prev => prev === key ? null : key)

  return (
    <div className="sp2-card store-poster-print" style={{ background: cfg.bodyBg }}>

      {/* Hero */}
      <div className="sp2-hero" style={{ background: cfg.heroBg }}>
        <div className="sp2-hero-pattern" style={{
          backgroundImage: cfg.heroPattern,
          backgroundSize:  cfg.heroPatternSize,
        }} />
        <span className="sp2-icon">{cfg.icon}</span>
        <div className="sp2-ribbon" style={{ background: cfg.accentColor }}>{cfg.ribbon}</div>
      </div>

      {/* Body */}
      <div className="sp2-body">
        <button type="button" className="sp2-close" onClick={onClose}>✕</button>

        <div className="sp2-brand" style={{ color: cfg.accentColor }}>— {store} —</div>

        <div className="sp2-headline">
          {w1} <span style={{ color: cfg.accentColor, fontStyle: 'italic' }}>{w2}</span> {w3}
        </div>

        <div className="sp2-subline">
          "{derivedTier === 'Red'
            ? 'Everything must go — before the season ends!'
            : 'Fresh deals, real value — while stocks last!'}"
        </div>

        <div className="sp2-sep" style={{ background: `linear-gradient(90deg, ${cfg.accentColor}, transparent)` }} />

        {/* Discount box */}
        <div className="sp2-disc-box" style={{ background: cfg.boxBg }}>
          <div className="sp2-disc-label">{cfg.discLabel}</div>
          <div className="sp2-disc-row">
            <span className="sp2-disc-num">{avgPct}</span>
            <span className="sp2-disc-off">% OFF</span>
          </div>
          <div className="sp2-disc-tagline">{cfg.discTagline}</div>
        </div>

        {/* Copy */}
        <p className="sp2-copy">
          <CopyWithHighlights text={cfg.copy(skuCount, catCount)} color={cfg.accentColor} />
        </p>

        {/* Clickable stat pills */}
        <div className="sp2-stats">
          {[
            { key: 'skus',   value: skuCount, label: 'SKUs' },
            { key: 'actby',  value: actLabel, label: 'Act By' },
            { key: 'cats',   value: catCount || '—', label: 'Categories' },
          ].map(({ key, value, label }) => (
            <button
              key={key}
              type="button"
              className={`sp2-stat ${activeDetail === key ? 'sp2-stat-active' : ''}`}
              style={{
                borderColor:     cfg.accentColor,
                backgroundColor: activeDetail === key ? cfg.accentColor : 'rgba(255,255,255,0.5)',
                cursor: 'pointer',
              }}
              onClick={() => toggleDetail(key)}
              title={`Click to see ${label} details`}
            >
              <span
                className="sp2-stat-n"
                style={{ color: activeDetail === key ? '#fff' : cfg.accentColor }}
              >
                {value}
              </span>
              <span
                className="sp2-stat-l"
                style={{ color: activeDetail === key ? 'rgba(255,255,255,0.8)' : '#999' }}
              >
                {label} ▾
              </span>
            </button>
          ))}
        </div>

        {/* Detail panel */}
        {activeDetail && (
          <DetailPanel
            type={activeDetail}
            baseRecs={baseRecs}
            accentColor={cfg.accentColor}
            actLabel={actLabel}
          />
        )}

        <button type="button" className="sp2-print" onClick={() => window.print()}>
          🖨 &nbsp;PRINT POSTER
        </button>
      </div>
    </div>
  )
}
