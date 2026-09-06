# Setup and recovery

Run the project using the README instructions. Create the first local account in the browser with your own email and a password of 12–200 characters. No credentials are saved in Git. Sign-in uses email; a GitHub login does not sign you into the local ERP.

## Starting on the original computer

Run `Start Rohits ERP.sh` in the parent workspace. It locates the installed Node/pnpm runtime and starts the server on 127.0.0.1:3000. If the server is already running it prints the existing address. Leave its terminal open during use. The `Stop Rohits ERP.sh` script stops only the process launched by that start script; stop any manually launched process in its own terminal.

## Backup and restore

1. Stop the application, including any development terminal.
2. Copy the complete `app/.wrangler/state` folder to a protected backup location.
3. Keep backups out of public folders and Git repositories; this directory contains password hashes and business data.
4. To restore, stop the application, preserve the current state in another location, replace it with the backup and restart.
5. Verify users, ledger balances and representative records. No automated restore claim is made.

## Local administrator password recovery

Use `pnpm recover-account` from the application directory with the app stopped. This prompts in the terminal for the account email and a new password; the password is not echoed. The script operates only on the project-local database, updates the password hash, revokes the user's sessions and appends an audit event in one transaction. Anyone who can edit the local database already has administrative access, so protect the computer and backups.

This is an offline recovery tool, not self-service email recovery. For all normal changes, use the profile's Change Password form.

## GitHub integration

Repository: `rohitvyaswebsitereview-prog/Rohit_ERP`. The user supplied this repository; it is public. Original attachments, local database state, financial documents, exports, environment files and credentials are excluded. CI installs the locked dependencies and runs type checking, isolated integration checks and a build. Authenticate Git on the computer before pushing future changes from a terminal; the initial upload uses the connected GitHub account.
