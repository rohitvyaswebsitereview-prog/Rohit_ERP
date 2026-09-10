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
  Grid2X2,
} from 'lucide-react';
import { opMap, operationRoutes, permittedOperation } from './operations';
export const workspaceNavigation = [
  { key: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, items: [] },
  { key: 'quotations', label: 'Quotations', icon: FileText, items: [] },
  {
    key: 'sales',
    label: 'Sales & Invoices',
    icon: FileText,
    items: [
      ['', 'sales-orders', 'Sales orders'],
      ['', 'proformas', 'Proforma invoices'],
      ['', 'invoices', 'Commercial invoices'],
      ['', 'domestic-invoices', 'Domestic invoices'],
    ],
  },
  {
    key: 'documents-drive',
    label: 'Documents & Shipments',
    icon: FolderOpen,
    items: [
      ['', 'documents-drive', 'Document folders'],
      ['', 'shipping-bills', 'Shipping bills'],
      ['', 'bills-of-lading', 'Bills of lading'],
      ['', 'shipments', 'Shipment tracking'],
      ['', 'checklists', 'Checklists'],
    ],
  },
  {
    key: 'purchase',
    label: 'Purchase',
    icon: ShoppingCart,
    items: [
      ['', 'purchase-orders', 'Purchase orders'],
      ['', 'purchase-invoices', 'Supplier invoices'],
      ['', 'expenses', 'Expenses'],
    ],
  },
  {
    key: 'inventory',
    label: 'Inventory',
    icon: Boxes,
    items: [
      ['', 'machines', 'Equipment register'],
      ['', 'products', 'Products'],
      ['', 'inventory-stock-register', 'Stock register'],
      ['', 'warehouses', 'Warehouses'],
    ],
  },
  {
    key: 'finance',
    label: 'Payments & Finance',
    icon: Landmark,
    items: [
      ['', 'receivables', 'Customer balances'],
      ['', 'receipts', 'Money received'],
      ['', 'payables', 'Supplier balances'],
      ['', 'payments', 'Money paid'],
      ['', 'remittances', 'Remittances'],
      ['', 'forex', 'Forex'],
      ['', 'ebrc', 'eBRC'],
      ['', 'incentives', 'Export incentives'],
    ],
  },
  { key: 'reports', label: 'Reports', icon: ChartColumn, items: [] },
  { key: 'masters', label: 'Masters', icon: SlidersHorizontal, items: [] },
  { key: 'all-tools', label: 'All tools', icon: Grid2X2, items: [] },
  { key: 'workspace-settings', label: 'Settings', icon: Settings, items: [] },
];
export function canOpenWorkspace(route: string, role: string) {
  const module = opMap[operationRoutes[route] || route];
  if (module) return permittedOperation(module, role);
  if (
    ['users', 'audit', 'activity'].includes(route) ||
    route.startsWith('administration')
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
    ].includes(route)
  )
    return role !== 'Logistics';
  return true;
}
export const mainRecordSections = [
  ['Overview', 'Details'],
  ['Documents', 'Documents'],
  ['Finance', 'Payments'],
  ['Timeline', 'Activity'],
];
