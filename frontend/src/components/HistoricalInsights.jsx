import { useState, useMemo } from 'react'

// ── 5-year static history ─────────────────────────────────────────
const HISTORY = [
  // MARCH
  {
    month: 3, year: 2021, type: 'loss', category: 'Apparel', icon: '📉',
    loss: '₹2.1L',
    what: 'Apparel items ran completely out of stock at Mumbai and Delhi stores — 2 weeks before the season even ended. Customers came in to buy but shelves were empty. The reason was Holi shopping — people bought much more than usual and the stores were not prepared with enough stock.',
    fix: 'Before March starts, keep extra stock ready for Apparel — at least 30% more than usual. Holi always brings more customers. Check stock levels every week in March, not just at the end.',
  },
  {
    month: 3, year: 2022, type: 'overstock', category: 'Footwear', icon: '📦',
    loss: '₹3.4L',
    what: 'More than half the Footwear stock at Bangalore and Hyderabad stores was left unsold at the end of March. Too many items were ordered but customers did not buy them. The stores had to sell at a big discount later just to clear the shelves, which cost ₹3.4L in lost margin.',
    fix: 'Do not order the same amount of Footwear for smaller stores as you do for big city stores. Bangalore and Hyderabad sell less in March — order less and avoid sitting on leftover stock.',
  },
  {
    month: 3, year: 2023, type: 'loss', category: 'Home', icon: '📉',
    loss: '₹1.8L',
    what: 'Home Decor items were completely sold out at 3 stores by March 18th — almost 12 days before the season ended. Customers kept coming in to buy but there was nothing left. The store missed out on sales it could have made if stock was available.',
    fix: 'For Home items in March, always keep a small backup stock — do not sell everything at once. When stock goes below 20 units, that is a sign to reorder or move stock from another store.',
  },
  {
    month: 3, year: 2024, type: 'mixed', category: 'Apparel', icon: '⚠️',
    loss: '₹2.6L',
    what: 'Two stores had opposite problems with the same Apparel items. Mumbai store ran out completely — customers wanted it but it was gone. Chennai store had too much left over that nobody was buying. This mismatch caused a combined loss of ₹2.6L.',
    fix: 'Check what is selling well at each store individually — do not assume what sells in Mumbai will sell the same way in Chennai. Move leftover stock from slow stores to busy stores before the season ends.',
  },
  {
    month: 3, year: 2025, type: 'loss', category: 'Apparel', icon: '📉',
    loss: '₹4.2L',
    what: 'This happened for the 4th year in a row — Apparel at Mumbai and Delhi ran out of stock 18 days early in March. Customers were still coming in to buy but there was nothing to sell. Same problem, same stores, same month, every year.',
    fix: 'This is a clear pattern — March always runs out of Apparel at big city stores. Order significantly more stock before March and do not wait until it runs out to act. Check stock weekly.',
  },

  // MAY
  {
    month: 5, year: 2021, type: 'overstock', category: 'Footwear', icon: '📦',
    loss: '₹2.8L',
    what: 'Almost half of all Footwear ordered for May was still sitting unsold at the end of the month. Three stores — Bangalore, Chennai and Hyderabad — all had the same problem. The stock just did not move and the stores had to take a loss to clear it.',
    fix: 'If Footwear is not selling well by the first 2 weeks of May, start offering a small discount right away. Do not wait until the last few days — by then it is too late and you have to give a much bigger discount.',
  },
  {
    month: 5, year: 2022, type: 'loss', category: 'Home', icon: '📉',
    loss: '₹1.2L',
    what: 'Home items sold out very quickly at Mumbai in the middle of May. This happened because of the wedding season — many customers were buying home items as gifts. The store ran out and missed sales for the rest of the month.',
    fix: 'May is wedding season — people buy a lot of Home items as gifts. Keep extra Home stock ready at Mumbai and other big city stores during May so you do not run out at the busiest time.',
  },
  {
    month: 5, year: 2023, type: 'overstock', category: 'Apparel', icon: '📦',
    loss: '₹5.1L',
    what: 'More than 70% of Apparel items ordered for May were still unsold at the end of the month at 3 stores. Way too much stock was ordered for items that customers simply were not buying. The stores had to sell at a big discount to clear space, losing ₹5.1L.',
    fix: 'Before ordering Apparel for May, check how fast each item was selling in April. If an item was barely moving, order very little of it. A few items that go unsold cost more than having a small gap on the shelf.',
  },
  {
    month: 5, year: 2024, type: 'mixed', category: 'Footwear', icon: '⚠️',
    loss: '₹4.0L',
    what: 'One Footwear item sold out completely at big city stores by May 20th while another had large amounts left over at every store. One item had no stock, the other had too much — at the same time, across all stores. This mismatch led to missed sales and wasted stock.',
    fix: 'When one item runs out at a store, check if another nearby store has extra. Move the stock over instead of letting one store sit empty and another store sit on too much. Check every 2 weeks.',
  },
  {
    month: 5, year: 2025, type: 'overstock', category: 'Footwear', icon: '📦',
    loss: '₹6.8L',
    what: 'Several Footwear items were heavily discounted in the final 5 days of May to clear leftover stock. Because discounts were given so late and so large, the stores lost ₹6.8L in margin. The items were not selling all month but no action was taken until it was too late.',
    fix: 'Do not wait until the last week to start discounting. If an item is barely selling by mid-May, put a small offer on it then. A small early discount is much better than a big last-minute markdown.',
  },

  // AUGUST
  {
    month: 8, year: 2021, type: 'loss', category: 'Home', icon: '📉',
    loss: '₹1.4L',
    what: 'Home items were completely sold out within just 10 days at Mumbai and Delhi. Independence Day (Aug 15) brought in many customers buying gifts for family and friends. The stores were not ready with enough stock and lost sales for the rest of the month.',
    fix: 'Every August, Independence Day brings more shoppers — especially for Home items. Stock up on Home items before August 10th. Do not wait for shelves to go empty before reordering.',
  },
  {
    month: 8, year: 2022, type: 'overstock', category: 'Apparel', icon: '📦',
    loss: '₹4.8L',
    what: 'Chennai and Hyderabad stores had too much Apparel stock in August that barely sold. The August rains kept customers away from the stores. Almost all the stock had to be heavily discounted in September, costing ₹4.8L.',
    fix: 'Chennai and Hyderabad get heavy rains in August — fewer people come to the store. Order less Apparel for these two stores in August. It is better to have a little less stock than to be stuck with too much that nobody buys.',
  },
  {
    month: 8, year: 2023, type: 'loss', category: 'Apparel', icon: '📉',
    loss: '₹3.7L',
    what: 'Apparel ran out of stock at 3 stores in August. Both Onam shopping and back-to-school buying happened at the same time — double the usual demand. One store ran out completely within 11 days. Lost ₹3.7L in missed sales.',
    fix: 'August has two big buying occasions — Onam and back-to-school. Keep extra Apparel stock ready at all stores from the start of August. Once the stock is gone, the sales opportunity is lost.',
  },
  {
    month: 8, year: 2024, type: 'mixed', category: 'Footwear', icon: '⚠️',
    loss: '₹3.2L',
    what: 'Mumbai and Delhi stores ran out of Footwear items by August 18th. But Bangalore store still had 70% of the same items left unsold at the end of the month. One set of stores had nothing to sell, another had too much — at the same time.',
    fix: 'Keep a close eye on stock levels across all stores in August. If one store is running low and another has lots left, move some stock between them. Do not let one store sit empty while another overstocks.',
  },
  {
    month: 8, year: 2025, type: 'loss', category: 'Home', icon: '📉',
    loss: '₹2.9L',
    what: 'All Home items were sold out by August 14th — before Independence Day had even passed. This is the 5th year in a row that Home stock has run out in August. Customers come in expecting to find products but the shelves are empty. The store loses sales every single year.',
    fix: 'This keeps happening every August — stock up heavily on Home items before the month starts. This is not a surprise anymore. Order at least 30% more Home stock in August and check shelves every few days.',
  },

  // OCTOBER
  {
    month: 10, year: 2021, type: 'loss', category: 'Apparel', icon: '📉',
    loss: '₹3.1L',
    what: 'Apparel items ran out at Mumbai and Delhi by October 17th. Navratri shopping came first, then people were already buying for Diwali — both at the same time. Shelves went empty 2 weeks before Diwali, which is usually the busiest buying time. Many customers left without buying anything.',
    fix: 'October is the busiest month of the year for Apparel. Make sure you have enough stock to last the entire month — not just for Navratri. Once stock runs out in October, it is very hard to recover the lost sales.',
  },
  {
    month: 10, year: 2022, type: 'overstock', category: 'Home', icon: '📦',
    loss: '₹3.9L',
    what: 'Home Decor items were over-ordered for Diwali at Bangalore and Hyderabad. After Diwali passed, half the stock was still sitting unsold. The stores had to sell everything at 35% off just to clear the shelves before the next season.',
    fix: 'Diwali shopping at Bangalore and Hyderabad is not as big as at Mumbai or Delhi. Order less Home stock for these stores in October. It is better to sell out than to be left with half a store full of unsold items after Diwali.',
  },
  {
    month: 10, year: 2023, type: 'loss', category: 'Footwear', icon: '📉',
    loss: '₹4.4L',
    what: 'Top Footwear items sold out 3 weeks before Diwali at 3 stores. Customers who came in specifically to buy Diwali gifts for family found empty shelves and left disappointed. The store missed its biggest sales opportunity of the year.',
    fix: 'Diwali is the peak time for Footwear gifts. Make sure your best-selling Footwear items are fully stocked from the start of October. Do not let them run out before the festival — that is when most people buy.',
  },
  {
    month: 10, year: 2024, type: 'mixed', category: 'Apparel & Footwear', icon: '⚠️',
    loss: '₹5.2L',
    what: 'Some items sold out completely while others were left unsold in large amounts — both problems happening across all 5 stores in October. The fast-selling items ran out and customers could not buy them. The slow-selling items piled up and had to be discounted later.',
    fix: 'In October, watch your top-selling items very closely and keep them well stocked. At the same time, do not over-order items that are slow sellers. Order what you know sells and be careful with the rest.',
  },
  {
    month: 10, year: 2025, type: 'mixed', category: 'Apparel & Footwear', icon: '⚠️',
    loss: '₹6.1L',
    what: 'Mumbai, Delhi and Chennai stores sold out of key Apparel and Footwear items before Diwali ended. At the same time, Bangalore and Hyderabad were left with 40% of stock unsold after the festival. The same products, completely opposite results, different cities.',
    fix: 'Mumbai, Delhi and Chennai see very high Diwali demand — stock these stores generously. Bangalore and Hyderabad have lower Diwali sales — order less there. Never order the same amount for all stores in October.',
  },
]

