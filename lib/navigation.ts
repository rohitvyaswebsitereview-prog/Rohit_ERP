import { opMap, operationRoutes } from './operations';
import { masterItems } from './masters';
import {
  LayoutDashboard,
  ShoppingCart,
  ArrowLeftRight,
  Boxes,
  Truck,
  Factory,
  Landmark,
  ShieldCheck,
  Files,
  ListChecks,
  ChartNoAxesCombined,
  ChartColumn,
  SlidersHorizontal,
  Users,
  Settings,
  LifeBuoy,
  Globe,
} from 'lucide-react';
export const modules = [
  { key: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, items: [] },
  {
    key: 'sales',
    label: 'Sales & Export',
    icon: Globe,
    items: [
      ['SALES', 'orders', 'Sales Orders'],
      ['SALES', 'invoices', 'Commercial Invoices'],
      ['CUSTOMERS', 'customers', 'Customer Accounts'],
    ],
  },
  {
    key: 'purchase',
    label: 'Purchase',
    icon: ShoppingCart,
    items: [
      ['PURCHASE', 'purchase-orders', 'Purchase Orders'],
      ['PURCHASE', 'bills', 'Expense Bills'],
      ['PARTNERS', 'vendors', 'Vendors'],
    ],
  },
  { key: 'import', label: 'Import', icon: ArrowLeftRight, items: [] },
  {
    key: 'inventory',
    label: 'Inventory',
    icon: Boxes,
    items: [
      ['STOCK', 'stock', 'Stock Overview'],
      ['STOCK', 'movements', 'Stock Movements'],
      ['MASTERS', 'products', 'Products'],
      ['MASTERS', 'warehouses', 'Warehouses'],
    ],
  },
  {
    key: 'logistics',
    label: 'Logistics',
    icon: Truck,
    items: [['OPERATIONS', 'orders', 'Shipment Overview']],
  },
  { key: 'production', label: 'Production', icon: Factory, items: [] },
  {
    key: 'finance',
    label: 'Finance',
    icon: Landmark,
    items: [
      ['WORKING CAPITAL', 'receivables', 'Receivables'],
      ['WORKING CAPITAL', 'payables', 'Payables'],
      ['ACCOUNTING', 'journal', 'General Ledger'],
      ['ACCOUNTING', 'cash', 'Cash & Bank'],
      ['ACCOUNTING', 'accounts', 'Chart of Accounts'],
    ],
  },
  {
    key: 'compliance',
    label: 'Compliance',
    icon: ShieldCheck,
    items: [['MONITORING', 'exceptions', 'Exception Register']],
  },
  {
    key: 'documents',
    label: 'Documents',
    icon: Files,
    items: [['DOCUMENTS', 'documents', 'Document Centre']],
  },
  {
    key: 'tasks',
    label: 'Tasks & Checklist',
    icon: ListChecks,
    items: [['WORK', 'tasks', 'My Tasks']],
  },
  {
    key: 'costing',
    label: 'Costing & Profitability',
    icon: ChartNoAxesCombined,
    items: [['ANALYSIS', 'profitability', 'Profitability']],
  },
  {
    key: 'reports',
    label: 'Reports',
    icon: ChartColumn,
    items: [
      ['FINANCIAL', 'sales-report', 'Sales Report'],
      ['FINANCIAL', 'trial-balance', 'Trial Balance'],
    ],
  },
  {
    key: 'masters',
    label: 'Masters',
    icon: SlidersHorizontal,
    items: [
      ['BUSINESS PARTNERS', 'customers', 'Customers'],
      ['BUSINESS PARTNERS', 'vendors', 'Vendors'],
      ['PRODUCTS & INVENTORY', 'products', 'Products'],
      ['PRODUCTS & INVENTORY', 'warehouses', 'Warehouses'],
    ],
  },
  {
    key: 'administration',
    label: 'Administration',
    icon: Users,
    items: [
      ['ACCESS', 'users', 'Users & Roles'],
      ['CONTROL', 'audit', 'Audit Log'],
    ],
  },
  { key: 'settings', label: 'Settings', icon: Settings, items: [] },
  { key: 'help', label: 'Help & Support', icon: LifeBuoy, items: [] },
];
// Document-derived menu inventory. Proposed screens stay disabled until implemented.
const menuInventory: Record<string, string[]> = {
  sales: [
    'Quotations',
    'Proforma Invoices',
    'Customer Advances',
    'Sales Orders',
    'Commercial Invoices',
    'Domestic Sales',
    'Export Invoices',
    'Shipping Bills',
    'Bills of Lading',
    'Export Documents',
    'Export Shipments',
    'Customer Accounts',
  ],
  purchase: [
    'Purchase Orders',
    'Supplier Advances',
    'Purchase Invoices',
    'Purchase Returns',
    'Purchase Expenses',
    'Expense Bills',
    'Vendors',
  ],
  import: [
    'Import Orders',
    'Import Documents',
    'Bill of Entry',
    'Import Shipments',
    'Customs',
    'Import Costs',
    'Import Settlement',
  ],
  inventory: [
    'Stock Overview',
    'Serialized Stock',
    'Stock Register',
    'Stock Movements',
    'Stock Transfer',
    'Stock Adjustment',
    'Stock Ageing',
    'Yard / Location Stock',
    'Inventory Valuation',
    'Inventory Reports',
    'Products',
    'Warehouses',
  ],
  logistics: [
    'Shipment Tracking',
    'Shipments',
    'Transport',
    'Pickup / Delivery',
    'Freight',
    'Shipping Line',
    'Logistics Charges',
    'Shipment Overview',
    'Delivery Challans',
  ],
  production: [
    'Production Orders',
    'BOM',
    'Production Planning',
    'Material Consumption',
    'Production Output',
    'Production Reports',
  ],
  finance: [
    'Receivables',
    'Payables',
    'Receipts',
    'Payments',
    'Cash & Bank',
    'Remittance & Forex',
    'eBRC',
    'Export Incentives',
    'Tax',
    'Financial Reports',
    'General Ledger',
    'Chart of Accounts',
  ],
  compliance: [
    'Compliance Overview',
    'E-Invoice',
    'E-Way Bill',
    'LUT Watch',
    'LEO Watch',
    'FEMA Realisation',
    'Pending eBRC',
    'eBRC Mismatch',
    'TDS',
    'Compliance Reports',
    'Exception Register',
  ],
  documents: [
    'Document Centre',
    'Transaction Documents',
    'Export Documents',
    'Domestic Documents',
    'Generated Documents',
    'Uploaded Documents',
    'Document Templates',
    'Drive',
  ],
  tasks: [
    'My Tasks',
    'Pending Tasks',
    'Checklist',
    'Completed',
    'Task Templates',
  ],
  costing: [
    'Costing Sheets',
    'Shipment Costing',
    'Product Costing',
    'Order Profitability',
    'Margin Analysis',
    'Profitability',
  ],
  reports: [
    'Sales Report',
    'Purchase Reports',
    'Inventory Reports',
    'Finance Reports',
    'Export Reports',
    'Logistics Reports',
    'Compliance Reports',
    'Costing Reports',
    'Custom Reports',
    'Trial Balance',
  ],
  masters: [
    'Masters Centre',
    'Company Information',
    'Company Addresses',
    'Branches',
    'Financial Years',
    'Products',
    'Equipment / Machine Master',
    'Units',
    'Packages',
    'Package Types',
    'Packaging Materials',
    'Quality Specifications',
    'BOM',
    'Customers',
    'Vendors',
    'Delivery Addresses',
    'Ports',
    'Payment Terms',
    'Shipment Terms',
    'Currency',
    'Bank Details',
    'Advance Licence',
    'EPCG Licence',
    'LC Master',
    'Shipping Lines',
    'Shipping Line Charges',
    'Destination Charges',
    'Additional Charges',
    'Transport Masters',
    'Document Templates',
    'Email Templates',
    'Notification Templates',
    'Expense Types',
    'Order Status',
    'Warehouses',
  ],
  administration: [
    'Users & Roles',
    'Permissions',
    'User Groups',
    'Approval Workflows',
    'Audit Log',
    'Login & Security',
    'System Activity',
  ],
};
export const pendingMenuRoutes = new Set<string>();
for (const module of modules) {
  const labels = menuInventory[module.key];
  if (!labels) continue;
  const existing = new Map(module.items.map((item) => [item[2], item]));
  if (module.key === 'masters')
    existing.set('Masters Centre', ['', 'masters', 'Masters Centre']);
  if (module.key === 'administration')
    existing.set('System Activity', ['', 'activity', 'System Activity']);
  module.items = labels.map((label) => {
    const current = existing.get(label);
    if (current) return current;
    const route =
      module.key + '-' + label.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    pendingMenuRoutes.add(route);
    return ['', route, label];
  });
}
export const titles: Record<string, string> = {
  dashboard: 'Dashboard',
  orders: 'Sales Orders',
  invoices: 'Commercial Invoices',
  customers: 'Customers',
  vendors: 'Vendors',
  'purchase-orders': 'Purchase Orders',
  bills: 'Expense Bills',
  products: 'Products',
  warehouses: 'Warehouses',
  movements: 'Stock Movements',
  stock: 'Stock Overview',
  receivables: 'Receivables',
  payables: 'Payables',
  journal: 'General Ledger',
  cash: 'Cash & Bank',
  accounts: 'Chart of Accounts',
  exceptions: 'Exception Register',
  documents: 'Document Centre',
  tasks: 'Tasks & Checklist',
  profitability: 'Profitability',
  'sales-report': 'Sales Report',
  'trial-balance': 'Trial Balance',
  users: 'Users & Roles',
  audit: 'Audit Log',
  settings: 'Settings',
  help: 'Help & Support',
  import: 'Import',
  production: 'Production',
  masters: 'Masters',
  notifications: 'Notifications',
  activity: 'Recent Activity',
  profile: 'My Profile',
};
export const routeKind = (route: string) =>
  ({
    receivables: 'invoices',
    payables: 'bills',
    'sales-report': 'invoices',
    profitability: 'journal',
    cash: 'journal',
    'trial-balance': 'journal',
    stock: 'movements',
  })[route] || route;

