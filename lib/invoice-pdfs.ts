export const invoicePdfTypes = ['Commercial invoice', 'Customs invoice'] as const;
/** Customer invoice is the earlier label for the commercial-invoice snapshot. */
export function invoicePdfVersions(files: any[], entityId: string, type: string) {
  const categories = type === 'Commercial invoice' ? ['commercial invoice', 'customer invoice'] : [type.toLowerCase()];
  return files.filter(d => d.entityId === entityId && d.mime === 'application/pdf' &&
    categories.includes(String(d.category || '').trim().toLowerCase()))
    .sort((a, b) => String(b.created || '').localeCompare(String(a.created || '')) ||
      Number(b.documentVersion || 1) - Number(a.documentVersion || 1) || String(b.id).localeCompare(String(a.id)));
}
