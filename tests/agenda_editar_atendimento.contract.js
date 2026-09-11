'use strict';

const fs = require('fs');
const assert = require('assert');
const vm = require('vm');

const agenda = fs.readFileSync('agenda-1.20.0.js', 'utf8');
const html = fs.readFileSync('index.html', 'utf8');
const loader = fs.readFileSync('screen_loader-1.25.0.js', 'utf8');
const financeiro = fs.readFileSync('financeiro_agendamento-1.21.0.js', 'utf8');

function trechoEntre(inicio, fim) {
  const a = agenda.indexOf(inicio);
  const b = agenda.indexOf(fim, a + inicio.length);
  assert.ok(a >= 0, `início não encontrado: ${inicio}`);
  assert.ok(b > a, `fim não encontrado depois de ${inicio}: ${fim}`);
  return agenda.slice(a, b);
}

const configurar = trechoEntre('function configurarModalEdicaoAtendimento', '\nasync function abrirModalAgendamento');
const abrirModal = trechoEntre('async function abrirModalAgendamento', '\nasync function oferecerExcecaoJornadaProfissionalModal');
const horarios = trechoEntre('async function atualizarHorariosDisponiveisModal', '\nasync function existeConflitoImediato');
const editar = trechoEntre('async function salvarEdicaoAtendimentoAtual', '\nasync function salvarAgendamento');
const detalhe = trechoEntre('async function abrirDetalheAgendamento', '\nasync function editarAgendamentoAtual');
const abrirEdicao = trechoEntre('async function editarAgendamentoAtual', '\nfunction aoMudarStatusDetalhe');

// UX: botão no detalhe e um único modal reaproveitado.
assert.match(detalhe, /id="btn_editar_atendimento"[^>]*onclick="editarAgendamentoAtual\(\)"[^>]*>Editar agendamento<\/button>/,
  'Detalhe deve expor EDITAR ATENDIMENTO usando a função existente');
assert.match(html, /id="ag_edicao_escopo"[^>]*role="note"[^>]*hidden/,
  'Modal existente deve conter aviso de escopo da edição');
assert.match(abrirEdicao, /abrirModalAgendamento\(a\.profissional_id \|\| '', a\.data, horaCurta\(a\.hora_inicio\), \{ agendamento:a \}\)/,
  'A edição deve reutilizar o mesmo registro selecionado no modal existente');

// Paciente permanece fixo; data, horário, procedimento e profissional ficam editáveis.
assert.match(configurar, /paciente\.disabled = editando/,'Paciente deve ficar bloqueado na edição');
assert.match(configurar, /data\.disabled = false/,'Data deve ficar editável na edição');
assert.match(configurar, /recorrencia\.hidden = editando/,'Recorrência deve ficar oculta na edição');
assert.match(configurar, /extra\.hidden = editando/,'Horário extraordinário deve ficar fora desta primeira versão');
assert.match(configurar, /observacoes\.hidden = editando/,'Observações não podem ser editadas nesta versão');
assert.match(configurar, /el\.hidden = editando \|\| !usuarioEhAdministradorAgenda\(\)/,
  'Status/plano/financeiro do modal de criação devem ficar ocultos durante edição');
assert.match(configurar, /Altere Data, Horário, Procedimento ou Profissional/,
  'Usuário deve receber aviso inequívoco do escopo da edição');
assert.match(abrirModal, /atendimentoEdicao\?\.profissional_id/,'Profissional atual deve ser pré-selecionado');
assert.match(abrirModal, /atendimentoEdicao\?\.procedimento_id/,'Procedimento atual deve ser pré-selecionado');
assert.match(abrirModal, /atendimentoEdicao\?\.data/,'Data original deve ser preservada no modal');

// Disponibilidade: usa as mesmas regras atuais e exclui somente o próprio registro da disputa de slot.
assert.match(horarios, /String\(a\.id\) !== String\(agendaEdicaoAtendimentoId \|\| ''\)/,
  'Cálculo de horários deve ignorar a própria ocorrência durante a edição');
assert.match(editar, /existeConflitoImediato\(profissionalId, dataISO, horaInicio, horaFim, id\)/,
  'Validação final deve reutilizar conflito imediato ignorando o próprio id');
assert.match(editar, /erroEhConflitoAgenda\(error\)/,
  'Conflito concorrente do banco deve continuar bloqueando o salvamento');

