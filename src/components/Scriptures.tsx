import { useEffect, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db, type Scripture } from '../db'
import { finderUrl, formatRef, parseScriptureLink } from '../bible'
import TagPicker, { toggleIn } from './TagPicker'

export default function Scriptures({
  sharedLink,
  onSharedConsumed,
}: {
  sharedLink: string | null
  onSharedConsumed: () => void
}) {
  const [input, setInput] = useState('')
  const [note, setNote] = useState('')
  const [selected, setSelected] = useState<string[]>([])
  const [newTag, setNewTag] = useState('')
  const [filter, setFilter] = useState<string[]>([])
  const [error, setError] = useState('')
  const [editingId, setEditingId] = useState<number | null>(null)
  const [editNote, setEditNote] = useState('')
  const [editTags, setEditTags] = useState<string[]>([])
  const [editNewTag, setEditNewTag] = useState('')

  const scriptures =
    useLiveQuery(() => db.scriptures.orderBy('addedAt').reverse().toArray(), []) ??
    []

  // Scripture tags are their own namespace — derived only from scriptures,
  // never from prayer items.
  const existingTags = [
    ...new Set(scriptures.flatMap((s) => s.tags ?? [])),
  ].sort()

  useEffect(() => {
    if (sharedLink) {
      setInput(sharedLink)
      onSharedConsumed()
    }
  }, [sharedLink, onSharedConsumed])

  const commitNewTag = () => {
    const t = newTag.trim()
    if (t && !selected.includes(t)) setSelected((s) => [...s, t])
    setNewTag('')
  }

  const commitEditNewTag = () => {
    const t = editNewTag.trim()
    if (t && !editTags.includes(t)) setEditTags((s) => [...s, t])
    setEditNewTag('')
  }

  const addFrom = async (text: string) => {
    const parsed = parseScriptureLink(text.trim())
    if (!parsed) {
      setError(
        "Couldn't read that — paste a scripture share link from JW Library or wol.jw.org.",
      )
      return false
    }
    await db.scriptures.add({
      ...parsed,
      note: note.trim() || undefined,
      tags: selected,
      url: finderUrl(parsed),
      addedAt: Date.now(),
    })
    setInput('')
    setNote('')
    setSelected([])
    setError('')
    return true
  }

  const add = () => addFrom(input)

  // In JW Library: tap the verse → Share → Copy, then hit this button.
  const pasteAndAdd = async () => {
    let text = ''
    try {
      text = await navigator.clipboard.readText()
    } catch {
      setError("Couldn't read the clipboard — paste the link manually above.")
      return
    }
    if (!text.trim()) {
      setError('The clipboard is empty — copy a share link first.')
      return
    }
    if (!(await addFrom(text))) setInput(text)
  }

  const startEdit = (s: Scripture) => {
    setEditingId(s.id)
    setEditNote(s.note ?? '')
    setEditTags(s.tags ?? [])
    setEditNewTag('')
  }

  const saveEdit = async () => {
    if (editingId === null) return
    await db.scriptures.update(editingId, {
      note: editNote.trim() || undefined,
      tags: editTags,
    })
    setEditingId(null)
  }

  const visible = filter.length
    ? scriptures.filter((s) => filter.some((t) => (s.tags ?? []).includes(t)))
    : scriptures

  return (
    <div className="screen">
      <h1>Favorite scriptures</h1>
      <div className="addbox">
        <input
          value={input}
          placeholder="Paste a share link from JW Library…"
          onChange={(e) => {
            setInput(e.target.value)
            setError('')
          }}
        />
        <input
          value={note}
          placeholder="Why it matters to you (optional)"
          onChange={(e) => setNote(e.target.value)}
        />
        <TagPicker
          choices={[...new Set([...existingTags, ...selected])].sort()}
          selected={selected}
          onToggle={(t) => setSelected((s) => toggleIn(s, t))}
          newTag={newTag}
          onNewTagChange={setNewTag}
          onNewTagCommit={commitNewTag}
        />
        {input.trim() ? (
          <button className="primary" onClick={add}>
            Add
          </button>
        ) : (
          <button className="primary" onClick={pasteAndAdd}>
            📋 Paste from clipboard
          </button>
        )}
        {error && <p className="error">{error}</p>}
      </div>

      {scriptures.length === 0 && !error && (
        <p className="empty">
          In JW Library: tap a verse → Share → Copy, then come back and hit
          Paste.
        </p>
      )}

      {existingTags.length > 0 && (
        <div className="chips filterbar">
          <button
            className={filter.length === 0 ? 'chip on' : 'chip'}
            onClick={() => setFilter([])}
          >
            All
          </button>
          {existingTags.map((t) => (
            <button
              key={t}
              className={filter.includes(t) ? 'chip on' : 'chip'}
              onClick={() => setFilter((f) => toggleIn(f, t))}
            >
              {t}
            </button>
          ))}
        </div>
      )}

      {visible.length === 0 && filter.length > 0 && (
        <p className="empty">No scriptures with that tag.</p>
      )}

      <ul className="cards">
        {visible.map((s) => (
          <li key={s.id} className="card">
            <p className="card-text ref">{formatRef(s)}</p>
            {editingId === s.id ? (
              <div className="editbox">
                <input
                  value={editNote}
                  placeholder="Why it matters to you (optional)"
                  onChange={(e) => setEditNote(e.target.value)}
                />
                <TagPicker
                  choices={[...new Set([...existingTags, ...editTags])].sort()}
                  selected={editTags}
                  onToggle={(t) => setEditTags((s2) => toggleIn(s2, t))}
                  newTag={editNewTag}
                  onNewTagChange={setEditNewTag}
                  onNewTagCommit={commitEditNewTag}
                />
                <div className="actions">
                  <button className="act" onClick={saveEdit}>
                    Save
                  </button>
                  <button onClick={() => setEditingId(null)}>Cancel</button>
                </div>
              </div>
            ) : (
              <>
                {(s.tags?.length ?? 0) > 0 && (
                  <p className="card-tags">{s.tags?.join(' · ')}</p>
                )}
                {s.note && <p className="card-meta">{s.note}</p>}
                <div className="actions">
                  <a
                    className="act linkbtn"
                    href={s.url}
                    target="_blank"
                    rel="noreferrer"
                  >
                    Open in JW Library
                  </a>
                  <button onClick={() => startEdit(s)}>Edit</button>
                  <button
                    className="danger"
                    onClick={() => db.scriptures.delete(s.id)}
                  >
                    Delete
                  </button>
                </div>
              </>
            )}
          </li>
        ))}
      </ul>
    </div>
  )
}
