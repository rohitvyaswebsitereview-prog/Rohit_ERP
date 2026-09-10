import { masterItems } from './masters';
import { moneyMinor } from './domain';
export type OpField = {
  key: string;
  label: string;
  type?: string;
  required?: boolean;
  source?: string;
  options?: string[];
  section?: string;
  columns?: { key: string; label: string; type?: string }[];
};
export type OpModule = {
  key: string;
  label: string;
  group: string;
  master?: boolean;
  fields: OpField[];
  lines?: boolean;
  partner?: string;
  roles: string[];
  transitions: Record<string, string[]>;
  convert?: string[];
  documents: string[];
  posting?: string;
};
const all = ['Admin', 'Finance', 'Logistics', 'Viewer'],
  financial = ['Admin', 'Finance', 'Viewer'];
const f = (
  key: string,
  label: string,
  type = 'text',
  required = false,
  source?: string,
  section = 'Basic',
): OpField => ({ key, label, type, required, source, section });
const ref = (
  key: string,
  label: string,
  source: string,
  required = false,
  section = 'Basic',
) => f(key, label, 'reference', required, source, section);
const masterFields: Record<string, OpField[]> = {
  'company-information': [
    f('name', 'Legal company name', 'text', true),
    f('tradeName', 'Trading name'),
    f('gstin', 'GSTIN'),
    f('pan', 'PAN'),
    f('iec', 'IEC'),
    f('email', 'Email', 'email'),
    f('phone', 'Phone'),
    f('website', 'Website', 'url'),
    f('address', 'Registered address', 'textarea'),
    f('country', 'Country'),
  ],
  'company-addresses': [
    f('name', 'Address label', 'text', true),
    f('address', 'Street address', 'textarea', true),
    f('city', 'City'),
    f('state', 'State'),
    f('postalCode', 'Postal code'),
    f('country', 'Country', 'text', true),
    f('gstin', 'GSTIN'),
  ],
  units: [
    f('name', 'Unit name', 'text', true),
    f('code', 'Unit code', 'text', true),
  ],
  packages: [
    f('name', 'Package name', 'text', true),
    ref('typeId', 'Package type', 'master-package-types'),
    f('length', 'Length (cm)', 'number'),
    f('width', 'Width (cm)', 'number'),
    f('height', 'Height (cm)', 'number'),
    f('tareWeight', 'Tare weight (kg)', 'number'),
  ],
  'package-types': [
    f('name', 'Package type', 'text', true),
    f('description', 'Description', 'textarea'),
  ],
  'packaging-materials': [
    f('name', 'Material name', 'text', true),
    ref('unitId', 'Unit', 'master-units'),
    f('specification', 'Specification', 'textarea'),
  ],
  'quality-specifications': [
    f('name', 'Specification name', 'text', true),
    f('standard', 'Standard'),
    f('criteria', 'Acceptance criteria', 'textarea', true),
  ],
  bom: [
    f('name', 'BOM name', 'text', true),
    ref('productId', 'Finished product', 'products', true),
    f('revision', 'Revision', 'text', true),
    f('components', 'Components and quantities', 'textarea', true),
  ],
  'delivery-addresses': [
    f('name', 'Location name', 'text', true),
    ref('customerId', 'Customer', 'customers', true),
    f('address', 'Delivery address', 'textarea', true),
    f('country', 'Country'),
    f('contact', 'Contact'),
    f('phone', 'Phone'),
  ],
  ports: [
    f('name', 'Port name', 'text', true),
    f('code', 'Port code', 'text', true),
    f('country', 'Country', 'text', true),
  ],
  'payment-terms': [
    f('name', 'Term name', 'text', true),
    f('days', 'Credit days', 'number', true),
    f('advancePercent', 'Advance percentage', 'number'),
    f('description', 'Terms', 'textarea'),
  ],
  'shipment-terms': [
    f('name', 'Term name', 'text', true),
    f('code', 'Incoterm code', 'text', true),
    f('description', 'Responsibilities', 'textarea'),
  ],
  currency: [
    f('name', 'Currency name', 'text', true),
    f('code', 'ISO currency code', 'text', true),
    f('words', 'Amount-in-words label', 'text', true),
  ],
  'bank-details': [
    f('name', 'Bank name', 'text', true),
    f('accountName', 'Account holder', 'text', true),
    f('accountNumber', 'Account number', 'text', true),
    f('ifsc', 'IFSC'),
    f('swift', 'SWIFT'),
    f('branch', 'Branch'),
    ref('currencyId', 'Currency', 'master-currency'),
  ],
  'advance-licence': [
    f('name', 'Licence number', 'text', true),
    f('issueDate', 'Issue date', 'date', true),
    f('expiryDate', 'Expiry date', 'date', true),
    f('authorisation', 'Authorisation details', 'textarea'),
    f('obligation', 'Export obligation', 'number'),
  ],
  'epcg-licence': [
    f('name', 'Licence number', 'text', true),
    f('issueDate', 'Issue date', 'date', true),
    f('expiryDate', 'Expiry date', 'date', true),
    f('obligation', 'Export obligation', 'number'),
    f('equipment', 'Equipment covered', 'textarea'),
  ],
  'lc-master': [
    f('name', 'LC number', 'text', true),
    ref('customerId', 'Customer', 'customers'),
    ref('bankId', 'Bank', 'master-bank-details'),
    f('expiryDate', 'Expiry date', 'date', true),
    f('amount', 'LC value', 'number', true),
    f('conditions', 'Conditions', 'textarea'),
  ],
  'shipping-lines': [
    f('name', 'Shipping line', 'text', true),
    f('code', 'Carrier code'),
    f('email', 'Email', 'email'),
    f('phone', 'Phone'),
  ],
  'shipping-line-charges': [
    f('name', 'Charge name', 'text', true),
    ref('shippingLineId', 'Shipping line', 'master-shipping-lines', true),
    f('amount', 'Default amount', 'number'),
    ref('currencyId', 'Currency', 'master-currency'),
  ],
  'destination-charges': [
    f('name', 'Charge name', 'text', true),
    ref('portId', 'Destination port', 'master-ports'),
    f('amount', 'Default amount', 'number'),
  ],
  'additional-charges': [
    f('name', 'Charge name', 'text', true),
    f('amount', 'Default amount', 'number'),
  ],
  'document-templates': [
    f('name', 'Template name', 'text', true),
    f('documentType', 'Document type', 'text', true),
    f('language', 'Language'),
    f('country', 'Country'),
    f(
      'body',
      'Template text (use {{reference}}, {{date}}, {{company}}, {{total}})',
      'textarea',
      true,
    ),
  ],
  'email-templates': [
    f('name', 'Template name', 'text', true),
    f('subject', 'Subject', 'text', true),
    f('body', 'Message template', 'textarea', true),
  ],
  'expense-types': [
    f('name', 'Expense type', 'text', true),
    f('description', 'Description', 'textarea'),
  ],
  'order-status': [
    f('name', 'Status name', 'text', true),
    f('sequence', 'Sequence', 'number'),
    f('description', 'Description', 'textarea'),
  ],
};
const masterStates = {
  Active: ['Inactive', 'Blocked'],
  Inactive: ['Active'],
  Blocked: ['Active'],
};
export const operationModules: OpModule[] = masterItems
  .filter((i) => i.route.startsWith('master-'))
  .map((i) => ({
    key: i.route,
    label: i.label,
    group: 'Masters',
    master: true,
    fields: masterFields[i.key] || [f('name', 'Name', 'text', true)],
    roles: i.roles,
    transitions: masterStates,
    documents: [],
  }));
