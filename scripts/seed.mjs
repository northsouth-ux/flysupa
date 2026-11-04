#!/usr/bin/env node
// Seed FlySupa dev/test environments with realistic data.
//
// Usage:
//   node scripts/seed.mjs dev          # local Supabase (127.0.0.1:54321)
//   node scripts/seed.mjs development  # hosted Supabase `development` branch
//   node scripts/seed.mjs test         # test cloud project
//   npm run seed                       # default = dev
//   npm run seed:development           # hosted Supabase `development` branch
//
// Never writes to production: any target on the production project is refused.
//
// Creates 3 schools, each with:
//   - 1 owner admin (a real auth user you can log in as)
//   - 10–20 student records
//   - a pool of lesson items + lessons + lesson-item associations
//
// Idempotent: clears existing `seed-*` data first. Reproducible: set
// SEED_RANDOM=<int> to vary the dataset (default 42).
import { createClient } from '@supabase/supabase-js'
import { existsSync, readFileSync } from 'node:fs'
import { homedir } from 'node:os'
import path from 'node:path'

const PROD_REF = 'nihffzcyqgbxpdbrnavr'
const DEVELOPMENT_URL = 'https://pyilyqtuswkxwddqbgfu.supabase.co'
const ENVS = ['dev', 'development', 'test']

// ---- resolve env ----
const args = process.argv.slice(2)
const envIdx = args.indexOf('--env')
const env = envIdx >= 0 ? args[envIdx + 1] : args.find((a) => ENVS.includes(a)) || 'dev'
if (!ENVS.includes(env)) {
  console.error(`Usage: node scripts/seed.mjs [${ENVS.join('|')}]  (got "${env}")`)
  process.exit(1)
}

// CI has no key file: it passes the local stack's key in SEED_SERVICE_KEY.
const cfgPath = path.join(homedir(), '.hermes', 'flysupa-environments.json')
const cfg = existsSync(cfgPath) ? JSON.parse(readFileSync(cfgPath, 'utf8')) : {}
const target = {
  dev: { url: 'http://127.0.0.1:54321', serviceKey: process.env.SEED_SERVICE_KEY || cfg.dev?.service_key },
  development: { url: DEVELOPMENT_URL, serviceKey: cfg.development?.service_key },
  test: { url: cfg.test?.url, serviceKey: cfg.test?.service_key },
}[env]

if (target.url?.includes(PROD_REF) || (cfg.prod?.service_key && target.serviceKey === cfg.prod.service_key)) {
  console.error('Refusing to seed: this target is the production project.')
  process.exit(1)
}

if (!target?.serviceKey) {
  console.error(`Missing service_role key for "${env}". Add it to ${cfgPath} as "${env}": { "service_key": "..." }.`)
  process.exit(1)
}

const supabase = createClient(target.url, target.serviceKey)
console.log(`Seeding ${env.toUpperCase()} → ${target.url}`)

// ---- deterministic PRNG (reproducible) ----
function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}
const rand = mulberry32(parseInt(process.env.SEED_RANDOM || '42', 10))
const int = (min, max) => min + Math.floor(rand() * (max - min + 1))
const pick = (arr) => arr[Math.floor(rand() * arr.length)]
const pad = (n) => String(n).padStart(2, '0')
const randDate = (fromY, toY) => `${int(fromY, toY)}-${pad(int(1, 12))}-${pad(int(1, 28))}`
const randTime = () => `${pad(int(8, 19))}:${pad(pick([0, 15, 30, 45]))}:00`

const FIRST = ['Mario', 'Luca', 'Giulia', 'Anna', 'Paolo', 'Sara', 'Marco', 'Elena', 'Davide', 'Chiara', 'Andrea', 'Francesca', 'Simone', 'Valentina', 'Roberto', 'Ilaria', 'Matteo', 'Alessia', 'Stefano', 'Martina']
const LAST = ['Rossi', 'Bianchi', 'Ferrari', 'Colombo', 'Ricci', 'Greco', 'Romano', 'Gallo', 'Conti', 'Costa', 'Marino', 'Barbieri', 'Fontana', 'Moretti', 'Villa', 'Rizzo', 'Serra', 'Farina', 'Pellegrini', 'Mancini']
const ITEMS = ['Frenata di emergenza', 'Parcheggio in retro', 'Rotonda', 'Precedenza', 'Sorpasso', 'Guida notturna', 'Autostrada', 'Parcheggio a S', 'Curve', 'Semaforo']

