#!/usr/bin/env bash
# npm run submission:archive: zip исходников с историей git для жюри.
# Берётся только закоммиченное (через git clone), поэтому .env, node_modules, .next,
# отчёты тестов и прочие артефакты в архив не попадают. Перед упаковкой клон проверяется
# на файлы .env* и строки, похожие на секреты (scripts/check-secrets.mjs).
#
# Переменные: ARCHIVE_SOURCE (репозиторий, по умолчанию текущий),
#             ARCHIVE_OUT_DIR (куда положить zip, по умолчанию dist-submission/).
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SOURCE="${ARCHIVE_SOURCE:-$(git -C "$SCRIPT_DIR/.." rev-parse --show-toplevel)}"
OUT_DIR="${ARCHIVE_OUT_DIR:-$SOURCE/dist-submission}"
STAMP="$(TZ=Europe/Moscow date +%Y-%m-%d_%H%M)"
NAME="digital-dekanat-source-$STAMP.zip"

if [ -n "$(git -C "$SOURCE" status --porcelain)" ]; then
  echo "Внимание: есть незакоммиченные изменения, в архив они не попадут." >&2
fi

WORK="$(mktemp -d)"
trap 'rm -rf -- "$WORK"' EXIT

git clone --quiet --no-local "$SOURCE" "$WORK/digital-dekanat"
# Ссылка на локальный путь исходного репозитория жюри не нужна.
git -C "$WORK/digital-dekanat" remote remove origin

node "$SCRIPT_DIR/check-secrets.mjs" "$WORK/digital-dekanat"

mkdir -p "$OUT_DIR"
(cd "$WORK" && zip -qr -X "$WORK/$NAME" digital-dekanat)
mv "$WORK/$NAME" "$OUT_DIR/$NAME"
echo "Архив: $OUT_DIR/$NAME"
