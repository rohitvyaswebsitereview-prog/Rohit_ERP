'use client';
import { useState, useEffect } from 'react';
import {
  ArrowUpRight,
  TrendingUp,
  Wallet,
  Landmark,
  Package,
  ArrowDownLeft,
  CheckCheck,
  AlertTriangle,
  Ship,
  ArrowRight,
} from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  BarChart,
  Bar,
} from 'recharts';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { Input } from '@/components/ui/input';
import {
  api,
  Widget,
  Blank,
  Loading,
  money,
  dateLabel,
  Pick,
  Status,
  exportCSV,
} from './erp-ui';
import type { RecordData } from '@/lib/domain';
type Props = {
  fy: string;
  start: string;
  end: string;
  revision: number;
  go: (route: string, filter?: string) => void;
  records: RecordData[];
  role: string;
};
function useWidget(path: string, revision: number) {
  const [state, setState] = useState<{
    data: any;
    error: string;
    loading: boolean;
  }>({ data: null, error: '', loading: true });
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    let active = true;
    setState({ data: null, error: '', loading: true });
    api(path)
      .then((data) => active && setState({ data, error: '', loading: false }))
      .catch(
        (e) =>
          active && setState({ data: null, error: e.message, loading: false }),
      );
    return () => {
      active = false;
    };
  }, [path, revision, retry]);
  return { ...state, retry: () => setRetry((n) => n + 1) };
}
function State({
  state,
  children,
}: {
  state: ReturnType<typeof useWidget>;
  children: React.ReactNode;
}) {
  return state.loading ? (
    <Loading />
  ) : state.error ? (
    <div className="widget-error" role="alert">
      <AlertTriangle size={22} />
      <p>Unable to load this data.</p>
      <button className="text-link" onClick={state.retry}>
        Retry
      </button>
    </div>
  ) : (
    <>{children}</>
  );
}
export default function Dashboard({
  fy,
  start,
  end,
  revision,
  go,
  records,
  role,
}: Props) {
  const query = `dashboard?fy=${encodeURIComponent(fy)}&start=${start}&end=${end}`;
  const financial = useWidget(query, revision),
    operations = useWidget(query, revision),
    attention = useWidget(
      `notifications?fy=${encodeURIComponent(fy)}`,
      revision,
    ),
    activity = useWidget('activity', revision);
  const [currency, setCurrency] = useState('INR'),
    [status, setStatus] = useState('All'),
    [search, setSearch] = useState('');
  const data = financial.data || {},
    total = data.totals?.find((t: any) => t.currency === currency) || {
      sales: 0,
      profit: 0,
      receivables: 0,
      payables: 0,
      cash: 0,
      receipts: 0,
      payments: 0,
      margin: null,
    };
  const orders = (operations.data?.orders || []).filter(
    (r: any) =>
      (status === 'All' || r.status === status) &&
      [
        r.reference,
        r.destination,
        records.find((x) => x.id === r.partnerId)?.name,
      ].some((x) =>
        String(x || '')
          .toLowerCase()
          .includes(search.toLowerCase()),
      ),
  );
  const alerts = [...(attention.data || [])].sort(
    (a: any, b: any) =>
      (({ Critical: 0, Warning: 1, Attention: 2 })[a.severity as string] ?? 3) -
        ({ Critical: 0, Warning: 1, Attention: 2 }[b.severity as string] ??
          3) || a.dueDate.localeCompare(b.dueDate),
  );
  const trend = (data.trend || [])
    .filter((r: any) => r.currency === currency)
    .sort((a: any, b: any) => a.month.localeCompare(b.month))
    .map((r: any) => ({
      ...r,
      label: new Date(r.month + '-01').toLocaleDateString('en-IN', {
        month: 'short',
      }),
      profit: r.sales - r.cost,
    }));
  const kpis = [
    ['Total Sales', total.sales, 'sales-report', TrendingUp, 'Posted revenue'],
    [
      'Gross Profit',
      total.profit,
      'profitability',
      ChartIcon,
      total.margin === null
        ? 'No posted sales'
        : `${total.margin.toFixed(2)}% gross margin`,
    ],
    [
      'Receivables',
      total.receivables,
      'receivables',
      ArrowDownLeft,
      'Outstanding balance',
    ],
    ['Payables', total.payables, 'payables', Wallet, 'Outstanding balance'],
    ['Cash & Bank', total.cash, 'cash', Landmark, 'Ledger balance'],
    [
      'Open Orders',
      operations.data?.orders?.length || 0,
      'orders',
      Package,
      'Active this financial year',
    ],
  ] as const;
  const financeVisible = role !== 'Logistics';
  return (
    <div className="dashboard-content">
      <div className="section-eyebrow">
        <span>01 / BUSINESS OVERVIEW</span>
        {financeVisible && (
          <Pick
            label="Display currency"
            value={currency}
            onChange={setCurrency}
            options={['INR', 'USD', 'EUR', 'GBP', 'AED']}
          />
        )}
      </div>
      <State state={financial}>
        <div
          className={'kpi-grid ' + (!financeVisible ? 'restricted-kpis' : '')}
        >
          {kpis
            .filter((_, i) => financeVisible || i === 5)
            .map(([label, value, route, Icon, desc], i) => (
              <button
                className={'kpi kpi-' + i}
                key={label}
                onClick={() =>
                  go(route, label === 'Open Orders' ? 'Active' : currency)
                }
              >
                <span className="kpi-label">
                  {label}
                  <Icon size={17} />
                </span>
                <strong>
                  {label === 'Open Orders'
                    ? value
                    : money(value, currency, true)}
                </strong>
                <span className="kpi-bottom">
                  {desc}
                  <ArrowUpRight size={16} />
                </span>
              </button>
            ))}
        </div>
        {financeVisible && (
          <div className="data-basis">
            {currency} amounts · No currency conversion · Balances as at{' '}
            {dateLabel(end)}
          </div>
        )}
      </State>
      <div className="section-eyebrow">
        <span>02 / NEEDS ATTENTION</span>
        <span>Priority first</span>
      </div>
      <Widget
        title="Your attention, where it matters"
        onView={() => go('exceptions', 'Open')}
        onRefresh={attention.retry}
        onExport={() => exportCSV(alerts, 'exceptions')}
      >
        <State state={attention}>
          {alerts.length ? (
            <div className="attention-grid">
              {alerts.slice(0, 7).map((a: any) => (
                <button
                  key={a.id}
                  className={'attention-item ' + a.severity.toLowerCase()}
                  onClick={() => go('exceptions', a.reference)}
                >
                  <span className="attention-icon">
                    <AlertTriangle size={18} />
                  </span>
                  <div>
                    <strong>{a.name}</strong>
                    <span>
                      {a.category} · Due {dateLabel(a.dueDate)}
                    </span>
                  </div>
                  <ArrowUpRight size={17} />
                </button>
              ))}
            </div>
          ) : (
            <div className="all-clear">
              <CheckCheck size={23} />
              <div>
                <strong>No open exceptions</strong>
                <p>
                  There are no recorded unresolved exceptions for this financial
                  year.
                </p>
              </div>
              <span className="status green">Up to date</span>
            </div>
          )}
        </State>
      </Widget>
      <div className="section-eyebrow">
        <span>03 / RUNNING OPERATIONS</span>
      </div>
      <Widget
        title="Orders in motion"
        subtitle="Current progress across active orders"
        onView={() => go('orders')}
        onRefresh={operations.retry}
        onExport={() => exportCSV(orders, 'running-orders')}
      >
        <div className="operations-toolbar">
          <Tabs value={status} onValueChange={(v) => setStatus(String(v))}>
            <TabsList>
              {['All', 'In Transit', 'Delayed', 'Pending Action'].map((s) => (
                <TabsTrigger value={s} key={s}>
                  {s}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
          <Input
            aria-label="Search running orders"
            placeholder="Search orders…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <State state={operations}>
          {orders.length ? (
            <>
              <div className="order-grid">
                {orders.slice(0, 6).map((r: any) => (
                  <button
                    className="order-card"
                    key={r.id}
                    onClick={() => go('orders', r.reference)}
                  >
                    <div className="order-top">
                      <strong>{r.reference}</strong>
                      <Status value={r.status} />
                    </div>
                    <h3>
                      {records.find((x) => x.id === r.partnerId)?.name ||
                        'Customer'}
                    </h3>
                    <p>
                      <Ship size={14} />
                      {r.destination}
                    </p>
                    <div className="order-stage">
                      <span>CURRENT STAGE</span>
                      <strong>{r.stageName}</strong>
                    </div>
                    <div className="progress-label">
                      <span>
                        Stage {r.stage} / {r.totalStages}
                      </span>
                      <span>
                        {Math.round((r.stage / r.totalStages) * 100)}%
                      </span>
                    </div>
                    <Progress value={(r.stage / r.totalStages) * 100} />
                    <div className="order-dates">
                      <span>
                        ETD <b>{dateLabel(r.etd)}</b>
                      </span>
                      <span>
                        ETA <b>{dateLabel(r.eta)}</b>
                      </span>
                      <ArrowRight size={17} />
                    </div>
                  </button>
                ))}
              </div>
              <p className="widget-foot">
                Showing {Math.min(6, orders.length)} of {orders.length} active
                orders
              </p>
            </>
          ) : (
            <Blank
              title={
                search || status !== 'All'
                  ? 'No matching orders'
                  : 'No active orders yet'
              }
              detail="Sales orders and their current stages will appear here."
            />
          )}
        </State>
      </Widget>
      {financeVisible && (
        <>
          <div className="section-eyebrow">
            <span>04 / SALES & PROFITABILITY</span>
          </div>
          <div className="two-columns">
            <Widget
              title="Sales & gross profit"
              subtitle={`${currency} · Monthly trend`}
              onView={() => go('profitability')}
              onRefresh={financial.retry}
              onExport={() => exportCSV(trend, 'sales-profit-trend')}
            >
              <State state={financial}>
                {trend.length ? (
                  <>
                    <div className="chart-legend">
                      <span>
                        <i className="green-dot" />
                        Sales
                      </span>
                      <span>
                        <i className="blue-dot" />
                        Gross profit
                      </span>
                    </div>
                    <div className="chart">
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={trend}>
                          <defs>
                            <linearGradient
                              id="salesFill"
                              x1="0"
                              y1="0"
                              x2="0"
                              y2="1"
                            >
                              <stop
                                offset="0%"
                                stopColor="#16876a"
                                stopOpacity={0.15}
                              />
                              <stop
                                offset="100%"
                                stopColor="#16876a"
                                stopOpacity={0}
                              />
                            </linearGradient>
                          </defs>
                          <CartesianGrid vertical={false} stroke="#edf0f3" />
                          <XAxis
                            dataKey="label"
                            tickLine={false}
                            axisLine={false}
                          />
                          <YAxis
                            tickFormatter={(n) => money(n, currency, true)}
                            tickLine={false}
                            axisLine={false}
                            width={75}
                          />
                          <Tooltip
                            formatter={(v: any) => money(Number(v), currency)}
                          />
                          <Area
                            dataKey="sales"
                            name="Sales"
                            stroke="#16876a"
                            fill="url(#salesFill)"
                            strokeWidth={2}
                          />
                          <Area
                            dataKey="profit"
                            name="Gross profit"
                            stroke="#497dcc"
                            fill="transparent"
                            strokeWidth={2}
                          />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                  </>
                ) : (
                  <Blank
                    title="Your sales story starts here"
                    detail="Post invoices and cost-of-goods journals to see sales and gross profit."
                  />
                )}
              </State>
            </Widget>
            <Widget
              title="Product contribution"
              subtitle="Gross profit by product"
              onView={() => go('profitability')}
              onRefresh={financial.retry}
            >
              <Blank
                title="Product costing is not configured"
                detail="Product profit will be available when invoice lines and approved cost allocation are implemented. No estimated profit is shown."
              />
            </Widget>
          </div>
          <div className="section-eyebrow">
            <span>05 / MONEY & WORKING CAPITAL</span>
          </div>
          <div className="two-columns">
            <Widget
              title="Cash flow"
              subtitle={`${currency} · ${dateLabel(start)} – ${dateLabel(end)}`}
              onView={() => go('cash')}
              onRefresh={financial.retry}
              onExport={() => exportCSV(trend, 'cash-flow')}
            >
              <State state={financial}>
                <div className="cash-summary">
                  <div>
                    <span>Receipts</span>
                    <strong>{money(total.receipts, currency, true)}</strong>
                  </div>
                  <div>
                    <span>Payments</span>
                    <strong>{money(total.payments, currency, true)}</strong>
                  </div>
                  <div>
                    <span>Net cash flow</span>
                    <strong className="green-text">
                      {money(total.receipts - total.payments, currency, true)}
                    </strong>
                  </div>
                </div>
                {trend.length ? (
                  <div className="chart">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={trend}>
                        <CartesianGrid vertical={false} stroke="#edf0f3" />
                        <XAxis
                          dataKey="label"
                          axisLine={false}
                          tickLine={false}
                        />
                        <YAxis
                          tickFormatter={(n) => money(n, currency, true)}
                          width={75}
                          axisLine={false}
                          tickLine={false}
                        />
                        <Tooltip
                          formatter={(v: any) => money(Number(v), currency)}
                        />
                        <Bar
                          name="Receipts"
                          dataKey="receipts"
                          fill="#16876a"
                          radius={[3, 3, 0, 0]}
                        />
                        <Bar
                          name="Payments"
                          dataKey="payments"
                          fill="#b6c6d4"
                          radius={[3, 3, 0, 0]}
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <Blank
                    title="No cash movements"
                    detail="Cash and bank journal entries will populate this view."
                  />
                )}
              </State>
            </Widget>
            <Widget
              title="Receivables ageing"
              subtitle={`Open invoice amounts · ${currency}`}
              onView={() => go('receivables')}
              onRefresh={financial.retry}
              onExport={() =>
                exportCSV(data.receivables || [], 'receivables-ageing')
              }
            >
              <State state={financial}>
                <div className="ageing-total">
                  <span>Ledger balance</span>
                  <strong>{money(total.receivables, currency, true)}</strong>
                </div>
                <div className="ageing-bars">
                  {['Current', '1–30', '31–60', '61–90', '90+'].map(
                    (bucket, i) => {
                      const value = (data.receivables || [])
                        .filter(
                          (r: any) =>
                            r.currency === currency && r.bucket === bucket,
                        )
                        .reduce((s: number, r: any) => s + r.outstanding, 0);
                      const max = Math.max(
                        1,
                        ...(data.receivables || [])
                          .filter((r: any) => r.currency === currency)
                          .map((r: any) => r.outstanding),
                      );
                      return (
                        <button
                          key={bucket}
                          onClick={() => go('receivables', bucket)}
                        >
                          <span>
                            {bucket === 'Current' ? bucket : bucket + ' days'}
                          </span>
                          <div className="age-track">
                            <i
                              style={{
                                width: Math.min(100, (value / max) * 100) + '%',
                                background: [
                                  '#179379',
                                  '#699e8f',
                                  '#d4aa61',
                                  '#cf8759',
                                  '#ca6161',
                                ][i],
                              }}
                            />
                          </div>
                          <strong>{money(value, currency, true)}</strong>
                        </button>
                      );
                    },
                  )}
                </div>
                <p className="widget-foot">
                  Invoice ageing excludes unallocated journal settlements.
                </p>
              </State>
            </Widget>
          </div>
          <div className="two-columns">
            <Widget
              title="Payables"
              subtitle="Open bills by currency"
              onView={() => go('payables')}
              onRefresh={financial.retry}
              onExport={() => exportCSV(data.payables || [], 'payables')}
            >
              <State state={financial}>
                {data.totals?.length ? (
                  <div className="currency-list">
                    {data.totals.map((t: any) => (
                      <button
                        key={t.currency}
                        onClick={() => go('payables', t.currency)}
                      >
                        <span>{t.currency}</span>
                        <strong>{money(t.payables, t.currency)}</strong>
                        <ArrowUpRight size={16} />
                      </button>
                    ))}
                  </div>
                ) : (
                  <Blank
                    title="No payable balances"
                    detail="Posted expense bills will appear here."
                  />
                )}
              </State>
            </Widget>
            <Widget
              title="Currency position"
              subtitle="Original currencies · No estimated conversions"
              onView={() => go('cash')}
              onRefresh={financial.retry}
            >
              <State state={financial}>
                {data.totals?.length ? (
                  <div className="currency-list">
                    {data.totals.map((t: any) => (
                      <button
                        key={t.currency}
                        onClick={() => go('cash', t.currency)}
                      >
                        <span>{t.currency}</span>
                        <strong>{money(t.cash, t.currency)}</strong>
                        <ArrowUpRight size={16} />
                      </button>
                    ))}
                  </div>
                ) : (
                  <Blank
                    title="No currency balances"
                    detail="Posted cash and bank entries are shown in their original currency."
                  />
                )}
              </State>
            </Widget>
          </div>
        </>
      )}
      <div className="section-eyebrow">
        <span>06 / RECENT ACTIVITY</span>
      </div>
      <Widget
        title="The latest across your workspace"
        onView={() => go('audit')}
        onRefresh={activity.retry}
        onExport={() => exportCSV(activity.data || [], 'activity')}
      >
        <State state={activity}>
          {activity.data?.length ? (
            <div className="activity-list">
              {activity.data.slice(0, 6).map((a: any) => (
                <button
                  key={a.id}
                  onClick={() => go(a.kind === 'users' ? 'users' : a.kind)}
                >
                  <span className="activity-dot" />
                  <div>
                    <strong>{a.detail}</strong>
                    <span>
                      {a.actor || 'System'} · {a.action}
                    </span>
                  </div>
                  <time>{new Date(a.created).toLocaleString('en-IN')}</time>
                  <ArrowUpRight size={16} />
                </button>
              ))}
            </div>
          ) : (
            <Blank
              title="No activity yet"
              detail="Record changes and financial postings will appear here."
            />
          )}
        </State>
      </Widget>
    </div>
  );
}
function ChartIcon({ size }: { size?: number }) {
  return <TrendingUp size={size} />;
}
