import { masterCategories } from './masters';
import { inactive } from './relationships';
export const activeMaster = (r: any) => !inactive(r) && !['Inactive', 'Archived', 'Disabled'].includes(r.status) && r.active !== false;

/** Advisory setup checks, restricted to the settings visible to this role. */
export function masterReadiness(records: any[], role: string) {
  const required = ['company-information', 'products', 'customers', 'currency', 'units', 'bank-details'];
  return masterCategories.flatMap(c => c.items)
    .filter(item => required.includes(item.key) && item.roles.includes(role))
    .map(item => {
      const active = records.filter(r => r.kind === item.route && activeMaster(r));
      let missing: string[] = active.length ? [] : ['Add an active record'];
      if (item.key === 'company-information' && active.length) {
        const fields = [['name', 'Legal name'], ['address', 'Address'], ['email', 'Email'],
          ['logoDataUrl', 'Logo'], ['signatureDataUrl', 'Signature'], ['authorizedSignatory', 'Signatory name']];
        // A single company profile must be complete; do not combine fields across companies.
        missing = active.map(r => fields.filter(([key]) => !String(r[key] || '').trim()).map(([, label]) => label))
          .sort((a, b) => a.length - b.length)[0];
      }
      return { ...item, count: active.length, missing, ready: missing.length === 0 };
    });
}
