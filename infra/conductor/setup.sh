#!/usr/bin/env zsh
set -euo pipefail

# LemurJS per-workspace setup. Conductor exports:
#   CONDUCTOR_ROOT_PATH      — source repo (where committed/local .env* files live)
#   CONDUCTOR_WORKSPACE_NAME — human-readable workspace name
#   CONDUCTOR_PORT           — base of a 10-port band reserved for this workspace
#
# Files that need per-workspace rewriting (ports, hostnames) are COPIED so the
# rewrites don't leak back into the source repo. Files that every workspace
# should share unmodified (credentials, shared config) are SYMLINKED so edits
# in the source repo propagate instantly to every open workspace.
# The script then registers a Caddy fragment with the shared system-wide Caddy
# and installs deps + builds libs.

# === Project-specific configuration =========================================
DOMAIN="lemurjs.local"
PORT_SLOTS=(
  "api=0:6700"      # name=offset:default_port
  "app=1:6710"
  "postgres=2:6720"
)
HOST_REPLACEMENTS=(
  "api.${DOMAIN}=api"
  "app.${DOMAIN}=app"
)
# ============================================================================

if [[ -z "${CONDUCTOR_ROOT_PATH:-}" || -z "${CONDUCTOR_WORKSPACE_NAME:-}" || -z "${CONDUCTOR_PORT:-}" ]]; then
  echo "Must be run by Conductor (CONDUCTOR_ROOT_PATH, CONDUCTOR_WORKSPACE_NAME, CONDUCTOR_PORT required)." >&2
  exit 1
fi

WS_SLUG="$(print -r -- "$CONDUCTOR_WORKSPACE_NAME" \
  | tr '[:upper:]' '[:lower:]' \
  | sed -E 's/[^a-z0-9]+/-/g; s/^-+|-+$//g')"
[[ -z "$WS_SLUG" ]] && { echo "Workspace name normalizes to empty slug." >&2; exit 1; }

typeset -A PORT
typeset -A HOST
for spec in "${PORT_SLOTS[@]}"; do
  name="${spec%%=*}"; rest="${spec#*=}"; offset="${rest%%:*}"
  PORT[$name]=$((CONDUCTOR_PORT + offset))
done
for spec in "${HOST_REPLACEMENTS[@]}"; do
  src="${spec%=*}"; name="${spec#*=}"
  prefix="${src%%.*}"
  HOST[$name]="${prefix}.${WS_SLUG}.${DOMAIN}"
done

CADDY_ADMIN_ADDR="localhost:2019"
CADDY_GLOBAL_CFG="$HOME/.config/caddy/Caddyfile"
CADDY_SITES_DIR="$HOME/.config/caddy/sites.d"
CADDY_FRAGMENT="$CADDY_SITES_DIR/lemurjs-${WS_SLUG}.caddy"

bold()  { printf "\033[1m%s\033[0m\n" "$1"; }
green() { printf "\033[32m%s\033[0m\n" "$1"; }

# ─── Sanity check: shared stack must already be running ─────────────────────
if [[ ! -f "/etc/resolver/${DOMAIN}" ]]; then
  echo "✖ Wildcard DNS resolver for ${DOMAIN} is not installed." >&2
  echo "  Run 'pnpm dev:up' once on your host machine, then re-open this workspace." >&2
  exit 1
fi

# ─── Copy + rewrite env files from the source repo ──────────────────────────
bold "Copying env files from $CONDUCTOR_ROOT_PATH..."

copy_env() {
  local app="$1" file="$2"
  local src="$CONDUCTOR_ROOT_PATH/apps/$app/$file"
  local dest="apps/$app/$file"
  [[ -f "$src" ]] || { echo "  skip apps/$app/$file (missing in source)"; return 1; }
  cp "$src" "$dest"
  echo "  copied apps/$app/$file"
}

# Symlink a shared file from the source repo into the workspace.
# Use this for gitignored files that are NOT rewritten per-workspace — edits
# in the source repo become visible in every workspace without re-running setup.
link_shared() {
  local relpath="$1"
  local src="$CONDUCTOR_ROOT_PATH/$relpath"
  [[ -e "$src" ]] || { echo "  skip $relpath (missing in source)"; return 1; }
  mkdir -p "$(dirname "$relpath")"
  ln -sfn "$src" "$relpath"
  echo "  linked $relpath -> $src"
}

rewrite_hostnames() {
  local file="$1"
  local args=()
  for spec in "${HOST_REPLACEMENTS[@]}"; do
    src="${spec%=*}"; name="${spec#*=}"
    src_esc="$(echo "$src" | sed 's/\./\\./g')"
    args+=(-e "s|${src_esc}|${HOST[$name]}|g")
  done
  # patch any bare ".${DOMAIN}" cookie domain literals (with or without quotes)
  args+=(-e "s|\"\.${DOMAIN//./\\.}\"|\".${WS_SLUG}.${DOMAIN}\"|g")
  args+=(-e "s|'\.${DOMAIN//./\\.}'|'.${WS_SLUG}.${DOMAIN}'|g")
  sed -i '' "${args[@]}" "$file"
}

