# syntax=docker/dockerfile:1

FROM node:24-slim AS build
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .
RUN npm run build
# Migration runner and seed live outside the Nest build (tsconfig.build.json
# excludes `scripts`), so they get their own compilation pass.
RUN npx tsc -p tsconfig.scripts.json

FROM node:24-slim AS production
WORKDIR /app
ENV NODE_ENV=production

COPY package.json package-lock.json ./
RUN npm ci --omit=dev

COPY --from=build /app/dist ./dist
COPY --from=build /app/dist-scripts ./dist-scripts
# The migrator reads the .sql files at runtime; `nest build` only emits JS.
COPY --from=build /app/src/shared/config/database/migrations ./migrations
# `dotenv` is a devDependency, but the seed imports it. Copying just the package
# keeps it available without promoting it to a production dependency.
COPY --from=build /app/node_modules/dotenv ./node_modules/dotenv

COPY docker-entrypoint.sh /usr/local/bin/docker-entrypoint.sh

EXPOSE 3000

ENTRYPOINT ["docker-entrypoint.sh"]
CMD ["node", "dist/main"]
