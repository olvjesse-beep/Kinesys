'use strict';

const fs = require('fs');
const assert = require('assert');

const agenda = fs.readFileSync('src/agenda/agenda-1.20.0.js', 'utf8');
const html = fs.readFileSync('index.html', 'utf8');
const loader = fs.readFileSync('src/ui/screen_loader-1.25.0.js', 'utf8');
const agendaCss = fs.readFileSync('styles/design_agenda.css', 'utf8');
const configCores = fs.readFileSync('src/admin/configuracoes_agendamento_online-1.0.0.js', 'utf8');
const vm = require('vm');

// A origem unitária não pode mascarar condições vigentes corrigidas e auditadas.
(() => {
  const finance=fs.readFileSync('src/finance/financeiro-1.19.0.js','utf8');
  const c={};vm.createContext(c);
  vm.runInContext(finance.slice(finance.indexOf('function ehAtendimentoUnitario('),finance.indexOf('function valorMonetarioUnitario(')),c);
  assert(c.ehAtendimentoUnitario({operacao_id:'unitario-agenda-fixture',sessoes_contratadas:1}));
  assert(!c.ehAtendimentoUnitario({operacao_id:'unitario-agenda-fixture',sessoes_contratadas:2}),'contrato conciliado de duas sessões não pode dizer 1 sessão nem usar fluxo unitário');
  assert(!c.ehAtendimentoUnitario({operacao_id:'plano-fixture',sessoes_contratadas:3}));
  const credito=fs.readFileSync('src/finance/credito_cliente-1.19.0.js','utf8');
  const pendencias=fs.readFileSync('src/finance/pendencias_financeiras-1.19.0.js','utf8');
  Object.assign(c,{pagamentoEstaMarcadoParaExclusao:()=>false,usoCreditoEstaMarcadoParaExclusao:()=>false,financeiroResumoPagamentoPlano:()=>{},financeiroCreditosUsosCache:[],financeiroHojeISO:()=> '2026-10-19'});
  vm.runInContext(credito.slice(credito.indexOf('function calcularComponentesCreditoPaciente('),credito.indexOf('function calcularCreditoDisponivelPaciente(')),c);
  vm.runInContext(credito.slice(credito.indexOf('const financeiroResumoPagamentoPlanoSemCredito'),credito.indexOf('const metricasPlanoSemCredito')),c);
  vm.runInContext(pendencias.slice(0,pendencias.indexOf('async function carregarDadosPendenciasFinanceiras(')),c);
  const planos=[1,1,2,3,1,1].map((n,i)=>({id:`pl-${i}`,paciente_id:'fixture',nome:'Fisioterapia',sessoes_contratadas:n,valor_tabela:89.9*n,desconto_valor:14.9*n,valor_final:75*n,status:'concluido'}));
  const pagamentos=planos.map((p,i)=>({id:`pag-${i}`,paciente_id:'fixture',plano_id:p.id,valor:p.valor_final}));
  const agenda=planos.flatMap(p=>Array.from({length:p.sessoes_contratadas},(_,i)=>({id:`ag-${p.id}-${i}`,paciente_id:'fixture',plano_id:p.id,status:'atendido',data:'2026-10-16'})));
  agenda.push({id:'futura',paciente_id:'fixture',status:'agendado',data:'2026-10-19',hora_inicio:'10:00'});
  assert.equal(pagamentos.reduce((n,p)=>n+p.valor,0),675);
  assert.equal(Math.round(planos.reduce((n,p)=>n+p.desconto_valor,0)*100),13410);
  assert.equal(c.calcularComponentesCreditoPaciente(pagamentos,planos,[]).disponivel,0,'descontos e antecipação distribuída corretamente não geram crédito');
  const [linha]=c.construirPendenciasPorPaciente([{id:'fixture',nome:'Paciente fixture'}],planos,pagamentos,[],agenda);
  assert.equal(linha.creditoDisponivel,0);assert.equal(linha.saldoReceber,0);assert.equal(linha.sessoesPagasARealizar,0);
  assert(!linha.aCobrar&&!linha.clinicaDeve,'nove sessões quitadas/realizadas não podem reaparecer como pendência');
  console.log('Conciliação: nove sessões, descontos separados de crédito, recebimentos e Pendências coerentes OK');
})();

