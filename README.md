<div align="center">

# RepRise

**Track every rep. Beat your best.**

An offline-first, local-first mobile fitness tracker and training analytics platform built with React Native (Expo Router) and Node.js.

[![Download Android APK](https://img.shields.io/badge/Download-Android_APK-3DDC84?style=for-the-badge&logo=android&logoColor=white)](https://github.com/SamantSwaroop/RepRise/releases)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.6-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![React Native](https://img.shields.io/badge/React_Native-Expo_SDK_57-61DAFB?style=for-the-badge&logo=react&logoColor=black)](https://reactnative.dev/)
[![Node.js](https://img.shields.io/badge/Node.js-20_LTS-339933?style=for-the-badge&logo=node.js&logoColor=white)](https://nodejs.org/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-4169E1?style=for-the-badge&logo=postgresql&logoColor=white)](https://www.postgresql.org/)
[![SQLite](https://img.shields.io/badge/SQLite-WAL_Mode-003B57?style=for-the-badge&logo=sqlite&logoColor=white)](https://www.sqlite.org/)
[![Docker](https://img.shields.io/badge/Docker-Ready-2496ED?style=for-the-badge&logo=docker&logoColor=white)](https://www.docker.com/)

[APK Download](https://github.com/SamantSwaroop/RepRise/releases) • [Architecture Overview](#architecture) • [Key Features](#key-features) • [Quickstart](#local-development) • [Deployment Runbook](DEPLOYMENT.md)

</div>

---

## Overview

**RepRise** is engineered around a **local-first, privacy-respecting architecture**. Unlike traditional workout trackers that freeze or fail when mobile reception drops in underground gyms, RepRise writes all workout logs, exercise templates, and personal baselines instantly to an on-device SQLite database. 

When network connectivity is available, an **asynchronous outbox synchronization engine** compacts pending mutations and syncs data bi-directionally with a PostgreSQL backend via Last-Write-Wins (LWW) conflict resolution.

---

## Key Features

* ⚡ **Local-First & Zero-Latency Logging**: All reads and writes target on-device SQLite (`expo-sqlite` in WAL mode). Workouts can be started, logged, and completed with zero network dependence.
* 🔄 **Bi-Directional Sync Engine with Mutation Compaction**: Offline changes enqueue into an SQLite outbox table. An intelligent compaction layer merges consecutive updates and drops transient create-then-delete actions before syncing over the wire.
* 🏆 **Real-Time Personal Record (PR) Engine**: Evaluates sets in real time against historical baselines using the Epley 1-Rep Max formula ($w \times (1 + \frac{r}{30})$) and heaviest weight benchmarks.
* 🧬 **Interactive Anatomical Heatmap**: Dynamic SVG muscle visualizer (Anterior and Posterior) mapping volume distribution across targeted muscle groups, alongside a 12-week consistency heatmap.
* ⏱️ **Drift-Free Rest Timer**: Accurate in-workout rest timers with auto-start on set completion, tactile haptic pulses (`expo-haptics`), and background local push notifications (`expo-notifications`).
* 📋 **Template Management**: Build reusable routines, start pre-populated sessions, or save any completed session as a routine with one tap.
* 🔒 **Data Portability & Sovereignty**: Export complete workout logs to RFC-4180 compliant CSV or generate full JSON device backup files via native OS share sheets.
* 🎨 **Nord-Themed Design System**: Tailored dark-mode UI with spring micro-animations, tabular numeric alignment for weights/reps, and optimistic state updates.

---

## Architecture

RepRise is organized as a `pnpm` monorepo sharing end-to-end types and validation schemas across client and server:

```
reprise/
├── apps/
│   ├── mobile/             # React Native (Expo SDK 57, Expo Router, SQLite, Zustand)
│   └── api/                # REST API (Node.js 20, Express, Drizzle ORM, PostgreSQL)
├── packages/
│   └── shared/             # Shared TypeScript models, PR math algorithms, Zod schemas
├── docker-compose.yml      # Local development PostgreSQL service
├── docker-compose.prod.yml # Production multi-stage container deployment
└── DEPLOYMENT.md           # Production Google Play & App Store release runbook
```

### Data Flow & Sync Pipeline

```
┌──────────────────────────────────────────────────────────┐
│                   React Native Client                    │
│                                                          │
│  [User Action] ──► [expo-sqlite DB] ──► [Instant UI OK]  │
│                           │                              │
│                (enqueue mutation)                        │
│                           ▼                              │
│                 [Sync Outbox Queue]                      │
│                           │                              │
│                (compact & batch)                         │
└───────────────────────────┼──────────────────────────────┘
                            │ NetInfo: Online
                            ▼
┌──────────────────────────────────────────────────────────┐
│                  Express REST API                        │
│                                                          │
│  [Sync Endpoint] ──► [Zod Validation] ──► [PostgreSQL]   │
│                                           (Drizzle ORM)  │
└──────────────────────────────────────────────────────────┘
```

---

## Tech Stack

| Layer | Technologies |
|---|---|
| **Mobile Client** | React Native 0.86, Expo SDK 57, Expo Router (file-based navigation) |
| **Client Storage** | `expo-sqlite` (WAL Mode), `expo-secure-store` |
| **State Management** | Zustand (local stores), TanStack Query v5 (server cache & hydration) |
| **UI & Graphics** | React Native SVG, Lucide / Ionicons, Nord Color System |
| **Hardware APIs** | `expo-notifications` (background timer alerts), `expo-haptics` |
| **Backend API** | Node.js 20 LTS (ESM), Express.js, TypeScript |
| **Database & ORM** | PostgreSQL 16, Drizzle ORM, Drizzle Kit migrations |
| **Validation & Security** | Zod (shared schemas), JWT with access/refresh rotation, bcrypt |
| **Testing** | Vitest, Supertest (integration), Jest + jest-expo (unit & stores) |
| **DevOps & Builds** | Docker, Docker Compose, EAS Build (Android APK/AAB & iOS IPA) |

---

## Local Development

### Prerequisites
* **Node.js**: `v20.x` or higher (see `.nvmrc`)
* **Package Manager**: `pnpm` (`corepack enable`)
* **Docker**: Optional, for running local PostgreSQL

### 1. Clone & Install Dependencies
```bash
git clone https://github.com/SamantSwaroop/RepRise.git
cd reprise

# Enable pnpm and install dependencies
corepack enable
pnpm install
```

### 2. Environment Configuration
```bash
cp apps/mobile/.env.example apps/mobile/.env
cp apps/api/.env.example apps/api/.env
```

### 3. Start Database & Backend API
```bash
# Start local PostgreSQL via Docker
docker compose up -d

# Run database migrations and seed data
pnpm --filter @reprise/api db:push
pnpm --filter @reprise/api db:seed

# Start the API server in watch mode (http://localhost:4000)
pnpm dev:api
```

### 4. Start Mobile Application
```bash
pnpm dev:mobile
```
* Press `a` for Android Emulator.
* Press `i` for iOS Simulator.
* Scan the terminal QR code with **Expo Go** on a physical device.

---

## Testing & Verification

```bash
# Typecheck across all workspace packages
pnpm typecheck

# Run backend and mobile test suites
pnpm test

# Run ESLint across packages
pnpm lint
```

---

## Standalone Android APK & Production Builds

RepRise is configured with **EAS (Expo Application Services)** for automated native compilation:

```bash
# Build standalone Android APK (direct physical device installation)
cd apps/mobile
pnpm build:preview:android

# Build production app bundles (Google Play .aab & App Store .ipa)
pnpm build:production
```

For the complete step-by-step production runbook, see **[DEPLOYMENT.md](DEPLOYMENT.md)**.

---

## License

This project is licensed under the MIT License.
