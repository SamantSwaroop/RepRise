# RepRise — Production Deployment & Store Release Runbook

This runbook provides complete, production-tested instructions for deploying the **RepRise API** backend and publishing the **RepRise Mobile App** to Google Play and the Apple App Store.

---

## Architecture Overview

```
                      ┌─────────────────────────────────────────┐
                      │            RepRise Monorepo             │
                      └────────────────────┬────────────────────┘
                                           │
                 ┌─────────────────────────┴─────────────────────────┐
                 ▼                                                   ▼
       Backend Infrastructure                               Mobile Application
 ┌───────────────────────────────────┐               ┌─────────────────────────────────┐
 │ • Express API (Node 20 ESM)       │               │ • Expo SDK 57 (React Native 0.86│
 │ • Multi-stage Docker Container    │               │ • EAS Build (AAB / IPA / APK)   │
 │ • PostgreSQL 16 (Drizzle ORM)     │               │ • Google Play & App Store       │
 │ • Caddy / Cloudflare SSL Proxy    │               │ • EAS Update (Over-The-Air)     │
 └───────────────────────────────────┘               └─────────────────────────────────┘
```

---

## Part 1: Backend Deployment

The RepRise API is containerized using a secure, unprivileged multi-stage Alpine Docker container (`apps/api/Dockerfile`).

### Option A: Self-Hosted VPS Deployment (Docker Compose + Caddy SSL)

Recommended for VPS providers like DigitalOcean, Hetzner, Linode, or AWS EC2.

#### 1. Server Prerequisites
- Ubuntu 22.04 LTS or Debian 12
- Docker Engine 24+ & Docker Compose v2 (`sudo apt install docker-compose-plugin`)
- Domain name pointing to your server's public IP (e.g. `api.reprise.fit`)

#### 2. Clone Repository & Setup Environment
```bash
# On your server
git clone https://github.com/SamantSwaroop/RepRise.git reprise
cd reprise

# Configure production environment
cp apps/api/.env.production.example .env
nano .env
```

Generate secure secrets for `.env`:
```bash
# Generate 48-byte cryptographically secure random secrets
openssl rand -base64 48 # Copy to JWT_ACCESS_SECRET
openssl rand -base64 48 # Copy to JWT_REFRESH_SECRET
openssl rand -base64 24 # Copy to POSTGRES_PASSWORD
```

Ensure your `.env` contains:
```env
PORT=4000
POSTGRES_USER=reprise
POSTGRES_PASSWORD=your_generated_postgres_password
POSTGRES_DB=reprise
JWT_ACCESS_SECRET=your_generated_jwt_access_secret
JWT_REFRESH_SECRET=your_generated_jwt_refresh_secret
```

#### 3. Build & Launch Containers
```bash
# Launch PostgreSQL and RepRise API in detached mode
docker compose -f docker-compose.prod.yml up -d --build

# Verify container health
docker compose -f docker-compose.prod.yml ps
# Both reprise-postgres-prod and reprise-api-prod should show "(healthy)"

# Test API healthcheck locally on the server
curl http://localhost:4000/api/v1/health
# Response: {"data":{"status":"ok","service":"reprise-api","timestamp":"..."}}
```

#### 4. Run Initial Database Schema Push
```bash
# Push the Drizzle schema to the newly initialized Postgres database
docker compose -f docker-compose.prod.yml exec api npx drizzle-kit push
```

#### 5. Automatic SSL with Caddy Reverse Proxy
Install Caddy for automatic Let's Encrypt certificates:
```bash
sudo apt install -y debian-keyring debian-archive-keyring apt-transport-https curl
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' | sudo gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' | sudo tee /etc/apt/sources.list.d/caddy-stable.list
sudo apt update && sudo apt install caddy
```

Edit `/etc/caddy/Caddyfile`:
```caddy
api.reprise.fit {
    reverse_proxy localhost:4000

    header {
        Strict-Transport-Security "max-age=31536000; includeSubDomains; preload"
        X-Content-Type-Options "nosniff"
        X-Frame-Options "DENY"
    }
}
```
Reload Caddy:
```bash
sudo systemctl reload caddy
```
Your API is now live with automatic HTTPS at `https://api.reprise.fit/api/v1/health`!

---

