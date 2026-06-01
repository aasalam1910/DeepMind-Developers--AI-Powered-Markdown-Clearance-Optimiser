import { useState } from 'react'
import { fetchRationale } from '../api'

const TIER_COLORS = { Red: '#EF4444', Amber: '#F59E0B', Green: '#10B981' }
const TIER_ICONS  = { Red: '🔴', Amber: '🟡', Green: '🟢' }

export default function RationalePanel({ row, rationales, setRationales }) {
  const [loading,  setLoading]  = useState(false)
  const [open,     setOpen]     = useState(false)
  const [error,    setError]    = useState(null)

  const tier  = row.urgency_tier
  const key   = `${row.sku}_${row.store}`
  const rd    = rationales[key]
  const color = TIER_COLORS[tier] || '#64748B'
  const icon  = TIER_ICONS[tier]  || '⚪'

  const handleGenerate = async () => {
    setLoading(true); setError(null)
    try {
      const result = await fetchRationale(row)
      setRationales(prev => ({ ...prev, [key]: result }))
      setOpen(true)
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  if (tier === 'Green') {
    return (
      <div className="green-notice">
        ✅ Green SKU — selling well, no markdown needed.
      </div>
    )
  }

  const confLabel = rd?.confidence?.split('\n')[0]?.slice(0, 60) ?? 'N/A'

  return (
    <div style={{ marginTop: 8 }}>
      {!rd ? (
        <>
          <button
            className="btn btn-primary"
            style={{ width: 'auto', paddingLeft: 20, paddingRight: 20 }}
            onClick={handleGenerate}
            disabled={loading}
          >
            {loading
              ? <><span className="spinner" style={{ width: 14, height: 14, borderWidth: 2, display: 'inline-block', verticalAlign: 'middle', marginRight: 8 }} />Generating…</>
              : `✨ Generate AI Rationale for ${row.sku} @ ${row.store}`}
          </button>
          {error && <div className="alert-error" style={{ marginTop: 8 }}>{error}</div>}
        </>
      ) : (
        <div className="rationale-expander">
          <button
            className={`rationale-toggle ${open ? 'open' : ''}`}
            onClick={() => setOpen(o => !o)}
          >
            <span>
              {icon}&nbsp;
              <strong style={{ color }}>AI Rationale</strong>
              &nbsp;— {row.sku} @ {row.store}
              &nbsp;·&nbsp;Confidence: {confLabel}
            </span>
            <span className="chevron" style={{ color: 'var(--text-dim)', fontSize: 12 }}>▼</span>
          </button>

          {open && (
            <div className="rationale-body">
              <div className="rat-col">
                <div>
                  <div className="rat-section-title">📊 Why This Discount</div>
                  <div className="rat-section-body">{rd.rationale_why || '—'}</div>
                </div>
                <div>
                  <div className="rat-section-title">✅ What Will Happen</div>
                  <div className="rat-section-body">{rd.rationale_outcome || '—'}</div>
                </div>
              </div>
              <div className="rat-col">
                <div>
                  <div className="rat-section-title">⚠️ If Not Applied</div>
                  <div className="rat-section-body">{rd.rationale_consequence || '—'}</div>
                </div>
                <div>
                  <div className="rat-section-title">🎯 Confidence</div>
                  <div className="rat-section-body">{rd.confidence || '—'}</div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
