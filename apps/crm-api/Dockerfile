# Production image for the NestJS API (used by Railway/Fargate/etc.).
FROM node:20-alpine AS base
WORKDIR /app

# Install deps (monorepo-aware: copy manifests first for layer caching)
FROM base AS deps
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
