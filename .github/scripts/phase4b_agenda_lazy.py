from pathlib import Path

INDEX = Path('index.html')
LOADER = Path('screen_loader-1.25.0.js')
AGENDA = Path('agenda-1.20.0.js')
CORE = Path('agenda_notificacoes_core-1.20.1.js')
INTEGRATION = Path('financeiro_agendamento-1.21.0.js')
TEST = Path('tests/screen_loader.contract.js')
WORKFLOW = Path('.github/workflows/screen-loader-contract.yml')

html = INDEX.read_text(encoding='utf-8')
loader = LOADER.read_text(encoding='utf-8')
agenda = AGENDA.read_text(encoding='utf-8')
integration = INTEGRATION.read_text(encoding='utf-8')
test = TEST.read_text(encoding='utf-8')
workflow = WORKFLOW.read_text(encoding='utf-8')
original_agenda_bytes = len(agenda.encode('utf-8'))


def replace_once(text, old, new, label):
    count = text.count(old)
    if count != 1:
        raise SystemExit(f'{label}: expected exactly 1 match, found {count}')
    return text.replace(old, new, 1)


def extract_between(text, start, end, label):
    start_pos = text.find(start)
    if start_pos < 0:
        raise SystemExit(f'{label}: start anchor not found')
    end_pos = text.find(end, start_pos)
    if end_pos < 0:
        raise SystemExit(f'{label}: end anchor not found')
    return text[start_pos:end_pos], text[:start_pos] + text[end_pos:]

# ---------------------------------------------------------------------------
# 1) Extract only the notification runtime from Agenda into an eager core.
# ---------------------------------------------------------------------------
state_block = """let agendaNotificacoesCache = [];
let agendaNotificacoesTimer = null;
let agendaNotificacoesPrimeiraCarga = true;
"""
agenda = replace_once(agenda, state_block, '', 'Agenda notification state')

key_line = "const AGENDA_NOTIFICACOES_PENDENTES_KEY = 'kinesys_notificacoes_pendentes_v1';\n"
agenda = replace_once(agenda, key_line, '', 'Agenda notification pending key')

queue_block, agenda = extract_between(
    agenda,
    'function lerNotificacoesPendentesAgenda() {',
    'function formatarDataAgendaBR(dataISO) {',
    'Agenda notification queue helpers'
)

runtime_block, agenda = extract_between(
    agenda,
    'async function sincronizarNotificacoesPendentesAgenda() {',
    "document.addEventListener('DOMContentLoaded', () => {",
    'Agenda notification runtime'
)

old_permission = """function usuarioPodeReceberNotificacoesAgenda() {
    return !!usuarioLogado && perfilAgendaAtual() !== 'SECRETARIA';
}
"""
new_permission = """function usuarioPodeReceberNotificacoesAgenda() {
    return !!usuarioLogado && String(usuarioLogado?.tipo || '').toUpperCase() !== 'SECRETARIA';
}
"""
runtime_block = replace_once(runtime_block, old_permission, new_permission, 'Notification role decoupling')

old_open = """    if (n.agendamento_data) agendaDataSelecionada = new Date(n.agendamento_data + 'T00:00:00');
    if (typeof navegarPara === 'function') navegarPara('tela_agenda');
    await renderizarPainelAgenda();
    if (n.agendamento_id) setTimeout(() => abrirDetalheAgendamento(String(n.agendamento_id)), 80);
"""
new_open = """    if (typeof window !== 'undefined' && window.KineSysScreenLoader?.ensure) {
        try {
            await window.KineSysScreenLoader.ensure('tela_agenda');
        } catch (error) {
            console.error('Agenda: falha ao carregar módulo a partir da notificação.', error);
            if (typeof mostrarToastKineSys === 'function') mostrarToastKineSys('Não foi possível abrir a Agenda agora. Tente novamente.', 'erro', 6500);
            return;
        }
    }
    if (n.agendamento_data && typeof agendaDataSelecionada !== 'undefined') agendaDataSelecionada = new Date(n.agendamento_data + 'T00:00:00');
    if (typeof navegarPara === 'function') await Promise.resolve(navegarPara('tela_agenda'));
    if (typeof renderizarPainelAgenda === 'function') await renderizarPainelAgenda();
    if (n.agendamento_id && typeof abrirDetalheAgendamento === 'function') setTimeout(() => abrirDetalheAgendamento(String(n.agendamento_id)), 80);
"""
runtime_block = replace_once(runtime_block, old_open, new_open, 'Notification lazy Agenda navigation')

