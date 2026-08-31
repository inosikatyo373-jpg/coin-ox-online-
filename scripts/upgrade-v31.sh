#!/usr/bin/env bash
set -euo pipefail

base64 -d scripts/upgrade-v31.patch.gz.b64 | gunzip > /tmp/upgrade-v31.patch

git apply --check /tmp/upgrade-v31.patch
git apply /tmp/upgrade-v31.patch

node --check server/server.js

grep -q 'BID GRID ONLINE v3.1' public/index.html
grep -q 'SUPABASE_URL' server/server.js
grep -q '/api/account/login' server/server.js

rm -f .github/workflows/upgrade-v31.yml
rm -f scripts/upgrade-v31.sh scripts/upgrade-v31.patch.gz.b64
rmdir scripts 2>/dev/null || true

git config user.name 'github-actions[bot]'
git config user.email '41898282+github-actions[bot]@users.noreply.github.com'
git add -A

git commit -m 'Upgrade BID GRID runtime to v3.1 account foundation'
git push origin HEAD:main
