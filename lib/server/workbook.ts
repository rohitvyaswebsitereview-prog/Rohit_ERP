import { workbookReports } from '../workbook-reports';
const json = (data: unknown, status = 200) =>
  Response.json(data, { status, headers: { 'Cache-Control': 'no-store' } });
export async function workbook(req: Request, path: string, u: any, db: any) {
  if (!['Admin', 'Finance'].includes(u.role))
    return json(
      {
        error:
          'Workbook source and reconciliation require Admin or Finance access.',
      },
      403,
    );
  if (req.method !== 'GET')
    return json(
      { error: 'Source imports are immutable. Use a reviewed local import.' },
      405,
    );
  const url = new URL(req.url),
    [, action, rid] = path.split('/');
  const imports = (
    await db
      .prepare(
        'SELECT id,filename,sha256,metadata,created FROM workbook_imports WHERE tenant_id=? ORDER BY created DESC',
      )
      .bind(u.tenant_id)
      .all()
  ).results;
  if (!imports.length)
    return json({ imports: [], tables: [], sheets: [], issues: [] });
  const requested = url.searchParams.get('batch'),
    batch = requested
      ? imports.find((x: any) => x.id === requested)
      : imports[0];
  if (!batch) return json({ error: 'Import not found.' }, 404);
  const metadata = JSON.parse(batch.metadata);
  if (action === 'record') {
    const r = await db
      .prepare('SELECT * FROM records WHERE tenant_id=? AND id=?')
      .bind(u.tenant_id, rid)
      .first();
    if (!r) return json({ error: 'Record not found.' }, 404);
    const d = JSON.parse(r.data),
      origin = d.sourceWorkbook;
    if (!origin)
      return json({ error: 'This record has no workbook source.' }, 404);
    const owner = imports.find((i: any) => i.id === origin.batchId);
    if (!owner) return json({ error: 'Source not found.' }, 404);
    const sheet = await db
      .prepare('SELECT * FROM workbook_sheets WHERE batch_id=? AND name=?')
      .bind(origin.batchId, origin.sheet)
      .first();
    const allRows = (
      await db
        .prepare(
          'SELECT row_number,data FROM workbook_rows WHERE batch_id=? AND sheet_index=? ORDER BY row_number',
        )
        .bind(origin.batchId, sheet.sheet_index)
        .all()
    ).results;
    const headers = allRows.find(
      (r: any) => r.row_number === (origin.sheet.includes('FY 2025') ? 2 : 1),
    );
    const all = (
      await db
        .prepare('SELECT id,kind,data FROM records WHERE tenant_id=?')
        .bind(u.tenant_id)
        .all()
    ).results.map((r: any) => ({
      ...JSON.parse(r.data),
      id: r.id,
      kind: r.kind,
    }));
    const related = all
      .filter(
        (r: any) =>
          r.id !== rid &&
          (r.sourceId === rid ||
            r.invoiceId === rid ||
            r.purchaseId === rid ||
            r.salesInvoiceId === rid ||
            r.relatedIds?.includes(rid) ||
            d.relatedIds?.includes(r.id) ||
            [d.sourceId, d.invoiceId, d.purchaseId, d.salesInvoiceId].includes(
              r.id,
            )),
      )
      .map((r: any) => ({
        id: r.id,
        kind: r.kind,
        reference: r.originalReference || r.reference || r.name,
      }));
    return json({
      related,
      record: { ...d, id: r.id, kind: r.kind },
      source: origin,
      headers: headers ? JSON.parse(headers.data) : [],
      rows: allRows
        .filter((r: any) => origin.rows.includes(r.row_number))
        .map((r: any) => ({ row: r.row_number, cells: JSON.parse(r.data) })),
    });
  }
  if (action === 'sheet') {
    const index = Number(url.searchParams.get('sheet') || 0),
      start = Math.max(1, Number(url.searchParams.get('start') || 1)),
      limit = Math.min(
        100,
        Math.max(1, Number(url.searchParams.get('limit') || 30)),
      );
    if (
      !Number.isInteger(index) ||
      !Number.isInteger(start) ||
      !Number.isInteger(limit)
    )
      return json({ error: 'Invalid sheet range.' }, 400);
    const sheet = metadata.sheets.find((s: any) => s.index === index);
    if (!sheet) return json({ error: 'Sheet not found.' }, 404);
    const q = (url.searchParams.get('q') || '').trim().toLowerCase();
    const rows = (
      await db
        .prepare(
          'SELECT row_number,data FROM workbook_rows WHERE batch_id=? AND sheet_index=? ORDER BY row_number',
        )
        .bind(batch.id, index)
        .all()
    ).results;
    const filtered = q
      ? rows.filter((r: any) => r.data.toLowerCase().includes(q))
      : rows.filter(
          (r: any) => r.row_number >= start && r.row_number < start + limit,
        );
    return json({
      sheet,
      rows: filtered
        .slice(0, 100)
        .map((r: any) => ({ row: r.row_number, cells: JSON.parse(r.data) })),
      totalMatches: q ? filtered.length : sheet.maxRow,
      batchId: batch.id,
    });
  }
  if (action === 'download') {
    const row = await db
      .prepare(
        'SELECT original FROM workbook_imports WHERE id=? AND tenant_id=?',
      )
      .bind(batch.id, u.tenant_id)
      .first();
    return new Response(new Uint8Array(row.original), {
      headers: {
        'Content-Type':
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': 'attachment; filename="source-workbook.xlsx"',
        'Cache-Control': 'no-store',
      },
    });
  }
  if (action === 'reports') {
    const facts = (
      await db
        .prepare(
          'SELECT data FROM workbook_facts WHERE tenant_id=? AND batch_id=?',
        )
        .bind(u.tenant_id, batch.id)
        .all()
    ).results.map((r: any) => JSON.parse(r.data));
    const asOf =
      url.searchParams.get('asOf') || new Date().toISOString().slice(0, 10);
    if (
      !/^\d{4}-\d{2}-\d{2}$/.test(asOf) ||
      new Date(asOf).toISOString().slice(0, 10) !== asOf
    )
      return json({ error: 'Invalid report date.' }, 400);
    return json({
      tables: workbookReports(
        facts,
        url.searchParams.get('fy') || '2026–27',
        asOf,
      ),
      asOf,
      batchId: batch.id,
    });
  }
  return json({
    imports: imports.map((b: any) => ({
      id: b.id,
      filename: b.filename,
      sha256: b.sha256,
      created: b.created,
    })),
    ...metadata,
  });
}
