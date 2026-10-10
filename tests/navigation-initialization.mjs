import { createRequire } from 'node:module';
import { mkdir, rm } from 'node:fs/promises';
const require = createRequire(import.meta.resolve('wrangler/package.json'));
const { build } = require('esbuild');
await mkdir('.test-output', { recursive: true });
for (const withERP of [true,false]) {
  const output='.test-output/navigation-init-'+withERP+'.mjs';
  await build({stdin:{resolveDir:process.cwd(),loader:'tsx',contents:`
${withERP ? "import './components/erp';" : ''}
import assert from 'node:assert/strict';
import {shipzyMenus} from './lib/shipzy-navigation';
import {pendingMenuRoutes,titles} from './lib/navigation';
const children=shipzyMenus.flatMap(m=>m.children||[]).map(([route])=>route);
for(const route of ['reports-purchase-reports','reports-finance-reports','reports-export-reports','reports-custom-reports','sales-export-documents','documents-domestic-documents','documents-uploaded-documents','documents-generated-documents','compliance-leo-watch','administration-permissions','administration-login-security']) {
 assert.ok(children.includes(route),'implemented menu must include '+route+' regardless of ERP import');
 assert.equal(pendingMenuRoutes.has(route),false);
 assert.ok(titles[route]);
}
for(const route of pendingMenuRoutes) assert.ok(!children.includes(route),'unimplemented proposals remain hidden: '+route);
assert.equal(titles['reports-purchase-reports'],'Purchase Reports');
console.log('Navigation initialized with ERP import = ${withERP}.');
`},bundle:true,platform:'node',format:'esm',packages:'external',jsx:'automatic',outfile:output});
  try { await import('../'+output); } finally { await rm(output); }
}
