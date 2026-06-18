# AGENTS.md

Guidance for coding agents working in this repository.

## Project Overview

This is a Next.js 15, React 18, TypeScript, and Tailwind application for mission schedule planning. The app is branded in the UI as MissionBoard, while some project docs refer to TimeFlow.

The source of truth is under `src/`. Generated or packaged outputs live in `out/` and `dist/`.

## Repository Layout

- `src/app/`: Next App Router entry points, global styles, and the main page.
- `src/components/`: Application components plus shadcn/Radix-style UI primitives in `src/components/ui/`.
- `src/hooks/`: Local state and browser storage hooks.
- `src/lib/`: Shared utilities, task calculations, and task type defaults.
- `src/types/`: Shared TypeScript models and literal option lists.
- `docs/`: Product and design notes.
- `scripts/`: Build helper scripts for GitHub Pages and distribution packaging.
- `out/`: Static export output from `next build`.
- `dist/`: Packaged distribution output, including an Express static server.

Avoid editing `out/`, `dist/`, `.next/`, `node_modules/`, and `*.tsbuildinfo` directly unless the task is specifically about build or package artifacts.

## Common Commands

- Install dependencies: `npm ci`
- Start local dev server: `npm run dev`
- Type-check, avoid by default: `npm run typecheck`
- Build static export: `npm run build`
- Build for GitHub Pages: `npm run build:pages`
- Package distribution: `npm run package`

Do not run `npm run typecheck` by default. It is not advisable because it usually causes agents to get stuck. Only run it when the user explicitly asks for it or when there is a strong reason, and timebox the attempt. Use `npm run build` or `npm run build:pages` when changes touch Next config, deployment behavior, static export behavior, routing, or asset paths.

## Development Notes

- Use the `@/*` path alias for imports from `src/`.
- Keep TypeScript strictness in mind even though `next.config.ts` currently ignores build-time TypeScript and ESLint errors.
- Client components that use browser APIs should include `"use client"` and guard localStorage/window access with mount checks where hydration might be affected.
- Task times are modeled and displayed in UTC. Preserve UTC behavior when parsing CSVs, using date inputs, importing high priority times, and calculating timeline boundaries.
- Task data is stored in browser localStorage. Be careful when changing storage keys or task shapes; provide backward-compatible defaults when possible.
- `TaskType`, `Spacecraft`, and option lists are literal types. Update `src/types/index.ts`, task type helpers, forms, imports, and display logic together when adding or changing options.

## UI Conventions

- Follow the existing shadcn/Radix component patterns in `src/components/ui/`.
- Prefer existing `Button`, `Input`, `Select`, `Dialog`, `Card`, `Tooltip`, and related primitives over new one-off controls.
- Use `lucide-react` icons for actions and task type visuals.
- Keep layout responsive with Tailwind utility classes and preserve dark mode behavior.
- The visual tone is a utilitarian mission scheduling tool: clear hierarchy, dense but readable controls, and strong timeline clarity.

## Data Import And Export

- Generic task CSV import expects `spacecraft`, `startTime`, and `type`, with optional `name`, `preActionDuration`, `postActionDuration`, `isCompleted`, and `Owner`.
- TL Monitoring Tracker CSV import is detected by `Quantity`, `SCID`, `Acquisition Time`, and `Needs CAD Check`.
- High priority pasted text supports slash-separated `hhmm` groups. Each line group becomes a numbered High Pri group.
- Keep CSV parsing tolerant of quoted fields, BOM-prefixed headers, and case or spacing differences in headers.

## Deployment Notes

- GitHub Pages deploys on pushes to `master` through `.github/workflows/deploy-pages.yml`.
- The Pages workflow runs `npm ci` then `npm run build:pages` with `NEXT_PUBLIC_BASE_PATH` set to the repository name.
- `scripts/prepare-github-pages.js` writes `out/.nojekyll`.
- `npm run package` creates `dist/` with a minimal Express server and copies the static export.

## Change Hygiene

- Keep edits focused on source files unless generated artifacts are explicitly requested.
- Do not commit or hand-edit local server logs such as `dev-server*.log` or `dev-server*.err`.
- Avoid broad refactors when fixing narrow UI, parsing, or scheduling issues.
- When touching user-facing workflows, prefer focused code review or a targeted runtime/build check. Avoid `npm run typecheck` unless explicitly requested because it usually causes agents to get stuck; run a build when deployment or static export behavior could be affected.
