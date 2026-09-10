from pathlib import Path


def require_once(text, needle, label):
    count = text.count(needle)
    if count != 1:
        raise SystemExit(f'{label}: esperado 1 ocorrência, encontrado {count}')

agenda_path = Path('agenda-1.20.0.js')
agenda = agenda_path.read_text(encoding='utf-8')

# 1) Extrai helpers + runtime global de notificações, mantendo o registro de
# horário extraordinário no módulo completo da Agenda.
start_a = 'function lerNotificacoesPendentesAgenda() {'
end_a = 'function formatarDataAgendaBR(dataISO) {'
require_once(agenda, start_a, 'inicio helpers notificações')
require_once(agenda, end_a, 'fim helpers notificações')
a0 = agenda.index(start_a)
a1 = agenda.index(end_a, a0)
helpers_notif = agenda[a0:a1]
agenda = agenda[:a0] + agenda[a1:]

start_b = 'async function sincronizarNotificacoesPendentesAgenda() {'
end_b = "document.addEventListener('DOMContentLoaded', () => {"
require_once(agenda, start_b, 'inicio runtime notificações')
require_once(agenda, end_b, 'fim runtime notificações')
b0 = agenda.index(start_b)
b1 = agenda.index(end_b, b0)
runtime_notif = agenda[b0:b1]
agenda = agenda[:b0] + agenda[b1:]

# 2) O único inicializador preso ao DOMContentLoaded precisa funcionar quando
# agenda-1.20.0.js for carregado depois que o DOM já estiver pronto.
dom_start = "document.addEventListener('DOMContentLoaded', () => {"
dom_end = 'function fecharModal(id) {'
require_once(agenda, dom_start, 'DOMContentLoaded Agenda')
require_once(agenda, dom_end, 'fecharModal Agenda')
d0 = agenda.index(dom_start)
d1 = agenda.index(dom_end, d0)
new_dom = """function inicializarDomAgendaKineSys() {
    atualizarVisibilidadeAuditoriaStatusAgenda();
    document.querySelectorAll('.modal-overlay').forEach(overlay => {
        if (overlay.dataset.kinesysAgendaOverlayBound === '1') return;
        overlay.dataset.kinesysAgendaOverlayBound = '1';
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) fecharModal(overlay.id);
        });
    });
}
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', inicializarDomAgendaKineSys, { once:true });
} else {
    inicializarDomAgendaKineSys();
}

"""
agenda = agenda[:d0] + new_dom + agenda[d1:]
agenda_path.write_text(agenda, encoding='utf-8')

# 3) Monta núcleo eager pequeno. Estado das notificações fica encapsulado para
# não colidir com os lets históricos ainda presentes no arquivo completo.
notif = helpers_notif + runtime_notif
notif = notif.replace('AGENDA_NOTIFICACOES_PENDENTES_KEY', 'NOTIFICACOES_PENDENTES_KEY')
notif = notif.replace('agendaNotificacoesCache', 'notificacoesCache')
notif = notif.replace('agendaNotificacoesTimer', 'notificacoesTimer')
notif = notif.replace('agendaNotificacoesPrimeiraCarga', 'notificacoesPrimeiraCarga')
notif = notif.replace('perfilAgendaAtual()', 'perfilNotificacoesAgendaAtual()')
old_open = """    if (n.agendamento_data) agendaDataSelecionada = new Date(n.agendamento_data + 'T00:00:00');
    if (typeof navegarPara === 'function') navegarPara('tela_agenda');
    await renderizarPainelAgenda();
    if (n.agendamento_id) setTimeout(() => abrirDetalheAgendamento(String(n.agendamento_id)), 80);
"""
new_open = """    const loader = typeof window !== 'undefined' ? window.KineSysScreenLoader : null;
    if (loader && typeof loader.ensure === 'function') {
        try { await loader.ensure('tela_agenda'); }
        catch (error) {
            console.error('Agenda: não foi possível carregar a tela a partir da notificação.', error);
            if (typeof mostrarToastKineSys === 'function') mostrarToastKineSys('Não foi possível abrir a Agenda agora.', 'erro', 5000);
            return;
        }
    }
    if (n.agendamento_data && typeof agendaDataSelecionada !== 'undefined') agendaDataSelecionada = new Date(n.agendamento_data + 'T00:00:00');
    if (typeof navegarPara === 'function') await Promise.resolve(navegarPara('tela_agenda'));
    if (typeof renderizarPainelAgenda === 'function') await renderizarPainelAgenda();
    if (n.agendamento_id && typeof abrirDetalheAgendamento === 'function') setTimeout(() => abrirDetalheAgendamento(String(n.agendamento_id)), 80);
"""
require_once(notif, old_open, 'abertura notificação para lazy Agenda')
notif = notif.replace(old_open, new_open)