const partyFields: OpField[] = [
  f('name', 'Name', 'text', true),
  f('email', 'Email', 'email'),
  f('country', 'Country', 'text', true),
  f('phone', 'Phone'),
  f('address', 'Address', 'textarea'),
  f('gstin', 'GSTIN', 'text', false, undefined, 'Tax registrations'),
  f('pan', 'PAN', 'text', false, undefined, 'Tax registrations'),
  {
    key: 'taxRegistrations',
    label: 'Tax registrations',
    type: 'rows',
    section: 'Tax registrations',
    columns: [
      { key: 'country', label: 'Country' },
      { key: 'type', label: 'Tax type' },
      { key: 'number', label: 'Registration number' },
      { key: 'address', label: 'Registered address' },
    ],
  },
  {
    key: 'contacts',
    label: 'Contacts',
    type: 'rows',
    section: 'Contacts',
    columns: [
      { key: 'name', label: 'Name' },
      { key: 'role', label: 'Role' },
      { key: 'email', label: 'Email', type: 'email' },
      { key: 'phone', label: 'Phone' },
    ],
  },
  {
    key: 'bankAccounts',
    label: 'Bank accounts',
    type: 'rows',
    section: 'Bank accounts',
    columns: [
      { key: 'bank', label: 'Bank' },
      { key: 'holder', label: 'Account holder' },
      { key: 'number', label: 'Account number' },
      { key: 'code', label: 'IFSC / SWIFT' },
    ],
  },
  f('bankName', 'Primary bank', 'text', false, undefined, 'Bank accounts'),
  f(
    'accountNumber',
    'Account number',
    'text',
    false,
    undefined,
    'Bank accounts',
  ),
  f('ifsc', 'IFSC / SWIFT', 'text', false, undefined, 'Bank accounts'),
  f('creditLimit', 'Credit limit', 'number', false, undefined, 'Credit & risk'),
  f('riskNotes', 'Risk review', 'textarea', false, undefined, 'Credit & risk'),
];
for (const [key, label] of [
  ['customers', 'Customers'],
  ['vendors', 'Vendors'],
  ['products', 'Equipment Catalog'],
  ['warehouses', 'Warehouses'],
])
  operationModules.push({
    key,
    label,
    group: 'Masters',
    master: true,
    roles: key === 'vendors' ? financial : all,
    fields:
      key === 'products'
        ? [
            f('name', 'Product / model name', 'text', true),
            f('sku', 'SKU', 'text', true),
            ref('unitId', 'Unit', 'master-units'),
            f('brand', 'Brand'),
            f('hsn', 'HSN'),
            f('specification', 'Technical specifications', 'textarea'),
            f('defaultRate', 'Default selling price', 'number'),
            f('gstRate', 'Default GST percentage', 'number'),
            f('weight', 'Weight (kg)', 'number'),
            f('dimensions', 'Dimensions'),
            f('reorderPoint', 'Reorder point', 'number'),
          ]
        : key === 'warehouses'
          ? [
              f('name', 'Warehouse name', 'text', true),
              f('address', 'Address', 'textarea'),
            ]
          : partyFields,
    transitions: masterStates,
    documents: ['Registration', 'Bank proof'],
  });
