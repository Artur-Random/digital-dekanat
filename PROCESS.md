# Описание процесса

Журнал разработки прототипа «Кабинет, который предупреждает заранее». После каждой завершённой задачи добавляется запись по шаблону ниже. Промпты Кирилла дословно: [docs/process/prompts.md](docs/process/prompts.md). Скриншоты: [docs/process/screenshots/](docs/process/screenshots/).

## Шаблон записи

```
## ДД.ММ.ГГГГ ЧЧ:ММ МСК. Задача N: название
- Задача: одна строка.
- Что сделано: по пунктам.
- Что пошло не так и как исправлено: по пунктам или «ничего».
- Проверки: какие команды запущены и с каким результатом.
- Субагенты: кто вызван и что нашёл.
- Коммит: хэш и сообщение.
```

---

## 10.11.2026 13:52 МСК. Задача 1: инициализация репозитория

- Задача: каркас проекта, локальная база, хук записи промптов, документы процесса, Playwright со скриншотами, субагенты.
- Что сделано:
  - Next.js 16.4.6 (App Router) + TypeScript 6.0.3 strict (плюс `noUncheckedIndexedAccess`) + Tailwind 4.3.5 + ESLint 9 + Prettier + Vitest. Все версии точные, `save-exact=true` в `.npmrc`.
  - `docker-compose.yml`: PostgreSQL 18.6 (`postgres:18.6-alpine`), volume, healthcheck, порт только `127.0.0.1:5432`. Учётные данные только из `.env`; `.env.example` без значений.
  - Prisma 7.10.1: `prisma.config.ts`, пустая схема, клиент генерируется в `src/generated/prisma` (в `.gitignore`), единственный экземпляр в `src/server/db.ts` через адаптер `@prisma/adapter-pg`.
  - `/api/health`: `SELECT 1` через `src/server/dal/health.ts`, ответ `{"status":"ok","db":"ok"}` или `{"db":"error"}` с кодом 503; в серверный лог пишется только имя класса ошибки.
  - ESLint запрещает импорт Prisma и `@/server/db` вне `src/server/db.ts` и `src/server/dal/**`.
  - Корневой layout с плашкой концепта (текст в `src/lib/concept.ts`), ссылка «Перейти к содержимому», `lang="ru"`. Заглушки S0 `/login`, S1 `/`, E1 `/staff`. Русские страницы 404 и ошибки, `global-error.tsx` со своей плашкой.
  - Шрифт Golos Text (OFL-1.1) из `@fontsource-variable/golos-text`, отдаётся с нашего домена. Иконки lucide-react. Базовые цветовые токены в `@theme` (контраст проверен ui-reviewer, всё не ниже 5,9:1).
  - Заголовки безопасности для всех путей: CSP (`default-src 'self'`, `frame-ancestors 'none'`, без `unsafe-eval` в production), `Referrer-Policy: strict-origin-when-cross-origin`, `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`; `poweredByHeader: false`.
  - Хук UserPromptSubmit: `.claude/settings.json` → `node "$CLAUDE_PROJECT_DIR"/.claude/hooks/log-prompt.mjs`. Поле `prompt`, отсутствие matcher и попадание stdout в контекст при коде 0 сверены с документацией Claude Code (code.claude.com/docs/en/hooks). Скрипт ничего не пишет в stdout, всегда выходит с 0, маскирует секреты: GitHub, PEM, Yandex Cloud (AQVN, t1., YC), `sk-`, AKIA, Bearer, пароль в URL, пары `password/secret/token/api_key/пароль/токен/секрет = …`. Если в промпте уже есть `~~~~`, ограждение удлиняется. 21 unit-тест в `.claude/hooks/log-prompt.test.ts`.
  - Первая запись в `docs/process/prompts.md` (текст задания 1) добавлена вручную с пометкой.
  - Playwright: `baseURL` из `BASE_URL`, по умолчанию `http://localhost:3000`; без `BASE_URL` сам поднимает `npm run dev`. Реестр экранов `e2e/screens.ts`, `loginAs` с TODO в `e2e/auth.ts`.
  - Smoke-тесты для каждого экрана: 200, плашка дословно, нет горизонтального скролла на 360 px, нет запросов на чужие домены, нет ошибок в консоли (ловит нарушения CSP), заголовки безопасности. Отдельно 404 с плашкой и `/api/health`.
  - `npm run screenshots`: 6 PNG в `docs/process/screenshots/2026-11-10_1348/`; если сервер не запущен, скрипт сам поднимает и гасит `next dev`.
  - Субагенты `security-reviewer`, `norms-checker`, `ui-reviewer` в `.claude/agents/`. Frontmatter сверен с документацией: обязательны `name` и `description`, `tools` строкой через запятую. Агентам выдан только `Read, Grep, Glob, Bash`, без `Write`/`Edit`.
  - README, `docs/licenses.md`, список команд в CLAUDE.md.
