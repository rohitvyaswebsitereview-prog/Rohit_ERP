#!/usr/bin/env bash
set -euo pipefail
ERP_APP="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd)"
if curl --max-time 3 --fail --silent http://127.0.0.1:3000/api/v1/status >/dev/null; then
  printf "Rohit's ERP is running at http://127.0.0.1:3000/\n"
  exit 0
fi
systemctl --user stop rohits-erp.service 2>/dev/null || true
systemctl --user reset-failed rohits-erp.service 2>/dev/null || true
systemd-run --user --unit=rohits-erp --collect --property=Restart=on-failure --property=RestartSec=5 --property=WorkingDirectory="$ERP_APP" /bin/bash "$ERP_APP/scripts/local-server.sh"
for attempt in {1..45}; do
  if curl --max-time 2 --fail --silent http://127.0.0.1:3000/api/v1/status >/dev/null; then
    printf "Rohit's ERP is ready at http://127.0.0.1:3000/\n"
    exit 0
  fi
  sleep 1
done
printf 'The server is still starting or needs attention. View logs with: journalctl --user -u rohits-erp.service\n' >&2
exit 1
