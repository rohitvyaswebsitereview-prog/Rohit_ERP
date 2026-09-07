#!/usr/bin/env bash
set -euo pipefail
ERP_APP="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd)"
ERP_RUNTIME="/home/rohit/.cache/codex-runtimes/codex-primary-runtime/dependencies"
export PATH="$ERP_RUNTIME/node/bin:$ERP_RUNTIME/bin/fallback:$PATH"
cd "$ERP_APP"
exec node node_modules/vinext/dist/cli.js dev --hostname 127.0.0.1 --port 3000