const states = {
  Draft: ['Confirmed', 'Cancelled'],
  Confirmed: ['Completed', 'Cancelled'],
  Completed: [],
  Cancelled: [],
};
const transactionFields = [
  f('reference', 'Reference', 'text', true),
  f('date', 'Document date', 'date', true),
  f('dueDate', 'Due date', 'date'),
  ref('currencyId', 'Currency', 'master-currency', true, 'Commercials'),
  ref(
    'paymentTermsId',
    'Payment terms',
    'master-payment-terms',
    false,
    'Commercials',
  ),
  ref(
    'shipmentTermsId',
    'Shipment terms',
    'master-shipment-terms',
    false,
    'Delivery & logistics',
  ),
  ref('portId', 'Port', 'master-ports', false, 'Delivery & logistics'),
  f('notes', 'Notes', 'textarea', false, undefined, 'Commercials'),
];
function add(
  key: string,
  label: string,
  group: string,
  opts: Partial<OpModule> = {},
  extra: OpField[] = [],
) {
  operationModules.push({
    key,
    label,
    group,
    roles: financial,
    fields: [...transactionFields, ...extra],
    transitions: states,
    documents: [],
    ...opts,
  });
}
const partner = (source: string) =>
  ref(
    'partnerId',
    source === 'vendors' ? 'Supplier' : 'Customer',
    source,
    true,
  );
