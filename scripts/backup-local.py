#!/usr/bin/env python3
"""Create a consistent local ERP backup without exporting credentials to Git."""
from pathlib import Path
from datetime import datetime
import sqlite3, shutil, json, hashlib
root=Path(__file__).resolve().parents[1]
state=root/'.wrangler/state'
if not state.exists(): raise SystemExit('No local ERP state exists yet.')
backup=root/'outputs/backups'/datetime.now().strftime('%Y%m%d-%H%M%S')
backup.mkdir(parents=True,exist_ok=False)
for source in state.rglob('*'):
    if not source.is_file() or source.name.endswith(('-wal','-shm')): continue
    dest=backup/'state'/source.relative_to(state);dest.parent.mkdir(parents=True,exist_ok=True)
    if source.suffix in ('.sqlite','.db'):
        with sqlite3.connect('file:'+str(source)+'?mode=ro',uri=True) as src,sqlite3.connect(dest) as target:
            src.backup(target)
            assert target.execute('PRAGMA integrity_check').fetchone()[0]=='ok'
    else: shutil.copy2(source,dest)
manifest={str(p.relative_to(backup)):hashlib.sha256(p.read_bytes()).hexdigest() for p in backup.rglob('*') if p.is_file()}
(backup/'manifest.json').write_text(json.dumps(manifest,indent=2))
print('Backup created:',backup)
print('Keep this directory private: it contains business records, files and account data.')