// A mesma paleta precisa identificar cartões e legenda após cada reconstrução.
(() => {
  const salvas = new Map();
  salvas.set('kinesys_agenda_cores::clinic-cor', JSON.stringify({osteopatia:'#2F8F72',fisioterapia:'#2F7EAD',falta:'#FF0000'}));
  salvas.set('kinesys_agenda_cores_procedimentos::clinic-cor', JSON.stringify({osteo:'#DD592C',avaliacao:'#8D78F2',individual:'#A9C2D1',pct:'#034F81',liberacao:'#F5D42E',invalido:'red;bad'}));
  function card(id, tipo='fisioterapia') {
    const classes=new Set(['agenda-compromisso',`tipo-${tipo}`]), styles={};
    return {dataset:{procedimentoId:id},styles,classes,classList:{contains:s=>classes.has(s),toggle(s,on){on?classes.add(s):classes.delete(s);}},style:{setProperty:(k,v)=>{styles[k]=v;},removeProperty:k=>{delete styles[k];}}};
  }
  let cards=[card('osteo','osteopatia'),card('pct'),card('avaliacao','geral'),card('individual'),card('liberacao','geral'),card('osteo','falta')];
  const legenda={innerHTML:''}, financeiro={hidden:true}, config={}, tela={style:{setProperty(){}},querySelectorAll:()=>cards,querySelector:()=>config};
  const c={document:{getElementById:id=>({tela_agenda:tela,agenda_legenda_procedimentos:legenda,agenda_legenda_financeiro:financeiro}[id]||null)},localStorage:{getItem:k=>salvas.get(k)||null},usuarioLogado:{clinica_id:'clinic-cor'},AGENDA_CORES_PADRAO:{osteopatia:'#2F8F72',fisioterapia:'#2F7EAD',falta:'#7B878C'},agendaProcedimentosCache:[{id:'osteo',nome:'Osteopatia'},{id:'avaliacao',nome:'Avaliação'},{id:'individual',nome:'Fisioterapia individual'},{id:'pct',nome:'Fisioterapia PCT'},{id:'liberacao',nome:'Liberação miofascial'},{id:'antigo',nome:'Procedimento inativo',ativo:false}],agendaAgendamentosSemanaCache:[{procedimento_id:'antigo',procedimentos:{nome:'Procedimento inativo'}}],usuarioEhAdministradorAgenda:()=>true,classeStatusAgenda:s=>s||'agendado',escapeHTML:s=>String(s).replaceAll('<','&lt;')};
  vm.createContext(c);
  vm.runInContext(agenda.slice(agenda.indexOf('function chaveCoresAgenda()'),agenda.indexOf("window.addEventListener('kinesys:agenda-cores-atualizadas'")),c);
  vm.runInContext(agenda.slice(agenda.indexOf('function normalizarTipoProcedimentoAgenda'),agenda.indexOf('function abrirConfiguracoesCoresAgenda')),c);
  c.aplicarCoresAgenda();
  ['#DD592C','#034F81','#8D78F2','#A9C2D1','#F5D42E'].forEach((cor,i)=>assert.equal(cards[i].styles['--agenda-cor-procedimento'],cor));
  assert(!cards[5].classes.has('tipo-personalizado'),'falta mantém a precedência da cor de falta');
  for(const nome of ['Osteopatia','Avaliação','Fisioterapia individual','Fisioterapia PCT','Liberação miofascial','Procedimento inativo']) assert(legenda.innerHTML.includes(nome),`legenda incompleta: ${nome}`);
  for(const cor of ['#DD592C','#034F81','#8D78F2','#A9C2D1','#F5D42E']) assert(legenda.innerHTML.includes(cor),'legenda e cartão devem usar exatamente a mesma cor');
  assert(!Object.hasOwn(c.obterCoresProcedimentosAgenda(),'invalido'),'cor inválida não entra em style');
  cards=[card('osteo','osteopatia')];c.aplicarCoresAgenda();assert.equal(cards[0].styles['--agenda-cor-procedimento'],'#DD592C','troca de semana não pode recolorir apenas nós descartados');
  salvas.set('kinesys_agenda_cores_procedimentos::clinic-cor','{}');c.aplicarCoresAgenda();assert.equal(cards[0].styles['--agenda-cor-procedimento'],'#2F8F72','remover personalização restaura cor base, sem estilo obsoleto');
  c.usuarioEhAdministradorAgenda=()=>false;c.aplicarCoresAgenda();assert(financeiro.hidden&&config.hidden,'legenda financeira e configurações respeitam permissão');
  c.usuarioLogado.clinica_id='outra';c.aplicarCoresAgenda();assert.equal(cards[0].styles['--agenda-cor-procedimento'],'#2F8F72','paleta não vaza entre clínicas');
  const render=agenda.slice(agenda.indexOf('function renderizarGradeSemanal'),agenda.indexOf('async function renderizarPainelAgenda'));
  assert(render.indexOf('aplicarCoresAgenda();')>render.lastIndexOf('container.appendChild(overlay);'),'cores só são aplicadas depois de inserir os cartões novos, nas duas visões');
  assert(html.includes('id="agenda_legenda_procedimentos"'));
  assert(html.includes('Pagamento realizado')&&html.includes('Pagamento pendente'));
  console.log('Cores: cinco procedimentos, legenda dinâmica, faltas, reconstrução, permissões e isolamento OK');
})();

