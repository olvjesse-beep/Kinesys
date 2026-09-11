'use strict';
const fs=require('fs');
const vm=require('vm');
const assert=require('assert');

const html=fs.readFileSync('index.html','utf8');
const core=fs.readFileSync('script-1.18.0.js','utf8');
const mod=fs.readFileSync('login_ui_helpers_core-1.0.0.js','utf8');
const login=fs.readFileSync('login_access-1.18.0.js','utf8');

const funcoes=['mostrarFeedbackLogin','sincronizarEstadoAutenticacaoVisual','mensagemErroAutenticacao'];
for(const fn of funcoes){
  assert(!core.includes(`function ${fn}(`),`declaração ${fn} permaneceu no monólito`);
  assert(mod.includes(`function ${fn}(`),`módulo perdeu ${fn}`);
}

assert.doesNotMatch(mod,/_supabase|\.rpc\s*\(/,'helpers visuais não devem acessar Supabase/RPC');
assert.doesNotMatch(mod,/localStorage|sessionStorage/,'helpers visuais não devem introduzir persistência');
assert.doesNotMatch(mod,/PERMISSOES_POR_PERFIL|telaPermitida|liberarAcessoSistema/,'helpers visuais não devem conter regras de autorização');
assert.match(login,/mostrarFeedbackLogin\(/,'controlador de login deve continuar consumindo o helper de feedback');
assert.match(login,/sincronizarEstadoAutenticacaoVisual\(/,'controlador de login deve continuar consumindo o helper visual');
assert.match(login,/mensagemErroAutenticacao\(/,'controlador de login deve continuar consumindo o normalizador de erro');

const helperPos=html.indexOf('login_ui_helpers_core-1.0.0.js');
const corePos=html.indexOf('script-1.18.0.js');
const loginPos=html.indexOf('login_access-1.18.0.js');
assert.ok(helperPos>=0&&corePos>helperPos&&loginPos>corePos,'ordem deve manter login UI helpers -> core -> login_access');
assert.match(html,/login_ui_helpers_core-1\.0\.0\.js\?v=20260911-phase4r-r1/,'módulo 4R deve usar cache-buster próprio');
assert.match(html,/core_mod=20260911-phase4[a-z]+-r\d+/,'cache-bust do monólito deve permanecer versionado na série Phase 4');

function fakeClassList(){
  const values=new Set();
  return {
    add(...xs){xs.forEach(x=>values.add(x));},
    remove(...xs){xs.forEach(x=>values.delete(x));},
    toggle(x,on){if(on)values.add(x);else values.delete(x);},
    contains(x){return values.has(x);}
  };
}
function element(){
  const attrs={};
  return {hidden:false,textContent:'',style:{display:''},classList:fakeClassList(),setAttribute(k,v){attrs[k]=String(v);},getAttribute(k){return attrs[k];}};
}
const feedback=element(),header=element(),welcome=element(),label=element(),body=element();
const elements={login_feedback:feedback,header_welcome:welcome,lbl_usuario_logado:label};
const context={
  document:{
    body,
    getElementById(id){return elements[id]||null;},
    querySelector(selector){return selector==='body > header'?header:null;}
  }
};
vm.createContext(context);

// Reproduz a ordem real: helper eager é avaliado antes do monólito; usuarioLogado só é
// declarado depois, mas nenhuma função visual é invocada antes do DOMContentLoaded.
vm.runInContext(mod,context,{filename:'login_ui_helpers_core-1.0.0.js'});
vm.runInContext('let usuarioLogado = null;',context,{filename:'core-binding.js'});

context.mostrarFeedbackLogin('Falha','erro');
assert.equal(feedback.textContent,'Falha');
assert.equal(feedback.style.display,'block');
assert(feedback.classList.contains('ks-login-feedback--erro'));
assert.equal(feedback.getAttribute('role'),'alert');
assert.equal(feedback.getAttribute('aria-live'),'assertive');

context.mostrarFeedbackLogin('','info');
assert.equal(feedback.style.display,'none');
assert.equal(feedback.getAttribute('role'),'status');
assert.equal(feedback.getAttribute('aria-live'),'polite');

vm.runInContext("usuarioLogado={nome:'Ana'}; sincronizarEstadoAutenticacaoVisual();",context);
assert.equal(header.hidden,false);assert.equal(welcome.hidden,false);assert.equal(label.textContent,'Ana');assert(body.classList.contains('kinesys-autenticado'));
vm.runInContext('usuarioLogado=null; sincronizarEstadoAutenticacaoVisual();',context);
assert.equal(header.hidden,true);assert.equal(welcome.hidden,true);assert.equal(label.textContent,'');assert(!body.classList.contains('kinesys-autenticado'));

assert.equal(context.mensagemErroAutenticacao({message:'Invalid login credentials'}),'E-mail ou senha inválidos.');
assert.equal(context.mensagemErroAutenticacao({message:'Email not confirmed'}),'Confirme seu e-mail antes de entrar.');
assert.equal(context.mensagemErroAutenticacao({message:'Failed to fetch'}),'Não foi possível alcançar o servidor. Verifique a conexão e tente novamente.');
assert.equal(context.mensagemErroAutenticacao({message:'outro erro'}),'Não foi possível autenticar agora. Tente novamente.');

console.log('Core Modularization Phase 4R: login UI helpers extracted without auth, persistence or authorization changes.');