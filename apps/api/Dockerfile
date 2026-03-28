FROM node:22-alpine AS base
WORKDIR /app
RUN corepack enable
COPY . .
RUN pnpm install --frozen-lockfile=false
RUN pnpm --filter @dasheu/api build
CMD ["pnpm", "--filter", "@dasheu/api", "start"]
