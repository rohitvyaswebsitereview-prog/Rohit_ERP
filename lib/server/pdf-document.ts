const enc = new TextEncoder();

const pdfEscape = (s: string) =>
  String(s ?? '')
    .replaceAll('\\', '\\\\')
    .replaceAll('(', '\\(')
    .replaceAll(')', '\\)')
    .replace(/[^\x20-\x7e]/g, ' ');

const wrap = (text: string, width = 86) => {
  const words = String(text || '').split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let line = '';
  for (const word of words) {
    if ((line + ' ' + word).trim().length > width) {
      if (line) lines.push(line);
      line = word;
    } else line = (line + ' ' + word).trim();
  }
  if (line) lines.push(line);
  return lines.length ? lines : [''];
};

function object(id: number, body: string) {
  return `${id} 0 obj\n${body}\nendobj\n`;
}

export function pdfDocument({
  title,
  company,
  subtitle,
  lines,
  footer,
  signature,
}: {
  title: string;
  company: any;
  subtitle?: string;
  lines: string[];
  footer?: string;
  signature?: string;
}) {
  const stream: string[] = [];
  let y = 805;
  const text = (value: string, x = 48, size = 10, leading = 15) => {
    if (y < 70) return;
    stream.push(`BT /F1 ${size} Tf ${x} ${y} Td (${pdfEscape(value)}) Tj ET`);
    y -= leading;
  };
  text(company?.name || company?.tradeName || "Rohit's ERP", 48, 18, 22);
  if (company?.tradeName && company.tradeName !== company.name)
    text(company.tradeName, 48, 10, 15);
  if (company?.address) for (const l of wrap(company.address, 80)) text(l);
  const ids = [
    company?.gstin && `GSTIN: ${company.gstin}`,
    company?.pan && `PAN: ${company.pan}`,
    company?.iec && `IEC: ${company.iec}`,
    company?.email && `Email: ${company.email}`,
    company?.phone && `Phone: ${company.phone}`,
  ].filter(Boolean);
  if (ids.length) text(ids.join('  |  '), 48, 9, 20);
  stream.push('0.75 w 48 735 m 547 735 l S');
  y = 713;
  text(title, 48, 16, 20);
  if (subtitle) text(subtitle, 48, 10, 18);
  y -= 8;
  for (const line of lines) {
    for (const part of wrap(line)) text(part);
  }
  y = Math.min(y - 10, 140);
  stream.push('0.5 w 360 118 m 530 118 l S');
  text(signature || company?.authorizedSignatory || 'Authorised signatory', 365, 10, 14);
  if (footer || company?.footerText) text(footer || company.footerText, 48, 8, 12);
  const content = stream.join('\n');
  const objects = [
    object(1, '<< /Type /Catalog /Pages 2 0 R >>'),
    object(2, '<< /Type /Pages /Kids [3 0 R] /Count 1 >>'),
    object(
      3,
      '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 5 0 R >> >> /Contents 4 0 R >>',
    ),
    object(4, `<< /Length ${enc.encode(content).length} >>\nstream\n${content}\nendstream`),
    object(5, '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>'),
  ];
  let pdf = '%PDF-1.4\n';
  const offsets = [0];
  for (const item of objects) {
    offsets.push(enc.encode(pdf).length);
    pdf += item;
  }
  const xrefAt = enc.encode(pdf).length;
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  for (let i = 1; i < offsets.length; i++)
    pdf += `${String(offsets[i]).padStart(10, '0')} 00000 n \n`;
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefAt}\n%%EOF`;
  return enc.encode(pdf);
}