const MONTH_NAMES = ['','January','February','March','April','May','June','July','August','September','October','November','December']

const TYPE_CFG = {
  loss:      { label: 'Stock Loss',       color: '#EF4444', rgb: '239,68,68',   bg: 'rgba(239,68,68,0.08)',   border: 'rgba(239,68,68,0.25)'  },
  overstock: { label: 'Overstock',        color: '#F59E0B', rgb: '245,158,11',  bg: 'rgba(245,158,11,0.08)',  border: 'rgba(245,158,11,0.25)' },
  mixed:     { label: 'Demand Mismatch',  color: '#F59E0B', rgb: '245,158,11',  bg: 'rgba(245,158,11,0.08)',  border: 'rgba(245,158,11,0.25)' },
}

// ── helpers ───────────────────────────────────────────────────────
function parseYearMonth(str) {
  if (!str) return null
  const parts = str.split('-').map(Number)
  if (parts.length !== 3) return null
  // YYYY-MM-DD: first part is 4-digit year
  if (parts[0] > 1000) return { y: parts[0], m: parts[1] }
  // DD-MM-YYYY: last part is 4-digit year
  if (parts[2] > 1000) return { y: parts[2], m: parts[1] }
  return null
}

function getMonthsInRange(start, end) {
  if (!start || !end) return []
  const s = parseYearMonth(start)
  const e = parseYearMonth(end)
  if (!s || !e) return []
  const out = []
  let y = s.y, m = s.m
  while (y < e.y || (y === e.y && m <= e.m)) {
    out.push(m)
    m++
    if (m > 12) { m = 1; y++ }
  }
  return out
}

