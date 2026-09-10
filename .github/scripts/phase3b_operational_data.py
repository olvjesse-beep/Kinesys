from pathlib import Path


def replace_exact(path, old, new, expected, label):
    p = Path(path)
    text = p.read_text(encoding='utf-8')
    count = text.count(old)
    if count != expected:
        raise SystemExit(f'{label}: expected {expected} match(es), found {count}')
    p.write_text(text.replace(old, new), encoding='utf-8')


# -----------------------------------------------------------------------------
# Agenda: use lightweight patient index for selectors and suspend background
# polling while the browser tab is hidden. No agenda semantics are changed.
# -----------------------------------------------------------------------------
agenda = Path('agenda-1.20.0.js')
text = agenda.read_text(encoding='utf-8')

anchor = "const AGENDA_NOTIFICACOES_PENDENTES_KEY = 'kinesys_notificacoes_pendentes_v1';\n"
helper = anchor + """
async function obterPacientesBasicosAgenda() {
    if (typeof obterPacientesBasicos === 'function') return obterPacientesBasicos();
    if (typeof obterPacientesSalvos === 'function') return obterPacientesSalvos();
    return [];
}
"""
if text.count(anchor) != 1:
    raise SystemExit(f'Agenda lightweight helper anchor: expected 1, found {text.count(anchor)}')
text = text.replace(anchor, helper, 1)

old_patients = "const pacientes = await obterPacientesSalvos();"
if text.count(old_patients) != 2:
    raise SystemExit(f'Agenda patient selectors: expected 2 heavy calls, found {text.count(old_patients)}')
text = text.replace(old_patients, "const pacientes = await obterPacientesBasicosAgenda();")

old_notification_start = """    setTimeout(async () => {
        renderizarIndicadorNotificacoesAgenda();
        await sincronizarNotificacoesPendentesAgenda().catch(()=>false);
        await carregarNotificacoesAgenda({ avisar:true });
    }, 220);
"""
new_notification_start = """    setTimeout(async () => {
        renderizarIndicadorNotificacoesAgenda();
        if (typeof document !== 'undefined' && document.visibilityState === 'hidden') return;
        await sincronizarNotificacoesPendentesAgenda().catch(()=>false);
        await carregarNotificacoesAgenda({ avisar:true });
    }, 220);
"""
if text.count(old_notification_start) != 1:
    raise SystemExit(f'Agenda notification startup: expected 1, found {text.count(old_notification_start)}')
text = text.replace(old_notification_start, new_notification_start, 1)

old_notification_timer = """    agendaNotificacoesTimer = setInterval(() => {
        sincronizarNotificacoesPendentesAgenda().catch(()=>false);
        carregarNotificacoesAgenda({ avisar:true }).catch(()=>[]);
    }, 60000);
"""
new_notification_timer = """    agendaNotificacoesTimer = setInterval(() => {
        if (typeof document !== 'undefined' && document.visibilityState !== 'visible') return;
        sincronizarNotificacoesPendentesAgenda().catch(()=>false);
        carregarNotificacoesAgenda({ avisar:true }).catch(()=>[]);
    }, 60000);
"""
if text.count(old_notification_timer) != 1:
    raise SystemExit(f'Agenda notification timer: expected 1, found {text.count(old_notification_timer)}')
text = text.replace(old_notification_timer, new_notification_timer, 1)

old_sync_timer = """    agendaSyncTimer = setInterval(() => {
        if (lerAgendamentosPendentesSync().length) sincronizarAgendamentosPendentes({ silencioso: true }).catch(console.warn);
    }, 20000);
"""
new_sync_timer = """    agendaSyncTimer = setInterval(() => {
        if (typeof document !== 'undefined' && document.visibilityState !== 'visible') return;
        if (lerAgendamentosPendentesSync().length) sincronizarAgendamentosPendentes({ silencioso: true }).catch(console.warn);
    }, 20000);
"""
if text.count(old_sync_timer) != 1:
    raise SystemExit(f'Agenda sync timer: expected 1, found {text.count(old_sync_timer)}')
