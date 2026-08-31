import { chromium } from 'playwright'

const browser = await chromium.launch()
const context = await browser.newContext({
  permissions: ['clipboard-read', 'clipboard-write'],
})
const page = await context.newPage()
const errors = []
page.on('pageerror', (e) => errors.push('pageerror: ' + e.message))
page.on('console', (m) => {
  if (m.type() === 'error') errors.push('console: ' + m.text())
})

await page.goto('http://localhost:4173/prayer-app/', {
  waitUntil: 'networkidle',
  timeout: 20000,
})
await page.waitForTimeout(800)

const mounted = await page.evaluate(() => document.body.innerText)
console.log(
  'MOUNTED:',
  mounted.includes("What's on your mind")
    ? 'yes'
    : 'NO — ' + JSON.stringify(mounted.slice(0, 200)),
)

// end-to-end: capture a prayer, add a tag, then find it on the Prayers tab
await page.fill('textarea', 'Test prayer item')
await page.fill('.newtag', 'family')
await page.keyboard.press('Enter')
await page.click('button.primary')
await page.waitForTimeout(400)
await page.click('.tab:has-text("Prayers")')
await page.waitForTimeout(400)
let list = await page.evaluate(() => document.body.innerText)
console.log(
  'PERSISTED:',
  list.includes('Test prayer item') && list.includes('family')
    ? 'yes (text + tag)'
    : 'NO — ' + JSON.stringify(list.slice(0, 300)),
)

// edit the item: change its text, keep the old tag, add a new one
await page.click('button:text-is("Edit")')
await page.fill('.editbox textarea', 'Test prayer item (edited)')
await page.fill('.editbox .newtag', 'health')
await page.keyboard.press('Enter')
await page.click('.editbox button:text-is("Save")')
await page.waitForTimeout(300)
list = await page.evaluate(() => document.body.innerText)
console.log(
  'PRAYER EDIT:',
  list.includes('Test prayer item (edited)') &&
    list.includes('family') &&
    list.includes('health')
    ? 'yes (text changed, tag kept + tag added)'
    : 'NO — ' + JSON.stringify(list.slice(0, 300)),
)

// mark prayed, then answered
await page.click('button:has-text("Prayed")')
await page.waitForTimeout(300)
list = await page.evaluate(() => document.body.innerText)
console.log('PRAYED LOGGED:', list.includes('last prayed: today') ? 'yes' : 'NO')
await page.click('button:text-is("✓ Answered")')
await page.fill('.answer-note input', 'It worked out')
await page.click('.answer-note button:has-text("Save")')
await page.waitForTimeout(300)
await page.click('.chip:has-text("answered")')
await page.waitForTimeout(300)
list = await page.evaluate(() => document.body.innerText)
console.log(
  'ANSWERED:',
  list.includes('It worked out') ? 'yes (with note)' : 'NO — ' + JSON.stringify(list.slice(0, 300)),
)

// scriptures: paste a JW Library share link, expect parsed reference
await page.click('.tab:has-text("Scriptures")')
await page.fill(
  '.addbox input >> nth=0',
  'https://www.jw.org/finder?srcid=jwlshare&wtlocale=E&prefer=lang&bible=19040001-19040003&pub=nwtsty',
)
await page.click('button:has-text("Add")')
await page.waitForTimeout(300)
list = await page.evaluate(() => document.body.innerText)
console.log(
  'SCRIPTURE PARSED:',
  list.includes('Psalms 40:1-3') ? 'yes (Psalms 40:1-3)' : 'NO — ' + JSON.stringify(list.slice(0, 300)),
)

// clipboard flow: JW Library share → Copy → paste button
await page.evaluate(() =>
  navigator.clipboard.writeText(
    'https://www.jw.org/finder?srcid=jwlshare&wtlocale=E&prefer=lang&bible=28014001&pub=nwtsty',
  ),
)
await page.click('button:text-is("📋 Paste from clipboard")')
await page.waitForTimeout(300)
list = await page.evaluate(() => document.body.innerText)
console.log(
  'PASTE ADD:',
  list.includes('Hosea 14:1') ? 'yes (Hosea 14:1)' : 'NO — ' + JSON.stringify(list.slice(0, 300)),
)

