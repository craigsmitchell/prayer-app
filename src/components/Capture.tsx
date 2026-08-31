import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../db'
import TagPicker, { toggleIn } from './TagPicker'

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
      <TagPicker
        className="chips"
        choices={tagChoices}
        selected={selected}
        onToggle={(t) => setSelected((s) => toggleIn(s, t))}
        newTag={newTag}
        onNewTagChange={setNewTag}
        onNewTagCommit={addNewTag}
      />
      <button className="primary" onClick={save} disabled={!text.trim()}>
        Save
      </button>
      {saved && <div className="toast">Saved 🙏</div>}
    </div>
  )
}
