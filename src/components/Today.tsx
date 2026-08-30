import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../db'
import {
  BOOKS,
  CHAPTERS,
  TOTAL_CHAPTERS,
  finderUrl,
  indexToRef,
  portionLabel,
  refToIndex,
} from '../bible'
import { dateKey, streakFrom } from '../dates'
import Session from './Session'

interface ReadingPlan {
  perDay: number
  position: number
}

export default function Today() {
  const [inSession, setInSession] = useState(false)
  const [editingPlan, setEditingPlan] = useState(false)
  const [book, setBook] = useState(1)
  const [chapter, setChapter] = useState(1)
  const [perDay, setPerDay] = useState(3)

  // undefined = still loading, null = no plan configured yet
  const planRow = useLiveQuery(
    async () => (await db.settings.get('readingPlan')) ?? null,
    [],
  )
  const readingLogs = useLiveQuery(() => db.readingLogs.toArray(), []) ?? []
  const prayerLogs = useLiveQuery(() => db.prayerLogs.toArray(), []) ?? []
  const activeCount =
    useLiveQuery(
      () => db.prayerItems.where('status').equals('active').count(),
      [],
    ) ?? 0

  if (inSession) return <Session onDone={() => setInSession(false)} />

  const plan = (planRow?.value ?? undefined) as ReadingPlan | undefined
  const readingStreak = streakFrom(new Set(readingLogs.map((l) => l.dateKey)))
  const prayerStreak = streakFrom(
    new Set(prayerLogs.map((l) => dateKey(new Date(l.prayedAt)))),
  )
  const readToday = readingLogs.filter((l) => l.dateKey === dateKey()).length

  const savePlan = async () => {
    await db.settings.put({
      key: 'readingPlan',
      value: { perDay, position: refToIndex(book, chapter) },
    })
    setEditingPlan(false)
  }

  const editPlan = () => {
    if (plan) {
      const ref = indexToRef(Math.min(plan.position, TOTAL_CHAPTERS - 1))
      setBook(ref.book)
      setChapter(ref.chapter)
      setPerDay(plan.perDay)
    }
    setEditingPlan(true)
  }

  const markRead = async () => {
    if (!plan) return
    const count = Math.min(plan.perDay, TOTAL_CHAPTERS - plan.position)
    const now = Date.now()
    const dk = dateKey()
    await db.readingLogs.bulkAdd(
      Array.from({ length: count }, (_, i) => {
        const ref = indexToRef(plan.position + i)
        return { book: ref.book, chapter: ref.chapter, dateKey: dk, readAt: now }
      }),
    )
    await db.settings.put({
      key: 'readingPlan',
      value: { ...plan, position: plan.position + count },
    })
  }

  const showSetup = planRow === null || editingPlan
  const percent = plan
    ? Math.round((plan.position / TOTAL_CHAPTERS) * 1000) / 10
    : 0

  return (
    <div className="screen">
      <h1>Today</h1>

      <div className="stats">
        <span className="stat">🙏 {prayerStreak}-day streak</span>
        <span className="stat">📖 {readingStreak}-day streak</span>
        {plan && <span className="stat">{percent}% through the Bible</span>}
      </div>

      <section className="today-section">
        <h2>Bible reading</h2>
        {planRow === undefined && null}
        {showSetup && (
          <div className="card">
            <p className="card-meta">
              {plan ? 'Adjust your plan' : 'Set up your reading plan'}
            </p>
            <div className="setup-row">
              <select
                value={book}
                onChange={(e) => {
                  setBook(+e.target.value)
                  setChapter(1)
                }}
              >
                {BOOKS.map((b, i) => (
                  <option key={b} value={i + 1}>
                    {b}
                  </option>
                ))}
              </select>
              <input
                type="number"
                min={1}
                max={CHAPTERS[book - 1]}
                value={chapter}
                onChange={(e) => setChapter(+e.target.value || 1)}
              />
            </div>
            <div className="setup-row">
              <select
                value={perDay}
                onChange={(e) => setPerDay(+e.target.value)}
              >
                {[1, 2, 3, 4, 5].map((n) => (
                  <option key={n} value={n}>
                    {n} chapter{n > 1 ? 's' : ''} / day
                  </option>
                ))}
              </select>
            </div>
            <button className="primary" onClick={savePlan}>
              Start plan
            </button>
          </div>
        )}
        {!showSetup && plan && plan.position >= TOTAL_CHAPTERS && (
          <div className="card">
            <p className="card-text">
              🎉 You've read the whole Bible on this plan!
            </p>
            <div className="actions">
              <button className="act" onClick={editPlan}>
                Start again
              </button>
            </div>
          </div>
        )}
        {!showSetup && plan && plan.position < TOTAL_CHAPTERS && (
          <div className="card">
            <p className="card-meta">Today's reading</p>
            <p className="card-text ref">
              {portionLabel(plan.position, plan.perDay)}
            </p>
            {readToday > 0 && (
              <p className="card-meta">
                ✓ {readToday} chapter{readToday > 1 ? 's' : ''} read today
              </p>
            )}
            <div className="actions">
              <a
                className="act linkbtn"
                href={finderUrl(indexToRef(plan.position))}
                target="_blank"
                rel="noreferrer"
              >
                Open in JW Library
              </a>
              <button className="act" onClick={markRead}>
                Mark read
              </button>
              <button onClick={editPlan}>Adjust</button>
            </div>
          </div>
        )}
      </section>

      <section className="today-section">
        <h2>Prayer</h2>
        <div className="card">
          <p className="card-meta">
            {activeCount} active prayer item{activeCount === 1 ? '' : 's'}
          </p>
          <button
            className="primary"
            disabled={activeCount === 0}
            onClick={() => setInSession(true)}
          >
            Start prayer session
          </button>
        </div>
      </section>
    </div>
  )
}