// edit a saved scripture: add the note + a tag after the fact, then filter
await page.click('.card:has-text("Hosea 14:1") button:text-is("Edit")')
await page.fill('.editbox input[placeholder^="Why"]', 'Return to Jehovah')
await page.fill('.editbox .newtag', 'comfort')
await page.keyboard.press('Enter')
await page.click('.editbox button:text-is("Save")')
await page.waitForTimeout(300)
list = await page.evaluate(() => document.body.innerText)
console.log(
  'SCRIPTURE EDIT:',
  list.includes('Return to Jehovah') && list.includes('comfort')
    ? 'yes (note + tag added after save)'
    : 'NO — ' + JSON.stringify(list.slice(0, 300)),
)
await page.click('.filterbar .chip:text-is("comfort")')
await page.waitForTimeout(300)
list = await page.evaluate(() => document.body.innerText)
const filteredOk = list.includes('Hosea 14:1') && !list.includes('Psalms 40:1-3')
await page.click('.filterbar .chip:text-is("All")')
await page.waitForTimeout(300)
list = await page.evaluate(() => document.body.innerText)
console.log(
  'TAG FILTER:',
  filteredOk && list.includes('Psalms 40:1-3')
    ? 'yes (comfort → Hosea only, All → both)'
    : 'NO — ' + JSON.stringify(list.slice(0, 300)),
)

// reading plan: defaults (Genesis 1, 3/day), mark today's portion read
await page.click('.tab:has-text("Today")')
await page.click('button:text-is("Start plan")')
await page.waitForTimeout(300)
list = await page.evaluate(() => document.body.innerText)
console.log(
  'PLAN SET:',
  list.includes('Genesis 1-3') ? 'yes (Genesis 1-3)' : 'NO — ' + JSON.stringify(list.slice(0, 300)),
)
await page.click('button:text-is("Mark read (no timer)")')
await page.waitForTimeout(300)
list = await page.evaluate(() => document.body.innerText)
console.log(
  'READ LOGGED:',
  list.includes('Genesis 4-6') &&
    list.includes('3 chapters read today') &&
    list.includes('📖 1-day')
    ? 'yes (advanced to Genesis 4-6, streak 1)'
    : 'NO — ' + JSON.stringify(list.slice(0, 400)),
)

// switch the plan to a minutes/day goal and run a timed reading session
await page.click('button:text-is("Adjust")')
await page.selectOption('.sel-goaltype', 'minutes')
await page.click('button:text-is("Start plan")')
await page.waitForTimeout(300)
list = await page.evaluate(() => document.body.innerText)
console.log(
  'MINUTES MODE:',
  list.includes('Continue from') &&
    list.includes('Genesis 4') &&
    list.includes('Goal: 15 min/day')
    ? 'yes (continue from Genesis 4)'
    : 'NO — ' + JSON.stringify(list.slice(0, 400)),
)
await page.click('a:has-text("Start reading")')
await page.waitForTimeout(500)
await page.fill('.minutes-input', '17')
await page.check('.check input[type="checkbox"]')
await page.click('button:text-is("Save reading")')
await page.waitForTimeout(300)
list = await page.evaluate(() => document.body.innerText)
console.log(
  'TIMED READING:',
  list.includes('17 min today ✓')
    ? 'yes (17 min + meditation logged)'
    : 'NO — ' + JSON.stringify(list.slice(0, 400)),
)

