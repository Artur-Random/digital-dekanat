#!/usr/bin/env bash
# Runs on the server as user "deploy" (copied to /opt/dekanat by deploy.yml).
#   remote-deploy.sh deploy <tag>     load images, migrate, demo-reset, up, wait for health
#   remote-deploy.sh rollback <tag>   switch app to an image that is already on the server
#   remote-deploy.sh has-image <ref>  exit 0 if the image exists (used to skip uploads)
#   remote-deploy.sh previous         print the previous app tag (empty if none)
# Never prints /opt/dekanat/.env.
set -euo pipefail

DIR="${DEKANAT_DIR:-/opt/dekanat}"
KEEP=3
cd "$DIR"

action="${1:-}"
tag="${2:-}"

compose() {
  docker compose -f compose.prod.yml --env-file .env --env-file release.env "$@"
}

current_tag() {
  if [[ -f release.env ]]; then sed -n 's/^APP_TAG=//p' release.env; fi
}

check_tag() {
  [[ "$1" =~ ^[0-9a-f]{7,40}$ ]] || { echo "invalid tag" >&2; exit 2; }
}

set_release() {
  local cur
  cur="$(current_tag)"
  if [[ -n "$cur" && "$cur" != "$1" ]]; then echo "$cur" > release.prev; fi
  echo "APP_TAG=$1" > release.env
}

wait_healthy() {
  local id status
  for _ in $(seq 1 40); do
    id="$(compose ps -q app)"
    status="$(docker inspect -f '{{.State.Health.Status}}' "$id" 2>/dev/null || true)"
    if [[ "$status" == "healthy" ]]; then echo "app is healthy"; return 0; fi
    sleep 3
  done
  echo "app did not become healthy" >&2
  compose ps >&2
  return 1
}

prune_old() {
  local cur prev old
  cur="$(current_tag)"
  prev="$(cat release.prev 2>/dev/null || true)"
  # Newest first; keep $KEEP app tags, never remove the current or previous one.
  old="$(docker images dekanat-app --format '{{.CreatedAt}} {{.Tag}}' | sort -r |
    awk '{print $NF}' | tail -n +"$((KEEP + 1))")"
  for t in $old; do
    [[ "$t" == "$cur" || "$t" == "$prev" ]] && continue
    docker rmi "dekanat-app:$t" "dekanat-tools:$t" >/dev/null 2>&1 || true
    echo "removed old images $t"
  done
}

case "$action" in
  deploy)
    check_tag "$tag"
    for f in base-images.tar.gz "images-$tag.tar.gz"; do
      if [[ -f "$f" ]]; then gunzip -c "$f" | docker load; rm -f "$f"; fi
    done
    docker image inspect "dekanat-app:$tag" "dekanat-tools:$tag" >/dev/null
    set_release "$tag"
    compose up -d db
    compose --profile tools run --rm tools migrate
    compose --profile tools run --rm tools demo-reset
    compose up -d --remove-orphans
    wait_healthy
    prune_old
    ;;
  rollback)
    check_tag "$tag"
    docker image inspect "dekanat-app:$tag" "dekanat-tools:$tag" >/dev/null
    set_release "$tag"
    compose up -d --remove-orphans
    wait_healthy
    ;;
  has-image)
    docker image inspect "$tag" >/dev/null 2>&1
    ;;
  previous)
    cat release.prev 2>/dev/null || true
    ;;
  *)
    echo "usage: remote-deploy.sh deploy|rollback <tag> | has-image <ref> | previous" >&2
    exit 2
    ;;
esac
