#!/usr/bin/env python3
"""Create a private, consistent snapshot of local Wrangler state."""
from datetime import datetime, timezone
from pathlib import Path
import argparse
import hashlib
import json
import os
import shutil
import sqlite3
import subprocess
import sys
import uuid

ROOT = Path(__file__).resolve().parents[1]
STATE = Path(os.environ.get("ERP_BACKUP_STATE", ROOT / ".wrangler/state")).resolve()
BACKUPS = Path(os.environ.get("ERP_BACKUP_ROOT", ROOT / "outputs/backups")).resolve()


def digest(path):
    checksum = hashlib.sha256()
    with path.open("rb") as stream:
        for chunk in iter(lambda: stream.read(1024 * 1024), b""):
            checksum.update(chunk)
    return checksum.hexdigest()


def database_summary(path):
    with sqlite3.connect(f"file:{path}?mode=ro&immutable=1", uri=True) as database:
        if database.execute("PRAGMA integrity_check").fetchone()[0] != "ok":
            raise ValueError(f"SQLite integrity check failed: {path.name}")
        rows = database.execute("SELECT name, type, sql FROM sqlite_master WHERE name NOT LIKE 'sqlite_%' ORDER BY type, name").fetchall()
        schema_hash = hashlib.sha256(json.dumps(rows, sort_keys=True).encode()).hexdigest()
        table_counts = {}
        for name, kind, _ in rows:
            if kind == "table":
                quoted_name = '"' + name.replace('"', '""') + '"'
                table_counts[name] = database.execute(f"SELECT COUNT(*) FROM {quoted_name}").fetchone()[0]
        return {"schema_sha256": schema_hash, "table_counts": table_counts}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--verify", action="store_true", help="Rehearse an isolated restore and update latest status")
    args = parser.parse_args()
    os.umask(0o077)
    if not STATE.is_dir():
        raise ValueError("No local ERP state exists yet.")
    if BACKUPS == STATE or STATE in BACKUPS.parents or BACKUPS in STATE.parents:
        raise ValueError("Backup destination must be separate from live state.")
    BACKUPS.mkdir(parents=True, exist_ok=True, mode=0o700)
    target = BACKUPS / (datetime.now(timezone.utc).strftime("%Y%m%d-%H%M%S") + "-" + uuid.uuid4().hex[:8])
    target.mkdir(mode=0o700)
    files = {}
    databases = {}
    for source in sorted(STATE.rglob("*")):
        if source.is_symlink():
            raise ValueError("Backup refuses symbolic links in local state.")
        if not source.is_file() or source.name.endswith(("-wal", "-shm")):
            continue
        relative = source.relative_to(STATE)
        destination = target / "state" / relative
        destination.parent.mkdir(parents=True, exist_ok=True, mode=0o700)
        if source.suffix in (".sqlite", ".db"):
            with sqlite3.connect(f"file:{source}?mode=ro", uri=True) as original:
                with sqlite3.connect(destination) as copy:
                    original.backup(copy)
            databases[str(relative)] = database_summary(destination)
        else:
            shutil.copyfile(source, destination)
        destination.chmod(0o600)
        files[str(Path("state") / relative)] = digest(destination)
    manifest = {"format": 2, "created_utc": datetime.now(timezone.utc).isoformat(),
                "files": files, "databases": databases}
    (target / "manifest.json").write_text(json.dumps(manifest, indent=2) + "\n")
    (target / "manifest.json").chmod(0o600)
    print(f"Backup created: {target}")
    print("Keep this directory private: it contains business records and uploaded files.")
    if args.verify:
        subprocess.run([sys.executable, str(ROOT / "scripts/verify-backup.py"), str(target),
                        "--status", str(BACKUPS / "latest-status.json")], check=True)


if __name__ == "__main__":
    try:
        main()
    except (OSError, ValueError, sqlite3.Error, subprocess.CalledProcessError) as error:
        if "--verify" in sys.argv and BACKUPS.is_dir():
            try:
                os.umask(0o077)
                status = BACKUPS / "latest-status.json"
                temporary = BACKUPS / (".status-" + uuid.uuid4().hex)
                temporary.write_text(json.dumps({"result": "failed", "checked_utc": datetime.now(timezone.utc).isoformat(),
                                                 "reason": "backup_or_rehearsal_failed"}, indent=2) + "\n")
                temporary.chmod(0o600)
                temporary.replace(status)
            except OSError:
                pass
        print(f"Backup failed: {error}", file=sys.stderr)
        sys.exit(1)
