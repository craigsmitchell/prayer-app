# Prayer

A personal, offline-first PWA for prayer and Bible reading:

- **Capture** — jot down prayer thoughts fast, tag them later
- **Today** — daily reading portion with JW Library deep link, streaks,
  and one-tap prayer sessions
- **Prayers** — track when you've prayed about each item; mark items
  answered (with a note) or archive them
- **Scriptures** — save favorite verses by pasting JW Library / wol.jw.org
  share links; one tap reopens them in JW Library
- **More** — JSON backup export/import, session size

Sessions deal a hand of least-recently-prayed items, round-robin across
tags so no category gets forgotten. All data lives in IndexedDB on the
device — no accounts, no server.

## Roadmap

- Trends: calendar heatmap of prayer & reading

## Development

```
npm install
npm run dev       # local dev server
npm run build     # type-check + production build to dist/
```

Deploys automatically to GitHub Pages on push to `main`
(see `.github/workflows/deploy.yml`).

## Quick capture from the share sheet (iOS)

iOS doesn't let web apps register as share-sheet targets, but a Shortcut
bridges the gap: create a Shortcut that accepts URLs from the share sheet
and opens `https://<your-pages-url>/?add=[Shortcut Input]`. Sharing a
scripture from JW Library then lands directly on the Scriptures tab with
the link prefilled.
