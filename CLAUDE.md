# FlySupa Project Guide

## Build/Test Commands
- `npm run dev` - Start development server on the hosted Supabase `development` branch
- `npm run dev:local` - Start development server on local Supabase (Docker)
- `npm run build` - Build for production (runs TypeScript type check)
- `npm run lint` - Run ESLint on all files
- `npm test` - Run all tests in watch mode
- `npm run test:ui` - Run tests with UI
- `npm run test:run` - Run tests once without watch mode
- `npm test -- -t "test name"` - Run a specific test

## Code Style Guidelines
- TypeScript with strict typing; any is allowed (@typescript-eslint/no-explicit-any is off)
- React components use functional style with hooks
- Path aliases: import from '@/components', '@/lib/utils', etc.
- UI components use shadcn/ui style (see components/ui)
- Component naming: PascalCase for components, camelCase for functions/variables
- Form validation: Uses react-hook-form with zod resolversA

## Project Structure
- Components use shadcn/ui patterns and Tailwind CSS
- Authentication via Supabase
- UI state management through React context (UserContext)w
- Follow existing import ordering: React, libraries, local component

## Git and Linear Workflow
Production is `main`. Every change reaches it through a PR, so that Linear can track it (team `FS`).

Every change:
- Never commit directly to `main` or `development`
- Every change needs a Linear issue. Search for an existing one; if there is none, create it before starting, with a description of what the change is about and why
- Use the issue's `gitBranchName` from Linear as the branch name, branched from an up-to-date `development`
- Move the issue to In Progress when work starts
- Open the PR into `development`, with the issue ID in the title (e.g. `FS-52 Fix topic chips in dark mode`)
- When the PR merges into `development`, set the issue to In Review. Never mark it Done: the code is not in production yet

Release (only when the user asks):
- Open a PR from `development` to `main`
- Find the issues it ships with `git log origin/main..origin/development`, and list all of them in the description: `Fixes FS-52, FS-53`
- Merge with a merge commit, never squash or rebase
- Never merge into `main` unless the user explicitly asks for that release

After each PR or merge, check the issue's status in Linear. The GitHub integration should move it; if it did not, update it and tell the user. An issue stays In Review while its code is only on `development`, and is Done only once its code is merged to `main`.

## Pending PRs
At the start of each session, before anything else, show a short summary of open PRs: number, title, target branch, and whether it's ready to merge. Use the list from the SessionStart hook if it's in context; otherwise run `gh pr list --state open --json number,title,baseRefName,isDraft,mergeStateStatus,url`. If there are none, say so in one line.

 ## Features
 
Qualifies:

  11.   Upload Licence  
  7.    Search and filtering capabilities
  12.   Usernames fix (nome/cognome insieme)

  8.    Calendar view for lesson scheduling
  10.   Lesson template system
  4.    Enhanced student dashboard views

Maybe Later
  1.    Admin Dashboard implementation
  2.    License management functionality
  3.    Student progress analytics
  5.    Report/certificate generation
  6.    Notification syste
  9.    Payment processing integration
