import { useState, useMemo, useRef, useEffect, useLayoutEffect } from 'react'
import Sidebar       from './components/Sidebar'
import KPICards      from './components/KPICards'
import Charts        from './components/Charts'
import TreemapChart  from './components/TreemapChart'
import SKUTable      from './components/SKUTable'
import DiscountCard  from './components/DiscountCard'
import RationalePanel from './components/RationalePanel'
import { loadSample, uploadFiles } from './api'

const DEFAULT_SEASON = { start: '2026-03-01', end: '2026-06-30' }

export default function App() {
  const [recommendations, setRecommendations] = useState(null)
  const [loading,     setLoading]     = useState(false)
  const [error,       setError]       = useState(null)
  const [selectedRow, setSelectedRow] = useState(null)
  const [rationales,  setRationales]  = useState({})
  const [seasonDates, setSeasonDates] = useState(DEFAULT_SEASON)
  const [appliedDates, setAppliedDates] = useState(DEFAULT_SEASON)
  const [filters,     setFilters]     = useState({ store: [], tier: [], category: [] })
  const [lastUpload,  setLastUpload]  = useState(null) // { posFile, invFile }
  const discountRef = useRef(null)
  const tableRef    = useRef(null)

  const filtered = useMemo(() => {
    if (!recommendations) return []
    return recommendations.filter(r => {
      if (filters.store.length    && !filters.store.includes(r.store))           return false
      if (filters.tier.length     && !filters.tier.includes(r.urgency_tier))     return false
      if (filters.category.length && !filters.category.includes(r.category))     return false
      return true
    })
  }, [recommendations, filters])

  const handleLoadSample = async (dates) => {
    const d = dates || seasonDates
    setLoading(true); setError(null); setSelectedRow(null); setRationales({})
    try {
      const data = await loadSample(d)
      setRecommendations(data.recommendations)
      setAppliedDates(d)
      setLastUpload(null)
      setFilters({ store: [], tier: [], category: [] })
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  const handleUpload = async (posFile, invFile, dates) => {
    const d = dates || seasonDates
    setLoading(true); setError(null); setSelectedRow(null); setRationales({})
    try {
      const data = await uploadFiles(posFile, invFile, d)
      setRecommendations(data.recommendations)
      setAppliedDates(d)
      setLastUpload({ posFile, invFile })
      setFilters({ store: [], tier: [], category: [] })
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  const handleRecalculate = async () => {
    if (lastUpload) {
      await handleUpload(lastUpload.posFile, lastUpload.invFile, seasonDates)
    } else {
      await handleLoadSample(seasonDates)
    }
  }

  const datesChanged = recommendations &&
    (seasonDates.start !== appliedDates.start || seasonDates.end !== appliedDates.end)

  const handleSelectRow = (row) => {
    const isSame = selectedRow
      && selectedRow.sku   === row.sku
      && selectedRow.store === row.store
    setSelectedRow(isSame ? null : row)
  }

  useLayoutEffect(() => {
    if (selectedRow && discountRef.current) {
      discountRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }, [selectedRow])

  useEffect(() => {
    if (tableRef.current) {
      tableRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }, [filters])

  return (
    <div className="app-layout">
      <Sidebar
        onLoadSample={handleLoadSample}
        onUpload={handleUpload}
        onRecalculate={handleRecalculate}
        datesChanged={datesChanged}
        loading={loading}
        recommendations={recommendations}
        filters={filters}
        setFilters={setFilters}
        rationales={rationales}
        seasonDates={seasonDates}
        setSeasonDates={setSeasonDates}
      />

      <main className="main-content">
        {/* Hero */}
        <div className="hero-card">
          <span className="hero-icon">🏷️</span>
          <div>
            <h1 className="hero-title">AI-Powered Markdown &amp; Clearance Optimiser</h1>
            <p className="hero-sub">SKU-level markdown recommendations with explainable AI rationale</p>
          </div>
        </div>

        {error && <div className="alert-error">⚠ {error}</div>}

        {loading && (
          <div className="loading-box">
            <div className="spinner" />
            Computing features and recommendations…
          </div>
        )}

        {!recommendations && !loading && (
          <div className="empty-state">
            <div className="empty-icon">📂</div>
            <p>
              Upload POS and Inventory CSVs in the sidebar, or click{' '}
              <strong>Load Sample Data</strong> to get started.
            </p>
          </div>
        )}

        {recommendations && !loading && (() => {
          const hasCalc = recommendations.some(r => Array.isArray(r.markdown_calc) && r.markdown_calc.length > 0)
          return !hasCalc ? (
            <div className="alert-error" style={{ background: 'rgba(245,158,11,0.12)', borderColor: '#F59E0B', color: '#F59E0B' }}>
              ⚠ Data loaded from a previous session. Click <strong>Load Sample Data</strong> or <strong>Apply Season Dates</strong> to refresh with the latest calculations.
            </div>
          ) : null
        })()}

        {recommendations && !loading && (
          <>
            <KPICards recommendations={filtered.length ? filtered : recommendations} />
            <Charts   recommendations={filtered.length ? filtered : recommendations} />
            <TreemapChart
              recommendations={filtered.length ? filtered : recommendations}
              totalCount={recommendations.length}
            />

            <div ref={tableRef} className="section-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span>
                📋 SKU Recommendations
                <span style={{ marginLeft: 8, fontSize: '0.75rem', color: filtered.length < recommendations.length ? 'var(--accent)' : 'var(--text-dim)', fontWeight: 500, textTransform: 'none', letterSpacing: 0 }}>
                  {filtered.length} / {recommendations.length} rows
                </span>
              </span>
              <span style={{ fontSize: '0.72rem', color: 'var(--text-dim)', fontWeight: 400, textTransform: 'none', letterSpacing: 0 }}>
                Click a row to see discount details ↓
              </span>
            </div>

            {filtered.length === 0 ? (
              <div className="empty-state" style={{ padding: 32 }}>
                <p>No SKUs match the current filters.</p>
              </div>
            ) : (
              <SKUTable
                key={JSON.stringify(filters)}
                data={filtered}
                selectedRow={selectedRow}
                onSelect={handleSelectRow}
              />
            )}

            {selectedRow && (
              <div ref={discountRef}>
                <DiscountCard row={selectedRow} />
                <RationalePanel
                  row={selectedRow}
                  rationales={rationales}
                  setRationales={setRationales}
                />
              </div>
            )}
          </>
        )}
      </main>
    </div>
  )
}
