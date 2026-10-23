#!/usr/bin/env node
// Seed random avatar images to all existing profiles.
//
// Usage:
//   node scripts/seed-avatars.mjs dev
//   node scripts/seed-avatars.mjs test
//
// Downloads a random DiceBear avatar (PNG) for each profile, uploads it to the
// `avatars` storage bucket at {profile_id}/avatar.png, and sets avatar_url.
// Non-destructive: leaves all other data untouched. Safe to re-run (overwrites).
import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'node:fs'
import { homedir } from 'node:os'
import path from 'node:path'

const args = process.argv.slice(2)
const env = args.find((a) => ['dev', 'test'].includes(a)) || 'dev'
const cfg = JSON.parse(
  readFileSync(path.join(homedir(), '.hermes', 'flysupa-environments.json'), 'utf8')
)
const target =
  env === 'dev'
    ? { url: 'http://127.0.0.1:54321', serviceKey: cfg.dev?.service_key }
    : { url: cfg.test?.url, serviceKey: cfg.test?.service_key }

if (!target?.serviceKey) {
  console.error(`Missing service_role key for "${env}".`)
  process.exit(1)
}

const supabase = createClient(target.url, target.serviceKey)
console.log(`Seeding avatars for ${env.toUpperCase()} → ${target.url}`)

const STYLE = 'avataaars'

async function main() {
  const { data: profiles, error } = await supabase
    .from('profiles')
    .select('id, nome_utente')
  if (error) throw error
  if (!profiles?.length) {
    console.log('No profiles found.')
    return
  }

  console.log(`Found ${profiles.length} profiles. Fetching + uploading avatars…`)

  let ok = 0
  for (const p of profiles) {
    const seed = Math.random().toString(36).slice(2, 10)
    const url = `https://api.dicebear.com/9.x/${STYLE}/png?seed=${seed}`
    try {
      const res = await fetch(url)
      if (!res.ok) throw new Error(`DiceBear HTTP ${res.status}`)
      const buf = await res.arrayBuffer()
      const filePath = `${p.id}/avatar.png`
      const { error: upErr } = await supabase.storage
        .from('avatars')
        .upload(filePath, buf, { contentType: 'image/png', upsert: true })
      if (upErr) throw upErr
      const { error: updErr } = await supabase
        .from('profiles')
        .update({ avatar_url: filePath })
        .eq('id', p.id)
      if (updErr) throw updErr
      ok++
    } catch (e) {
      console.error(`  ✗ ${p.nome_utente || p.id}:`, e.message)
    }
  }

  console.log(`\n✅ Done. Avatars set for ${ok}/${profiles.length} profiles.`)
}

main().catch((e) => {
  console.error('Seed failed:', e.message)
  process.exit(1)
})