core = f"""/* ==========================================================================
   KineSys — Agenda Runtime Core v1.20.0 / Phase 4B
   Núcleo eager mínimo: notificações globais, escopo do profissional e ponte
   da fila offline. A UI completa permanece em agenda-1.20.0.js sob demanda.
   ========================================================================== */
(function(){{
'use strict';

const NOTIFICACOES_PENDENTES_KEY = 'kinesys_notificacoes_pendentes_v1';
const AGENDA_SYNC_CORE_KEY = 'kinesys_agendamentos_pendentes_sync_v1';
let notificacoesCache = [];
let notificacoesTimer = null;
let notificacoesPrimeiraCarga = true;
let equipeCoreCache = [];

function perfilNotificacoesAgendaAtual() {{
    return String(typeof usuarioLogado !== 'undefined' && usuarioLogado?.tipo || '').toUpperCase();
}}
function usuarioEhAdministradorAgendaCore() {{
    return ['MASTER','MASTER_FEM','ADMINISTRADOR','ADMINISTRADORA'].includes(perfilNotificacoesAgendaAtual());
}}
function usuarioPodeVerAgendaClinicaTodaCore() {{
    return usuarioEhAdministradorAgendaCore() || perfilNotificacoesAgendaAtual() === 'SECRETARIA';
}}
function encontrarProfissionalAgendaCore() {{
    if (typeof usuarioLogado === 'undefined' || !usuarioLogado || !equipeCoreCache.length) return null;
    const idUsuario = String(usuarioLogado.id || '').trim();
    const emailUsuario = String(usuarioLogado.email || '').trim().toLowerCase();
    const nomeUsuario = String(usuarioLogado.nome || '').trim().toLowerCase();
    return equipeCoreCache.find(p => idUsuario && String(p.id || '').trim() === idUsuario)
        || equipeCoreCache.find(p => emailUsuario && String(p.email || '').trim().toLowerCase() === emailUsuario)
        || equipeCoreCache.find(p => nomeUsuario && String(p.nome || '').trim().toLowerCase() === nomeUsuario)
        || null;
}}
async function carregarProfissionaisAgendaCore() {{
    if (typeof _supabase === 'undefined' || !_supabase) return false;
    const identidadeInicial = String(typeof usuarioLogado !== 'undefined' && usuarioLogado?.id || '');
    const clinicaInicial = String(typeof usuarioLogado !== 'undefined' && usuarioLogado?.clinica_id || '');
    const resposta = await _supabase.rpc('kinesys_contexto_agenda');
    let error = resposta.error;
    const contexto = resposta.data;
    if (!error && (!identidadeInicial || String(contexto?.perfil_id || '') !== identidadeInicial
        || String(contexto?.clinica_id || '') !== clinicaInicial
        || String(usuarioLogado?.id || '') !== identidadeInicial
        || String(usuarioLogado?.clinica_id || '') !== clinicaInicial)) error = {{message:'A sessão mudou. Entre novamente.'}};
    if (error) {{
        console.warn('Erro ao carregar equipe para agenda:', error);
        equipeCoreCache = [];
        return false;
    }}
    equipeCoreCache = (contexto?.profissionais || [])
        .filter(p => p.aparece_na_agenda === true)
        .sort((a,b) => String(a.nome || '').localeCompare(String(b.nome || ''), 'pt-BR'));
    return true;
}}
function profissionalAgendaRestritoAtualIdCore() {{
    if (usuarioPodeVerAgendaClinicaTodaCore()) return '';
    return String(encontrarProfissionalAgendaCore()?.id || '');
}}

function lerAgendamentosPendentesSyncCore() {{
    try {{
        const bruto = localStorage.getItem(AGENDA_SYNC_CORE_KEY);
        const lista = bruto ? JSON.parse(bruto) : [];
        return Array.isArray(lista) ? lista.filter(x => x && x.payload && x.payload.id) : [];
    }} catch (_) {{ return []; }}
}}
function gravarAgendamentosPendentesSyncCore(lista) {{
    try {{ localStorage.setItem(AGENDA_SYNC_CORE_KEY, JSON.stringify(Array.isArray(lista) ? lista : [])); return true; }}
    catch (_) {{ return false; }}
}}
function salvarAgendamentoPendenteSyncCore(payload, metadados = {{}}) {{
    if (!payload?.id) return false;
    const lista = lerAgendamentosPendentesSyncCore();
    const idx = lista.findIndex(x => String(x.payload?.id || '') === String(payload.id));
    const anterior = idx >= 0 ? lista[idx] : {{}};
    const item = {{...anterior,payload:{{...(anterior.payload||{{}}),...payload}},metadados:{{...(anterior.metadados||{{}}),...(metadados||{{}})}},criado_em_local:anterior.criado_em_local||new Date().toISOString(),atualizado_em_local:new Date().toISOString(),tentativas:Number(anterior.tentativas||0),ultimo_erro:String(metadados?.ultimo_erro||anterior.ultimo_erro||''),conflito_sync:false}};
    if (idx >= 0) lista[idx] = item; else lista.push(item);
    return gravarAgendamentosPendentesSyncCore(lista);
}}
function atualizarPayloadAgendamentoPendenteSyncCore(id, alteracoes = {{}}) {{
    const lista = lerAgendamentosPendentesSyncCore();
    const idx = lista.findIndex(x => String(x.payload?.id || '') === String(id || ''));
    if (idx < 0) return false;
    lista[idx] = {{...lista[idx],payload:{{...(lista[idx].payload||{{}}),...(alteracoes||{{}})}},atualizado_em_local:new Date().toISOString()}};
    return gravarAgendamentosPendentesSyncCore(lista);
}}
function removerAgendamentoPendenteSyncCore(id) {{
    return gravarAgendamentosPendentesSyncCore(lerAgendamentosPendentesSyncCore().filter(x => String(x.payload?.id || '') !== String(id || '')));
}}
function atualizarAgendamentoPendenteSyncCore(id, alteracoes = {{}}) {{
    const lista = lerAgendamentosPendentesSyncCore();
    const idx = lista.findIndex(x => String(x.payload?.id || '') === String(id || ''));
    if (idx < 0) return false;
    lista[idx] = {{...lista[idx],...(alteracoes||{{}}),atualizado_em_local:new Date().toISOString()}};
    return gravarAgendamentosPendentesSyncCore(lista);
}}
async function sincronizarAgendamentosPendentesCore(opcoes = {{}}) {{
    if (!lerAgendamentosPendentesSyncCore().length) return true;
    if (typeof _supabase === 'undefined' || !_supabase) return false;
    const bridge = window.sincronizarAgendamentosPendentes;
    const loader = window.KineSysScreenLoader;
    if (!loader || typeof loader.ensure !== 'function') return false;
    try {{
        await loader.ensure('tela_agenda');
        const real = window.sincronizarAgendamentosPendentes;
        if (typeof real === 'function' && real !== bridge) return real(opcoes);
    }} catch (error) {{
        console.warn('Agenda: fila pendente aguardando carregamento do módulo completo.', error);
    }}
    return false;
}}

if (typeof window !== 'undefined') {{
    if (typeof window.fecharModal !== 'function') window.fecharModal = id => {{ const el=document.getElementById(id); if(el) el.classList.remove('ativa'); }};
    if (typeof window.abrirModal !== 'function') window.abrirModal = id => {{ const el=document.getElementById(id); if(el) el.classList.add('ativa'); }};
    window.carregarProfissionaisAgenda = carregarProfissionaisAgendaCore;
    window.profissionalAgendaRestritoAtualId = profissionalAgendaRestritoAtualIdCore;
    window.usuarioEhAdministradorAgenda = usuarioEhAdministradorAgendaCore;
    window.usuarioPodeVerAgendaClinicaToda = usuarioPodeVerAgendaClinicaTodaCore;
    window.lerAgendamentosPendentesSync = lerAgendamentosPendentesSyncCore;
    window.gravarAgendamentosPendentesSync = gravarAgendamentosPendentesSyncCore;
    window.salvarAgendamentoPendenteSync = salvarAgendamentoPendenteSyncCore;
    window.atualizarPayloadAgendamentoPendenteSync = atualizarPayloadAgendamentoPendenteSyncCore;
    window.removerAgendamentoPendenteSync = removerAgendamentoPendenteSyncCore;
    window.atualizarAgendamentoPendenteSync = atualizarAgendamentoPendenteSyncCore;
    window.sincronizarAgendamentosPendentes = sincronizarAgendamentosPendentesCore;
}}

{notif}

if (typeof window !== 'undefined') {{
    window.lerNotificacoesPendentesAgenda = lerNotificacoesPendentesAgenda;
    window.gravarNotificacoesPendentesAgenda = gravarNotificacoesPendentesAgenda;
    window.enfileirarNotificacaoAgenda = enfileirarNotificacaoAgenda;
    window.removerNotificacaoPendenteAgenda = removerNotificacaoPendenteAgenda;
    window.erroSchemaNotificacoesAgenda = erroSchemaNotificacoesAgenda;
    window.sincronizarNotificacoesPendentesAgenda = sincronizarNotificacoesPendentesAgenda;
}}
}})();
"""
Path('agenda_runtime_core-1.20.0.js').write_text(core, encoding='utf-8')

