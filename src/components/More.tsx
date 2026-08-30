import { useRef, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import {
  db,
  type PrayerItem,
  type PrayerLog,
  type ReadingLog,
  type Scripture,
  type Setting,
} from '../db'

interface Backup {
  exportedAt: string
  prayerItems: PrayerItem[]
  prayerLogs: PrayerLog[]
  scriptures: Scripture[]
  readingLogs?: ReadingLog[]
  settings?: Setting[]
}

export default function More() {
  const fileRef = useRef<HTMLInputElement>(null)
  const [status, setStatus] = useState('')

  const sessionSizeRow = useLiveQuery(() => db.settings.get('sessionSize'), [])
  const sessionSize =
    typeof sessionSizeRow?.value === 'number' ? sessionSizeRow.value : 5

  const exportData = async () => {
    const data: Backup = {
      exportedAt: new Date().toISOString(),
      prayerItems: await db.prayerItems.toArray(),
      prayerLogs: await db.prayerLogs.toArray(),
      scriptures: await db.scriptures.toArray(),
      readingLogs: await db.readingLogs.toArray(),
      settings: await db.settings.toArray(),
    }
    const json = JSON.stringify(data, null, 2)
    const blob = new Blob([json], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `prayer-backup-${new Date().toISOString().slice(0, 10)}.json`
    a.click()
    URL.revokeObjectURL(url)
    setStatus('Backup exported.')
  }

  const importData = async (file: File) => {
    try {
      const data = JSON.parse(await file.text()) as Backup
      await db.prayerItems.bulkPut(data.prayerItems ?? [])
      await db.prayerLogs.bulkPut(data.prayerLogs ?? [])
      await db.scriptures.bulkPut(data.scriptures ?? [])
      await db.readingLogs.bulkPut(data.readingLogs ?? [])
      await db.settings.bulkPut(data.settings ?? [])
      setStatus(
        `Imported ${data.prayerItems?.length ?? 0} prayers, ` +
          `${data.scriptures?.length ?? 0} scriptures (merged by id).`,
      )
    } catch {
      setStatus("Couldn't read that file — is it a backup from this app?")
    }
  }

  return (
    <div className="screen">
      <h1>More</h1>

      <section className="section">
        <h2>Backup</h2>
        <p className="hint">
          Your data lives only on this device. Export a backup now and then and
          save it to Files/Drive.
        </p>
        <div className="actions">
          <button className="act" onClick={exportData}>
            Export backup
          </button>
          <button onClick={() => fileRef.current?.click()}>Import</button>
          <input
            ref={fileRef}
            type="file"
            accept="application/json"
            hidden
            onChange={(e) => {
              const f = e.target.files?.[0]
              if (f) importData(f)
              e.target.value = ''
            }}
          />
        </div>
        {status && <p className="hint">{status}</p>}
      </section>

      <section className="section">
        <h2>Prayer sessions</h2>
        <p className="hint">How many items to pray through per session.</p>
        <select
          value={sessionSize}
          onChange={(e) =>
            db.settings.put({ key: 'sessionSize', value: +e.target.value })
          }
        >
          {[3, 5, 7, 10].map((n) => (
            <option key={n} value={n}>
              {n} items
            </option>
          ))}
        </select>
      </section>

      <section className="section">
        <h2>Coming next</h2>
        <ul className="roadmap">
          <li>Trends — calendar heatmap of prayer & reading</li>
        </ul>
      </section>
    </div>
  )
}
