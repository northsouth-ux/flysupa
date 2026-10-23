# FlySupa — Gestione Autoscuole

Piattaforma multi-tenant per la gestione di autoscuole. Ogni scuola ha il proprio spazio isolato con studenti, istruttori, lezioni e licenze.

## Prerequisiti

- **Node.js** ≥ 18
- **npm** ≥ 9
- Un progetto **Supabase** (gratuito) — [supabase.com](https://supabase.com)

## Setup rapido

```bash
# 1. Clona il repository
git clone <repo-url> flysupa
cd flysupa

# 2. Installa le dipendenze
npm install

# 3. Configura Supabase
#    Crea un progetto su https://supabase.com e copia URL + anon key
#    in src/services/supabaseClient.tsx
```

## Database — Migration (una tantum)

Apri lo [SQL Editor](https://supabase.com/dashboard) del tuo progetto Supabase, incolla l'intero contenuto di:

```
supabase/migrations/20261023000000_multi_tenant_repair.sql
```

Clicca **Run**. Questo crea tutte le tabelle, le policy RLS, i bucket storage e i permessi.

Dopo aver eseguito la migration, **imposta il tuo utente come platform admin** per accedere al pannello di controllo globale:

```sql
UPDATE profiles SET platform_admin = true WHERE email = 'tua@email.com';
```

## Avvio in sviluppo (ambiente locale)

`npm run dev` punta a **Supabase locale** (http://127.0.0.1:54321) — nessun dato cloud toccato. Prima avvia il database locale:

```bash
npm run db:start  # avvia Supabase locale (richiede Docker/colima attivo)
npm run dev       # Vite su http://localhost:5173 → Supabase locale
npm run db:reset  # ricrea il DB locale e riapplica la migration
npm run db:stop   # ferma Supabase locale
```

Altri comandi:
```bash
npm run host       # come dev, esposto sulla rete locale
npm run build      # build di produzione + type check
npm run preview    # anteprima build di produzione
npm run lint       # ESLint
npm test           # test in watch mode
npm run test:run   # test singola esecuzione
npm run test:ui    # test con interfaccia UI
```

Gli ambienti cloud (**test** / **prod**) sono configurati via env vars Vercel
(`VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY`); le chiavi sono in
`~/.hermes/flysupa-environments.json`.

## Flusso utente

```
Registrazione (email + password)
        │
        ▼
/register-school ─── scegli un piano, crea la tua autoscuola
        │
        ▼
/onboarding ─── completa il profilo (nome, cognome, telefono)
        │
        ▼
/home ─── vedi solo i dati della tua scuola
        │
        ├── /school-admin ─── dashboard scuola (statistiche, inviti)
        ├── /users ─── gestione studenti
        └── /account ─── modifica profilo personale

Platform admin:
        └── /platform-admin ─── panoramica globale (tutte le scuole)
```

## Ruoli

| Ruolo | Cosa vede |
|---|---|
| **Platform admin** | `/platform-admin` — tutte le scuole, tutti i dati. Impostato manualmente via SQL. |
| **Owner** (scuola) | `/school-admin` — statistiche, gestione utenti, inviti della propria scuola |
| **Admin / Istruttore** | Stesse viste dell'owner |
| **Studente** | Solo lezioni e profilo — no accesso admin |

## Architettura

```
┌──────────────┐     ┌──────────────┐     ┌──────────────────┐
│   React UI   │────▶│  Supabase JS │────▶│   Supabase DB    │
│  (Vite+TS)   │     │  (anon key)  │     │  (RLS per scuola) │
└──────────────┘     └──────────────┘     └──────────────────┘
```

- **Multi-tenant via RLS**: ogni tabella ha policy che filtrano per `school_id`. L'utente A non può vedere i dati della scuola B.
- **Platform admin bypass**: la funzione `is_platform_admin()` salta tutte le RLS per i superadmin.
- **Storage**: bucket `avatars` (foto profilo) e `licenses` (documenti patente) con policy RLS dedicate.

## Struttura progetto

```
src/
├── components/     # Componenti UI (Navbar, Avatar, form, shadcn/ui)
├── context/        # UserContext — auth, profilo, scuola, tenant
├── hooks/          # useUser hook
├── pages/
│   ├── Auth/       # Login, Register, Check, Confirm
│   ├── Home.tsx            # Dashboard lezioni
│   ├── Users.tsx           # Lista studenti
│   ├── EditLesson.tsx      # Modifica lezione
│   ├── Account.tsx         # Profilo personale
│   ├── Dashboard.tsx       # Dashboard base
│   ├── SchoolRegistration.tsx  # Crea autoscuola (con pricing)
│   ├── SchoolAdmin.tsx     # Dashboard amministratore scuola
│   ├── PlatformAdmin.tsx   # Dashboard superadmin globale
│   └── Onboarding.tsx      # Completamento profilo
├── services/       # Supabase client, auth services
└── types.ts        # Interfacce TypeScript
```

## Tecnologie

- **React 18** + **TypeScript** + **Vite**
- **Supabase** (Auth, Database, Storage, RLS)
- **Tailwind CSS** + **shadcn/ui**
- **React Router v6**
- **Lucide Icons**
