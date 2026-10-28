'use strict';
const fs=require('fs');
const assert=require('assert');
const core=fs.readFileSync('src/core/script-1.18.0.js','utf8');
const reg=fs.readFileSync('src/patient/patient_registration_core-1.0.0.js','utf8');
const index=fs.readFileSync('index.html','utf8');

for(const fn of ['salvarCadastroSomente','salvarEIniciarAvaliacao','editarCadastro']){
  assert.match(reg,new RegExp(`async function ${fn}\\(`),`${fn} deve existir no módulo de cadastro`);
  assert.doesNotMatch(core,new RegExp(`async function ${fn}\\(`),`${fn} não pode permanecer duplicada no monólito`);
  assert.match(reg,new RegExp(`window\\.${fn}\\s*=\\s*${fn}`),`${fn} deve preservar contrato global`);
}

assert.match(core,/async function salvarPacienteNaNuvem\(pacienteObjeto, opcoes = \{\}\)/,'persistência central deve continuar no monólito nesta fase');
assert.match(core,/async function carregarPacienteParaEdicao\(/,'edição clínica do prontuário deve permanecer fora do escopo da 4N');

const saveStart=reg.indexOf('async function salvarCadastroSomente');
const startEval=reg.indexOf('async function salvarEIniciarAvaliacao');
const editStart=reg.indexOf('async function editarCadastro');
assert.ok(saveStart>=0&&startEval>saveStart&&editStart>startEval,'ordem histórica das três APIs deve ser preservada');
const saveBlock=reg.slice(saveStart,startEval);
assert.match(saveBlock,/obterPacientesBasicos\(\)/,'cadastro deve manter verificação leve de CPF');
assert.match(saveBlock,/obterPacienteCompletoPorId\(pacienteAtualId\)/,'edição deve preservar histórico completo do paciente');
assert.match(saveBlock,/salvarPacienteNaNuvem\(novoPaciente,\{somenteCadastro:true\}\)/,'cadastro deve continuar usando persistência central');
assert.match(saveBlock,/validarResponsavelCadastro\(\)/,'validação de responsável deve permanecer');

const evalBlock=reg.slice(startEval,editStart);
assert.match(evalBlock,/telaPermitida\('tela_avaliacao'\)/,'perfil sem Avaliação deve continuar protegido');
assert.match(evalBlock,/await salvarCadastroSomente\(false\)/,'salvar + avaliar deve reutilizar o mesmo cadastro');
assert.match(evalBlock,/navegarPara\('tela_avaliacao', true\)/,'navegação para Avaliação deve permanecer explícita');

const editBlock=reg.slice(editStart);
assert.match(editBlock,/obterPacientesBasicos\(\)/,'abrir edição deve continuar usando índice leve');
assert.match(editBlock,/navegarPara\('tela_cadastro', true\)/,'edição deve continuar abrindo a tela de cadastro');
assert.match(editBlock,/atualizarAcoesCadastroPorPerfil\(\)/,'ações por perfil devem continuar sincronizadas');

const corePos=index.indexOf('src/core/script-1.18.0.js');
const delPos=index.indexOf('src/patient/patient_deletion_core-1.0.0.js');
const chartPos=index.indexOf('src/patient/patient_chart_read_core-1.0.0.js');
const regPos=index.indexOf('src/patient/patient_registration_core-1.0.0.js');
const loaderPos=index.indexOf('src/ui/screen_loader-1.25.0.js');
assert.ok(corePos>=0&&delPos>corePos&&chartPos>delPos&&regPos>chartPos,'cadastro deve carregar depois das dependências de prontuário');
assert.ok(loaderPos<0||regPos<loaderPos,'cadastro deve estar disponível antes dos fluxos de tela posteriores');
assert.match(index,/core_mod=20260911-phase4[a-z]+-r\d+/,'cache-buster do core deve acompanhar a Phase 4N');

const regSize=fs.statSync('src/patient/patient_registration_core-1.0.0.js').size;
const coreSize=fs.statSync('src/core/script-1.18.0.js').size;
assert.ok(regSize>4000,'extração parece pequena demais para conter o fluxo real de cadastro');
assert.ok(coreSize<703202,`monólito deve reduzir em relação à 4M; atual=${coreSize}`);
console.log(`Patient registration modularization: OK | module=${regSize} bytes | monolith=${coreSize} bytes`);

// Round-trip administrativo com o cadastro e a persistência reais em VM.
const vm=require('node:vm');
class CampoCadastro{
 constructor(tag='input'){this.tagName=tag.toUpperCase();this.children=[];this.value='';this.dataset={};this.events={};this.attrs={};this.checked=false;}
 append(...nodes){nodes.forEach(n=>{n.parent=this;this.children.push(n);});}appendChild(n){this.append(n);}replaceChildren(){this.children=[];}remove(){this.parent.children=this.parent.children.filter(x=>x!==this);}setAttribute(k,v){this.attrs[k]=v;}addEventListener(k,f){this.events[k]=f;}focus(){}querySelectorAll(){return this.children.flatMap(n=>[...(n.tagName==='INPUT'?[n]:[]),...n.querySelectorAll()]);}
}
(async()=>{
 const fields={},stored={},writes=[],alerts=[];
 const field=id=>fields[id]||(fields[id]=new CampoCadastro(id==='cad_telefones_lista'?'div':'input'));
 const ctx={console,Date,Set,Promise,window:{},pacienteAtualId:null,usuarioLogado:{id:'qa',nome:'Profissional sintético'},
  document:{getElementById:id=>fields.cad_telefones_lista?.querySelectorAll().find(e=>e.id===id)||field(id),createElement:tag=>new CampoCadastro(tag),querySelectorAll:()=>field('cad_telefones_lista').querySelectorAll(),querySelector:()=>null},
  somenteDigitos:x=>String(x||'').replace(/\D/g,''),formatarTelefoneBR:x=>x,limparEstadoCampo(){},validarCPFInput:()=>true,validarCEPInput:()=>true,validarResponsavelCadastro:()=>true,
  validarTelefoneInput:id=>{const n=ctx.somenteDigitos(ctx.document.getElementById(id).value);return !n||[10,11].includes(n.length);},
  obterPacientesBasicos:async()=>Object.values(stored),obterPacienteCompletoPorId:async id=>stored[id],alert:(...a)=>alerts.push(a),
  invalidarCachePacientesBasicos(){},salvarDadosResponsavelLocal(){},salvarLocalStorage(){throw Error('Não usar fallback local neste teste');},usuarioEhMaster:()=>true,perfilDoUsuario:()=>'FISIOTERAPEUTA',
  alternarCamposResponsavel(){},definirStatusCEP(){},definirUltimoCEPPesquisadoKineSys(){},atualizarAcoesCadastroPorPerfil(){},navegarPara:async()=>true,pacienteEhDependente:p=>!!p.dependente,
  _supabase:{from:table=>({upsert:async rows=>{writes.push(table);for(const row of rows)stored[row.id]={...(stored[row.id]||{}),...JSON.parse(JSON.stringify(row))};return {error:null};}})}};
 ctx.window=ctx;vm.createContext(ctx);vm.runInContext(reg,ctx);
 vm.runInContext(core.slice(core.indexOf('async function salvarPacienteNaNuvem('),core.indexOf('function salvarLocalStorage(')),ctx);
 field('cad_nome').value='Paciente sintético Alfa';field('cad_telefone').value='11999990000';field('cad_observacoes').value='Preferência administrativa de contato.';
 ctx.adicionarTelefoneCadastro('11999990001');ctx.adicionarTelefoneCadastro('(11) 99999-0001');ctx.adicionarTelefoneCadastro('11999990000');ctx.adicionarTelefoneCadastro('1133334444');
 const saved=await ctx.salvarCadastroSomente(false);assert(saved);const id=saved.id;
 assert.deepEqual(Array.from(stored[id].telefones_adicionais),['11999990001','1133334444'],'Contatos repetidos/principal não são duplicados');assert.equal(stored[id].observacoes_cadastro,'Preferência administrativa de contato.');
 assert.equal(stored[id].telefone,'11999990000');assert.deepEqual(writes,['pacientes'],'Cadastro não regrava avaliações/evoluções');
 ctx.preencherTelefonesCadastro();field('cad_observacoes').value='';await ctx.editarCadastro(id);
 assert.deepEqual(Array.from(field('cad_telefones_lista').querySelectorAll(),e=>e.value),['11999990001','1133334444']);assert.equal(field('cad_observacoes').value,'Preferência administrativa de contato.');
 const p=stored[id];p.avaliacoes=[{id:'avaliacao-preservada'}];p.evolucoes=[{id:'evolucao-preservada'}];
 const first=field('cad_telefones_lista').children[0];first.children[1].events.click();field('cad_observacoes').value='Nota alterada';await ctx.salvarCadastroSomente(false);assert.deepEqual(Array.from(stored[id].telefones_adicionais),['1133334444']);assert.equal(stored[id].observacoes_cadastro,'Nota alterada');assert(writes.every(t=>t==='pacientes'));
 ctx.adicionarTelefoneCadastro('123');const before=writes.length;assert.equal(await ctx.salvarCadastroSomente(false),null);assert.equal(writes.length,before,'Telefone adicional inválido bloqueia gravação');
 stored.beta={id:'beta',nome:'Paciente sintético Beta',telefone:'11999990002'};await ctx.editarCadastro('beta');assert.equal(field('cad_telefones_lista').querySelectorAll().length,0);assert.equal(field('cad_observacoes').value,'','Troca de paciente não herda nota/telefones');
 await ctx.salvarPacienteNaNuvem({id,nome:p.nome},{somenteCadastro:true});assert.equal(stored[id].observacoes_cadastro,'Nota alterada','Objeto parcial não apaga observação já gravada');assert.deepEqual(Array.from(stored[id].telefones_adicionais),['1133334444']);
 assert.match(fs.readFileSync('src/patient/patient_index_cache_core-1.0.0.js','utf8'),/'telefones_adicionais','observacoes_cadastro'/,'Reabrir cadastro lê os novos campos da nuvem');
 console.log('PASS cadastro: adicionar/remover/deduplicar contatos, observação, gravação/reabertura real, troca de paciente, validação e histórico clínico preservado.');
})().catch(e=>{console.error(e);process.exitCode=1;});
