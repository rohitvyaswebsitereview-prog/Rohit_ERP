export interface MasterItem {
  key: string;
  label: string;
  icon: string;
  keywords: string[];
  roles: string[];
  route: string;
  implemented: boolean;
}
export interface MasterCategory {
  key: string;
  label: string;
  description: string;
  icon: string;
  items: MasterItem[];
}
const all = ['Admin', 'Viewer', 'Finance', 'Logistics'];
const finance = ['Admin', 'Viewer', 'Finance'];
const operations = ['Admin', 'Viewer', 'Logistics'];
function item(
  key: string,
  label: string,
  icon: string,
  keywords: string[] = [],
  roles = all,
  route = 'master-' + key,
): MasterItem {
  return {
    key,
    label,
    icon,
    keywords,
    roles,
    route,
    implemented: ['products', 'customers', 'vendors'].includes(route),
  };
}
export const masterCategories: MasterCategory[] = [
  {
    key: 'organisation',
    label: 'Organisation',
    description: 'Company details and registered addresses',
    icon: 'Building2',
    items: [
      item(
        'company-information',
        'Company Information',
        'Building2',
        [],
        finance,
      ),
      item('company-addresses', 'Company Addresses', 'MapPin', [], finance),
    ],
  },
  {
    key: 'products-packaging',
    label: 'Products & Packaging',
    description: 'Products, units and packaging configuration',
    icon: 'Boxes',
    items: [
      item('products', 'Products', 'Package', [], operations, 'products'),
      item('units', 'Units', 'Ruler', [], operations),
      item('packages', 'Packages', 'Box', ['package'], operations),
      item('package-types', 'Package Types', 'Shapes', ['package'], operations),
      item(
        'packaging-materials',
        'Packaging Materials',
        'Layers',
        ['package'],
        operations,
      ),
      item(
        'quality-specifications',
        'Quality Specifications',
        'BadgeCheck',
        [],
        operations,
      ),
      item('bom', 'BOM', 'ListTree', ['bill of materials'], operations),
    ],
  },
  {
    key: 'business-partners',
    label: 'Business Partners',
    description: 'Customers, vendors and delivery locations',
    icon: 'Handshake',
    items: [
      item('customers', 'Customers', 'Users', ['customer'], all, 'customers'),
      item('vendors', 'Vendors', 'Store', ['supplier'], finance, 'vendors'),
      item(
        'delivery-addresses',
        'Delivery Addresses',
        'MapPin',
        ['customer', 'delivery'],
        all,
      ),
    ],
  },
  {
    key: 'trade-commercial',
    label: 'Trade & Commercial',
    description: 'Ports, terms, currencies and banking',
    icon: 'Globe',
    items: [
      item('ports', 'Ports', 'Anchor'),
      item('payment-terms', 'Payment Terms', 'CalendarDays', [], finance),
      item('shipment-terms', 'Shipment Terms', 'Ship', ['shipping']),
      item('currency', 'Currency', 'Coins', [], finance),
      item('bank-details', 'Bank Details', 'Landmark', ['bank'], finance),
    ],
  },
  {
    key: 'trade-licences',
    label: 'Trade Licences',
    description: 'Licences and letters of credit',
    icon: 'FileCheck2',
    items: [
      item(
        'advance-licence',
        'Advance Licence',
        'FileCheck2',
        ['license'],
        finance,
      ),
      item('epcg-licence', 'EPCG Licence', 'FileBadge', ['license'], finance),
      item('lc-master', 'LC Master', 'FileText', ['letter of credit'], finance),
    ],
  },
  {
    key: 'logistics',
    label: 'Logistics',
    description: 'Shipping lines and logistics charges',
    icon: 'Truck',
    items: [
      item('shipping-lines', 'Shipping Lines', 'Ship', ['shipping']),
      item('shipping-line-charges', 'Shipping Line Charges', 'Receipt', [
        'shipping',
      ]),
      item('destination-charges', 'Destination Charges', 'MapPinned'),
      item('additional-charges', 'Additional Charges', 'CirclePlus'),
    ],
  },
  {
    key: 'documents-communication',
    label: 'Documents & Communication',
    description: 'Templates for documents and email',
    icon: 'Files',
    items: [
      item('document-templates', 'Document Templates', 'FileText'),
      item('email-templates', 'Email Templates', 'Mail'),
    ],
  },
  {
    key: 'operations',
    label: 'Operations',
    description: 'Expense classification and order statuses',
    icon: 'SlidersHorizontal',
    items: [
      item('expense-types', 'Expense Types', 'Receipt', [], finance),
      item('order-status', 'Order Status', 'ListChecks'),
    ],
  },
];
export function permittedMasters(role: string) {
  return masterCategories
    .map((c) => ({
      ...c,
      items: c.items.filter((i) => i.roles.includes(role)),
    }))
    .filter((c) => c.items.length);
}
export function searchMasters(categories: MasterCategory[], query: string) {
  const tokens = query.trim().toLowerCase().split(/\s+/).filter(Boolean);
  return categories
    .map((c) => ({
      ...c,
      items: c.items.filter((i) =>
        tokens.every((t) =>
          [i.label, ...i.keywords].join(' ').toLowerCase().includes(t),
        ),
      ),
    }))
    .filter((c) => c.items.length);
}
export const masterItems = masterCategories.flatMap((c) => c.items);
