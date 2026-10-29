const fs = require('fs');
const assert = require('assert');

const migration = fs.readFileSync('SUPABASE_SQL/SUPABASE_MIGRACAO_AGENDAMENTO_ONLINE_CONFIGURACAO_ADMIN_20260912.sql', 'utf8');
const hardening = fs.readFileSync('SUPABASE_SQL/SUPABASE_MIGRACAO_AGENDAMENTO_ONLINE_HARDENING_20260913.sql', 'utf8');
const js = fs.readFileSync('src/admin/configuracoes_agendamento_online-1.0.0.js', 'utf8');
const css = fs.readFileSync('styles/configuracoes_agendamento_online-1.0.0.css', 'utf8');
const adminBootstrap = fs.readFileSync('src/admin/access_admin-1.0.0.js', 'utf8');
const html = fs.readFileSync('index.html', 'utf8');
const head = html.slice(0, html.indexOf('</head>'));
// O desenho não pode depender de montar a Agenda, do login ou de um módulo lazy.
for (const path of [
  'styles/configuracoes_agendamento_online-1.0.0.css',
  'styles/configuracoes_agendamento_online_layout-1.0.0.css'
]) {
  const links = [...head.matchAll(/<link\b[^>]*>/g)]
    .filter(([tag]) => tag.includes(`href="${path}?`));
  assert.strictEqual(links.length, 1, `${path} deve carregar uma única vez no HTML inicial`);
  assert(/rel="stylesheet"/.test(links[0][0]), 'layout deve ser stylesheet obrigatório, não preload ou lazy');
  const revision = js.match(/const ASSET_REVISION = '([^']+)'/)[1];
  assert(links[0][0].includes(`?v=${revision}"`), 'HTML e módulo devem usar a mesma revisão do layout');
}

assert(migration.includes("add column if not exists titulo_publico text not null default 'Agende seu atendimento'"),
  'configuração pública deve ter título seguro por padrão');
assert(migration.includes('add column if not exists agendamento_online_ativo boolean not null default false'),
  'profissionais não podem ser publicados online automaticamente');
assert(migration.includes('add column if not exists agendamento_online_ordem integer not null default 0'),
  'ordem pública de profissionais deve ser explícita');
assert(!/grant\s+[^;]+\s+to\s+anon\b/i.test(migration),
  'configuração administrativa não pode conceder acesso de tabela a anon');
assert((hardening.match(/in \('MASTER', 'MASTER_FEM'\)/g) || []).length >= 4,
  'publicação semanal deve permanecer gravável somente pela administração');

assert(js.includes("from('configuracoes_agendamento_online')"),
  'aba deve persistir configuração administrativa no Supabase');
assert(js.includes("from('disponibilidade_agendamento_online')"),
  'aba deve gerenciar publicação de horários existente');
assert(js.includes("from('equipe')"),
  'aba deve controlar quais profissionais aparecem online');
assert(js.includes("from('procedimentos')"),
  'aba deve controlar quais procedimentos aparecem online');
assert(!js.includes("from('agendamentos')"),
  'configuração administrativa não deve criar ou alterar agendamentos');
assert(js.includes('capturarHorariosProfissionalAtual'),
  'editor deve validar e capturar os horários por profissional');
assert(js.includes('existem horários publicados que se sobrepõem'),
  'editor deve impedir sobreposição de períodos publicados');
assert(js.includes('Para abrir o portal, publique pelo menos um profissional.'),
  'portal ativo deve exigir ao menos um profissional publicado');
assert(js.includes('Para abrir o portal, publique pelo menos um procedimento.'),
  'portal ativo deve exigir ao menos um procedimento publicado');
assert(js.includes('Para abrir o portal, publique pelo menos um período para um profissional publicado.'),
  'portal ativo deve exigir disponibilidade de profissional efetivamente publicado');
assert(js.includes('não possui profissional publicado com horário online compatível'),
  'procedimento restrito deve exigir profissional publicado com disponibilidade online');
assert(js.includes('profissionaisComHorarios'),
  'validação administrativa deve cruzar procedimento com profissional que possui período publicado');
assert(js.includes('const anterior = state.profissionalSelecionado') && js.includes('evento.target.value = anterior'),
  'troca de profissional não deve descartar intervalos inválidos ainda em edição');
