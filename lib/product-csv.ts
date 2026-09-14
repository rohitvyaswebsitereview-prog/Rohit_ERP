export function parseProductCSV(text: string): string[][] {
  if (text.length > 500000) throw new Error('CSV must be smaller than 500 KB.');
  const rows: string[][] = []; let row: string[] = [], cell = '', quoted = false;
  text = text.replace(/^\uFEFF/, '');
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (c === '"') {
      if (quoted && text[i + 1] === '"') { cell += '"'; i++; }
      else if (quoted || !cell) quoted = !quoted;
      else throw new Error('Unexpected quote in CSV.');
    } else if (!quoted && (c === ',' || c === '\n' || c === '\r')) {
      row.push(cell.trim()); cell = '';
      if (c !== ',') { if (row.some(Boolean)) rows.push(row); row = []; if (c === '\r' && text[i + 1] === '\n') i++; }
    } else cell += c;
  }
  if (quoted) throw new Error('CSV has an unclosed quoted field.');
  row.push(cell.trim()); if (row.some(Boolean)) rows.push(row);
  if (rows.length < 2 || rows.length > 201) throw new Error('Choose a header and between 1 and 200 product rows.');
  if (new Set(rows[0]).size !== rows[0].length || rows[0].some(x => !x)) throw new Error('Column headers must be non-empty and unique.');
  if (rows.some(r => r.length !== rows[0].length)) throw new Error('Each CSV row must have the same number of columns as the header.');
  return rows;
}
