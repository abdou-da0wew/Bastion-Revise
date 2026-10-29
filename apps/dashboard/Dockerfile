# syntax=docker/dockerfile:1
FROM oven/bun:1 AS deps
WORKDIR /app
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile

FROM node:22-slim AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
RUN npx next build

FROM node:22-slim AS runtime
ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1 PORT=3000 HOSTNAME=0.0.0.0
WORKDIR /app
RUN groupadd -r bastion && useradd -r -g bastion bastion
COPY --from=builder /app/public ./public
COPY --from=builder --chown=bastion:bastion /app/.next/standalone ./
COPY --from=builder --chown=bastion:bastion /app/.next/static ./.next/static
USER bastion
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:3000/login').then(r=>{if(!r.ok)process.exit(1)}).catch(()=>process.exit(1))"
# Exec-form ENTRYPOINT pins the executable as PID 1 (clean SIGTERM);
# CMD carries tunable defaults that `docker run … <args>` may override.
ENTRYPOINT ["node", "server.js"]
CMD []
