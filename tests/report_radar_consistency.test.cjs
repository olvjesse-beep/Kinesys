'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const {fixture}=require('./evaluation_report_integration.test.cjs');
const source=fs.readFileSync('src/clinical/clinical_engine-1.17.0.js','utf8');
let count=0;const test=(name,fn)=>{fn();count++;console.log('PASS report/radar: '+name);};
test('known note labels become audited structure, never extra narrative headings',()=>{
 const t=fixture(),hma='HMA:\nQueixa principal: Paciente apresenta dor no pescoço direito há 3 meses.\nSintomas associados: Dormência na mão direita.';
 t.fields[2].value=hma;const r=t.render();
 assert.equal(t.fields[2].value,hma);assert(!/HMA:|Queixa principal:|Sintomas associados:/.test(r.texto));
 assert(r.texto.includes('pescoço direito há 3 meses'));assert(r.texto.includes('mão direita'));
 assert.equal(r.semantica.marcadoresEstruturais.length,3);
 for(const m of r.semantica.marcadoresEstruturais)assert.equal(hma.slice(m.inicio,m.fim),m.trecho);
 assert.equal(r.validacao.relatoAusente.length,0);assert.equal(r.semantica.analiseDocumental.fatosSemRoteiro.length,0);
 assert.equal(r.semantica.validacao.significado.ausentes.length,0);
 const saved=JSON.parse(JSON.stringify(r));assert.equal(saved.semantica.analiseDocumental.marcadoresEstruturais.length,3);
});
test('unknown headings, family labels, medicine labels and numbers are not stripped',()=>{
 const t=fixture();t.fields[2].value='Antecedentes familiares: mãe com hipertensão. Medicamentos em uso: produto sintético 25 mg. Achado desconhecido: sensação alfa.';
 const r=t.render();for(const term of ['mãe','hipertensão','25 mg','sensação alfa'])assert(r.texto.includes(term),term);
 assert(r.semantica.analiseDocumental.perguntas.some(q=>q.tipo==='interpretacao_pendente'));
 assert(r.semantica.proposicoes.filter(p=>/hipertens/.test(p.rotuloDiagnostico||'')).every(p=>p.sujeito!=='paciente'));
});
test('circumstance and local descriptor are realized with a meaning check',()=>{
 const t=fixture(),api=t.c.window.KineSysDocumentAnalyzer;
 for(const [raw,expected] of [['Ao caminhar, sente dor no joelho esquerdo.','Relata dor no joelho esquerdo, ao caminhar.'],['O ombro direito está dolorido há 2 dias.','Relata ombro direito dolorido há 2 dias.']]){
  const r=api.analisarFrase(raw);assert.equal(r.texto,expected,JSON.stringify(r));assert.equal(r.estado,'realizado');assert(r.validacao.ok);
 }
 const negative='Ao caminhar, não sente dor no joelho esquerdo.';assert.equal(api.analisarFrase(negative).texto,negative);
});
// Exercise the actual stage-two selection function, not an imitation of its ranking.
const helper=source.slice(source.indexOf('    function hipotesesDoRadarParaExame232'),source.indexOf('    function construirHipotesesSugeridas232'));
const radic={id:'radiculopatia_cervical',nome:'Radiculopatia cervical',testes:['Spurling','ULTT1']};
const shoulder={id:'ombro_local',nome:'Condição local do ombro',testes:['Teste local']};
let plan,active='',autosaves=0;
const controls=[{dataset:{regiao:'ombro',sugeridaPelaHMA:'true'},checked:true},{dataset:{regiao:'cervical'},checked:false}];
const e={window:{},document:{querySelectorAll:()=>controls,getElementById:id=>controls.find(c=>'chk_regiao_'+c.dataset.regiao===id)},agendarAutosaveKineSys(){autosaves++;},Set,
 catalogoRegiao232:id=>id==='cervical'?[{grupo:'cluster',item:radic}]:[{grupo:'cluster',item:shoulder}],
 chaveHipoteseKineSys:c=>c.grupo+'::'+c.item.id,ordenarHipotesesRegiaoKineSys:()=>[{grupo:'cluster',item:shoulder}]};
