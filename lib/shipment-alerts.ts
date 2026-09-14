import { entityLabel, inactive } from './relationships';
export function shipmentAlerts(records: any[], fy: string, today: string) {
  return records.filter(r => r.fy === fy && ['shipments', 'bills-of-lading'].includes(r.kind) &&
    !inactive(r) && !['Delivered', 'Completed', 'Closed'].includes(r.status) && !r.deliveredDate)
    .flatMap(r => [
      {key:'etd',actual:r.departureDate,label:'Departure',date:r.etd},
      {key:'eta',actual:r.arrivalDate,label:'Arrival',date:r.eta},
    ].filter(m => !m.actual && m.date && m.date < today).map(m => ({
      id:m.key+'-'+r.id, severity:'Attention',
      title:entityLabel(r)+' '+m.label.toLowerCase()+' needs confirmation',
      detail:`Expected ${m.date} · ${r.trackingSource || 'Source not recorded'}`,
      route:r.kind+'?record='+encodeURIComponent(r.id)+'&tab=Shipment%20Details',
    })));
}
