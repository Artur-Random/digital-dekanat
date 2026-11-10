# digital-dekanat

**«Кабинет, который предупреждает заранее»**: рабочий прототип личного кабинета студента для номинации «Вайб-кодинг» конкурса MGIMO AI Challenge 2026. Вуз-основа: МГПУ, Институт психологии и комплексной реабилитации.

> Концепт для конкурса. Не официальный сервис МГПУ. Все данные вымышленные.

Кабинет показывает не ссылки, а то, что происходит у студента и что ему нужно сделать: пары с переносами, долги со сроками и последствиями, заявления со сроками каждого этапа. Каждое утверждение о правилах ссылается на пункт положения из [реестра норм](docs/norms-registry.md). Подробности: [спецификация](docs/spec-v1.md), [описание процесса](PROCESS.md).

## Стек

Next.js 16 (App Router) + TypeScript (strict), PostgreSQL 18 + Prisma 7, Tailwind CSS 4, Vitest, Playwright, Docker Compose.

## Запуск локально

Нужны Node.js 22+ и Docker.

```bash
npm install                 # зависимости и prisma generate
cp .env.example .env        # заполнить DATABASE_URL и POSTGRES_* (пароль любой случайный)
npm run db:up               # PostgreSQL в Docker на 127.0.0.1:5432
npm run dev                 # http://localhost:3000
```

Проверка: http://localhost:3000/api/health отвечает `{"status":"ok","db":"ok"}`.

Перед первым `npm run test:e2e` браузер для Playwright: `npx playwright install chromium` (если ещё не установлен).

## Команды

| Команда                                   | Что делает                                                                        |
| ----------------------------------------- | --------------------------------------------------------------------------------- |
| `npm run db:up` / `npm run db:down`       | Поднять / остановить PostgreSQL в Docker                                          |
| `npm run dev`                             | Dev-сервер                                                                        |
| `npm run build` / `npm run start`         | Сборка и запуск production                                                        |
| `npm run typecheck`                       | Проверка типов                                                                    |
| `npm run lint`                            | ESLint                                                                            |
| `npm run format` / `npm run format:check` | Prettier: исправить / проверить                                                   |
| `npm run test`                            | Unit-тесты (Vitest)                                                               |
| `npm run test:e2e`                        | E2E-тесты (Playwright; сам поднимает dev-сервер, если `BASE_URL` не задан)        |
| `npm run screenshots`                     | Скриншоты всех экранов в 360 и 1440 px в `docs/process/screenshots/<дата_время>/` |

## Структура

См. [CLAUDE.md](CLAUDE.md), раздел «Структура папок».
