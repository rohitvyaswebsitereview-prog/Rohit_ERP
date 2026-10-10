/** Implemented report screens shared by navigation and report rendering. */
export const reportRoutes: Record<
  string,
  { title: string; kinds?: string[]; mode?: string }
> = {
  receivables: {
    title: 'Receivables',
    kinds: ['invoices', 'domestic-invoices'],
    mode: 'outstanding',
  },
  payables: {
    title: 'Payables',
    kinds: ['bills', 'purchase-invoices', 'expenses'],
    mode: 'outstanding',
  },
  'sales-report': {
    title: 'Sales Register',
    kinds: ['invoices', 'domestic-invoices'],
  },
  'tasks-pending-tasks': {
    title: 'Pending Tasks',
    kinds: ['tasks'],
    mode: 'pending-tasks',
  },
  'tasks-completed': {
    title: 'Completed Tasks',
    kinds: ['tasks'],
    mode: 'completed-tasks',
  },
  'documents-generated-documents': {
    title: 'Generated Documents',
    mode: 'generated',
  },
  'sales-export-documents': { title: 'Export Documents', mode: 'documents' },
  'documents-transaction-documents': {
    title: 'Transaction Documents',
    mode: 'documents',
  },
  'documents-export-documents': {
    title: 'Export Documents',
    mode: 'documents',
  },
  'documents-domestic-documents': {
    title: 'Domestic Documents',
    mode: 'documents',
  },
  'documents-uploaded-documents': {
    title: 'Uploaded Documents',
    mode: 'documents',
  },
  'documents-drive': { title: 'Document Drive', mode: 'documents' },
  'inventory-stock-register': { title: 'Stock Register', kinds: ['machines'] },
  'inventory-stock-ageing': {
    title: 'Stock Ageing',
    kinds: ['machines'],
    mode: 'ageing',
  },
  'inventory-yard-location-stock': {
    title: 'Location Stock',
    kinds: ['machines'],
  },
  'inventory-inventory-valuation': {
    title: 'Inventory Valuation',
    mode: 'valuation',
  },
  'inventory-inventory-reports': {
    title: 'Inventory Reports',
    kinds: ['machines'],
  },
  'logistics-shipment-tracking': {
    title: 'Shipment Tracking',
    kinds: ['shipments', 'bills-of-lading', 'delivery-challans'],
  },
  'finance-remittance-forex': {
    title: 'Remittance & Forex',
    kinds: ['receipts'],
  },
  'finance-financial-reports': {
    title: 'Financial Reports',
    kinds: [
      'invoices',
      'domestic-invoices',
      'purchase-invoices',
      'expenses',
      'receipts',
      'payments',
    ],
  },
  'finance-tax': {
    title: 'Tax Working Register',
    kinds: ['invoices', 'domestic-invoices', 'purchase-invoices', 'expenses'],
    mode: 'tax',
  },
  'compliance-compliance-overview': {
    title: 'Compliance Overview',
    kinds: ['shipping-bills', 'eway-bills', 'ebrc', 'incentives'],
    mode: 'deadlines',
  },
  'compliance-leo-watch': {
    title: 'LEO Watch',
    kinds: ['shipping-bills'],
    mode: 'deadlines',
  },
  'compliance-fema-realisation': {
    title: 'FEMA Realisation',
    kinds: ['invoices'],
    mode: 'deadlines',
  },
  'compliance-pending-ebrc': {
    title: 'Pending eBRC',
    kinds: ['invoices'],
    mode: 'missing-ebrc',
  },
  'compliance-ebrc-mismatch': {
    title: 'eBRC Reconciliation',
    kinds: ['ebrc'],
    mode: 'reconcile',
  },
  'compliance-tds': {
    title: 'TDS Register',
    kinds: ['invoices', 'domestic-invoices', 'purchase-invoices', 'expenses'],
    mode: 'tax',
  },
  'compliance-compliance-reports': {
    title: 'Compliance Reports',
    kinds: ['shipping-bills', 'eway-bills', 'ebrc', 'incentives'],
    mode: 'deadlines',
  },
  'reports-purchase-reports': {
    title: 'Purchase Reports',
    kinds: [
      'purchase-orders',
      'purchase-invoices',
      'expenses',
      'supplier-advances',
    ],
  },
  'reports-inventory-reports': {
    title: 'Inventory Reports',
    kinds: ['machines'],
  },
  'reports-finance-reports': {
    title: 'Finance Reports',
    kinds: ['invoices', 'domestic-invoices', 'receipts', 'payments'],
  },
  'reports-export-reports': {
    title: 'Export Reports',
    kinds: [
      'invoices',
      'shipping-bills',
      'bills-of-lading',
      'ebrc',
      'incentives',
    ],
  },
  'reports-logistics-reports': {
    title: 'Logistics Reports',
    kinds: ['shipments', 'delivery-challans', 'bills-of-lading'],
  },
  'reports-compliance-reports': {
    title: 'Compliance Reports',
    kinds: ['shipping-bills', 'eway-bills', 'ebrc'],
    mode: 'deadlines',
  },
  'reports-costing-reports': {
    title: 'Costing Reports',
    kinds: ['costing-sheets'],
  },
  'reports-custom-reports': { title: 'Custom Report', mode: 'custom' },
  'costing-shipment-costing': {
    title: 'Shipment Costing',
    kinds: ['costing-sheets'],
  },
  'costing-product-costing': {
    title: 'Product Costing',
    kinds: ['costing-sheets'],
  },
  'costing-order-profitability': {
    title: 'Order Profitability',
    kinds: ['costing-sheets'],
  },
  'costing-margin-analysis': {
    title: 'Margin Analysis',
    kinds: ['costing-sheets'],
  },
  'production-production-planning': {
    title: 'Production Planning',
    kinds: ['production-orders'],
  },
  'production-production-reports': {
    title: 'Production Reports',
    kinds: ['production-orders'],
  },
  'import-import-documents': { title: 'Import Documents', mode: 'documents' },
  'import-import-shipments': {
    title: 'Import Shipments',
    kinds: ['import-orders', 'bill-of-entry'],
  },
};