# 4) Integração financeiro-agenda: ela deve poder carregar antes da UI da Agenda.
fin_path = Path('financeiro_agendamento-1.21.0.js')
fin = fin_path.read_text(encoding='utf-8')
icon_old = """    iconePagamentoAgendaHTML = function(a){
        if(typeof usuarioEhAdministradorAgenda==='function'&&!usuarioEhAdministradorAgenda())return '';
        const s=typeof situacaoPagamentoAgenda==='function'?situacaoPagamentoAgenda(a):null;
        if(!s?.verificado)return '<span class=\"agenda-fin-icone desconhecido\" title=\"Situação financeira indisponível\">$</span>';
        const cls=s.pago?'pago':(s.parcial?'parcial':'pendente');
        const titulo=s.pago?'Pagamento quitado':s.parcial?`Pagamento parcial · pendente ${{fmt(s.valorPendente)}}`:`Pagamento pendente · ${{fmt(s.valorPendente)}}`;
        return `<span class=\"agenda-fin-icone ${{cls}}\" title=\"${{esc(titulo)}}\" aria-label=\"${{esc(titulo)}}\">$</span>`;
    };
"""
icon_new = icon_old.replace('    iconePagamentoAgendaHTML = function(a){','    const iconePagamentoAgendaHTMLIntegrado = function(a){')
require_once(fin, icon_old, 'ícone financeiro da Agenda')
fin = fin.replace(icon_old, icon_new)

