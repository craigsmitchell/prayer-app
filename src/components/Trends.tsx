import { useEffect, useRef, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../db'
import { dateKey, streakFrom } from '../dates'

const WEEKS = 26
const MONTHS = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
]

interface DayInfo {
  prayed: number
  chapters: number
  minutes: number
  meditated: boolean
}

function Tile({ value, label }: { value: number | string; label: string }) {
  return (
    <div className="bigstat">
      <span className="bigstat-value">{value}</span>
      <span className="bigstat-label">{label}</span>
    </div>
  )
}

export default function Trends() {
  const prayerLogs = useLiveQuery(() => db.prayerLogs.toArray(), []) ?? []
  const readingLogs = useLiveQuery(() => db.readingLogs.toArray(), []) ?? []
  const readingSessions =
    useLiveQuery(() => db.readingSessions.toArray(), []) ?? []
  const answered =
    useLiveQuery(
      () => db.prayerItems.where('status').equals('answered').count(),
      [],
    ) ?? 0

  const [selected, setSelected] = useState(dateKey())
  const scrollRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const el = scrollRef.current
    if (el) el.scrollLeft = el.scrollWidth
  }, [])

  const days = new Map<string, DayInfo>()
  const day = (k: string): DayInfo => {
    let d = days.get(k)
    if (!d) {
      d = { prayed: 0, chapters: 0, minutes: 0, meditated: false }
      days.set(k, d)
    }
    return d
  }
  for (const l of prayerLogs) day(dateKey(new Date(l.prayedAt))).prayed++
  for (const l of readingLogs) day(l.dateKey).chapters++
  for (const s of readingSessions) {
    const d = day(s.dateKey)
    d.minutes += s.minutes
    if (s.meditated) d.meditated = true
  }

  const prayerDays = new Set<string>()
  const readingDays = new Set<string>()
  for (const [k, d] of days) {
    if (d.prayed > 0) prayerDays.add(k)
    if (d.chapters > 0 || d.minutes > 0) readingDays.add(k)
  }

  const todayKey = dateKey()
  const start = new Date()
  start.setDate(start.getDate() - start.getDay() - (WEEKS - 1) * 7)
  const weeks: { key: string; cls: string }[][] = []
  const monthLabels: string[] = []
  for (let w = 0; w < WEEKS; w++) {
    const col: { key: string; cls: string }[] = []
    let label = ''
    for (let dow = 0; dow < 7; dow++) {
      const d = new Date(start)
      d.setDate(start.getDate() + w * 7 + dow)
      const key = dateKey(d)
      if (d.getDate() === 1 && key <= todayKey) label = MONTHS[d.getMonth()]
      let cls = 'hm-cell'
      if (key > todayKey) {
        cls += ' hm-future'
      } else {
        const p = prayerDays.has(key)
        const r = readingDays.has(key)
        if (p && r) cls += ' hm-both'
        else if (p) cls += ' hm-pray'
        else if (r) cls += ' hm-read'
      }
      if (key === selected) cls += ' hm-sel'
      col.push({ key, cls })
    }
    monthLabels.push(label)
    weeks.push(col)
  }

  const info = days.get(selected)
  const detailDate = new Date(selected + 'T12:00:00').toLocaleDateString(
    undefined,
    { weekday: 'short', month: 'short', day: 'numeric' },
  )
  const parts: string[] = []
  if (info?.prayed)
    parts.push(`🙏 prayed${info.prayed > 1 ? ` ×${info.prayed}` : ''}`)
  if (info?.chapters)
    parts.push(`📖 ${info.chapters} chapter${info.chapters === 1 ? '' : 's'}`)
  if (info?.minutes) parts.push(`⏱ ${info.minutes} min`)
  if (info?.meditated) parts.push('🧘 meditated')

  const cutoff = new Date()
  cutoff.setDate(cutoff.getDate() - 29)
  const cutKey = dateKey(cutoff)
  let prayed30 = 0
  let minutes30 = 0
  let medDays30 = 0
  for (const [k, d] of days) {
    if (k < cutKey) continue
    prayed30 += d.prayed
    minutes30 += d.minutes
    if (d.meditated) medDays30++
  }

  return (
    <div className="screen">
      <h1>Trends</h1>

      <section className="today-section">
        <h2>Last 6 months</h2>
        <div className="hm-wrap">
          <div className="hm-gutter" aria-hidden="true">
            {['', 'M', '', 'W', '', 'F', ''].map((l, i) => (
              <span key={i}>{l}</span>
            ))}
          </div>
          <div className="hm-scroll" ref={scrollRef}>
            <div className="hm-months" aria-hidden="true">
              {monthLabels.map((m, i) => (
                <span key={i}>{m}</span>
              ))}
            </div>
            <div className="hm-grid">
              {weeks.map((col, i) => (
                <div className="hm-col" key={i}>
                  {col.map((c) => (
                    <button
                      key={c.key}
                      className={c.cls}
                      data-date={c.key}
                      aria-label={c.key}
                      onClick={() => setSelected(c.key)}
                    />
                  ))}
                </div>
              ))}
            </div>
          </div>
        </div>
        <p className="hm-detail">
          <strong>{detailDate}</strong>
          {' — '}
          {parts.length > 0 ? (
            parts.join(' · ')
          ) : (
            <span className="quiet">no activity logged</span>
          )}
        </p>
        <div className="hm-legend">
          <span>
            <i className="hm-pray" /> Prayed
          </span>
          <span>
            <i className="hm-read" /> Read
          </span>
          <span>
            <i className="hm-both" /> Both
          </span>
        </div>
      </section>

      <section className="today-section">
        <h2>Prayer</h2>
        <div className="bigstats">
          <Tile value={streakFrom(prayerDays)} label="Day streak" />
          <Tile value={prayed30} label="Prayers · 30 days" />
          <Tile value={answered} label="Answered · all time" />
        </div>
      </section>

      <section className="today-section">
        <h2>Reading</h2>
        <div className="bigstats">
          <Tile value={streakFrom(readingDays)} label="Day streak" />
          <Tile value={readingLogs.length} label="Chapters · all time" />
          <Tile value={minutes30} label="Minutes · 30 days" />
          <Tile value={medDays30} label="Meditation days · 30 days" />
        </div>
      </section>
    </div>
  )
}