// session: capture two items, deal a hand, pray through it
await page.click('.tab:has-text("Capture")')
await page.fill('textarea', 'Item A')
await page.click('button.primary')
await page.waitForTimeout(300)
await page.fill('textarea', 'Item B')
await page.click('button.primary')
await page.waitForTimeout(300)
await page.click('.tab:has-text("Today")')
await page.click('button:text-is("Start prayer session")')
await page.waitForTimeout(300)
list = await page.evaluate(() => document.body.innerText)
console.log(
  'SESSION START:',
  list.includes('1 of 2') ? 'yes (1 of 2)' : 'NO — ' + JSON.stringify(list.slice(0, 300)),
)
await page.click('button:text-is("🙏 Prayed")')
await page.waitForTimeout(200)
await page.click('button:text-is("🙏 Prayed")')
await page.waitForTimeout(300)
list = await page.evaluate(() => document.body.innerText)
console.log(
  'SESSION COMPLETE:',
  list.includes('Session complete') &&
    list.includes('prayed over 2') &&
    list.includes('A favorite scripture for today')
    ? 'yes (2 items + favorite scripture shown)'
    : 'NO — ' + JSON.stringify(list.slice(0, 400)),
)

// trends: today's heatmap cell should show both habits, tiles should add up
await page.click('button:text-is("Done")')
await page.waitForTimeout(300)
await page.click('.tab:has-text("Trends")')
await page.waitForTimeout(400)
const todayKey = await page.evaluate(() => {
  const d = new Date()
  const p = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`
})
const cellCls = await page.getAttribute(`.hm-cell[data-date="${todayKey}"]`, 'class')
console.log(
  'HEATMAP CELL:',
  cellCls?.includes('hm-both') && cellCls?.includes('hm-sel')
    ? 'yes (today = prayed + read, selected)'
    : 'NO — ' + cellCls,
)
list = await page.evaluate(() => document.body.innerText)
console.log(
  'DAY DETAIL:',
  list.includes('prayed ×3') &&
    list.includes('3 chapters') &&
    list.includes('17 min') &&
    list.includes('meditated')
    ? 'yes (prayed ×3 · 3 chapters · 17 min · meditated)'
    : 'NO — ' + JSON.stringify(list.slice(0, 400)),
)
const chaptersStat = await page
  .locator('.bigstat:has-text("Chapters") .bigstat-value')
  .innerText()
const minutesStat = await page
  .locator('.bigstat:has-text("Minutes") .bigstat-value')
  .innerText()
const answeredStat = await page
  .locator('.bigstat:has-text("Answered") .bigstat-value')
  .innerText()
console.log(
  'TREND STATS:',
  chaptersStat === '3' && minutesStat === '17' && answeredStat === '1'
    ? 'yes (3 chapters, 17 min, 1 answered)'
    : `NO — chapters=${chaptersStat} minutes=${minutesStat} answered=${answeredStat}`,
)
await page.screenshot({ path: 'smoke-trends.png', fullPage: true })

// browser-tab warning: shows on an iOS user agent outside standalone mode,
// dismissible; must NOT have shown in the desktop context above
const nudgeAbsentOnDesktop = !(
  await page.evaluate(() => document.body.innerText)
).includes('Add to Home Screen')
const iphone = await browser.newContext({
  userAgent:
    'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1',
  viewport: { width: 390, height: 844 },
})
const ipage = await iphone.newPage()
await ipage.goto('http://localhost:4173/prayer-app/', {
  waitUntil: 'networkidle',
  timeout: 20000,
})
await ipage.waitForTimeout(600)
let itext = await ipage.evaluate(() => document.body.innerText)
const nudgeShown = itext.includes('Add to Home Screen')
await ipage.click('.banner button:text-is("Got it")')
await ipage.waitForTimeout(200)
itext = await ipage.evaluate(() => document.body.innerText)
console.log(
  'INSTALL NUDGE:',
  nudgeAbsentOnDesktop && nudgeShown && !itext.includes('Add to Home Screen')
    ? 'yes (iOS browser tab only, dismissible)'
    : `NO — desktopClean=${nudgeAbsentOnDesktop} shown=${nudgeShown}`,
)
await iphone.close()

console.log('ERRORS:', errors.length ? errors.join('\n') : 'none')
await browser.close()
