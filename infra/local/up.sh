#!/usr/bin/env zsh
set -euo pipefail

# LemurJS shared local dev stack: dnsmasq wildcard resolver + system-wide Caddy
# (LaunchDaemon) + Mailpit + PostgreSQL via Docker Compose.
#
# Re-running this script is cheap: only the project's Caddy fragment is
# rewritten and the daemon is hot-reloaded over the admin API.

SCRIPT_DIR="${0:A:h}"
COMPOSE_FILE="${SCRIPT_DIR}/docker-compose.yml"

# === Project-specific configuration =========================================
DOMAIN="lemurjs.local"
SITES_FRAGMENT_NAME="lemurjs"
DEFAULT_PORTS=(
  "api.${DOMAIN}=3020"
  "app.${DOMAIN}=3030"
)
# ============================================================================

CADDY_ADMIN_ADDR="localhost:2019"
CADDY_GLOBAL_CFG="$HOME/.config/caddy/Caddyfile"
CADDY_SITES_DIR="$HOME/.config/caddy/sites.d"
CADDY_FRAGMENT="$CADDY_SITES_DIR/${SITES_FRAGMENT_NAME}.caddy"

DNSMASQ_CONF="$(brew --prefix)/etc/dnsmasq.conf"
DNSMASQ_RULE="address=/${DOMAIN}/127.0.0.1"
DNSMASQ_RESOLVER="/etc/resolver/${DOMAIN}"

bold()   { printf "\033[1m%s\033[0m\n" "$1"; }
green()  { printf "\033[32m%s\033[0m\n" "$1"; }
yellow() { printf "\033[33m%s\033[0m\n" "$1"; }
red()    { printf "\033[31m%s\033[0m\n" "$1"; }

if ! command -v brew &>/dev/null; then
  red "Homebrew is not installed. Install it from https://brew.sh"
  exit 1
fi

# ─── dnsmasq (wildcard *.${DOMAIN} → 127.0.0.1) ─────────────────────────────
bold "Checking dnsmasq..."
command -v dnsmasq &>/dev/null || brew install dnsmasq

DNSMASQ_CONF_CHANGED=false
if ! grep -qF "$DNSMASQ_RULE" "$DNSMASQ_CONF" 2>/dev/null; then
  printf '\n# %s wildcard resolver\n%s\n' "$DOMAIN" "$DNSMASQ_RULE" >> "$DNSMASQ_CONF"
  DNSMASQ_CONF_CHANGED=true
fi

if ! pgrep -x dnsmasq &>/dev/null; then
  sudo brew services start dnsmasq
elif $DNSMASQ_CONF_CHANGED; then
  sudo brew services restart dnsmasq
fi

if [[ ! -f "$DNSMASQ_RESOLVER" ]]; then
  sudo mkdir -p /etc/resolver
  echo 'nameserver 127.0.0.1' | sudo tee "$DNSMASQ_RESOLVER" >/dev/null
fi

until dscacheutil -q host -a name "probe.${DOMAIN}" 2>/dev/null | grep -q "^ip_address: 127.0.0.1$"; do
  sleep 1
done
green "dnsmasq is ready (*.${DOMAIN} -> 127.0.0.1)."

# ─── PostgreSQL (Docker) ────────────────────────────────────────────────────
bold "Checking PostgreSQL..."
if ! command -v docker &>/dev/null; then
  red "Docker is not installed. Install Docker Desktop (https://docker.com) or OrbStack."
  exit 1
fi

if ! docker info &>/dev/null; then
  red "Docker daemon is not running. Start Docker Desktop / OrbStack and re-run."
  exit 1
fi

docker compose -f "$COMPOSE_FILE" up -d postgres

until docker compose -f "$COMPOSE_FILE" exec -T postgres pg_isready -U root -d app &>/dev/null; do
  sleep 1
done
green "PostgreSQL is ready (localhost:6720, db=app, user=root)."

# ─── Mailpit (host-wide) ────────────────────────────────────────────────────
bold "Starting Mailpit..."
command -v mailpit &>/dev/null || brew install mailpit
brew services start mailpit >/dev/null 2>&1 || true
green "Mailpit is ready (UI: http://localhost:8025, SMTP: localhost:1025)."

# ─── MinIO (S3-compatible storage for local dev / e2e) ─────────────────────
# Note: we don't use `brew services` here — neither homebrew-core nor the
# minio/stable tap declare a service/plist anymore, so `brew services start
# minio` fails with "Formula `minio` has not implemented #plist". Run the
# binary directly and track it via a PID file for idempotency.
bold "Starting MinIO..."
command -v minio &>/dev/null || brew install minio/stable/minio
command -v mc    &>/dev/null || brew install minio/stable/mc

