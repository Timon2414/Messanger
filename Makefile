.PHONY: up down migrate seed lint typecheck test

up:
	docker compose up -d --build

down:
	docker compose down

migrate:
	docker compose exec api pnpm --filter @dasheu/api prisma:migrate

seed:
	docker compose exec api pnpm --filter @dasheu/api seed

lint:
	pnpm lint

typecheck:
	pnpm typecheck

test:
	pnpm test