- Что пошло не так и как исправлено:
  - Версии «latest» не все годятся. У `prisma` тег latest указывает на `8.0.0-rc.33`, взял последнюю стабильную 7.10.1. TypeScript 7.0.2 не поддерживается typescript-eslint (`<6.1.0`), взял 6.0.3. ESLint 10 не поддерживают плагины из eslint-config-next (react, import, jsx-a11y), взял 9.39.5. `@playwright/test` 1.63.0 совпадает с установленным в окружении Chromium.
  - `prisma init` без спроса установил сторонние «skills» для ИИ-агентов в `.claude/skills`, `.agents`, `.windsurf` и `skills-lock.json`, а конфиг назвал `prisma7.config.ts`. Лишние файлы удалил, конфиг переименовал в `prisma.config.ts`.
  - Первый прогон скриншотов захватил значок dev-режима Next.js в углу. Отключил `devIndicators`, папку `2026-11-10_1347` удалил, переснял.
  - `npx prettier --write .` переформатировал исходные документы `docs/spec-v1.md` и `docs/norms-registry.md`. Заметил по `git diff --stat` до коммита, откатил через `git checkout`, добавил их и CLAUDE.md в `.prettierignore`.
  - Тест хука сначала положил в новую папку `tests/unit/`, которой нет в согласованной структуре. Перенёс тест рядом с хуком, в `.claude/hooks/`.
  - `next dev` создаёт `AGENTS.md` и пересоздаёт его при каждом запуске. Закоммитил как есть, иначе дерево всегда грязное.
  - `npm audit`: 8 предупреждений moderate в minimatch внутри цепочки typescript-eslint (только dev, линтер). Не исправлял: `audit fix --force` ломает версии; вернусь, когда выйдет обновление.
- Проверки:
  - `npm run typecheck`: без ошибок.
  - `npm run lint`: без ошибок и предупреждений.
  - `npm run format:check`: всё отформатировано.
  - `npm run test`: 2 файла, 21 тест, все прошли.
  - `npm run test:e2e`: 5 тестов прошли на dev-сервере; дополнительно прогнал их против production-сборки (`npm run build`, `next start`, `BASE_URL=http://localhost:3200`): 5 прошли.
  - `/api/health` при остановленной базе: `{"db":"error"}`, HTTP 503; при запущенной: `{"status":"ok","db":"ok"}`.
  - Ручной прогон хука с тестовым JSON (на копии `prompts.md` в рабочей папке): stdout 0 байт, код 0, запись дописана, токен и пароль скрыты.
  - `git ls-files`: `.env` не в репозитории, только `.env.example`.
- Субагенты (файлы агентов созданы в этой же сессии, поэтому запущены как агенты общего назначения с инструкциями из `.claude/agents/*.md`):
  - security-reviewer: критичного нет. Важно: ESLint не ловил `@/server/db` и относительный импорт `../generated/prisma`, исправлено. Важно: маскирование пропускало Bearer, `sk-…`, `AKIA…`, «пароль:», исправлено и покрыто тестами. Мелочь: `test-results/` и `playwright-report/` не в `.gitignore`, исправлено. Мелочь: `script-src 'unsafe-inline'` в CSP оставлен осознанно (базовый CSP, Next.js без nonce); можно перейти на nonce позже. Мелочь: guards на страницах появятся в задании 2.
  - ui-reviewer: важно: нет `not-found.tsx`, `error.tsx`, `global-error.tsx`, Next показал бы английскую страницу без плашки. Добавлены, плюс e2e-тест на 404. Мелочи (оставлены): скролл проверяется только на 360 px; строка «Экран S0» стоит над `h1` в заглушке; токен `--color-border` (1,42:1) годится только для декоративных рамок.
  - norms-checker: не вызывался, текстов о правилах вуза в задании нет.
- Коммиты:
  - `d55f860` проект: каркас Next.js 16, TypeScript strict, Tailwind 4, ESLint, Prettier, Vitest
  - `7f62969` база: PostgreSQL в Docker, Prisma 7, единый клиент и /api/health
  - `94a7a1a` интерфейс: корневой layout с плашкой концепта, шрифт Golos Text, заглушки S0, S1, E1, страницы 404 и ошибки
  - `445654b` процесс: хук записи промптов с маскированием секретов и первая запись вручную
  - `3ce0542` e2e: реестр экранов, smoke-тесты, автоскриншоты в 360 и 1440 px
  - `9f8494b` агенты: security-reviewer, norms-checker, ui-reviewer
  - `3e29e8a` документы: README, лицензии, команды в CLAUDE.md
  - процесс: запись по заданию 1 в PROCESS.md (этот коммит, его хэш в отчёте)
