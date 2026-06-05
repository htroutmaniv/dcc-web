FROM node:20-alpine AS build
WORKDIR /app
COPY package.json ./
COPY packages/shared/package.json ./packages/shared/
COPY apps/api/package.json ./apps/api/
RUN npm install
COPY packages/shared ./packages/shared
COPY apps/api ./apps/api
RUN npm run build -w @dcc-web/shared
RUN npm run db:generate -w @dcc-web/api
RUN npm run build -w @dcc-web/api

FROM node:20-alpine
RUN apk add --no-cache wget
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/packages/shared ./packages/shared
COPY --from=build /app/apps/api ./apps/api
COPY package.json ./
WORKDIR /app/apps/api
EXPOSE 3003
CMD ["sh", "-c", "npx prisma migrate deploy && node dist/index.js"]
