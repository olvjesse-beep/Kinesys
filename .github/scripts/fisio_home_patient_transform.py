from pathlib import Path

home = Path('home_fisioterapeuta_util-1.24.0.js')
s = home.read_text(encoding='utf-8')

marker = "    async function carregarPainelFisioterapeutaUtil(){\n"
resolver = """    async function resolverProfissionalHomeFisioterapeuta(perfilInicial){
        const perfil=perfilInicial || (typeof usuarioLogado!=='undefined' ? usuarioLogado : null);
        const perfilId=String(perfil?.id||'').trim();
        const clinicaId=String(perfil?.clinica_id||'').trim();
        if(!perfilId) return '';
        const {data:contexto,error}=await _supabase.rpc('kinesys_contexto_agenda');
        if(error) throw error;
        if((typeof usuarioLogado!=='undefined'?usuarioLogado:null)!==perfilInicial) return '';
        if(String(contexto?.perfil_id||'')!==perfilId) throw new Error('A sessão mudou. Entre novamente.');
        if(clinicaId && String(contexto?.clinica_id||'')!==clinicaId) throw new Error('A clínica da sessão mudou. Entre novamente.');
        const profissionais=Array.isArray(contexto?.profissionais) ? contexto.profissionais : [];
        const proprio=profissionais.find(p=>String(p?.id||'')===perfilId && p?.aparece_na_agenda!==false);
        return String(proprio?.id||'');
    }

"""
assert s.count(marker) == 1, 'marcador do painel fisioterapeuta mudou'
s = s.replace(marker, resolver + marker, 1)

old_link = """        const perfilInicial=typeof usuarioLogado!=='undefined' ? usuarioLogado : null;
        try {
            if(typeof carregarProfissionaisAgenda!=='function' || !await carregarProfissionaisAgenda()) throw new Error('Equipe indisponível');
        } catch(_) {
            if((typeof usuarioLogado!=='undefined'?usuarioLogado:null)===perfilInicial) resumo.textContent='Não foi possível verificar seu vínculo com a agenda.';
            return;
        }
        if((typeof usuarioLogado!=='undefined'?usuarioLogado:null)!==perfilInicial) return;

        const profissionalId=typeof profissionalAgendaRestritoAtualId==='function'
            ? profissionalAgendaRestritoAtualId()
            : String(perfilInicial?.id||'');
"""
new_link = """        const perfilInicial=typeof usuarioLogado!=='undefined' ? usuarioLogado : null;
        let profissionalId='';
        try {
            profissionalId=await resolverProfissionalHomeFisioterapeuta(perfilInicial);
        } catch(_) {
            if((typeof usuarioLogado!=='undefined'?usuarioLogado:null)===perfilInicial) resumo.textContent='Não foi possível verificar seu vínculo com a agenda.';
            return;
        }
        if((typeof usuarioLogado!=='undefined'?usuarioLogado:null)!==perfilInicial) return;

"""
assert s.count(old_link) == 1, 'bloco de vínculo da agenda mudou'
s = s.replace(old_link, new_link, 1)

old_actions = """        const actions=document.createElement('div');
        actions.className='ks-fisio-day-actions';
        actions.appendChild(criarBotao('Prontuário','btn-secondary',()=>abrirProntuario(agendamento.paciente_id,nome)));
        const status=String(agendamento.status||'').toLowerCase();
        const ausencia=STATUS_AUSENCIA.has(status);
        if(!ausencia && !clinica.registroHoje){
            let label='Registrar evolução';
            if(clinica.modo==='avaliacao') label=clinica.familia==='avaliacao' && !clinica.primeiroAtendimentoClinica ? 'Registrar reavaliação' : 'Iniciar avaliação';
            actions.appendChild(criarBotao(label,'btn-primary',()=>abrirRegistroClinico(agendamento.paciente_id,clinica.modo,agendamento.id)));
        } else if(clinica.registroHoje && !ausencia){
            const done=document.createElement('span');
            done.className='ks-fisio-record-done';
            done.textContent='Registro concluído';
            actions.appendChild(done);
        }
"""
new_actions = """        const actions=document.createElement('div');
        actions.className='ks-fisio-day-actions';
        const status=String(agendamento.status||'').toLowerCase();
        const ausencia=STATUS_AUSENCIA.has(status);
        if(!ausencia){
            const modoDestino=clinica.familia==='avaliacao' ? 'avaliacao' : 'evolucao';
            const labelDestino=modoDestino==='avaliacao' ? 'Avaliação' : 'Evolução';
            actions.appendChild(criarBotao(labelDestino,'btn-primary',()=>abrirRegistroClinico(agendamento.paciente_id,modoDestino,agendamento.id)));
            if(clinica.registroHoje){
                const done=document.createElement('span');
                done.className='ks-fisio-record-done';
                done.textContent='Registro concluído';
                actions.appendChild(done);
            }
        }
"""
assert s.count(old_actions) == 1, 'bloco de ações do meu dia clínico mudou'
s = s.replace(old_actions, new_actions, 1)
home.write_text(s, encoding='utf-8')