wrap_start = '    const abrirDetalheBase=abrirDetalheAgendamento;\n    abrirDetalheAgendamento=async function(id){'
wrap_end = '\n\n    async function renderizarHistoricoAtendimentos(){'
require_once(fin, wrap_start, 'wrapper detalhe financeiro')
require_once(fin, wrap_end, 'fim wrapper detalhe financeiro')
w0 = fin.index(wrap_start)
w1 = fin.index(wrap_end, w0)
block = fin[w0:w1]
body_start = block.index('    abrirDetalheAgendamento=async function(id){') + len('    abrirDetalheAgendamento=async function(id){')
body_end = block.rfind('\n    };')
body = block[body_start:body_end]
installer = f"""    function instalarIntegracaoFinanceiroAgenda(){{
        if(typeof abrirDetalheAgendamento!=='function') return false;
        iconePagamentoAgendaHTML=iconePagamentoAgendaHTMLIntegrado;
        if(abrirDetalheAgendamento.__kinesysFinanceiroAgendaIntegrado===true) return true;
        const abrirDetalheBase=abrirDetalheAgendamento;
        const abrirDetalheIntegrado=async function(id){{{body}
        }};
        abrirDetalheIntegrado.__kinesysFinanceiroAgendaIntegrado=true;
        abrirDetalheAgendamento=abrirDetalheIntegrado;
        return true;
    }}
    window.instalarIntegracaoFinanceiroAgenda=instalarIntegracaoFinanceiroAgenda;
    instalarIntegracaoFinanceiroAgenda();
"""
fin = fin[:w0] + installer + fin[w1:]
fin_path.write_text(fin, encoding='utf-8')

