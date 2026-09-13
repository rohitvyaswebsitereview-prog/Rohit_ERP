export function filterDocuments(documents: any[], query: string, category: string, photos: boolean, latest: boolean) {
  const versions = new Map<string, number>();
  for (const d of documents) {
    const key = d.entityId + ':' + d.category;
    versions.set(key, Math.max(versions.get(key) || 0, Number(d.documentVersion) || 0));
  }
  return documents.filter(d => (!category || d.category === category) &&
    (!photos || ['image/png', 'image/jpeg'].includes(d.mime)) &&
    (!latest || Number(d.documentVersion) === versions.get(d.entityId + ':' + d.category)) &&
    [d.filename, d.category, d.tags, d.uploadedBy].join(' ').toLowerCase().includes(query.trim().toLowerCase()))
    .sort((a, b) => String(b.created || '').localeCompare(String(a.created || '')) || Number(b.documentVersion) - Number(a.documentVersion));
}
