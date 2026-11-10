// Atualização automática da Agenda/Meu dia: leve, só com tela visível e ociosa,
// redesenha apenas quando algo mudou e recua quando o servidor falha.
const assert=require('assert');
const fs=require('fs');
const {JSDOM}=require(process.env.JSDOM_MODULE||'jsdom');

const codigo=fs.readFileSync('src/agenda/agenda_atualizacao_automatica-1.0.0.js','utf8');
const home=fs.readFileSync('src/home/home_fisioterapeuta_util-1.24.0.js','utf8');
const html=fs.readFileSync('index.html','utf8');

const flush=()=>new Promise(r=>setImmediate(r));

function ambiente({tela='tela_agenda',dados,cache}={}){
  const dom=new JSDOM(`<!doctype html><body>
    <section id="tela_agenda" class="tela ${tela==='tela_agenda'?'ativa':''}"><select id="agenda_filtro_profissional"><option value="" selected>Toda a clínica</option></select><div id="agenda_semana_grade"></div><input id="campo"></section>
    <section id="tela_home" class="tela ${tela==='tela_home'?'ativa':''}"><div id="card_painel_fisioterapeuta"></div></section>
    <div class="modal-overlay" id="modal_agendamento" style="display:none"></div></body>`,{url:'https://kinesys.test/',runScripts:'outside-only',pretendToBeVisual:true});
  const w=dom.window;
  let agora=1_000_000;
  w.Date.now=()=>agora;
  let intervalo=null;
  w.setInterval=(fn)=>{intervalo=fn;return 1;};
  const reg={consultas:0,redesenhos:0,feedback:[],dados:dados||[{id:'a1',status:'agendado',data:'2026-11-10',hora_inicio:'08:00',hora_fim:'09:00',pacientes:{nome:'Paciente A'}}],falhar:false,meuDia:0,meuDiaMudou:false};
  w.eval(`var usuarioLogado={id:'u1',clinica_id:'c1'};var agendaDataSelecionada=new Date('2026-11-10T12:00:00');var agendaRevisaoVisual=1;var agendaAgendamentosSemanaCache=${JSON.stringify(cache||reg.dados)};var KINESYS_OPERACOES_EM_CURSO=new Set();`);
  w.scrollTo=()=>{};
  w.inicioSemanaAgenda=d=>d;w.somarDiasAgenda=(d)=>d;
  w.usuarioPodeVerAgendaClinicaToda=()=>true;w.profissionalAgendaRestritoAtualId=()=> '';
  w.lerAgendamentosPendentesSync=()=>[];
  w.mostrarFeedbackAgenda=(t,tipo)=>reg.feedback.push([t,tipo]);
  w.carregarAgendamentosSemana=async()=>{reg.consultas++;if(reg.falhar)return {data:null,error:new Error('rede')};return {data:JSON.parse(JSON.stringify(reg.dados)),error:null};};
  w.renderizarPainelAgenda=async()=>{reg.redesenhos++;w.eval('agendaRevisaoVisual++');w.eval(`agendaAgendamentosSemanaCache=${JSON.stringify(reg.dados)}`);};
  w.KineSysMeuDiaClinico={verificarMudanca:async()=>{reg.meuDia++;return {verificado:true,mudou:reg.meuDiaMudou};}};
  w.eval(codigo);
  w.document.dispatchEvent(new w.Event('DOMContentLoaded'));
  const avancar=async(ms)=>{const fim=agora+ms;while(agora<fim){agora+=15000;if(intervalo)intervalo();await flush();await flush();}};
  return {w,reg,avancar,setAgora:v=>{agora=v;}};
}