core_header = """/* ==========================================================================
   KineSys — núcleo global de notificações da Agenda v1.20.1
   Fase 4B: permanece eager para preservar avisos após login enquanto a UI
   completa da Agenda é carregada somente no primeiro acesso.
   Mantém os nomes públicos e a fila local já existentes.
   ========================================================================== */

"""
core_state = """let agendaNotificacoesCache = [];
let agendaNotificacoesTimer = null;
let agendaNotificacoesPrimeiraCarga = true;
const AGENDA_NOTIFICACOES_PENDENTES_KEY = 'kinesys_notificacoes_pendentes_v1';

"""
core = core_header + core_state + queue_block.rstrip() + '\n\n' + runtime_block.lstrip()
CORE.write_text(core, encoding='utf-8')

# Agenda used to rely on DOMContentLoaded, which has already fired when lazy-loaded.
old_dom = """document.addEventListener('DOMContentLoaded', () => {
    atualizarVisibilidadeAuditoriaStatusAgenda();
    document.querySelectorAll('.modal-overlay').forEach(overlay => {
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) fecharModal(overlay.id);
        });
    });
});
"""
new_dom = """function inicializarEventosDomAgenda() {
    atualizarVisibilidadeAuditoriaStatusAgenda();
    document.querySelectorAll('.modal-overlay').forEach(overlay => {
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) fecharModal(overlay.id);
        });
    });
}
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', inicializarEventosDomAgenda, { once:true });
} else {
    inicializarEventosDomAgenda();
}
"""
agenda = replace_once(agenda, old_dom, new_dom, 'Agenda late DOM initialization')
AGENDA.write_text(agenda, encoding='utf-8')

# ---------------------------------------------------------------------------
# 2) Make Financeiro↔Agenda integration safe before the Agenda module exists.
# ---------------------------------------------------------------------------
integration = replace_once(
    integration,
    '/* KineSys 1.21.0 — financeiro canônico por agendamento. Carregado após Agenda e Financeiro. */',
    '/* KineSys 1.21.0 — financeiro canônico por agendamento. Núcleo financeiro eager; hooks da Agenda instalados após o bundle da Agenda. */',
    'Integration header'
)

icon_start = '    iconePagamentoAgendaHTML = function(a){'
icon_end = '\n\n    window.atualizarResumoPagamentoAgendamento'
icon_block, rest_after_icon = extract_between(integration, icon_start, icon_end, 'Agenda finance icon hook')
icon_function = icon_block.replace(icon_start, '    function iconePagamentoAgendaIntegradoHTML(a){', 1)
if not icon_function.rstrip().endswith('};'):
    raise SystemExit('Agenda finance icon hook: unexpected ending')
icon_function = icon_function.rstrip()[:-2] + '}'
# Reconstruct preserving the end anchor.
integration = integration[:integration.find(icon_start)] + icon_function + integration[integration.find(icon_end, integration.find(icon_start)):]

# Extract the immediate Agenda hook and reinstall it lazily after Screen Loader event.
detail_start = '    const abrirDetalheBase=abrirDetalheAgendamento;'
detail_end = '\n\n    async function renderizarHistoricoAtendimentos'
detail_pos = integration.find(detail_start)
if detail_pos < 0:
    raise SystemExit('Agenda detail hook: start anchor not found')
detail_end_pos = integration.find(detail_end, detail_pos)
if detail_end_pos < 0:
    raise SystemExit('Agenda detail hook: end anchor not found')
detail_block = integration[detail_pos:detail_end_pos]
inside = '\n'.join(('    ' + line) if line else line for line in detail_block.splitlines())
installer = """    let hooksAgendaFinanceiroInstalados=false;
    function instalarHooksAgendaFinanceiro(){
        if(hooksAgendaFinanceiroInstalados)return true;
        if(typeof abrirDetalheAgendamento!=='function'||typeof situacaoPagamentoAgenda!=='function'||typeof iconePagamentoAgendaHTML!=='function')return false;
        iconePagamentoAgendaHTML=iconePagamentoAgendaIntegradoHTML;
""" + inside + """
        hooksAgendaFinanceiroInstalados=true;
        return true;
    }
    document.addEventListener('kinesys:tela-modulos-prontos',event=>{
        if(event?.detail?.id==='tela_agenda')instalarHooksAgendaFinanceiro();
    });
    instalarHooksAgendaFinanceiro();
"""
integration = integration[:detail_pos] + installer + integration[detail_end_pos:]
INTEGRATION.write_text(integration, encoding='utf-8')

