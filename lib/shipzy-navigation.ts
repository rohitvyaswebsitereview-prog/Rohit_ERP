import { modules, pendingMenuRoutes } from './navigation';
import { operationRoutes } from './operations';

/** Final V1 domain order from Dashboard.docx; unresolved legacy proposals are not routes. */
export const shipzyMenus = modules.filter(m => m.key !== 'control-tower').map(m => ({
  title: m.label, route: m.key, icon: m.icon,
  children: m.key === 'masters' ? undefined : m.items.length ? m.items
    .filter(([, route]) => !pendingMenuRoutes.has(route))
    .map(([section, route, title]) => [operationRoutes[route] || route, title, section || m.label]) : undefined,
}));
export const shipzyTitle = (route: string) => shipzyMenus.find(m => m.route === route)?.title ||
  shipzyMenus.flatMap(m => m.children || []).find(([r]) => r === route)?.[1];