assert(js.includes("await salvarConfiguracaoPortal(client, { ...cfg, ativo: false })") &&
       js.includes('if (cfg.ativo) await salvarConfiguracaoPortal(client, cfg)'),
  'salvamento deve fechar o portal antes das dependências e reativar somente ao final');
assert(js.includes('window.KineSysConfiguracoesAgendaOnline'),
  'módulo deve expor contrato estável para abertura/refresh');
assert(js.includes('Procedimentos e cores') && js.includes('ks_config_panel_aparencia'),
  'Configurações deve oferecer uma aba específica para aparência da Agenda');
assert(js.includes('kinesys_agenda_cores::'),
  'cores devem ser isoladas por clínica no armazenamento do navegador');
assert(js.includes("osteopatia: 'Osteopatia'") && js.includes("fisioterapia: 'Fisioterapia'") && js.includes("falta: 'Falta'") && js.includes('ks_agenda_cor_${tipo}'),
  'administrador deve configurar osteopatia, fisioterapia e falta separadamente');
assert(js.includes("new CustomEvent('kinesys:agenda-cores-atualizadas'"),
  'salvamento deve atualizar imediatamente a Agenda já carregada');
assert(!js.includes('setInterval('),
  'configuração não deve usar polling contínuo');

assert(adminBootstrap.includes('configuracoes_agendamento_online-1.0.0.js'),
  'bootstrap administrativo deve carregar a nova aba sem acoplar ao Motor Clínico');
assert(adminBootstrap.includes('ONLINE_CONFIG_REVISION'),
  'asset da configuração deve ter revisão explícita para invalidação de cache');

assert(css.includes('min-height: 44px'),
  'controles móveis devem preservar alvos de toque de pelo menos 44px');
assert(css.includes('font: 400 16px/'),
  'campos móveis devem usar 16px para evitar zoom e preservar legibilidade');
assert(css.includes('env(safe-area-inset-bottom)'),
  'barra de salvar deve respeitar safe area do celular');
assert(css.includes('@media (max-width: 430px)'),
  'layout deve tratar celulares estreitos no breakpoint oficial');
assert(css.includes('@media (min-width: 701px)'),
  'layout deve evoluir para desktop somente no breakpoint oficial complementar');
assert(css.includes('grid-template-columns: minmax(0, .8fr) minmax(0, 1.2fr)'),
  'configuração desktop deve modularizar profissionais e procedimentos sem empilhar tudo em largura total');
assert(css.includes('grid-template-columns: 112px 112px 82px'),
  'editor desktop de horários deve dimensionar inputs e ação pelo conteúdo, sem campos de hora elásticos');
assert(css.includes('max-width: 360px') && css.includes('.ks-online-profissional-select'),
  'seleção de profissional deve permanecer compacta e proporcional ao conteúdo');
assert(!/#[0-9a-f]{3,8}\b/i.test(css),
  'CSS novo deve usar somente tokens --kds-* e não cores locais');

