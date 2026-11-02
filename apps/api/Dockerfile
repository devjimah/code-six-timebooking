# The API, run with tsx exactly as in `npm start`. Built from the repository root (see compose.yaml),
# because the npm workspace needs the root package files.
FROM node:20.19-slim
WORKDIR /app
COPY . .
RUN npm ci
# Migrations are read from ./drizzle, so the API starts from its own folder.
WORKDIR /app/apps/api
EXPOSE 3001
CMD ["npm", "start"]
