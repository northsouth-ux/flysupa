#!/usr/bin/env node
// Capture the screenshots used in the fs-app documentation (Mintlify).
//
// Usage:
//   npm run seed:demo && npm run docs:screenshots
//
// Needs the local stack: Supabase on 127.0.0.1:54321 and Vite on localhost:5173.
// Runs in a visible Chrome window so the capture can be followed; set HEADLESS=1 to hide it.
// Only opens dialogs and cancels them, so the demo data is left unchanged.
// Every screenshot is taken in both themes: <name>.png (light) and <name>-dark.png (dark).
// Set THEME=light or THEME=dark to capture only one.
// Output goes to .local/docs-screenshots (gitignored).
import { chromium } from 'playwright'
import { execSync } from 'node:child_process'
import { mkdirSync } from 'node:fs'

const BASE = 'http://localhost:5173'
const OUT = '.local/docs-screenshots'
const STUDENT_EMAIL = 'demo-allievo-1@flysupa.test'

// Environment and branch badges only exist in development
const HIDE_DEV_BADGES = `
  nav div.flex.items-center.gap-1\\.5 { display: none !important; }
  html::-webkit-scrollbar { display: none; }
`

const db = (sql) => execSync(`docker exec supabase_db_flysupa psql -U postgres -tAc "${sql}"`, { encoding: 'utf8' }).trim()

mkdirSync(OUT, { recursive: true })

const headless = process.env.HEADLESS === '1'
const browser = await chromium.launch(headless ? {} : { channel: 'chrome', headless: false, slowMo: 150 })

const capture = async (theme) => {
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 2,
    locale: 'it-IT',
    timezoneId: 'Europe/Zurich',
    colorScheme: theme,
  })
  await context.addInitScript((css) => {
    document.addEventListener('DOMContentLoaded', () => {
      const style = document.createElement('style')
      style.textContent = css
      document.head.appendChild(style)
    })
  }, HIDE_DEV_BADGES)
  await context.addInitScript((value) => localStorage.setItem('app-theme', value), theme)

  const page = await context.newPage()
  const settle = (ms = 800) => page.waitForTimeout(ms)
  const shot = async (name, options = {}) => {
    await settle()
    const file = theme === 'dark' ? `${name}-dark` : name
    await page.screenshot({ path: `${OUT}/${file}.png`, ...options })
    console.log(`📸 ${file}`)
  }

  await page.goto(`${BASE}/login`)
  await page.waitForFunction((value) => document.documentElement.classList.contains(value), theme)
  await page.fill('#email', 'demo-admin@flysupa.test')
  await page.fill('#password', 'SeedPass123!')
  await page.click('button[type=submit]')
  await page.waitForURL((u) => !u.pathname.includes('/login'), { timeout: 10000 })

  // Calendar
  await page.goto(`${BASE}/`)
  await settle(1500)
  await shot('calendario-mese', { fullPage: true })
  await page.getByRole('button', { name: 'Settimana' }).click()
  await shot('calendario-settimana')
  await page.getByRole('button', { name: 'Giorno' }).click()
  await shot('calendario-giorno')
  await page.getByRole('button', { name: 'Mese' }).click()

  // New lesson dialog, filled in and cancelled
  await page.getByRole('button', { name: 'Crea' }).click()
  await page.selectOption('#create-student', { label: 'Giulia Marchetti' })
  await page.fill('#create-title', 'Guida in città')
  await page.fill('#create-time', '14:00')
  await page.fill('#create-hours', '2')
  await shot('nuova-lezione')
  await page.getByRole('button', { name: 'Annulla' }).click()

  // List
  await page.getByRole('button', { name: 'Lista' }).click()
  await settle(1000)
  await shot('lista-lezioni', { fullPage: true })

  // Edit a lesson
  const profileId = db(`select id from profiles where email='${STUDENT_EMAIL}'`)
  const lessonId = db(`select id from lessons where profile_id='${profileId}' and date >= current_date order by date, time limit 1`)
  await page.goto(`${BASE}/edit-lesson/${lessonId}`)
  await settle(1500)
  await shot('modifica-lezione')
  await page.getByPlaceholder('Seleziona...').click()
  await shot('modifica-lezione-argomenti')

  // Lessons of one student
  await page.goto(`${BASE}/user-edit/${profileId}`)
  await settle(1500)
  await page.locator('tbody tr').first().click()
  // Only the lessons card, without the footer
  const card = await page.locator('.border', { hasText: 'Elenco delle lezioni registrate' }).last().boundingBox()
  const footer = await page.getByText('Totale ore:').boundingBox()
  await shot('lezioni-allievo', {
    fullPage: true,
    clip: { x: card.x, y: card.y, width: card.width, height: footer.y - card.y },
  })
  await page.getByRole('button', { name: 'Aggiungi' }).click()
  await shot('aggiungi-argomenti')
  await page.keyboard.press('Escape')
  await settle(300)
  await page.locator('tbody tr button.bg-destructive').first().click()
  await shot('elimina-lezione')
  await page.getByRole('button', { name: 'Annulla' }).click()
  await context.close()
}

try {
  for (const theme of process.env.THEME ? [process.env.THEME] : ['light', 'dark']) await capture(theme)
} finally {
  await browser.close()
}
