'use strict';
// Validade do rascunho local da Avaliação (06/11/2026, dados sintéticos).
// O rascunho contém dados de saúde em localStorage. Ele continua recuperável
// por 48h (inclusive após logout), mas não permanece indefinidamente no navegador.
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');

const core=fs.readFileSync('src/core/script-1.18.0.js','utf8');
const inicio=core.indexOf('const KINESYS_RASCUNHO_VALIDADE_MS');
const fim=core.indexOf('\nfunction coletarRascunhoKineSys(');
assert(inicio>=0&&fim>inicio,'bloco de validade do rascunho deve existir antes da coleta');
const CHAVE='kinesys_rascunho_avaliacao_v11',HORA=60*60*1000;

function ambiente(rascunho,usuario={id:'prof-1'}){
  const store=new Map();if(rascunho!==undefined)store.set(CHAVE,typeof rascunho==='string'?rascunho:JSON.stringify(rascunho));
  const ctx={usuarioLogado:usuario,Date,JSON,Number,String,
    localStorage:{getItem:k=>store.has(k)?store.get(k):null,setItem:(k,v)=>store.set(k,String(v)),removeItem:k=>store.delete(k)}};
  vm.createContext(ctx);
  vm.runInContext(`function chaveUsuarioRascunhoKineSys(){if(!usuarioLogado)return'';return String(usuarioLogado.id||'').trim().toLowerCase();}\n`+core.slice(inicio,fim)+';this.valido=rascunhoKineSysEhValido;this.expirado=rascunhoKineSysExpirado;this.descartar=descartarRascunhoExpiradoKineSys;',ctx);
  return {ctx,store};
}
const rascunho=(horas,extra={})=>({salvoEm:new Date(Date.now()-horas*HORA).toISOString(),pacienteAtualId:'pac-sintetico',usuarioChave:'prof-1',campos:{paciente_nome:'Paciente Sintético'},...extra});

{ // 1. Rascunho recente continua recuperável e não é apagado ao carregar.
  const {ctx,store}=ambiente(rascunho(1));
  assert.ok(store.has(CHAVE),'carga do script não apaga rascunho recente');
  assert.equal(ctx.valido(rascunho(1)),true);
  assert.equal(ctx.valido(rascunho(47)),true,'dentro de 48h permanece válido');
}
{ // 2. Rascunho com mais de 48h é descartado já na carga do script.
  const {ctx,store}=ambiente(rascunho(49));
  assert.ok(!store.has(CHAVE),'rascunho expirado sai do navegador');
  assert.equal(ctx.valido(rascunho(49)),false,'rascunho expirado não é oferecido');
}
{ // 3. Regras anteriores preservadas: dono diferente e rascunho sem paciente continuam inválidos.
  const {ctx}=ambiente();
  assert.equal(ctx.valido(rascunho(1,{usuarioChave:'outro-prof'})),false);
  assert.equal(ctx.valido({salvoEm:new Date().toISOString(),campos:{}}),false);
  assert.equal(ctx.valido(null),false);
}
{ // 4. Data ausente/inválida ou no futuro não descarta (sem perda por relógio/legado).
  const {ctx,store}=ambiente(rascunho(0,{salvoEm:undefined}));
  assert.ok(store.has(CHAVE));
  assert.equal(ctx.expirado({salvoEm:'data-invalida'}),false);
  assert.equal(ctx.expirado({salvoEm:new Date(Date.now()+5*HORA).toISOString()}),false);
}
{ // 5. Conteúdo corrompido não quebra a carga do sistema.
  const {store}=ambiente('{json quebrado');
  assert.ok(store.has(CHAVE),'falha de leitura não apaga nem lança erro');
}
{ // 6. Sem localStorage disponível (modo restrito), a carga não lança erro.
  const ctx={usuarioLogado:null,Date,JSON,Number,String};vm.createContext(ctx);
  assert.doesNotThrow(()=>vm.runInContext(`function chaveUsuarioRascunhoKineSys(){return'';}\n`+core.slice(inicio,fim),ctx));
}
// 7. Restauração continua passando pela mesma validação, que remove o inválido.
assert.match(core,/if \(!rascunhoKineSysEhValido\(r\)\) \{[\s\S]{0,300}localStorage\.removeItem\('kinesys_rascunho_avaliacao_v11'\)/);
console.log('Rascunho da Avaliação: válido por 48h, expirado descartado, dono/paciente preservados, data inválida, JSON corrompido e sem storage OK.');
