'use strict';

const fs=require('fs');
const assert=require('assert');
const vm=require('vm');

const messages=fs.readFileSync('src/core/mensagens_config.js','utf8');
const html=fs.readFileSync('index.html','utf8');
const crm=fs.readFileSync('src/core/crm_relationship_core-1.0.0.js','utf8');
const agenda=fs.readFileSync('src/agenda/agenda-1.20.0.js','utf8');

assert.match(html,/src\/core\/mensagens_config\.js\?v=20260910-phase4f-r1/,'index deve invalidar o cache da Phase 4F');
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
  console.log('Messages bootstrap contract Phase 4F: 0 RPC no DOMContentLoaded; 1 RPC no primeiro uso real; 5/5 chamadores runtime preservam atualizar=true.');
})().catch(error=>{console.error(error);process.exitCode=1;});
