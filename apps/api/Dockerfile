# ==============================================================================
# RepRise API — Production Multi-Stage Dockerfile
# ==============================================================================

# ------------------------------------------------------------------------------
# Stage 1: Build & Prune
# ------------------------------------------------------------------------------
FROM node:20-alpine AS builder

WORKDIR /app

# Enable Corepack and prepare pnpm
RUN corepack enable && corepack prepare pnpm@9.12.0 --activate

# Copy workspace manifest and lockfiles
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY packages/shared/package.json ./packages/shared/
COPY apps/api/package.json ./apps/api/

# Install workspace dependencies (including devDependencies needed for build)
RUN pnpm install --frozen-lockfile

# Copy source code
COPY packages/shared/ ./packages/shared/
COPY apps/api/ ./apps/api/

# Compile TypeScript for shared and API packages
RUN pnpm --filter @reprise/shared build && pnpm --filter @reprise/api build

# Deploy isolated production-only bundle (strips devDependencies)
RUN pnpm --filter @reprise/api --prod deploy /app/pruned

# ------------------------------------------------------------------------------
# Stage 2: Production Runtime
# ------------------------------------------------------------------------------
FROM node:20-alpine AS runner

WORKDIR /app

# Production environment defaults
ENV NODE_ENV=production \
    PORT=4000

# Install curl/wget for healthcheck
RUN apk add --no-cache wget

# Create non-root unprivileged service user
RUN addgroup -S -g 10001 reprise && \
    adduser -S -u 10001 -G reprise reprise

# Copy pruned application from builder stage
COPY --from=builder --chown=reprise:reprise /app/pruned ./

USER reprise

EXPOSE 4000

# Container healthcheck querying API health endpoint
HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:4000/api/v1/health || exit 1

# Start the compiled production API
CMD ["node", "dist/index.js"]
