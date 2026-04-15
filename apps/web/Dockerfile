FROM node:22-alpine AS base
RUN corepack enable && corepack prepare pnpm@latest --activate

# ---- deps ----
FROM base AS deps
WORKDIR /app
COPY package.json pnpm-workspace.yaml ./
COPY apps/web/package.json ./apps/web/
COPY packages/types/package.json ./packages/types/
RUN pnpm install --frozen-lockfile

# ---- build ----
FROM deps AS build
COPY packages/types ./packages/types
COPY apps/web ./apps/web
RUN pnpm --filter @cris/web build

# ---- runner (nginx) ----
FROM nginx:alpine AS runner
COPY --from=build /app/apps/web/dist /usr/share/nginx/html
COPY apps/web/nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
