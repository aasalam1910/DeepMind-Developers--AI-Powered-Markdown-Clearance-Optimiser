import { useState } from 'react'
import { exportSheet, detectFestivals } from '../api'

const TIER_OPTIONS = ['Red', 'Amber', 'Green']
const TIER_CLASS   = { Red: 'red', Amber: 'amber', Green: 'green' }

const MONTH_NAMES = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']

export default function Sidebar({
  onLoadSample, onUpload, onRecalculate, datesChanged, loading,
  recommendations, filters, setFilters,
  rationales, seasonDates, setSeasonDates,
  onShowPoster,
  festivals, setFestivals, onDetectFestivals, festivalDetecting, onApplyFestivals,
}) {
  const [posFile,   setPosFile]   = useState(null)
  const [invFile,   setInvFile]   = useState(null)
  const [exporting, setExporting] = useState(false)
  const [festRegion,  setFestRegion]  = useState('All India')
  const [festYear,    setFestYear]    = useState(new Date().getFullYear())
  const [festInput,   setFestInput]   = useState('')
  const [festLooking, setFestLooking] = useState(false)

  const stores     = recommendations ? [...new Set(recommendations.map(r => r.store))].sort() : []
  const categories = recommendations ? [...new Set(recommendations.map(r => r.category))].sort() : []
  const storeTierSets = recommendations
    ? Object.fromEntries(stores.map(s => {
        const recs = recommendations.filter(r => r.store === s)
        return [s, ['Red', 'Amber'].filter(t => recs.some(r => r.urgency_tier === t))]
      }))
    : {}

  const toggleFilter = (key, val) => {
    setFilters(prev => {
      const cur = prev[key]
      return { ...prev, [key]: cur.includes(val) ? cur.filter(v => v !== val) : [...cur, val] }
    })
  }

  const handleUpload = () => {
    if (posFile && invFile) onUpload(posFile, invFile)
  }

  const handleLookupFestival = async () => {
    if (!festInput.trim()) return
    setFestLooking(true)
    try {
      const data = await detectFestivals(festYear, festRegion, festInput.trim(), seasonDates)
      const newFests = (data.festivals || []).filter(
        f => !festivals.some(e => e.name.toLowerCase() === f.name.toLowerCase())
      )
      if (newFests.length) {
        setFestivals(prev => [...prev, ...newFests])
        setFestInput('')
      }
    } catch (e) { /* silent */ }
    finally { setFestLooking(false) }
  }

  const handleExport = async () => {
    if (!recommendations?.length) return
    setExporting(true)
    try { await exportSheet(recommendations, rationales) }
    catch (e) { alert(e.message) }
    finally { setExporting(false) }
  }

  // Season progress
  const start   = new Date(seasonDates.start)
  const end     = new Date(seasonDates.end)
  const today   = new Date()
  const total   = Math.max((end - start) / 864e5, 1)
  const elapsed = Math.max((today - start) / 864e5, 0)
  const remaining = Math.max(total - elapsed, 0)
  const pct = Math.min(elapsed / total, 1)

  return (
    <aside className="sidebar">
      {/* Logo */}
      <div className="sidebar-logo">
        <span style={{ fontSize: '1.6rem' }}>🏷️</span>
        <div>
          <div className="sidebar-logo-title">Markdown Optimiser</div>
          <div className="sidebar-logo-sub">Team 27 — Deep Mind Developers</div>
        </div>
      </div>

      {/* Data Input */}
      <div className="sidebar-section">
        <span className="sidebar-label">📂 Data Input</span>
        <label className={`file-label ${posFile ? 'has-file' : ''}`}>
          {posFile ? `✓ ${posFile.name}` : '+ POS Sales CSV'}
          <input type="file" accept=".csv" onChange={e => setPosFile(e.target.files[0])} />
        </label>
        <label className={`file-label ${invFile ? 'has-file' : ''}`}>
          {invFile ? `✓ ${invFile.name}` : '+ Inventory Snapshot CSV'}
          <input type="file" accept=".csv" onChange={e => setInvFile(e.target.files[0])} />
        </label>
        <button
          className="btn btn-ghost"
          style={{ marginBottom: 6 }}
          onClick={handleUpload}
          disabled={!posFile || !invFile || loading}
        >
          {loading ? 'Processing…' : '⬆ Upload & Analyse'}
        </button>
        <button
          className="btn btn-primary"
          onClick={onLoadSample}
          disabled={loading}
        >
          {loading ? 'Loading…' : '📊 Load Sample Data'}
        </button>
      </div>

      <hr className="sidebar-divider" />

      {/* Season Config */}
      <div className="sidebar-section">
        <span className="sidebar-label">⚙️ Season Config</span>
        <label style={{ fontSize: '0.76rem', color: 'var(--text-dim)', display: 'block', marginBottom: 3 }}>
          Season Start
        </label>
        <input
          type="date"
          value={seasonDates.start}
          onChange={e => setSeasonDates(p => ({ ...p, start: e.target.value }))}
        />
        <label style={{ fontSize: '0.76rem', color: 'var(--text-dim)', display: 'block', marginBottom: 3 }}>
          Season End
        </label>
        <input
          type="date"
          value={seasonDates.end}
          onChange={e => setSeasonDates(p => ({ ...p, end: e.target.value }))}
        />
        {datesChanged && (
          <button
            className="btn btn-primary"
            style={{ marginTop: 10, fontSize: '0.78rem' }}
            onClick={onRecalculate}
            disabled={loading}
          >
            {loading ? 'Recalculating…' : '🔄 Apply Season Dates'}
          </button>
        )}
      </div>

      {recommendations && (
        <>
          <hr className="sidebar-divider" />

          {/* Season Progress */}
          <div className="sidebar-section">
            <span className="sidebar-label">📅 Season Progress</span>
            <div className="progress-track">
              <div className="progress-fill" style={{ width: `${pct * 100}%` }} />
            </div>
            <div className="progress-meta">
              <span>{Math.round(elapsed)}d elapsed</span>
              <span>{Math.round(remaining)}d remaining</span>
            </div>
          </div>

          <hr className="sidebar-divider" />

          {/* Filters */}
          <div className="sidebar-section">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
              <span className="sidebar-label" style={{ margin: 0 }}>🔍 Filters</span>
              {(filters.store.length > 0 || filters.tier.length > 0 || filters.category.length > 0) && (
                <button
                  onClick={() => setFilters({ store: [], tier: [], category: [] })}
                  style={{ background: 'none', border: 'none', color: 'var(--accent)', fontSize: '0.72rem', cursor: 'pointer', padding: 0 }}
                >
                  Clear all
                </button>
              )}
            </div>

            <div style={{ fontSize: '0.74rem', color: 'var(--text-dim)', marginBottom: 4 }}>Urgency Tier</div>
            <div className="multi-select" style={{ marginBottom: 10 }}>
              {TIER_OPTIONS.map(t => (
                <button
                  key={t}
                  className={`chip ${filters.tier.includes(t) ? `active ${TIER_CLASS[t]}` : ''}`}
                  onClick={() => toggleFilter('tier', t)}
                >
                  {t}
                </button>
              ))}
            </div>

            <div style={{ fontSize: '0.74rem', color: 'var(--text-dim)', marginBottom: 4 }}>Store</div>
            <div className="multi-select" style={{ marginBottom: 10, flexDirection: 'column', alignItems: 'flex-start' }}>
              {stores.map(s => (
                <div key={s} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <button
                    className={`chip ${filters.store.includes(s) ? 'active' : ''}`}
                    onClick={() => toggleFilter('store', s)}
                  >
                    {s}
                  </button>
                  {onShowPoster && storeTierSets[s]?.map(t => (
                    <button
                      key={t}
                      type="button"
                      className={`sp-trigger-btn ${t.toLowerCase()}`}
                      onClick={(e) => { e.stopPropagation(); onShowPoster(s, t) }}
                      title={`View ${t} poster`}
                    >
                      🖼
                    </button>
                  ))}
                </div>
              ))}
            </div>

            <div style={{ fontSize: '0.74rem', color: 'var(--text-dim)', marginBottom: 4 }}>Category</div>
            <div className="multi-select">
              {categories.map(c => (
                <button
                  key={c}
                  className={`chip ${filters.category.includes(c) ? 'active' : ''}`}
                  onClick={() => toggleFilter('category', c)}
                >
                  {c}
                </button>
              ))}
            </div>
          </div>

          <hr className="sidebar-divider" />

          {/* Festival Boosts */}
          <div className="sidebar-section">
            <span className="sidebar-label">🎉 Festival Boosts</span>
            <div style={{ display: 'flex', gap: 4, marginBottom: 6 }}>
              <select
                value={festRegion}
                onChange={e => setFestRegion(e.target.value)}
                style={{ flex: 1, fontSize: '0.72rem', padding: '4px 6px', borderRadius: 6, border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text)' }}
              >
                <option>All India</option>
                <option>North India</option>
                <option>South India</option>
                <option>East India</option>
                <option>West India</option>
              </select>
              <input
                type="number"
                value={festYear}
                onChange={e => setFestYear(Number(e.target.value))}
                min={2024} max={2030}
                style={{ width: 60, fontSize: '0.72rem', padding: '4px 6px', borderRadius: 6, border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text)' }}
              />
            </div>
            <button
              className="btn btn-ghost"
              style={{ marginBottom: 8, fontSize: '0.73rem' }}
              onClick={() => onDetectFestivals(festYear, festRegion)}
              disabled={festivalDetecting || loading}
            >
              {festivalDetecting ? '🔍 Detecting…' : '🤖 Auto-detect Festivals'}
            </button>

            <div style={{ display: 'flex', gap: 4, marginBottom: 8 }}>
              <input
                type="text"
                placeholder="Type festival name…"
                value={festInput}
                onChange={e => setFestInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleLookupFestival()}
                style={{ flex: 1, fontSize: '0.72rem', padding: '5px 8px', borderRadius: 6, border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text)' }}
              />
              <button
                type="button"
                className="btn btn-primary"
                style={{ padding: '4px 10px', fontSize: '0.72rem', whiteSpace: 'nowrap' }}
                onClick={handleLookupFestival}
                disabled={festLooking || !festInput.trim()}
              >
                {festLooking ? '…' : '➕ Add'}
              </button>
            </div>

            {festivals.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 5, marginBottom: 8 }}>
                {festivals.map((fest, i) => (
                  <div key={i} className="fest-row">
                    <input
                      type="checkbox"
                      checked={fest.enabled}
                      onChange={() => setFestivals(prev => prev.map((f, j) => j === i ? { ...f, enabled: !f.enabled } : f))}
                      style={{ accentColor: 'var(--accent)', marginRight: 6 }}
                    />
                    <span className="fest-name">{fest.name}</span>
                    <span className="fest-month">{MONTH_NAMES[(fest.month || 1) - 1]} {fest.year}</span>
                    <button
                      type="button"
                      onClick={() => setFestivals(prev => prev.filter((_, j) => j !== i))}
                      style={{ background: 'none', border: 'none', color: '#888', cursor: 'pointer', fontSize: '0.7rem', padding: 0, marginLeft: 'auto' }}
                    >✕</button>
                  </div>
                ))}
              </div>
            )}

            {festivals.length > 0 && (
              <button
                className="btn btn-primary"
                style={{ fontSize: '0.75rem' }}
                onClick={onApplyFestivals}
                disabled={loading}
              >
                {loading ? 'Applying…' : '✅ Apply Festival Boosts'}
              </button>
            )}
          </div>

          <hr className="sidebar-divider" />

          {/* Export */}
          <div className="sidebar-section">
            <span className="sidebar-label">📥 Export</span>
            <button
              className="btn btn-outline"
              onClick={handleExport}
              disabled={exporting}
            >
              {exporting ? 'Exporting…' : '⬇ Download Action Sheet'}
            </button>
          </div>
        </>
      )}
    </aside>
  )
}
