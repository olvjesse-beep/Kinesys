'use strict';

const fs=require('fs');
const assert=require('assert');
const vm=require('vm');

const messages=fs.readFileSync('src/core/mensagens_config.js','utf8');
const html=fs.readFileSync('index.html','utf8');
const crm=fs.readFileSync('src/core/crm_relationship_core-1.0.0.js','utf8');
const agenda=fs.readFileSync('src/agenda/agenda-1.20.0.js','utf8');

assert.match(html,/src\/core\/mensagens_config\.js\?v=20261016-config-conectada-r1/,'index deve invalidar o cache da interface de mensagens');
assert.match(messages,/document\.addEventListener\('DOMContentLoaded', inicializarConfiguracaoMensagens\);/,'marcação administrativa da tela deve continuar inicializada no DOMContentLoaded');

const initMatch=messages.match(/function inicializarConfiguracaoMensagens\(\) \{([\s\S]*?)\n\}/);
assert.ok(initMatch,'inicializador de mensagens deve existir');
assert.doesNotMatch(initMatch[1],/carregarConfiguracoesMensagens\s*\(/,'DOMContentLoaded não pode voltar a disparar RPC/preload de mensagens');
assert.strictEqual((messages.match(/carregarConfiguracoesMensagens\(false\)/g)||[]).length,1,'carga sem força deve existir somente como fallback sob demanda dentro de obterMensagemPadraoConfigurada');
assert.match(messages,/async function obterMensagemPadraoConfigurada\(chave, contexto=\{\}, atualizar=true\)/,'API pública deve continuar atualizando por padrão');
assert.match(messages,/if \(atualizar\) await carregarConfiguracoesMensagens\(true\);/,'uso real deve continuar buscando configuração atual quando solicitado');

const crmCalls=crm.match(/obterMensagemPadraoConfigurada\([^\n]+,\s*contexto(?:Base)?,\s*true\)/g)||[];
assert.strictEqual(crmCalls.length,3,'os três envios CRM runtime devem continuar forçando atualização no uso');
const agendaCalls=agenda.match(/obterMensagemPadraoConfigurada\([^\n]+,\s*contexto(?:Mensagem|Oferta),\s*true\)/g)||[];
assert.strictEqual(agendaCalls.length,2,'os dois envios da Agenda runtime devem continuar forçando atualização no uso');

let domReady=null;
let rpcCalls=0;
const fakeSupabase={
  async rpc(name){
    rpcCalls++;
    assert.strictEqual(name,'kinesys_listar_mensagens_padrao');
    return {data:[{chave:'crm_checkin_24h',mensagem:'Mensagem configurada para {paciente}',titulo:'Check-in'}],error:null};
  }
};
const fakeDocument={
  addEventListener(type,fn){if(type==='DOMContentLoaded')domReady=fn;},
  getElementById(){return null;}
};
const context={
  console,
  document:fakeDocument,
  window:{_supabase:fakeSupabase,usuarioLogado:{tipo:'FISIOTERAPEUTA'}},
  _supabase:fakeSupabase,
  Map,Set,Object,String,Date,Number,Array,Promise,RegExp,Error,
  alert(){},confirm(){return true;}
};
context.window.window=context.window;
vm.runInNewContext(messages,context,{filename:'src/core/mensagens_config.js',timeout:1000});
assert.strictEqual(typeof domReady,'function','script deve registrar inicialização DOM');
domReady();
assert.strictEqual(rpcCalls,0,'DOMContentLoaded não deve consumir RPC de mensagens na Phase 4F');

(async()=>{
  const texto=await context.window.obterMensagemPadraoConfigurada('crm_checkin_24h',{paciente:'Ana'},true);
  assert.strictEqual(rpcCalls,1,'primeiro uso real deve consultar o Supabase normalmente');
  assert.strictEqual(texto,'Mensagem configurada para Ana','mensagem configurada deve continuar aplicada após carga sob demanda');
  // A interface nova usa os mesmos cinco modelos e não inventa uma integração ativa.
  const config=fs.readFileSync('src/admin/configuracoes_agendamento_online-1.0.0.js','utf8');
  assert.match(config,/\['dados', 'Dados e segurança'\]/);
  assert.match(config,/panel\.hidden = id !== aba/,'todas as áreas devem ter visibilidade controlada');
  assert.match(config,/Planejada ·/,'integrações não implantadas precisam ser identificadas');
  assert.match(html,/ks-config-message-aside/,'prévia e integrações devem ficar à direita');
  assert.match(html,/data-config|ks_config_integracoes_resumo/);
  const ids=['cfg_msg_texto','cfg_msg_titulo','cfg_msg_lista','cfg_msg_variaveis','cfg_msg_preview','cfg_msg_salvar','ks_dados_backup_btn','ks_dados_importar_input'];
  for(const id of ids) assert.strictEqual((html.match(new RegExp(`id="${id}"`,'g'))||[]).length,1,`${id} deve continuar único`);

  const elements=new Map();
  const el=(id,value='')=>{const item={value,textContent:'',innerHTML:'',dataset:{},focus(){},selectionStart:0,selectionEnd:0};elements.set(id,item);return item;};
  const editor=el('cfg_msg_texto');
  el('cfg_msg_titulo');el('cfg_msg_lista');el('cfg_msg_variaveis');el('cfg_msg_meta');el('cfg_msg_descricao');el('cfg_msg_preview');el('cfg_msg_contador');el('cfg_msg_status');el('cfg_msg_salvar');
  fakeDocument.getElementById=id=>elements.get(id)||null;
  context.window.usuarioLogado={tipo:'MASTER',id:'admin',nome:'Administrador de teste'};
  context.window.selecionarMensagemConfiguracao('agenda_lembrete_sessao');
  editor.value='Olá, {paciente}. Rascunho da agenda.';
  context.window.atualizarPreviewMensagemConfiguracao();
  assert.match(elements.get('cfg_msg_preview').textContent,/Maria Silva/,'prévia deve aplicar variáveis');
  assert.strictEqual(elements.get('cfg_msg_contador').textContent,`${editor.value.length}/4000`);
  context.window.selecionarMensagemConfiguracao('crm_checkin_24h');
  editor.value='Outro rascunho independente.';
  context.window.atualizarPreviewMensagemConfiguracao();
  context.window.selecionarMensagemConfiguracao('agenda_lembrete_sessao');
  assert.strictEqual(editor.value,'Olá, {paciente}. Rascunho da agenda.','troca de modelo não pode perder edição');

  let writes=0,releaseSave;
  fakeSupabase.rpc=async(name,args)=>{
    if(name==='kinesys_salvar_mensagem_padrao'){
      writes++;assert.strictEqual(args.p_chave,'agenda_lembrete_sessao');
      await new Promise(resolve=>{releaseSave=resolve;});
      return {data:[],error:null};
    }
    return {data:[],error:null};
  };
  const saving=context.window.salvarMensagemConfiguracaoAtual();
  await context.window.salvarMensagemConfiguracaoAtual();
  assert.strictEqual(writes,1,'duplo clique não pode salvar duas vezes');
  context.window.selecionarMensagemConfiguracao('crm_checkin_24h');
  releaseSave();await saving;
  assert.strictEqual(editor.value,'Outro rascunho independente.','resposta tardia não pode trocar o modelo visível');
  assert.strictEqual(elements.get('cfg_msg_salvar').disabled,false,'botão deve liberar após conclusão');
  fakeSupabase.rpc=async()=>({data:null,error:{message:'Falha simulada de rede'}});
  const oldError=context.console.error;context.console.error=()=>{};
  await context.window.salvarMensagemConfiguracaoAtual();
  context.console.error=oldError;
  assert.match(elements.get('cfg_msg_status').textContent,/Não foi possível salvar/);
  assert.strictEqual(editor.value,'Outro rascunho independente.','falha não pode apagar texto');
  assert.strictEqual(elements.get('cfg_msg_salvar').disabled,false,'falha deve permitir nova tentativa');
  console.log('Messages bootstrap contract Phase 4F: 0 RPC no DOMContentLoaded; 1 RPC no primeiro uso real; 5/5 chamadores runtime preservam atualizar=true.');
  console.log('Configurações conectadas: IDs únicos, prévia, contador, rascunhos isolados, concorrência e erro/retry OK.');
})().catch(error=>{console.error(error);process.exitCode=1;});
