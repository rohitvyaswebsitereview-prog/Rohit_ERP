export function ShipmentTimeline({ record }: { record: any }) {
  const today = new Date().toISOString().slice(0, 10);
  const milestones = [
    {label:'Departure',expected:record.etd,actual:record.departureDate},
    {label:'Arrival',expected:record.eta,actual:record.arrivalDate},
    {label:'Delivery',expected:'',actual:record.deliveredDate},
  ];
  const stale = !record.trackingUpdatedDate || (Date.parse(today)-Date.parse(record.trackingUpdatedDate))/86400000 > 7;
  return <section className="shipzy-panel shipment-timeline" aria-label="Shipment milestones">
    <header><h2>Shipment milestones</h2><span>{record.container || 'Container not recorded'}</span></header>
    <p>{record.originPort || 'Loading port not recorded'} → {record.destinationPort || 'Discharge port not recorded'}</p>
    <p>Current location: {record.location || 'Not recorded'} · Vessel: {record.vessel || 'Not recorded'} {record.voyage || ''}</p>
    <ol>{milestones.map(m => <li key={m.label} className={m.actual ? 'complete' : m.expected && m.expected < today ? 'overdue' : ''}>
      <strong>{m.label}</strong><span>{m.actual ? 'Actual: ' + m.actual : m.expected ? 'Expected: ' + m.expected : 'Date not recorded'}</span>
      {m.actual && m.expected && <small>Expected: {m.expected}</small>}
      {!m.actual && m.expected && m.expected < today && <small>Expected date passed — confirm actual milestone</small>}
    </li>)}</ol>
    <p>Source: {record.trackingSource || 'Not recorded'} · Last checked: {record.trackingUpdatedDate || 'Not recorded'}</p>
    {stale && <p className="shipment-stale" role="status">Tracking update needed. These are saved records, not live carrier positions.</p>}
  </section>;
}