(async()=>{
  // 1. 10 minutos com a Agenda aberta e nada mudando: poucas consultas e ZERO redesenhos.
  {
    const {reg,avancar}=ambiente();
    await avancar(10*60*1000);
    assert.ok(reg.consultas>=10&&reg.consultas<=14,`consultas em 10 min: ${reg.consultas} (esperado 10–14, uma a cada 45 s)`);
    assert.strictEqual(reg.redesenhos,0,'sem mudança, a tela não é redesenhada');
    console.log(`  10 min sem mudanças: ${reg.consultas} consultas leves, ${reg.redesenhos} redesenhos`);
  }
  // 2. Aba do navegador oculta: nenhuma consulta.
  {
    const {w,reg,avancar}=ambiente();
    Object.defineProperty(w.document,'visibilityState',{value:'hidden',configurable:true});
    await avancar(10*60*1000);
    assert.strictEqual(reg.consultas,0,'aba oculta não consulta o servidor');
  }
  // 3. Uma mudança feita pela recepção: exatamente um redesenho.
  {
    const {reg,avancar}=ambiente();
    await avancar(60*1000);
    reg.dados=[{...reg.dados[0],status:'em_recepcao'}];
    await avancar(5*60*1000);
    assert.strictEqual(reg.redesenhos,1,'uma mudança = um redesenho');
  }
  // 4. Janela aberta (ex.: novo agendamento) ou campo em edição: não atualiza.
  {
    const {w,reg,avancar}=ambiente();
    reg.dados=[{...reg.dados[0],status:'confirmado'}];
    w.document.getElementById('modal_agendamento').style.display='flex';
    await avancar(3*60*1000);
    assert.strictEqual(reg.consultas,0,'com janela aberta nem consulta');
    w.document.getElementById('modal_agendamento').style.display='none';
    w.document.getElementById('campo').focus();
    await avancar(3*60*1000);
    assert.strictEqual(reg.redesenhos,0,'campo em edição não é interrompido');
  }
  // 5. Consulta da própria Agenda em andamento / gravação em curso / pendentes locais: não atualiza.
  {
    const {w,reg,avancar}=ambiente();
    w.document.getElementById('agenda_semana_grade').dataset.mobileConsulta='pendente';
    await avancar(2*60*1000);
    delete w.document.getElementById('agenda_semana_grade').dataset.mobileConsulta;
    w.eval("KINESYS_OPERACOES_EM_CURSO.add('agenda-agendamento')");
    await avancar(2*60*1000);
    w.eval("KINESYS_OPERACOES_EM_CURSO.clear()");
    w.lerAgendamentosPendentesSync=()=>[{id:'local'}];
    await avancar(2*60*1000);
    assert.strictEqual(reg.consultas,0,'nenhuma consulta durante carga, gravação ou pendências locais');
  }
  // 6. Servidor falhando: espera crescente e aviso com a hora da última atualização.
  {
    const {reg,avancar}=ambiente();
    await avancar(60*1000); // 1 sucesso
    const antes=reg.consultas;
    reg.falhar=true;
    await avancar(10*60*1000);
    const tentativas=reg.consultas-antes;
    assert.ok(tentativas>=3&&tentativas<=5,`com falhas, tentativas em 10 min: ${tentativas} (recuo 60s→120s→300s)`);
    assert.ok(reg.feedback.some(([t,tipo])=>tipo==='aviso'&&/sem atualização automática desde/.test(t)),'avisa que a agenda está desatualizada');
    assert.strictEqual(reg.redesenhos,0,'falha nunca troca a grade');
    reg.falhar=false;
    await avancar(6*60*1000);
    assert.strictEqual(reg.redesenhos,1,'ao voltar a conexão, redesenha uma vez para limpar o aviso');
  }
  // 7. Troca de perfil/clínica durante a consulta: descarta a resposta.
  {
    const {w,reg,avancar}=ambiente();
    reg.dados=[{...reg.dados[0],status:'confirmado'}];
    w.carregarAgendamentosSemana=async()=>{reg.consultas++;w.eval("usuarioLogado={id:'u2',clinica_id:'c2'}");return {data:reg.dados,error:null};};
    await avancar(60*1000); // exatamente a 1ª verificação
    assert.strictEqual(reg.consultas,1);
    assert.strictEqual(reg.redesenhos,0,'resposta obtida durante a troca de perfil/clínica não é desenhada');
  }
  // 8. Usuário navegou (nova carga da Agenda) durante a consulta: descarta.
  {
    const {w,reg,avancar}=ambiente();
    reg.dados=[{...reg.dados[0],status:'confirmado'}];
    w.carregarAgendamentosSemana=async()=>{reg.consultas++;w.eval('agendaRevisaoVisual++');return {data:reg.dados,error:null};};
    await avancar(60*1000);
    assert.strictEqual(reg.consultas,1);
    assert.strictEqual(reg.redesenhos,0,'navegação durante a consulta vence');
  }
  // 9. Outra tela aberta: Agenda não consulta. Meu dia: verificação leve a cada 60 s.
  {
    const {reg,avancar}=ambiente({tela:'tela_home'});
    await avancar(10*60*1000);
    assert.strictEqual(reg.consultas,0,'fora da Agenda não consulta a semana');
    assert.ok(reg.meuDia>=8&&reg.meuDia<=11,`Meu dia em 10 min: ${reg.meuDia} verificações leves`);
  }
  // 10. Meu dia oculto (perfil sem painel do profissional): não verifica.
  {
    const {w,reg,avancar}=ambiente({tela:'tela_home'});
    w.document.getElementById('card_painel_fisioterapeuta').hidden=true;
    await avancar(5*60*1000);
    assert.strictEqual(reg.meuDia,0);
  }
  // 11. Contratos: consulta mínima do Meu dia, sem RPC; módulo carregado no index.
  {
    const ini=home.indexOf('async function verificarMudancaMeuDia(');
    const bloco=home.slice(ini,home.indexOf('function atualizarPainelFisioterapeuta(',ini));
    assert.ok(ini>0,'Meu dia expõe verificação leve');
    assert.match(bloco,/select\('id,status,hora_inicio,hora_fim'\)/,'Meu dia lê só id, status e horários');
    assert.doesNotMatch(bloco,/\.rpc\(/,'verificação leve não chama RPC');
    assert.match(home,/verificarMudanca:verificarMudancaMeuDia/);
    assert.match(html,/src\/agenda\/agenda_atualizacao_automatica-1\.0\.0\.js\?v=/,'módulo publicado no index');
    assert.doesNotMatch(codigo,/\beval\(/,'sem eval');
    assert.doesNotMatch(codigo,/\.channel\(|postgres_changes/,'sem Realtime (nenhuma mudança no Supabase)');
  }
  console.log('PASS: atualização automática da Agenda/Meu dia é leve e segura (11 cenários).');
})().catch(e=>{console.error(e);process.exit(1);});
