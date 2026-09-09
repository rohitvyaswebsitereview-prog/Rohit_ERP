'use client';
import { useEffect, useState } from 'react';
import { api, Loading, Status } from './erp-ui';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableHeader,
  TableHead,
  TableRow,
  TableBody,
  TableCell,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
export default function OperationAdmin({ route }: { route: string }) {
  const [rows, setRows] = useState<any[]>([]),
    [loading, setLoading] = useState(true),
    [error, setError] = useState(''),
    [revision, setRevision] = useState(0),
    [target, setTarget] = useState<any>(null),
    [reason, setReason] = useState(''),
    [busy, setBusy] = useState(false);
  const permissions = route === 'administration-permissions';
  useEffect(() => {
    setLoading(true);
    api('operations/' + (permissions ? 'permissions' : 'security'))
      .then(setRows)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [route, revision]);
  if (loading) return <Loading />;
  return (
    <section className="widget">
      <div className="op-note">
        {permissions
          ? 'Access is enforced on the server. Viewer access is read-only. Financial posting is restricted to Finance and Admin.'
          : 'Review active sessions and revoke access when needed. Revoking sessions requires the user to sign in again.'}
      </div>
      {error && (
        <p className="error-box" role="alert">
          {error}
        </p>
      )}
      <Table>
        <TableHeader>
          <TableRow>
            {(permissions
              ? ['Module', 'Admin', 'Finance', 'Logistics', 'Viewer']
              : ['User', 'Role', 'Status', 'Active sessions', 'Action']
            ).map((h) => (
              <TableHead key={h}>{h}</TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((r, i) => (
            <TableRow key={r.id || i}>
              {permissions ? (
                <>
                  <TableCell>{r.module}</TableCell>
                  {['Admin', 'Finance', 'Logistics', 'Viewer'].map((role) => (
                    <TableCell key={role}>
                      {r.roles.includes(role)
                        ? role === 'Viewer'
                          ? 'Read'
                          : 'Read / write'
                        : 'No access'}
                    </TableCell>
                  ))}
                </>
              ) : (
                <>
                  <TableCell>
                    {r.name}
                    <small style={{ display: 'block' }}>{r.email}</small>
                  </TableCell>
                  <TableCell>{r.role}</TableCell>
                  <TableCell>
                    <Status value={r.active ? 'Active' : 'Inactive'} />
                  </TableCell>
                  <TableCell>{r.sessions}</TableCell>
                  <TableCell>
                    <Button
                      variant="outline"
                      disabled={!r.sessions}
                      onClick={() => {
                        setTarget(r);
                        setReason('');
                      }}
                    >
                      Revoke sessions
                    </Button>
                  </TableCell>
                </>
              )}
            </TableRow>
          ))}
        </TableBody>
      </Table>
      <Dialog open={!!target} onOpenChange={(o) => !o && setTarget(null)}>
        <DialogContent>
          <DialogTitle>Revoke sessions for {target?.name}</DialogTitle>
          <DialogDescription>
            All active sessions for this user will end, including this browser
            if it belongs to them.
          </DialogDescription>
          <label className="field">
            <span>Reason</span>
            <Input value={reason} onChange={(e) => setReason(e.target.value)} />
          </label>
          <Button
            disabled={busy || !reason.trim()}
            onClick={async () => {
              setBusy(true);
              try {
                await api('operations/security/' + target.id + '/revoke', {
                  reason,
                });
                setTarget(null);
                setRevision((n) => n + 1);
              } catch (e: any) {
                setError(e.message);
              } finally {
                setBusy(false);
              }
            }}
          >
            Revoke sessions
          </Button>
        </DialogContent>
      </Dialog>
    </section>
  );
}
