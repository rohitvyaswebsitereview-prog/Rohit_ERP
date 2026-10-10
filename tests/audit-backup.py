#!/usr/bin/env python3
"""Behavioral checks for local backup and isolated restore rehearsal."""
import json
import os
from pathlib import Path
import sqlite3
import subprocess
import sys
import tempfile
import unittest

APP = Path(__file__).resolve().parents[1]
BACKUP = APP / "scripts/backup-local.py"
VERIFY = APP / "scripts/verify-backup.py"
INSTALL = APP / "scripts/install-backup-timer.sh"


class BackupRecoveryTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name)
        self.state = self.root / "active-state"
        self.state.mkdir()
        db = self.state / "accounts.sqlite"
        connection = sqlite3.connect(db)
        self.addCleanup(connection.close)
        connection.execute("PRAGMA journal_mode=WAL")
        connection.execute("CREATE TABLE ledger (id INTEGER PRIMARY KEY, amount INTEGER)")
        connection.execute("INSERT INTO ledger VALUES (1, 42)")
        connection.commit()
        (self.state / "blob.bin").write_bytes(b"important file\0contents")
        self.env = dict(os.environ, ERP_BACKUP_STATE=str(self.state),
                        ERP_BACKUP_ROOT=str(self.root / "backups"))

    def run_script(self, path, *args):
        return subprocess.run([sys.executable, str(path), *map(str, args)],
                              env=self.env, capture_output=True, text=True)

    def create_backup(self):
        created = self.run_script(BACKUP)
        self.assertEqual(created.returncode, 0, created.stderr)
        return next((self.root / "backups").iterdir())

    def test_backup_and_rehearsal_leave_active_state_unchanged(self):
        backup = self.create_backup()
        with sqlite3.connect(self.state / "accounts.sqlite") as connection:
            connection.execute("INSERT INTO ledger VALUES (2, 99)")
        original = (self.state / "blob.bin").read_bytes()
        verified = self.run_script(VERIFY, backup)
        self.assertEqual(verified.returncode, 0, verified.stderr)
        report = json.loads(verified.stdout)
        self.assertEqual(report["result"], "passed")
        self.assertEqual(report["database_count"], 1)
        self.assertEqual(report["file_count"], 2)
        self.assertEqual(report["tables_checked"], 1)
        self.assertEqual((self.state / "blob.bin").read_bytes(), original)
        with sqlite3.connect(self.state / "accounts.sqlite") as connection:
            self.assertEqual(connection.execute("SELECT COUNT(*) FROM ledger").fetchone()[0], 2)

    def test_modified_backup_file_fails_verification(self):
        backup = self.create_backup()
        (backup / "state/blob.bin").write_bytes(b"tampered")
        verified = self.run_script(VERIFY, backup)
        self.assertNotEqual(verified.returncode, 0)

    def test_missing_backup_file_fails_verification(self):
        backup = self.create_backup()
        (backup / "state/blob.bin").unlink()
        verified = self.run_script(VERIFY, backup)
        self.assertNotEqual(verified.returncode, 0)

    def test_scheduled_run_writes_success_status_after_rehearsal(self):
        completed = self.run_script(BACKUP, "--verify")
        self.assertEqual(completed.returncode, 0, completed.stderr)
        status = json.loads((self.root / "backups/latest-status.json").read_text())
        self.assertEqual(status["result"], "passed")
        self.assertTrue(status["isolated_restore"])

    def test_failed_scheduled_run_replaces_previous_success_status(self):
        self.assertEqual(self.run_script(BACKUP, "--verify").returncode, 0)
        (self.state / "unsafe-link").symlink_to(self.root / "outside")
        failed = self.run_script(BACKUP, "--verify")
        self.assertNotEqual(failed.returncode, 0)
        status = json.loads((self.root / "backups/latest-status.json").read_text())
        self.assertEqual(status["result"], "failed")

    def test_timer_installer_writes_daily_persistent_user_units(self):
        units = self.root / "units"
        completed = subprocess.run(["bash", str(INSTALL), "--unit-dir", str(units), "--no-enable"],
                                   capture_output=True, text=True)
        self.assertEqual(completed.returncode, 0, completed.stderr)
        service = (units / "erp-local-backup.service").read_text()
        timer = (units / "erp-local-backup.timer").read_text()
        self.assertIn("backup-local.py", service)
        self.assertIn("--verify", service)
        self.assertIn("OnCalendar=*-*-* 02:30:00", timer)
        self.assertIn("Persistent=true", timer)
        checked = subprocess.run(["systemd-analyze", "verify", str(units / "erp-local-backup.service"),
                                  str(units / "erp-local-backup.timer")], capture_output=True, text=True)
        self.assertEqual(checked.returncode, 0, checked.stderr)


if __name__ == "__main__":
    unittest.main()
