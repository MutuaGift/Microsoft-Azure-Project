// Real-browser smoke test against a running server (default http://localhost:8000).
// Usage: CHROME_PATH=/usr/bin/google-chrome BASE_URL=http://localhost:8000 npm test
import puppeteer from 'puppeteer-core'
import assert from 'node:assert/strict'

const BASE = process.env.BASE_URL ?? 'http://localhost:8000'
const browser = await puppeteer.launch({ executablePath: process.env.CHROME_PATH ?? '/usr/bin/google-chrome', headless: true, args: ['--no-sandbox'] })
const page = await browser.newPage()
await page.setViewport({ width: 390, height: 844 })
const problems = []
page.on('pageerror', (e) => problems.push(`pageerror: ${e.message}`))
page.on('console', (m) => { if (m.type() === 'error') problems.push(`console: ${m.text()}`) })
page.on('dialog', (d) => d.accept())

const text = () => page.$eval('main', (m) => m.innerText)
const clickText = async (sel, label) => {
  const els = await page.$$(sel)
  for (const el of els) if ((await el.evaluate((n) => n.innerText)).includes(label)) { await el.click(); return }
  throw new Error(`no ${sel} with text "${label}"`)
}
const waitText = (re) => page.waitForFunction((src) => new RegExp(src).test(document.querySelector('main').innerText), { timeout: 8000 }, re.source)
const step = async (name, fn) => { await fn(); console.log('ok -', name) }

await page.goto(BASE, { waitUntil: 'networkidle0' })

await step('home loads with unofficial label and 11 skill tiles', async () => {
  await waitText(/Take your first quiz/)
  assert.match(await page.$eval('body', (b) => b.innerText), /Unofficial/)
  assert.equal((await page.$$('.tile')).length, 11)
})
await step('quick quiz: 10 questions with feedback and results', async () => {
  await clickText('main button', 'Start 10-question quiz')
  for (let i = 0; i < 10; i++) {
    await page.waitForSelector('.opt')
    await page.click('.opt')
    await page.waitForSelector('.fb')
    assert.match(await text(), /Think of it like this/)
    await clickText('main button', i === 9 ? 'See results' : 'Next')
  }
  await waitText(/Quiz complete/)
})
await step('progress shows server-computed analytics and a badge', async () => {
  await clickText('nav button', 'Progress')
  await waitText(/By skill/)
  assert.ok((await page.$$('.bdg.on')).length >= 1)
  await page.waitForFunction(() => [...document.querySelectorAll('table.table tbody tr')].some((r) => r.children[2].innerText !== '–'), { timeout: 8000 })
})
await step('mock exam: 30 questions, answer, submit, review', async () => {
  await clickText('nav button', 'Mock exam')
  await clickText('main button', 'Start mock exam')
  await waitText(/Question 1 of 30/)
  await page.click('.opt')
  await clickText('main button', 'Submit exam')
  await waitText(/Mock exam result/)
})
await step('flashcards: flip and rate', async () => {
  await clickText('nav button', 'Flashcards')
  await page.waitForSelector('.flash')
  await page.click('.flash')
  await clickText('main button', 'I knew it')
})
await step('AI buddy answers (offline notes when no server key)', async () => {
  await clickText('nav button', 'AI Buddy')
  await clickText('main button', 'availability zone')
  await waitText(/Availability zone/i)
})
await step('study plan builds from an exam date', async () => {
  await clickText('nav button', 'Study plan')
  const d = new Date(Date.now() + 14 * 864e5), k = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
  await page.$eval('input[type=date]', (el, v) => { const s = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set; s.call(el, v); el.dispatchEvent(new Event('input', { bubbles: true })) }, k)
  await clickText('main button', 'Build plan')
  await page.waitForSelector('table.table tbody tr')
  assert.ok((await page.$$('table.table tbody tr')).length >= 14)
  assert.match(await text(), /mock exam/i)
})
await step('progress persists after reload', async () => {
  await page.reload({ waitUntil: 'networkidle0' })
  await clickText('nav button', 'Progress')
  await waitText(/By exam area/)
  assert.ok((await page.$$('.bdg.on')).length >= 1)
})

await browser.close()
assert.deepEqual(problems, [], 'no console or page errors')
console.log('all e2e checks passed')
