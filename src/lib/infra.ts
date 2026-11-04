// Describes which Supabase the app is talking to, for the browser console banner
// that src/main.tsx prints and the env badge link in Navbar. The anon key is
// deliberately never logged.

// Local dev, plus deployed builds of the development branch (flysupa-dev.vercel.app).
// Production never matches, so its console stays clean.
export const showInfra = import.meta.env.DEV || import.meta.env.VITE_APP_ENV === 'development'

export type InfraTone = 'local' | 'development' | 'test' | 'production' | 'unknown'

export type Infra = {
  tone: InfraTone
  database: string
  data: string
  docker: string
  admin: string | null
}

const HOSTED_PROJECTS: Record<string, { tone: InfraTone; database: string; data: string }> = {
  pyilyqtuswkxwddqbgfu: {
    tone: 'development',
    database: 'Supabase development branch (hosted)',
    data: 'Cloud, shared with the team, safe to change',
  },
  jgrlbqryehuawrgohdrj: {
    tone: 'test',
    database: 'Supabase test project (hosted)',
    data: 'Cloud, shared with the team',
  },
  nihffzcyqgbxpdbrnavr: {
    tone: 'production',
    database: '⚠️  Supabase PRODUCTION (hosted)',
    data: '⚠️  Real customer data, changes are live',
  },
}

export function describeSupabase(url: string): Infra {
  if (/^https?:\/\/(127\.0\.0\.1|localhost)(:|\/|$)/.test(url)) {
    return {
      tone: 'local',
      database: 'Local Supabase (Docker)',
      data: 'Only on this Mac, no cloud data touched',
      docker: 'Required (colima)',
      admin: 'http://127.0.0.1:54323',
    }
  }

  const ref = url.match(/^https:\/\/([a-z0-9]+)\.supabase\.co/)?.[1]
  const project = ref ? HOSTED_PROJECTS[ref] : undefined
  return {
    tone: project?.tone ?? 'unknown',
    database: project?.database ?? 'Unknown Supabase project',
    data: project?.data ?? 'Unknown, check VITE_SUPABASE_URL',
    docker: 'Not needed',
    admin: ref ? `https://supabase.com/dashboard/project/${ref}` : null,
  }
}

export function infraRows(url: string, mode: string, branch: string): [string, string][] {
  const infra = describeSupabase(url)
  return [
    ['Database', infra.database],
    ['URL', url],
    ['Data', infra.data],
    ['Admin', infra.admin ?? '-'],
    ['Docker', infra.docker],
    ['Env file', import.meta.env.DEV ? `.env.${mode} (Vite mode: ${mode})` : 'Vercel environment variables'],
    ['Git branch', branch],
  ]
}

const CONSOLE_COLORS: Record<InfraTone, string> = {
  local: '#2563eb',
  development: '#059669',
  test: '#d97706',
  production: '#dc2626',
  unknown: '#6b7280',
}

export function logInfra(url: string, mode: string, branch: string): void {
  const { tone } = describeSupabase(url)
  console.group(
    `%c FlySupa %c ${tone} `,
    'background:#111827;color:#fff;font-weight:600;border-radius:4px 0 0 4px;padding:2px 0',
    `background:${CONSOLE_COLORS[tone]};color:#fff;font-weight:600;border-radius:0 4px 4px 0;padding:2px 0`,
  )
  for (const [label, value] of infraRows(url, mode, branch)) {
    console.log(`%c${label.padEnd(11)}%c${value}`, 'color:#6b7280', 'color:inherit')
  }
  console.groupEnd()
}
