ARG NODE_VERSION=24

FROM node:${NODE_VERSION}-alpine AS base
ENV PNPM_HOME=/pnpm \
    PATH=/pnpm:$PATH \
    NEXT_TELEMETRY_DISABLED=1

RUN corepack enable
WORKDIR /app

FROM base AS dependencies
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN --mount=type=cache,id=pnpm,target=/pnpm/store \
    pnpm install --frozen-lockfile

FROM base AS builder

ARG BASE_PATH=/avatar
ARG NEXT_PUBLIC_BASE_API_URL_HEYGEN=https://api.liveavatar.com
ENV BASE_PATH=${BASE_PATH} \
    NEXT_PUBLIC_BASE_API_URL_HEYGEN=${NEXT_PUBLIC_BASE_API_URL_HEYGEN}

COPY --from=dependencies /app/node_modules ./node_modules
COPY . .

RUN pnpm run build

FROM node:${NODE_VERSION}-alpine AS runner
ARG BASE_PATH=/avatar

WORKDIR /app
ENV BASE_PATH=${BASE_PATH} \
    NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3000 \
    HOSTNAME=0.0.0.0

COPY --from=builder --chown=node:node /app/.next/standalone ./
COPY --from=builder --chown=node:node /app/.next/static ./.next/static

USER node
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
    CMD wget -qO /dev/null "http://127.0.0.1:3000${BASE_PATH}/login" || exit 1
CMD ["node", "server.js"]
