# syntax=docker/dockerfile:1
# ---- deps (cached unless package.json / bun.lock change) ----
FROM oven/bun:1 AS deps
WORKDIR /app
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile --production

# ---- runtime ----
FROM oven/bun:1-slim AS runtime
ENV NODE_ENV=production \
    CDN_HOST=0.0.0.0 \
    CDN_PORT=3005 \
    CDN_ROOT_DIR=/opt/celecdn/public \
    CDN_PACKAGE_DIR=/opt/celecdn/packages \
    CDN_DATA_DIR=/opt/celecdn/data
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY package.json bun.lock index.ts tsconfig.json ./
COPY src ./src

# Persistent state lives on the /opt/celecdn volume (bind-mounted by compose).
RUN mkdir -p /opt/celecdn/public /opt/celecdn/packages /opt/celecdn/data /opt/celecdn/logs \
  && chown -R bun:bun /opt/celecdn /app
USER bun
EXPOSE 3005
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD bun -e "const r=await fetch('http://127.0.0.1:3005/health'); if(!r.ok) process.exit(1)"
# Exec-form ENTRYPOINT pins the runtime as PID 1 (signals reach Bun directly);
# CMD holds the default entry file and can be overridden (`docker run celecdn other.ts`).
ENTRYPOINT ["bun"]
CMD ["index.ts"]
