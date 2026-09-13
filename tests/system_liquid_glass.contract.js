const fs = require('fs');
const assert = require('assert');

const css = fs.readFileSync('styles/design_liquid_glass-1.0.0.css', 'utf8');
const htaccess = fs.readFileSync('.htaccess', 'utf8');
const workflow = fs.readFileSync('.github/workflows/impeccable-detail-audit.yml', 'utf8');

assert(css.includes('body.ks-design-ready{') && !css.includes(':root{'),
  'Liquid Glass sistêmico deve respeitar design_tokens.css como único :root oficial');
assert(css.includes('.ks-topbar') && css.includes('.ks-access-shell') && css.includes('.modal-box') && css.includes('.ks-toast'),
  'camadas elevadas devem receber material Liquid Glass forte');
assert(css.includes('.btn-primary') && css.includes('.btn-secondary') && css.includes('input:not([type="checkbox"])') && css.includes('select,textarea'),
  'botões e campos globais devem consumir o material sistêmico');
assert(css.includes('[data-tela="tela_avaliacao"] .card') && css.includes('[data-tela="tela_evolucao"] .card'),
  'superfícies clínicas densas devem permanecer sólidas para leitura prolongada');
assert(css.includes('table,.tabela-pacientes') && css.includes('backdrop-filter:none'),
  'tabelas e dados densos não devem virar glass decorativo');
assert(css.includes('prefers-reduced-transparency:reduce') && css.includes('prefers-reduced-motion:reduce'),
  'tema deve respeitar preferências de transparência e movimento reduzidos');
assert(css.includes('@supports not ((backdrop-filter:blur(1px))'),
  'tema deve possuir fallback para navegadores sem backdrop-filter');

assert(htaccess.includes('design_liquid_glass-1\\.0\\.0\\.css'),
  'servidor deve revalidar a folha sistêmica');
assert(htaccess.includes('styles/design_liquid_glass-1.0.0.css?v=20260913-system-glass-r12'),
  'HTML entregue deve carregar uma revisão inequívoca do tema sistêmico');
assert(htaccess.includes('kinesys_delivery_system_glass_r12_seen=1') && htaccess.includes('env=!kinesys_delivery_system_glass_r12_seen'),
  'limpeza de cache deve ocorrer apenas uma vez nesta revisão');
assert(!htaccess.includes('Clear-Site-Data "\\"cookies\\"') && !htaccess.includes('Clear-Site-Data "\\"storage\\"'),
  'entrega não pode limpar sessão, cookies ou armazenamento local');

assert(workflow.includes("styles/design_liquid_glass-1.0.0.css"),
  'Impeccable deve auditar a camada sistêmica em alterações visuais');
assert(workflow.includes('pull_request:'),
  'auditoria visual deve rodar nos PRs que alteram o design system');

console.log('system_liquid_glass.contract: OK');