### Option B: Cloud Platform Deployment (Railway / Render / Fly.io)

For fully managed serverless container deployments:

1. **Database**: Provision a managed PostgreSQL instance (Supabase, Neon, or Railway Postgres).
2. **Build Settings**:
   - **Root Directory**: `.` (Repository root)
   - **Dockerfile Path**: `apps/api/Dockerfile`
3. **Environment Variables**:
   - `NODE_ENV`: `production`
   - `PORT`: `4000`
   - `DATABASE_URL`: Your managed PostgreSQL connection URI with SSL (`?sslmode=require`)
   - `JWT_ACCESS_SECRET`: Generated 48-byte secret
   - `JWT_REFRESH_SECRET`: Generated 48-byte secret
4. **Health Check Path**: `/api/v1/health`

---

## Part 2: Independent Web App (PWA) Deployment for iPhone Safari

RepRise is fully configured as a standalone Progressive Web App (PWA) with native iOS Safari standalone tags (`apple-mobile-web-app-capable`, `apple-touch-icon`, `viewport-fit=cover`, theme colors, and SQLite WebAssembly support).

You can deploy the web app for **free** on Vercel or Cloudflare Pages, open the URL in Safari on your iPhone, and install it directly to your home screen—**no Apple Developer account or App Store approval required**.

### 1. Build the Production Web Bundle
```bash
# Set your production API URL
export EXPO_PUBLIC_API_URL=https://api.yourdomain.com/api/v1

# Build the static web app (outputs to apps/mobile/dist)
pnpm build:web
```

### 2. Deploy to Cloudflare Pages (Recommended - Free & Fast)
1. In Cloudflare Dashboard -> **Workers & Pages** -> **Create application** -> **Pages**.
2. Connect your Git repository.
3. Set the build settings:
   - **Framework preset**: `None`
   - **Build command**: `pnpm build:web`
   - **Build output directory**: `apps/mobile/dist`
   - **Root directory**: `/`
4. Add Environment Variable:
   - `EXPO_PUBLIC_API_URL`: Your live backend API URL (e.g., `https://api.reprise.fit/api/v1` or Render URL).
5. Deploy! (Security headers for SQLite WASM are automatically applied from `apps/mobile/public/_headers`).

### 3. Deploy to Vercel (Alternative - Free)
1. Import your GitHub repository on Vercel.
2. Set Root Directory to `apps/mobile`.
3. Set Build Command to `npx expo export -p web` and Output Directory to `dist`.
4. Add Environment Variable `EXPO_PUBLIC_API_URL`.
5. Deploy! (Routing rewrites and COOP/COEP headers are automatically applied from `apps/mobile/vercel.json`).

### 4. Install RepRise on iPhone (Safari)
1. On your iPhone, open **Safari** and navigate to your deployed HTTPS URL (e.g. `https://reprise.pages.dev`).
2. Tap the **Share** button (the square with an arrow pointing upward at the bottom of Safari).
3. Scroll down and tap **"Add to Home Screen"**.
4. Confirm the name **RepRise** and tap **Add** in the top right.
5. An app icon will appear on your iPhone home screen!
6. When opened from your home screen:
   - It runs in **standalone mode** (no Safari URL bar, bottom navigation bar, or browser chrome).
   - It runs full screen with your custom dark theme and status bar.
   - It stores workout sessions locally on your device with offline guest mode and syncs to your backend when online.

---

## Part 3: Native Mobile App Store Release (EAS Pipeline)

RepRise uses Expo Application Services (EAS) for cloud-native binary compilation and store submission.

