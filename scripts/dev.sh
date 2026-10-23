#!/usr/bin/env bash
# One-command dev: ensure Docker (colima) + local Supabase are up, then run Vite.
# Each step is idempotent — safe to run over and over.
set -e

if docker info >/dev/null 2>&1; then
  echo "🐳 Docker: ready"
else
  echo "🐳 Docker: starting colima…"
  colima start
fi

if supabase status >/dev/null 2>&1; then
  echo "🟢 Supabase: ready (http://127.0.0.1:54321)"
else
  echo "🟢 Supabase: starting local stack…"
  supabase start
fi

echo "▶️  Vite: http://localhost:5173"
exec vite
