# Dasheu Chat

Полностью self-hosted мессенджер с UX, вдохновлённым Telegram Web (без использования Telegram API/MTProto/брендинга), построенный как monorepo `pnpm + turborepo`.

## 1) Краткое архитектурное решение

- **Monorepo:** Turborepo + pnpm workspaces.
- **apps/web:** Next.js web messenger (PWA, service worker, push hooks, websocket-клиент).
- **apps/admin:** Next.js admin panel (`/admin`) для управления пользователями и аудитом.
- **apps/api:** NestJS API (`/api`) + WebSocket gateway (`/ws`) + Prisma + PostgreSQL.
- **Infra:** PostgreSQL, Redis, MinIO, Nginx reverse proxy на одном домене `https://dasheu66.duckdns.org`.
- **Auth:** username/password, JWT access + refresh session table, forced password change on first login.

## 2) Дерево монорепозитория

```text
.
├── apps
│   ├── admin
│   ├── api
│   └── web
├── infra
│   └── nginx
├── packages
│   ├── config
│   ├── eslint-config
│   ├── types
│   └── ui
├── docker-compose.yml
├── docker-compose.prod.yml
├── Makefile
├── package.json
├── pnpm-workspace.yaml
└── turbo.json
```

## 3) Реализованные ключевые файлы

- Prisma schema + initial migration: `apps/api/prisma/schema.prisma`, `apps/api/prisma/migrations/*`
- Seed owner из env: `apps/api/prisma/seed.ts`
- API модули: auth, me, chats, messaging, admin, push, health.
- Web PWA: `apps/web/public/manifest.webmanifest`, `apps/web/public/sw.js`
- Same-origin proxy: `infra/nginx/default.conf`
- Local/prod compose: `docker-compose.yml`, `docker-compose.prod.yml`

## 4) API (основное)

- `POST /api/auth/login`
- `POST /api/auth/refresh`
- `POST /api/auth/logout`
- `GET /api/me`
- `PATCH /api/me/password`
- `GET /api/me/sessions`
- `DELETE /api/me/sessions/:id`
- `GET /api/chats`
- `POST /api/chats/direct/:userId`
- `POST /api/chats/group`
- `GET /api/chats/:id/messages`
- `POST /api/chats/:id/messages`
- `PATCH /api/messages/:id`
- `DELETE /api/messages/:id`
- `POST /api/messages/:id/reactions`
- `POST /api/push/subscribe`
- `DELETE /api/push/subscribe`
- `GET /api/admin/dashboard`
- `GET/POST/PATCH /api/admin/users...`
- `GET /api/admin/chats`
- `GET /api/admin/audit-logs`
- `GET /api/admin/reports`

Swagger: `https://dasheu66.duckdns.org/api/docs`

## 5) WebSocket события (v1)

- `connection/authenticated`
- `chat:join`
- `typing:start`
- `message:new`

Endpoint: `wss://dasheu66.duckdns.org/ws`

## 6) Локальный запуск

1. Установить Node 22+, pnpm, Docker.
2. Скопировать env:
   ```bash
   cp .env.example .env
   ```
3. Поднять сервисы:
   ```bash
   make up
   ```
4. Применить миграции и seed:
   ```bash
   make migrate
   make seed
   ```
5. Открыть:
   - Web: `http://localhost/`
   - Admin: `http://localhost/admin`
   - API docs: `http://localhost/api/docs`

## 7) Production (Linux VPS, single-host)

1. DNS на `dasheu66.duckdns.org` -> VPS IP.
2. Скопировать репозиторий, заполнить `.env` (секреты, VAPID, JWT).
3. Запуск:
   ```bash
   docker compose -f docker-compose.prod.yml up -d --build
   ```
4. Миграции/seed:
   ```bash
   docker compose -f docker-compose.prod.yml exec api pnpm --filter @dasheu/api prisma:migrate
   docker compose -f docker-compose.prod.yml exec api pnpm --filter @dasheu/api seed
   ```
5. TLS/HTTPS:
   - Рекомендуется certbot + nginx или внешний reverse proxy (Caddy/Traefik) с автоTLS.

## 8) HTTPS и security notes

- В проде включить `COOKIE_SECURE=true`, `FORCE_HTTPS=true`.
- Сгенерировать сильные `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`.
- Ограничить доступ к admin по VPN/IP allowlist (опционально).
- Backup:
  - PostgreSQL: `pg_dump` по cron.
  - MinIO: `mc mirror`/snapshot.

## 9) Web Push setup

Генерация VAPID:
```bash
npx web-push generate-vapid-keys
```
Скопировать ключи в `.env`:
- `VAPID_PUBLIC_KEY`
- `VAPID_PRIVATE_KEY`

## 10) Первый owner/admin

Создаётся через seed:
- `OWNER_USERNAME=owner`
- `OWNER_PASSWORD=ChangeMeNow_12345`

После первого входа требуется смена пароля (`mustChangePassword=true`).

## 11) Создание пользователей через admin

1. Войти owner в `/admin`.
2. В блоке создания пользователя указать username/password/role.
3. Пользователь будет создан c `mustChangePassword=true`.

## 12) Что реализовано

- Self-hosted архитектура без Telegram зависимостей.
- Username/password login + forced password change flag.
- RBAC roles в БД.
- Session table + refresh token workflow.
- Чаты/direct/group и отправка сообщений.
- Реакции и edit history.
- Admin dashboard + user management + audit logs.
- PWA manifest + service worker + notification click routing.
- Docker compose + nginx same-origin routing.

## 13) Известные ограничения / deferred

- Каналы (broadcast permissions) реализованы на уровне модели БД, но UI/advanced logic — следующий этап.
- Полноценные attachment upload + MinIO lifecycle и антивирусный pipeline требуют доработки.
- Полный UX parity (архив/пин/драфты/emoji picker/reply-forward UI) частично заложены в схеме, но не весь UI закончен.
- Отдельные security-hardening элементы (CSRF для cookie flow, полноценный brute-force lockout) требуют расширения.
- E2E Playwright сценарии нужно добавить (каркас тестов подготовлен частично).

## 14) Команды качества

```bash
pnpm install
pnpm lint
pnpm typecheck
pnpm test
```

## 15) Следующие улучшения

1. Полный production-grade upload pipeline (MIME sniffing, scan hooks, presigned flow).
2. Полный Telegram-like UX (threads, pinned UI, drafts, chat folders, keyboard shortcuts).
3. Presence/read receipts в realtime с Redis pub/sub scaling.
4. Полный moderation workflow (reports triage, actions, notes UI).
5. Playwright e2e + нагрузочное тестирование websocket.

