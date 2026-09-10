from pathlib import Path

agenda = Path('agenda-1.20.0.js')
text = agenda.read_text(encoding='utf-8')

# Add explicit relation contracts near Agenda configuration.
anchor = "const AGENDA_NOTIFICACOES_PENDENTES_KEY = 'kinesys_notificacoes_pendentes_v1';\n"
addition = anchor + """
const AGENDA_SELECT_SEMANA = '*, pacientes(id,nome,telefone,dependente,responsavel_nome,responsavel_parentesco,responsavel_telefone), procedimentos(nome,duracao_minutos), equipe(nome)';
const AGENDA_SELECT_SEMANA_LEGADO = '*, pacientes(id,nome,telefone), procedimentos(nome,duracao_minutos), equipe(nome)';
let agendaContatoResponsavelDisponivel = true;
"""
if text.count(anchor) != 1:
    raise SystemExit(f'Agenda query contract anchor: expected 1, found {text.count(anchor)}')
text = text.replace(anchor, addition, 1)

old = """    let query = _supabase.from('agendamentos')
        .select('*, pacientes(*), procedimentos(nome,duracao_minutos), equipe(nome)')
        .gte('data', formatarDataISO(inicio))
        .lte('data', formatarDataISO(fim))
        .neq('status', 'cancelado');
    if (profissionalEscopo) query = query.eq('profissional_id', profissionalEscopo);
    query = query.order('data').order('hora_inicio');
    const resultado = await query;
"""
new = """    const montarConsultaSemana = (selecao) => {
        let query = _supabase.from('agendamentos')
            .select(selecao)
            .gte('data', formatarDataISO(inicio))
            .lte('data', formatarDataISO(fim))
            .neq('status', 'cancelado');
        if (profissionalEscopo) query = query.eq('profissional_id', profissionalEscopo);
        return query.order('data').order('hora_inicio');
    };
    let resultado = await montarConsultaSemana(agendaContatoResponsavelDisponivel ? AGENDA_SELECT_SEMANA : AGENDA_SELECT_SEMANA_LEGADO);
    if (resultado.error && agendaContatoResponsavelDisponivel && /dependente|responsavel_nome|responsavel_parentesco|responsavel_telefone|schema cache|column .* does not exist/i.test(String(resultado.error?.message || resultado.error || ''))) {
        agendaContatoResponsavelDisponivel = false;
        resultado = await montarConsultaSemana(AGENDA_SELECT_SEMANA_LEGADO);
    }
"""
if text.count(old) != 1:
    raise SystemExit(f'Weekly Agenda query block: expected 1, found {text.count(old)}')
text = text.replace(old, new, 1)

agenda.write_text(text, encoding='utf-8')

# Extend the permanent operational contract. Scope the no-wildcard assertion to
# carregarAgendamentosSemana only; other independent Agenda queries are audited
# separately and are intentionally outside Phase 3C.
test = Path('tests/operational_data_loading.contract.js')
src = test.read_text(encoding='utf-8')
marker = "console.log('Operational Data Loading contract Phase 3B: Agenda/Finance selectors are lightweight and background polling sleeps when hidden.');\n"
extra = """const weekStart=agenda.indexOf('async function carregarAgendamentosSemana(inicio, fim, profissionalEscopo = \'\')');
const weekEnd=agenda.indexOf('function renderizarGradeSemanal',weekStart);
assert.ok(weekStart>=0&&weekEnd>weekStart,'Agenda week loader must exist');
const weekChunk=agenda.slice(weekStart,weekEnd);
assert.doesNotMatch(weekChunk,/pacientes\\(\\*\\)/,'Agenda week query must not request every patient column');
assert.match(agenda,/AGENDA_SELECT_SEMANA = ['\"][^'\"]*pacientes\\(id,nome,telefone,dependente,responsavel_nome,responsavel_parentesco,responsavel_telefone\\)/,'Agenda week query must request only patient identity/contact fields');
assert.match(agenda,/AGENDA_SELECT_SEMANA_LEGADO/,'Agenda must retain a legacy patient-contact select');
assert.match(weekChunk,/AGENDA_SELECT_SEMANA/,'Agenda week loader must use the explicit relation contract');
assert.match(agenda,/agendaContatoResponsavelDisponivel/,'Agenda must cache schema compatibility after a legacy fallback');

console.log('Operational Data Loading contract Phase 3C: Agenda/Finance selectors are lightweight, polling sleeps when hidden, and Agenda week joins only required patient fields.');
"""
if src.count(marker) != 1:
    raise SystemExit(f'Operational contract marker: expected 1, found {src.count(marker)}')
src = src.replace(marker, extra, 1)
test.write_text(src, encoding='utf-8')

print('Phase 3C Agenda query rewrite prepared.')
