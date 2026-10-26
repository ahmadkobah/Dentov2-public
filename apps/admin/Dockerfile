FROM node:20-alpine AS base
RUN corepack enable && corepack prepare pnpm@9.15.4 --activate

# ── Dependencies ─────────────────────────────────────────
FROM base AS deps
WORKDIR /app
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/admin/package.json ./apps/admin/
COPY packages/shared/package.json ./packages/shared/
COPY packages/ui/package.json ./packages/ui/
RUN pnpm install --frozen-lockfile --filter @dento/admin...

# ── Build ────────────────────────────────────────────────
FROM base AS build
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/apps/admin/node_modules ./apps/admin/node_modules
COPY --from=deps /app/packages/shared/node_modules ./packages/shared/node_modules
COPY --from=deps /app/packages/ui/node_modules ./packages/ui/node_modules
COPY . .

ARG VITE_API_URL
ARG VITE_SENTRY_DSN
ENV VITE_API_URL=$VITE_API_URL
ENV VITE_SENTRY_DSN=$VITE_SENTRY_DSN

RUN pnpm --filter @dento/shared build
RUN pnpm --filter @dento/ui build
RUN pnpm --filter @dento/admin build

# ── Production — nginx ───────────────────────────────────
FROM nginx:1.27-alpine AS production

# Allow the deployer to inject the API origin into the CSP without rebuilding.
# Defaults to 'self' for same-origin deployments. Set CSP_API_ORIGIN to e.g.
# "https://api.dento.example.com" when the API is on a different origin.
ENV CSP_API_ORIGIN="'self'"
ENV CSP_EXTRA_CONNECT=""
# Restrict envsubst to our CSP_* template variables so nginx's own $uri /
# $http_* references survive untouched.
ENV NGINX_ENVSUBST_FILTER="^CSP_"

COPY --from=build /app/apps/admin/dist /usr/share/nginx/html
COPY apps/admin/nginx.conf /etc/nginx/templates/default.conf.template

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
