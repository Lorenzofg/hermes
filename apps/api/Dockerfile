FROM node:22-alpine AS base
RUN corepack enable && corepack prepare pnpm@latest --activate

# ---- deps ----
FROM base AS deps
WORKDIR /app
COPY package.json pnpm-workspace.yaml ./
COPY apps/api/package.json ./apps/api/
COPY packages/types/package.json ./packages/types/
RUN pnpm install --frozen-lockfile

# ---- build ----
FROM deps AS build
COPY packages/types ./packages/types
COPY apps/api ./apps/api
RUN pnpm --filter @cris/api build

# ---- runner ----
FROM node:22-alpine AS runner
RUN corepack enable && corepack prepare pnpm@latest --activate
WORKDIR /app

COPY package.json pnpm-workspace.yaml ./
COPY apps/api/package.json ./apps/api/
COPY packages/types/package.json ./packages/types/
RUN pnpm install --frozen-lockfile --prod

COPY --from=build /app/apps/api/dist ./apps/api/dist
COPY packages/types ./packages/types

WORKDIR /app/apps/api
ENV NODE_ENV=production
EXPOSE 3001

CMD ["node", "dist/index.js"]
