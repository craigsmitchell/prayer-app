import Dexie, { type EntityTable } from 'dexie'

export interface PrayerItem {
  id: number
  text: string
  tags: string[]
  status: 'active' | 'answered' | 'archived'
  createdAt: number
  lastPrayedAt?: number
  answeredAt?: number
  answeredNote?: string
}

export interface PrayerLog {
  id: number
  itemId: number
  prayedAt: number
}

export interface Scripture {
  id: number
  book: number
  chapter: number
  verseStart?: number
  verseEnd?: number
  note?: string
  url: string
  addedAt: number
}

export interface ReadingLog {
  id: number
  book: number
  chapter: number
  dateKey: string
  readAt: number
}

export interface Setting {
  key: string
  value: unknown
}

export const db = new Dexie('prayer-app') as Dexie & {
  prayerItems: EntityTable<PrayerItem, 'id'>
  prayerLogs: EntityTable<PrayerLog, 'id'>
  scriptures: EntityTable<Scripture, 'id'>
  readingLogs: EntityTable<ReadingLog, 'id'>
  settings: EntityTable<Setting, 'key'>
}

db.version(1).stores({
  prayerItems: '++id, status, createdAt, lastPrayedAt',
  prayerLogs: '++id, itemId, prayedAt',
  scriptures: '++id, addedAt',
})

db.version(2).stores({
  prayerItems: '++id, status, createdAt, lastPrayedAt',
  prayerLogs: '++id, itemId, prayedAt',
  scriptures: '++id, addedAt',
  readingLogs: '++id, dateKey, readAt',
  settings: '&key',
})
