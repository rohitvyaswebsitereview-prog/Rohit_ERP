import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';

/** A paginated snapshot including the company's saved branding assets. */
export async function pdfDocument({ title, company, subtitle, lines, footer, signature, table, afterTable }: {
  title: string; company: any; subtitle?: string; lines: string[];
  footer?: string; signature?: string;
  table?: { headers: string[]; widths: number[]; rows: string[][] };
  afterTable?: string[];
}) {
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);
  doc.setTitle(title);
  doc.setAuthor(company?.name || "Rohit's ERP");
  const clean = (value: unknown) => String(value ?? '').replace(/₹/g, 'INR ')
    .replace(/[–—]/g, '-').replace(/[‘’]/g, "'").replace(/[“”]/g, '"')
    .replace(/[^\x20-\x7e\xa0-\xff\n]/g, ' ');
  const wrapped = (value: unknown, width: number, size = 10) => {
    const result: string[] = [];
    for (const paragraph of clean(value).split('\n')) {
      let line = '';
      for (const word of paragraph.split(/\s+/).filter(Boolean)) {
        if (line && font.widthOfTextAtSize(line + ' ' + word, size) > width) {
          result.push(line); line = '';
        }
        for (const char of (line ? ' ' : '') + word) {
          if (font.widthOfTextAtSize(line + char, size) > width) {
            result.push(line); line = '';
          }
          line += char;
        }
      }
      result.push(line);
    }
    return result;
  };
  const embed = async (value: string | undefined) => {
    if (!value) return undefined;
    if (value.startsWith('data:image/png;base64,')) return doc.embedPng(value);
    if (value.startsWith('data:image/jpeg;base64,')) return doc.embedJpg(value);
    throw new Error('Company branding must be a valid PNG or JPEG image.');
  };
  const logo = await embed(company?.logoDataUrl);
  const header = await embed(company?.headerDataUrl);
  const sign = await embed(company?.signatureDataUrl);
  let page = doc.addPage([595, 842]);
  let y = 800;
  const draw = (value: string, x: number, at: number, size = 10, strong = false) =>
    page.drawText(clean(value), { x, y: at, size, font: strong ? bold : font, color: rgb(.12, .17, .23) });
  const newPage = () => {
    page = doc.addPage([595, 842]); y = 800;
    draw((title + ' | ' + (subtitle || '')).slice(0, 95), 48, y, 10, true); y -= 28;
  };
  const text = (value: unknown, size = 10, width = 499, x = 48, strong = false) => {
    for (const part of wrapped(value, width, size)) {
      if (y < 80) newPage();
      draw(part, x, y, size, strong); y -= size + 5;
    }
  };
  if (header) {
    const dims = header.scaleToFit(499, 70);
    page.drawImage(header, { x: 48, y: y - dims.height, ...dims });
    y -= dims.height + 18;
  }
  const identityTop = y;
  if (logo) {
    const dims = logo.scaleToFit(76, 64);
    page.drawImage(logo, { x: 48, y: y - dims.height + 12, ...dims });
  }
  const identityX = logo ? 140 : 48;
  text(company?.name || company?.tradeName || "Rohit's ERP", 16, 547 - identityX, identityX, true);
  if (company?.tradeName && company.tradeName !== company.name)
    text(company.tradeName, 10, 547 - identityX, identityX);
  if (company?.address) text(company.address, 10, 547 - identityX, identityX);
  y = Math.min(y, identityTop - (logo ? 72 : 0));
  text([
    company?.gstin && 'GSTIN: ' + company.gstin, company?.pan && 'PAN: ' + company.pan,
    company?.iec && 'IEC: ' + company.iec, company?.email, company?.phone,
  ].filter(Boolean).join(' | '), 9);
  y -= 8;
  page.drawLine({ start: { x: 48, y }, end: { x: 547, y }, thickness: 1, color: rgb(.75, .8, .85) });
  y -= 28;
  text(title, 16, 499, 48, true);
  if (subtitle) text(subtitle);
  y -= 12;
  for (const line of lines) text(line);
  if (table?.rows.length) {
    if (table.headers.length !== table.widths.length || table.widths.some(w => w < 20) ||
        Math.abs(table.widths.reduce((a, b) => a + b, 0) - 499) > .01)
      throw new Error('Invalid document table layout.');
    const border = rgb(.72, .76, .79);
    const headerRow = () => {
      if (y < 120) newPage();
      let x = 48;
      const cells = table.headers.map((h, i) => wrapped(h, table.widths[i] - 10, 8));
      const height = Math.max(...cells.map(c => c.length)) * 12 + 10;
      cells.forEach((cell, i) => {
        page.drawRectangle({ x, y: y - height, width: table.widths[i], height, color: rgb(.94, .96, .97), borderColor: border, borderWidth: .5 });
        cell.forEach((v, j) => draw(v, x + 5, y - 13 - j * 12, 8, true));
        x += table.widths[i];
      });
      y -= height;
    };
    headerRow();
    for (const row of table.rows) {
      const cells = table.headers.map((_, i) => wrapped(row[i] ?? '', table.widths[i] - 10, 8));
      const count = Math.max(...cells.map(c => c.length));
      let offset = 0;
      while (offset < count) {
        if (y < 110) { newPage(); headerRow(); }
        const take = Math.min(count - offset, Math.max(1, Math.floor((y - 85) / 12)));
        const height = take * 12 + 10;
        let x = 48;
        cells.forEach((cell, i) => {
          page.drawRectangle({ x, y: y - height, width: table.widths[i], height, borderColor: border, borderWidth: .5 });
          cell.slice(offset, offset + take).forEach((v, j) => draw(v, x + 5, y - 13 - j * 12, 8));
          x += table.widths[i];
        });
        y -= height;
        offset += take;
        if (offset < count) { newPage(); headerRow(); }
      }
    }
    y -= 18;
  }
  for (const line of afterTable || []) text(line);
  if (y < 185) newPage();
  y -= 24;
  if (sign) {
    const dims = sign.scaleToFit(150, 55);
    page.drawImage(sign, { x: 380, y: y - dims.height, ...dims });
    y -= dims.height + 12;
  }
  page.drawLine({ start: { x: 365, y }, end: { x: 547, y }, thickness: .5 });
  y -= 16;
  text(signature || company?.authorizedSignatory || 'Authorised signatory', 10, 182, 365);
  y -= 12;
  if (footer || company?.footerText) text(footer || company.footerText, 9);
  const pages = doc.getPages();
  pages.forEach((p, i) => p.drawText('Page ' + (i + 1) + ' of ' + pages.length, { x: 475, y: 35, size: 8, font }));
  return doc.save();
}
