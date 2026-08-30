import { useEffect, useState } from 'react'
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
  goalType?: 'chapters' | 'minutes'
  minutesPerDay?: number
}

interface ActiveReading {
  startedAt: number
}

const DAYS = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
]

export default function Today() {
  const [inSession, setInSession] = useState(false)
  const [sessionDate, setSessionDate] = useState(dateKey())
  const [editingPlan, setEditingPlan] = useState(false)
  const [book, setBook] = useState(1)
  const [chapter, setChapter] = useState(1)
  const [perDay, setPerDay] = useState(3)
  const [goalType, setGoalType] = useState<'chapters' | 'minutes'>('chapters')
  const [minutesPerDay, setMinutesPerDay] = useState(15)
  const [minutesInput, setMinutesInput] = useState<number | null>(null)
  const [meditated, setMeditated] = useState(false)
  const [chaptersDone, setChaptersDone] = useState<number | null>(null)
  const [, tick] = useState(0)

  // undefined = still loading, null = not set
  const planRow = useLiveQuery(
    async () => (await db.settings.get('readingPlan')) ?? null,
    [],
  )
  const activeRow = useLiveQuery(
    async () => (await db.settings.get('activeReading')) ?? null,
    [],
  )
  const scheduleRow = useLiveQuery(
    async () => (await db.settings.get('sessionSchedule')) ?? null,
    [],
  )
  const readingLogs = useLiveQuery(() => db.readingLogs.toArray(), []) ?? []
  const readingSessions =
    useLiveQuery(() => db.readingSessions.toArray(), []) ?? []
  const prayerLogs = useLiveQuery(() => db.prayerLogs.toArray(), []) ?? []
  const activeCount =
    useLiveQuery(
      () => db.prayerItems.where('status').equals('active').count(),
      [],
    ) ?? 0

  const active = (activeRow?.value ?? undefined) as ActiveReading | undefined

  // keep the elapsed-minutes prefill fresh while a reading is in progress
  useEffect(() => {
    if (!active) return
    const t = setInterval(() => tick((x) => x + 1), 30_000)
    return () => clearInterval(t)
  }, [active?.startedAt])

  if (inSession) {
    const backdated = sessionDate !== dateKey()
    return (
      <Session
        at={
          backdated
            ? new Date(`${sessionDate}T12:00:00`).getTime()
            : undefined
        }
        onDone={() => {
          setInSession(false)
          setSessionDate(dateKey())
        }}
      />
    )
  }

  const plan = (planRow?.value ?? undefined) as ReadingPlan | undefined
  const planGoal = plan?.goalType ?? 'chapters'
  const schedule = (scheduleRow?.value ?? undefined) as
    | { day: number }
    | undefined

  const readingDays = new Set([
    ...readingLogs.map((l) => l.dateKey),
    ...readingSessions.map((s) => s.dateKey),
  ])
  const readingStreak = streakFrom(readingDays)
  const prayerStreak = streakFrom(
    new Set(prayerLogs.map((l) => dateKey(new Date(l.prayedAt)))),
  )
  const readToday = readingLogs.filter((l) => l.dateKey === dateKey()).length
  const minutesToday = readingSessions
    .filter((s) => s.dateKey === dateKey())
    .reduce((sum, s) => sum + s.minutes, 0)
  const prayedToday = prayerLogs.some(
    (l) => dateKey(new Date(l.prayedAt)) === dateKey(),
  )

  const savePlan = async () => {
    await db.settings.put({
      key: 'readingPlan',
      value: {
        perDay,
        goalType,
        minutesPerDay,
        position: refToIndex(book, chapter),
      },
    })
    setEditingPlan(false)
  }

  const editPlan = () => {
    if (plan) {
      const ref = indexToRef(Math.min(plan.position, TOTAL_CHAPTERS - 1))
      setBook(ref.book)
      setChapter(ref.chapter)
      setPerDay(plan.perDay)
      setGoalType(plan.goalType ?? 'chapters')
      setMinutesPerDay(plan.minutesPerDay ?? 15)
    }
    setEditingPlan(true)
  }

  const logChapters = async (count: number) => {
    if (!plan || count <= 0) return
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

  const markRead = () => {
    if (!plan) return
    void logChapters(Math.min(plan.perDay, TOTAL_CHAPTERS - plan.position))
  }

  const remaining = plan ? TOTAL_CHAPTERS - plan.position : 0
  const defaultChapters = plan
    ? planGoal === 'chapters'
      ? Math.min(plan.perDay, remaining)
      : 0
    : 0
  const elapsedMinutes = active
    ? Math.min(180, Math.max(1, Math.round((Date.now() - active.startedAt) / 60_000)))
    : 1
  const minutesValue = minutesInput ?? elapsedMinutes
  const chaptersValue = chaptersDone ?? defaultChapters

  const saveReading = async () => {
    if (!active) return
    await db.readingSessions.add({
      dateKey: dateKey(),
      minutes: minutesValue,
      meditated,
      startedAt: active.startedAt,
    })
    await logChapters(Math.min(chaptersValue, remaining))
    await db.settings.delete('activeReading')
    setMinutesInput(null)
    setMeditated(false)
    setChaptersDone(null)
  }

  const discardReading = async () => {
    await db.settings.delete('activeReading')
    setMinutesInput(null)
    setMeditated(false)
    setChaptersDone(null)
  }

  const showSetup = planRow === null || editingPlan
  const percent = plan
    ? Math.round((plan.position / TOTAL_CHAPTERS) * 1000) / 10
    : 0

  let scheduleStatus: string | null = null
  if (schedule) {
    const today = new Date().getDay()
    if (today === schedule.day) {
      scheduleStatus = prayedToday
        ? 'Session done for today ✓'
        : 'Session due today'
    } else {
      const until = (schedule.day - today + 7) % 7
      scheduleStatus = `Next session: ${DAYS[schedule.day]}${
        until === 1 ? ' (tomorrow)' : ''
      }`
    }
  }

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
        {showSetup && (
          <div className="card">
            <p className="card-meta">
              {plan ? 'Adjust your plan' : 'Set up your reading plan'}
            </p>
            <div className="setup-row">
              <select
                className="sel-book"
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
                className="sel-goaltype"
                value={goalType}
                onChange={(e) =>
                  setGoalType(e.target.value as 'chapters' | 'minutes')
                }
              >
                <option value="chapters">Goal: chapters/day</option>
                <option value="minutes">Goal: minutes/day</option>
              </select>
              {goalType === 'chapters' ? (
                <select
                  className="sel-amount"
                  value={perDay}
                  onChange={(e) => setPerDay(+e.target.value)}
                >
                  {[1, 2, 3, 4, 5].map((n) => (
                    <option key={n} value={n}>
                      {n} chapter{n > 1 ? 's' : ''}
                    </option>
                  ))}
                </select>
              ) : (
                <select
                  className="sel-amount"
                  value={minutesPerDay}
                  onChange={(e) => setMinutesPerDay(+e.target.value)}
                >
                  {[10, 15, 20, 30, 45, 60].map((n) => (
                    <option key={n} value={n}>
                      {n} min
                    </option>
                  ))}
                </select>
              )}
            </div>
            <button className="primary" onClick={savePlan}>
              Start plan
            </button>
          </div>
        )}
        {!showSetup && plan && active && (
          <div className="card">
            <p className="card-meta">Reading session</p>
            <p className="card-text">How did it go?</p>
            <div className="minutes-row">
              <input
                className="minutes-input"
                type="number"
                min={1}
                max={600}
                value={minutesValue}
                onChange={(e) => setMinutesInput(+e.target.value || 1)}
              />
              <span>minutes</span>
            </div>
            <label className="check">
              <input
                type="checkbox"
                checked={meditated}
                onChange={(e) => setMeditated(e.target.checked)}
              />
              I also meditated afterward
            </label>
            <div className="stepper">
              <span>Chapters finished:</span>
              <button
                onClick={() => setChaptersDone(Math.max(0, chaptersValue - 1))}
              >
                −
              </button>
              <span>{chaptersValue}</span>
              <button
                onClick={() =>
                  setChaptersDone(Math.min(remaining, chaptersValue + 1))
                }
              >
                +
              </button>
            </div>
            <button className="primary" onClick={saveReading}>
              Save reading
            </button>
            <div className="actions center">
              <button onClick={discardReading}>Discard</button>
            </div>
          </div>
        )}
        {!showSetup && plan && !active && plan.position >= TOTAL_CHAPTERS && (
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
        {!showSetup && plan && !active && plan.position < TOTAL_CHAPTERS && (
          <div className="card">
            {planGoal === 'chapters' ? (
              <>
                <p className="card-meta">Today's reading</p>
                <p className="card-text ref">
                  {portionLabel(plan.position, plan.perDay)}
                </p>
              </>
            ) : (
              <>
                <p className="card-meta">Continue from</p>
                <p className="card-text ref">
                  {BOOKS[indexToRef(plan.position).book - 1]}{' '}
                  {indexToRef(plan.position).chapter}
                </p>
                <p className="card-meta">
                  Goal: {plan.minutesPerDay ?? 15} min/day
                  {minutesToday > 0 ? ` · ${minutesToday} min today ✓` : ''}
                </p>
              </>
            )}
            {planGoal === 'chapters' && readToday > 0 && (
              <p className="card-meta">
                ✓ {readToday} chapter{readToday > 1 ? 's' : ''} read today
              </p>
            )}
            <a
              className="primary linkbtn"
              href={finderUrl(indexToRef(plan.position))}
              target="_blank"
              rel="noreferrer"
              onClick={() => {
                void db.settings.put({
                  key: 'activeReading',
                  value: { startedAt: Date.now() },
                })
              }}
            >
              📖 Start reading
            </a>
            <div className="actions center">
              {planGoal === 'chapters' && (
                <button onClick={markRead}>Mark read (no timer)</button>
              )}
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
            {scheduleStatus ? ` · ${scheduleStatus}` : ''}
          </p>
          <button
            className="primary"
            disabled={activeCount === 0}
            onClick={() => setInSession(true)}
          >
            Start prayer session
          </button>
          <div className="setup-row spaced">
            <label className="check">
              Log for
              <input
                type="date"
                value={sessionDate}
                max={dateKey()}
                onChange={(e) => setSessionDate(e.target.value || dateKey())}
              />
            </label>
            <select
              className="sel-schedule"
              value={schedule ? String(schedule.day) : ''}
              onChange={(e) => {
                const v = e.target.value
                if (v === '') void db.settings.delete('sessionSchedule')
                else
                  void db.settings.put({
                    key: 'sessionSchedule',
                    value: { day: +v },
                  })
              }}
            >
              <option value="">No schedule</option>
              {DAYS.map((d, i) => (
                <option key={d} value={i}>
                  Weekly: {d}s
                </option>
              ))}
            </select>
          </div>
        </div>
      </section>
    </div>
  )
}
