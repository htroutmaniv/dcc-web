FROM node:20-alpine AS web-build
WORKDIR /app
COPY package.json ./
COPY packages/shared/package.json ./packages/shared/
COPY apps/web/package.json ./apps/web/
RUN npm install --workspace=@dcc-web/shared --workspace=@dcc-web/web 2>/dev/null || npm install
COPY packages/shared ./packages/shared
COPY apps/web ./apps/web
RUN npm run build -w @dcc-web/shared && npm run build -w @dcc-web/web

FROM nginx:alpine
COPY nginx/default.conf /etc/nginx/conf.d/default.conf
COPY --from=web-build /app/apps/web/dist /usr/share/nginx/html
