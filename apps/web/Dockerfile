# Two stages: Node builds the web app, then nginx serves the result, so the running image holds no Node or sources.
# Built from the repository root (see compose.yaml), because the web app needs packages/ui.
FROM node:20.19-slim AS build
WORKDIR /app
COPY . .
RUN npm ci
RUN npm run build -w web

FROM nginx:1.27-alpine
COPY apps/web/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/apps/web/dist /usr/share/nginx/html