console.log('agendamento_online_admin_config.contract: OK');
// Execute the actual source of the mirror editor without substituting its rules.
{
 const vm=require('node:vm'),els=new Map([['ks_online_seguir_agenda',{checked:true}],['ks_online_horarios',{innerHTML:''}]]);
 const source=js.slice(js.indexOf('    function segueAgendaInterna()'),js.indexOf('    function horariosDoProfissional'));
 const publication=js.slice(js.indexOf('    function estadoPublicacaoAtual()'),js.indexOf('    function atualizarResumoPublicacao()'));
 const ctx={document:{getElementById:id=>els.get(id)},state:{profissionais:[{id:'p',agendamento_online_ativo:true}],procedimentos:[{id:'service',agendamento_online_ativo:true,profissionais_ids:['p']}],horariosAgenda:[{profissional_id:null,dia_semana:1,hora_inicio:'08:00:00',hora_fim:'12:00:00'},{profissional_id:null,dia_semana:1,hora_inicio:'14:00:00',hora_fim:'19:00:00'}],disponibilidadeEditada:[{profissional_id:'p',dia_semana:1,hora_inicio:'08:00',hora_fim:'12:00'}]},DIAS:[{valor:1},{valor:2}],chaveHorario:x=>[x.profissional_id,x.dia_semana,x.hora_inicio,x.hora_fim].join('|')};
 vm.runInNewContext(source+publication+'this.mirror=horariosDaAgendaPublicaveis;this.pub=estadoPublicacaoAtual;',ctx);
 assert.equal(ctx.pub().horarios.length,2);assert.equal(ctx.pub().procedimentoIncompativel,null);
 ctx.state.horariosAgenda.push({profissional_id:'p',dia_semana:1,hora_inicio:'15:00:00',hora_fim:'18:00:00'});assert.equal(ctx.mirror().length,1);assert.equal(ctx.mirror()[0].hora_inicio,'15:00');assert.equal(ctx.mirror()[0].hora_fim,'18:00');
 els.get('ks_online_seguir_agenda').checked=false;assert.equal(ctx.pub().horarios.length,1);assert.equal(ctx.pub().horarios[0].hora_inicio,'08:00','desativar o vínculo recupera períodos manuais preservados');
 assert(js.includes('if(!cfg.seguir_agenda_interna){'),'vínculo não pode regravar nem apagar períodos manuais');
 console.log('PASS configuração vinculada: jornada geral/própria, compatibilidade de serviço e preservação da grade manual.');
}
// Render the linked summary and switch back to the unchanged manual editor.
{
 const vm=require('node:vm');
 const container={innerHTML:'',dataset:{}},toggle={checked:true};
 const state={profissionalSelecionado:'p',profissionais:[{id:'p'},{id:'other'}],horariosAgenda:[
  {profissional_id:null,dia_semana:1,hora_inicio:'08:00:00',hora_fim:'12:00:00'},
  {profissional_id:null,dia_semana:1,hora_inicio:'14:00:00',hora_fim:'19:00:00'},
  {profissional_id:'p',dia_semana:1,hora_inicio:'15:00:00',hora_fim:'18:00:00'},
  {profissional_id:'other',dia_semana:1,hora_inicio:'09:00:00',hora_fim:'11:00:00'}
 ],disponibilidadeEditada:[{profissional_id:'p',dia_semana:1,hora_inicio:'10:00',hora_fim:'11:00'}]};
 const ctx={state,document:{getElementById:id=>id==='ks_online_horarios'?container:id==='ks_online_seguir_agenda'?toggle:null},escapeHTML:s=>String(s).replaceAll('&','&amp;').replaceAll('<','&lt;'),chaveHorario:x=>[x.profissional_id,x.dia_semana,x.hora_inicio,x.hora_fim].join('|')};
 vm.createContext(ctx);
 vm.runInContext(js.slice(js.indexOf('const DIAS ='),js.indexOf('const state ='))+js.slice(js.indexOf('function segueAgendaInterna()'),js.indexOf('function adicionarIntervalo(')),ctx);
 const before=JSON.stringify(state);
 vm.runInContext('renderizarHorariosProfissional()',ctx);
 assert.equal(container.dataset.scheduleMode,'agenda');
 assert(container.innerHTML.indexOf('ks-online-schedule-note')<container.innerHTML.indexOf('<dl '),'note must be outside the day grid');
 assert.equal((container.innerHTML.match(/<dt>/g)||[]).length,7,'seven days must appear exactly once');
 assert(container.innerHTML.indexOf('Segunda-feira')<container.innerHTML.indexOf('Terça-feira'));
 assert(container.innerHTML.includes('15:00–18:00'));
 assert(!container.innerHTML.includes('09:00–11:00'),'another professional cannot leak into the summary');
 assert.equal((container.innerHTML.match(/Não atende/g)||[]).length,6);
 assert.equal(JSON.stringify(state),before,'rendering the summary cannot change schedule state');
 toggle.checked=false;vm.runInContext('renderizarHorariosProfissional()',ctx);
 assert.equal(container.dataset.scheduleMode,'manual');
 assert.equal((container.innerHTML.match(/data-dia-card=/g)||[]).length,7);
 assert(container.innerHTML.includes('data-hora-inicio')&&container.innerHTML.includes('value="10:00"'));
 assert(!container.innerHTML.includes('ks-online-linked-week'));
 assert.equal(JSON.stringify(state),before,'switching display must preserve the manual periods');
 state.profissionalSelecionado='';vm.runInContext('renderizarHorariosProfissional()',ctx);
 assert.equal(container.dataset.scheduleMode,'empty');assert(!container.innerHTML.includes('<dl '));
 console.log('PASS resumo de horários: sete dias ordenados, aviso separado, profissional correto e editor manual preservado.');
}
// O layout da Comunicação deve carregar mesmo se o perfil público da Agenda
// foi pré-carregado antes de existir uma sessão administrativa.
const garantirCSS = js.slice(js.indexOf('function garantirCSS()'), js.indexOf('function setStatus('));
assert(garantirCSS.includes('configuracoes_agendamento_online_layout-1.0.0.css'), 'o hub deve carregar sua apresentação sem depender do perfil público');
assert(adminBootstrap.includes('KineSysConfiguracoesAgendaOnlinePerfilPublico.onOpen?.()'), 'módulo já carregado deve poder montar após login');
const vm = require('vm');
const perfil = fs.readFileSync('src/admin/configuracoes_agendamento_online_perfil_publico-1.0.0.js','utf8');
const lifecycle = {window:{usuarioLogado:{tipo:'SECRETARIA'}},document:{readyState:'complete'},mountCount:0,loadCount:0};
// Só os colaboradores de DOM/rede são simulados; onOpen é executado intacto.
const instrumentado = perfil
  .replace('function montar() {', 'function montar() { mountCount++; state.mounted=true; return true; } function montarDOMOriginal() {')
  .replace('async function carregar() {', 'async function carregar() { loadCount++; } async function carregarDadosOriginal() {');