add(
  'purchase-orders',
  'Purchase Orders',
  'Purchase',
  {
    lines: true,
    partner: 'vendors',
    convert: ['purchase-invoices'],
    transitions: {
      Draft: ['Issued', 'Cancelled'],
      Issued: ['Accepted', 'Rejected', 'Cancelled'],
      Accepted: ['Closed', 'Cancelled'],
      Closed: ['Accepted'],
      Rejected: [],
      Cancelled: [],
    },
    documents: ['Supplier quotation', 'Purchase order'],
  },
  [partner('vendors'), f('deliveryDate', 'Required delivery date', 'date')],
);
add(
  'supplier-advances',
  'Supplier Advances',
  'Purchase',
  {
    partner: 'vendors',
    posting: 'supplier-advance',
    documents: ['Payment proof'],
  },
  [
    partner('vendors'),
    ref('sourceId', 'Purchase order', 'purchase-orders'),
    f('amount', 'Advance amount', 'number', true),
    f('bankReference', 'Bank reference', 'text', true),
  ],
);
add(
  'purchase-invoices',
  'Purchase Invoices',
  'Purchase',
  {
    lines: true,
    partner: 'vendors',
    posting: 'purchase',
    convert: ['delivery-challans'],
    documents: ['Purchase invoice', 'Inspection report'],
  },
  [
    partner('vendors'),
    ref('sourceId', 'Purchase order', 'purchase-orders'),
    ref('warehouseId', 'Receiving warehouse', 'warehouses', true),
  ],
);
add(
  'purchase-returns',
  'Purchase Returns',
  'Purchase',
  { lines: true, partner: 'vendors', documents: ['Debit note'] },
  [
    partner('vendors'),
    ref('sourceId', 'Purchase invoice', 'purchase-invoices', true),
    f('reason', 'Return reason', 'textarea', true),
  ],
);
add(
  'expenses',
  'Expenses',
  'Purchase',
  {
    lines: true,
    partner: 'vendors',
    posting: 'expense',
    documents: ['Expense invoice', 'Payment proof'],
  },
  [
    partner('vendors'),
    ref('expenseTypeId', 'Expense type', 'master-expense-types', true),
    ref('allocationId', 'Allocate to commercial invoice', 'invoices'),
    f('rcm', 'Reverse charge treatment'),
    f('paymentReference', 'Payment reference'),
  ],
);
add(
  'quotations',
  'Quotations',
  'Sales',
  {
    lines: true,
    partner: 'customers',
    convert: ['proformas'],
    transitions: {
      Draft: ['Sent', 'Cancelled'],
      Sent: ['Accepted', 'Rejected', 'Cancelled'],
      Accepted: [],
      Rejected: [],
      Cancelled: [],
    },
    documents: ['Quotation'],
  },
  [partner('customers'), f('validUntil', 'Valid until', 'date')],
);
add(
  'proformas',
  'Proforma Invoices',
  'Sales',
  {
    lines: true,
    partner: 'customers',
    convert: ['invoices'],
    documents: ['Proforma invoice'],
  },
  [
    partner('customers'),
    ref('sourceId', 'Quotation', 'quotations'),
    f('advanceRequired', 'Advance required', 'number'),
  ],
);
add(
  'invoices',
  'Commercial Invoices',
  'Sales',
  {
    lines: true,
    partner: 'customers',
    posting: 'sale',
    convert: ['shipping-bills', 'delivery-challans'],
    documents: ['Commercial invoice', 'Packing list', 'Certificate of origin'],
  },
  [
    partner('customers'),
    ref('sourceId', 'Proforma', 'proformas'),
    f('consignee', 'Consignee', 'textarea'),
    f('notifyParty', 'Notify party', 'textarea'),
    f('gstRoute', 'GST route'),
    f('realisationDue', 'Realisation deadline', 'date'),
  ],
);
add(
  'domestic-invoices',
  'Domestic Sales',
  'Sales',
  {
    lines: true,
    partner: 'customers',
    posting: 'sale',
    convert: ['delivery-challans'],
    documents: ['Domestic invoice', 'E-way bill'],
  },
  [
    partner('customers'),
    f('placeOfSupply', 'Place of supply', 'text', true),
    f('customerGstin', 'Customer GSTIN'),
  ],
);
add(
  'customer-advances',
  'Customer Advances',
  'Sales',
  {
    partner: 'customers',
    posting: 'customer-advance',
    documents: ['Bank advice'],
  },
  [
    partner('customers'),
    ref('sourceId', 'Proforma invoice', 'proformas'),
    f('amount', 'Advance amount', 'number', true),
    f('bankReference', 'Bank reference', 'text', true),
  ],
);
add(
  'receipts',
  'Receipts',
  'Finance',
  {
    partner: 'customers',
    posting: 'receipt',
    documents: ['Bank advice', 'FIRC / eFIRC'],
  },
  [
    partner('customers'),
    ref('invoiceId', 'Invoice to settle', 'sales-invoice', true),
    f('amount', 'Received amount (invoice currency)', 'number', true),
    f('bankReference', 'Bank reference', 'text', true),
    f('exchangeRate', 'Exchange rate to INR', 'number'),
  ],
);
add(
  'payments',
  'Payments',
  'Finance',
  { partner: 'vendors', posting: 'payment', documents: ['Payment proof'] },
  [
    partner('vendors'),
    ref('invoiceId', 'Purchase invoice / expense', 'purchase-payable', true),
    f('amount', 'Paid amount (invoice currency)', 'number', true),
    f('bankReference', 'Bank reference', 'text', true),
  ],
);
add(
  'shipping-bills',
  'Shipping Bills',
  'Logistics',
  {
    roles: all,
    convert: ['bills-of-lading'],
    documents: ['Assessed copy', 'LEO copy', 'EGM'],
    transitions: {
      Draft: ['Assessed', 'Cancelled'],
      Assessed: ['LEO', 'Customs Cancelled'],
      LEO: ['EGM'],
      EGM: [],
      Cancelled: [],
      'Customs Cancelled': [],
    },
  },
  [
    ref('sourceId', 'Commercial invoice', 'invoices', true),
    f('assessedDate', 'Assessed date', 'date'),
    f('leoDueDate', 'LEO deadline', 'date'),
    f('leoDate', 'LEO date', 'date'),
    f('egmNumber', 'EGM number'),
    f('egmDate', 'EGM date', 'date'),
    f('customsQuery', 'Customs queries', 'textarea'),
    f('dbkAmount', 'Drawback entitlement', 'number'),
    f('rodtepAmount', 'RoDTEP entitlement', 'number'),
    f('overrideReason', 'Entitlement override reason', 'textarea'),
  ],
);
add(
  'bills-of-lading',
  'Bills of Lading',
  'Logistics',
  { roles: all, documents: ['BL draft', 'BL final'] },
  [
    ref('sourceId', 'Shipping bill', 'shipping-bills', true),
    ref('shippingLineId', 'Shipping line', 'master-shipping-lines', true),
    f('vessel', 'Vessel'),
    f('voyage', 'Voyage'),
    f('container', 'Container numbers'),
    f('etd', 'ETD', 'date'),
    f('eta', 'ETA', 'date'),
  ],
);
add(
  'delivery-challans',
  'Delivery Challans',
  'Logistics',
  {
    roles: all,
    lines: true,
    documents: ['Delivery challan', 'E-way bill'],
    transitions: {
      Draft: ['Dispatched', 'Cancelled'],
      Dispatched: ['Arrived'],
      Arrived: ['Delivered'],
      Delivered: [],
      Cancelled: [],
    },
  },
  [
    ref(
      'sourceId',
      'Purchase / commercial / domestic invoice',
      'delivery-source',
      true,
    ),
    f('transporter', 'Transporter'),
    f('vehicle', 'Vehicle number', 'text', true),
    f('deliveryAddress', 'Delivery address', 'textarea', true),
  ],
);
add(
  'eway-bills',
  'E-Way Bills',
  'Compliance',
  { roles: all, documents: ['E-way bill'] },
  [
    ref('sourceId', 'Delivery challan', 'delivery-challans', true),
    f('number', 'Government-issued E-way bill number', 'text', true),
    f('validUntil', 'Valid until', 'date', true),
    f('vehicle', 'Vehicle number'),
  ],
);
add(
  'remittances',
  'Customer Remittances',
  'Finance',
  { documents: ['Bank advice', 'FIRC / eFIRC'] },
  [
    ref('sourceId', 'Commercial invoice', 'invoices', true),
    ref('receiptId', 'Customer receipt', 'receipts', true),
    ref('bankId', 'Bank', 'master-bank-details'),
    f('bankReference', 'Bank reference', 'text', true),
    f('amount', 'Foreign currency amount', 'number', true),
    f('realisationDate', 'Bank realisation date', 'date', true),
  ],
);
add(
  'forex',
  'Forex Realisations',
  'Finance',
  { documents: ['Conversion advice', 'Bank charges advice'] },
  [
    ref('sourceId', 'Remittance', 'remittances', true),
    ref('invoiceId', 'Commercial invoice', 'invoices', true),
    ref('receiptId', 'Receipt', 'receipts', true),
    f('bankReference', 'Bank conversion reference', 'text', true),
    f('foreignAmount', 'Foreign amount', 'number', true),
    f('invoiceRate', 'Invoice exchange rate', 'number', true),
    f('bankRate', 'Bank exchange rate', 'number', true),
    f('bankChargesInr', 'Bank charges INR', 'number', true),
    f('realisationDate', 'Realisation date', 'date', true),
  ],
);
add('ebrc', 'eBRC', 'Compliance', { documents: ['eBRC', 'FIRC / eFIRC'] }, [
  ref('sourceId', 'Commercial invoice', 'invoices', true),
  ref('receiptId', 'Receipt', 'receipts', true),
  ref('remittanceId', 'Bank remittance', 'remittances'),
  ref('forexId', 'Forex conversion', 'forex'),
  ref('bankId', 'Bank', 'master-bank-details'),
  f('realisationDate', 'Realisation date', 'date'),
  f('bankReference', 'Bank reference'),
  f('number', 'eBRC number', 'text', true),
  f('amount', 'Realised value', 'number', true),
]);
add(
  'incentives',
  'Export Incentives',
  'Finance',
  {
    documents: ['Claim', 'Entitlement override evidence', 'Receipt advice'],
    transitions: {
      Draft: ['Claimed', 'Cancelled'],
      Claimed: ['Received', 'Rejected'],
      Received: [],
      Rejected: ['Claimed'],
      Cancelled: [],
    },
  },
  [
    ref('sourceId', 'Shipping bill', 'shipping-bills', true),
    {
      key: 'scheme',
      label: 'Scheme',
      type: 'select',
      required: true,
      options: ['DBK', 'RoDTEP', 'IGST refund'],
    },
    f('amount', 'Final entitlement', 'number', true),
    f('rate', 'Rate percentage', 'number'),
    f('overrideReason', 'Override / variance reason', 'textarea'),
    f('receivedAmount', 'Received amount', 'number'),
    f('claimNumber', 'Claim number'),
  ],
);
add('machines', 'Serialized Machines', 'Inventory', {
  master: true,
  roles: all,
  fields: [
    f('name', 'Machine description', 'text', true),
    f('serialNumber', 'Serial number', 'text', true),
    ref('productId', 'Equipment model', 'products', true),
    ref('warehouseId', 'Location', 'warehouses', true),
    ref('purchaseId', 'Purchase invoice', 'purchase-invoices'),
    f('cost', 'Cost', 'number'),
    f('inspection', 'Inspection notes', 'textarea'),
  ],
  transitions: {
    Available: ['Reserved', 'Sold', 'Inactive'],
    Reserved: ['Available', 'Sold'],
    Sold: [],
    Inactive: ['Available'],
  },
  documents: ['Machine photo', 'Inspection report'],
});
for (const [key, label, group, fields] of [
  [
    'import-orders',
    'Import Orders',
    'Import',
    [
      ref('partnerId', 'Supplier', 'vendors', true),
      f('country', 'Origin country', 'text', true),
      f('eta', 'ETA', 'date'),
    ],
  ],
  [
    'bill-of-entry',
    'Bill of Entry',
    'Import',
    [
      ref('sourceId', 'Import order', 'import-orders', true),
      f('number', 'Bill of Entry number', 'text', true),
      f('duty', 'Customs duty', 'number'),
      f('assessedDate', 'Assessment date', 'date'),
    ],
  ],
  [
    'shipments',
    'Shipments',
    'Logistics',
    [
      ref('sourceId', 'Commercial invoice', 'invoices'),
      f('container', 'Container'),
      ref('shippingLineId', 'Shipping line', 'master-shipping-lines'),
      f('etd', 'ETD', 'date'),
      f('eta', 'ETA', 'date'),
      f('location', 'Current location'),
    ],
  ],
  [
    'production-orders',
    'Production Orders',
    'Production',
    [
      ref('bomId', 'BOM', 'master-bom', true),
      ref('productId', 'Output product', 'products', true),
      f('quantity', 'Planned quantity', 'number', true),
      f('startDate', 'Planned start', 'date'),
      f('completionDate', 'Planned finish', 'date'),
    ],
  ],
  [
    'costing-sheets',
    'Costing Sheets',
    'Costing',
    [
      ref('sourceId', 'Commercial invoice', 'invoices'),
      f('materialCost', 'Material cost', 'number'),
      f('freight', 'Freight', 'number'),
      f('insurance', 'Insurance', 'number'),
      f('otherCosts', 'Other costs', 'number'),
    ],
  ],
  [
    'checklists',
    'Checklists',
    'Tasks',
    [
      f('name', 'Checklist name', 'text', true),
      f('items', 'Checklist items', 'textarea', true),
      f('owner', 'Responsible person'),
      f('completionNotes', 'Completion notes', 'textarea'),
    ],
  ],
] as [string, string, string, OpField[]][])
  add(
    key,
    label,
    group,
    { roles: group === 'Costing' ? financial : all, documents: [] },
    fields,
  );

