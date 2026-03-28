FROM node:22-alpine
WORKDIR /app
RUN corepack enable
COPY . .
RUN pnpm install --frozen-lockfile=false
RUN pnpm --filter @dasheu/web build
CMD ["pnpm", "--filter", "@dasheu/web", "start"]
