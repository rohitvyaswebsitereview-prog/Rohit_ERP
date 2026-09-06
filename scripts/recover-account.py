"""Offline recovery for this project's local database. Never prints passwords."""
from pathlib import Path
import sqlite3, getpass, hashlib, uuid, datetime
root = Path(__file__).resolve().parents[1] / '.wrangler' / 'state'
email = input('Account email: ').strip().lower()
password = getpass.getpass('New password (12–200 characters): ')
confirmation = getpass.getpass('Repeat new password: ')
if password != confirmation or not 12 <= len(password) <= 200:
    raise SystemExit('Passwords must match and contain 12–200 characters. No change made.')
matches=[]
for path in root.rglob('*.sqlite'):
    con=sqlite3.connect(path)
    try:
        row=con.execute('SELECT id, tenant_id FROM users WHERE email=?',(email,)).fetchone()
        if row: matches.append((path,row))
    except sqlite3.OperationalError:
        pass
    finally:
        con.close()
if len(matches)!=1:
    raise SystemExit('Expected exactly one local account match. No change made.')
path,(uid,tenant)=matches[0]
salt=str(uuid.uuid4())
hash_value=salt+':'+hashlib.pbkdf2_hmac('sha256',password.encode(),salt.encode(),100000).hex()
with sqlite3.connect(path) as con:
    con.execute('UPDATE users SET password=? WHERE id=?',(hash_value,uid))
    con.execute('DELETE FROM sessions WHERE user_id=?',(uid,))
    con.execute('INSERT INTO audit VALUES (?,?,?,?,?,?,?,?)',(str(uuid.uuid4()),tenant,uid,'Recovered',uid,'users','Offline local administrator password recovery',datetime.datetime.now(datetime.timezone.utc).isoformat()))
print('Password updated and existing sessions revoked.')
