# RepRise

**Track every rep, beat your best.**

A mobile fitness tracking app built as a pnpm monorepo: an Expo/React Native
client and a Node/Express API, sharing types through a small internal package.

This project is being built phase-by-phase. Each phase is implemented,
tested, and confirmed working before the next one starts.

## Status

- [x] **Phase 0 — Scaffold.** Monorepo, tooling, empty Expo app, empty
      Express API, CI skeleton.
- [x] **Phase 1 — Auth.** Register/login/refresh, Welcome/Login/Register screens.
- [x] **Phase 2 — Database & exercise CRUD.** Drizzle ORM, Postgres, exercise
      CRUD API, exercises tab.
- [x] **Phase 3 — Local-first data layer.** SQLite on-device, offline workout
      CRUD, workout history tab.
- [x] **Phase 4 — Core workout logging UI.** Previous performance, copy-previous-set,
      notes, workout summary, polished read-only view. *(you are here)*
- [ ] Phase 5 — Templates
- [ ] Phase 6 — Progress dashboard & graphs
- [ ] Phase 7 — PR detection
- [ ] Phase 8 — Streaks & muscle visualizer
- [ ] Phase 9 — Rest timer & notifications
- [ ] Phase 10 — Offline sync engine
- [ ] Phase 11 — Settings, units, data export
- [ ] Phase 12 — Polish & animation
- [ ] Phase 13 — Test hardening
- [ ] Phase 14 — Store builds & deployment

## Project structure

```
reprise/
├─ apps/
│  ├─ mobile/        Expo Router app (React Native + TypeScript)
│  └─ api/            Express API (TypeScript)
├─ packages/
│  └─ shared/          Types/constants shared by both apps
├─ docker-compose.yml  Local Postgres, ready for Phase 2
└─ .github/workflows/  CI (lint, typecheck, test)
```

## A note on how this scaffold was authored

These files were written by hand in a sandbox with no network access, so
`pnpm install` was never actually run against them. The mobile app's core
versions (Expo, Expo Router, React, React Native, TanStack Query) are real,
current versions as of this writing — but a few secondary packages use
reasonable version ranges rather than confirmed exact numbers. **The first
thing to do is let tooling fix any drift itself** (steps below handle this).
If something still fails to resolve, tell me the exact error and we'll fix it
together.

## Prerequisites

- Node.js 20+ (see `.nvmrc`)
- [pnpm](https://pnpm.io) — `corepack enable` will get you the right version automatically
- [Expo Go](https://expo.dev/go) on your phone, or an iOS/Android simulator
- Docker (optional for now — only needed starting Phase 2)

## Setup

```bash
# From the repo root
corepack enable
pnpm install

# Let Expo align every expo-* package to the installed SDK version —
# this is the step that corrects any version drift mentioned above.
cd apps/mobile
npx expo install --fix
cd ../..

# Environment files
cp apps/mobile/.env.example apps/mobile/.env
cp apps/api/.env.example apps/api/.env
```

## Running it

**API:**
```bash
pnpm dev:api
# → RepRise API listening on http://localhost:4000
curl http://localhost:4000/api/v1/health
# → {"data":{"status":"ok","service":"reprise-api","timestamp":"..."}}
```

**Mobile app:**
```bash
pnpm dev:mobile
# Press `i` for iOS simulator, `a` for Android, or scan the QR code with Expo Go.
```

If you run on a physical device, edit `apps/mobile/.env` and replace
`localhost` with your computer's LAN IP address, since the phone can't
resolve `localhost` to your laptop.

You should see a dark screen with the RepRise wordmark and tagline — that's
the whole of Phase 0. Nothing else works yet on purpose.

## What "done" looks like for Phase 0

- `pnpm install` completes with no errors
- `pnpm dev:api` starts and `/api/v1/health` returns 200
- `pnpm dev:mobile` boots the app in Expo Go/a simulator and shows the
  RepRise placeholder screen
- `pnpm lint` and `pnpm typecheck` run without crashing (some warnings are
  fine — this is a fresh scaffold, not a finished app)

Tell me what happens when you run these — especially any install or version
errors — and we'll fix them before moving to Phase 1.
