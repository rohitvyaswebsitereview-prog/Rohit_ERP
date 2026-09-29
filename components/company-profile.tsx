import { opMap } from '@/lib/operations';

export function CompanyProfile({ record, tab }: { record: any; tab: string }) {
  const fields = opMap['master-company-information'].fields;
  const sections = tab === 'Branding' ? ['Branding'] : tab === 'Document Defaults' ? ['Document Defaults'] :
    ['Legal Identity', 'Statutory IDs', 'Contact', 'Addresses'];
  return <div className="company-profile">
    {sections.map(section => <section key={section}>
      <h3>{section}</h3>
      <div className={section === 'Branding' ? 'company-branding-grid' : 'shipzy-form-grid'}>
        {fields.filter(f => f.section === section).map(field => {
          const value = record[field.key];
          if (field.type === 'dataurl') {
            const valid = typeof value === 'string' && /^data:image\/(png|jpeg);base64,[A-Za-z0-9+/=]+$/.test(value);
            return <figure key={field.key}>
              <figcaption>{field.label}</figcaption>
              <div className="company-branding-preview">{valid ? <img src={value} alt={field.label} /> : <span>{value ? 'Image unavailable. Edit the company to replace it.' : 'No image uploaded'}</span>}</div>
              <small>{field.key === 'signatureDataUrl' ? 'Printed with the authorised signatory on generated PDFs.' : field.key === 'headerDataUrl' ? 'Printed above company details on generated PDFs.' : 'Used in the company identity on generated PDFs.'}</small>
            </figure>;
          }
          return <label key={field.key}>{field.label}<div>{value === undefined || value === null || value === '' ? 'Not provided' : String(value)}</div></label>;
        })}
      </div>
    </section>)}
  </div>;
}
