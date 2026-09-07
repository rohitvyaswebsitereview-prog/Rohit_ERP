'use client';
import { useEffect, useState } from 'react';
import {
  Building2,
  MapPin,
  Boxes,
  Package,
  Ruler,
  Box,
  Shapes,
  Layers,
  BadgeCheck,
  ListTree,
  Handshake,
  Users,
  Store,
  Globe,
  Anchor,
  CalendarDays,
  Ship,
  Coins,
  Landmark,
  FileCheck2,
  FileBadge,
  FileText,
  Truck,
  Receipt,
  MapPinned,
  CirclePlus,
  Files,
  Mail,
  SlidersHorizontal,
  ListChecks,
  ChevronRight,
  Search,
  X,
  ArrowLeft,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Empty,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
  EmptyDescription,
} from '@/components/ui/empty';
import { api, Loading } from './erp-ui';
import { searchMasters } from '@/lib/masters';
import type { MasterCategory, MasterItem } from '@/lib/masters';
const icons: Record<string, LucideIcon> = {
  Building2,
  MapPin,
  Boxes,
  Package,
  Ruler,
  Box,
  Shapes,
  Layers,
  BadgeCheck,
  ListTree,
  Handshake,
  Users,
  Store,
  Globe,
  Anchor,
  CalendarDays,
  Ship,
  Coins,
  Landmark,
  FileCheck2,
  FileBadge,
  FileText,
  Truck,
  Receipt,
  MapPinned,
  CirclePlus,
  Files,
  Mail,
  SlidersHorizontal,
  ListChecks,
};
export default function Masters({ go }: { go: (route: string) => void }) {
  const [categories, setCategories] = useState<MasterCategory[]>([]),
    [query, setQuery] = useState(''),
    [loading, setLoading] = useState(true),
    [error, setError] = useState(''),
    [retry, setRetry] = useState(0);
  useEffect(() => {
    let current = true;
    setLoading(true);
    setError('');
    api('masters')
      .then((data) => {
        if (current) setCategories(data);
      })
      .catch((e) => current && setError(e.message))
      .finally(() => current && setLoading(false));
    return () => {
      current = false;
    };
  }, [retry]);
  const results = searchMasters(categories, query);
  return (
    <div className="masters-catalogue">
      <div className="page-heading masters-heading">
        <div>
          <nav className="breadcrumb" aria-label="Breadcrumb">
            <span aria-current="page">Masters</span>
          </nav>
          <h1>Masters</h1>
          <p>Manage the master data used throughout your ERP.</p>
        </div>
        <div className="masters-search">
          <Search size={18} />
          <Input
            aria-label="Search masters"
            placeholder="Search masters…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          {query && (
            <button
              aria-label="Clear master search"
              onClick={() => setQuery('')}
            >
              <X size={16} />
            </button>
          )}
        </div>
      </div>
      {loading ? (
        <Loading />
      ) : error ? (
        <div className="error-box" role="alert">
          <span>Unable to load masters. {error}</span>
          <Button variant="outline" onClick={() => setRetry((n) => n + 1)}>
            Retry
          </Button>
        </div>
      ) : results.length ? (
        <>
          <p className="sr-only" role="status">
            {results.reduce((n, c) => n + c.items.length, 0)} masters in{' '}
            {results.length} categories
          </p>
          <div className="masters-catalogue-grid">
            {results.map((c) => {
              const Icon = icons[c.icon] || Files;
              return (
                <section
                  className={'masters-category masters-category-' + c.key}
                  key={c.key}
                  aria-labelledby={'category-' + c.key}
                >
                  <header>
                    <span className="master-category-icon">
                      <Icon size={20} strokeWidth={1.7} />
                    </span>
                    <div>
                      <h2 id={'category-' + c.key}>{c.label}</h2>
                      <p>{c.description}</p>
                    </div>
                  </header>
                  <ul>
                    {c.items.map((i) => {
                      const RowIcon = icons[i.icon] || FileText;
                      return (
                        <li key={i.key}>
                          <a
                            href={'/' + i.route}
                            onClick={(e) => {
                              if (
                                !e.ctrlKey &&
                                !e.metaKey &&
                                !e.shiftKey &&
                                !e.altKey
                              ) {
                                e.preventDefault();
                                go(i.route);
                              }
                            }}
                          >
                            <RowIcon size={17} strokeWidth={1.7} />
                            <span>{i.label}</span>
                            <ChevronRight size={16} />
                          </a>
                        </li>
                      );
                    })}
                  </ul>
                </section>
              );
            })}
          </div>
        </>
      ) : (
        <Empty className="masters-no-results">
          <EmptyHeader>
            <EmptyMedia>
              <Search size={26} strokeWidth={1.5} />
            </EmptyMedia>
            <EmptyTitle>
              {query ? 'No masters found' : 'No masters available'}
            </EmptyTitle>
            <EmptyDescription>
              {query
                ? 'Try a different search term.'
                : 'Your role does not have access to master data.'}
            </EmptyDescription>
          </EmptyHeader>
          {query && (
            <Button variant="outline" onClick={() => setQuery('')}>
              Clear search
            </Button>
          )}
        </Empty>
      )}
    </div>
  );
}
export function MasterDestination({
  masterKey,
  go,
}: {
  masterKey: string;
  go: (route: string) => void;
}) {
  const [item, setItem] = useState<MasterItem | null>(null),
    [error, setError] = useState('');
  useEffect(() => {
    let active = true;
    setItem(null);
    setError('');
    api('masters/' + encodeURIComponent(masterKey))
      .then((i) => active && setItem(i))
      .catch((e) => active && setError(e.message));
    return () => {
      active = false;
    };
  }, [masterKey]);
  if (error)
    return (
      <div className="error-box" role="alert">
        {error}
        <Button variant="outline" onClick={() => go('masters')}>
          Back to Masters
        </Button>
      </div>
    );
  if (!item) return <Loading />;
  return (
    <section className="widget master-destination">
      <FileText size={28} />
      <h2>{item.label}</h2>
      <p>
        This master is included in the catalogue. Its record fields and editing
        screen have not been implemented yet.
      </p>
      <Button variant="outline" onClick={() => go('masters')}>
        <ArrowLeft size={16} />
        Back to Masters
      </Button>
    </section>
  );
}