(async()=>{
  const source=fs.readFileSync('src/patient/patient_records_browse_core-1.0.0.js','utf8');
  for(const financeiro of [true,false]){
    const chamadas=[],status={outerHTML:'',textContent:'',append(){}},botao={};
    const dialog={open:false,innerHTML:'',className:'',setAttribute(){},showModal(){this.open=true;},close(){this.open=false;},querySelector:s=>s==='[role="status"]'?status:botao};
    const a={id:'ag-fixture',data:'2026-10-13',hora_inicio:'18:00',hora_fim:'19:00',status:'atendido',procedimentos:{nome:'Osteopatia'},equipe:{nome:'Equipe fixture'}};
    let financeiroConsultado=0;
    const query={select(){return this;},eq(k,v){chamadas.push(['eq',k,v]);return this;},order(k,v){chamadas.push(['order',k,v.ascending]);return this;}};
    // Transporte fake devolve registro explícito; nenhuma gravação é oferecida.
    query.range=async(inicio,fim)=>{chamadas.push(['range',inicio,fim]);return {data:[a],error:null};};
    const c={console,document:{getElementById:()=>null,createElement:()=>dialog,body:{append(){}}},usuarioLogado:{clinica_id:'clinic-fixture'},telaPermitida:t=>t!=='tela_financeiro'||financeiro,_supabase:{from:t=>{chamadas.push(['from',t]);return query;}},escapeHTML:v=>String(v),obterMapaPagamentoAgendamentos:async()=>{financeiroConsultado++;return new Map([['ag-fixture',{verificado:true,pago:false,parcial:true}]]);}};
    c.window=c;vm.createContext(c);vm.runInContext(source.slice(source.indexOf('let historicoAgendamentosPacienteRevisao'),source.indexOf('if (document.readyState')),c);
    await c.abrirHistoricoAgendamentosPaciente('pac-fixture',2);
    assert(chamadas.some(x=>x[0]==='eq'&&x[1]==='clinica_id'&&x[2]==='clinic-fixture'));
    assert(chamadas.some(x=>x[0]==='eq'&&x[1]==='paciente_id'&&x[2]==='pac-fixture'));
    assert.deepEqual(chamadas.filter(x=>x[0]==='order').map(x=>x.slice(1)),[['data',false],['hora_inicio',false],['id',false]]);
    assert(chamadas.some(x=>x[0]==='range'&&x[1]===100&&x[2]===150),'histórico não pode limitar ao cache semanal nem ignorar paginação');
    assert(status.outerHTML.includes('13/10/2026')&&status.outerHTML.includes('18:00–19:00')&&status.outerHTML.includes('Osteopatia'));
    assert(status.outerHTML.includes(financeiro?'Pagamento parcial':'Acesso restrito'));
    assert.equal(financeiroConsultado,financeiro?1:0,'perfil restrito não consulta informações financeiras');
  }
  const sql=fs.readFileSync('SUPABASE_SQL/pacotes_contrato_canonico.sql','utf8');
  assert.match(sql,/new\.plano_id is not distinct from old\.plano_id/);
  assert.match(sql,/pl\.sessoes_contratadas=1/);
  assert.match(sql,/new\.paciente_id is not distinct from old\.paciente_id/);
  assert.match(sql,/new\.clinica_id is not distinct from old\.clinica_id/);
  console.log('Histórico por paciente/clínica, ordenação, paginação e privacidade financeira OK');
})().catch(e=>{console.error(e);process.exitCode=1;});