e.window.KineSysMotorClinico3={};e.window.definirRegiaoAtivaAvaliacaoKineSys=id=>{active=id;};vm.createContext(e);vm.runInContext(helper,e);
vm.runInContext(source.slice(source.indexOf('    window.aplicarRegioesDoRadarKineSys ='),source.indexOf('    window.avancarParaMapa =')),e);
test('canonical cervical hypothesis cannot be replaced by a separate shoulder ranking',()=>{
 plan={regioes:[{id:'cervical'}],hipoteses:[{id:radic.id,regiaoId:'cervical',grupo:'cluster'}]};e.window.KineSysMotorClinico3.ultimoPlano=plan;
 const selected=e.hipotesesDoRadarParaExame232('cervical',{},{});assert.equal(selected.length,1);assert.equal(selected[0].item,radic);assert.deepEqual(selected[0].item.testes,['Spurling','ULTT1']);
 assert.equal(e.hipotesesDoRadarParaExame232('ombro',{},{}).length,0);
 e.window.aplicarRegioesDoRadarKineSys(plan);assert.equal(controls[0].checked,false);assert.equal(controls[1].checked,true);assert.equal(active,'cervical');
});
test('hypothesis group and region both must match, even when IDs overlap',()=>{
 e.window.KineSysMotorClinico3.ultimoPlano={regioes:[{id:'cervical'}],hipoteses:[{id:radic.id,regiaoId:'ombro',grupo:'cluster'},{id:radic.id,regiaoId:'cervical',grupo:'diferencial'}]};
 assert.equal(e.hipotesesDoRadarParaExame232('cervical',{},{}).length,0);
});
test('explicit manual choice and discarded hypothesis remain sovereign',()=>{
 e.window.KineSysMotorClinico3.ultimoPlano=plan;controls[0].checked=true;controls[0].dataset.tocadoManualmente='true';controls[1].checked=false;
 e.window.aplicarRegioesDoRadarKineSys(plan);assert(controls[0].checked);assert(!controls[1].checked);
 assert.equal(e.hipotesesDoRadarParaExame232('cervical',{}, {hipotesesDescartadas:['cluster::'+radic.id]}).length,0);
});
test('main hypothesis determines initial region, not DOM ordering',()=>{
 delete controls[0].dataset.tocadoManualmente;e.window.aplicarRegioesDoRadarKineSys({regioes:[{id:'ombro'},{id:'cervical'}],hipoteses:plan.hipoteses});assert.equal(active,'cervical');
 assert(controls.every(c=>c.checked));
});
test('lazy catalog load refreshes plan and is guarded against another evaluation',()=>{
 const flow=source.slice(source.indexOf('    window.avancarParaMapa ='),source.indexOf('    window.navegarAvaliacaoEtapaKineSys'));
 assert(flow.indexOf('await window.KineSysClinicalRegionLoader.ensure')<flow.indexOf('const planoCarregado='));
 assert(flow.indexOf('if(contextoOrigem!==')<flow.indexOf('const planoCarregado='));
 assert(flow.indexOf('window.aplicarRegioesDoRadarKineSys(planoCarregado)')<flow.indexOf('window.renderizarMapeamentoRegioes()'));
});
(async()=>{
 const flow=source.slice(source.indexOf('    window.avancarParaMapa ='),source.indexOf('    window.navegarAvaliacaoEtapaKineSys'));
 for(const change of [false,true]){
  let revision=1,release,updates=0,renders=0,navigations=0;const applied=[];
  const early={regioes:[{id:'cervical'}],hipoteses:[]},loaded={regioes:[{id:'cervical'}],hipoteses:[{id:radic.id,regiaoId:'cervical',grupo:'cluster'}]};
  const ctx={document:{getElementById:id=>id==='paciente_nome'?{value:'Paciente sintético'}:id==='paciente_hma'?{value:'Dor cervical irradiada.'}:id==='grupo_regioes_mapeamento'?{children:[{}]}:null},
   processarRadarEmTempoReal(){},renderizarSeletorRegioes(){},irParaSubtela(){navigations++;}};
  ctx.window={obterContextoAvaliacaoKineSys:()=>({pacienteId:'sintetico',revisao:revision}),KineSysMotorClinico3:{atualizar(){return ++updates===1?early:loaded;}},
   aplicarRegioesDoRadarKineSys:p=>{applied.push(p);return ['cervical'];},sugerirRegioesPorHMA(){},KineSysClinicalRegionLoader:{ensure:()=>new Promise(resolve=>{release=resolve;})},renderizarMapeamentoRegioes(){renders++;}};
  vm.createContext(ctx);vm.runInContext(flow,ctx);const pending=ctx.window.avancarParaMapa();if(change)revision++;release();await pending;
  if(change){assert.equal(renders,0);assert.equal(navigations,0);assert.equal(updates,1);}else{assert.equal(renders,1);assert.equal(navigations,1);assert.equal(updates,2);assert.equal(applied.at(-1),loaded);}
  count++;console.log('PASS report/radar: actual deferred catalog load '+(change?'cannot enter another evaluation':'uses rebuilt canonical plan before rendering'));
 }
 console.log(count+' report/radar consistency scenarios OK');
})().catch(error=>{console.error(error);process.exitCode=1;});
