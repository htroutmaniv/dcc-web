FROM oven/bun:1 AS build
WORKDIR /app
COPY package.json bun.lock ./
COPY packages/shared/package.json ./packages/shared/
COPY apps/api/package.json ./apps/api/
ENV SKIP_POSTINSTALL=1
RUN bun install --frozen-lockfile
COPY packages/shared ./packages/shared
COPY apps/api ./apps/api
RUN bun run --filter @dcc-web/shared build
RUN bun run --filter @dcc-web/api db:generate
RUN bun run --filter @dcc-web/api build

FROM oven/bun:1
RUN apt-get update && apt-get install -y --no-install-recommends wget && rm -rf /var/lib/apt/lists/*
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/packages/shared ./packages/shared
COPY --from=build /app/apps/api ./apps/api
COPY package.json bun.lock ./
WORKDIR /app/apps/api
EXPOSE 3003
CMD ["bun", "dist/index.js"]
