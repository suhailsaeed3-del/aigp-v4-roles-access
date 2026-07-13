# ---- deps ----
FROM node:22-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm ci || npm install

# ---- builder ----
FROM node:22-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# NEXT_PUBLIC_* values are inlined into the client bundle at build time, so they
# MUST be set BEFORE `npm run build`. Production defaults: Postgres-backed API
# mode, real UAE PASS login, NO role-switcher, NO demo data. Override any of
# these with `--build-arg` (or docker-compose build.args) if needed.
ARG NEXT_PUBLIC_DATA_MODE=api
ARG NEXT_PUBLIC_UAEPASS_MODE=live
ARG NEXT_PUBLIC_DEFAULT_ROLE=entity
ARG NEXT_PUBLIC_BASE_PATH=
ARG NEXT_PUBLIC_DEMO_MODE=0
ARG NEXT_PUBLIC_DEMO_DATA=0
ARG NEXT_PUBLIC_AUTH_PROVIDER=mock
ENV NEXT_PUBLIC_DATA_MODE=$NEXT_PUBLIC_DATA_MODE \
    NEXT_PUBLIC_UAEPASS_MODE=$NEXT_PUBLIC_UAEPASS_MODE \
    NEXT_PUBLIC_DEFAULT_ROLE=$NEXT_PUBLIC_DEFAULT_ROLE \
    NEXT_PUBLIC_BASE_PATH=$NEXT_PUBLIC_BASE_PATH \
    NEXT_PUBLIC_DEMO_MODE=$NEXT_PUBLIC_DEMO_MODE \
    NEXT_PUBLIC_DEMO_DATA=$NEXT_PUBLIC_DEMO_DATA \
    NEXT_PUBLIC_AUTH_PROVIDER=$NEXT_PUBLIC_AUTH_PROVIDER
RUN npx prisma generate
RUN npm run build

# ---- runner ----
FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/prisma ./prisma
EXPOSE 3000
CMD ["npm", "run", "start"]