// Executa a busca real, inclusive ordenação antes de paginar.
(async()=>{
  const ds=fs.readFileSync('src/core/design_system-1.20.1.js','utf8');
  const nav={preservarResumoPacienteNaNavegacao:false,pacientesProntuariosCarregados:null,alvo:'tela_agenda',paciente:'pac-fixture',TITULOS:{},sincronizarIdentidadeContexto(){},limparSelecaoPaciente(){this.paciente='';},setTimeout(){},document:{getElementById:()=>null,querySelectorAll:()=>[],querySelector:()=>({id:nav.alvo}),body:{dataset:{},classList:{remove(){}}}}};
  nav.limparSelecaoPaciente=()=>{nav.paciente='';};nav.window={navegarPara:t=>{nav.alvo=t;}};
  vm.createContext(nav);vm.runInContext(ds.slice(ds.indexOf('function atualizarPaginaAtiva('),ds.indexOf('/* -------------------------- Contexto do paciente')),nav);
  nav.wrapNavegacao();nav.window.navegarPara('tela_buscar',true);nav.atualizarPaginaAtiva('tela_buscar');
  assert.equal(nav.paciente,'pac-fixture','atalho e reaplicação visual não podem limpar paciente escolhido');
  nav.window.navegarPara('tela_buscar');assert.equal(nav.paciente,'','menu Pacientes continua abrindo sem seleção anterior');
  const cards={innerHTML:''},paginacao={};
  const lista=[{id:'1',nome:'Dilson José dos Santos'},{id:'2',nome:'João José Vieira Júnior'},{id:'3',nome:'José Antônio Pinheiro Lima'},{id:'4',nome:'Josefina Alves'},{id:'5',nome:'Maria Josefa'}];
  const c={window:{obterPacientesSalvos:async()=>lista},document:{getElementById:id=>id==='ks_prontuario_cards'?cards:id==='ks_prontuario_paginacao'?paginacao:null},buscaRevisao:0,filtroProntuariosAtivo:'',paginaProntuarios:1,pacientesProntuariosCarregados:null,pacienteContextoId:'',escapeHTMLDS:s=>String(s)};
  vm.createContext(c);vm.runInContext(ds.slice(ds.indexOf('async function renderProntuarioCards('),ds.indexOf('window.renderProntuarioCards=renderProntuarioCards;')),c);
  for(const busca of ['jose','JOSÉ','  José  ']){
    await c.renderProntuarioCards(busca);
    assert(cards.innerHTML.indexOf('José Antônio')<cards.innerHTML.indexOf('Dilson José'),'primeiro nome exato tem prioridade sobre nome do meio');
    assert(cards.innerHTML.indexOf('José Antônio')<cards.innerHTML.indexOf('Josefina'),'palavra completa tem prioridade sobre prefixo parcial');
  }
  await c.renderProntuarioCards('jose antonio');assert(cards.innerHTML.includes('José Antônio'));assert(!cards.innerHTML.includes('Dilson'));
  await c.renderProntuarioCards('');assert(cards.innerHTML.indexOf('Dilson')<cards.innerHTML.indexOf('João'),'sem busca mantém ordem alfabética');
  const css=fs.readFileSync('styles/design_agenda.css','utf8');
  assert.match(css,/flex:0 0 auto!important;\s+white-space:nowrap!important;/,'navegação não deve quebrar palavras no notebook');
  assert(ds.includes("['agendamentos','Histórico de agendamentos','tela_agenda']"));
  assert(ds.includes("['financeiro','Financeiro','tela_financeiro']"));
  console.log('Busca de pacientes: relevância por início/palavra/acentos e ordem alfabética sem filtro OK');
})().catch(e=>{console.error(e);process.exitCode=1;});

