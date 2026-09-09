'use client';
import { useEffect, useState } from 'react';
import { ArrowUpRight, AlertTriangle } from 'lucide-react';
import { api, money, Status, today } from './erp-ui';
import { opMap } from '@/lib/operations';
export default function OperationalOverview({
  revision,
  go,
}: {
  revision: number;
  go: (r: string) => void;
}) {
  const [data, setData] = useState<any[]>([]),
    [files, setFiles] = useState<any[]>([]),
    [error, setError] = useState('');
  useEffect(() => {
    let live = true;
    Promise.all([api('operations/data'), api('operations/documents')])
      .then(([d, f]) => {
        if (live) {
          setData(d);
          setFiles(f);
          setError('');
        }
      })
      .catch((e) => live && setError(e.message));
    return () => {
      live = false;
    };
  }, [revision]);
  if (error)
    return (
      <div className="error-box" role="alert">
        Operational overview could not load: {error}
      </div>
    );
  const active = data.filter(
    (r) =>
      !['Cancelled', 'Reversed', 'Inactive', 'Completed'].includes(r.status),
  );
  const deadlines = active
    .map((r) => ({
      ...r,
      deadline: r.leoDueDate || r.realisationDue || r.validUntil || r.dueDate,
    }))
    .filter(
      (r) =>
        r.deadline &&
        ['shipping-bills', 'eway-bills', 'invoices', 'lut-register'].includes(
          r.kind,
        ) &&
        !['LEO', 'EGM'].includes(r.status) &&
        Math.ceil((Date.parse(r.deadline) - Date.parse(today())) / 86400000) <=
          15,
    )
    .sort((a, b) => a.deadline.localeCompare(b.deadline));
  const missing = active.filter(
    (r) =>
      !opMap[r.kind]?.master &&
      opMap[r.kind]?.documents.some(
        (c) => !files.some((f) => f.entityId === r.id && f.category === c),
      ),
  );
  const metrics = [
    {
      label: 'Machines available',
      value: data.filter(
        (r) => r.kind === 'machines' && r.status === 'Available',
      ).length,
      route: 'machines',
    },
    {
      label: 'Open quotations',
      value: active.filter((r) => r.kind === 'quotations').length,
      route: 'quotations',
    },
    {
      label: 'Shipment records',
      value: active.filter((r) => r.kind === 'shipments').length,
      route: 'shipments',
    },
    {
      label: 'Documents missing',
      value: missing.length,
      route: 'documents-drive',
    },
  ];
  return (
    <section className="operational-overview">
      <div className="op-overview-metrics">
        {metrics.map((m) => (
          <button key={m.label} onClick={() => go(m.route)}>
            <span>
              {m.label}
              <ArrowUpRight size={15} />
            </span>
            <strong>{m.value}</strong>
          </button>
        ))}
      </div>
      {deadlines.length > 0 && (
        <div className="widget op-priorities">
          <header>
            <AlertTriangle size={18} />
            <h2>Upcoming deadlines</h2>
          </header>
          {deadlines.slice(0, 6).map((r) => (
            <button key={r.id} onClick={() => go(r.kind + '?record=' + r.id)}>
              <span>
                <strong>{r.reference}</strong>
                <small>{opMap[r.kind]?.label}</small>
              </span>
              <span className={r.deadline < today() ? 'op-overdue' : ''}>
                {r.deadline}
              </span>
              <ArrowUpRight size={16} />
            </button>
          ))}
        </div>
      )}
    </section>
  );
}