### 1. Prerequisites
- [Expo Account](https://expo.dev) (free tier works for EAS builds)
- [Apple Developer Account](https://developer.apple.com) ($99/year) for iOS App Store & TestFlight
- [Google Play Console Developer Account](https://play.google.com/console) ($25 one-time) for Android Play Store
- Install EAS CLI locally:
  ```bash
  npm install -g eas-cli
  eas login
  ```

### 2. Configure Environment Variable for Production API
In `apps/mobile/.env`, point `EXPO_PUBLIC_API_URL` to your live production API:
```env
EXPO_PUBLIC_API_URL=https://api.reprise.fit
```

### 3. Initialize EAS Project
```bash
cd apps/mobile
eas project:init
```
This links your repository with your Expo account and injects the `projectId` into `app.json`.

---

### 4. Build a Preview APK for Android (Direct Device Testing)

To test the standalone native release on any physical Android device without waiting for Google Play review:
```bash
cd apps/mobile
pnpm build:preview:android
# Or: eas build --platform android --profile preview
```
- EAS will compile a native `.apk` binary.
- Once complete, scan the terminal QR code or open the link on your Android phone to download and install RepRise immediately.

---

### 5. Production Store Builds

Compile store-ready binaries with production optimization:
```bash
cd apps/mobile

# Build Android App Bundle (.aab) for Google Play
eas build --platform android --profile production

# Build iOS Archive (.ipa) for App Store Connect
eas build --platform ios --profile production

# Or build both simultaneously in parallel:
pnpm build:production
```

EAS automatically manages:
- **Android**: Generates and stores your production release keystore securely in the Expo secret store.
- **iOS**: Logs into Apple Developer, generates the Distribution Certificate and App Store Provisioning Profile.
- **Auto-Increment**: Automatically bumps `buildNumber` and `versionCode`.

---

### 6. Submitting to Google Play Store

#### Initial Setup in Google Play Console:
1. Create a new app: **RepRise** (Default language: English, Type: App, Free).
2. Complete the **Set up your app** tasks:
   - **Privacy Policy**: Link to your hosted privacy policy.
   - **App Access**: All functionality is available without restriction.
   - **Ads**: RepRise contains no ads.
   - **Content Rating**: Complete questionnaire (Utility/Health/Fitness -> All ages / Everyone).
   - **Target Audience**: 13+.
   - **Data Safety**:
     - User account info (email, name) collected for account authentication.
     - Fitness & workout history collected for app functionality.
     - Data is encrypted in transit (HTTPS/TLS).
     - Users can request account and data deletion via `/settings`.
3. In **Store Presence -> Main store listing**:
   - Short description: `Track every rep, beat your best.`
   - Full description: Highlight offline-first tracking, PR detection, muscle visualizer, rest timer, and privacy.
   - Upload `assets/icon.png` (512x512 / 1024x1024), feature graphic, and phone screenshots.
4. **Submit via EAS**:
   ```bash
   eas submit -p android --profile production
   ```
   Or manually download the `.aab` from your EAS dashboard and drag it into **Closed Testing** in Google Play Console.

---

### 7. Submitting to Apple App Store Connect

#### Initial Setup in App Store Connect:
1. In App Store Connect, click **+ -> New App**:
   - Name: **RepRise - Workout Tracker**
   - Bundle ID: `com.reprise.fitness`
   - SKU: `reprise-fitness-ios`
2. **App Privacy**:
   - Data Used to Track You: None.
   - Data Linked to You: Contact Info (Email, Name), User Content (Workout data).
3. **Submit via EAS**:
   ```bash
   eas submit -p ios --profile production
   ```
   The `.ipa` will automatically upload to **TestFlight** in App Store Connect.
4. From TestFlight, invite internal and external testers. Once validated, select the build in **App Store -> 1.0.0 Prepare for Submission** and click **Submit for Review**.

---

## Part 3: Over-The-Air (OTA) Updates with EAS Update

When you need to fix a bug or tweak UI copy without going through App Store review:
```bash
# Configure EAS update channel
eas update:configure

# Publish an instant update to production users
eas update --branch production --message "Fix metric unit conversion label"
```
Users will automatically receive the updated JavaScript bundle on their next app restart!

---

## Quick Reference Commands

| Task | Command |
|---|---|
| **TypeScript Check** | `pnpm typecheck` |
| **Lint Check** | `pnpm lint` |
| **Run All Tests** | `pnpm test` |
| **Build API (Local)** | `pnpm --filter @reprise/api build` |
| **Export Mobile JS Bundle** | `pnpm --filter @reprise/mobile export` |
| **Docker Compose Prod** | `docker compose -f docker-compose.prod.yml up -d --build` |
| **Build Android Preview APK** | `cd apps/mobile && pnpm build:preview:android` |
| **Build Production App Bundles**| `cd apps/mobile && pnpm build:production` |
| **Submit to Stores** | `cd apps/mobile && eas submit --platform all` |