vm.runInNewContext(instrumentado,lifecycle);
const perfilAPI = lifecycle.window.KineSysConfiguracoesAgendaOnlinePerfilPublico;
assert.strictEqual(perfilAPI.onOpen(),false,'abertura sem administrador não pode montar o perfil');
assert.strictEqual(lifecycle.mountCount,0);
lifecycle.window.usuarioLogado={tipo:'MASTER'};
assert.strictEqual(perfilAPI.onOpen(),true,'restauração administrativa precisa montar o módulo pré-carregado');
assert.strictEqual(lifecycle.mountCount,1);
perfilAPI.onOpen();
assert.strictEqual(lifecycle.mountCount,1,'reabertura não deve duplicar seções');
assert.strictEqual(lifecycle.loadCount,1,'reabertura atualiza dados sem duplicar a montagem');
console.log('Configuração cold boot: estilos independentes, montagem após login e reabertura idempotente OK.');
const ativacao=adminBootstrap.slice(adminBootstrap.indexOf('function ativarConfiguracoesAgenda()'),adminBootstrap.indexOf('function carregarLayoutAgendaOnline()'));
assert(ativacao.indexOf('configuracoes?.onOpen?.()') < ativacao.indexOf('KineSysConfiguracoesAgendaOnlinePerfilPublico?.onOpen?.()'), 'o hub deve montar antes do perfil público');
assert(ativacao.indexOf('KineSysConfiguracoesAgendaOnlinePerfilPublico?.onOpen?.()') < ativacao.indexOf('KineSysConfiguracoesAgendaOnlineLayout?.onOpen?.()'), 'o perfil deve montar antes do workspace da agenda');

const layout = fs.readFileSync('src/admin/configuracoes_agendamento_online_layout-1.0.0.js','utf8');
assert(layout.includes('function prepararPaginas()') && layout.includes('function showPage(aba)'), 'sete áreas devem usar composição e navegação próprias');
assert(!layout.includes('cloneNode(true)); mensagens'), 'formulários não podem ser clonados para criar páginas paralelas');
assert(layout.includes('equipeOrigem') && layout.includes('destino.appendChild(el)'), 'a página Equipe original deve receber seus mesmos nós ao sair das Configurações');
assert(layout.includes('saveClinic?.()') && perfil.includes('if (!somenteClinica && !somentePortal && state.profissionalId)'), 'salvar Clínica não pode sobrescrever o perfil do profissional oculto');
assert(js.includes('data-adicionar-procedimento') && layout.includes('window.abrirModalProcedimento?.('), 'Adicionar procedimento deve abrir o CRUD existente');
assert(html.includes('id="proc_sessoes_pacote"'), 'o formulário de procedimento deve preservar o campo exigido pelos planos');

