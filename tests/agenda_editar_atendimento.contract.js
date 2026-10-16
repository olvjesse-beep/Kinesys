'use strict';

const fs = require('fs');
const assert = require('assert');
const vm = require('vm');

const agenda = fs.readFileSync('src/agenda/agenda-1.20.0.js', 'utf8');
const html = fs.readFileSync('index.html', 'utf8');
const loader = fs.readFileSync('src/ui/screen_loader-1.25.0.js', 'utf8');
const financeiro = fs.readFileSync('src/finance/financeiro_agendamento-1.21.0.js', 'utf8');
const workflow = fs.readFileSync('.github/workflows/agenda-edit-contract.yml','utf8');
assert.match(workflow,/name: Agenda e planos - regressao critica/,'nome do check obrigatório deve permanecer estável');
assert.match(workflow,/runs-on: ubuntu-latest/,'a barreira não pode depender do computador local');
assert.doesNotMatch(workflow,/\bpaths(?:-ignore)?:|continue-on-error:/,'alterações em outras telas também precisam testar agenda e planos');
for(const teste of ['agenda_editar_atendimento.contract.js','agenda_ux_corrections.contract.js','agenda_intervalo.contract.js','financeiro_modal_bootstrap.test.cjs','runtime_asset_cache.contract.js'])assert.ok(workflow.includes('node tests/'+teste),'barreira deve executar '+teste);

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
assert.match(configurar, /extra\.hidden = false/,'Horário extraordinário deve permanecer disponível ao criar e editar');
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
assert.doesNotMatch(editar, /recorrencia_indice|recorrencia_total|gerarDatasRecorrenciaAgenda/,
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
const revisaoLoader=loader.match(/const ASSET_REVISION='([^']+)'/)?.[1];
const srcLoader=html.match(/src="(src\/ui\/screen_loader-1\.25\.0\.js\?[^\"]+)"/)?.[1];
assert.ok(revisaoLoader&&srcLoader,'loader deve ter revisão e cache-buster explícitos');
assert.strictEqual(new URL(srcLoader,'https://app.fisiofixfisioterapia.com/').searchParams.get('v'),revisaoLoader,'HTML e loader devem pertencer à mesma publicação');
assert.match(loader,/src\/agenda\/agenda-1\.20\.0\.js\?v=[^'\s]+/,'Screen Loader deve invalidar cache da Agenda');
assert.doesNotMatch(html,/<script[^>]+src\/agenda\/agenda-1\.20\.0\.js/i,'Agenda deve continuar fora do bootstrap');

// Smoke dinâmico do UPDATE: prova mesmo id, quatro campos e nenhuma criação.
async function executarEdicao({pagos=0,extra=false,bloqueado=false,conflito=false,confirmar=true}={}) {
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
    usuarioLogado:{nome:'Profissional fixture'},
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
    existeConflitoImediato:async (...args)=>{chamadas.conflito=args; return conflito;},
    intervaloDisponivelNaJornadaRecorrencia:()=>({ok:!bloqueado,motivo:'bloqueio fixture'}),
    intervaloDentroDaJornadaPadrao:()=>!extra,
    registrarNotificacaoHorarioExtraordinario:async()=>{chamadas.aviso=true;},
    motivoHorarioExtraordinarioAgenda:()=> 'fora da jornada',
    obterSituacaoPagamentoAgendamento:async ()=>({pagos}),
    confirmarKineSys:async ()=>confirmar,
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
  const ok = await context.__editar({profissionalId:'prof-2',procedimentoId:'proc-2',dataISO:'2026-09-16',horarioVal:extra?'':'11:00|12:00',usarHorarioExtraordinario:extra,horarioExtra:extra?{inicio:'20:00',fim:'21:00',valido:true}:null});
  return {ok,chamadas,updatePayload,registro};
}

async function executarNovoExtra({ativo=true,bloqueado=false,ocupado=false,confirmar=true,feriado=false,serie=false}={}){
 const salvos=[],avisos=[],erros=[];
 const campos={ag_paciente_select:{value:'pac-fixture'},ag_profissional_select:{value:'prof-fixture',selectedOptions:[{textContent:'Profissional fixture'}]},ag_procedimento_select:{value:'proc-fixture',selectedOptions:[{dataset:{duracao:'60'},textContent:'Sessão fixture'}]},ag_data_input:{value:'2026-10-19'},ag_horario_select:{value:ativo?'':'20:00|21:00'},ag_horario_extra_toggle:{checked:ativo},ag_horario_extra_inicio:{value:'20:00'},ag_observacoes:{value:''}};
 const context={console,agendaSalvando:false,agendaEdicaoAtendimentoId:null,agendaEquipeCache:[],usuarioLogado:{nome:'Equipe fixture'},agendaDataSelecionada:null,
 document:{getElementById:id=>campos[id]||{value:'',selectedOptions:[],textContent:'',disabled:false}},
 horaParaMinutos:t=>{const [h,m]=String(t).split(':').map(Number);return h*60+m;},minutosParaHora:m=>String(Math.floor(m/60)).padStart(2,'0')+':'+String(m%60).padStart(2,'0'),horaCurta:t=>t.slice(0,5),
 agendaDataUTC:d=>new Date(d+'T12:00:00Z'),intervaloDentroDaJornadaPadrao:()=>false,obterFeriadoAgenda:()=>feriado?{nome:'Feriado fixture'}:null,bloqueiosAgendaPara:()=>bloqueado?[{motivo:'Bloqueio manual'}]:[],
 _supabase:{from:()=>({select(){return this;},eq(){return this;},gte(){return this;},lte(){return this;},async neq(){return {data:ocupado?[{data:'2026-10-19',hora_inicio:'20:00',hora_fim:'21:00',status:'agendado'}]:[],error:null};}})},
 statusAgendaOcupaHorario:()=>true,lerAgendamentosPendentesSync:()=>[],erroAgendaEhTransitorio:()=>false,agendaPodeMarcarProfissional:()=>true,usuarioPodeVerAgendaClinicaToda:()=>true,usuarioEhAdministradorAgenda:()=>true,
 lerConfiguracaoRecorrenciaModal:()=>({tipo:'nenhuma'}),gerarDatasRecorrenciaAgenda:()=>serie?['2026-10-19','2026-10-20']:['2026-10-19'],textoDatasIndisponiveisRecorrencia:a=>JSON.stringify(a),confirmarKineSys:async()=>confirmar,
 formatarDataAgendaBR:d=>d,classificarHorarioExtraordinarioAgenda:()=>({tipo:'fora_horario_profissional',motivo:'fora da jornada'}),pacienteAgendaPorId:()=>({nome:'Fixture'}),gerarIdAgendamentoKineSys:()=> 'novo-'+salvos.length,
 inserirAgendamentoNuvemConfiavel:async row=>{salvos.push(row);return {ok:true,sincronizado:true};},registrarNotificacaoHorarioExtraordinario:async row=>{avisos.push(row);return {ok:true};},
 invalidarCacheAgendaSemana(){},fecharModal(){},renderizarPainelAgenda:async()=>{},mostrarFeedbackAgenda(){},mostrarFeedbackAgendaModal(){},resolverListaEsperaAposAgendamento:async()=>{},mensagemErroSalvarAgenda:e=>e.message,alert:e=>erros.push(e)};
 context.window=context;vm.createContext(context);
 vm.runInContext(trechoEntre('function horarioExtraordinarioAtivoModal','\nfunction textoDatasIndisponiveisRecorrencia'),context);
 vm.runInContext(trechoEntre('async function salvarAgendamento()','\nasync function abrirDetalheAgendamento'),context);
 await context.salvarAgendamento();assert.deepStrictEqual(erros,[],'o fluxo novo não pode falhar por dependência ausente');
 assert.strictEqual(context.agendaSalvando,false,'o fluxo sempre libera uma nova tentativa');
 return {salvos,avisos,context,campos};
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
  const extraordinario=await executarEdicao({extra:true});
  assert.strictEqual(extraordinario.ok,true,'edição deve aceitar horário manual fora da jornada');
  assert.strictEqual(extraordinario.updatePayload.hora_inicio,'20:00');
  assert.strictEqual(extraordinario.updatePayload.horario_extraordinario,true);
  assert.ok(extraordinario.chamadas.aviso,'edição extraordinária deve avisar o profissional');
  for(const opcoes of [{extra:true,bloqueado:true},{extra:true,conflito:true},{extra:true,confirmar:false}]){
    const recusada=await executarEdicao(opcoes);assert.strictEqual(recusada.ok,false);assert.strictEqual(recusada.chamadas.update,0,'exceção não permite conflitos, bloqueios nem ignora cancelamento');
  }
  console.log('Agenda extraordinary editing: allowed, conflict, block and cancelled confirmation OK');
  for(const opcoes of [{},{feriado:true},{serie:true}]){
    const novo=await executarNovoExtra(opcoes);assert.strictEqual(novo.salvos.length,opcoes.serie?2:1);assert.strictEqual(novo.avisos.length,novo.salvos.length);
    assert.ok(novo.salvos.every(a=>a.hora_inicio==='20:00'&&a.hora_fim==='21:00'&&a.horario_extraordinario),'criação deve usar o horário digitado e manter a marca de exceção');
  }
  for(const opcoes of [{ativo:false},{bloqueado:true},{ocupado:true},{confirmar:false}])assert.strictEqual((await executarNovoExtra(opcoes)).salvos.length,0,'horário extra não pode contornar bloqueio, conflito, confirmação ou opt-in');
  console.log('Agenda extraordinary creation: off-hours, holiday, series and four safety refusals OK');
  const corrida=await executarNovoExtra();let liberarConsulta;
  corrida.campos.ag_horario_extra_toggle.checked=false;
  corrida.context.agendaProcedimentosCache=[{id:'proc-fixture'}];corrida.context.agendaHoraPreSelecionadaModal='';
  corrida.context.oferecerExcecaoJornadaProfissionalModal=async()=>false;
  corrida.context.calcularSlotsLivres=()=>{throw Error('resposta padrão atrasada não pode sobrescrever o modo extra');};
  corrida.context._supabase.from=()=>({select(){return this;},eq(){return this;},neq(){return new Promise(resolve=>liberarConsulta=resolve);}});
  vm.runInContext(horarios,corrida.context);
  const carregando=corrida.context.atualizarHorariosDisponiveisModal();
  await new Promise(setImmediate);
  assert.ok(liberarConsulta,'a consulta de horários padrão deve estar em andamento');
  corrida.campos.ag_horario_extra_toggle.checked=true;corrida.campos.ag_horario_select.disabled=true;
  liberarConsulta({data:[],error:null});await carregando;
  assert.strictEqual(corrida.campos.ag_horario_select.disabled,true,'resposta tardia não pode reativar o seletor padrão');
  assert.strictEqual(corrida.campos.ag_horario_extra_toggle.checked,true);
  console.log('Agenda async slot response cannot undo extraordinary mode: OK');
})().catch(err=>{console.error(err);process.exit(1);});
