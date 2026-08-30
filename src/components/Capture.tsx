import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../db'

export default function Capture() {
  const [text, setText] = useState('')
  const [selected, setSelected] = useState<string[]>([])
  const [newTag, setNewTag] = useState('')
  const [saved, setSaved] = useState(false)

  const existingTags =
    useLiveQuery(async () => {
      const items = await db.prayerItems.toArray()
      return [...new Set(items.flatMap((i) => i.tags))].sort()
    }, []) ?? []

  const tagChoices = [...new Set([...existingTags, ...selected])].sort()

  const toggleTag = (t: string) =>
    setSelected((s) => (s.includes(t) ? s.filter((x) => x !== t) : [...s, t]))

  const addNewTag = () => {
    const t = newTag.trim()
    if (t && !selected.includes(t)) setSelected((s) => [...s, t])
    setNewTag('')
  }

  const save = async () => {
    const body = text.trim()
    if (!body) return
    await db.prayerItems.add({
      text: body,
      tags: selected,
      status: 'active',
      createdAt: Date.now(),
    })
    setText('')
    setSelected([])
    setSaved(true)
    setTimeout(() => setSaved(false), 1600)
  }

  return (
    <div className="screen">
      <h1>What's on your mind?</h1>
      <textarea
        autoFocus
        rows={5}
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Jot it down now — pray about it later"
      />
      <div className="chips">
        {tagChoices.map((t) => (
          <button
            key={t}
            className={selected.includes(t) ? 'chip on' : 'chip'}
            onClick={() => toggleTag(t)}
          >
            {t}
          </button>
        ))}
        <input
          className="newtag"
          value={newTag}
          placeholder="+ tag"
          onChange={(e) => setNewTag(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && addNewTag()}
          onBlur={addNewTag}
        />
      </div>
      <button className="primary" onClick={save} disabled={!text.trim()}>
        Save
      </button>
      {saved && <div className="toast">Saved 🙏</div>}
    </div>
  )
}