// Executar os leitores reais: let usuarioLogado não é window.usuarioLogado.
const configReaders = configCores.slice(configCores.indexOf('function obterClinicaIdLocal()'), configCores.indexOf('function preencherCoresAgenda('));
const agendaReaders = agenda.slice(agenda.indexOf('function chaveCoresAgenda()'), agenda.indexOf('function aplicarCoresAgenda()'));
const storage = new Map();
const scope = {
  window: {}, state: {clinicaId: ''},
  localStorage: {getItem: key => storage.get(key) || null},
  AGENDA_CORES_PADRAO: {osteopatia:'#2F8F72',fisioterapia:'#2F7EAD',falta:'#7B878C'}
};
vm.createContext(scope);
vm.runInContext("let usuarioLogado = {clinica_id:'clinica-a'};", scope);
vm.runInContext(configReaders, scope);
const chaveConfig = vm.runInContext('chaveCoresAgenda()', scope);
assert.equal(chaveConfig, 'kinesys_agenda_cores::clinica-a', 'cores devem usar a sessão real mesmo antes de carregar o portal online');
storage.set(chaveConfig, JSON.stringify({osteopatia:'#771122',fisioterapia:'#225577',falta:'#555555'}));
vm.runInContext(agendaReaders, scope);
assert.equal(vm.runInContext('chaveCoresAgenda()', scope), chaveConfig, 'Agenda e Configurações precisam ler a mesma clínica');
assert.equal(vm.runInContext('obterCoresAgenda().fisioterapia', scope), '#225577', 'Agenda deve ler a cor salva, não o padrão');
vm.runInContext("usuarioLogado={clinica_id:'clinica-b'};", scope);
assert.equal(vm.runInContext('obterCoresAgenda().fisioterapia', scope), '#2F7EAD', 'cores de outra clínica não podem vazar');
vm.runInContext(configReaders, scope);
scope.state.clinicaId = 'clinica-a';
assert.equal(vm.runInContext('chaveCoresAgenda()', scope), 'kinesys_agenda_cores::clinica-b', 'sessão atual prevalece sobre estado antigo do portal');
const applied = {}, events = [], previews = {};
scope.localStorage.setItem = (key, value) => storage.set(key, value);
scope.ehAdministrador = () => true;
scope.CustomEvent = class {constructor(type, options){this.type=type;this.detail=options.detail;}};
scope.window.dispatchEvent = event => events.push(event);
scope.document = {
  getElementById: id => id === 'tela_agenda' ? {style:{setProperty:(key,value)=>{applied[key]=value;}}} : null,
  querySelector: selector => ({style:{setProperty:(_,value)=>{previews[selector]=value;}}})
};
vm.runInContext(configCores.slice(configCores.indexOf('function preencherCoresAgenda('),configCores.indexOf('function markupAparenciaAgenda()')),scope);
assert(vm.runInContext("salvarCoresAgenda({osteopatia:'#884422',fisioterapia:'#336699',falta:'#666666'})",scope));
assert.equal(JSON.parse(storage.get('kinesys_agenda_cores::clinica-b')).fisioterapia,'#336699');
assert.equal(applied['--agenda-cor-fisioterapia'],'#336699','salvar deve atualizar a Agenda montada');
assert.equal(events[0].type,'kinesys:agenda-cores-atualizadas','salvar deve notificar a Agenda sem recriar agendamentos');
vm.runInContext(agendaReaders,scope);
assert.equal(vm.runInContext('obterCoresAgenda().fisioterapia',scope),'#336699','reabertura/reload deve preservar a cor');
vm.runInContext("usuarioLogado={clinica_id:'clinica-a'};",scope);
assert.equal(vm.runInContext('obterCoresAgenda().fisioterapia',scope),'#225577','salvar na clínica B deve preservar a clínica A');

