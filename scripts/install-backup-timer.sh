#!/usr/bin/env bash
# Install a private daily user timer for verified local ERP backups.
set -euo pipefail

app_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
unit_dir="${HOME}/.config/systemd/user"
enable=true
custom_dir=false
while (($#)); do
  case "$1" in
    --unit-dir) unit_dir="${2:?missing unit directory}"; custom_dir=true; shift 2 ;;
    --no-enable) enable=false; shift ;;
    *) echo "Unknown option: $1" >&2; exit 2 ;;
  esac
done
if [[ "$custom_dir" == true && "$enable" == true ]]; then
  echo "--unit-dir requires --no-enable" >&2
  exit 2
fi
python_bin="$(command -v python3)"
umask 077
mkdir -p "$unit_dir"
chmod 700 "$unit_dir"
cat > "$unit_dir/erp-local-backup.service" <<EOF
[Unit]
Description=Verified local ERP backup

[Service]
Type=oneshot
UMask=0077
WorkingDirectory=$app_dir
ExecStart="$python_bin" "$app_dir/scripts/backup-local.py" --verify
EOF
cat > "$unit_dir/erp-local-backup.timer" <<'EOF'
[Unit]
Description=Daily verified local ERP backup

[Timer]
OnCalendar=*-*-* 02:30:00
Persistent=true
Unit=erp-local-backup.service

[Install]
WantedBy=timers.target
EOF
chmod 600 "$unit_dir/erp-local-backup.service" "$unit_dir/erp-local-backup.timer"
if [[ "$enable" == true ]]; then
  systemctl --user daemon-reload
  systemctl --user enable --now erp-local-backup.timer
  systemctl --user list-timers erp-local-backup.timer --no-pager
else
  echo "Units written to $unit_dir; activation skipped."
fi
