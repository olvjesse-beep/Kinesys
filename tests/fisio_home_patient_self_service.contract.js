'use strict';
const fs = require('fs');
const assert = require('assert');

const home = fs.readFileSync('src/home/home_fisioterapeuta_util-1.24.0.js','utf8');
const script = fs.readFileSync('src/core/script-1.18.0.js','utf8');
const deletion = fs.readFileSync('src/patient/patient_deletion_core-1.0.0.js','utf8');
const index = fs.readFileSync('index.html','utf8');
const sql = fs.readFileSync('SUPABASE_SQL/SUPABASE_MIGRACAO_EXCLUSAO_PACIENTE_SELF_SERVICE_v1.24.1.sql','utf8');

function bloco(texto, inicio, fim){
  const a=texto.indexOf(inicio); assert.ok(a>=0, `início ausente: ${inicio}`);
  const b=texto.indexOf(fim,a); assert.ok(b>a, `fim ausente: ${fim}`);
  return texto.slice(a,b);
}

const resolver = bloco(home,'async function resolverProfissionalHomeFisioterapeuta','async function carregarPainelFisioterapeutaUtil');
assert.match(resolver, /\.rpc\('kinesys_contexto_agenda'\)/, 'Home deve resolver vínculo pelo contexto seguro do backend');
assert.match(resolver, /contexto\?\.perfil_id/, 'Home deve validar perfil retornado');
assert.match(resolver, /contexto\?\.clinica_id/, 'Home deve validar clínica retornada');

const carregar = bloco(home,'async function carregarPainelFisioterapeutaUtil','function atualizarPainelFisioterapeuta(');
assert.doesNotMatch(carregar,/carregarProfissionaisAgenda/, 'Home não pode depender do carregamento lazy da Agenda');
assert.doesNotMatch(carregar,/profissionalAgendaRestritoAtualId/, 'Home não pode depender do cache interno da Agenda');
assert.match(carregar,/resolverProfissionalHomeFisioterapeuta/, 'Home deve usar resolvedor próprio e leve');

const linha = bloco(home,'function montarLinha','function pontuacaoPrioridade');
assert.doesNotMatch(linha,/criarBotao\('Prontuário'/, 'Meu dia clínico não deve usar Prontuário como ação principal');
assert.match(linha,/clinica\.familia==='avaliacao' \? 'avaliacao' : 'evolucao'/, 'Avaliação deve abrir avaliação; demais sessões devem abrir evolução');
assert.match(linha,/labelDestino=modoDestino==='avaliacao' \? \(clinica.temAvaliacao\?'Reavaliar':'Realizar avaliação'\) : 'Evolução'/, 'Rótulo deve distinguir primeira avaliação, reavaliação e evolução');
assert.match(linha,/!clinica\.temAvaliacao&&modoDestino!=='avaliacao'/,'Adicionar avaliação apenas sem avaliação concluída, sem duplicar ação de agendamento avaliativo');
assert.match(linha,/abrirRegistroClinico\(agendamento\.paciente_id,modoDestino,agendamento\.id\)/, 'A ação deve preservar o vínculo com o agendamento');

const excluirSeguro = bloco(deletion,'async function excluirPacienteNuvemSeguro','async function excluirArquivosLocaisPaciente');
assert.match(excluirSeguro,/\.rpc\('kinesys_excluir_paciente_completo'/, 'Exclusão deve ocorrer somente pela RPC transacional');
assert.doesNotMatch(excluirSeguro,/\.from\(/, 'Exclusão segura não pode apagar tabelas diretamente pelo navegador');
assert.doesNotMatch(excluirSeguro,/compatibilidade/, 'Fallback destrutivo legado deve ser removido');
assert.match(deletion,/Nenhum dado foi removido parcialmente/, 'Falha deve deixar claro o comportamento atômico');

const pagamentos=sql.indexOf('delete from public.pagamentos');
const cobrancas=sql.indexOf('delete from public.cobrancas_agendamento');
const agendamentos=sql.indexOf('delete from public.agendamentos where');
const planos=sql.indexOf('delete from public.planos_atendimento');
const paciente=sql.lastIndexOf('delete from public.pacientes');
assert.ok([pagamentos,cobrancas,agendamentos,planos,paciente].every(x=>x>=0),'Migration deve conter toda a ordem crítica');
assert.ok(pagamentos < cobrancas && cobrancas < agendamentos && agendamentos < planos && planos < paciente,'Ordem FK crítica da exclusão está incorreta');
assert.match(sql,/revoke all on function public\.kinesys_excluir_paciente_completo_interno_v1112\(text\) from public, anon, authenticated/i,'Função interna deve permanecer inacessível ao cliente');
assert.match(sql,/grant execute on function public\.kinesys_excluir_paciente_completo\(text\) to authenticated/i,'Wrapper seguro deve permanecer disponível ao usuário autenticado');

const asset=path=>new URL(index.match(new RegExp('src="('+path.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')+'\\?[^"\\s]+)"'))?.[1]||'', 'https://app.fisiofixfisioterapia.com/');
const coreAsset=asset('src/core/script-1.18.0.js'),homeAsset=asset('src/home/home_fisioterapeuta_util-1.24.0.js');
assert(coreAsset.searchParams.get('v'),'Script precisa ter revisão explícita');assert.equal(coreAsset.searchParams.get('patient_self_service'),'20260910-r1');assert(coreAsset.searchParams.get('core_mod'),'Preservar contrato modular');
assert.match(index,/src\/patient\/patient_deletion_core-1\.0\.0\.js\?v=20260911-phase4m-r1/,'Módulo de exclusão precisa estar no runtime');
assert.equal(homeAsset.searchParams.get('v'),coreAsset.searchParams.get('v'),'Home e notificação de avaliação devem pertencer à mesma publicação');assert.equal(homeAsset.searchParams.get('fisio_home'),'20260910-r1');

console.log('Fisio home + patient self-service contract: OK');
