'use strict';
const fs=require('fs'),vm=require('vm'),assert=require('assert');
const source=fs.readFileSync('src/home/home_detalhes-1.18.5.js','utf8');
const handlers={};const context={console,document:{readyState:'loading',addEventListener:(n,f)=>(handlers[n]??=[]).push(f),getElementById:()=>null},usuarioLogado:{id:'a',tipo:'FISIOTERAPEUTA',clinica_id:'c'}};context.window=context;vm.createContext(context);vm.runInContext(source,context);
let calls=0;for(const name of ['prepararHomeCompacta','configurarCardsHomeDetalhes','renderizarPacientesRecentesHome','popularSelectCRM','renderizarPendenciasClinicas','carregarAtendimentosHojeDetalhes','carregarPacientesRecentesDetalhes','fecharAtendimentosHome','fecharPendenciasHome'])context[name]=()=>{calls++;return Promise.resolve();};
const activate=id=>(handlers['kinesys:tela-ativada']||[]).forEach(f=>f({detail:{id}}));
activate('tela_home');const initial=calls;assert(initial>0);
for(let i=0;i<20;i++){activate('tela_agenda');activate('tela_home');assert.equal(calls,initial,'return Home cannot refresh other Home cards');}
const core=fs.readFileSync('src/core/script-1.18.0.js','utf8');const nav=core.slice(core.indexOf('function navegarPara('),core.indexOf('function navegarPara(')+12000);assert.doesNotMatch(nav,/renderizarPacientesRecentesHome\(|carregarPainelFisioterapeuta\(/);
assert.doesNotMatch(source,/__homeDetalhesWrapped|setInterval/); assert.doesNotMatch(source.slice(source.indexOf('let homeDetalhesInicializada=')),/setTimeout/);
const design=fs.readFileSync('src/core/design_system-1.20.1.js','utf8');const visual=design.slice(design.indexOf('async function atualizarHomeOperacional'),design.indexOf('function prepararProntuarios'));assert.doesNotMatch(visual,/carregarAtendimentosHojeDetalhes/);
console.log('PASS: Home detail widgets initialize once and perform zero work on 20 Agenda → Home returns; no navigation wrapper/polling or design-triggered query.');
