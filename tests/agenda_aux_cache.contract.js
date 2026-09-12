const fs = require('fs');
const assert = require('assert');

const src = fs.readFileSync('src/agenda/agenda-1.20.0.js', 'utf8');

function trechoEntre(inicio, fim) {
  const a = src.indexOf(inicio);
  const b = src.indexOf(fim, a + inicio.length);
  assert(a >= 0 && b > a, `Trecho não encontrado: ${inicio}`);
  return src.slice(a, b);
}

assert(src.includes('const AGENDA_PROCEDIMENTOS_CACHE_TTL_MS = 15000;'), 'TTL de procedimentos deve permanecer curto (15s).');
assert(src.includes('agenda::aux::procedimentos::'), 'Catálogo de procedimentos deve possuir namespace próprio de cache.');
assert(src.includes("String(usuarioLogado?.id || 'sem_perfil')"), 'Cache auxiliar deve ser isolado pelo perfil ativo.');
assert(src.includes("String(usuarioLogado?.clinica_id || 'sem_clinica')"), 'Cache auxiliar deve ser isolado pela clínica ativa.');

const carregarProcedimentos = trechoEntre('async function carregarProcedimentos()', 'function renderizarListaProcedimentos');
assert(carregarProcedimentos.includes("agendaContextoDoUsuarioAtual()?.procedimentos || []"), 'Perfis não administrativos devem continuar usando o contexto seguro da Agenda.');
assert(carregarProcedimentos.includes('window.KineSysDataCache?.get'), 'Somente o catálogo administrativo deve reutilizar o cache central.');
assert(carregarProcedimentos.includes('ttl:AGENDA_PROCEDIMENTOS_CACHE_TTL_MS'), 'O loader deve aplicar o TTL aprovado.');
assert(carregarProcedimentos.includes("_supabase.from('procedimentos').select('*').order('nome')"), 'A fonte canônica continua sendo a tabela procedimentos.');
assert(carregarProcedimentos.includes('clonarProcedimentosAgenda'), 'Dados de cache devem ser clonados antes de uso no estado mutável da Agenda.');

const horarios = trechoEntre('async function carregarHorarios()', 'function renderizarListaHorarios');
const bloqueios = trechoEntre('async function carregarBloqueios()', 'function renderizarListaBloqueios');
const equipe = trechoEntre('async function carregarProfissionaisAgenda()', 'async function carregarProcedimentos()');
assert(!horarios.includes('KineSysDataCache'), 'Horários afetam disponibilidade e não devem entrar no cache auxiliar desta fase.');
assert(!bloqueios.includes('KineSysDataCache'), 'Bloqueios afetam disponibilidade e não devem entrar no cache auxiliar desta fase.');
assert(!equipe.includes('KineSysDataCache'), 'Contexto/equipe de acesso não deve ser cacheado nesta fase.');

for (const nome of ['salvarProcedimento', 'alternarAtivoProcedimento', 'excluirProcedimento']) {
  const inicio = `async function ${nome}`;
  const pos = src.indexOf(inicio);
  assert(pos >= 0, `${nome} não encontrado.`);
  const proxima = src.indexOf('\nasync function ', pos + inicio.length);
  const fimSecao = src.indexOf('\n/* --------------------------------------------------------------------', pos + inicio.length);
  const candidatos = [proxima, fimSecao].filter(x => x > pos);
  const fim = candidatos.length ? Math.min(...candidatos) : src.length;
  const trecho = src.slice(pos, fim);
  assert(trecho.includes('invalidarCacheProcedimentosAgenda()'), `${nome} deve invalidar o catálogo após mutação bem-sucedida.`);
  assert(trecho.indexOf('invalidarCacheProcedimentosAgenda()') < trecho.lastIndexOf('carregarProcedimentos()'), `${nome} deve invalidar antes de recarregar.`);
}

console.log('Agenda Aux Cache Phase 1C: catálogo administrativo de procedimentos com TTL curto e invalidação; horários, bloqueios e contexto de acesso permanecem ao vivo.');
