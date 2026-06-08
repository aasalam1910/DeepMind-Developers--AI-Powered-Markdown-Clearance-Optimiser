import StorePoster from './StorePoster'

export default function PosterPage() {
  let store = null
  let tier = null
  let recommendations = []

  try {
    const raw = sessionStorage.getItem('posterData')
    if (raw) {
      const parsed = JSON.parse(raw)
      store = parsed.store
      tier = parsed.tier
      recommendations = parsed.recommendations || []
    }
  } catch {
    // ignore parse errors
  }

  if (!store) {
    return (
      <div style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        justifyContent: 'center', minHeight: '100vh',
        fontFamily: 'Inter, sans-serif', color: '#64748B', gap: 12,
      }}>
        <div style={{ fontSize: '3rem' }}>🏪</div>
        <div style={{ fontSize: '1rem', fontWeight: 600 }}>No poster data found.</div>
        <div style={{ fontSize: '0.8rem' }}>Open a poster from the main dashboard.</div>
      </div>
    )
  }

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'flex-start',
      justifyContent: 'center',
      padding: '40px 20px',
      background: '#F5F3FF',
    }}>
      <StorePoster
        store={store}
        tier={tier}
        recommendations={recommendations}
        onClose={() => window.close()}
      />
    </div>
  )
}
