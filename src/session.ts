import type { PrayerItem } from './db'

// Deal a hand of up to `n` items: least-recently-prayed first (never-prayed
// counts as oldest), round-robin across tags so one big category can't
// crowd out the others.
export function dealSession(items: PrayerItem[], n: number): PrayerItem[] {
  const sorted = [...items].sort(
    (a, b) => (a.lastPrayedAt ?? 0) - (b.lastPrayedAt ?? 0),
  )
  const groups = new Map<string, PrayerItem[]>()
  for (const item of sorted) {
    const key = item.tags[0] ?? ''
    const group = groups.get(key)
    if (group) group.push(item)
    else groups.set(key, [item])
  }
  const queues = [...groups.values()]
  const hand: PrayerItem[] = []
  let i = 0
  while (hand.length < n && queues.some((q) => q.length > 0)) {
    const next = queues[i % queues.length].shift()
    if (next) hand.push(next)
    i++
  }
  return hand
}