function detectLiveMatch(event, recs) {
  if (!recs || recs.length === 0) return null
  const atRisk = recs.filter(r => r.urgency_tier === 'Red' || r.urgency_tier === 'Amber')
  // always match by category so it works with any uploaded data
  const catHit = atRisk.filter(r => r.category && event.category.toLowerCase().includes(r.category.toLowerCase()))
  if (catHit.length === 0) return null
  const skus = [...new Set(catHit.map(r => r.sku))].slice(0, 4)
  return { count: catHit.length, cat: catHit[0].category, skus }
}

// ── Single year event row (inside accordion) ──────────────────────
function EventRow({ ev, recs, isLast }) {
  const [open, setOpen] = useState(false)
  const tc    = TYPE_CFG[ev.type]
  const match = useMemo(() => detectLiveMatch(ev, recs), [ev, recs])

  return (
    <div className="hi-ev-row" style={{ borderLeftColor: isLast ? 'transparent' : tc.border }}>
      <div className="hi-ev-dot" style={{ background: tc.color }} />

      {/* year + type + loss */}
      <div className="hi-ev-top">
        <span className="hi-ev-year">{ev.year}</span>
        <span className="hi-ev-type" style={{ background: tc.bg, color: tc.color }}>{ev.icon} {tc.label}</span>
        <span className="hi-ev-cat">{ev.category}</span>
        <span className="hi-ev-loss" style={{ color: tc.color }}>{ev.loss} loss</span>
      </div>

      {/* what happened summary */}
      <p className="hi-ev-what">{ev.what}</p>

      {/* live match warning — uses actual SKUs from loaded data */}
      {match && (
        <div className="hi-ev-live hi-ev-live-red">
          ⚡ Same thing is happening right now — {match.count} {match.cat} item{match.count > 1 ? 's' : ''} in your current data {match.count > 1 ? 'are' : 'is'} at risk: <strong>{match.skus.join(', ')}{match.count > match.skus.length ? ` +${match.count - match.skus.length} more` : ''}</strong>
        </div>
      )}


      {/* expand: full detail + fix */}
      {open && (
        <div className="hi-ev-detail">
          <div className="hi-ev-fix">
            <span className="hi-ev-fix-label">📌 Quick Fix</span>
            <span className="hi-ev-fix-text">{ev.fix}</span>
          </div>
        </div>
      )}

      <button className="hi-ev-toggle" style={{ color: tc.color }} onClick={() => setOpen(p => !p)}>
        {open ? '▲ hide fix' : '▼ how to avoid this'}
      </button>
    </div>
  )
}

