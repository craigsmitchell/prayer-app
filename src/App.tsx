import { useEffect, useState } from 'react'
import Capture from './components/Capture'
import Today from './components/Today'
import Prayers from './components/Prayers'
import Scriptures from './components/Scriptures'
import Trends from './components/Trends'
import More from './components/More'

type Tab = 'capture' | 'today' | 'prayers' | 'scriptures' | 'trends' | 'more'

// iOS keeps separate storage per context: the installed home-screen app,
// Safari, and Chrome each get their own copy of our database — and plain
// browser tabs can have their storage evicted after ~7 days unused. Warn
// when we're running in a browser tab on an iOS device.
const isIOS =
  /iPhone|iPad|iPod/.test(navigator.userAgent) ||
  (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
const isStandalone =
  window.matchMedia('(display-mode: standalone)').matches ||
  (navigator as unknown as { standalone?: boolean }).standalone === true

const NUDGE_KEY = 'installNudgeDismissed'
const NUDGE_SNOOZE = 14 * 86_400_000

function nudgeDismissed(): boolean {
  try {
    const t = localStorage.getItem(NUDGE_KEY)
    return t !== null && Date.now() - +t < NUDGE_SNOOZE
  } catch {
    return true
  }
}

const TABS: [Tab, string, string][] = [
  ['capture', '✏️', 'Capture'],
  ['today', '📅', 'Today'],
  ['prayers', '🙏', 'Prayers'],
  ['scriptures', '📖', 'Scriptures'],
  ['trends', '📊', 'Trends'],
  ['more', '⚙️', 'More'],
]

export default function App() {
  const [tab, setTab] = useState<Tab>('capture')
  const [sharedLink, setSharedLink] = useState<string | null>(null)
  const [showNudge, setShowNudge] = useState(
    () => isIOS && !isStandalone && !nudgeDismissed(),
  )

  const dismissNudge = () => {
    try {
      localStorage.setItem(NUDGE_KEY, String(Date.now()))
    } catch {
      // storage unavailable — just hide for this visit
    }
    setShowNudge(false)
  }

  // ?add=<url> lets an iOS Shortcut (or Android share target) hand us a
  // scripture share link; we jump straight to the Scriptures tab with it.
  useEffect(() => {
    const params = new URLSearchParams(location.search)
    const add = params.get('add') ?? params.get('addtext')
    if (add) {
      setSharedLink(add)
      setTab('scriptures')
      history.replaceState(null, '', location.pathname)
    }
  }, [])

  return (
    <div className="app">
      <main className="content">
        {showNudge && (
          <div className="banner">
            <p>
              <strong>Heads-up:</strong> you're in a browser tab. Anything you
              save here stays in this browser only — it won't appear in the
              home-screen app, and iOS can clear a tab's data after ~7 days of
              not visiting.
            </p>
            <p>
              Tap <strong>Share → Add to Home Screen</strong> and use that app
              instead. Already saved things here? Export a backup under More,
              then import it in the installed app.
            </p>
            <button onClick={dismissNudge}>Got it</button>
          </div>
        )}
        {tab === 'capture' && <Capture />}
        {tab === 'today' && <Today />}
        {tab === 'prayers' && <Prayers />}
        {tab === 'scriptures' && (
          <Scriptures
            sharedLink={sharedLink}
            onSharedConsumed={() => setSharedLink(null)}
          />
        )}
        {tab === 'trends' && <Trends />}
        {tab === 'more' && <More />}
      </main>
      <nav className="tabbar">
        {TABS.map(([id, icon, label]) => (
          <button
            key={id}
            className={tab === id ? 'tab active' : 'tab'}
            onClick={() => setTab(id)}
          >
            <span className="tab-icon">{icon}</span>
            <span className="tab-label">{label}</span>
          </button>
        ))}
      </nav>
    </div>
  )
}
