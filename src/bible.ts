// Bible book names, indexed by book number - 1 (1 = Genesis ... 66 = Revelation)
export const BOOKS = [
  'Genesis', 'Exodus', 'Leviticus', 'Numbers', 'Deuteronomy', 'Joshua',
  'Judges', 'Ruth', '1 Samuel', '2 Samuel', '1 Kings', '2 Kings',
  '1 Chronicles', '2 Chronicles', 'Ezra', 'Nehemiah', 'Esther', 'Job',
  'Psalms', 'Proverbs', 'Ecclesiastes', 'Song of Solomon', 'Isaiah',
  'Jeremiah', 'Lamentations', 'Ezekiel', 'Daniel', 'Hosea', 'Joel', 'Amos',
  'Obadiah', 'Jonah', 'Micah', 'Nahum', 'Habakkuk', 'Zephaniah', 'Haggai',
  'Zechariah', 'Malachi', 'Matthew', 'Mark', 'Luke', 'John', 'Acts',
  'Romans', '1 Corinthians', '2 Corinthians', 'Galatians', 'Ephesians',
  'Philippians', 'Colossians', '1 Thessalonians', '2 Thessalonians',
  '1 Timothy', '2 Timothy', 'Titus', 'Philemon', 'Hebrews', 'James',
  '1 Peter', '2 Peter', '1 John', '2 John', '3 John', 'Jude', 'Revelation',
]

export interface ScriptureRef {
  book: number
  chapter: number
  verseStart?: number
  verseEnd?: number
}

export function formatRef(r: ScriptureRef): string {
  const name = BOOKS[r.book - 1] ?? `Book ${r.book}`
  let s = `${name} ${r.chapter}`
  if (r.verseStart) {
    s += `:${r.verseStart}`
    if (r.verseEnd && r.verseEnd !== r.verseStart) s += `-${r.verseEnd}`
  }
  return s
}

// Canonical jw.org "finder" URL — opens in the JW Library app when installed,
// falls back to the web version otherwise. bible= codes are BBCCCVVV.
export function finderUrl(r: ScriptureRef): string {
  const pad = (n: number, w: number) => String(n).padStart(w, '0')
  const code = (v: number) => `${pad(r.book, 2)}${pad(r.chapter, 3)}${pad(v, 3)}`
  let bible = code(r.verseStart ?? 1)
  if (r.verseEnd && r.verseEnd !== (r.verseStart ?? 1)) {
    bible += `-${code(r.verseEnd)}`
  }
  return `https://www.jw.org/finder?wtlocale=E&prefer=lang&bible=${bible}&pub=nwtsty`
}

function valid(r: ScriptureRef): boolean {
  return r.book >= 1 && r.book <= 66 && r.chapter >= 1 && r.chapter <= 176
}

// Accepts share links from JW Library (jw.org/finder?...bible=BBCCCVVV or a
// BBCCCVVV-BBCCCVVV range) and wol.jw.org chapter URLs (.../nwtsty/BB/CC).
export function parseScriptureLink(input: string): ScriptureRef | null {
  const finder = input.match(/[?&]bible=(\d{8})(?:-(\d{8}))?/)
  if (finder) {
    const start = finder[1]
    const ref: ScriptureRef = {
      book: +start.slice(0, 2),
      chapter: +start.slice(2, 5),
    }
    const v = +start.slice(5, 8)
    if (v) ref.verseStart = v
    if (finder[2]) {
      const endVerse = +finder[2].slice(5, 8)
      if (endVerse) ref.verseEnd = endVerse
    }
    return valid(ref) ? ref : null
  }

  const wol = input.match(/wol\.jw\.org\/\S*?\/(\d{1,2})\/(\d{1,3})(?:[#?/]|\s|$)/)
  if (wol) {
    const ref: ScriptureRef = { book: +wol[1], chapter: +wol[2] }
    return valid(ref) ? ref : null
  }

  return null
}
