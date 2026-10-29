const fs = require('fs');
const assert = require('assert');

const html = fs.readFileSync('agendamento/index.html', 'utf8');
const css = fs.readFileSync('agendamento/agendamento-publico.css', 'utf8');
const modelCss = fs.readFileSync('agendamento/agendamento-modelo2.css', 'utf8');
const js = fs.readFileSync('agendamento/agendamento-publico-v2.js', 'utf8');
const edge = fs.readFileSync('supabase/functions/agendamento-publico/index.ts', 'utf8');
const profileEdge = fs.readFileSync('supabase/functions/agendamento-publico-perfil/index.ts', 'utf8');

assert(html.includes('viewport-fit=cover'), 'portal deve respeitar safe-area em celulares');
assert(html.includes('data-step="profissional"') && html.includes('data-step="procedimento"') && html.includes('data-step="horario"') && html.includes('data-step="dados"'),
  'portal deve usar fluxo progressivo profissional → atendimento → horário → dados');
assert(html.includes('Seu atendimento foi agendado!'),
  'confirmação deve usar a mensagem principal definida para o paciente');
assert(html.includes('ks_public_profile_insurances') && html.includes('Convênios atendidos'),
  'portal deve reservar área pública para convênios do profissional');
const controller = html.match(/agendamento-publico-v2\.js\?v=([^" ]+)/);
assert(controller && html.includes(`calendario-publico.js?v=${controller[1]}`) && html.includes(`agendamento-modelo2.css?v=${controller[1]}`),
  'controller, calendário e layout público devem carregar a mesma revisão');

assert(css.includes('env(safe-area-inset-bottom)'), 'portal deve proteger safe-area inferior no celular');
assert(css.includes('env(safe-area-inset-left)') && css.includes('env(safe-area-inset-right)'),
  'portal deve proteger as laterais do notch também em orientação paisagem');
assert(css.includes('min-height:44px') || css.includes('min-height: 44px'), 'controles touch devem manter alvo confortável');
assert(css.includes('font-size:16px'), 'campos mobile devem manter 16px para legibilidade e evitar zoom automático');
assert(css.includes('var(--kds-font-body)'), 'portal deve reutilizar a escala tipográfica oficial do KDS');
assert(modelCss.includes('grid-template-columns:minmax(0,1.5fr) minmax(330px,1fr)') && modelCss.includes('.ks-public-booking-panel{order:1') && modelCss.includes('.ks-public-profile-panel{order:2'),
  'modelo 2 deve manter calendário amplo à esquerda e resumo à direita');
assert(css.includes('@media (max-width:900px)') && css.includes('.ks-public-booking-panel{order:1') && css.includes('.ks-public-profile-panel{order:2'),
  'em tablet/celular inclusive paisagem a ação de agendar deve vir antes do perfil longo do profissional');
assert(css.includes('@media (max-width:620px)') && css.includes('.ks-public-form{grid-template-columns:1fr}'),
  'formulário público deve refluír para uma coluna no celular');
assert(css.includes('@media (max-width:430px)') && css.includes('flex-wrap:wrap') && css.includes('.ks-public-clinic{width:100%'),
  'cabeçalho deve refluír sem colisão em celulares estreitos');
assert(css.includes('html,body{max-width:100%;overflow-x:hidden}'),
  'portal não deve criar rolagem horizontal acidental');
assert(css.includes('.ks-public-selection strong,.ks-public-selection small{white-space:normal'),
  'resumo do horário não deve truncar informações essenciais no celular');
assert(!/#[0-9a-f]{3,8}\b/i.test(css), 'portal deve usar tokens do KDS, sem cores locais arbitrárias');

assert(js.includes("const ETAPAS=['profissional','procedimento','horario','dados']"),
  'fluxo público deve iniciar pela escolha do profissional');
assert(js.includes('/functions/v1/agendamento-publico'), 'portal deve consumir a fronteira pública dedicada');
assert(js.includes('/functions/v1/agendamento-publico-perfil'), 'portal deve consumir o perfil público complementar');
assert(js.includes('api_slug'), 'slug amigável deve ser resolvido para o slug interno somente no cliente público controlado');
assert(js.includes('Atendimento particular'), 'ausência de convênios deve ser comunicada como atendimento particular');
assert(js.includes('mensagem_confirmacao'), 'mensagem pós-agendamento deve vir da configuração editável');
assert(!js.includes('SUPABASE_SERVICE_ROLE_KEY'), 'browser nunca pode receber service role');
assert(!js.includes(".from('agendamentos')") && !js.includes('.from("agendamentos")'),
  'browser público não deve consultar a agenda diretamente');
assert(!js.includes(".from('pacientes')") && !js.includes('.from("pacientes")'),
  'browser público não deve consultar pacientes diretamente');

assert(edge.includes('SUPABASE_SERVICE_ROLE_KEY'), 'fronteira pública de reserva deve permanecer no servidor');
assert(edge.includes('config?.ativo') || edge.includes('config.ativo'), 'fronteira pública deve respeitar o liga/desliga administrativo');
assert(edge.includes('agendamento_online_ativo'), 'fronteira pública deve respeitar publicação explícita');
assert(edge.includes('disponibilidade_agendamento_online'), 'slots devem respeitar somente períodos publicados online');
assert(edge.includes('idsComDisponibilidade') && edge.includes('.filter((p) => idsComDisponibilidade.has(String(p.id)))'),
  'catálogo não deve exibir profissional sem nenhum período online publicado');
assert(edge.includes('vinculadosOriginais.length && !vinculadosPublicos.length'),
  'procedimento restrito não deve aparecer se nenhum profissional autorizado estiver publicado');
assert(edge.includes('bloqueios_agenda'), 'slots devem respeitar bloqueios da Agenda');
assert(edge.includes('.neq("status", "cancelado")') && !edge.includes('OCUPA_HORARIO'),
  'slots públicos devem tratar todo agendamento não cancelado como indisponível, igual à constraint final');
assert(edge.includes('feriadoAgenda'), 'slots devem respeitar feriados da Agenda consolidada');
assert(!edge.includes('.from("pacientes")') && !edge.includes(".from('pacientes')"),
  'Edge pública não deve ler cadastro de pacientes para o navegador');
assert(!edge.includes('.insert(') && !edge.includes('.update(') && !edge.includes('.delete(') && !edge.includes('.upsert('),
  'Edge pública não deve fazer DML direto; toda gravação deve passar pela RPC atômica');
assert(edge.includes('supabase.rpc("kinesys_criar_agendamento_online"'),
  'gravação pública deve ser delegada exclusivamente à RPC de reserva atômica');

assert(profileEdge.includes('slug_publico') && profileEdge.includes('api_slug'),
  'perfil público deve resolver link amigável sem renomear o slug interno da clínica');
assert(profileEdge.includes('nome_publico'), 'perfil público deve usar nome comercial configurável');
assert(profileEdge.includes('agendamento_online_profissionais_config'),
  'perfil público deve ler somente a camada específica de apresentação dos profissionais');
assert(profileEdge.includes('atende_convenios') && profileEdge.includes('convenios'),
  'perfil público deve expor convênios somente pela configuração dedicada');
assert(!profileEdge.includes('.from("pacientes")') && !profileEdge.includes('.from("agendamentos")'),
  'endpoint de perfil não deve tocar pacientes nem agendamentos');
assert(profileEdge.includes('req.method !== "GET"'), 'endpoint de perfil público deve ser somente leitura');

console.log('agendamento_online_public_portal.contract: OK');

// Run the real Edge slot calculator with a closed, synthetic transport.
(async()=>{
 const vm=require('node:vm'),{stripTypeScriptTypes}=require('node:module');
 const cid='clinic-synthetic',pid='prof-synthetic',proc='11111111-1111-4111-8111-111111111111';
 const tables={clinicas:[{id:cid,slug:'clinica-sintetica',nome:'Clínica sintética',ativa:true}],configuracoes_agendamento_online:[{clinica_id:cid,ativo:true,horizonte_dias:14,antecedencia_minima_minutos:0,seguir_agenda_interna:false}],equipe:[{id:pid,clinica_id:cid,nome:'Profissional sintético',ativo:true,aparece_na_agenda:true,agendamento_online_ativo:true}],procedimentos:[{id:proc,clinica_id:cid,nome:'Avaliação',ativo:true,agendamento_online_ativo:true,duracao_minutos:60,profissionais_ids:[]}],horarios_atendimento:[],disponibilidade_agendamento_online:[],agendamentos:[],bloqueios_agenda:[]};
 for(let dia=1;dia<=5;dia++){for(const [inicio,fim]of[['08:00','12:00'],['14:00','19:00']])tables.horarios_atendimento.push({clinica_id:cid,profissional_id:null,dia_semana:dia,hora_inicio:inicio,hora_fim:fim});tables.disponibilidade_agendamento_online.push({clinica_id:cid,profissional_id:pid,dia_semana:dia,hora_inicio:'08:00',hora_fim:'12:00',ativo:true});}
 tables.agendamentos=[['09:00','10:00','agendado',pid,cid],['15:00','16:00','agendado',pid,cid],['16:00','17:00','cancelado',pid,cid],['10:00','11:00','agendado','outro-prof',cid],['11:00','12:00','agendado',pid,'outra-clinica']].map(([hora_inicio,hora_fim,status,profissional_id,clinica_id])=>({data:'2030-03-05',hora_inicio,hora_fim,status,profissional_id,clinica_id}));
 tables.bloqueios_agenda=[{clinica_id:cid,profissional_id:null,data:'2030-03-06',hora_inicio:null,hora_fim:null},{clinica_id:cid,profissional_id:pid,data:'2030-03-07',hora_inicio:'14:00',hora_fim:'15:00'}];
 let queryError='';
 const db={from(table){let rows=[...(tables[table]||[])],single=false;const q={select(){return q;},eq(k,v){rows=rows.filter(x=>x[k]===v);return q;},neq(k,v){rows=rows.filter(x=>x[k]!==v);return q;},gte(k,v){rows=rows.filter(x=>x[k]>=v);return q;},lte(k,v){rows=rows.filter(x=>x[k]<=v);return q;},order(){return q;},maybeSingle(){single=true;return q;},then(resolve,reject){return Promise.resolve({data:single?rows[0]||null:rows,error:queryError===table?{message:'Falha sintética de consulta'}:null}).then(resolve,reject);}};return q;}};
 let fixed=Date.parse('2030-03-04T13:00:00Z');class Clock extends Date{constructor(...args){super(...(args.length?args:[fixed]));}static now(){return fixed;}}
 const ctx={Date:Clock,Intl,Map,Set,console,createClient:()=>db,Deno:{env:{get:()=> 'synthetic'},serve(){}},Response,Request,URL,TextEncoder,crypto};
 const js=stripTypeScriptTypes(edge.replace(/^import[^\n]+\n/gm,''),{mode:'strip'});vm.runInNewContext(js+';this.slotsTest=slotsPublicos;this.catalogTest=catalogoPublico;this.payloadTest=payloadReservaValido;',ctx);
 const input={request_id:'c3333333-3333-4333-8333-111111111111',profissional_id:pid,procedimento_id:'c2222222-2222-4222-8222-222222222222',data:'2030-03-05',hora_inicio:'14:00',paciente:{nome:'Paciente sintético',telefone:'11999990000'}};
 assert.equal(ctx.payloadTest(input).nascimento,null,'Nascimento é opcional também no servidor');assert.equal(ctx.payloadTest({...input,paciente:{...input.paciente,nome:''}}),null);assert.equal(ctx.payloadTest({...input,paciente:{...input.paciente,telefone:''}}),null);assert.equal(ctx.payloadTest({...input,paciente:{...input.paciente,nascimento:'data inválida'}}),null);
 const get=()=>ctx.slotsTest('clinica-sintetica',pid,proc),times=(r,d)=>r.dias.find(x=>x.data===d)?.horarios.map(x=>x.inicio)||[];
 const manual=await get();assert(!times(manual,'2030-03-05').includes('14:00'));assert(!times(manual,'2030-03-05').includes('09:00'));
 tables.configuracoes_agendamento_online[0].seguir_agenda_interna=true;let mirror=await get();
 for(const hour of ['08:00','10:00','11:00','14:00','16:00','17:00','18:00'])assert(times(mirror,'2030-03-05').includes(hour),hour+' deve acompanhar a Agenda');
 for(const hour of ['09:00','12:00','13:00','15:00','19:00'])assert(!times(mirror,'2030-03-05').includes(hour),hour+' não deve ser oferecido');
 assert.equal(times(mirror,'2030-03-06').length,0);assert(!times(mirror,'2030-03-07').includes('14:00'));
 tables.disponibilidade_agendamento_online=[];assert((await ctx.catalogTest('clinica-sintetica')).profissionais.some(x=>x.id===pid),'espelhamento não depende de períodos manuais antigos');
 const profileCtx={...ctx};vm.runInNewContext(stripTypeScriptTypes(profileEdge.replace(/^import[^\n]+\n/gm,''),{mode:'strip'})+';this.profileTest=carregarPerfilPublico;',profileCtx);assert((await profileCtx.profileTest('clinica-sintetica')).profissionais.some(x=>x.id===pid),'perfil publicado também independe da grade manual no modo vinculado');
 tables.horarios_atendimento.push({clinica_id:cid,profissional_id:pid,dia_semana:2,hora_inicio:'14:00',hora_fim:'17:00'});mirror=await get();assert.deepEqual([...times(mirror,'2030-03-05')],['14:00','16:00']);assert.equal(times(mirror,'2030-03-07').length,0,'jornada própria não herda dias ausentes');
 tables.horarios_atendimento=tables.horarios_atendimento.filter(h=>!h.profissional_id);tables.horarios_atendimento.find(h=>h.dia_semana===2&&h.hora_inicio==='14:00').hora_fim='20:00';assert(times(await get(),'2030-03-05').includes('19:00'),'alteração da jornada interna reflete sem editar segunda grade');
 tables.configuracoes_agendamento_online[0].antecedencia_minima_minutos=2880;assert.equal(times(await get(),'2030-03-05').length,0,'antecedência continua sendo respeitada');
 fixed=Date.parse('2030-11-01T13:00:00Z');tables.configuracoes_agendamento_online[0].antecedencia_minima_minutos=0;tables.horarios_atendimento.push({clinica_id:cid,profissional_id:null,dia_semana:6,hora_inicio:'08:00',hora_fim:'12:00'});assert.equal(times(await get(),'2030-11-02').length,0,'feriado bloqueia mesmo quando a clínica cadastrou jornada no sábado');
 queryError='agendamentos';await assert.rejects(get(),e=>e.message==='Falha sintética de consulta');
 queryError='';fixed=Date.parse('2030-03-04T13:00:00Z');
 const nurse='prof-enfermagem-sintetica';
 tables.equipe.push({id:nurse,clinica_id:cid,nome:'Lúcia (enfermagem, sintética)',tipo:'PROFISSIONAL',ativo:true,aparece_na_agenda:true,agendamento_online_ativo:true});
 tables.horarios_atendimento=tables.horarios_atendimento.filter(h=>h.profissional_id==null);
 for(const [professional,day,start,end] of [[pid,2,'08:00','12:00'],[pid,5,'08:00','12:00'],[nurse,2,'14:00','19:00'],[nurse,5,'08:00','12:00']])tables.horarios_atendimento.push({clinica_id:cid,profissional_id:professional,dia_semana:day,hora_inicio:start,hora_fim:end});
 tables.bloqueios_agenda=[{clinica_id:cid,profissional_id:null,data:'2030-03-08',hora_inicio:'10:00',hora_fim:'11:00'},{clinica_id:cid,profissional_id:nurse,data:'2030-03-08',hora_inicio:'08:00',hora_fim:'09:00'}];
 tables.agendamentos.push({clinica_id:cid,profissional_id:nurse,data:'2030-03-05',hora_inicio:'15:00',hora_fim:'16:00',status:'agendado'},{clinica_id:cid,profissional_id:pid,data:'2030-03-08',hora_inicio:'09:00',hora_fim:'10:00',status:'agendado'});
 const theirs=()=>ctx.slotsTest('clinica-sintetica',nurse,proc);
 assert.deepEqual([...times(await get(),'2030-03-05')],['08:00','10:00','11:00']);assert.deepEqual([...times(await theirs(),'2030-03-05')],['14:00','16:00','17:00','18:00'],'Outro profissional tem sua própria jornada/ocupações');
 assert.deepEqual([...times(await get(),'2030-03-08')],['08:00','11:00']);assert.deepEqual([...times(await theirs(),'2030-03-08')],['09:00','11:00'],'Ausência individual não bloqueia o colega; bloqueio da clínica afeta os dois');
 const restricted='22222222-2222-4222-8222-222222222222';tables.procedimentos.push({id:restricted,clinica_id:cid,nome:'Atendimento de enfermagem sintético',duracao_minutos:60,valor:80,ativo:true,agendamento_online_ativo:true,profissionais_ids:[nurse]});
 assert.equal((await ctx.slotsTest('clinica-sintetica',pid,restricted)).dias.length,0,'Serviço restrito não é oferecido para outro profissional');
 const published=await ctx.catalogTest('clinica-sintetica');assert.equal(published.profissionais.length,2);assert.deepEqual([...published.procedimentos.find(p=>p.id===restricted).profissionais_ids],[nurse]);
 // O editor real altera o mesmo registro lido pelo catálogo, sem atualizar pacientes/financeiro.
 const agendaSource=fs.readFileSync('src/agenda/agenda-1.20.0.js','utf8');
 const fields={proc_id:{value:proc},proc_nome:{value:'Avaliação'},proc_duracao:{value:'60'},proc_valor:{value:'135.50'},proc_sessoes_pacote:{value:'1'}};let writes=0;
 const editor={usuarioLogado:{clinica_id:cid},usuarioEhAdministradorAgenda:()=>true,document:{getElementById:id=>fields[id],querySelectorAll:()=>[],querySelector:()=>null},alert:message=>{throw Error(message);},invalidarCacheProcedimentosAgenda(){},fecharModal(){},carregarProcedimentos:async()=>{},window:{},
  _supabase:{from:table=>{assert.equal(table,'procedimentos');return {update:record=>{const filters=[];const q={eq:(k,v)=>{filters.push([k,v]);return q;},then:resolve=>{assert.deepEqual(filters,[['id',proc],['clinica_id',cid]]);writes++;Object.assign(tables.procedimentos.find(p=>p.id===proc),record);return Promise.resolve({error:null}).then(resolve);}};return q;}};}}};
 tables.configuracoes_agendamento_online[0].mostrar_valores=true;tables.procedimentos[0].valor=120;
 assert.equal((await ctx.catalogTest('clinica-sintetica')).procedimentos.find(p=>p.id===proc).valor,120);
 vm.runInNewContext(agendaSource.slice(agendaSource.indexOf('let agendaSalvandoProcedimento = false;'),agendaSource.indexOf('async function alternarAtivoProcedimento(')),editor);await editor.salvarProcedimento();
 assert.equal(writes,1);assert.equal((await ctx.catalogTest('clinica-sintetica')).procedimentos.find(p=>p.id===proc).valor,135.50,'Preço salvo no editor aparece na consulta pública seguinte, sem valor fixo');
 tables.equipe.find(p=>p.id===nurse).agendamento_online_ativo=false;const hidden=await ctx.catalogTest('clinica-sintetica');assert(!hidden.profissionais.some(p=>p.id===nurse));assert(!hidden.procedimentos.some(p=>p.id===restricted));assert.equal((await theirs()).dias.length,0,'Despublicar não expõe horários privados');
 assert.deepEqual([...times(await get(),'2030-03-05')],['08:00','10:00','11:00'],'Despublicar colega não muda a agenda do profissional restante');
 console.log('PASS múltiplos profissionais e preços: jornadas/ocupações/ausências independentes, bloqueio geral, serviços vinculados, publicação por pessoa e editor real → catálogo.');
 console.log('PASS Edge real: Agenda manhã/tarde, ocupação normal/extraordinária, cancelamento, almoço, ausência, profissional/clínica, jornada própria, alteração futura, modo manual e antecedência.');
})().catch(e=>{console.error(e);process.exitCode=1;});