for (const key of ['invoices', 'domestic-invoices'])
  operationModules
    .find((m) => m.key === key)!
    .fields.push(
      ref(
        'warehouseId',
        'Dispatch warehouse',
        'warehouses',
        true,
        'Delivery & logistics',
      ),
    );
add('transport', 'Transport', 'Logistics', { roles: all }, [
  ref('sourceId', 'Delivery challan', 'delivery-challans'),
  f('transporter', 'Transporter', 'text', true),
  f('vehicle', 'Vehicle', 'text', true),
  f('driver', 'Driver'),
  f('phone', 'Driver phone'),
  f('pickup', 'Pickup address', 'textarea', true),
  f('destination', 'Destination address', 'textarea', true),
]);
add('freight', 'Freight', 'Logistics', { roles: financial }, [
  ref('sourceId', 'Shipment', 'shipments', true),
  ref('shippingLineId', 'Shipping line', 'master-shipping-lines'),
  f('amount', 'Freight amount', 'number', true),
  f('booking', 'Booking number'),
]);
add('customs', 'Customs', 'Import', { roles: all }, [
  ref('sourceId', 'Bill of Entry', 'bill-of-entry', true),
  f('query', 'Customs query', 'textarea'),
  f('response', 'Response', 'textarea'),
  f('clearanceDate', 'Clearance date', 'date'),
]);
add('import-costs', 'Import Costs', 'Import', { roles: financial }, [
  ref('sourceId', 'Import order', 'import-orders', true),
  f('duty', 'Duty', 'number'),
  f('freight', 'Freight', 'number'),
  f('insurance', 'Insurance', 'number'),
  f('handling', 'Handling charges', 'number'),
]);
add('import-settlements', 'Import Settlement', 'Import', { roles: financial }, [
  ref('sourceId', 'Import order', 'import-orders', true),
  f('amount', 'Settlement amount', 'number', true),
  f('bankReference', 'Bank reference', 'text', true),
  f('exchangeRate', 'Exchange rate', 'number', true),
]);
add(
  'material-consumption',
  'Material Consumption',
  'Production',
  { roles: all },
  [
    ref('sourceId', 'Production order', 'production-orders', true),
    ref('productId', 'Material', 'products', true),
    ref('warehouseId', 'Warehouse', 'warehouses', true),
    f('quantity', 'Consumed quantity', 'number', true),
  ],
);
add('production-output', 'Production Output', 'Production', { roles: all }, [
  ref('sourceId', 'Production order', 'production-orders', true),
  ref('productId', 'Product', 'products', true),
  ref('warehouseId', 'Warehouse', 'warehouses', true),
  f('quantity', 'Output quantity', 'number', true),
  f('qualityResult', 'Quality check result', 'textarea'),
]);
add('stock-transfers', 'Stock Transfer', 'Inventory', { roles: all }, [
  ref('productId', 'Product', 'products', true),
  ref('warehouseId', 'From warehouse', 'warehouses', true),
  ref('toWarehouseId', 'To warehouse', 'warehouses', true),
  f('quantity', 'Quantity', 'number', true),
  f('reason', 'Transfer reason', 'textarea', true),
]);
add(
  'stock-adjustments',
  'Stock Adjustment',
  'Inventory',
  { roles: ['Admin', 'Viewer'] },
  [
    ref('productId', 'Product', 'products', true),
    ref('warehouseId', 'Warehouse', 'warehouses', true),
    {
      key: 'direction',
      label: 'Direction',
      type: 'select',
      options: ['Receipt', 'Issue'],
      required: true,
    },
    f('quantity', 'Quantity', 'number', true),
    f('reason', 'Adjustment reason', 'textarea', true),
  ],
);
add(
  'einvoices',
  'E-Invoice Register',
  'Compliance',
  { roles: financial, documents: ['Acknowledgement', 'Signed invoice'] },
  [
    ref('sourceId', 'Invoice', 'sales-invoice', true),
    f('irn', 'Government-issued IRN', 'text', true),
    f('acknowledgement', 'Acknowledgement number', 'text', true),
    f('acknowledgedDate', 'Acknowledgement date', 'date', true),
  ],
);
add(
  'lut-register',
  'LUT Register',
  'Compliance',
  { roles: financial, documents: ['LUT acknowledgement'] },
  [
    f('number', 'LUT reference', 'text', true),
    f('validFrom', 'Valid from', 'date', true),
    f('validUntil', 'Valid until', 'date', true),
    ref('sourceId', 'Invoice', 'invoices'),
    f('deadline', 'Review deadline', 'date'),
  ],
);
add('task-templates', 'Task Templates', 'Tasks', {
  master: true,
  roles: all,
  fields: [
    f('name', 'Template name', 'text', true),
    f('items', 'Steps', 'textarea', true),
    f('days', 'Days to complete', 'number'),
  ],
  transitions: masterStates,
});