script = Path('script-1.18.0.js')
s = script.read_text(encoding='utf-8')
start = s.index('async function excluirPacienteNuvemSeguro(id) {')
end = s.index('\nasync function excluirArquivosLocaisPaciente(id) {', start)
old_delete = s[start:end]
new_delete = """async function excluirPacienteNuvemSeguro(id) {
    if (!_supabase) throw new Error('Servidor indisponível. A exclusão definitiva exige conexão com o KineSys.');
    const { data, error } = await _supabase.rpc('kinesys_excluir_paciente_completo', { p_paciente_id: id });
    if (error) throw error;
    if (data && data.ok === false) throw new Error(data.erro || 'O servidor não confirmou a exclusão completa do paciente.');
    return { modo: 'transacional', resultado: data || null };
}
"""
assert "_supabase.from(tabela).delete()" in old_delete, 'fallback de exclusão direta já não corresponde ao esperado'
s = s[:start] + new_delete + s[end:]
old_msg = "alert('❌ A exclusão não foi concluída. O cadastro principal não será considerado excluído enquanto o Supabase não confirmar a operação.\\n\\n' + (err.message || String(err)));"
new_msg = "alert('❌ A exclusão não foi concluída. Nenhum dado foi removido parcialmente.\\n\\n' + (err.message || String(err)));"
assert s.count(old_msg) == 1, 'mensagem de erro de exclusão mudou'
s = s.replace(old_msg, new_msg, 1)
script.write_text(s, encoding='utf-8')

index = Path('index.html')
s = index.read_text(encoding='utf-8')
old_script = 'script-1.18.0.js?v=20260910-hma-perf-r3'
new_script = old_script + '&patient_self_service=20260910-r1'
old_home = 'home_fisioterapeuta_util-1.24.0.js?v=20260910-r3'
new_home = old_home + '&fisio_home=20260910-r1'
assert s.count(old_script) == 1, 'asset principal mudou'
assert s.count(old_home) == 1, 'asset home fisioterapeuta mudou'
s = s.replace(old_script, new_script, 1).replace(old_home, new_home, 1)
index.write_text(s, encoding='utf-8')

