const BASE = ''  // Vite proxy forwards /api → http://localhost:8000

function seasonParams(seasonDates) {
  const p = new URLSearchParams()
  if (seasonDates?.start) p.set('season_start', seasonDates.start)
  if (seasonDates?.end)   p.set('season_end',   seasonDates.end)
  const qs = p.toString()
  return qs ? `?${qs}` : ''
}

export async function loadSample(seasonDates, festivals = []) {
  const res = await fetch(`${BASE}/api/recommend/sample`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      season_start: seasonDates?.start ?? null,
      season_end:   seasonDates?.end   ?? null,
      festivals:    festivals.filter(f => f.enabled),
    }),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }))
    throw new Error(err.detail || 'Failed to load sample data')
  }
  return res.json()
}

export async function uploadFiles(posFile, invFile, seasonDates, festivals = []) {
  const form = new FormData()
  form.append('pos_file', posFile)
  form.append('inv_file', invFile)
  form.append('festivals', JSON.stringify(festivals.filter(f => f.enabled)))
  const res = await fetch(`${BASE}/api/recommend${seasonParams(seasonDates)}`, { method: 'POST', body: form })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }))
    throw new Error(err.detail || 'Failed to process files')
  }
  return res.json()
}

export async function detectFestivals(year, region = 'India', festivalName = null, seasonDates = null) {
  const body = { year, region }
  if (festivalName)       body.festival_name = festivalName
  if (seasonDates?.start) body.season_start  = seasonDates.start
  if (seasonDates?.end)   body.season_end    = seasonDates.end
  const res = await fetch(`${BASE}/api/festivals/detect`, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify(body),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }))
    throw new Error(err.detail || 'Festival detection failed')
  }
  return res.json()
}

export async function fetchRationale(row) {
  const res = await fetch(`${BASE}/api/rationale`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(row),
  })
  if (!res.ok) throw new Error('Rationale generation failed')
  return res.json()
}

export async function exportSheet(recommendations, rationales) {
  const recs = recommendations.map(r => {
    const key = `${r.sku}_${r.store}`
    const rd = rationales[key]
    let rationale = ''
    if (rd) {
      const parts = []
      if (rd.rationale_why)        parts.push(`WHY: ${rd.rationale_why}`)
      if (rd.rationale_outcome)    parts.push(`OUTCOME: ${rd.rationale_outcome}`)
      if (rd.rationale_consequence)parts.push(`RISK: ${rd.rationale_consequence}`)
      if (rd.confidence)           parts.push(`CONFIDENCE: ${rd.confidence}`)
      rationale = parts.join('\n\n')
    }
    return { ...r, rationale }
  })

  const res = await fetch(`${BASE}/api/export`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ recommendations: recs }),
  })
  if (!res.ok) throw new Error('Export failed')

  const blob = await res.blob()
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = 'markdown_recommendations.xlsx'
  a.click()
  URL.revokeObjectURL(url)
}