# 5) Reaplica proteções de clique somente depois que as funções lazy existirem.
app_path = Path('script-1.18.0.js')
app = app_path.read_text(encoding='utf-8')
agenda_protections = """        protegerFuncaoKineSys('salvarProcedimento', ()=>'agenda-procedimento', null, 'Salvando…');
        protegerFuncaoKineSys('salvarHorario', ()=>'agenda-horario', null, 'Salvando…');
        protegerFuncaoKineSys('salvarGradeSemanal', ()=>'agenda-grade-semanal', '#btn_salvar_grade_semanal', 'Salvando grade…');
        protegerFuncaoKineSys('salvarBloqueio', ()=>'agenda-bloqueio', null, 'Salvando…');
        protegerFuncaoKineSys('salvarAgendamento', ()=>'agenda-agendamento', '#btn_salvar_agendamento', 'Salvando…');
        protegerFuncaoKineSys('salvarListaEspera', ()=>'agenda-lista-espera', null, 'Adicionando…');
        protegerFuncaoKineSys('abrirOfertaListaEspera', (...args)=>'agenda-reencaixe-'+args.join('|'), null, 'Confirmando…');
"""
require_once(app, agenda_protections, 'proteções Agenda')
protection_fn = """function aplicarProtecoesAgendaKineSys(){
    if(window.__kinesysAgendaProtecoesAplicadas===true) return true;
    const obrigatorias=['salvarProcedimento','salvarHorario','salvarGradeSemanal','salvarBloqueio','salvarAgendamento','salvarListaEspera','abrirOfertaListaEspera'];
    if(obrigatorias.some(nome=>typeof window[nome]!=='function')) return false;
    protegerFuncaoKineSys('salvarProcedimento', ()=>'agenda-procedimento', null, 'Salvando…');
    protegerFuncaoKineSys('salvarHorario', ()=>'agenda-horario', null, 'Salvando…');
    protegerFuncaoKineSys('salvarGradeSemanal', ()=>'agenda-grade-semanal', '#btn_salvar_grade_semanal', 'Salvando grade…');
    protegerFuncaoKineSys('salvarBloqueio', ()=>'agenda-bloqueio', null, 'Salvando…');
    protegerFuncaoKineSys('salvarAgendamento', ()=>'agenda-agendamento', '#btn_salvar_agendamento', 'Salvando…');
    protegerFuncaoKineSys('salvarListaEspera', ()=>'agenda-lista-espera', null, 'Adicionando…');
    protegerFuncaoKineSys('abrirOfertaListaEspera', (...args)=>'agenda-reencaixe-'+args.join('|'), null, 'Confirmando…');
    window.__kinesysAgendaProtecoesAplicadas=true;
    return true;
}
window.aplicarProtecoesAgendaKineSys=aplicarProtecoesAgendaKineSys;

"""
anchor = '// Proteção de gravações críticas contra cliques repetidos. A trava permanece até a Promise terminar.\n'
require_once(app, anchor, 'âncora proteções')
app = app.replace(anchor, protection_fn + anchor)
app = app.replace(agenda_protections, "        aplicarProtecoesAgendaKineSys();\n")
app_path.write_text(app, encoding='utf-8')

# 6) Screen Loader passa a carregar a Agenda completa no primeiro acesso e
# reinstala os hooks que dependem das funções recém-carregadas.
loader_path = Path('screen_loader-1.25.0.js')
loader = loader_path.read_text(encoding='utf-8')
require_once(loader, "const VERSION='1.25.1-phase4a';", 'versão loader 4A')
loader = loader.replace("const VERSION='1.25.1-phase4a';", "const VERSION='1.25.2-phase4b';")
old_bundle = """    tela_agenda:Object.freeze({
      id:'agenda',
      styles:Object.freeze([
        'agenda_referencia-1.20.0.css?v=20260901-r1'
      ]),
      scripts:Object.freeze([])
    })
"""
new_bundle = """    tela_agenda:Object.freeze({
      id:'agenda',
      styles:Object.freeze([
        'agenda_referencia-1.20.0.css?v=20260901-r1'
      ]),
      scripts:Object.freeze([
        'agenda-1.20.0.js?v=20260910-phase4b-r1'
      ])
    })
"""
require_once(loader, old_bundle, 'bundle Agenda 4A')
loader = loader.replace(old_bundle, new_bundle)
load_line = '      await carregarScripts(bundle.scripts);\n'
require_once(loader, load_line, 'carregar scripts bundle')
load_new = load_line + "      if(idTela==='tela_agenda'){\n        try{window.instalarIntegracaoFinanceiroAgenda?.();}catch(error){console.error('KineSys Screen Loader: integração Agenda/Financeiro falhou.',error);}\n        try{window.aplicarProtecoesAgendaKineSys?.();}catch(error){console.error('KineSys Screen Loader: proteções da Agenda falharam.',error);}\n      }\n"
loader = loader.replace(load_line, load_new)
loader_path.write_text(loader, encoding='utf-8')