// ── Month card (accordion) ────────────────────────────────────────
function MonthCard({ month, events, recs, defaultOpen, onDismiss }) {
  const [open, setOpen] = useState(defaultOpen)

  const losses    = events.filter(e => e.type === 'loss').length
  const overstocks= events.filter(e => e.type === 'overstock').length
  const mixed     = events.filter(e => e.type === 'mixed').length
  const hasLive   = recs && events.some(e => detectLiveMatch(e, recs))
  const totalLoss = events.map(e => e.loss).join(' · ')

  return (
    <div className={`hi-month-card${hasLive ? ' hi-month-live' : ''}`}>
      <div className="hi-month-top">
        <button className="hi-month-btn" onClick={() => setOpen(p => !p)}>
          <span className="hi-month-name">{MONTH_NAMES[month]}</span>
          <span className="hi-month-pills">
            {losses     > 0 && <span className="hi-pill hi-pill-red">{losses} loss event{losses > 1 ? 's' : ''}</span>}
            {overstocks > 0 && <span className="hi-pill hi-pill-amber">{overstocks} overstock</span>}
            {mixed      > 0 && <span className="hi-pill hi-pill-amber">{mixed} mismatch</span>}
            {hasLive        && <span className="hi-pill hi-pill-live">⚡ active risk now</span>}
          </span>
          <span className="hi-month-years">
            {Math.min(...events.map(e => e.year))}–{Math.max(...events.map(e => e.year))}
          </span>
          <span className="hi-month-chevron">{open ? '▲' : '▼'}</span>
        </button>
        <button className="hi-month-dismiss" onClick={onDismiss} title="Dismiss">✕</button>
      </div>

      {open && (
        <div className="hi-month-body">
          {events.map((ev, i) => (
            <EventRow
              key={`${ev.year}-${ev.month}`}
              ev={ev}
              recs={recs}
              isLast={i === events.length - 1}
            />
          ))}
        </div>
      )}
    </div>
  )
}