(async () => {
  const inputs = new Map(['osteopatia','fisioterapia','falta'].map(tipo => [`ks_agenda_cor_${tipo}`,{value:'#336699'}]));
  const feedback={hidden:true,textContent:'',className:''},button={disabled:false};
  inputs.set('ks_agenda_cores_feedback',feedback);inputs.set('ks_agenda_cores_salvar',button);
  let finish, writes=0, cacheWrites=0, updates=0, payload, clinicFilter;
  const pending = new Promise(resolve=>{finish=resolve;});
  const context = {
    state:{carregado:true}, ehAdministrador:()=>true, resolverClinicaId:async()=> 'clinic-a',
    AGENDA_CORES_PADRAO:{osteopatia:'#2F8F72',fisioterapia:'#2F7EAD',falta:'#7B878C'},
    document:{getElementById:id=>inputs.get(id)||null,querySelectorAll:()=>[{dataset:{corProcedimento:'procedure-a'},value:'#8844AA'}]},
    corHexValida:value=>/^#[0-9a-f]{6}$/i.test(value), lerCoresAgenda:()=>({}), lerCoresProcedimentos:()=>({'procedure-b':'#115522'}),
    chaveCoresProcedimentos:()=> 'scoped-procedures',localStorage:{setItem:()=>{cacheWrites++;}},
    salvarCoresAgenda:()=>{updates++;return true;}, CustomEvent:class {},window:{dispatchEvent:()=>{}},
    sb:()=>({from:table=>{
      assert.equal(table,'configuracoes_agendamento_online');
      return {update:p=>{
        writes++;payload=p;
        return {eq:(key,value)=>{
          assert.equal(key,'clinica_id');clinicFilter=value;
          return {select:()=>pending};
        }};
      }};
    }})
  };
  vm.createContext(context);
  vm.runInContext('let salvandoCores=false;'+js.slice(js.indexOf('async function salvarCoresCompartilhadas()'),js.indexOf('function markupAparenciaAgenda()')),context);
  const first=vm.runInContext('salvarCoresCompartilhadas()',context);
  await new Promise(resolve=>setImmediate(resolve));
  const second=await vm.runInContext('salvarCoresCompartilhadas()',context);
  assert.equal(second,false,'duplo clique deve ser rejeitado por estado, não só disabled');
  assert.equal(writes,1);assert.equal(cacheWrites,0,'não anunciar persistência local antes do servidor');
  assert.equal(clinicFilter,'clinic-a');assert.equal(payload.cores_agenda.procedimentos['procedure-a'],'#8844AA');
  assert.equal(payload.cores_agenda.procedimentos['procedure-b'],'#115522','cores de procedimentos fora da lista devem ser preservadas');
  finish({data:[{clinica_id:'clinic-a'}],error:null});
  assert.equal(await first,true);assert.equal(cacheWrites,1);assert.equal(updates,1);assert.equal(button.disabled,false);
  context.sb=()=>({from:()=>({update:()=>({eq:()=>({select:async()=>({data:null,error:{message:'offline'}})})})})});
  assert.equal(await vm.runInContext('salvarCoresCompartilhadas()',context),false);
  assert.equal(updates,1,'falha no servidor não pode alterar a aparência como se tivesse salvo');
  assert(feedback.textContent.includes('offline'));assert.equal(button.disabled,false);
  context.ehAdministrador=()=>false;
  assert.equal(await vm.runInContext('salvarCoresCompartilhadas()',context),false,'perfil sem autorização não salva cores');
  console.log('Cores compartilhadas: escopo, cor arbitrária por ID, duplo clique, erro e confirmação do servidor OK.');
  const refreshSource = js.slice(js.indexOf('async refreshProcedures()'), js.lastIndexOf('\n    });')).replace('async refreshProcedures()', 'async function refreshProcedures()');
  const refreshContext = {
    state:{clinicaId:'clinic-a',procedimentos:[{id:'old',agendamento_online_ativo:false,_onlineOriginal:true}]},
    resolverClinicaId:async()=> 'clinic-a',
    sb:()=>({from:()=>({select:fields=>{
      assert(fields.includes('profissionais_ids') && fields.includes('agendamento_online_ativo'));
      const query={eq:()=>query,order:async()=>({data:[{id:'old',agendamento_online_ativo:true,profissionais_ids:['prof']},{id:'new',agendamento_online_ativo:false}],error:null})};
      return query;
    }})}),renderizarProcedimentos:()=>{},renderizarCoresProcedimentos:()=>{},atualizarResumoPublicacao:()=>{}
  };
  vm.createContext(refreshContext);vm.runInContext(refreshSource,refreshContext);
  await vm.runInContext('refreshProcedures()',refreshContext);
  assert.equal(refreshContext.state.procedimentos[0].agendamento_online_ativo,false,'refresh do CRUD deve preservar a escolha online ainda não salva');
  assert.equal(refreshContext.state.procedimentos[0]._onlineOriginal,true,'baseline de persistência deve ser mantida para salvar o rascunho');
  assert.equal(refreshContext.state.procedimentos[1]._onlineOriginal,false,'novo procedimento deve receber baseline do servidor');
  refreshContext.state.clinicaId='clinic-b';
  const previous=refreshContext.state.procedimentos;
  await vm.runInContext('refreshProcedures()',refreshContext);
  assert.strictEqual(refreshContext.state.procedimentos,previous,'resposta de outra clínica não deve substituir o estado atual');
  console.log('Refresh de procedimentos: rascunhos, vínculos e isolamento entre clínicas preservados.');
})().catch(error=>{console.error(error);process.exitCode=1;});
// Exercise actual notification policy and profile save scopes with synthetic identities.
(async()=>{
 const vm=require('node:vm'),source=fs.readFileSync('src/agenda/agenda_notificacoes_core-1.20.1.js','utf8');
 let reads=0;const fields=new Map();const rows=[{id:'old',tipo:'horario_extraordinario',criada_em:new Date(Date.now()-25*3600000).toISOString(),lida:false},{id:'current',tipo:'horario_extraordinario',criada_em:new Date().toISOString(),lida:false},{id:'pending',tipo:'agendamento_online',criada_em:new Date(Date.now()-80*3600000).toISOString(),lida:false}];
 const ctx={Date,console,window:{},usuarioLogado:{id:'synthetic',tipo:'MASTER',clinica_id:'clinic-a'},document:{getElementById:id=>fields.get(id)||null,addEventListener:()=>{}},_supabase:{rpc:async(name)=>{reads++;return {data:name==='kinesys_configuracao_avisos'?{horas:24,automatico:true,clinica_id:'clinic-a'}:rows,error:null};}},escapeHTML:s=>s};vm.createContext(ctx);vm.runInContext(source,ctx);
 await vm.runInContext('carregarNotificacoesAgenda({avisar:false})',ctx);assert.equal(vm.runInContext('obterNotificacoesAtuaisAgenda().length',ctx),2,'client also filters expired events when clock advances');
 await vm.runInContext('alternarHistoricoAvisosAgenda()',ctx);assert.equal(vm.runInContext('agendaHistoricoAvisos.length',ctx),3);assert(rows.every(n=>!n.lida),'opening history must not mark as read');
 let done;ctx._supabase.rpc=()=>new Promise(resolve=>{done=resolve;});const stale=vm.runInContext('carregarRegrasAvisosAgenda()',ctx);ctx.usuarioLogado={...ctx.usuarioLogado,clinica_id:'clinic-b'};done({data:{horas:6,automatico:true,clinica_id:'clinic-a'},error:null});assert.equal(await stale,null,'late result cannot install previous clinic policy');
 ctx.usuarioLogado.tipo='FISIOTERAPEUTA';await assert.rejects(vm.runInContext('salvarRegrasAvisosAgenda(24,true)',ctx),/administradores/);
 console.log('PASS avisos client: expiração, histórico sem quitação/leitura, troca de contexto e autorização.');
 const form=new Map(Object.entries({ks_online_v2_nome_publico:'Clínica A',ks_online_v2_endereco:'Endereço A',ks_online_v2_telefone:'1133334444',ks_online_v2_email:'contato@example.invalid',ks_online_v2_slug:'outro-link-em-rascunho',ks_online_v2_mensagem_confirmacao:'Mensagem em rascunho'}).map(([id,value])=>[id,{value,focus(){}}]));let writes=[],finish;
 const saveSource=perfil.slice(perfil.indexOf('    async function salvar('),perfil.indexOf('    function inicializar()'));
 const saveCtx={state:{clinicaId:'a',saving:false,config:{slug_publico:'link-salvo',mensagem_confirmacao:'Mensagem salva'},profissionalId:'p',perfis:new Map()},sb:()=>({from:table=>({update:payload=>{writes.push({table,payload});return {eq:()=>({select:()=>({single:async()=>({data:{clinica_id:'a'},error:null})})})};}})}),ehAdministrador:()=>true,$:id=>form.get(id),slugificar:v=>v,feedback:()=>{},setSaving:value=>{saveCtx.state.saving=value;},window:{},atualizarLink:()=>{},console,Date};vm.createContext(saveCtx);vm.runInContext(saveSource,saveCtx);
 await vm.runInContext('salvar({somenteClinica:true})',saveCtx);assert.equal(writes.length,1);assert(!('slug_publico' in writes[0].payload));assert(!('mensagem_confirmacao' in writes[0].payload));assert.equal(saveCtx.state.config.slug_publico,'link-salvo');
 writes=[];await vm.runInContext('salvar({somentePortal:true})',saveCtx);assert.equal(writes.length,1);assert(!('nome_publico' in writes[0].payload));assert(!('telefone_publico' in writes[0].payload));assert.equal(writes[0].payload.slug_publico,'outro-link-em-rascunho');
 console.log('PASS salvamentos separados: Clínica não grava rascunho do portal; portal não grava contato nem profissional oculto.');
})().catch(error=>{console.error(error);process.exitCode=1;});

