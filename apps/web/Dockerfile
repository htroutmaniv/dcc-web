FROM node:20-alpine AS build
WORKDIR /app
COPY package.json package-lock.json* ./
COPY packages/shared ./packages/shared
COPY apps/web ./apps/web
RUN npm ci 2>/dev/null || npm install
RUN npm run build -w @dcc-web/shared
RUN npm run build -w @dcc-web/web

FROM nginx:alpine
COPY --from=build /app/apps/web/dist /usr/share/nginx/html
# SPA fallback handled by main nginx service
EXPOSE 80
