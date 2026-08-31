export const toggleIn = (list: string[], t: string) =>
  list.includes(t) ? list.filter((x) => x !== t) : [...list, t]

export default function TagPicker({
  choices,
  selected,
  onToggle,
  newTag,
  onNewTagChange,
  onNewTagCommit,
  className = 'chips small',
}: {
  choices: string[]
  selected: string[]
  onToggle: (t: string) => void
  newTag: string
  onNewTagChange: (v: string) => void
  onNewTagCommit: () => void
  className?: string
}) {
  return (
    <div className={className}>
      {choices.map((t) => (
        <button
          key={t}
          className={selected.includes(t) ? 'chip on' : 'chip'}
          onClick={() => onToggle(t)}
        >
          {t}
        </button>
      ))}
      <input
        className="newtag"
        value={newTag}
        placeholder="+ tag"
        onChange={(e) => onNewTagChange(e.target.value)}
        onKeyDown={(e) => e.key === 'Enter' && onNewTagCommit()}
        onBlur={onNewTagCommit}
      />
    </div>
  )
}