if copy_env api .env.yml; then
  sed -i '' -E "s/^([[:space:]]*PORT:[[:space:]]*)6700([[:space:]]*)$/\1${PORT[api]}\2/" apps/api/.env.yml
  sed -i '' -E "s/^([[:space:]]*POSTGRES_PORT:[[:space:]]*)[0-9]+([[:space:]]*)$/\1${PORT[postgres]}\2/" apps/api/.env.yml
  rewrite_hostnames apps/api/.env.yml
fi
if copy_env app .env; then
  sed -i '' -E "s/^VITE_APP_PORT=6710$/VITE_APP_PORT=${PORT[app]}/" apps/app/.env
  rewrite_hostnames apps/app/.env
fi

# e2e .env.yml is gitignored in the source repo, so bootstrap it from the
# committed example and rewrite hostnames to this workspace's slug.
if [[ -f "$CONDUCTOR_ROOT_PATH/e2e/.env.example.yml" ]]; then
  cp "$CONDUCTOR_ROOT_PATH/e2e/.env.example.yml" e2e/.env.yml
  rewrite_hostnames e2e/.env.yml
  echo "  generated e2e/.env.yml from .env.example.yml"
else
  echo "  skip e2e/.env.yml (e2e/.env.example.yml missing in source)"
fi

# Shared across workspaces, never rewritten — symlink so credentials edited in
# the source repo (e.g. rotating DB passwords) take effect everywhere at once.
link_shared cli.config.yml || true

green "Env files ready."

# ─── Register the workspace's Caddy fragment ────────────────────────────────
bold "Registering Caddy routes for workspace '$WS_SLUG'..."

curl -sf -m 2 "http://${CADDY_ADMIN_ADDR}/config/" &>/dev/null || {
  echo "System Caddy is not running. Start the shared stack with 'pnpm dev:up' first." >&2
  exit 1
}

mkdir -p "$CADDY_SITES_DIR"
{
  echo "# Generated by infra/conductor/setup.sh for workspace '$WS_SLUG'."
  for name in api app; do
    cat <<EOF
${HOST[$name]} {
  tls internal
  reverse_proxy localhost:${PORT[$name]}
}
EOF
  done
} > "$CADDY_FRAGMENT"

caddy reload --config "$CADDY_GLOBAL_CFG" --address "$CADDY_ADMIN_ADDR"
green "Caddy routes registered."

# ─── Per-workspace PostgreSQL container ─────────────────────────────────────
# Each workspace gets its own postgres on a unique host port (from the port
# band) so workspaces don't share the same `app` database.
bold "Starting workspace-scoped PostgreSQL..."

if ! command -v docker &>/dev/null; then
  echo "Docker is not installed. Install Docker Desktop or OrbStack and re-run." >&2
  exit 1
fi
if ! docker info &>/dev/null; then
  echo "Docker daemon is not running. Start Docker / OrbStack and re-run." >&2
  exit 1
fi

PG_COMPOSE="infra/conductor/docker-compose.yml"
mkdir -p "$(dirname "$PG_COMPOSE")"
cat > "$PG_COMPOSE" <<EOF
# Generated by infra/conductor/setup.sh for workspace '${WS_SLUG}' — do not edit by hand.
name: lemurjs-${WS_SLUG}

services:
  postgres:
    image: postgres:16-alpine
    container_name: lemurjs-postgres-${WS_SLUG}
    restart: unless-stopped
    environment:
      POSTGRES_USER: root
      POSTGRES_PASSWORD: root
      POSTGRES_DB: app
    ports:
      - "${PORT[postgres]}:5432"
    volumes:
      - postgres-data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U root -d app"]
      interval: 5s
      timeout: 5s
      retries: 10

volumes:
  postgres-data:
    name: lemurjs-postgres-data-${WS_SLUG}
EOF

docker compose -f "$PG_COMPOSE" up -d postgres

until docker compose -f "$PG_COMPOSE" exec -T postgres pg_isready -U root -d app &>/dev/null; do
  sleep 1
done
green "PostgreSQL is ready (localhost:${PORT[postgres]}, db=app, user=root)."

# ─── Install + build ────────────────────────────────────────────────────────
bold "Installing dependencies..."
pnpm install
bold "Building libraries..."
# NOTE: the './libs/*' filter glob MUST be quoted — without quotes zsh expands
# it to a literal directory list and turbo's filter parser rejects that.
pnpm turbo run build --filter='./libs/*'

echo ""
green "Workspace '$WS_SLUG' is ready."
for name in api app; do
  echo "  https://${HOST[$name]} -> localhost:${PORT[$name]}"
done
echo "  postgres://root:root@localhost:${PORT[postgres]}/app"