MINIO_DATA_DIR="$(brew --prefix)/var/minio"
MINIO_LOG="$(brew --prefix)/var/log/minio.log"
MINIO_PIDFILE="$(brew --prefix)/var/run/minio.pid"
mkdir -p "$MINIO_DATA_DIR" "$(dirname "$MINIO_LOG")" "$(dirname "$MINIO_PIDFILE")"

minio_running() {
  [[ -f "$MINIO_PIDFILE" ]] && kill -0 "$(cat "$MINIO_PIDFILE" 2>/dev/null)" 2>/dev/null
}

if ! minio_running && ! curl -sf -m 1 http://localhost:9000/minio/health/live &>/dev/null; then
  MINIO_ROOT_USER=minioadmin \
  MINIO_ROOT_PASSWORD=minioadmin \
  MINIO_API_CORS_ALLOW_ORIGIN='*' \
  nohup minio server \
    --address ":9000" \
    --console-address ":9001" \
    "$MINIO_DATA_DIR" \
    >>"$MINIO_LOG" 2>&1 &
  echo $! > "$MINIO_PIDFILE"
  disown
fi

until curl -sf -m 2 http://localhost:9000/minio/health/live &>/dev/null; do sleep 1; done

mc alias set lemurjs-local http://localhost:9000 minioadmin minioadmin >/dev/null
mc mb --ignore-existing lemurjs-local/lemurjs-uploads >/dev/null
mc mb --ignore-existing lemurjs-local/lemurjs-private >/dev/null
mc anonymous set download lemurjs-local/lemurjs-uploads >/dev/null 2>&1 || true

green "MinIO is ready (S3: http://localhost:9000, console: http://localhost:9001, buckets: lemurjs-uploads, lemurjs-private)."

# ─── Caddy (system-wide LaunchDaemon, shared across all projects) ───────────
bold "Starting Caddy..."

if ! curl -sf -m 2 "http://${CADDY_ADMIN_ADDR}/config/" &>/dev/null; then
  command -v caddy &>/dev/null || brew install caddy

  mkdir -p "$CADDY_SITES_DIR"
  if [[ ! -f "$CADDY_GLOBAL_CFG" ]]; then
    cat > "$CADDY_GLOBAL_CFG" <<EOF
# Shared dev Caddy — per-project site blocks live in ${CADDY_SITES_DIR}/*.caddy.
{
  admin ${CADDY_ADMIN_ADDR}
}

import ${CADDY_SITES_DIR}/*.caddy
EOF
  fi

  # Brew's caddy LaunchDaemon reads $(brew --prefix)/etc/Caddyfile — symlink
  # it to the user-owned config so we can edit it without sudo.
  BREW_CFG="$(brew --prefix)/etc/Caddyfile"
  if [[ ! -L "$BREW_CFG" || "$(readlink "$BREW_CFG")" != "$CADDY_GLOBAL_CFG" ]]; then
    [[ -e "$BREW_CFG" && ! -L "$BREW_CFG" ]] && \
      mv "$BREW_CFG" "$BREW_CFG.pre-${SITES_FRAGMENT_NAME}.$(date +%s).bak"
    ln -sf "$CADDY_GLOBAL_CFG" "$BREW_CFG"
  fi

  # If a non-system caddy was started by previous versions of this script,
  # stop it so the LaunchDaemon can bind ports 80/443.
  caddy stop 2>/dev/null || true

  sudo brew services restart caddy
  sudo caddy trust || echo "(run 'sudo caddy trust' manually to silence browser warnings)"
  until curl -sf -m 2 "http://${CADDY_ADMIN_ADDR}/config/" &>/dev/null; do sleep 1; done
fi

# Always rewrite this project's fragment with the canonical ports.
mkdir -p "$CADDY_SITES_DIR"
{
  echo "# Generated by infra/local/up.sh — do not edit by hand."
  for entry in "${DEFAULT_PORTS[@]}"; do
    host="${entry%=*}"
    port="${entry#*=}"
    cat <<EOF
${host} {
  tls internal
  reverse_proxy localhost:${port}
}
EOF
  done
} > "$CADDY_FRAGMENT"

caddy reload --config "$CADDY_GLOBAL_CFG" --address "$CADDY_ADMIN_ADDR"
green "Caddy routes registered."

# ─── Done ───────────────────────────────────────────────────────────────────
echo ""
green "Local environment is up!"
for entry in "${DEFAULT_PORTS[@]}"; do
  host="${entry%=*}"
  port="${entry#*=}"
  echo "  https://${host} -> localhost:${port}"
done
echo ""
echo "Run 'pnpm dev' to start dev servers."
