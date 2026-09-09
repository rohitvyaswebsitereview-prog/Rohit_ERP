'use client';
import { useEffect, useState } from 'react';
import { api, money, Blank, Loading, exportCSV } from './erp-ui';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableHeader,
  TableHead,
  TableRow,
  TableBody,
  TableCell,
} from '@/components/ui/table';
export default function OperationStock() {
  const [rows, setRows] = useState<any[]>([]),
    [loading, setLoading] = useState(true),
    [error, setError] = useState(''),
    [query, setQuery] = useState('');
  useEffect(() => {
    Promise.all([api('operations/stock'), api('operations/data')])
      .then(([stock, data]) =>
        setRows(
          stock.map((r: any) => ({
            ...r,
            product:
              data.find((p: any) => p.id === r.product_id)?.name ||
              r.product_id,
            warehouse:
              data.find((p: any) => p.id === r.warehouse_id)?.name ||
              r.warehouse_id,
          })),
        ),
      )
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);
  if (loading) return <Loading />;
  const filtered = rows.filter((r) =>
    (r.product + ' ' + r.warehouse).toLowerCase().includes(query.toLowerCase()),
  );
  return (
    <div className="op-workspace">
      {error && <p className="error-box">{error}</p>}
      <div className="op-toolbar">
        <Input
          aria-label="Search stock"
          placeholder="Search product or warehouse…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <Button
          variant="outline"
          onClick={() =>
            exportCSV(
              filtered.map((r) => ({
                product: r.product,
                warehouse: r.warehouse,
                currency: r.currency,
                quantity: r.quantity,
                value: r.value === undefined ? '' : r.value / 100,
              })),
              'Stock valuation',
            )
          }
        >
          Export
        </Button>
      </div>
      <p className="op-note">
        Perpetual weighted-average cost by product, warehouse and currency.
        Purchase postings, sales, transfers and production update these
        balances. Earlier unvalued manual movements remain in Stock Overview and
        require a reviewed opening adjustment.
      </p>
      <section className="widget">
        {rows.length ? (
          <Table>
            <TableHeader>
              <TableRow>
                {[
                  'Product',
                  'Warehouse',
                  'Quantity',
                  'Currency',
                  'Stock value',
                  'Average unit cost',
                ].map((h) => (
                  <TableHead key={h}>{h}</TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((r, i) => (
                <TableRow key={i}>
                  <TableCell>{r.product}</TableCell>
                  <TableCell>{r.warehouse}</TableCell>
                  <TableCell>{r.quantity}</TableCell>
                  <TableCell>{r.currency}</TableCell>
                  <TableCell>
                    {r.value === undefined
                      ? 'Restricted'
                      : money(r.value, r.currency)}
                  </TableCell>
                  <TableCell>
                    {r.value === undefined
                      ? 'Restricted'
                      : money(
                          r.quantity ? Math.round(r.value / r.quantity) : 0,
                          r.currency,
                        )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : (
          <Blank
            title="No valued stock yet"
            detail="Post a purchase invoice or opening stock adjustment to start tracking quantity and value."
          />
        )}
      </section>
    </div>
  );
}
