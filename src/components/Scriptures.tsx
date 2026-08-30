import { useEffect, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../db'
import { finderUrl, formatRef, parseScriptureLink } from '../bible'

export default function Scriptures({
  sharedLink,
  onSharedConsumed,
}: {
  sharedLink: string | null
  onSharedConsumed: () => void
}) {
  const [input, setInput] = useState('')
  const [note, setNote] = useState('')
  const [error, setError] = useState('')

  const scriptures =
    useLiveQuery(() => db.scriptures.orderBy('addedAt').reverse().toArray(), []) ??
    []

  useEffect(() => {
    if (sharedLink) {
      setInput(sharedLink)
      onSharedConsumed()
    }
  }, [sharedLink, onSharedConsumed])

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
      url: finderUrl(parsed),
      addedAt: Date.now(),
    })
    setInput('')
    setNote('')
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

      <ul className="cards">
        {scriptures.map((s) => (
          <li key={s.id} className="card">
            <p className="card-text ref">{formatRef(s)}</p>
            {s.note && <p className="card-meta">{s.note}</p>}
            <div className="actions">
              <a className="act linkbtn" href={s.url} target="_blank" rel="noreferrer">
                Open in JW Library
              </a>
              <button
                className="danger"
                onClick={() => db.scriptures.delete(s.id)}
              >
                Delete
              </button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}
