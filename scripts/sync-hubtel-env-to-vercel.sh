#!/usr/bin/env bash
# Push Hubtel SMS env from .env.local to Vercel (Production + Preview).
# Requires: vercel CLI logged in (`npx vercel login`) and project linked (`npx vercel link`).
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

if [[ ! -f .env.local ]]; then
  echo "Missing .env.local"
  exit 1
fi

if ! command -v vercel >/dev/null 2>&1 && ! npx --yes vercel --version >/dev/null 2>&1; then
  echo "Install Vercel CLI first: npm i -g vercel"
  exit 1
fi

VC=(npx --yes vercel)

get_env() {
  local key="$1"
  grep -E "^${key}=" .env.local | head -1 | cut -d= -f2- | sed -e 's/^"//' -e 's/"$//' -e "s/^'//" -e "s/'$//"
}

upsert() {
  local key="$1"
  local value="$2"
  local env_target="$3"
  if [[ -z "$value" ]]; then
    echo "skip $key (empty)"
    return
  fi
  echo "→ $key ($env_target)"
  # Remove existing so add is idempotent
  "${VC[@]}" env rm "$key" "$env_target" --yes >/dev/null 2>&1 || true
  printf '%s' "$value" | "${VC[@]}" env add "$key" "$env_target"
}

KEYS=(
  SMS_PROVIDER
  NEXT_PUBLIC_SMS_PROVIDER
  HUBTEL_CLIENT_ID
  HUBTEL_CLIENT_SECRET
  SMS_SENDER_ID
  HUBTEL_SMS_URL
)

for target in production preview; do
  echo "=== $target ==="
  for key in "${KEYS[@]}"; do
    upsert "$key" "$(get_env "$key")" "$target"
  done
  # Optional: allow developer test UI on production after credentials are live
  if [[ "$target" == production ]]; then
    upsert SMS_ALLOW_DRY_RUN true production
  fi
done

echo
echo "Done. Redeploy production so the new env is picked up:"
echo "  npx vercel --prod"
echo "Then check: https://portal-gem.vercel.app/api/sms/status"
