// Aprovação automática de hipótese pelo exame (etapa 2).
// Caso de origem (06/11/2026, dados sintéticos): radiculopatia lombossacra com 4/4 achados
// positivos foi aprovada; ao registrar "Dor lombar inespecífica" com 2 positivos e 1 negativo,
// a aprovação migrava para a hipótese divergente e a radiculopatia perdia o status.
const assert=require('assert');
const fs=require('fs');
const vm=require('vm');

const engine=fs.readFileSync('src/clinical/clinical_engine-1.17.0.js','utf8');
const trecho=nome=>{
  const inicio=engine.indexOf(`function ${nome}(`);
  assert.ok(inicio>=0,`${nome} deve existir no motor clínico`);
  const fim=engine.indexOf('\n    }',inicio);
  return engine.slice(inicio,fim+6);
};
const codigo=['chaveFerramenta232','marcarFerramentaInvestigada232','atualizarDirecaoPeloExame232'].map(trecho).join('\n');

function cenario(){
  const estado={resultados:{},ferramentasInvestigadas:[],modoDirecao:'auto',hipotesePrincipalAtiva:null,hipoteseOrigem:'',rotasAtivas:[]};
  const status={};
  const ctx={
    window:{obterEstadoRegiao:()=>estado},
    statusHipoteseKineSys:(_r,c)=>status[`${c.grupo}::${c.item.id}`]||'pendente',
    analisarRespostasItem:(e,grupo,item)=>{
      const respostas=(item.testes||[]).map((_,i)=>e.resultados[`${grupo}::${item.id}::${i}`]||'');
      return {positivos:respostas.filter(r=>r==='positivo').length,negativos:respostas.filter(r=>r==='negativo').length};
    }
  };
  vm.createContext(ctx);
  vm.runInContext(codigo+';this.atualizar=atualizarDirecaoPeloExame232;',ctx);
  const registrar=(grupo,item,valores,st)=>{
    valores.forEach((v,i)=>{estado.resultados[`${grupo}::${item.id}::${i}`]=v;});
    status[`${grupo}::${item.id}`]=st;
    return ctx.atualizar('lombar',grupo,item);
  };
  return {estado,registrar};
}

const radicular={id:'radiculopatia_lombossacra',testes:['SLR','Slump','Déficit','Distais']};
const inespecifica={id:'dor_lombar_inespecifica',testes:['Sem patologia séria','Neuro sem déficit','Modulável']};
const outraLimpa={id:'outra_hipotese',testes:['A','B']};

{ // 1. Positivo limpo sem outra aprovada: aprova pelo exame, com origem auditável.
  const {estado,registrar}=cenario();
  registrar('cluster',radicular,['positivo','positivo','positivo','positivo'],'positivo');
  assert.strictEqual(estado.hipotesePrincipalAtiva,'cluster::radiculopatia_lombossacra');
  assert.strictEqual(estado.hipoteseOrigem,'exame_positivo');
  assert.strictEqual(estado.modoDirecao,'hipotese');
}
{ // 2. Caso de origem: hipótese divergente não rouba a aprovação nem é aprovada.
  const {estado,registrar}=cenario();
  registrar('cluster',radicular,['positivo','positivo','positivo','positivo'],'positivo');
  registrar('cluster',inespecifica,['positivo','negativo','positivo'],'positivo');
  assert.strictEqual(estado.hipotesePrincipalAtiva,'cluster::radiculopatia_lombossacra','a hipótese aprovada deve ser preservada');
  assert.strictEqual(estado.modoDirecao,'hipotese');
}
{ // 3. Outra hipótese com positivo limpo também não substitui uma aprovação existente.
  const {estado,registrar}=cenario();
  registrar('cluster',radicular,['positivo','positivo','positivo','positivo'],'positivo');
  registrar('diferencial',outraLimpa,['positivo','positivo'],'positivo');
  assert.strictEqual(estado.hipotesePrincipalAtiva,'cluster::radiculopatia_lombossacra');
}
{ // 4. Cluster que bate o critério com algum negativo (ex.: Laslett 3/5), sem outra aprovada: aprova pelo exame.
  const {estado,registrar}=cenario();
  registrar('cluster',inespecifica,['positivo','negativo','positivo'],'positivo');
  assert.strictEqual(estado.hipotesePrincipalAtiva,'cluster::dor_lombar_inespecifica');
  assert.strictEqual(estado.hipoteseOrigem,'exame_positivo');
  assert.strictEqual(estado.modoDirecao,'hipotese');
}
{ // 5a. Aprovada pelo exame que ganha um negativo mas segue no critério: mantém a aprovação.
  const {estado,registrar}=cenario();
  registrar('cluster',radicular,['positivo','positivo','positivo','positivo'],'positivo');
  registrar('cluster',radicular,['positivo','negativo','positivo','positivo'],'positivo');
  assert.strictEqual(estado.hipotesePrincipalAtiva,'cluster::radiculopatia_lombossacra');
  assert.strictEqual(estado.hipoteseOrigem,'exame_positivo');
}
{ // 5b. Aprovada pelo exame que deixa de bater o critério: perde a aprovação automática.
  const {estado,registrar}=cenario();
  registrar('cluster',radicular,['positivo','positivo','positivo','positivo'],'positivo');
  registrar('cluster',radicular,['positivo','negativo','negativo','negativo'],'negativo');
  assert.strictEqual(estado.hipotesePrincipalAtiva,null);
  assert.strictEqual(estado.hipoteseOrigem,'');
  assert.notStrictEqual(estado.modoDirecao,'hipotese');
}
{ // 5c. Depois de liberada, outra hipótese positiva pode ser aprovada pelo exame.
  const {estado,registrar}=cenario();
  registrar('cluster',radicular,['positivo','positivo','positivo','positivo'],'positivo');
  registrar('cluster',radicular,['negativo','negativo','negativo','negativo'],'negativo');
  registrar('diferencial',outraLimpa,['positivo','positivo'],'positivo');
  assert.strictEqual(estado.hipotesePrincipalAtiva,'diferencial::outra_hipotese');
}
{ // 6. Aprovação manual do fisioterapeuta é soberana, mesmo com resultados divergentes.
  const {estado,registrar}=cenario();
  estado.modoDirecao='hipotese';estado.hipotesePrincipalAtiva='cluster::dor_lombar_inespecifica';estado.hipoteseOrigem='manual';
  registrar('cluster',inespecifica,['positivo','negativo','positivo'],'positivo');
  registrar('cluster',radicular,['positivo','positivo','positivo','positivo'],'positivo');
  assert.strictEqual(estado.hipotesePrincipalAtiva,'cluster::dor_lombar_inespecifica');
  assert.strictEqual(estado.hipoteseOrigem,'manual');
}

console.log('PASS: aprovação pelo exame segue o critério da ferramenta e nunca substitui hipótese já aprovada (8 cenários).');