test = Path('tests/fisio_home_patient_self_service.contract.js')
test.write_text("""'use strict';
const fs = require('fs');
const assert = require('assert');

const home = fs.readFileSync('home_fisioterapeuta_util-1.24.0.js','utf8');
const script = fs.readFileSync('script-1.18.0.js','utf8');
const index = fs.readFileSync('index.html','utf8');
const sql = fs.readFileSync('SUPABASE_SQL/SUPABASE_MIGRACAO_EXCLUSAO_PACIENTE_SELF_SERVICE_v1.24.1.sql','utf8');

function bloco(texto, inicio, fim){
  const a=texto.indexOf(inicio); assert.ok(a>=0, `início ausente: ${inicio}`);
  const b=texto.indexOf(fim,a); assert.ok(b>a, `fim ausente: ${fim}`);
  return texto.slice(a,b);
}

const resolver = bloco(home,'async function resolverProfissionalHomeFisioterapeuta','async function carregarPainelFisioterapeutaUtil');
assert.match(resolver, /\\.rpc\\('kinesys_contexto_agenda'\\)/, 'Home deve resolver vínculo pelo contexto seguro do backend');
assert.match(resolver, /contexto\\?\\.perfil_id/, 'Home deve validar perfil retornado');
assert.match(resolver, /contexto\\?\\.clinica_id/, 'Home deve validar clínica retornada');

const carregar = bloco(home,'async function carregarPainelFisioterapeutaUtil','window.carregarPainelFisioterapeuta=');
assert.doesNotMatch(carregar,/carregarProfissionaisAgenda/, 'Home não pode depender do carregamento lazy da Agenda');
assert.doesNotMatch(carregar,/profissionalAgendaRestritoAtualId/, 'Home não pode depender do cache interno da Agenda');
assert.match(carregar,/resolverProfissionalHomeFisioterapeuta/, 'Home deve usar resolvedor próprio e leve');

const linha = bloco(home,'function montarLinha','function pontuacaoPrioridade');
assert.doesNotMatch(linha,/criarBotao\\('Prontuário'/, 'Meu dia clínico não deve usar Prontuário como ação principal');
assert.match(linha,/clinica\\.familia==='avaliacao' \\? 'avaliacao' : 'evolucao'/, 'Avaliação deve abrir avaliação; demais sessões devem abrir evolução');
assert.match(linha,/labelDestino=modoDestino==='avaliacao' \\? 'Avaliação' : 'Evolução'/, 'Rótulo direto deve refletir destino clínico');
assert.match(linha,/abrirRegistroClinico\\(agendamento\\.paciente_id,modoDestino,agendamento\\.id\\)/, 'A ação deve preservar o vínculo com o agendamento');

const excluirSeguro = bloco(script,'async function excluirPacienteNuvemSeguro','async function excluirArquivosLocaisPaciente');
assert.match(excluirSeguro,/\\.rpc\\('kinesys_excluir_paciente_completo'/, 'Exclusão deve ocorrer somente pela RPC transacional');
assert.doesNotMatch(excluirSeguro,/\\.from\\(/, 'Exclusão segura não pode apagar tabelas diretamente pelo navegador');
assert.doesNotMatch(excluirSeguro,/compatibilidade/, 'Fallback destrutivo legado deve ser removido');
assert.match(script,/Nenhum dado foi removido parcialmente/, 'Falha deve deixar claro o comportamento atômico');

const pagamentos=sql.indexOf('delete from public.pagamentos');
const cobrancas=sql.indexOf('delete from public.cobrancas_agendamento');
const agendamentos=sql.indexOf('delete from public.agendamentos where');
const planos=sql.indexOf('delete from public.planos_atendimento');
const paciente=sql.lastIndexOf('delete from public.pacientes');
assert.ok([pagamentos,cobrancas,agendamentos,planos,paciente].every(x=>x>=0),'Migration deve conter toda a ordem crítica');
assert.ok(pagamentos < cobrancas && cobrancas < agendamentos && agendamentos < planos && planos < paciente,'Ordem FK crítica da exclusão está incorreta');
assert.match(sql,/revoke all on function public\\.kinesys_excluir_paciente_completo_interno_v1112\\(text\\) from public, anon, authenticated/i,'Função interna deve permanecer inacessível ao cliente');
assert.match(sql,/grant execute on function public\\.kinesys_excluir_paciente_completo\\(text\\) to authenticated/i,'Wrapper seguro deve permanecer disponível ao usuário autenticado');

assert.match(index,/script-1\\.18\\.0\\.js\\?v=20260910-hma-perf-r3&patient_self_service=20260910-r1/,'Script precisa invalidar cache sem perder o contrato anterior');
assert.match(index,/home_fisioterapeuta_util-1\\.24\\.0\\.js\\?v=20260910-r3&fisio_home=20260910-r1/,'Home fisioterapeuta precisa invalidar cache');

console.log('Fisio home + patient self-service contract: OK');
""", encoding='utf-8')

print('Incremental physiotherapist home + patient self-service changes prepared')
