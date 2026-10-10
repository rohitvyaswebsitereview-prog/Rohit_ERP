#!/usr/bin/env python3
"""Rehearse a backup restore in a new temporary directory only."""
import argparse
from datetime import datetime, timezone
import hashlib
import json
import os
from pathlib import Path
import shutil
import sqlite3
import sys
import tempfile
import time


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
        counts = {}
        for name, kind, _ in rows:
            if kind == "table":
                quoted_name = '"' + name.replace('"', '""') + '"'
                counts[name] = database.execute(f"SELECT COUNT(*) FROM {quoted_name}").fetchone()[0]
        return {"schema_sha256": schema_hash, "table_counts": counts}


def verify(backup):
    began = time.monotonic()
    backup = backup.resolve(strict=True)
    manifest_path = backup / "manifest.json"
    manifest = json.loads(manifest_path.read_text())
    if manifest.get("format") == 2:
        expected = manifest["files"]
        recorded_databases = manifest["databases"]
    else:
        # The first local backup format was a flat file-to-hash mapping.
        expected = manifest
        recorded_databases = {}
    if not isinstance(expected, dict) or not expected:
        raise ValueError("Backup manifest has no files.")
    paths = {}
    for name, checksum in expected.items():
        relative = Path(name)
        if relative.is_absolute() or ".." in relative.parts or relative.parts[0] != "state":
            raise ValueError("Unsafe manifest path.")
        source = backup / relative
        if source.is_symlink() or not source.is_file() or source.resolve() != source:
            raise ValueError(f"Missing or unsafe backup file: {name}")
        if digest(source) != checksum:
            raise ValueError(f"Backup hash mismatch: {name}")
        paths[name] = source
    actual = {str(path.relative_to(backup)) for path in (backup / "state").rglob("*") if path.is_file()}
    if actual != set(paths):
        raise ValueError("Backup file inventory differs from manifest.")
    database_count = 0
    tables_checked = 0
    with tempfile.TemporaryDirectory(prefix="erp-restore-rehearsal-") as temporary:
        restore = Path(temporary) / "state"
        for name, source in paths.items():
            destination = Path(temporary) / name
            destination.parent.mkdir(parents=True, exist_ok=True)
            shutil.copyfile(source, destination)
            if digest(destination) != expected[name]:
                raise ValueError(f"Restored file hash mismatch: {name}")
            if destination.suffix in (".sqlite", ".db"):
                original_summary = database_summary(source)
                restored_summary = database_summary(destination)
                if restored_summary != original_summary:
                    raise ValueError(f"Restored database schema or counts differ: {name}")
                database_name = str(destination.relative_to(restore))
                if database_name in recorded_databases and recorded_databases[database_name] != restored_summary:
                    raise ValueError(f"Database differs from recorded backup metadata: {name}")
                database_count += 1
                tables_checked += len(restored_summary["table_counts"])
    if set(recorded_databases) != {name.removeprefix("state/") for name in paths if name.endswith((".sqlite", ".db"))} and manifest.get("format") == 2:
        raise ValueError("Database inventory differs from manifest.")
    return {"result": "passed", "backup": str(backup), "checked_utc": datetime.now(timezone.utc).isoformat(),
            "restore_seconds": round(time.monotonic() - began, 3), "file_count": len(paths),
            "database_count": database_count, "tables_checked": tables_checked,
            "isolated_restore": True}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("backup", type=Path)
    parser.add_argument("--status", type=Path, help="Write summary to this status file")
    args = parser.parse_args()
    try:
        report = verify(args.backup)
        if args.status:
            os.umask(0o077)
            args.status.parent.mkdir(parents=True, exist_ok=True, mode=0o700)
            temporary = args.status.with_suffix(".tmp")
            temporary.write_text(json.dumps(report, indent=2) + "\n")
            temporary.chmod(0o600)
            temporary.replace(args.status)
        print(json.dumps(report))
    except (OSError, KeyError, ValueError, TypeError, sqlite3.Error, json.JSONDecodeError) as error:
        print(f"Backup verification failed: {error}", file=sys.stderr)
        sys.exit(1)


if __name__ == "__main__":
    main()
