from pathlib import Path

INDEX = Path('index.html')
LOADER = Path('screen_loader-1.25.0.js')
TEST = Path('tests/screen_loader.contract.js')

html = INDEX.read_text(encoding='utf-8')
loader = LOADER.read_text(encoding='utf-8')
test = TEST.read_text(encoding='utf-8')


def remove_tag_line(text, needle, label):
    lines = text.splitlines(keepends=True)
    matches = [i for i, line in enumerate(lines) if needle in line]
    if len(matches) != 1:
        raise SystemExit(f'{label}: expected exactly 1 line, found {len(matches)}')
    del lines[matches[0]]
    return ''.join(lines)

# Assets exclusive to operational screens leave the initial shell.
for needle, label in [
    ('financeiro_workspace-1.20.1.css?v=20260901-r1', 'Finance workspace CSS'),
    ('financeiro_lancamentos-1.20.0.css?v=20260901-r2', 'Finance ledger CSS'),
    ('agenda_referencia-1.20.0.css?v=20260901-r1', 'Agenda reference CSS'),
    ('financeiro_alignment.css?v=20260909-align-r4', 'Finance alignment CSS'),
    ('pendencias_financeiras-1.19.0.js?v=20260901-r2', 'Finance pending JS'),
    ('descontos_financeiros-1.20.0.js?v=20260909-r2', 'Finance discounts JS'),
    ('balanco_financeiro_admin-1.19.0.js?v=20260904-integracao-r1', 'Finance balance JS'),
    ('analise_admin-1.19.0.js?v=20260901-r2', 'Finance analysis JS'),
    ('financeiro_workspace-1.20.1.js?v=20260901-r1', 'Finance workspace JS'),
    ('financeiro_lancamentos-1.20.0.js?v=20260904-integracao-r1', 'Finance ledger JS'),
]:
    html = remove_tag_line(html, needle, label)

old_loader_tag = 'screen_loader-1.25.0.js?v=20260910-phase2c-r1'
new_loader_tag = 'screen_loader-1.25.0.js?v=20260910-phase4a-r1'
if html.count(old_loader_tag) != 1:
    raise SystemExit(f'Screen Loader cache tag: expected 1 old tag, found {html.count(old_loader_tag)}')
html = html.replace(old_loader_tag, new_loader_tag, 1)

# Shared cores MUST remain eager in Phase 4A.
for required in [
    'financeiro-1.19.0.js?v=20260904-integracao-r1',
    'credito_cliente-1.19.0.js?v=20260904-integracao-r1',
    'agenda-1.20.0.js?v=20260901-r1',
    'financeiro_agendamento-1.21.0.js?v=20260904-integracao-r1',
    'financeiro_agendamento-1.21.0.css?v=20260901-r1',
    'design_agenda.css',
]:
    if required not in html:
        raise SystemExit(f'Required eager shared asset disappeared: {required}')

INDEX.write_text(html, encoding='utf-8')

# Add operational bundles to the existing screen loader.
old_version = "const VERSION='1.25.0-phase2c';"
new_version = "const VERSION='1.25.1-phase4a';"
if loader.count(old_version) != 1:
    raise SystemExit(f'Loader version anchor: expected 1, found {loader.count(old_version)}')
loader = loader.replace(old_version, new_version, 1)

bundle_anchor = """            afterLoad(){
                if(typeof window.atualizarMotorClinico3KineSys==='function'){
                    window.atualizarMotorClinico3KineSys(true);
                }
            }
        })
    });
"""
bundle_replacement = """            afterLoad(){
                if(typeof window.atualizarMotorClinico3KineSys==='function'){
                    window.atualizarMotorClinico3KineSys(true);
                }
            }
        }),
        tela_financeiro:Object.freeze({
            id:'financeiro',
            styles:Object.freeze([
                'financeiro_workspace-1.20.1.css?v=20260901-r1',
                'financeiro_lancamentos-1.20.0.css?v=20260901-r2',
                'financeiro_alignment.css?v=20260909-align-r4'
            ]),
            scripts:Object.freeze([
                'pendencias_financeiras-1.19.0.js?v=20260901-r2',
                'descontos_financeiros-1.20.0.js?v=20260909-r2',
                'balanco_financeiro_admin-1.19.0.js?v=20260904-integracao-r1',
                'analise_admin-1.19.0.js?v=20260901-r2',
                'financeiro_workspace-1.20.1.js?v=20260901-r1',
                'financeiro_lancamentos-1.20.0.js?v=20260904-integracao-r1'
            ])
        }),
        tela_agenda:Object.freeze({
            id:'agenda',
            styles:Object.freeze([
                'agenda_referencia-1.20.0.css?v=20260901-r1'
            ]),
            scripts:Object.freeze([])
        })
    });
"""
if loader.count(bundle_anchor) != 1:
    raise SystemExit(f'Operational bundle anchor: expected 1, found {loader.count(bundle_anchor)}')
