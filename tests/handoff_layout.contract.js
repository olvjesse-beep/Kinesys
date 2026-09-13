'use strict';

const fs = require('fs');
const path = require('path');
const assert = require('assert');

const ROOT = process.cwd();
const rootFiles = fs.readdirSync(ROOT, { withFileTypes: true })
  .filter(entry => entry.isFile())
  .map(entry => entry.name)
  .sort();

// .htaccess faz parte da entrega de produção do KineSys (cache/headers/fallback)
// e já existe na main. O contrato continua impedindo retorno de JS/CSS soltos à raiz.
const expectedRootFiles = [
  '.htaccess',
  'DESIGN.md',
  'PRODUCT.md',
  'default.php',
  'index.html',
  'recuperar-acesso.html'
].sort();

assert.deepStrictEqual(
  rootFiles,
  expectedRootFiles,
  `A raiz do KineSys deve permanecer limitada aos 6 arquivos de entrada/contexto/entrega documentados. Atual: ${rootFiles.join(', ')}`
);

const rootRuntime = rootFiles.filter(name => /\.(?:js|css)$/i.test(name));
assert.deepStrictEqual(rootRuntime, [], 'Nenhum JS/CSS de runtime pode voltar para a raiz');

const requiredPaths = [
  'src/core/script-1.18.0.js',
  'src/ui/screen_loader-1.25.0.js',
  'src/ui/menu_dropdown-1.0.0.js',
  'src/agenda/agenda-1.20.0.js',
  'src/auth/login_access-1.18.0.js',
  'src/admin/team_management_core-1.0.0.js',
  'src/patient/patient_data_normalization_core-1.0.0.js',
  'src/patient/patient_form_helpers_core-1.0.0.js',
  'src/patient/prontuario_export.js',
  'src/patient/prontuario_export_impl.js',
  'src/finance/financeiro_workspace-1.20.1.js',
  'src/clinical/clinical_reasoning_hma-3.0.0.js',
  'src/clinical/clinical_reasoning_shoulder-3.1.0.js',
  'src/clinical/clinical_reasoning_elbow-3.1.0.js',
  'src/clinical/clinical_reasoning_wrist-3.1.0.js',
  'src/clinical/clinical_reasoning_cervical-3.1.0.js',
  'src/clinical/clinical_engine-1.17.0.js',
  'src/clinical/clinical_region_loader-1.0.0.js',
  'src/clinical/cirurgias-1.18.0.js',
  'styles/design_base.css',
  'styles/design_polish.css',
  'styles/design_experience.css',
  'assets/timbrado-fisiofix.png',
  'docs/HANDOFF_ARCHITECTURE.md'
];

for (const rel of requiredPaths) {
  assert.ok(fs.existsSync(path.join(ROOT, rel)), `Path crítico ausente: ${rel}`);
}

const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
assert.ok(html.includes('src/core/script-1.18.0.js'), 'index.html deve carregar o core pelo path organizado');
assert.ok(html.includes('src/ui/screen_loader-1.25.0.js'), 'index.html deve carregar o screen loader pelo path organizado');
assert.ok(html.includes('src/auth/login_access-1.18.0.js'), 'index.html deve carregar o login pelo path organizado');
assert.ok(html.includes('styles/design_base.css'), 'index.html deve carregar estilos pelo diretório styles');
assert.ok(!/<script[^>]+src=["']script-1\.18\.0\.js/i.test(html), 'index.html não pode regressar para script core na raiz');
assert.ok(!/<link[^>]+href=["']design_base\.css/i.test(html), 'index.html não pode regressar para CSS na raiz');

const loader = fs.readFileSync(path.join(ROOT, 'src/ui/screen_loader-1.25.0.js'), 'utf8');
assert.ok(loader.includes('src/agenda/agenda-1.20.0.js'), 'Screen loader deve usar path organizado da Agenda');
assert.ok(loader.includes('src/clinical/clinical_region_loader-1.0.0.js'), 'Screen loader deve usar path organizado do loader clínico regional');
assert.ok(loader.includes('styles/agenda_referencia-1.20.0.css'), 'Screen loader deve usar path organizado de CSS lazy');

const regionLoader = fs.readFileSync(path.join(ROOT, 'src/clinical/clinical_region_loader-1.0.0.js'), 'utf8');
assert.ok(regionLoader.includes('src/clinical/clinical_reasoning_shoulder-3.1.0.js'), 'Loader clínico regional deve usar path organizado do Motor Clínico de ombro');

const designBase = fs.readFileSync(path.join(ROOT, 'styles/design_base.css'), 'utf8');
assert.ok(designBase.includes('../assets/timbrado-fisiofix.png'), 'Asset relativo do design_base deve considerar o diretório styles');

console.log('KineSys handoff layout contract: OK');
