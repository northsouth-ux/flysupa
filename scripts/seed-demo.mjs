#!/usr/bin/env node
// Seed one believable demo school for the documentation screenshots.
//
// Usage:
//   npm run seed:demo             # local Supabase only (127.0.0.1:54321)
//
// Creates "Autoscuola Bellavista" with:
//   - 1 owner admin + 1 student who can log in
//   - 10 student records
//   - a pool of lesson items + lessons around today's date
//
// Idempotent: clears existing `demo-*` data first and leaves `seed-*` data alone.
// All names are fictional. Re-run before taking screenshots so the calendar is current.
import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'node:fs'
import { homedir } from 'node:os'
import path from 'node:path'

const cfg = JSON.parse(readFileSync(path.join(homedir(), '.hermes', 'flysupa-environments.json'), 'utf8'))
const serviceKey = cfg.dev?.service_key
if (!serviceKey) {
  console.error('Missing service_role key for "dev".')
  process.exit(1)
}

const supabase = createClient('http://127.0.0.1:54321', serviceKey)
const PASSWORD = 'SeedPass123!'

const STUDENTS = [
  ['Giulia', 'Marchetti', true, true],
  ['Luca', 'Ferretti', true, false],
  ['Sara', 'Lombardi', true, true],
  ['Matteo', 'Galli', false, false],
  ['Chiara', 'Testa', true, true],
  ['Davide', 'Riva', false, true],
  ['Elena', 'Bassi', true, false],
  ['Simone', 'Sala', true, true],
  ['Marta', 'Donati', false, false],
  ['Paolo', 'Vitali', true, true],
]
const ITEMS = ['Partenza e fermata', 'Rotonde', 'Precedenze', 'Parcheggio in retromarcia', 'Parcheggio a S', 'Guida in città', 'Autostrada', 'Sorpasso', 'Guida notturna', 'Frenata di emergenza']
const TITLES = ['Guida in città', 'Rotonde e precedenze', 'Manovre', 'Autostrada', 'Guida notturna']
const TIMES = ['08:00:00', '09:30:00', '11:00:00', '14:00:00', '15:30:00', '17:00:00', '18:30:00']

const pad = (n) => String(n).padStart(2, '0')
const isoDate = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`

async function must(promise, what) {
  const { data, error } = await promise
  if (error) throw new Error(`${what}: ${error.message}`)
  return data
}

async function clearDemo() {
  await must(supabase.from('schools').delete().like('slug', 'demo-%'), 'clear schools')
  await must(supabase.from('profiles').delete().like('email', 'demo-%'), 'clear profiles')
  const { users } = await must(supabase.auth.admin.listUsers({ perPage: 1000 }), 'list users')
  for (const u of users) {
    if (u.email?.startsWith('demo-')) await must(supabase.auth.admin.deleteUser(u.id), 'delete user')
  }
}

async function createLogin(email, fullName) {
  const { user } = await must(supabase.auth.admin.createUser({
    email,
    password: PASSWORD,
    email_confirm: true,
    user_metadata: { full_name: fullName },
  }), `create ${email}`)
  return user
}

async function main() {
  await clearDemo()

  const admin = await createLogin('demo-admin@flysupa.test', 'Laura Bellini')
  const school = await must(supabase.from('schools').insert({
    name: 'Autoscuola Bellavista',
    slug: 'demo-bellavista',
    owner_id: admin.id,
  }).select().single(), 'create school')

  await must(supabase.from('school_members').insert({ user_id: admin.id, school_id: school.id, role: 'owner' }), 'add owner')
  await must(supabase.from('profiles').update({
    school_id: school.id,
    nome_utente: 'Laura',
    cognome_utente: 'Bellini',
    phone: '+41 79 555 01 00',
  }).eq('id', admin.id), 'update owner')

  // A student who can log in, used to check the student's view of the app
  const studentUser = await createLogin('demo-allievo@flysupa.test', 'Andrea Neri')
  await must(supabase.from('school_members').insert({ user_id: studentUser.id, school_id: school.id, role: 'student' }), 'add student')
  await must(supabase.from('profiles').update({
    school_id: school.id,
    nome_utente: 'Andrea',
    cognome_utente: 'Neri',
    phone: '+41 79 555 01 01',
    is_student: true,
    sensibilizzazione: true,
    soccorritori: true,
  }).eq('id', studentUser.id), 'update student')

  const records = await must(supabase.from('profiles').insert(STUDENTS.map(([nome, cognome, sensibilizzazione, soccorritori], i) => ({
    school_id: school.id,
    nome_utente: nome,
    cognome_utente: cognome,
    email: `demo-allievo-${i + 1}@flysupa.test`,
    phone: `+41 79 555 01 ${pad(i + 10)}`,
    licenza_date: '2026-03-02',
    is_student: true,
    sensibilizzazione,
    soccorritori,
  }))).select(), 'create students')
  const students = [{ id: studentUser.id }, ...records]

  const items = await must(supabase.from('lessons_items').insert(ITEMS.map((title, i) => ({
    school_id: school.id,
    title,
    description: `Esercizio ${i + 1}`,
  }))).select(), 'create items')

  // Weekdays from 3 weeks ago to 3 weeks ahead, cycling predictably through students and times
  const lessonRows = []
  const today = new Date()
  let n = 0
  for (let offset = -21; offset <= 21; offset++) {
    const day = new Date(today.getFullYear(), today.getMonth(), today.getDate() + offset)
    if (day.getDay() === 0 || day.getDay() === 6) continue
    const perDay = 2 + (n % 3)
    for (let l = 0; l < perDay; l++) {
      lessonRows.push({
        profile_id: students[n % students.length].id,
        school_id: school.id,
        title: TITLES[n % TITLES.length],
        description: 'Lezione di guida',
        amount_hours: 1 + (n % 2),
        date: isoDate(day),
        time: TIMES[(n * 3 + l) % TIMES.length],
      })
      n++
    }
  }
  const lessons = await must(supabase.from('lessons').insert(lessonRows).select(), 'create lessons')

  const assocRows = lessons.flatMap((lesson, i) => [0, 1, 2].map((k) => ({
    lesson_id: lesson.id,
    lesson_item_id: items[(i + k * 3) % items.length].id,
  })))
  await must(supabase.from('lesson_item_associations').insert(assocRows), 'link items')

  console.log(`✅ ${school.name}: ${students.length} students, ${lessons.length} lessons`)
  console.log(`Logins (password: ${PASSWORD}): demo-admin@flysupa.test, demo-allievo@flysupa.test`)
}

main().catch((e) => {
  console.error('Seed failed:', e.message)
  process.exit(1)
})
