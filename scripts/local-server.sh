#!/usr/bin/env bash
set -euo pipefail
ERP_APP="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd)"
ERP_RUNTIME="/home/rohit/.cache/codex-runtimes/codex-primary-runtime/dependencies"
export PATH="$ERP_RUNTIME/node/bin:$ERP_RUNTIME/bin/fallback:$PATH"
cd "$ERP_APP"
# Serve the validated build with the existing local database and file storage.
# Development compilation remains available through the package dev command.
export WRANGLER_SEND_METRICS=false
exec node node_modules/wrangler/bin/wrangler.js dev --local --config dist/server/wrangler.json --persist-to "$ERP_APP/.wrangler/state" --ip 127.0.0.1 --port 3000
