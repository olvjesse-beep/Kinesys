const fs = require('fs');
const assert = require('assert');

const css = fs.readFileSync('styles/liquid_glass_system-1.0.0.css', 'utf8');
const htaccess = fs.readFileSync('.htaccess', 'utf8');
const impeccableWorkflow = fs.readFileSync('.github/workflows/impeccable-detail-audit.yml', 'utf8');

assert(css.includes('KineSys — Liquid Glass System v1'),
  'camada sistêmica deve declarar a identidade Liquid Glass do KineSys');
assert(css.includes('Impeccable / Operate mode'),
  'camada sistêmica deve registrar a direção de produto Operate');

assert(css.includes('.ks-topbar') && css.includes('.card'),
  'shell e cards devem receber o vocabulário sistêmico');
assert(css.includes('.btn-primary') && css.includes('.btn-secondary') && css.includes('.btn-danger'),
  'ações primárias, secundárias e destrutivas devem compartilhar o sistema');
assert(css.includes('input:not([type="checkbox"])') && css.includes('select') && css.includes('textarea'),
  'campos base devem usar a mesma linguagem visual');
assert(css.includes('[role="tablist"]') && css.includes('[role="tab"]'),
  'tabs e segmented controls devem possuir tratamento sistêmico');
assert(css.includes('.modal-box') && css.includes('.ks-dialog') && css.includes('.ks-toast'),
  'camadas elevadas devem usar Liquid Glass real');
assert(css.includes('#tela_login .ks-access-shell') && css.includes('#tela_login .ks-access-intro') && css.includes('#tela_login .ks-access-panel'),
  'login deve ser incluído na linguagem Liquid Glass');

assert(css.includes('[data-tela="tela_avaliacao"]') && css.includes('[data-tela="tela_evolucao"]') && css.includes('[data-tela="tela_relatorio"]'),
  'telas densas devem possuir superfície mais sólida para preservar legibilidade');
assert(!css.includes('#ks_sidebar'),
  'camada global não pode sobrescrever o material especializado do sidebar');
assert(!css.includes('!important'),
  'camada sistêmica não deve depender de !important para vencer a cascata');

assert(css.includes('::selection') && css.includes('caret-color') && css.includes('::-webkit-scrollbar-thumb'),
  'acabamento deve incluir superfícies do navegador previstas pelo craft floor');
assert(css.includes('prefers-reduced-motion'),
  'transições devem respeitar preferência por movimento reduzido');
assert(css.includes('@supports not'),
  'material deve ter fallback para navegadores sem backdrop-filter');

assert(htaccess.includes('liquid_glass_system-1\\.0\\.0\\.css'),
  'servidor deve revalidar a nova camada sistêmica');
assert(htaccess.includes('kinesys_delivery_system_glass_r1_seen=1'),
  'revisão sistêmica deve limpar somente o cache uma vez');
assert(htaccess.includes('styles/liquid_glass_system-1.0.0.css?v=20260913-system-glass-r1'),
  'resposta HTML deve injetar revisão inequívoca da camada sistêmica');
assert(!htaccess.includes('Clear-Site-Data "\\"cookies\\"') && !htaccess.includes('Clear-Site-Data "\\"storage\\"'),
  'entrega não pode apagar sessão ou armazenamento local');

assert(impeccableWorkflow.includes("styles/liquid_glass_system-1.0.0.css"),
  'Impeccable deve auditar a nova camada visual');
assert(impeccableWorkflow.includes('pull_request:'),
  'auditoria Impeccable deve rodar em mudanças visuais de PR');

console.log('liquid_glass_system.contract: OK');
