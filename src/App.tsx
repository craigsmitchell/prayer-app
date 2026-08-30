import { useEffect, useState } from 'react'
import Capture from './components/Capture'
import Prayers from './components/Prayers'
import Scriptures from './components/Scriptures'
import More from './components/More'

type Tab = 'capture' | 'prayers' | 'scriptures' | 'more'

const TABS: [Tab, string, string][] = [
  ['capture', '✏️', 'Capture'],
  ['prayers', '🙏', 'Prayers'],
  ['scriptures', '📖', 'Scriptures'],
  ['more', '⚙️', 'More'],
]

export default function App() {
  const [tab, setTab] = useState<Tab>('capture')
  const [sharedLink, setSharedLink] = useState<string | null>(null)

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
        {tab === 'capture' && <Capture />}
        {tab === 'prayers' && <Prayers />}
        {tab === 'scriptures' && (
          <Scriptures
            sharedLink={sharedLink}
            onSharedConsumed={() => setSharedLink(null)}
          />
        )}
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