add('tasks', 'Tasks', 'Tasks', {
  roles: all,
  fields: [
    f('reference', 'Reference', 'text', true),
    f('name', 'Task', 'text', true),
    f('date', 'Date', 'date', true),
    f('dueDate', 'Due date', 'date', true),
    f('owner', 'Responsible person'),
    f('notes', 'Notes', 'textarea'),
  ],
  transitions: {
    Open: ['In Progress', 'Cancelled'],
    'In Progress': ['Completed', 'Open'],
    Completed: ['Open'],
    Cancelled: [],
  },
});
add('user-groups', 'User Groups', 'Administration', {
  master: true,
  roles: ['Admin'],
  fields: [
    f('name', 'Group name', 'text', true),
    f('members', 'Member emails (one per line)', 'textarea', true),
    f('description', 'Purpose', 'textarea'),
  ],
  transitions: masterStates,
});
add('approval-rules', 'Approval Workflows', 'Administration', {
  master: true,
  roles: ['Admin'],
  fields: [
    f('name', 'Workflow name', 'text', true),
    {
      key: 'module',
      label: 'Module',
      type: 'select',
      required: true,
      options: operationModules.filter((m) => m.posting).map((m) => m.key),
    },
    ref('currencyId', 'Currency', 'master-currency', true),
    f('threshold', 'Amount requiring administrator approval', 'number', true),
  ],
  transitions: masterStates,
});
add('approvals', 'Approval Requests', 'Administration', {
  roles: ['Admin', 'Finance', 'Viewer'],
  fields: [
    f('reference', 'Reference', 'text', true),
    f('date', 'Request date', 'date', true),
    ref('sourceId', 'Document', 'approval-source', true),
    f('notes', 'Request notes', 'textarea'),
  ],
  transitions: {
    Submitted: ['Approved', 'Rejected'],
    Approved: [],
    Rejected: [],
  },
});
operationModules
  .find((m) => m.key === 'stock-adjustments')!
  .fields.push(f('unitCost', 'Unit cost (receipts only)', 'number'));
