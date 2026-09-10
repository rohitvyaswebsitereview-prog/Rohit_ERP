'use client';
import { useEffect, useState } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
export function ListPreferences({
  kind,
  columns,
  query,
  status,
  onRestore,
}: {
  kind: string;
  columns: string[];
  query: string;
  status: string;
  onRestore: (q: string, s: string) => void;
}) {
  const [hidden, setHidden] = useState<string[]>([]),
    [saved, setSaved] = useState<any[]>([]),
    [name, setName] = useState('');
  const key = 'erp-list-' + kind;
  useEffect(() => {
    try {
      const p = JSON.parse(localStorage.getItem(key) || '{}');
      setHidden(p.hidden || []);
      setSaved(p.saved || []);
    } catch {}
  }, [key]);
  const store = (h: string[], s: any[]) => {
    setHidden(h);
    setSaved(s);
    localStorage.setItem(key, JSON.stringify({ hidden: h, saved: s }));
  };
  return (
    <div className="list-preferences">
      <style>
        {columns
          .flatMap((c, i) =>
            hidden.includes(c)
              ? [
                  `[data-list-key="${kind}"] .op-register th:nth-child(${i + 1}),[data-list-key="${kind}"] .op-register td:nth-child(${i + 1}),[data-list-key="${kind}"] .sales-register-table th:nth-child(${i + 1}),[data-list-key="${kind}"] .sales-register-table td:nth-child(${i + 1}){display:none}`,
                ]
              : [],
          )
          .join('\n')}
      </style>
      <details>
        <summary>Columns</summary>
        <div>
          {columns.map((c, i) => (
            <label key={c}>
              <input
                type="checkbox"
                disabled={i === 0 || c === 'Actions'}
                checked={!hidden.includes(c)}
                onChange={(e) =>
                  store(
                    e.target.checked
                      ? hidden.filter((v) => v !== c)
                      : [...hidden, c],
                    saved,
                  )
                }
              />
              {c}
            </label>
          ))}
        </div>
      </details>
      <details>
        <summary>Saved views ({saved.length})</summary>
        <div>
          {saved.map((v) => (
            <div key={v.name}>
              <button onClick={() => onRestore(v.query, v.status)}>
                {v.name}
              </button>
              <button
                aria-label={'Remove ' + v.name}
                onClick={() =>
                  store(
                    hidden,
                    saved.filter((s) => s.name !== v.name),
                  )
                }
              >
                ×
              </button>
            </div>
          ))}
          <Input
            aria-label="View name"
            placeholder="Name this view"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <Button
            disabled={!name.trim()}
            variant="outline"
            onClick={() => {
              store(hidden, [
                ...saved.filter((v) => v.name !== name.trim()),
                { name: name.trim(), query, status },
              ]);
              setName('');
            }}
          >
            Save current view
          </Button>
        </div>
      </details>
    </div>
  );
}
