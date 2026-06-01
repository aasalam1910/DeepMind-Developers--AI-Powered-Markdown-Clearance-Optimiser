import { useState } from 'react'
import { exportSheet } from '../api'

const TIER_OPTIONS = ['Red', 'Amber', 'Green']
const TIER_CLASS   = { Red: 'red', Amber: 'amber', Green: 'green' }

export default function Sidebar({
  onLoadSample, onUpload, onRecalculate, datesChanged, loading,
  recommendations, filters, setFilters,
  rationales, seasonDates, setSeasonDates,
}) {
  const [posFile, setPosFile] = useState(null)
  const [invFile, setInvFile] = useState(null)
  const [exporting, setExporting] = useState(false)

  const stores     = recommendations ? [...new Set(recommendations.map(r => r.store))].sort() : []
  const categories = recommendations ? [...new Set(recommendations.map(r => r.category))].sort() : []

  const toggleFilter = (key, val) => {
    setFilters(prev => {
      const cur = prev[key]
      return { ...prev, [key]: cur.includes(val) ? cur.filter(v => v !== val) : [...cur, val] }
    })
  }

  const handleUpload = () => {
    if (posFile && invFile) onUpload(posFile, invFile)
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
            <div className="multi-select" style={{ marginBottom: 10 }}>
              {stores.map(s => (
                <button
                  key={s}
                  className={`chip ${filters.store.includes(s) ? 'active' : ''}`}
                  onClick={() => toggleFilter('store', s)}
                >
                  {s}
                </button>
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