for (const key of [
  'stock-transfers',
  'stock-adjustments',
  'material-consumption',
  'production-output',
])
  operationModules.find((m) => m.key === key)!.transitions = {
    Draft: ['Posted', 'Cancelled'],
    Posted: [],
    Cancelled: [],
  };
for (const [side, partnerKind] of [
  ['customer', 'customers'],
  ['supplier', 'vendors'],
]) {
  add(
    side + '-advance-adjustments',
    side === 'customer'
      ? 'Customer Advance Adjustments'
      : 'Supplier Advance Adjustments',
    'Finance',
    {
      partner: partnerKind,
      posting: side + '-adjustment',
      documents: ['Adjustment approval'],
    },
    [
      partner(partnerKind),
      ref('advanceId', 'Posted advance', side + '-advances', true),
      ref(
        'invoiceId',
        'Invoice',
        side === 'customer' ? 'sales-invoice' : 'purchase-payable',
        true,
      ),
      f('amount', 'Amount to adjust', 'number', true),
    ],
  );
  add(
    side + '-advance-refunds',
    side === 'customer'
      ? 'Customer Advance Refunds'
      : 'Supplier Advance Refunds',
    'Finance',
    {
      partner: partnerKind,
      posting: side + '-refund',
      documents: ['Bank advice'],
    },
    [
      partner(partnerKind),
      ref('advanceId', 'Posted advance', side + '-advances', true),
      f('amount', 'Refund amount', 'number', true),
      f('bankReference', 'Bank reference', 'text', true),
    ],
  );
}

add(
  'sales-orders',
  'Sales Orders',
  'Sales',
  {
    lines: true,
    partner: 'customers',
    roles: financial,
    documents: ['Sales order', 'Customer PO'],
    convert: [
      'proformas',
      'invoices',
      'domestic-invoices',
      'delivery-challans',
    ],
  },
  [partner('customers')],
);
for (const [key, label, fields] of [
  [
    'tax-codes',
    'Tax Codes',
    [
      f('name', 'Tax code name', 'text', true),
      f('gstRate', 'GST percentage', 'number', true),
      f('tcsRate', 'TCS percentage', 'number'),
      f('tdsRate', 'TDS percentage', 'number'),
      f('description', 'Treatment notes', 'textarea'),
    ],
  ],
  [
    'price-lists',
    'Price Lists',
    [
      f('name', 'Price list name', 'text', true),
      ref('currencyId', 'Currency', 'master-currency', true),
      f('discountPercent', 'Default discount percentage', 'number'),
      f('description', 'Description', 'textarea'),
    ],
  ],
  [
    'standard-clauses',
    'Standard Clauses',
    [
      f('name', 'Clause name', 'text', true),
      f('body', 'Clause text', 'textarea', true),
    ],
  ],
  [
    'sales-projects',
    'Sales Projects',
    [
      f('name', 'Project name', 'text', true),
      ref('customerId', 'Customer', 'customers'),
      f('description', 'Description', 'textarea'),
    ],
  ],
  [
    'sales-enquiries',
    'Sales Enquiries',
    [
      f('name', 'Enquiry reference', 'text', true),
      ref('customerId', 'Customer', 'customers'),
      f('description', 'Enquiry details', 'textarea'),
    ],
  ],
] as [string, string, OpField[]][])
  add(key, label, 'Sales configuration', {
    master: true,
    roles: financial,
    fields,
    transitions: masterStates,
  });
for (const key of ['customers', 'vendors'])
  operationModules
    .find((m) => m.key === key)!
    .fields.push(
      ref('currencyId', 'Default currency', 'master-currency'),
      ref('paymentTermsId', 'Default payment terms', 'master-payment-terms'),
      ref('priceListId', 'Default price list', 'price-lists'),
      f('tradeName', 'Trade name'),
      f('shippingAddress', 'Default shipping address', 'textarea'),
      f('taxTreatment', 'Default tax treatment'),
    );
operationModules
  .find((m) => m.key === 'products')!
  .fields.push(ref('taxCodeId', 'Default sales tax code', 'tax-codes'));
for (const [key, label] of [
  ['sales-credit-notes', 'Sales Credit Notes'],
  ['purchase-debit-notes', 'Purchase Debit Notes'],
  ['expense-credit-notes', 'Expense Credit Notes'],
])
  add(key, label, 'Finance', {
    transitions: { Imported: [] },
    roles: financial,
  });