function trechoEntre(inicio, fim) {
  const a = agenda.indexOf(inicio);
  const b = agenda.indexOf(fim, a + inicio.length);
  assert.ok(a >= 0, `início não encontrado: ${inicio}`);
  assert.ok(b > a, `fim não encontrado depois de ${inicio}: ${fim}`);
  return agenda.slice(a, b);
}

const busca = trechoEntre('function normalizarBuscaPacienteAgenda', '\n// Status oficiais da Agenda');
const abrir = trechoEntre('async function abrirModalAgendamento', '\nasync function oferecerExcecaoJornadaProfissionalModal');
const slots = trechoEntre('function calcularSlotsLivres', '\nfunction diasVisiveisDaSemana');
const recorrencia = trechoEntre('function intervaloDisponivelNaJornadaRecorrencia', '\nasync function analisarDatasRecorrenciaAgenda');
const configurar = trechoEntre('function configurarModalEdicaoAtendimento', '\nasync function abrirModalAgendamento');
const editar = trechoEntre('async function salvarEdicaoAtendimentoAtual', '\nasync function salvarAgendamento');
const detalhe = trechoEntre('async function abrirDetalheAgendamento', '\nasync function editarAgendamentoAtual');

// Busca de paciente: um único campo funciona como entrada + seleção via lista suspensa.
const inputBusca = html.match(/<input[^>]*id="ag_paciente_busca"[^>]*>/)?.[0] || '';
assert.match(inputBusca, /type="search"/,'Busca de paciente deve usar input search');
assert.match(inputBusca, /role="combobox"/,'Busca de paciente deve expor semântica de combobox');
assert.match(inputBusca, /aria-controls="ag_paciente_sugestoes"/,'Combobox deve controlar a lista de sugestões');
assert.match(inputBusca, /oninput="aoDigitarPacienteAgendamento\(this\.value\)"/,
  'Busca de paciente deve reagir à digitação no mesmo campo');
assert.match(inputBusca, /onkeydown="aoTeclarBuscaPacienteAgendamento\(event\)"/,
  'Busca deve suportar teclado na lista de sugestões');
assert.match(html, /<input[^>]*type="hidden"[^>]*id="ag_paciente_select"[^>]*>/,
  'ID do paciente deve ser preservado em campo oculto para compatibilidade');
assert.doesNotMatch(html, /<select[^>]*id="ag_paciente_select"/,
  'Não pode existir um segundo seletor visual de paciente');
assert.match(html, /id="ag_paciente_sugestoes"[^>]*role="listbox"/,
  'Sugestões devem aparecer em uma lista suspensa acessível');
assert.match(html, /id="ag_paciente_busca_status"[^>]*aria-live="polite"/,
  'Busca deve expor status acessível');
assert.match(abrir, /prepararBuscaPacienteAgendamento\(pacientes, atendimentoEdicao\?\.paciente_id \|\| ''\)/,
  'Abertura deve preparar o autocomplete sem popular a interface com toda a base');