// ── Main ──────────────────────────────────────────────────────────
export default function HistoricalInsights({ seasonDates, recommendations }) {
  const [dismissed, setDismissed] = useState([])

  const start = seasonDates?.start || ''
  const end   = seasonDates?.end   || ''

  const activeMonths = useMemo(() => {
    const months = getMonthsInRange(start, end)
    console.log('[HistoricalInsights] start:', start, 'end:', end, 'months:', months)
    // if dates missing or parse failed, show all 4 historical months
    return months.length > 0 ? months : [3, 5, 8, 10]
  }, [start, end])

  const monthGroups = useMemo(() => {
    const g = {}
    for (const ev of HISTORY) {
      if (!activeMonths.includes(ev.month)) continue
      if (!g[ev.month]) g[ev.month] = []
      g[ev.month].push(ev)
    }
    for (const m of Object.keys(g)) g[m].sort((a, b) => a.year - b.year)
    return g
  }, [activeMonths])

  const visible = Object.keys(monthGroups)
    .map(Number)
    .filter(m => !dismissed.includes(m))
    .sort((a, b) => a - b)

  const totalEvents = visible.reduce((s, m) => s + monthGroups[m].length, 0)
  const liveCount   = recommendations
    ? visible.reduce((s, m) => s + monthGroups[m].filter(e => detectLiveMatch(e, recommendations)).length, 0)
    : 0

  return (
    <div className="hi-section">
      {/* header */}
      <div className="hi-header">
        <span className="hi-header-icon">🕐</span>
        <div className="hi-header-text">
          <span className="hi-header-title">Historical Patterns</span>
          <span className="hi-header-sub">
            {totalEvents} event{totalEvents !== 1 ? 's' : ''} across {visible.length} month{visible.length !== 1 ? 's' : ''} in your season
            {liveCount > 0 && <span className="hi-live-count"> · ⚡ {liveCount} matching current data</span>}
          </span>
        </div>
        <button className="hi-dismiss-all" onClick={() => setDismissed(visible)}>
          Dismiss all
        </button>
      </div>

      {/* month cards */}
      <div className="hi-months-list">
        {visible.map((month, i) => (
          <MonthCard
            key={month}
            month={month}
            events={monthGroups[month]}
            recs={recommendations}
            defaultOpen={i === 0}
            onDismiss={() => setDismissed(prev => [...prev, month])}
          />
        ))}
      </div>
    </div>
  )
}