// Throws on any Supabase error, so a schema change that breaks the seed fails loudly.
async function must(query, what) {
  const { data, error } = await query
  if (error) throw new Error(`${what}: ${error.message}`)
  return data
}

async function clearSeed() {
  console.log('Clearing existing seed data...')
  await must(supabase.from('schools').delete().like('slug', 'seed-%'), 'clear schools')
  await must(supabase.from('profiles').delete().like('email', 'seed-%'), 'clear profiles')
  const data = await must(supabase.auth.admin.listUsers({ perPage: 1000 }), 'list users')
  const users = (data && (data.users || data)) || []
  for (const u of users) {
    if (u.email?.startsWith('seed-')) await must(supabase.auth.admin.deleteUser(u.id), 'delete user')
  }
}

async function main() {
  await clearSeed()
  const logins = []

  for (let s = 1; s <= 3; s++) {
    const email = `seed-admin-${s}@flysupa.test`
    const password = 'SeedPass123!'

    // 1) admin auth user (trigger auto-creates their profile)
    const { data: { user: admin }, error: adminErr } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name: `Seed Admin ${s}` },
    })
    if (adminErr) throw adminErr

    // 2) school
    const { data: school, error: schoolErr } = await supabase.from('schools').insert({
      name: `Autoscuola Seed ${s}`,
      slug: `seed-scuola-${s}`,
      owner_id: admin.id,
    }).select().single()
    if (schoolErr) throw schoolErr

    // 3) owner membership + link admin profile to school
    await must(supabase.from('school_members').insert({ user_id: admin.id, school_id: school.id, role: 'owner' }), 'school member insert')
    await must(supabase.from('profiles').update({ school_id: school.id, nome_utente: `Admin ${s}` }).eq('id', admin.id), 'admin profile update')

    // 4) students (10–20)
    const nStudents = int(10, 20)
    const studentRows = Array.from({ length: nStudents }, (_, j) => ({
      school_id: school.id,
      nome_utente: pick(FIRST),
      cognome_utente: pick(LAST),
      email: `seed-student-${s}-${j}@flysupa.test`,
      phone: `+41 79 ${int(100, 999)} ${int(10, 99)} ${int(10, 99)}`,
      licenza_date: randDate(2022, 2025),
      is_student: true,
    }))
    const students = await must(supabase.from('profiles').insert(studentRows).select(), 'student insert')

    // 5) lesson items (6–10)
    const nItems = int(6, 10)
    const itemRows = Array.from({ length: nItems }, (_, k) => ({
      school_id: school.id,
      title: ITEMS[k % ITEMS.length],
      description: `Esercizio ${k + 1}`,
    }))
    const items = await must(supabase.from('lessons_items').insert(itemRows).select(), 'item insert')

    // 6) lessons (3–8 per student)
    const lessonRows = []
    for (const student of students) {
      const n = int(3, 8)
      for (let l = 0; l < n; l++) {
        lessonRows.push({
          profile_id: student.id,
          school_id: school.id,
          title: `Lezione ${l + 1}`,
          description: 'Lezione di guida',
          amount_hours: int(1, 2),
          date: randDate(2024, 2026),
          time: randTime(),
        })
      }
    }
    const { data: lessons, error: lessonErr } = await supabase.from('lessons').insert(lessonRows).select()
    if (lessonErr) throw new Error(`lesson insert failed: ${lessonErr.message}`)
    if (!lessons) throw new Error('lesson insert returned no data')

    // 7) associations (2–4 random items per lesson)
    const assocRows = []
    for (const lesson of lessons) {
      const nAssoc = int(2, 4)
      const chosen = new Set()
      while (chosen.size < Math.min(nAssoc, items.length)) chosen.add(items[Math.floor(rand() * items.length)].id)
      for (const itemId of chosen) {
        assocRows.push({ lesson_id: lesson.id, lesson_item_id: itemId })
      }
    }
    if (assocRows.length) await must(supabase.from('lesson_item_associations').insert(assocRows), 'association insert')

    logins.push({ email, school: school.name, students: nStudents, lessons: lessonRows.length })
  }

  console.log('\n✅ Seed complete.')
  console.log('Admin logins (password: SeedPass123!):')
  for (const l of logins) console.log(`   - ${l.email}  → ${l.school} (${l.students} students, ${l.lessons} lessons)`)
}

main().catch((e) => {
  console.error('Seed failed:', e.message)
  process.exit(1)
})