loader = loader.replace(bundle_anchor, bundle_replacement, 1)
LOADER.write_text(loader, encoding='utf-8')

# Extend the permanent loader contract without weakening Phase 2C checks.
console_old = "console.log(`Screen Loader contract Phase 2C: ${lazyScripts.length} JS + ${lazyStyles.length} CSS sob demanda; DOM da Avaliação externalizado (${Buffer.byteLength(fragment)} bytes).`);\n"
if test.count(console_old) != 1:
    raise SystemExit(f'Screen Loader test marker: expected 1, found {test.count(console_old)}')

extra = r'''const financeLazyScripts=[
  'pendencias_financeiras-1.19.0.js',
  'descontos_financeiros-1.20.0.js',
  'balanco_financeiro_admin-1.19.0.js',
  'analise_admin-1.19.0.js',
  'financeiro_workspace-1.20.1.js',
  'financeiro_lancamentos-1.20.0.js'
];
const financeLazyStyles=[
  'financeiro_workspace-1.20.1.css',
  'financeiro_lancamentos-1.20.0.css',
  'financeiro_alignment.css'
];
const agendaLazyStyles=['agenda_referencia-1.20.0.css'];

assert.match(loader,/tela_financeiro\s*:/,'bundle do Financeiro deve existir');
assert.match(loader,/tela_agenda\s*:/,'bundle visual da Agenda deve existir');

function assertLazyAsset(file,kind){
  const escaped=file.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
  const eager=kind==='script'
    ? new RegExp(`<script[^>]+src=["'][^"']*${escaped}[^"']*["']`,'i')
    : new RegExp(`<link[^>]+href=["'][^"']*${escaped}[^"']*["']`,'i');
  assert.ok(!eager.test(html),`${file} não pode voltar ao carregamento inicial`);
  assert.ok(loader.includes(file),`${file} deve permanecer registrado no Screen Loader`);
  assert.ok(fs.existsSync(file),`${file} deve existir fisicamente no repositório`);
}
for(const file of financeLazyScripts)assertLazyAsset(file,'script');
for(const file of financeLazyStyles)assertLazyAsset(file,'style');
for(const file of agendaLazyStyles)assertLazyAsset(file,'style');

let financePos=-1;
for(const file of financeLazyScripts){
  const pos=loader.indexOf(file);
  assert.ok(pos>financePos,`${file} deve preservar a ordem histórica relativa do bundle Financeiro`);
  financePos=pos;
}

const eagerSharedScripts=[
  'financeiro-1.19.0.js',
  'credito_cliente-1.19.0.js',
  'agenda-1.20.0.js',
  'financeiro_agendamento-1.21.0.js'
];
for(const file of eagerSharedScripts){
  const escaped=file.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
  assert.match(html,new RegExp(`<script[^>]+src=["'][^"']*${escaped}[^"']*["']`,'i'),`${file} deve continuar eager na Fase 4A por ser núcleo compartilhado`);
}
assert.match(html,/financeiro_agendamento-1\.21\.0\.css/,'CSS da integração Agenda/Financeiro deve continuar eager');
assert.match(html,/design_agenda\.css/,'CSS estrutural compartilhado da Agenda deve continuar eager nesta fase');
assert.match(app,/iniciarNotificacoesAgenda/,'bootstrap global de notificações da Agenda deve permanecer preservado');
assert.match(loader,/VERSION='1\.25\.1-phase4a'/,'Screen Loader deve identificar a Fase 4A');

const deferredRawBytes=145198+27284+2983;
console.log(`Screen Loader contract Phase 4A: Avaliação continua sob demanda; Financeiro adia ${financeLazyScripts.length} JS + ${financeLazyStyles.length} CSS e Agenda adia ${agendaLazyStyles.length} CSS (${deferredRawBytes} bytes brutos retirados do bootstrap).`);
'''
test = test.replace(console_old, extra, 1)
TEST.write_text(test, encoding='utf-8')

print('Phase 4A operational asset rewrite prepared.')
