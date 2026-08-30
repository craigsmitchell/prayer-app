import { chromium } from 'playwright'

const browser = await chromium.launch()
const page = await browser.newPage()
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

console.log('ERRORS:', errors.length ? errors.join('\n') : 'none')
await browser.close()
