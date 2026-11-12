#!/bin/sh
# Entrypoint of the tools image: database migrations and demo data reset.
set -eu
cd /app
case "${1:-help}" in
  migrate)
    exec node_modules/.bin/prisma migrate deploy
    ;;
  demo-reset)
    exec node --conditions=react-server dist/reset-demo.mjs
    ;;
  *)
    echo "usage: tools migrate | tools demo-reset" >&2
    exit 2
    ;;
esac
