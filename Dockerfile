# syntax=docker/dockerfile:1

# Production image (docs/deploy.md): everything is built here; the final stage keeps only the
# server bundle, its production dependencies, the migrations and the web build.

FROM node:24-slim AS build
WORKDIR /repo
RUN corepack enable

# Dependencies first, so this layer is reused while the lockfile does not change.
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/server/package.json apps/server/
COPY apps/web/package.json apps/web/
COPY packages/shared/package.json packages/shared/
RUN --mount=type=cache,id=pnpm-store,target=/root/.local/share/pnpm/store \
  pnpm install --frozen-lockfile

COPY . .
# The web build is fixed here: a base path or a separate server needs its own image.
ARG VITE_BASE_PATH=/
ARG VITE_SERVER_URL=
RUN pnpm --filter @comicle/web build && pnpm --filter @comicle/server build
# The server's production dependencies only, plus the files listed in its package.json.
RUN pnpm --filter @comicle/server deploy --prod --legacy /out/server

FROM node:24-slim
ENV NODE_ENV=production \
  PORT=3000 \
  HOST=0.0.0.0 \
  SERVE_WEB_DIST=/app/web
WORKDIR /app
# Owned by root and only read by the app user.
COPY --from=build /out/server ./
COPY --from=build /repo/apps/web/dist ./web
USER node
EXPOSE 3000
# No curl in the slim image; Node's fetch does the same.
HEALTHCHECK --interval=15s --timeout=5s --start-period=20s --retries=3 \
  CMD ["node", "-e", "fetch(`http://127.0.0.1:${process.env.PORT}/healthz`).then((r) => process.exit(r.ok ? 0 : 1), () => process.exit(1))"]
# Exec form: Node is PID 1 and gets SIGTERM directly (graceful shutdown in main.ts).
CMD ["node", "dist/main.mjs"]
