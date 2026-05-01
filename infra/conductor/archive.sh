#!/usr/bin/env zsh
set -uo pipefail

# LemurJS per-workspace cleanup. Conductor sends SIGHUP then SIGKILL after ~200ms,
# so this must be FAST: just drop the workspace's Caddy fragment and reload.
# Hostnames are wildcarded via dnsmasq, so there's nothing to clean there.

[[ -z "${CONDUCTOR_WORKSPACE_NAME:-}" ]] && { echo "CONDUCTOR_WORKSPACE_NAME not set." >&2; exit 1; }

WS_SLUG="$(print -r -- "$CONDUCTOR_WORKSPACE_NAME" \
  | tr '[:upper:]' '[:lower:]' \
  | sed -E 's/[^a-z0-9]+/-/g; s/^-+|-+$//g')"
[[ -z "$WS_SLUG" ]] && exit 0

CADDY_ADMIN_ADDR="localhost:2019"
CADDY_GLOBAL_CFG="$HOME/.config/caddy/Caddyfile"
CADDY_FRAGMENT="$HOME/.config/caddy/sites.d/lemurjs-${WS_SLUG}.caddy"

if [[ -f "$CADDY_FRAGMENT" ]]; then
  rm -f "$CADDY_FRAGMENT"
  if curl -sf -m 2 "http://${CADDY_ADMIN_ADDR}/config/" &>/dev/null; then
    caddy reload --config "$CADDY_GLOBAL_CFG" --address "$CADDY_ADMIN_ADDR" \
      && echo "Caddy reloaded." \
      || echo "Caddy reload failed (fragment already deleted)." >&2
  fi
fi

# Stop the per-workspace postgres container. Keep the volume so re-opening
# the workspace later resumes from the same data.
PG_COMPOSE="infra/conductor/docker-compose.yml"
if [[ -f "$PG_COMPOSE" ]] && command -v docker &>/dev/null && docker info &>/dev/null; then
  docker compose -f "$PG_COMPOSE" stop postgres &>/dev/null || true
fi
exit 0
