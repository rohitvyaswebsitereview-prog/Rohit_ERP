#!/usr/bin/env bash
set -euo pipefail
systemctl --user stop rohits-erp.service
printf "Rohit's ERP has stopped. Your database has been preserved.\n"
