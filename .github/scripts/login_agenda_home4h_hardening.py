from pathlib import Path

# Estado operacional: terminal/current deve prevalecer sobre a origem por reagendamento.
p=Path('home_fisioterapeuta_util-1.24.0.js')
s=p.read_text(encoding='utf-8')
old="""        if(status==='cancelado') return {rotulo:'Cancelado',classe:'is-cancelled'};
        if(agendamentoEhReagendadoHome(agendamento)) return {rotulo:'Remarcado',classe:'is-rescheduled'};
        if(status==='falta_justificada'||status==='faltou') return {rotulo:'Falta justificada',classe:'is-absence'};
        if(status==='falta_nao_justificada') return {rotulo:'Falta não justificada',classe:'is-absence'};
        if(STATUS_CONCLUIDOS.has(status)) return {rotulo:'Atendimento concluído',classe:'is-done'};
        if(status==='em_recepcao') return {rotulo:'A ser atendido',classe:'is-waiting'};
        const inicio=horaMinutos(agendamento?.hora_inicio);
        const fim=horaMinutos(agendamento?.hora_fim);
        if(inicio!==null && agoraMin>=inicio && agoraMin<(fim!==null?fim:inicio+60)) return {rotulo:'Em atendimento',classe:'is-current'};
        return {rotulo:'A ser atendido',classe:'is-upcoming'};"""
new="""        if(status==='cancelado') return {rotulo:'Cancelado',classe:'is-cancelled'};
        if(status==='falta_justificada'||status==='faltou') return {rotulo:'Falta justificada',classe:'is-absence'};
        if(status==='falta_nao_justificada') return {rotulo:'Falta não justificada',classe:'is-absence'};
        if(STATUS_CONCLUIDOS.has(status)) return {rotulo:'Atendimento concluído',classe:'is-done'};
        if(status==='em_recepcao') return {rotulo:'A ser atendido',classe:'is-waiting'};
        const inicio=horaMinutos(agendamento?.hora_inicio);
        const fim=horaMinutos(agendamento?.hora_fim);
        if(inicio!==null && agoraMin>=inicio && agoraMin<(fim!==null?fim:inicio+60)) return {rotulo:'Em atendimento',classe:'is-current'};
        if(agendamentoEhReagendadoHome(agendamento)) return {rotulo:'Remarcado',classe:'is-rescheduled'};
        return {rotulo:'A ser atendido',classe:'is-upcoming'};"""
if old in s:
    s=s.replace(old,new,1)
elif new not in s:
    raise AssertionError('bloco de prioridade de status não corresponde ao esperado')
p.write_text(s,encoding='utf-8')

# A tabela agora possui 7 colunas em todos os estados.
p=Path('script-1.18.0.js')
s=p.read_text(encoding='utf-8')
start=s.index('async function carregarListaEquipe()')
end=s.index('\nasync function reativarFuncionario',start)
bloco=s[start:end]
bloco=bloco.replace('colspan="6"','colspan="7"')
s=s[:start]+bloco+s[end:]
p.write_text(s,encoding='utf-8')

# Teste permanente: prioridade de estado e alinhamento estrutural da tabela.
p=Path('tests/access_agenda_home4h.contract.js')
s=p.read_text(encoding='utf-8')
anchor="assert.match(home,/rotulo:'A ser atendido'/,'Estado futuro deve existir');\n"
extra="""const statusBlock=bloco(home,'function situacaoTemporal','function diaSemanaISOHome');
assert.ok(statusBlock.indexOf("rotulo:'Atendimento concluído'") < statusBlock.indexOf("rotulo:'Remarcado'"),'Concluído deve prevalecer sobre origem por reagendamento');
assert.ok(statusBlock.indexOf("rotulo:'Em atendimento'") < statusBlock.indexOf("rotulo:'Remarcado'"),'Em atendimento deve prevalecer sobre origem por reagendamento');
assert.match(equipe,/colspan=\\"7\\"/,'Estados vazio/erro da tabela devem respeitar as sete colunas');
"""
if extra not in s:
    if anchor not in s: raise AssertionError('âncora do teste de status ausente')
    s=s.replace(anchor,anchor+extra,1)
p.write_text(s,encoding='utf-8')
print('Hardening de status e tabela aplicado.')