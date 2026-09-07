'use client';
import Masters, { MasterDestination } from './masters';
import { masterItems } from '@/lib/masters';
import { useEffect, useState, useCallback } from 'react';
import {
  Search,
  RefreshCw,
  History,
  Bell,
  Settings,
  LogOut,
  User,
  ChevronRight,
  ArrowUpRight,
  Plus,
  ShieldCheck,
  Download,
  LockKeyhole,
} from 'lucide-react';
import {
  SidebarProvider,
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarFooter,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarTrigger,
  useSidebar,
} from '@/components/ui/sidebar';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import {
  Command,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
} from '@/components/ui/command';
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableHeader,
  TableHead,
  TableRow,
  TableBody,
  TableCell,
} from '@/components/ui/table';
import { Toaster } from '@/components/ui/toast';
import { toast } from '@/lib/toast';
import {
  api,
  Pick,
  Blank,
  Loading,
  Field,
  money,
  Status,
  today,
  dateLabel,
  exportCSV,
} from './erp-ui';
import {
  modules,
  titles,
  routeKind,
  pendingMenuRoutes,
} from '@/lib/navigation';
import { accountNames } from '@/lib/domain';
import type { RecordData } from '@/lib/domain';
import Login from './login';
import Dashboard from './dashboard';
import Register, { RecordForm } from './register';
const fyOptions = ['2026–27', '2025–26', '2024–25'];
function initialRoute() {
  return typeof window === 'undefined'
    ? 'dashboard'
    : window.location.pathname.slice(1).split('/')[0] || 'dashboard';
}
function AppSidebar({
  route,
  go,
  role,
}: {
  route: string;
  go: (r: string) => void;
  role: string;
}) {
  const { state, setOpenMobile } = useSidebar(),
    [expanded, setExpanded] = useState('');
  const visible = (m: (typeof modules)[number]) =>
    role === 'Admin' ||
    (role === 'Viewer' && m.key !== 'administration') ||
    (role === 'Logistics'
      ? [
          'dashboard',
          'sales',
          'inventory',
          'logistics',
          'compliance',
          'documents',
          'tasks',
          'masters',
          'settings',
          'help',
        ].includes(m.key)
      : [
          'dashboard',
          'sales',
          'purchase',
          'finance',
          'compliance',
          'documents',
          'costing',
          'reports',
          'masters',
          'settings',
          'help',
        ].includes(m.key));
  const nav = (r: string) => {
    go(r);
    setOpenMobile(false);
  };
  const item = (m: (typeof modules)[number]) => {
    const Icon = m.icon;
    const owner = modules.find((module) =>
      module.items.some((i) => i[1] === route),
    );
    const active =
      route === m.key ||
      (masterItems.some((i) => i.route === route)
        ? m.key === 'masters'
        : owner?.key === m.key);
    return (
      <SidebarMenuItem key={m.key}>
        {state === 'collapsed' && m.items.length ? (
          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <SidebarMenuButton
                  className="nav-item"
                  tooltip={m.label}
                  isActive={active}
                />
              }
            >
              <Icon />
              <span>{m.label}</span>
            </DropdownMenuTrigger>
            <DropdownMenuContent side="right" className="nav-flyout">
              {m.items.map(([, r, label]) => (
                <div key={r}>
                  <DropdownMenuItem
                    disabled={pendingMenuRoutes.has(r)}
                    onClick={() => nav(r)}
                    title={
                      pendingMenuRoutes.has(r) ? 'Not available yet' : undefined
                    }
                  >
                    {label}
                  </DropdownMenuItem>
                </div>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        ) : (
          <>
            <SidebarMenuButton
              tooltip={m.label}
              className="nav-item"
              isActive={active}
              aria-expanded={m.items.length ? expanded === m.key : undefined}
              onClick={() =>
                m.items.length
                  ? setExpanded(expanded === m.key ? '' : m.key)
                  : nav(m.key)
              }
            >
              <Icon />
              <span>{m.label}</span>
              {!!m.items.length && (
                <ChevronRight
                  className={expanded === m.key ? 'rotate-90' : ''}
                />
              )}
            </SidebarMenuButton>
            {expanded === m.key && !!m.items.length && (
              <div className="submenu">
                {m.items.map(([, r, label]) => (
                  <div key={r}>
                    <button
                      className={route === r ? 'active' : ''}
                      disabled={pendingMenuRoutes.has(r)}
                      title={
                        pendingMenuRoutes.has(r)
                          ? 'Not available yet'
                          : undefined
                      }
                      onClick={() => nav(r)}
                    >
                      {label}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </SidebarMenuItem>
    );
  };
  return (
    <Sidebar collapsible="icon" className="erp-sidebar">
      <SidebarHeader>
        <div className="side-brand">
          <span className="brand-symbol">
            R<span>↗</span>
          </span>
          <div className="brand-text">
            <strong>Rohit's ERP</strong>
          </div>
        </div>
        <SidebarMenu>{item(modules[0])}</SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <SidebarMenu>
          {modules.slice(1, 13).filter(visible).map(item)}
        </SidebarMenu>
      </SidebarContent>
      <SidebarFooter>
        <SidebarMenu>{modules.slice(13).filter(visible).map(item)}</SidebarMenu>
        <div className="sidebar-local">
          <i /> Local workspace
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
export default function ERP() {
  const [user, setUser] = useState<any>(null),
    [setup, setSetup] = useState(false),
    [boot, setBoot] = useState(true),
    [bootError, setBootError] = useState(''),
    [expired, setExpired] = useState('');
  const initialize = useCallback(async () => {
    setBoot(true);
    setBootError('');
    try {
      const status = await api('status');
      setSetup(status.setupRequired);
      if (!status.setupRequired) {
        try {
          const r = await api('me');
          setUser(r.user);
        } catch {
          setUser(null);
        }
      }
    } catch (e: any) {
      setBootError(e.message);
    } finally {
      setBoot(false);
    }
  }, []);
  useEffect(() => {
    initialize();
    const expire = () => {
      setUser(null);
      setExpired('Your session has expired. Please sign in again.');
    };
    window.addEventListener('erp-session-expired', expire);
    return () => window.removeEventListener('erp-session-expired', expire);
  }, [initialize]);
  if (boot)
    return (
      <main className="boot">
        <span className="brand-symbol">
          R<span>↗</span>
        </span>
        <p>Opening your workspace…</p>
      </main>
    );
  if (bootError)
    return (
      <main className="boot">
        <h1>Unable to open your ERP</h1>
        <p role="alert">{bootError}</p>
        <Button onClick={initialize}>Retry</Button>
      </main>
    );
  return (
    <>
      {user ? (
        <Workspace
          user={user}
          onLogout={() => {
            setUser(null);
            setSetup(false);
            setExpired('');
          }}
        />
      ) : (
        <Login
          setup={setup}
          message={expired}
          onLogin={(u) => {
            setUser(u);
            setSetup(false);
          }}
        />
      )}
      <Toaster />
    </>
  );
}
function Workspace({ user, onLogout }: { user: any; onLogout: () => void }) {
  const [route, setRoute] = useState('dashboard'),
    [filter, setFilter] = useState(''),
    [fy, setFy] = useState('2026–27'),
    [period, setPeriod] = useState('This financial year'),
    [customStart, setCustomStart] = useState('2026-04-01'),
    [customEnd, setCustomEnd] = useState(today()),
    [revision, setRevision] = useState(0),
    [records, setRecords] = useState<RecordData[]>([]),
    [loading, setLoading] = useState(true),
    [error, setError] = useState(''),
    [searchOpen, setSearchOpen] = useState(false),
    [search, setSearch] = useState(''),
    [results, setResults] = useState<RecordData[]>([]),
    [searchError, setSearchError] = useState(''),
    [notifications, setNotifications] = useState<any[]>([]),
    [refreshTime, setRefreshTime] = useState(''),
    [passwordOpen, setPasswordOpen] = useState(false),
    [currentPassword, setCurrentPassword] = useState(''),
    [newPassword, setNewPassword] = useState(''),
    [passwordBusy, setPasswordBusy] = useState(false);
  const refresh = () => setRevision((n) => n + 1);
  const go = useCallback(
    (r: string, f = '', range: { from?: string; to?: string } = {}) => {
      setRoute(r);
      setFilter(f);
      window.history.pushState(
        {},
        '',
        r === 'dashboard'
          ? '/'
          : '/' +
              r +
              '?' +
              new URLSearchParams({
                ...(f ? { filter: f } : {}),
                ...range,
              }).toString(),
      );
      window.scrollTo(0, 0);
    },
    [],
  );
  useEffect(() => {
    setRoute(initialRoute());
    setFilter(new URLSearchParams(window.location.search).get('filter') || '');
    api('preferences')
      .then((p) => {
        if (fyOptions.includes(p.fy)) setFy(p.fy);
        if (p.period) setPeriod(p.period);
      })
      .catch(() => {});
    const back = () => {
      setRoute(initialRoute());
      setFilter(
        new URLSearchParams(window.location.search).get('filter') || '',
      );
    };
    const shortcut = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setSearchOpen(true);
      }
    };
    window.addEventListener('popstate', back);
    window.addEventListener('keydown', shortcut);
    return () => {
      window.removeEventListener('popstate', back);
      window.removeEventListener('keydown', shortcut);
    };
  }, []);
  useEffect(() => {
    let active = true;
    setLoading(true);
    setError('');
    api('records')
      .then((r) => {
        if (active) {
          setRecords(r);
          setRefreshTime(new Date().toLocaleTimeString('en-IN'));
          setLoading(false);
        }
      })
      .catch((e) => {
        if (active) {
          setError(e.message);
          setLoading(false);
        }
      });
    api('notifications?fy=' + encodeURIComponent(fy))
      .then((r) => active && setNotifications(r))
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [fy, revision]);
  useEffect(() => {
    let active = true;
    const timeout = setTimeout(() => {
      setSearchError('');
      api(
        'search?fy=' +
          encodeURIComponent(fy) +
          '&q=' +
          encodeURIComponent(search),
      )
        .then((r) => active && setResults(r))
        .catch((e) => active && setSearchError(e.message));
    }, 200);
    return () => {
      active = false;
      clearTimeout(timeout);
    };
  }, [search, fy]);
  const year = Number(fy.slice(0, 4)),
    fyStart = `${year}-04-01`,
    fyEnd = `${year + 1}-03-31`,
    current = today(),
    capEnd = current < fyStart ? fyEnd : current < fyEnd ? current : fyEnd;
  let start = fyStart,
    end = capEnd;
  if (period === 'Custom period') {
    start = customStart;
    end = customEnd;
  } else if (period === 'Today') {
    start = current;
    end = current;
  } else if (period === 'This month') {
    start = current.slice(0, 7) + '-01';
    end = current;
  } else if (period === 'This quarter') {
    const month = Number(current.slice(5, 7));
    start =
      current.slice(0, 4) +
      '-' +
      String(Math.floor((month - 1) / 3) * 3 + 1).padStart(2, '0') +
      '-01';
    end = current;
  } else if (period === 'This week') {
    const d = new Date(current + 'T00:00:00Z');
    d.setUTCDate(d.getUTCDate() - ((d.getUTCDay() + 6) % 7));
    start = d.toISOString().slice(0, 10);
    end = current;
  }
  start = start < fyStart ? fyStart : start;
  end = end > fyEnd ? fyEnd : end;
  const validRange = start <= end && start <= fyEnd && end >= fyStart;
  const changeFy = (v: string) => {
    setFy(v);
    setPeriod('This financial year');
    api('preferences', { fy: v, period: 'This financial year' }).catch((e) =>
      toast.error(e.message),
    );
  };
  const changePeriod = (v: string) => {
    setPeriod(v);
    api('preferences', { fy, period: v }).catch((e) => toast.error(e.message));
  };
  const count = notifications.filter((n) => !n.read).length;
  const canWrite = user.role !== 'Viewer';
  return (
    <SidebarProvider
      style={
        {
          '--sidebar-width': '240px',
          '--sidebar-width-icon': '68px',
        } as React.CSSProperties
      }
    >
      <AppSidebar route={route} go={go} role={user.role} />
      <div className="app-main">
        <header className="top-header">
          <div className="header-left">
            <SidebarTrigger className="icon-btn" />
            <strong>{titles[route] || 'Workspace'}</strong>
          </div>
          <button className="global-search" onClick={() => setSearchOpen(true)}>
            <Search size={17} />
            <span>Search invoices, customers, products…</span>
            <kbd>Ctrl K</kbd>
          </button>
          <div className="header-actions">
            <Pick
              label="Financial year"
              value={fy}
              onChange={changeFy}
              options={fyOptions.map((f) => ({ value: f, label: 'FY ' + f }))}
            />
            <button
              className="icon-btn"
              title={
                refreshTime ? 'Last refreshed ' + refreshTime : 'Refresh data'
              }
              aria-label="Refresh data"
              onClick={refresh}
            >
              <RefreshCw size={18} />
            </button>
            <button
              className="icon-btn optional-header"
              aria-label="Recent activity"
              onClick={() => go('activity')}
            >
              <History size={19} />
            </button>
            <button
              className="icon-btn notification-button"
              aria-label={`Notifications, ${count} unread`}
              onClick={() => go('notifications')}
            >
              <Bell size={19} />
              {count > 0 && <i />}
            </button>
            <button
              className="icon-btn optional-header"
              aria-label="Settings"
              onClick={() => go('settings')}
            >
              <Settings size={19} />
            </button>
            <DropdownMenu>
              <DropdownMenuTrigger
                render={<button className="avatar" aria-label="User menu" />}
              >
                {user.name
                  .split(' ')
                  .map((s: string) => s[0])
                  .slice(0, 2)
                  .join('')
                  .toUpperCase()}
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="profile-menu">
                <div>
                  <strong>{user.name}</strong>
                  <p>{user.email}</p>
                  <small>{user.role}</small>
                </div>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => go('profile')}>
                  <User />
                  My Profile
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setPasswordOpen(true)}>
                  <LockKeyhole />
                  Change Password
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => go('settings')}>
                  <Settings />
                  Preferences
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={async () => {
                    try {
                      await api('logout', {});
                      onLogout();
                    } catch (e: any) {
                      toast.error(e.message);
                    }
                  }}
                >
                  <LogOut />
                  Sign Out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>
        <main className="page-content">
          {route !== 'masters' && (
            <div className="page-heading">
              <div>
                <div className="breadcrumb">
                  {masterItems.some((i) => i.route === route) ? (
                    <>
                      <button onClick={() => go('masters')}>Masters</button>
                      <ChevronRight size={12} />
                      <span aria-current="page">{titles[route]}</span>
                    </>
                  ) : (
                    <>
                      Workspace <ChevronRight size={12} />
                      {route === 'dashboard' ? 'Overview' : titles[route]}
                    </>
                  )}
                </div>
                <h1>
                  {route === 'dashboard'
                    ? 'Business at a glance'
                    : titles[route] || 'Workspace'}
                </h1>
                <p>
                  {route === 'dashboard'
                    ? 'Performance, priorities and progress. All in one view.'
                    : pageSubtitle(route)}
                </p>
              </div>
              {route === 'dashboard' && (
                <div className="dashboard-controls">
                  <Pick
                    label="Period"
                    value={period}
                    onChange={changePeriod}
                    options={[
                      'Today',
                      'This week',
                      'This month',
                      'This quarter',
                      'This financial year',
                      'Custom period',
                    ]}
                  />
                  <span>
                    <i />
                    {refreshTime ? 'Updated ' + refreshTime : 'Loading data…'}
                  </span>
                </div>
              )}
            </div>
          )}
          {route === 'dashboard' && period === 'Custom period' && (
            <div className="custom-period">
              <Field
                label="From"
                type="date"
                value={customStart}
                onChange={setCustomStart}
              />
              <Field
                label="To"
                type="date"
                value={customEnd}
                onChange={setCustomEnd}
              />
            </div>
          )}
          {route === 'dashboard' ? (
            validRange ? (
              <Dashboard
                fy={fy}
                start={start}
                end={end}
                revision={revision}
                go={(r, f) =>
                  go(r, f, {
                    from: ['sales-report', 'profitability'].includes(r)
                      ? start
                      : '',
                    to: end,
                  })
                }
                records={records}
                role={user.role}
              />
            ) : (
              <div className="error-box">
                This period falls outside FY {fy}. Select a different period or
                financial year.
              </div>
            )
          ) : route === 'masters' ? (
            <Masters go={go} />
          ) : error ? (
            <div className="error-box" role="alert">
              {error}
              <Button variant="outline" onClick={refresh}>
                Retry
              </Button>
            </div>
          ) : loading ? (
            <Loading />
          ) : (
            <PageContent
              route={route}
              fy={fy}
              records={records}
              filter={filter}
              refresh={refresh}
              go={go}
              user={user}
              canWrite={canWrite}
              notifications={notifications}
              changeFy={changeFy}
            />
          )}
          <footer className="workspace-footer">
            <span>Rohit's ERP</span>
            <span>Local workspace · FY {fy}</span>
          </footer>
        </main>
      </div>
      <Dialog open={searchOpen} onOpenChange={setSearchOpen}>
        <DialogContent className="search-dialog">
          <DialogTitle>Search your ERP</DialogTitle>
          <DialogDescription>
            Records across your workspace · FY {fy}
          </DialogDescription>
          <Command shouldFilter={false}>
            <CommandInput
              value={search}
              onValueChange={setSearch}
              placeholder="Search invoices, customers, products, documents…"
            />
            <CommandList>
              {searchError ? (
                <p className="error-box">{searchError}</p>
              ) : !results.length ? (
                <CommandEmpty>
                  {search
                    ? 'No matching records.'
                    : 'Type to search across your ERP.'}
                </CommandEmpty>
              ) : (
                [...new Set(results.map((r) => r.kind))].map((k) => (
                  <CommandGroup heading={titles[k] || k} key={k}>
                    {results
                      .filter((r) => r.kind === k)
                      .map((r) => (
                        <CommandItem
                          key={r.id}
                          value={r.id}
                          onSelect={() => {
                            go(r.kind, r.reference || r.name);
                            setSearchOpen(false);
                          }}
                        >
                          <Search size={15} />
                          <span>
                            {r.reference || r.name}
                            <small>{r.destination || r.sku || ''}</small>
                          </span>
                          <ArrowUpRight size={15} />
                        </CommandItem>
                      ))}
                  </CommandGroup>
                ))
              )}
            </CommandList>
          </Command>
        </DialogContent>
      </Dialog>
      <Dialog open={passwordOpen} onOpenChange={setPasswordOpen}>
        <DialogContent>
          <DialogTitle>Change password</DialogTitle>
          <DialogDescription>
            Changing your password signs out every active session.
          </DialogDescription>
          <form
            className="stack"
            onSubmit={async (e) => {
              e.preventDefault();
              setPasswordBusy(true);
              try {
                await api('password', {
                  current: currentPassword,
                  password: newPassword,
                });
                setPasswordOpen(false);
                toast.success('Password changed. Please sign in again.');
                onLogout();
              } catch (e: any) {
                toast.error(e.message);
              } finally {
                setPasswordBusy(false);
              }
            }}
          >
            <Field
              label="Current password"
              type="password"
              value={currentPassword}
              onChange={setCurrentPassword}
            />
            <Field
              label="New password (12+ characters)"
              type="password"
              value={newPassword}
              onChange={setNewPassword}
            />
            <Button disabled={passwordBusy}>Change password</Button>
          </form>
        </DialogContent>
      </Dialog>
    </SidebarProvider>
  );
}
function pageSubtitle(route: string) {
  return (
    (
      {
        masters: 'Shared business data, organised for every workflow.',
        settings: 'Manage your workspace preferences.',
        exceptions: 'Track unresolved operational and compliance exceptions.',
        journal:
          'Posted, balanced accounting entries in their original currency.',
        stock: 'Physical stock by product and warehouse.',
        users: 'Control who can access your workspace.',
        audit: 'A permanent record of changes across your ERP.',
        notifications: 'Items that require your attention.',
        import: 'International import workflows.',
        production: 'Production and bill-of-materials workflows.',
      } as Record<string, string>
    )[route] || 'Review records, follow progress and open the details.'
  );
}
function PageContent({
  route,
  fy,
  records,
  filter,
  refresh,
  go,
  user,
  canWrite,
  notifications,
  changeFy,
}: any) {
  const [users, setUsers] = useState<any[]>([]),
    [events, setEvents] = useState<any[]>([]),
    [error, setError] = useState(''),
    [createUser, setCreateUser] = useState(false);
  useEffect(() => {
    setError('');
    if (route === 'users')
      api('users')
        .then(setUsers)
        .catch((e) => setError(e.message));
    if (['audit', 'activity'].includes(route))
      api('activity')
        .then(setEvents)
        .catch((e) => setError(e.message));
  }, [route, records]);
  if (error)
    return (
      <div role="alert" className="error-box">
        {error}
      </div>
    );
  if (route === 'masters') return <Masters go={go} />;
  if (route.startsWith('master-'))
    return <MasterDestination masterKey={route.slice(7)} go={go} />;
  if (['import', 'production'].includes(route))
    return (
      <section className="widget">
        <Blank
          title="Detailed workflow specification needed"
          detail={
            route === 'import'
              ? 'The source confirms an Import module. Bill of Entry, customs, settlement and import-cost screens were proposals, not recovered specifications.'
              : 'The source confirms Production and BOM. Scheduling, material consumption and output rules remain to be specified.'
          }
        />
        <div className="scope-note">
          <h3>Planned next steps</h3>
          <p>
            {route === 'import'
              ? 'Define import orders, shipment links, document fields, customs costs and settlement rules.'
              : 'Define BOM versions, production orders, material consumption, output and costing rules.'}
          </p>
          <button className="text-link" onClick={() => go('help')}>
            View the implementation guide <ArrowUpRight size={16} />
          </button>
        </div>
      </section>
    );
  if (route === 'profile')
    return (
      <section className="widget settings-card">
        <h2>Your profile</h2>
        <dl className="profile-details">
          <dt>Name</dt>
          <dd>{user.name}</dd>
          <dt>Email</dt>
          <dd>{user.email}</dd>
          <dt>Role</dt>
          <dd>{user.role}</dd>
          <dt>Workspace</dt>
          <dd>Rohit's ERP</dd>
        </dl>
      </section>
    );
  if (route === 'settings')
    return (
      <section className="widget settings-card">
        <h2>Workspace preferences</h2>
        <p>
          Your financial year applies across registers, search and the
          dashboard.
        </p>
        <label className="field">
          <span>Default financial year</span>
          <Pick
            label="Default financial year"
            value={fy}
            onChange={changeFy}
            options={fyOptions}
          />
        </label>
        <div className="settings-row">
          <span>Number format</span>
          <strong>Indian English (en-IN)</strong>
        </div>
        <div className="settings-row">
          <span>Local timezone</span>
          <strong>Asia/Kolkata</strong>
        </div>
        <div className="settings-row">
          <span>Currency conversion</span>
          <strong>Disabled until an approved rate source is configured</strong>
        </div>
        <div className="settings-row">
          <span>Integrations</span>
          <strong>No external business services configured</strong>
        </div>
        <p className="note">
          Masters contain business data. Settings control application behaviour.
        </p>
      </section>
    );
  if (route === 'help') return <Help />;
  if (route === 'users')
    return (
      <>
        <div className="register-summary">
          <span>{users.length} users</span>
          {user.role === 'Admin' && (
            <Button onClick={() => setCreateUser(true)}>
              <Plus size={16} />
              Add user
            </Button>
          )}
        </div>
        <section className="widget">
          <Table>
            <TableHeader>
              <TableRow>
                {['Name', 'Email', 'Role', 'Status'].map((t) => (
                  <TableHead key={t}>{t}</TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((u) => (
                <TableRow key={u.id}>
                  <TableCell>{u.name}</TableCell>
                  <TableCell>{u.email}</TableCell>
                  <TableCell>{u.role}</TableCell>
                  <TableCell>{u.active ? 'Active' : 'Inactive'}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <div className="scope-note">
            <p>
              Admin: full access. Finance: accounting and partners. Logistics:
              orders, stock masters, documents and exceptions. Viewer: read-only
              access.
            </p>
          </div>
        </section>
        {createUser && (
          <RecordForm
            kind="users"
            records={records}
            onClose={() => setCreateUser(false)}
            onDone={refresh}
          />
        )}
      </>
    );
  if (['audit', 'activity'].includes(route))
    return (
      <section className="widget">
        <div className="widget-head">
          <h2>Recent events</h2>
          <Button
            variant="outline"
            onClick={() => exportCSV(events, 'audit')}
            disabled={!events.length}
          >
            <Download size={16} />
            Export CSV
          </Button>
        </div>
        {events.length ? (
          <div className="activity-list">
            {events.map((a) => (
              <button
                key={a.id}
                onClick={() => go(a.kind === 'users' ? 'users' : a.kind)}
              >
                <span className="activity-dot" />
                <div>
                  <strong>{a.detail}</strong>
                  <span>
                    {a.actor} · {a.action}
                  </span>
                </div>
                <time>{new Date(a.created).toLocaleString('en-IN')}</time>
                <ArrowUpRight size={16} />
              </button>
            ))}
          </div>
        ) : (
          <Blank />
        )}
      </section>
    );
  if (route === 'notifications')
    return (
      <section className="widget">
        <div className="widget-head">
          <h2>Needs your attention</h2>
          <Button
            variant="outline"
            disabled={!notifications.some((n: any) => !n.read)}
            onClick={async () => {
              try {
                await api('notifications/read', {});
                refresh();
                toast.success('Notifications marked as read');
              } catch (e: any) {
                toast.error(e.message);
              }
            }}
          >
            Mark all as read
          </Button>
        </div>
        {notifications.length ? (
          <div className="activity-list">
            {notifications.map((n: any) => (
              <button key={n.id} onClick={() => go('exceptions', n.reference)}>
                <span className={'activity-dot ' + (n.read ? 'read' : '')} />
                <div>
                  <strong>{n.name}</strong>
                  <span>
                    Due {dateLabel(n.dueDate)} · {n.read ? 'Read' : 'Unread'}
                  </span>
                </div>
                <Status value={n.severity} />
                <ArrowUpRight size={16} />
              </button>
            ))}
          </div>
        ) : (
          <Blank
            title="You're all caught up"
            detail="There are no open recorded exceptions for this financial year."
          />
        )}
      </section>
    );
  if (route === 'accounts')
    return (
      <section className="widget">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Code</TableHead>
              <TableHead>Account name</TableHead>
              <TableHead>Type</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {Object.entries(accountNames).map(([code, name]) => (
              <TableRow key={code}>
                <TableCell>{code}</TableCell>
                <TableCell>{name}</TableCell>
                <TableCell>
                  {
                    {
                      '1': 'Asset',
                      '2': 'Liability',
                      '3': 'Equity',
                      '4': 'Revenue',
                      '5': 'Expense',
                      '6': 'Expense',
                    }[code[0]]
                  }
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        <p className="scope-note">
          Initial chart of accounts. Account customisation is planned.
        </p>
      </section>
    );
  if (route === 'stock') {
    const products = records.filter((r: any) => r.kind === 'products'),
      warehouses = records.filter((r: any) => r.kind === 'warehouses');
    const stock = products.flatMap((p: any) =>
      warehouses.map((w: any) => ({
        product: p.name,
        sku: p.sku,
        warehouse: w.name,
        unit: p.unit,
        reorder: p.reorderPoint,
        quantity: records
          .filter(
            (m: any) =>
              m.kind === 'movements' &&
              m.productId === p.id &&
              m.warehouseId === w.id,
          )
          .reduce(
            (s: number, m: any) =>
              s + (m.direction === 'Receipt' ? 1 : -1) * m.quantity,
            0,
          ),
      })),
    );
    return (
      <section className="widget">
        <div className="widget-head">
          <h2>Stock by location</h2>
          <button className="text-link" onClick={() => go('movements')}>
            View movements <ArrowUpRight size={16} />
          </button>
        </div>
        {stock.length ? (
          <Table>
            <TableHeader>
              <TableRow>
                {['Product', 'SKU', 'Warehouse', 'On hand', 'Status'].map(
                  (s) => (
                    <TableHead key={s}>{s}</TableHead>
                  ),
                )}
              </TableRow>
            </TableHeader>
            <TableBody>
              {stock.map((r: any, i: number) => (
                <TableRow key={i}>
                  <TableCell>{r.product}</TableCell>
                  <TableCell>{r.sku}</TableCell>
                  <TableCell>{r.warehouse}</TableCell>
                  <TableCell>
                    {r.quantity} {r.unit}
                  </TableCell>
                  <TableCell>
                    <Status
                      value={
                        r.quantity <= r.reorder ? 'Attention' : 'Available'
                      }
                    />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : (
          <Blank
            title="Set up products and warehouses"
            detail="Create stock masters, then record receipts or issues in Stock Movements."
          />
        )}
        <p className="scope-note">
          Physical quantities only. Valuation, batch/serial tracking and
          automatic accounting are later phases.
        </p>
      </section>
    );
  }
  if (['cash', 'profitability', 'trial-balance'].includes(route)) {
    if (user.role === 'Logistics')
      return (
        <Blank
          title="Access restricted"
          detail="Your role does not include financial reporting."
        />
      );
    return (
      <FinancialReport
        route={route}
        records={records}
        filter={filter}
        fy={fy}
      />
    );
  }
  const supported = [
    'customers',
    'vendors',
    'products',
    'warehouses',
    'orders',
    'purchase-orders',
    'invoices',
    'bills',
    'journal',
    'movements',
    'exceptions',
    'tasks',
    'documents',
    'receivables',
    'payables',
    'sales-report',
  ];
  if (supported.includes(route))
    return (
      <Register
        route={route}
        records={records}
        filter={filter}
        refresh={refresh}
        canWrite={canWrite}
        fy={fy}
      />
    );
  return (
    <Blank title="Page not found" detail="Choose a module from the sidebar." />
  );
}
function FinancialReport({ route, records, filter, fy }: any) {
  const scope = new URLSearchParams(
    typeof window === 'undefined' ? '' : window.location.search,
  );
  const from = scope.get('from'),
    to = scope.get('to');
  const journals = records.filter(
    (r: any) =>
      r.kind === 'journal' &&
      (to ? r.date <= to && (!from || r.date >= from) : r.fy === fy) &&
      r.status === 'Posted' &&
      (!filter || r.currency === filter),
  );
  const rows: any[] = [];
  for (const currency of [...new Set(journals.map((j: any) => j.currency))]) {
    const js = journals.filter((j: any) => j.currency === currency);
    for (const [code, name] of Object.entries(accountNames)) {
      const lines = js
        .flatMap((j: any) => j.lines)
        .filter((l: any) => l.account === code);
      const debit = lines.reduce((s: number, l: any) => s + l.debit, 0),
        credit = lines.reduce((s: number, l: any) => s + l.credit, 0);
      if (route === 'cash' && code !== '1000') continue;
      if (route === 'profitability' && !['4000', '5000'].includes(code))
        continue;
      rows.push({
        currency,
        code,
        name,
        debit,
        credit,
        balance: debit - credit,
      });
    }
  }
  return (
    <section className="widget">
      <div className="widget-head">
        <h2>{titles[route]}</h2>
        <Button
          variant="outline"
          disabled={!rows.length}
          onClick={() =>
            exportCSV(
              rows.map((r) => ({
                ...r,
                debit: r.debit / 100,
                credit: r.credit / 100,
                balance: r.balance / 100,
              })),
              route,
            )
          }
        >
          <Download size={16} />
          Export CSV
        </Button>
      </div>
      {rows.length ? (
        <Table>
          <TableHeader>
            <TableRow>
              {[
                'Account',
                'Currency',
                'Debit',
                'Credit',
                'Net debit / (credit)',
              ].map((s) => (
                <TableHead key={s}>{s}</TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((r) => (
              <TableRow key={r.currency + r.code}>
                <TableCell>
                  {r.code} · {r.name}
                </TableCell>
                <TableCell>{r.currency}</TableCell>
                <TableCell>{money(r.debit, r.currency)}</TableCell>
                <TableCell>{money(r.credit, r.currency)}</TableCell>
                <TableCell>{money(r.balance, r.currency)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      ) : (
        <Blank
          title="No posted entries for this financial year"
          detail="Posted invoices, expense bills and journals populate these reports."
        />
      )}
      <p className="scope-note">
        {route === 'profitability'
          ? 'Gross profit = posted sales revenue less posted cost of goods sold. Cost allocation must be entered before interpreting margins.'
          : 'Figures are period movements for the selected financial year; opening balances must be entered through a balanced opening journal.'}
      </p>
    </section>
  );
}
function Help() {
  return (
    <section className="widget help-content">
      <h2>Getting started with Rohit's ERP</h2>
      <ol>
        <li>
          <strong>Set up your masters.</strong> Add customers, vendors, products
          and warehouses. These records are shared across modules.
        </li>
        <li>
          <strong>Track your operations.</strong> Create sales orders, define
          the number of stages and update progress in the order details.
        </li>
        <li>
          <strong>Record financial activity.</strong> Create draft invoices or
          expense bills, review, then post. A balanced ledger entry is created
          once per document.
        </li>
        <li>
          <strong>Record physical stock.</strong> Stock receipts add quantity;
          issues cannot exceed available stock. Valuation is entered separately.
        </li>
        <li>
          <strong>Monitor your dashboard.</strong> Choose a financial year and
          period. Click summaries to open source registers. The dashboard is
          read-only.
        </li>
        <li>
          <strong>Record exceptions.</strong> Add operational or compliance
          reminders with a severity and due date. Resolve them in the Exception
          Register.
        </li>
      </ol>
      <h2>What is included now</h2>
      <p>
        Local account setup and sign-in, roles, organisation isolation, the
        specified application shell and dashboard, global search, order
        progress, basic masters and registers, balanced journals, CSV exports,
        document links and an append-only audit log.
      </p>
      <h2>What comes next</h2>
      <p>
        Detailed tax and export rules, statutory portal integrations, invoice
        lines and cost allocation, settlements and bank reconciliation, purchase
        three-way matching, document generation and uploads, payroll, production
        and import workflows, approval rules, SSO and MFA. These require further
        module specifications and implementation.
      </p>
      <h2>Financial definitions</h2>
      <p>
        Financial amounts use integer minor units. Each currency remains
        separate. Dashboard profit is posted revenue less posted cost of goods
        sold. Receivables and payables balances come from the ledger; invoice
        ageing shows unsettled document amounts and does not allocate manual
        journals.
      </p>
      <h2>Security and recovery</h2>
      <p>
        Use the profile menu to change your password. Email recovery and SSO are
        not configured. The local administrator can use the recovery procedure
        in the project setup guide. Back up the local database while the
        application is stopped.
      </p>
      <h2>Keyboard navigation</h2>
      <p>
        Ctrl + K opens global search. Ctrl + B toggles the sidebar. Tab moves
        through controls; Escape closes dialogs.
      </p>
    </section>
  );
}
