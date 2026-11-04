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