# ---------------------------------------------------------------------------
# 3) Bootstrap and Screen Loader: core eager, full Agenda lazy.
# ---------------------------------------------------------------------------
old_agenda_tag = '    <script defer src="agenda-1.20.0.js?v=20260901-r1"></script>'
new_core_tag = '    <script defer src="agenda_notificacoes_core-1.20.1.js?v=20260910-phase4b-r1"></script>'
html = replace_once(html, old_agenda_tag, new_core_tag, 'Agenda bootstrap tag')
html = replace_once(
    html,
    'screen_loader-1.25.0.js?v=20260910-phase4a-r1',
    'screen_loader-1.25.0.js?v=20260910-phase4b-r1',
    'Screen Loader cache tag'
)
html = replace_once(
    html,
    'financeiro_agendamento-1.21.0.js?v=20260904-integracao-r1',
    'financeiro_agendamento-1.21.0.js?v=20260910-phase4b-r1',
    'Finance Agenda integration cache tag'
)
INDEX.write_text(html, encoding='utf-8')

loader = replace_once(loader, "const VERSION='1.25.1-phase4a';", "const VERSION='1.25.2-phase4b';", 'Screen Loader version')
old_agenda_bundle = """        tela_agenda:Object.freeze({
            id:'agenda',
            styles:Object.freeze([
                'agenda_referencia-1.20.0.css?v=20260901-r1'
            ]),
            scripts:Object.freeze([])
        })
"""
new_agenda_bundle = """        tela_agenda:Object.freeze({
            id:'agenda',
            styles:Object.freeze([
                'agenda_referencia-1.20.0.css?v=20260901-r1'
            ]),
            scripts:Object.freeze([
                'agenda-1.20.0.js?v=20260910-phase4b-r1'
            ])
        })
"""
loader = replace_once(loader, old_agenda_bundle, new_agenda_bundle, 'Agenda lazy bundle')
LOADER.write_text(loader, encoding='utf-8')

