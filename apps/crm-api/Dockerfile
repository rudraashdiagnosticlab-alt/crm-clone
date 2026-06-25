# Production image for the NestJS API (used by Railway/Fargate/etc.).
# Debian (slim) + Node 22 to match the local runtime: bcrypt has glibc prebuilds
# (Alpine/musl has none), Prisma gets real OpenSSL, and Node 22 can load the
# TypeScript `@crm/database` package (require of ESM/TS) the same way dev does.
FROM node:22-slim AS base
WORKDIR /app
# openssl: required by Prisma. Debian slim ships without it.
RUN apt-get update \
  && apt-get install -y --no-install-recommends openssl ca-certificates \
  && rm -rf /var/lib/apt/lists/*

# Install deps (monorepo-aware: copy manifests first for layer caching)
FROM base AS deps
# Build toolchain for native addons (bcrypt) when no prebuilt binary matches.
RUN apt-get update \
  && apt-get install -y --no-install-recommends python3 make g++ \
  && rm -rf /var/lib/apt/lists/*
COPY package.json package-lock.json* ./
COPY apps/crm-api/package.json ./apps/crm-api/
COPY packages/database/package.json ./packages/database/
RUN npm install

FROM base AS build
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run -w @crm/database generate \
  && npm run -w @crm/api build

FROM base AS runtime
ENV NODE_ENV=production
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/apps/crm-api/dist ./apps/crm-api/dist
COPY --from=build /app/packages ./packages
COPY --from=build /app/apps/crm-api/package.json ./apps/crm-api/
EXPOSE 4000
CMD ["node", "apps/crm-api/dist/main.js"]
