import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db, type PrayerItem } from '../db'

type Filter = 'active' | 'answered' | 'archived'

function ago(ts?: number): string {
  if (!ts) return 'never'
  const days = Math.floor((Date.now() - ts) / 86_400_000)
  if (days === 0) return 'today'
  if (days === 1) return 'yesterday'
  return `${days} days ago`
}

export default function Prayers() {
  const [filter, setFilter] = useState<Filter>('active')
  const [tagFilter, setTagFilter] = useState<string | null>(null)
  const [noteFor, setNoteFor] = useState<number | null>(null)
  const [note, setNote] = useState('')

  const items = useLiveQuery(
    () => db.prayerItems.where('status').equals(filter).toArray(),
    [filter],
  )

  const tags = [...new Set((items ?? []).flatMap((i) => i.tags))].sort()
  const shown = (items ?? [])
    .filter((i) => !tagFilter || i.tags.includes(tagFilter))
    .sort((a, b) =>
      filter === 'active'
        ? (a.lastPrayedAt ?? 0) - (b.lastPrayedAt ?? 0)
        : b.createdAt - a.createdAt,
    )

  const markPrayed = async (item: PrayerItem) => {
    const now = Date.now()
    await db.prayerLogs.add({ itemId: item.id, prayedAt: now })
    await db.prayerItems.update(item.id, { lastPrayedAt: now })
  }

  const markAnswered = async (id: number) => {
    await db.prayerItems.update(id, {
      status: 'answered',
      answeredAt: Date.now(),
      answeredNote: note.trim() || undefined,
    })
    setNoteFor(null)
    setNote('')
  }

  const setStatus = (id: number, status: PrayerItem['status']) =>
    db.prayerItems.update(id, { status })

  const remove = async (id: number) => {
    await db.prayerLogs.where('itemId').equals(id).delete()
    await db.prayerItems.delete(id)
  }

  return (
    <div className="screen">
      <h1>Prayers</h1>
      <div className="chips">
        {(['active', 'answered', 'archived'] as const).map((f) => (
          <button
            key={f}
            className={filter === f ? 'chip on' : 'chip'}
            onClick={() => {
              setFilter(f)
              setTagFilter(null)
            }}
          >
            {f}
          </button>
        ))}
      </div>
      {tags.length > 0 && (
        <div className="chips small">
          {tags.map((t) => (
            <button
              key={t}
              className={tagFilter === t ? 'chip on' : 'chip'}
              onClick={() => setTagFilter(tagFilter === t ? null : t)}
            >
              {t}
            </button>
          ))}
        </div>
      )}

      {items && shown.length === 0 && (
        <p className="empty">
          {filter === 'active'
            ? 'Nothing here yet — capture something on the ✏️ tab.'
            : `No ${filter} items.`}
        </p>
      )}

      <ul className="cards">
        {shown.map((item) => (
          <li key={item.id} className="card">
            <p className="card-text">{item.text}</p>
            {item.tags.length > 0 && (
              <p className="card-tags">{item.tags.join(' · ')}</p>
            )}
            {item.status === 'active' && (
              <p className="card-meta">last prayed: {ago(item.lastPrayedAt)}</p>
            )}
            {item.status === 'answered' && (
              <p className="card-meta">
                answered {ago(item.answeredAt)}
                {item.answeredNote ? ` — ${item.answeredNote}` : ''}
              </p>
            )}

            {noteFor === item.id ? (
              <div className="answer-note">
                <input
                  autoFocus
                  value={note}
                  placeholder="How was it answered? (optional)"
                  onChange={(e) => setNote(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && markAnswered(item.id)}
                />
                <div className="actions">
                  <button onClick={() => markAnswered(item.id)}>Save</button>
                  <button onClick={() => setNoteFor(null)}>Cancel</button>
                </div>
              </div>
            ) : (
              <div className="actions">
                {item.status === 'active' && (
                  <>
                    <button className="act" onClick={() => markPrayed(item)}>
                      🙏 Prayed
                    </button>
                    <button onClick={() => setNoteFor(item.id)}>
                      ✓ Answered
                    </button>
                    <button onClick={() => setStatus(item.id, 'archived')}>
                      Archive
                    </button>
                  </>
                )}
                {item.status !== 'active' && (
                  <>
                    <button onClick={() => setStatus(item.id, 'active')}>
                      Restore
                    </button>
                    <button className="danger" onClick={() => remove(item.id)}>
                      Delete
                    </button>
                  </>
                )}
              </div>
            )}
          </li>
        ))}
      </ul>
    </div>
  )
}