assert.doesNotMatch(abrir, /pacientes\.map\(p => `<option/,
  'Abertura não pode renderizar toda a base de pacientes em select');
assert.match(busca, /\.includes\(termoNormalizado\)/,
  'Filtro deve encontrar o trecho digitado em qualquer posição do nome');
assert.doesNotMatch(busca, /\.startsWith\(termoNormalizado\)/,
  'Filtro não deve ficar limitado ao início do nome');
assert.match(busca, /localeCompare\([^\n]*'pt-BR'[^\n]*sensitivity:\s*'base'/,
  'Resultados devem ficar em ordem alfabética pt-BR');
assert.match(busca, /function selecionarPacienteAgendamento/,
  'Autocomplete deve possuir seleção explícita da sugestão');
assert.match(busca, /popularPlanosNoAgendamento\(selecionado\.value, procedimentoId\)/,
  'Selecionar paciente deve atualizar os vínculos financeiros do modal');
assert.match(busca, /ArrowDown/,'Autocomplete deve aceitar navegação por seta para baixo');
assert.match(busca, /ArrowUp/,'Autocomplete deve aceitar navegação por seta para cima');
assert.match(busca, /event\.key === 'Enter'/,'Autocomplete deve aceitar Enter para selecionar');

// Impeccable/KDS: modal menos poluído, alinhado e sem caixas concorrentes.
assert.match(html, /class="modal-box agenda-appointment-modal"/,
  'Modal deve usar o contrato visual específico do agendamento');
assert.match(agendaCss, /#modal_agendamento \.agenda-patient-suggestions\{/,
  'Autocomplete deve possuir camada flutuante própria no Design System');
assert.match(agendaCss, /\.agenda-finance-link\{[\s\S]*?border-top:1px solid var\(--kds-line-soft\)/,
  'Blocos financeiros devem usar divisores discretos em vez de caixas empilhadas');
assert.match(agendaCss, /\.agenda-recurrencia\{[\s\S]*?background:transparent/,
  'Recorrência deve manter superfície plana e hierarquia por divisor');
assert.match(agendaCss, /font-size:var\(--kds-font-field\)/,
  'Campos do modal devem usar a escala tipográfica oficial');
assert.doesNotMatch(agendaCss, /@media\s*\([^)]*(?:max|min)-width\s*:\s*600px/i,
  'Modal não pode criar breakpoint fora do contrato KDS');

// Retroativo: o relógio não elimina horários passados; conflitos/bloqueios/jornada permanecem no mesmo fluxo.
assert.doesNotMatch(slots, /fimSlot\s*<=\s*minutoAtual|ehHoje|horário já passou/,
  'Slots passados de hoje devem continuar selecionáveis');
assert.doesNotMatch(recorrencia, /horário já passou|minutoAtual|hojeISO/,
  'Validação de recorrência não deve rejeitar horário apenas por já ter passado');
assert.match(slots, /bloqueiosAgendaPara/,'Bloqueios continuam protegidos');
assert.match(slots, /statusAgendaOcupaHorario/,'Conflitos existentes continuam protegidos');
assert.match(recorrencia, /intervaloDentroDaJornadaPadrao/,'Jornada continua protegida');

// Edição: mesmo id, permitindo data + hora + procedimento + profissional sem trocar paciente.
assert.match(detalhe, /id="btn_editar_atendimento"[^>]*onclick="editarAgendamentoAtual\(\)"[^>]*>Editar agendamento<\/button>/,
  'Detalhe deve oferecer botão explícito Editar agendamento');
assert.match(configurar, /pacienteBusca\.disabled = editando/,'Busca de paciente deve ficar bloqueada no modo edição');
assert.match(configurar, /data\.disabled = false/,'Data deve permanecer editável no modo edição');
assert.match(configurar, /Data, Horário, Procedimento ou Profissional/,
  'Aviso de edição deve comunicar os quatro campos editáveis');
assert.match(editar, /async function salvarEdicaoAtendimentoAtual\(\{ profissionalId, procedimentoId, dataISO, horarioVal,/,
  'Persistência de edição deve receber a nova data');
assert.match(editar, /existeConflitoImediato\(profissionalId, dataISO, horaInicio, horaFim, id\)/,
  'Conflito deve ser verificado na nova data ignorando apenas o próprio id');
assert.match(editar, /const alteracoes = \{[\s\S]*?\bdata:\s*dataISO[\s\S]*?\}/,
  'UPDATE deve incluir a nova data');
assert.match(editar, /\.eq\('id', id\)/,'UPDATE continua limitado ao mesmo id');
assert.doesNotMatch(editar, /\.insert\(|\.upsert\(/,'Edição não pode recriar o agendamento');

// Cache bust obrigatório mantendo Agenda lazy e Screen Loader contratual.
assert.match(html,/styles\/design_agenda\.css\?v=[^"\s]+/,
  'Index deve invalidar o CSS do modal corrigido');
assert.match(html,/src\/ui\/screen_loader-1\.25\.0\.js\?v=[^"\s]+/,
  'Index deve invalidar cache do Screen Loader para o autocomplete');
assert.match(loader,/src\/agenda\/agenda-1\.20\.0\.js\?v=[^'\s]+/,
  'Screen Loader deve entregar a Agenda corrigida');
assert.doesNotMatch(html,/<script[^>]+src\/agenda\/agenda-1\.20\.0\.js/i,'Agenda deve permanecer lazy');
assert.match(loader,/const VERSION='1\.25\.\d+-[^']+';/,'Screen Loader deve manter versão identificável sem congelar uma release antiga');
assert.match(html,/class="agenda-recurrencia-grid">\s*<div class="input-group[^>]*>\s*<label for="ag_recorrencia_tipo">/,'os dois campos de recorrência precisam ter rótulos dentro da mesma linha de grid');
assert.match(agendaCss,/#modal_agendamento \.agenda-recurrencia-grid>\.input-group>label\{[^}]*min-height:2\.6em/,'rótulos de uma ou duas linhas devem manter os campos alinhados');
assert.match(agendaCss,/#modal_agendamento \[hidden\],#modal_agendamento #ag_recorrencia_bloco \[hidden\]\{display:none!important\}/,'CSS não pode reabrir campos condicionais ocultos pela lógica do formulário');

console.log('Agenda UX corrections contract: autocomplete + modal polish OK');

(async()=>{
  const values={proc_id:'',proc_nome:'Pilates',proc_duracao:'50',proc_valor:'100',proc_sessoes_pacote:'1'};
  const elementos=Object.fromEntries(Object.entries(values).map(([id,value])=>[id,{value}]));
  const button={disabled:false};let writes=0,closed=0,payload,finish;
  const pending=new Promise(resolve=>{finish=resolve;});
  const context={
    usuarioLogado:{clinica_id:'clinic-a'},usuarioEhAdministradorAgenda:()=>true,
    document:{getElementById:id=>elementos[id],querySelectorAll:()=>[],querySelector:()=>button},
    _supabase:{from:table=>{assert.equal(table,'procedimentos');return{insert:rows=>{writes++;payload=rows[0];return pending;}};}},
    alert:message=>{throw new Error(message);},invalidarCacheProcedimentosAgenda:()=>{},
    fecharModal:()=>{closed++;},carregarProcedimentos:async()=>{},
    window:{KineSysConfiguracoesAgendaOnline:{refreshProcedures:async()=>{}}},console
  };
  vm.createContext(context);
  vm.runInContext(agenda.slice(agenda.indexOf('let agendaSalvandoProcedimento = false;'),agenda.indexOf('async function alternarAtivoProcedimento(')),context);
  const save=vm.runInContext('salvarProcedimento()',context);
  await vm.runInContext('salvarProcedimento()',context);
  assert.equal(writes,1,'cadastro não pode duplicar procedimento por duplo clique');
  assert.equal(payload.clinica_id,'clinic-a');assert.equal(payload.sessoes_pacote,1);
  finish({error:null});await save;
  assert.equal(closed,1);assert.equal(button.disabled,false);
  context.usuarioEhAdministradorAgenda=()=>false;
  await vm.runInContext('salvarProcedimento()',context);assert.equal(writes,1);
  console.log('Procedimentos: cadastro com sessões/escopo preservados e proteção contra duplo clique OK.');
})().catch(error=>{console.error(error);process.exitCode=1;});
