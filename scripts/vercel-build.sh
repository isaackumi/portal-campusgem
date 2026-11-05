#!/usr/bin/env bash
# Vercel build: deploy Convex (schema + functions) first, then build Next.js,
# so new app code never goes live against old database functions.
#
# Needs CONVEX_DEPLOY_KEY in Vercel -> Settings -> Environment Variables, scoped to
# Production only (Convex dashboard -> Settings -> Deploy keys -> Production).
set -euo pipefail

env_name="${VERCEL_ENV:-local}"
key="${CONVEX_DEPLOY_KEY:-}"

if [[ -n "${SKIP_CONVEX_DEPLOY:-}" ]]; then
  echo "[build] SKIP_CONVEX_DEPLOY set: building without deploying Convex."
  exec bun run build
fi

if [[ -z "$key" ]]; then
  if [[ "$env_name" == "production" ]]; then
    echo "[build] CONVEX_DEPLOY_KEY is not set, so Convex can't be deployed before the app." >&2
    echo "[build] Add it in Vercel (Production scope), or set SKIP_CONVEX_DEPLOY=1 to build anyway." >&2
    exit 1
  fi
  echo "[build] No CONVEX_DEPLOY_KEY ($env_name): building against the existing Convex deployment."
  exec bun run build
fi

# A production key must never deploy from a preview branch.
if [[ "$key" == prod:* && "$env_name" != "production" ]]; then
  echo "[build] Production Convex key on a $env_name build: skipping Convex deploy."
  exec bun run build
fi

echo "[build] Deploying Convex, then building ($env_name)."
exec npx convex deploy --cmd 'bun run build'
