import { useEffect, useState } from 'react'
import { db, type PrayerItem, type Scripture } from '../db'
import { dealSession } from '../session'
import { formatRef } from '../bible'

function ago(ts?: number): string {
  if (!ts) return 'never prayed yet'
  const days = Math.floor((Date.now() - ts) / 86_400_000)
  if (days === 0) return 'prayed today'
  if (days === 1) return 'prayed yesterday'
  return `prayed ${days} days ago`
}

export default function Session({
  onDone,
  at,
}: {
  onDone: () => void
  at?: number
}) {
  const [hand, setHand] = useState<PrayerItem[] | null>(null)
  const [idx, setIdx] = useState(0)
  const [prayedCount, setPrayedCount] = useState(0)
  const [scripture, setScripture] = useState<Scripture | null>(null)

  useEffect(() => {
    ;(async () => {
      const active = await db.prayerItems
        .where('status')
        .equals('active')
        .toArray()
      const sizeSetting = await db.settings.get('sessionSize')
      const size =
        typeof sizeSetting?.value === 'number' ? sizeSetting.value : 5
      setHand(dealSession(active, size))
      const favs = await db.scriptures.toArray()
      if (favs.length > 0) {
        setScripture(favs[Math.floor(Math.random() * favs.length)])
      }
    })()
  }, [])

  if (!hand) return null

  if (hand.length === 0) {
    return (
      <div className="screen session">
        <h1>Prayer session</h1>
        <p className="empty">No active prayer items — capture something first.</p>
        <button className="primary" onClick={onDone}>
          Back
        </button>
      </div>
    )
  }

  if (idx >= hand.length) {
    return (
      <div className="screen session">
        <h1>Session complete 🙏</h1>
        <p>
          You prayed over {prayedCount} {prayedCount === 1 ? 'item' : 'items'}.
        </p>
        {scripture && (
          <div className="card">
            <p className="card-meta">A favorite scripture for today</p>
            <p className="card-text ref">{formatRef(scripture)}</p>
            {scripture.note && <p className="card-meta">{scripture.note}</p>}
            <div className="actions">
              <a
                className="act linkbtn"
                href={scripture.url}
                target="_blank"
                rel="noreferrer"
              >
                Open in JW Library
              </a>
            </div>
          </div>
        )}
        <button className="primary" onClick={onDone}>
          Done
        </button>
      </div>
    )
  }

  const item = hand[idx]

  const markPrayed = async () => {
    const when = at ?? Date.now()
    await db.prayerLogs.add({ itemId: item.id, prayedAt: when })
    if (!item.lastPrayedAt || when > item.lastPrayedAt) {
      await db.prayerItems.update(item.id, { lastPrayedAt: when })
    }
    setPrayedCount((c) => c + 1)
    setIdx((i) => i + 1)
  }

  return (
    <div className="screen session">
      <p className="session-progress">
        {idx + 1} of {hand.length}
      </p>
      <div className="session-card">
        <p className="session-text">{item.text}</p>
        {item.tags.length > 0 && (
          <p className="card-tags">{item.tags.join(' · ')}</p>
        )}
        <p className="card-meta">{ago(item.lastPrayedAt)}</p>
      </div>
      <button className="primary" onClick={markPrayed}>
        🙏 Prayed
      </button>
      <div className="actions center">
        <button onClick={() => setIdx((i) => i + 1)}>Skip</button>
        <button onClick={onDone}>End session</button>
      </div>
    </div>
  )
}