export const opMap = Object.fromEntries(
  operationModules.map((m) => [m.key, m]),
);
export function initialStatus(m: OpModule) {
  return Object.keys(m.transitions)[0] || 'Draft';
}
export function permittedOperation(m: OpModule, role: string, write = false) {
  return m.roles.includes(role) && (!write || role !== 'Viewer');
}
export type CommercialLine = {
  productId: string;
  description: string;
  quantity: string;
  rate: string;
  gstRate: string;
  tcsRate: string;
  tdsRate: string;
  charges: string;
  roundOff: string;
  serialNumbers?: string;
};
export function calculateLines(input: any[]) {
  if (!Array.isArray(input) || !input.length || input.length > 100)
    throw new Error('Enter between 1 and 100 lines.');
  return input.map((l: any) => {
    if (!l || typeof l.description !== 'string' || !l.description.trim())
      throw new Error('Every line needs a description.');
    const q = Number(l.quantity);
    if (
      !Number.isFinite(q) ||
      q <= 0 ||
      q > 1000000 ||
      Math.round(q * 1000) !== q * 1000
    )
      throw new Error(
        'Quantity must be positive with up to three decimal places.',
      );
    const rate = moneyMinor(l.rate);
    const basic = Math.round(q * rate);
    const percent = (v: any) => {
      const n = Number(v || 0);
      if (!Number.isFinite(n) || n < 0 || n > 100)
        throw new Error('Tax percentages must be between 0 and 100.');
      return n;
    };
    const gstRate = percent(l.gstRate),
      tcsRate = percent(l.tcsRate),
      tdsRate = percent(l.tdsRate);
    const override = (key: string, computed: number) =>
      l[key] === undefined || l[key] === '' ? computed : moneyMinor(l[key]);
    if (
      ['gstOverride', 'tcsOverride', 'tdsOverride'].some(
        (k) => l[k] !== undefined && l[k] !== '',
      ) &&
      !String(l.overrideReason || '').trim()
    )
      throw new Error('Enter a reason for overriding a tax amount.');
    const gst = override('gstOverride', Math.round((basic * gstRate) / 100)),
      tcs = override('tcsOverride', Math.round((basic * tcsRate) / 100)),
      tds = override('tdsOverride', Math.round((basic * tdsRate) / 100)),
      charges = moneyMinor(l.charges || '0');
    const rounding = String(l.roundOff || '0');
    const roundOff = rounding.startsWith('-')
      ? -moneyMinor(rounding.slice(1))
      : moneyMinor(rounding);
    const total = basic + gst + tcs - tds + charges + roundOff;
    if (!Number.isSafeInteger(total) || total <= 0 || total > 1e13)
      throw new Error(
        'Line total must be positive and within supported limits.',
      );
    return {
      gstOverride: l.gstOverride === undefined ? '' : String(l.gstOverride),
      tcsOverride: l.tcsOverride === undefined ? '' : String(l.tcsOverride),
      tdsOverride: l.tdsOverride === undefined ? '' : String(l.tdsOverride),
      overrideReason: String(l.overrideReason || '').slice(0, 1000),
      productId: String(l.productId || ''),
      description: l.description.trim().slice(0, 500),
      quantity: String(q),
      rate: String(l.rate),
      gstRate: String(gstRate),
      tcsRate: String(tcsRate),
      tdsRate: String(tdsRate),
      charges: String(l.charges || '0'),
      roundOff: rounding,
      serialNumbers: String(l.serialNumbers || '').slice(0, 5000),
      basic,
      gst,
      tcs,
      tds,
      other: charges,
      rounding: roundOff,
      total,
    };
  });
}
// Explicit page mappings keep each menu attached to its operational register.
export const operationRoutes: Record<string, string> = {
  'sales-quotations': 'quotations',
  'sales-proforma-invoices': 'proformas',
  'sales-customer-advances': 'customer-advances',
  'sales-domestic-sales': 'domestic-invoices',
  'sales-export-invoices': 'invoices',
  'sales-shipping-bills': 'shipping-bills',
  'sales-bills-of-lading': 'bills-of-lading',
  'sales-export-shipments': 'shipments',
  'purchase-supplier-advances': 'supplier-advances',
  'purchase-purchase-invoices': 'purchase-invoices',
  'purchase-purchase-returns': 'purchase-returns',
  'purchase-purchase-expenses': 'expenses',
  'inventory-serialized-stock': 'machines',
  'logistics-shipments': 'shipments',
  'logistics-delivery-challans': 'delivery-challans',
  'logistics-shipping-line': 'master-shipping-lines',
  'logistics-logistics-charges': 'master-shipping-line-charges',
  'finance-receipts': 'receipts',
  'finance-payments': 'payments',
  'finance-ebrc': 'ebrc',
  'finance-remittance-forex': 'remittances',
  'finance-export-incentives': 'incentives',
  'compliance-e-way-bill': 'eway-bills',
  'production-production-orders': 'production-orders',
  'production-bom': 'master-bom',
  'import-import-orders': 'import-orders',
  'import-bill-of-entry': 'bill-of-entry',
  'tasks-checklist': 'checklists',
  'costing-costing-sheets': 'costing-sheets',
  'documents-document-templates': 'master-document-templates',
  'logistics-transport': 'transport',
  'logistics-pickup-delivery': 'delivery-challans',
  'logistics-freight': 'freight',
  'import-customs': 'customs',
  'import-import-costs': 'import-costs',
  'import-import-settlement': 'import-settlements',
  'production-material-consumption': 'material-consumption',
  'production-production-output': 'production-output',
  'inventory-stock-transfer': 'stock-transfers',
  'inventory-stock-adjustment': 'stock-adjustments',
  'compliance-e-invoice': 'einvoices',
  'compliance-lut-watch': 'lut-register',
  'tasks-task-templates': 'task-templates',
  'administration-user-groups': 'user-groups',
  'administration-approval-workflows': 'approval-rules',
};
