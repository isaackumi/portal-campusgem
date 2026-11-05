#!/usr/bin/env bash
# Move all Convex data from the dev deployment (where the live site runs today) to
# the project's production deployment. Run from the repo root, logged in to Convex
# (`npx convex dev` once, so .env.local points at the dev deployment with the data).
#
#   bash scripts/convex-migrate-dev-to-prod.sh            # full migration
#   bash scripts/convex-migrate-dev-to-prod.sh catch-up   # after switching Vercel: find
#                                                         # anything written to dev since
#
# What `migrate` does, stopping at the first problem:
#   1. Deploys the current code (schema + functions) to production.
#   2. Copies Convex environment variables (CAMP_CONVEX_SERVER_SECRET, ...) dev -> prod.
#   3. Refuses to continue if production already holds data (pass --force to replace it).
#   4. Exports dev (with stored files) to backups/, imports it into production
#      (document IDs and creation times are kept, so all links between records hold).
#   5. Exports production again and checks every table matches dev, row for row.
# Dev is never modified; it stays as a full backup.
set -euo pipefail

mode="${1:-migrate}"
force="no"
for arg in "$@"; do [[ "$arg" == "--force" ]] && force="yes"; done

cd "$(dirname "$0")/.."
stamp="$(date +%Y%m%d-%H%M%S)"
mkdir -p backups
grep -qxF 'backups/' .gitignore 2>/dev/null || echo 'backups/' >> .gitignore

say() { printf '\n\033[1m==> %s\033[0m\n' "$*"; }
die() { printf '\n\033[31mStopped: %s\033[0m\n' "$*" >&2; exit 1; }

command -v python3 >/dev/null || die "python3 is needed to verify the snapshots."

# Compare two snapshot zips. Prints per-table counts; exit 1 if anything in A is missing from B.
compare_snapshots() {
  python3 -I - "$1" "$2" "$3" <<'PY'
import json, sys, zipfile
a_path, b_path, mode = sys.argv[1], sys.argv[2], sys.argv[3]

def ids(path):
    out = {}
    with zipfile.ZipFile(path) as z:
        for name in z.namelist():
            parts = name.split('/')
            if len(parts) == 2 and parts[1] == 'documents.jsonl' and not parts[0].startswith('_'):
                rows = [json.loads(l) for l in z.read(name).decode().splitlines() if l.strip()]
                out[parts[0]] = {r['_id'] for r in rows}
    return out

a, b = ids(a_path), ids(b_path)
missing_total = 0
print(f"{'table':32} {'dev':>8} {'prod':>8}  missing in prod")
for table in sorted(set(a) | set(b)):
    da, db = a.get(table, set()), b.get(table, set())
    missing = len(da - db)
    missing_total += missing
    flag = f"{missing}" if missing else ""
    print(f"{table:32} {len(da):>8} {len(db):>8}  {flag}")
if mode == 'migrate':
    extra = sum(len(b.get(t, set()) - a.get(t, set())) for t in b)
    if extra:
        print(f"\nNote: production has {extra} records that are not in the dev snapshot.")
print(f"\nMissing in production: {missing_total}")
sys.exit(1 if missing_total else 0)
PY
}

count_docs() {
  python3 -I - "$1" <<'PY'
import sys, zipfile
n = 0
with zipfile.ZipFile(sys.argv[1]) as z:
    for name in z.namelist():
        p = name.split('/')
        if len(p) == 2 and p[1] == 'documents.jsonl' and not p[0].startswith('_'):
            n += sum(1 for l in z.read(name).splitlines() if l.strip())
print(n)
PY
}

say "Checking Convex access"
npx convex env list --names-only >/dev/null || die "Can't reach the dev deployment. Run \`npx convex dev\` once to log in and pick the project."
npx convex env list --prod --names-only >/dev/null || die "Can't reach the production deployment. Open the project in the Convex dashboard and make sure Production exists."

if [[ "$mode" == "catch-up" ]]; then
  say "Exporting dev and production to compare"
  npx convex export --path "backups/dev-catchup-$stamp.zip"
  npx convex export --prod --path "backups/prod-catchup-$stamp.zip"
  if compare_snapshots "backups/dev-catchup-$stamp.zip" "backups/prod-catchup-$stamp.zip" catch-up; then
    say "Nothing was written to dev after the migration. You're done."
  else
    printf '\nSome records reached dev after the snapshot (listed above). Both exports are in backups/.\n'
    printf 'Send the table above to your developer to copy them across.\n'
    exit 1
  fi
  exit 0
fi

[[ "$mode" == "migrate" ]] || die "Unknown mode '$mode' (use: migrate | catch-up)."

say "1/5 Deploying code to production (confirm the prompt)"
npx convex deploy

say "2/5 Copying environment variables dev -> production"
envfile="$(mktemp)"
trap 'rm -f "$envfile"' EXIT
npx convex env list --include-values > "$envfile"
if [[ -s "$envfile" ]]; then
  npx convex env set --prod --from-file "$envfile" --force
  echo "Copied: $(cut -d= -f1 "$envfile" | paste -sd' ' -)"
else
  echo "Dev has no environment variables to copy."
fi
rm -f "$envfile"
npx convex env list --prod --names-only | grep -q '^CAMP_CONVEX_SERVER_SECRET' \
  || die "CAMP_CONVEX_SERVER_SECRET is not set on production. Set it to the same value as in Vercel."

say "3/5 Checking production is empty"
npx convex export --prod --path "backups/prod-before-$stamp.zip"
existing="$(count_docs "backups/prod-before-$stamp.zip")"
if [[ "$existing" != "0" && "$force" != "yes" ]]; then
  die "Production already has $existing records (saved to backups/prod-before-$stamp.zip). Re-run with --force to replace them."
fi

say "4/5 Exporting dev (with stored files) and importing into production"
npx convex export --include-file-storage --path "backups/dev-$stamp.zip"
echo "Dev records: $(count_docs "backups/dev-$stamp.zip")"
npx convex import --prod --replace-all -y "backups/dev-$stamp.zip"

say "5/5 Verifying production matches dev"
npx convex export --prod --path "backups/prod-after-$stamp.zip"
compare_snapshots "backups/dev-$stamp.zip" "backups/prod-after-$stamp.zip" migrate \
  || die "Production is missing records (see table). Dev is untouched; nothing is lost."

say "Data is in production. Now switch the site over:"
cat <<EOF
  1. Convex dashboard -> Production -> Settings:
       copy the Deployment URL, and generate a Production deploy key.
  2. Vercel -> Settings -> Environment Variables (Production):
       NEXT_PUBLIC_CONVEX_URL = <production deployment URL>
       CONVEX_DEPLOY_KEY      = <production deploy key>   (Production scope only)
  3. Redeploy in Vercel.
  4. Once the new deploy is live, run:  bash scripts/convex-migrate-dev-to-prod.sh catch-up
     to confirm nothing was written to dev in the meantime.

Backups (keep them): backups/dev-$stamp.zip, backups/prod-before-$stamp.zip
EOF
