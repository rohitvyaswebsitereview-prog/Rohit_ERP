import {
  LayoutDashboard,
  FileText,
  ShoppingCart,
  FolderOpen,
  Boxes,
  Landmark,
  ChartColumn,
  SlidersHorizontal,
  Settings,
  Truck,
  ShieldCheck,
} from 'lucide-react';
import { opMap, operationRoutes, permittedOperation } from './operations';
export const processModules: Record<
  string,
  { label: string; pages: [string, string][] }
> = {
  sales: {
    label: 'Sales',
    pages: [
      ['transactions', 'Transactions'],
      ['sales-projects', 'Opportunities'],
      ['quotations', 'Quotations'],
      ['sales-orders', 'Sales orders'],
      ['proformas', 'Proforma invoices'],
      ['invoices', 'Commercial invoices'],
      ['domestic-invoices', 'Domestic invoices'],
    ],
  },
  purchase: {
    label: 'Procurement',
    pages: [
      ['purchase-orders', 'Purchase orders'],
      ['purchase-invoices', 'Purchase invoices'],
      ['vendors', 'Suppliers'],
      ['supplier-advances', 'Supplier advances'],
      ['payments', 'Payments'],
      ['expenses', 'Expenses'],
    ],
  },
  logistics: {
    label: 'Logistics',
    pages: [
      ['shipments', 'Export shipments'],
      ['import-orders', 'Import shipments / orders'],
      ['shipping-bills', 'Shipping bills'],
      ['bills-of-lading', 'Bills of lading'],
      ['documents-drive?category=Packing%20list', 'Packing lists'],
      ['transport', 'Transport'],
      ['delivery-challans', 'Delivery'],
    ],
  },
  finance: {
    label: 'Finance',
    pages: [
      ['receivables', 'Receivables'],
      ['payables', 'Payables'],
      ['receipts', 'Receipts'],
      ['payments', 'Payments'],
      ['remittances', 'Bank realisation'],
      ['forex', 'Forex'],
      ['reconciliation', 'Reconciliation'],
      ['customer-advances', 'Customer advances'],
      ['supplier-advances', 'Supplier advances'],
    ],
  },
  inventory: {
    label: 'Inventory',
    pages: [
      ['inventory-stock-register', 'Stock'],
      ['products', 'Products / equipment models'],
      ['machines', 'Serialized units'],
      ['warehouses', 'Warehouses'],
      ['stock-transfers', 'Stock movements'],
    ],
  },
  compliance: {
    label: 'Compliance',
    pages: [
      ['ebrc', 'eBRC'],
      ['incentives?scheme=DBK', 'DBK'],
      ['incentives?scheme=RoDTEP', 'RoDTEP'],
      ['incentives?scheme=IGST%20refund', 'IGST refund'],
      ['my-work', 'Compliance tasks'],
    ],
  },
  'document-center': {
    label: 'Documents',
    pages: [
      ['document-inbox', 'Document inbox'],
      ['documents-drive', 'All documents'],
      ['master-document-templates', 'Templates'],
    ],
  },
  'workspace-settings': {
    label: 'Settings',
    pages: [
      ['my-work', 'My work'],
      ['work-calendar', 'Calendar'],
      ['workbook-data', 'Imports / migration'],
      ['audit', 'Audit'],
      ['users', 'Users & roles'],
      ['settings', 'Preferences'],
      ['architecture-map', 'Architecture & lifecycle map'],
      ['data-dictionary', 'Field definitions'],
      ['all-tools', 'All tools'],
    ],
  },
};
export const workspaceNavigation = [
  { key: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, items: [] },
  { key: 'sales', label: 'Sales', icon: FileText, items: [] },
  { key: 'purchase', label: 'Procurement', icon: ShoppingCart, items: [] },
  { key: 'logistics', label: 'Logistics', icon: Truck, items: [] },
  { key: 'finance', label: 'Finance', icon: Landmark, items: [] },
  { key: 'inventory', label: 'Inventory', icon: Boxes, items: [] },
  { key: 'compliance', label: 'Compliance', icon: ShieldCheck, items: [] },
  { key: 'document-center', label: 'Documents', icon: FolderOpen, items: [] },
  { key: 'masters', label: 'Masters', icon: SlidersHorizontal, items: [] },
  { key: 'reports', label: 'Reports', icon: ChartColumn, items: [] },
  { key: 'workspace-settings', label: 'Settings', icon: Settings, items: [] },
];
export function canOpenWorkspace(route: string, role: string) {
  const base = route.split('?')[0];
  const module = opMap[operationRoutes[base] || base];
  if (module) return permittedOperation(module, role);
  if (
    ['users', 'audit', 'activity'].includes(base) ||
    base.startsWith('administration')
  )
    return role === 'Admin';
  if (
    [
      'receivables',
      'payables',
      'finance',
      'workbook-data',
      'forex',
      'remittances',
      'reconciliation',
    ].includes(base)
  )
    return role !== 'Logistics';
  return true;
}
export const mainRecordSections = [
  ['Overview', 'Overview'],
  ['Documents', 'Documents'],
  ['Finance', 'Finance'],
  ['Items', 'Items'],
  ['Timeline', 'Activity'],
  ['Transactions', 'Related'],
];