# ---------------------------------------------------------------------------
# 4) Permanent contract: protect the split, late binding and browser bootstrap.
# ---------------------------------------------------------------------------
test = replace_once(test, "const assert=require('assert');\n", "const assert=require('assert');\nconst vm=require('vm');\n", 'VM test import')
test = replace_once(
    test,
    "const agendaLazyStyles=['agenda_referencia-1.20.0.css'];\n",
    "const agendaLazyScripts=['agenda-1.20.0.js'];\nconst agendaLazyStyles=['agenda_referencia-1.20.0.css'];\n",
    'Agenda lazy script list'
)
test = replace_once(
    test,
    "for(const file of financeLazyStyles)assertLazyAsset(file,'style');\nfor(const file of agendaLazyStyles)assertLazyAsset(file,'style');\n",
    "for(const file of financeLazyStyles)assertLazyAsset(file,'style');\nfor(const file of agendaLazyScripts)assertLazyAsset(file,'script');\nfor(const file of agendaLazyStyles)assertLazyAsset(file,'style');\n",
    'Agenda lazy script assertion'
)
old_eager = """const eagerSharedScripts=[
  'financeiro-1.19.0.js',
  'credito_cliente-1.19.0.js',
  'agenda-1.20.0.js',
  'financeiro_agendamento-1.21.0.js'
];
"""
new_eager = """const eagerSharedScripts=[
  'financeiro-1.19.0.js',
  'credito_cliente-1.19.0.js',
  'agenda_notificacoes_core-1.20.1.js',
  'financeiro_agendamento-1.21.0.js'
];
"""
test = replace_once(test, old_eager, new_eager, 'Eager shared scripts Phase 4B')
old_tail = """assert.match(html,/financeiro_agendamento-1\\.21\\.0\\.css/,'CSS da integração Agenda/Financeiro deve continuar eager');
assert.match(html,/design_agenda\\.css/,'CSS estrutural compartilhado da Agenda deve continuar eager nesta fase');
assert.match(app,/iniciarNotificacoesAgenda/,'bootstrap global de notificações da Agenda deve permanecer preservado');
assert.match(loader,/VERSION='1\\.25\\.1-phase4a'/,'Screen Loader deve identificar a Fase 4A');

const deferredRawBytes=145198+27284+2983;
console.log(`Screen Loader contract Phase 4A: Avaliação continua sob demanda; Financeiro adia ${financeLazyScripts.length} JS + ${financeLazyStyles.length} CSS e Agenda adia ${agendaLazyStyles.length} CSS (${deferredRawBytes} bytes brutos retirados do bootstrap).`);
"""
new_tail = """assert.match(html,/financeiro_agendamento-1\\.21\\.0\\.css/,'CSS da integração Agenda/Financeiro deve continuar eager');
assert.match(html,/design_agenda\\.css/,'CSS estrutural compartilhado da Agenda deve continuar eager nesta fase');
assert.match(app,/iniciarNotificacoesAgenda/,'bootstrap global deve continuar iniciando notificações após login');
assert.match(loader,/VERSION='1\\.25\\.2-phase4b'/,'Screen Loader deve identificar a Fase 4B');

const agendaModule=fs.readFileSync('agenda-1.20.0.js','utf8');
const notificationCore=fs.readFileSync('agenda_notificacoes_core-1.20.1.js','utf8');
const financeAgendaIntegration=fs.readFileSync('financeiro_agendamento-1.21.0.js','utf8');
assert.match(notificationCore,/function iniciarNotificacoesAgenda\\(/,'núcleo eager deve preservar iniciarNotificacoesAgenda');
assert.match(notificationCore,/function pararNotificacoesAgenda\\(/,'núcleo eager deve preservar pararNotificacoesAgenda');
assert.match(notificationCore,/function sincronizarNotificacoesPendentesAgenda\\(/,'núcleo eager deve preservar sincronização da fila de avisos');
assert.match(notificationCore,/KineSysScreenLoader\\?\\.ensure\\)\\s*\\{[\\s\\S]*ensure\\('tela_agenda'\\)/,'clique em aviso deve preparar Agenda lazy antes de usar seu estado');
assert.doesNotMatch(agendaModule,/function iniciarNotificacoesAgenda\\(/,'módulo pesado não deve duplicar polling global');
assert.doesNotMatch(agendaModule,/let agendaNotificacoesTimer\\s*=/,'estado global de polling deve existir somente no núcleo eager');
assert.match(agendaModule,/document\\.readyState === 'loading'/,'Agenda deve inicializar eventos mesmo após DOMContentLoaded');
assert.match(financeAgendaIntegration,/function instalarHooksAgendaFinanceiro\\(/,'integração deve possuir instalador tardio dos hooks da Agenda');
assert.match(financeAgendaIntegration,/kinesys:tela-modulos-prontos/,'integração deve aguardar o bundle da Agenda antes de sobrescrever hooks');

const coreBytes=fs.statSync('agenda_notificacoes_core-1.20.1.js').size;
const agendaLazyBytes=fs.statSync('agenda-1.20.0.js').size;
assert.ok(coreBytes<20000,`núcleo de notificações deve permanecer pequeno; atual ${coreBytes} bytes`);
assert.ok(agendaLazyBytes>180000,`módulo pesado da Agenda deve permanecer efetivamente fora do bootstrap; atual ${agendaLazyBytes} bytes`);

// Smoke test: the eager integration must execute while Agenda globals are absent.
const fakeDocument={
  readyState:'complete',
  getElementById(){return null;},
  addEventListener(){},
  querySelector(){return null;},
  querySelectorAll(){return [];}
};
const integrationContext={
  console,
  window:{},
  document:fakeDocument,
  setTimeout(){return 0;},
  clearTimeout(){},
  alert(){},
  _supabase:null,
  moedaBR:null,
  escapeHTML:null,
  numeroFinanceiro:null,
  obterMapaPagamentoAgendamentos:async()=>new Map(),
  obterSituacaoPagamentoAgendamento:async()=>({}),
  salvarPagamentoFinanceiro:async()=>true,
  renderizarFinanceiroPaciente(){},
};
assert.doesNotThrow(()=>vm.runInNewContext(financeAgendaIntegration,integrationContext,{timeout:1000}),'integração eager não pode exigir Agenda já carregada');

const deferredRawBytes=145198+27284+2983;
console.log(`Screen Loader contract Phase 4B: Financeiro mantém ${deferredRawBytes} bytes brutos adiados da 4A; Agenda completa agora é lazy (${agendaLazyBytes} bytes), preservando núcleo global de notificações eager (${coreBytes} bytes).`);
"""
test = replace_once(test, old_tail, new_tail, 'Phase 4B contract tail')
TEST.write_text(test, encoding='utf-8')

# Screen Loader workflow must keep watching the newly split runtime.
path_anchor = "      - 'script-1.18.0.js'\n"
path_expansion = "      - 'script-1.18.0.js'\n      - 'agenda-1.20.0.js'\n      - 'agenda_notificacoes_core-1.20.1.js'\n      - 'financeiro_agendamento-1.21.0.js'\n"
if workflow.count(path_anchor) != 2:
    raise SystemExit(f'Screen Loader workflow path anchor: expected 2, found {workflow.count(path_anchor)}')
workflow = workflow.replace(path_anchor, path_expansion)
syntax_anchor = "          node --check script-1.18.0.js\n"
syntax_expansion = """          node --check script-1.18.0.js
          node --check agenda-1.20.0.js
          node --check agenda_notificacoes_core-1.20.1.js
          node --check financeiro_agendamento-1.21.0.js
"""
workflow = replace_once(workflow, syntax_anchor, syntax_expansion, 'Screen Loader workflow syntax checks')
WORKFLOW.write_text(workflow, encoding='utf-8')

print(f'Phase 4B prepared. Agenda original={original_agenda_bytes} bytes; lazy={len(agenda.encode("utf-8"))}; notification core={len(core.encode("utf-8"))}.')
