export function dateKey(d: Date = new Date()): string {
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${d.getFullYear()}-${m}-${day}`
}

// Consecutive days ending today (or yesterday, so a streak isn't "broken"
// before you've had the chance to act today).
export function streakFrom(days: Set<string>): number {
  let streak = 0
  const d = new Date()
  if (!days.has(dateKey(d))) d.setDate(d.getDate() - 1)
  while (days.has(dateKey(d))) {
    streak++
    d.setDate(d.getDate() - 1)
  }
  return streak
}