// The final Masters specification replaces the exploratory sidebar inventory.
const mastersModule = modules.find((m) => m.key === 'masters');
if (mastersModule) mastersModule.items = [];
for (const item of masterItems) titles[item.route] = item.label;

for (const [route, key] of Object.entries(operationRoutes)) {
  titles[route] = opMap[key].label;
  pendingMenuRoutes.delete(route);
}
for (const [key, m] of Object.entries(opMap)) titles[key] = m.label;

modules
  .find((m) => m.key === 'administration')
  ?.items.push(['', 'approvals', 'Approval Requests']);
modules
  .find((m) => m.key === 'finance')
  ?.items.push(['', 'approvals', 'Approval Requests']);

for (const key of [
  'customer-advance-adjustments',
  'supplier-advance-adjustments',
  'customer-advance-refunds',
  'supplier-advance-refunds',
])
  modules
    .find((m) => m.key === 'finance')
    ?.items.push(['', key, opMap[key].label]);

titles['administration-permissions'] = 'Permissions';
titles['administration-login-security'] = 'Login & Security';

const salesNav = modules.find((m) => m.key === 'sales');
if (salesNav) {
  salesNav.items = salesNav.items.map((i) =>
    i[1] === 'orders' ? ['', 'sales-orders', 'Sales Orders'] : i,
  );
  salesNav.items.push(
    ['', 'sales-enquiries', 'Enquiries'],
    ['', 'sales-projects', 'Projects'],
  );
}
const settingsNav = modules.find((m) => m.key === 'settings');
if (settingsNav)
  settingsNav.items = [
    ['', 'settings', 'Workspace Preferences'],
    ['', 'tax-codes', 'Tax Codes'],
    ['', 'price-lists', 'Price Lists'],
    ['', 'standard-clauses', 'Standard Clauses'],
  ];

modules
  .find((m) => m.key === 'settings')
  ?.items.push(['', 'workbook-data', 'Business Data & Reconciliation']);
titles['workbook-data'] = 'Business Data & Reconciliation';

modules.push({
  key: 'control-tower',
  label: 'Control Tower',
  icon: ListChecks,
  items: [],
});
titles['record360'] = 'Record details';
titles['all-tools'] = 'All tools';
titles['workspace-settings'] = 'Settings';
titles['control-tower'] = 'Control Tower';
titles['data-dictionary'] = 'Data dictionary & rules';

modules
  .find((m) => m.key === 'finance')
  ?.items.push(
    ['', 'remittances', 'Customer Remittances'],
    ['', 'forex', 'Forex Realisations'],
  );
modules
  .find((m) => m.key === 'settings')
  ?.items.push(['', 'data-dictionary', 'Data Dictionary & Rules']);

Object.assign(titles, {
  transactions: 'Transactions',
  'my-work': 'My work',
  'work-calendar': 'Calendar',
  'document-center': 'Documents',
  'document-inbox': 'Document inbox',
  purchase: 'Procurement',
  reconciliation: 'Reconciliation',
  'architecture-map': 'Architecture & lifecycle map',
});