// Persistência: UPDATE do MESMO id, sem criação ou duplicação.
assert.match(editar, /from\('agendamentos'\)\.update\(alteracoes\)/,'Edição deve usar UPDATE em agendamentos');
assert.match(editar, /\.eq\('id', id\)/,'UPDATE deve ser limitado ao id selecionado');
assert.doesNotMatch(editar, /\.insert\(|\.upsert\(/,'Edição nunca pode criar outro agendamento');
const objetoAlteracoes = editar.match(/const alteracoes = \{([\s\S]*?)\n    \};/);
assert.ok(objetoAlteracoes,'Payload de alteração deve ser explicitamente identificável');
const payload = objetoAlteracoes[1];
for (const campo of ['profissional_id','procedimento_id','data','hora_inicio','hora_fim']) {
  assert.match(payload,new RegExp(`\\b${campo}\\b`),`payload deve conter ${campo}`);
}
for (const proibido of ['paciente_id','status','plano_id','confirmado_pelo_paciente','observacoes','metadados']) {
  assert.doesNotMatch(payload,new RegExp(`\\b${proibido}\\b`),`payload de edição não pode alterar ${proibido}`);
}

// Recorrência: nenhum bulk update/metadata; a ocorrência continua sendo a unidade de persistência.
assert.doesNotMatch(editar, /recorrencia|recorrência|recorrencia_indice|recorrencia_total/,
  'Salvar edição não pode manipular a série recorrente');

// Financeiro: mesmo agendamento_id e pagamentos existentes nunca são apagados.
assert.match(editar, /financeiroAnterior\?\.pagos/,'Edição de procedimento deve verificar pagamentos existentes');
assert.match(editar, /pagamento e o histórico financeiro serão preservados no mesmo atendimento/,
  'Pagamento existente deve receber confirmação explícita de preservação');
assert.match(editar, /kinesys_preparar_cobranca_agendamento[^\n]*p_agendamento_id:id/,
  'Cobrança sem pagamento deve ser reconciliada pelo mesmo agendamento_id');
assert.doesNotMatch(editar, /\.delete\(|pagamentos[^\n]*delete|cobrancas[^\n]*delete/i,
  'Edição não pode apagar pagamento/cobrança');
assert.match(financeiro, /p_agendamento_id/,'Financeiro deve continuar canonizado pelo agendamento_id');

// Atualização visual: fecha edição, redesenha agenda e reabre detalhe do mesmo id.
assert.match(editar, /fecharModal\('modal_agendamento'\)/,'Edição deve fechar após salvar');
assert.match(editar, /await renderizarPainelAgenda\(\)/,'Agenda deve atualizar automaticamente');
assert.match(editar, /await abrirDetalheAgendamento\(id\)/,'Detalhe deve reabrir no mesmo atendimento atualizado');

// Cache-busting: garante que o navegador realmente recebe a versão nova, mantendo Agenda lazy.
assert.match(html,/screen_loader-1\.25\.0\.js\?v=20260910-phase4d-r1&agenda_edit=20260911-r2/,'index deve invalidar cache do Screen Loader');
assert.match(loader,/agenda-1\.20\.0\.js\?v=20260911-agenda-edit-r2/,'Screen Loader deve invalidar cache da Agenda');
assert.doesNotMatch(html,/<script[^>]+agenda-1\.20\.0\.js/i,'Agenda deve continuar fora do bootstrap');

// Smoke dinâmico do UPDATE: prova mesmo id, quatro campos e nenhuma criação.
async function executarEdicao({pagos=0}={}) {
  const chamadas = {update:0, insert:0, rpc:[], eq:[], conflito:null, render:0, detalhe:[]};
  const registro = {
    id:'ag-1', paciente_id:'pac-1', profissional_id:'prof-1', procedimento_id:'proc-1',
    data:'2026-09-15', hora_inicio:'10:00', hora_fim:'11:00', status:'agendado', plano_id:'plano-1',
    pacientes:{nome:'Joseane'}, equipe:{nome:'Jessé'}, procedimentos:{nome:'Fisioterapia'}
  };
  let updatePayload = null;
  const chain = {
    eq(campo,valor){ chamadas.eq.push([campo,String(valor)]); return this; },
    async select(){ return {data:[{id:'ag-1'}],error:null}; }
  };
  const supabase = {
    from(tabela){
      assert.strictEqual(tabela,'agendamentos');
      return {
        update(payload){ chamadas.update++; updatePayload={...payload}; return chain; },
        insert(){ chamadas.insert++; throw new Error('insert proibido no modo edição'); }
      };
    },
    async rpc(nome,args){ chamadas.rpc.push([nome,args]); return {data:[],error:null}; }
  };
  const elementos = {
    ag_id:{value:'ag-1'},
    agenda_filtro_profissional:{value:'',},
  };
  const context = {
    console,
    agendaEdicaoAtendimentoId:'ag-1',
    agendaAgendamentosSemanaCache:[registro],
    agendaAgendamentosDoDiaCache:[],
    agendaProcedimentosCache:[{id:'proc-2',nome:'Osteopatia',profissionais_ids:['prof-2']}],
    agendaEquipeCache:[{id:'prof-2',nome:'Outro profissional'}],
    agendaUltimoProfissional:'',
    agendaDataSelecionada:new Date('2026-09-15T00:00:00'),
    _supabase:supabase,
    usuarioPodeVerAgendaClinicaToda:()=>true,
    agendaPodeMarcarProfissional:()=>true,
    existeConflitoImediato:async (...args)=>{chamadas.conflito=args; return false;},
    obterSituacaoPagamentoAgendamento:async ()=>({pagos}),
    confirmarKineSys:async ()=>true,
    lerAgendamentosPendentesSync:()=>[],
    atualizarPayloadAgendamentoPendenteSync:()=>false,
    salvarVinculoAgendaLocal:()=>{},
    fecharModal:()=>{},
    renderizarPainelAgenda:async ()=>{chamadas.render++;},
    mostrarFeedbackAgenda:()=>{},
    mostrarFeedbackAgendaModal:()=>{},
    abrirDetalheAgendamento:async id=>{chamadas.detalhe.push(id);},
    document:{getElementById:id=>elementos[id] || {value:'',}},
  };
  vm.createContext(context);
  vm.runInContext(editar + '\nthis.__editar = salvarEdicaoAtendimentoAtual;', context, {timeout:1000});
  const ok = await context.__editar({profissionalId:'prof-2',procedimentoId:'proc-2',dataISO:'2026-09-16',horarioVal:'11:00|12:00'});
  return {ok,chamadas,updatePayload,registro};
}

(async()=>{
  const semPagamento = await executarEdicao({pagos:0});
  assert.strictEqual(semPagamento.ok,true);
  assert.strictEqual(semPagamento.chamadas.update,1,'deve ocorrer exatamente um UPDATE');
  assert.strictEqual(semPagamento.chamadas.insert,0,'não pode ocorrer INSERT');
  assert.deepStrictEqual(Object.keys(semPagamento.updatePayload).sort(),['data','hora_fim','hora_inicio','procedimento_id','profissional_id'].sort(),
    'UPDATE deve alterar somente os quatro campos físicos correspondentes aos três controles');
  assert.deepStrictEqual(semPagamento.chamadas.conflito.map(String),['prof-2','2026-09-16','11:00','12:00','ag-1'],
    'conflito deve ignorar apenas o próprio agendamento');
  assert.ok(semPagamento.chamadas.eq.some(([k,v])=>k==='id'&&v==='ag-1'),'UPDATE deve filtrar pelo mesmo id');
  assert.strictEqual(semPagamento.registro.id,'ag-1','id do registro deve permanecer intacto');
  assert.strictEqual(semPagamento.registro.paciente_id,'pac-1','paciente deve permanecer intacto');
  assert.strictEqual(semPagamento.registro.data,'2026-09-16','data deve ser atualizada no mesmo registro');
  assert.strictEqual(semPagamento.registro.status,'agendado','status deve permanecer intacto');
  assert.strictEqual(semPagamento.chamadas.render,1,'Agenda deve redesenhar uma vez');
  assert.deepStrictEqual(semPagamento.chamadas.detalhe,['ag-1'],'deve retornar ao detalhe do mesmo id');
  assert.ok(semPagamento.chamadas.rpc.some(([nome,args])=>nome==='kinesys_preparar_cobranca_agendamento'&&args.p_agendamento_id==='ag-1'),
    'reconciliação financeira sem pagamento deve usar o mesmo id');

  const comPagamento = await executarEdicao({pagos:150});
  assert.strictEqual(comPagamento.ok,true,'pagamento existente não deve impedir edição após confirmação');
  assert.strictEqual(comPagamento.chamadas.update,1);
  assert.strictEqual(comPagamento.chamadas.insert,0);
  assert.ok(!comPagamento.chamadas.rpc.some(([nome])=>nome==='kinesys_preparar_cobranca_agendamento'),
    'cobrança paga não deve ser recriada/recalculada automaticamente');

  console.log('Agenda edit contract: OK');
})().catch(err=>{console.error(err);process.exit(1);});