# 7) Bootstrap: núcleo pequeno eager; Agenda grande sai do index.
index_path = Path('index.html')
html = index_path.read_text(encoding='utf-8')
require_once(html, 'screen_loader-1.25.0.js?v=20260910-phase4a-r1', 'cache bust loader 4A')
html = html.replace('screen_loader-1.25.0.js?v=20260910-phase4a-r1','screen_loader-1.25.0.js?v=20260910-phase4b-r1')
old_agenda_tag = '<script defer src="agenda-1.20.0.js?v=20260901-r1"></script>'
require_once(html, old_agenda_tag, 'Agenda eager')
html = html.replace(old_agenda_tag, '<script defer src="agenda_runtime_core-1.20.0.js?v=20260910-phase4b-r1"></script>')
index_path.write_text(html, encoding='utf-8')

# 8) Contrato dedicado da 4B.
test = r'''\'use strict\';
const fs=require('fs');
const assert=require('assert');
const html=fs.readFileSync('index.html','utf8');
const loader=fs.readFileSync('screen_loader-1.25.0.js','utf8');
const core=fs.readFileSync('agenda_runtime_core-1.20.0.js','utf8');
const agenda=fs.readFileSync('agenda-1.20.0.js','utf8');
const finAg=fs.readFileSync('financeiro_agendamento-1.21.0.js','utf8');
const app=fs.readFileSync('script-1.18.0.js','utf8');
assert.match(html,/agenda_runtime_core-1\.20\.0\.js/,'núcleo da Agenda deve continuar eager');
assert.doesNotMatch(html,/<script[^>]+agenda-1\.20\.0\.js/i,'Agenda completa não pode voltar ao bootstrap');
assert.match(loader,/tela_agenda\s*:/,'bundle da Agenda deve existir');
assert.ok(loader.includes('agenda-1.20.0.js?v=20260910-phase4b-r1'),'Agenda completa deve estar no bundle lazy');
assert.match(loader,/VERSION='1\.25\.2-phase4b'/,'loader deve identificar Phase 4B');
for(const symbol of ['iniciarNotificacoesAgenda','pararNotificacoesAgenda','sincronizarNotificacoesPendentesAgenda','carregarProfissionaisAgenda','profissionalAgendaRestritoAtualId','lerAgendamentosPendentesSync','atualizarPayloadAgendamentoPendenteSync']) assert.ok(core.includes(symbol),`core deve preservar ${symbol}`);
assert.match(core,/KineSysScreenLoader/,'notificação deve garantir Agenda antes de abrir detalhe');
assert.doesNotMatch(agenda,/function lerNotificacoesPendentesAgenda\s*\(/,'helpers de notificação não devem permanecer duplicados na Agenda completa');
assert.doesNotMatch(agenda,/async function sincronizarNotificacoesPendentesAgenda\s*\(/,'runtime global de notificações não deve permanecer duplicado');
assert.match(agenda,/function inicializarDomAgendaKineSys\s*\(/,'Agenda lazy deve ter inicialização DOM tardia');
assert.match(agenda,/document\.readyState === 'loading'/,'inicialização DOM deve funcionar antes/depois de DOMContentLoaded');
assert.match(finAg,/function instalarIntegracaoFinanceiroAgenda\s*\(/,'integração financeira deve aceitar Agenda tardia');
assert.match(finAg,/__kinesysFinanceiroAgendaIntegrado/,'wrapper financeiro deve ser idempotente');
assert.match(loader,/instalarIntegracaoFinanceiroAgenda/,'loader deve reinstalar integração depois da Agenda');
assert.match(app,/function aplicarProtecoesAgendaKineSys\s*\(/,'proteções de gravação devem poder ser aplicadas após lazy load');
assert.match(loader,/aplicarProtecoesAgendaKineSys/,'loader deve reaplicar proteções da Agenda');
console.log('Agenda lazy contract Phase 4B: núcleo global preservado e UI completa sob demanda.');
'''
Path('tests/agenda_lazy.contract.js').write_text(test, encoding='utf-8')

print('Phase 4B transformation complete')
print('agenda full bytes:', agenda_path.stat().st_size)
print('agenda core bytes:', Path('agenda_runtime_core-1.20.0.js').stat().st_size)