assert(fs.readFileSync("styles/design_base.css","utf8").includes("#ks_team_drawer [hidden]{display:none!important}"),"a edição de equipe deve respeitar campos ocultos de senha inicial");

// Exercise the actual navigation functions: Cores is a stage, not another settings page.
{
 const stagesSource=layout.slice(layout.indexOf('const STAGES ='),layout.indexOf('const ONLINE_REQUIRED'));
 const stageContext={sessionStorage:{values:new Map(),setItem(k,v){this.values.set(k,v);},getItem(k){return this.values.get(k);}},window:{},setTimeout:()=>{},atualizarContextos:()=>{},atualizarStageNativo:()=>{}};
 vm.createContext(stageContext);
 vm.runInContext(stagesSource+';this.stages=STAGES;',stageContext);
 const sections=new Map(stageContext.stages.flatMap(s=>s.sections).map(id=>[id,{hidden:false}]));
 const colors=sections.get('ks_config_panel_aparencia');colors.unsavedColor='#123456';
 const attrs=()=>({attributes:{},setAttribute(k,v){this.attributes[k]=v;}});
 const buttons=stageContext.stages.map(s=>({...attrs(),dataset:{onlineStage:s.id},focus(){stageContext.document.activeElement=this;},scrollIntoView(){},closest(){return this;}}));
 const heading={textContent:''},description={textContent:''},badge={hidden:false},add={hidden:true},savebar={hidden:false},surface={dataset:{}};
 const header={querySelector:s=>({'h2':heading,'p':description,'.ks-online-badge':badge,'[data-adicionar-procedimento]':add})[s]};
 const handlers={},nav={...attrs(),addEventListener:(name,fn)=>{handlers[name]=fn;}};
 const shell={querySelector:()=>nav,querySelectorAll:()=>buttons,addEventListener:()=>{}};
 const media={matches:false,addEventListener:(name,fn)=>{media.change=fn;}};
 stageContext.window.matchMedia=()=>media;
 stageContext.document={getElementById:id=>sections.get(id),querySelector:s=>s.endsWith('.ks-online-topline')?header:s.endsWith('.ks-online-surface')?surface:savebar,querySelectorAll:()=>buttons,activeElement:buttons[0]};
 vm.runInContext("let currentStage='geral';const STORAGE_KEY='kinesys_online_config_stage';"+layout.slice(layout.indexOf('function navMarkup()'),layout.indexOf('const AREAS'))+layout.slice(layout.indexOf('function mostrarStage('),layout.indexOf('function montar()')),stageContext);
 const markup=vm.runInContext('navMarkup()',stageContext);
 assert.equal((markup.match(/role="tablist"/g)||[]).length,1);
 assert.equal((markup.match(/role="tab"/g)||[]).length,6);
 assert(!markup.includes('data-config-destino'),'no duplicate shortcut outside the canonical six stages');
 stageContext.shell=shell;vm.runInContext('ligarEventos(shell)',stageContext);
 assert.equal(nav.attributes['aria-orientation'],'vertical');
 media.matches=true;media.change();assert.equal(nav.attributes['aria-orientation'],'horizontal');
 const check=id=>{
  assert.equal(buttons.filter(b=>b.attributes['aria-selected']==='true').length,1);
  assert.equal(buttons.find(b=>b.tabIndex===0).dataset.onlineStage,id);
  for(const stage of stageContext.stages)for(const section of stage.sections)assert.equal(sections.get(section).hidden,stage.id!==id);
  assert.equal(savebar.hidden,id==='cores');assert.equal(add.hidden,id!=='cores');
  assert.strictEqual(sections.get('ks_config_panel_aparencia'),colors);
  assert.equal(colors.unsavedColor,'#123456','navigation must not recreate or reset color controls');
 };
 for(let repeat=0;repeat<2;repeat++)for(const button of buttons){handlers.click({target:button});check(button.dataset.onlineStage);}
 handlers.click({target:buttons[0]});
 for(const [key,id] of [['End','cores'],['Home','geral'],['ArrowUp','cores'],['ArrowDown','geral'],['ArrowRight','profissional'],['ArrowLeft','geral']]){
  let prevented=false;handlers.keydown({key,preventDefault(){prevented=true;}});assert(prevented);check(id);
  assert.equal(stageContext.document.activeElement.dataset.onlineStage,id,'keyboard focus must stay on the selected tab');
 }
 assert.equal(heading.textContent,'Agenda Online');
 const panels=new Map(),tabs=new Map();
 const areas=['clinica','online','equipe','mensagens','documentos','integracoes','dados'].map(id=>[id,id]);
 for(const [id] of areas){panels.set('ks_config_panel_'+id,{hidden:true});tabs.set('ks_config_tab_'+id,attrs());}
 const coreContext={CONFIG_AREAS:areas,montarHub:()=>true,carregar:()=>{},sessionStorage:stageContext.sessionStorage,document:{getElementById:id=>panels.get(id)||tabs.get(id)},window:{KineSysConfiguracoesAgendaOnlineLayout:{showPage:aba=>{if(aba==='online')vm.runInContext('mostrarStage(sessionStorage.getItem(STORAGE_KEY))',stageContext);}}}};
 vm.createContext(coreContext);vm.runInContext(js.slice(js.indexOf('function abrirAba('),js.indexOf('async function onOpen()')),coreContext);
 vm.runInContext("abrirAba('aparencia')",coreContext);check('cores');
 assert.equal(tabs.get('ks_config_tab_online').attributes['aria-selected'],'true');assert.equal(panels.get('ks_config_panel_online').hidden,false);
 vm.runInContext("abrirAba('clinica');abrirAba('online')",coreContext);check('cores');
 assert.equal(stageContext.sessionStorage.getItem('kinesys_config_tab'),'online','legacy entry normalizes the primary tab');
 console.log('PASS navegação única: seis etapas, Cores, rascunhos, retorno, teclado e atalho legado.');
 const entries=[],bootContext={sessionStorage:stageContext.sessionStorage,telaConfiguracoesAtiva:()=>true,ehMaster:()=>true,window:{}};
 vm.createContext(bootContext);vm.runInContext(adminBootstrap.slice(adminBootstrap.indexOf("let agendaStagePendente="),adminBootstrap.indexOf('function carregarLayoutAgendaOnline()')),bootContext);
 bootContext.sessionStorage.setItem('kinesys_config_tab','aparencia');
 vm.runInContext('prepararEntradaAgendaConfiguracoes(true);ativarConfiguracoesAgenda()',bootContext);
 bootContext.window.KineSysConfiguracoesAgendaOnline={onOpen(){},abrirAba(aba){entries.push(aba);}};
 bootContext.window.KineSysConfiguracoesAgendaOnlineLayout={onOpen(){},showStage(stage){entries.push(stage);}};
 vm.runInContext('ativarConfiguracoesAgenda()',bootContext);assert.deepEqual(entries.slice(-2),['online','cores'],'cold lazy load must preserve the Agenda → Cores intent');
 entries.length=0;bootContext.sessionStorage.setItem('kinesys_config_tab','online');vm.runInContext('prepararEntradaAgendaConfiguracoes(true);ativarConfiguracoesAgenda()',bootContext);
 assert.deepEqual(entries,['clinica'],'normal settings entry still starts with Clínica');
 console.log('PASS entrada a frio: atalho Cores preservado sem mudar a entrada normal em Clínica.');
}
