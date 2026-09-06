'use client';
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Empty,
  EmptyHeader,
  EmptyTitle,
  EmptyDescription,
  EmptyMedia,
} from '@/components/ui/empty';
import { Skeleton } from '@/components/ui/skeleton';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from '@/components/ui/dropdown-menu';
import { MoreHorizontal, ArrowUpRight, Inbox, RefreshCw } from 'lucide-react';
export async function api(path: string, body?: unknown) {
  const response = await fetch('/api/v1/' + path, {
    credentials: 'same-origin',
    ...(body !== undefined
      ? {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        }
      : {}),
  });
  const data: any = await response.json();
  if (!response.ok) {
    if (response.status === 401 && path !== 'login')
      window.dispatchEvent(new Event('erp-session-expired'));
    throw new Error(data.error || 'Request failed.');
  }
  return data;
}
export const today = () =>
  new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());
export function money(n: number, currency = 'INR', compact = false) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency,
    maximumFractionDigits: compact ? 1 : 2,
    notation: compact ? 'compact' : 'standard',
  }).format((n || 0) / 100);
}
export function dateLabel(s: string) {
  return s
    ? new Date(s.slice(0, 10) + 'T00:00:00').toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      })
    : '—';
}
export function Pick({
  value,
  onChange,
  options,
  label,
  className = '',
}: {
  value: string;
  onChange: (v: string) => void;
  options: (string | { value: string; label: string })[];
  label: string;
  className?: string;
}) {
  return (
    <Select value={value} onValueChange={(v) => onChange(String(v || ''))}>
      <SelectTrigger aria-label={label} className={'erp-select ' + className}>
        <SelectValue>
          {options
            .map((o) => (typeof o === 'string' ? { value: o, label: o } : o))
            .find((o) => o.value === value)?.label || label}
        </SelectValue>
      </SelectTrigger>
      <SelectContent>
        {options.map((o) => {
          const v = typeof o === 'string' ? o : o.value;
          return (
            <SelectItem key={v} value={v}>
              {typeof o === 'string' ? o : o.label}
            </SelectItem>
          );
        })}
      </SelectContent>
    </Select>
  );
}
export function Field({
  label,
  value,
  onChange,
  type = 'text',
  required = true,
  placeholder = '',
  min,
  max,
}: {
  label: string;
  value: any;
  onChange: (v: string) => void;
  type?: string;
  required?: boolean;
  placeholder?: string;
  min?: string;
  max?: string;
}) {
  return (
    <label className="field">
      <span>
        {label}
        {required && <span className="required"> *</span>}
      </span>
      <Input
        type={type}
        value={value ?? ''}
        onChange={(e) => onChange(e.target.value)}
        required={required}
        placeholder={placeholder}
        min={min}
        max={max}
        step={type === 'number' ? '0.01' : undefined}
      />
    </label>
  );
}
export function Blank({
  title = 'No records yet',
  detail = 'Records will appear here as you begin using your ERP.',
}: {
  title?: string;
  detail?: string;
}) {
  return (
    <Empty className="blank">
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <Inbox />
        </EmptyMedia>
        <EmptyTitle>{title}</EmptyTitle>
        <EmptyDescription>{detail}</EmptyDescription>
      </EmptyHeader>
    </Empty>
  );
}
export function Loading() {
  return (
    <div className="widget-loading">
      <Skeleton className="h-6 w-1/3" />
      <Skeleton className="h-24 w-full" />
    </div>
  );
}
export function Status({ value }: { value: string }) {
  const tone = ['Critical', 'Delayed'].includes(value)
    ? 'red'
    : ['Warning', 'Pending Action', 'Draft', 'Attention'].includes(value)
      ? 'amber'
      : ['Completed', 'Posted', 'Resolved', 'Received'].includes(value)
        ? 'green'
        : ['In Transit', 'Confirmed'].includes(value)
          ? 'blue'
          : 'neutral';
  return (
    <span className={'status ' + tone}>
      <i />
      {value}
    </span>
  );
}
export function exportCSV(rows: any[], name: string) {
  if (!rows.length) return;
  const keys = [...new Set(rows.flatMap(Object.keys))].filter(
    (k) => !['lines'].includes(k),
  );
  const cell = (v: any) => {
    const s = typeof v === 'object' ? JSON.stringify(v) : String(v ?? '');
    return (
      '"' + (/^[=+@\-\t\r]/.test(s) ? "'" : '') + s.replaceAll('"', '""') + '"'
    );
  };
  const blob = new Blob(
    [
      '\uFEFF' +
        [
          keys.map(cell).join(','),
          ...rows.map((r) => keys.map((k) => cell(r[k])).join(',')),
        ].join('\r\n'),
    ],
    { type: 'text/csv;charset=utf-8' },
  );
  const url = URL.createObjectURL(blob),
    a = document.createElement('a');
  a.href = url;
  a.download = name + '.csv';
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
export function Widget({
  title,
  children,
  onView,
  onRefresh,
  onExport,
  subtitle,
  className = '',
}: {
  title: string;
  children: React.ReactNode;
  onView?: () => void;
  onRefresh?: () => void;
  onExport?: () => void;
  subtitle?: string;
  className?: string;
}) {
  return (
    <section className={'widget ' + className}>
      <div className="widget-head">
        <div>
          <h2>{title}</h2>
          {subtitle && <p>{subtitle}</p>}
        </div>
        <div className="inline-actions">
          {onView && (
            <button className="text-link" onClick={onView}>
              View all <ArrowUpRight size={15} />
            </button>
          )}
          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <Button
                  size="icon"
                  variant="ghost"
                  aria-label={title + ' options'}
                />
              }
            >
              <MoreHorizontal size={18} />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {onRefresh && (
                <DropdownMenuItem onClick={onRefresh}>
                  <RefreshCw />
                  Refresh
                </DropdownMenuItem>
              )}
              {onView && (
                <DropdownMenuItem onClick={onView}>
                  Open full view
                </DropdownMenuItem>
              )}
              {onExport && (
                <DropdownMenuItem onClick={onExport}>
                  Export data
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
      {children}
    </section>
  );
}