text = text.replace(old_sync_timer, new_sync_timer, 1)

agenda.write_text(text, encoding='utf-8')


# -----------------------------------------------------------------------------
# Financeiro: patient selector needs only id/name/cpf, never clinical histories.
# -----------------------------------------------------------------------------
fin = Path('financeiro-1.19.0.js')
text = fin.read_text(encoding='utf-8')
old_fin = """async function popularPacientesFinanceiro(preSelecionado = '') {
    const sel = document.getElementById('financeiro_paciente_select');
    if (!sel) return;
    const pacientes = await obterPacientesSalvos();
"""
new_fin = """async function popularPacientesFinanceiro(preSelecionado = '') {
    const sel = document.getElementById('financeiro_paciente_select');
    if (!sel) return;
    const pacientes = typeof obterPacientesBasicos === 'function'
        ? await obterPacientesBasicos()
        : await obterPacientesSalvos();
"""
if text.count(old_fin) != 1:
    raise SystemExit(f'Finance patient selector: expected 1, found {text.count(old_fin)}')
text = text.replace(old_fin, new_fin, 1)
fin.write_text(text, encoding='utf-8')


# -----------------------------------------------------------------------------
# Permanent static contract for the operational modules.
# -----------------------------------------------------------------------------
test = Path('tests/operational_data_loading.contract.js')
test.write_text(r'''\'use strict\';
const fs=require('fs');
const assert=require('assert');

const agenda=fs.readFileSync('agenda-1.20.0.js','utf8');
const financeiro=fs.readFileSync('financeiro-1.19.0.js','utf8');

assert.match(agenda,/async function obterPacientesBasicosAgenda\(\)/,'Agenda must expose a lightweight patient adapter');
assert.match(agenda,/typeof obterPacientesBasicos === ['"]function['"]/,'Agenda adapter must prefer the lightweight global patient index');

const directHeavyAgenda=(agenda.match(/const pacientes = await obterPacientesSalvos\(\);/g)||[]).length;
assert.strictEqual(directHeavyAgenda,0,'Agenda selectors must not directly load every full patient chart');
const lightweightAgenda=(agenda.match(/const pacientes = await obterPacientesBasicosAgenda\(\);/g)||[]).length;
assert.strictEqual(lightweightAgenda,2,'Agenda appointment and waiting-list selectors must use lightweight patient data');

const notifStart=agenda.indexOf('function iniciarNotificacoesAgenda()');
assert.ok(notifStart>=0,'Agenda notification lifecycle must exist');
const notifChunk=agenda.slice(notifStart,notifStart+1800);
assert.match(notifChunk,/visibilityState === ['"]hidden['"]/, 'Agenda initial notification refresh must skip hidden tabs');
assert.match(notifChunk,/visibilityState !== ['"]visible['"]/, 'Agenda notification interval must stop work outside visible tabs');

const syncTimer=agenda.indexOf('agendaSyncTimer = setInterval');
assert.ok(syncTimer>=0,'Agenda reliable-sync timer must exist');
const syncChunk=agenda.slice(syncTimer,syncTimer+600);
assert.match(syncChunk,/visibilityState !== ['"]visible['"]/, 'Agenda sync interval must stop work outside visible tabs');

const finStart=financeiro.indexOf("async function popularPacientesFinanceiro(preSelecionado = '')");
assert.ok(finStart>=0,'Finance patient selector must exist');
const finChunk=financeiro.slice(finStart,finStart+850);
assert.match(finChunk,/obterPacientesBasicos\(\)/,'Finance patient selector must prefer lightweight patient data');
assert.doesNotMatch(finChunk,/avaliacoes\(\*\)|evolucoes\(\*\)/,'Finance selector cannot request clinical histories');

console.log('Operational Data Loading contract Phase 3B: Agenda/Finance selectors are lightweight and background polling sleeps when hidden.');
'''.replace("\\'use strict\\';","'use strict';"),encoding='utf-8')

print('Phase 3B operational-data rewrite prepared.')
