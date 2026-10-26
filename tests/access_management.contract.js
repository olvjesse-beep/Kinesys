'use strict';
const fs=require('fs');
const assert=require('assert');

const login=fs.readFileSync('src/auth/login_access-1.18.0.js','utf8');
const admin=fs.readFileSync('src/admin/access_admin-1.0.0.js','utf8');
const recovery=fs.readFileSync('recuperar-acesso.html','utf8');
const edge=fs.readFileSync('supabase/functions/cadastrar-equipe/index.ts','utf8');
const index=fs.readFileSync('index.html','utf8');
const core=fs.readFileSync('src/core/script-1.18.0.js','utf8');
const team=fs.readFileSync('src/admin/team_management_core-1.0.0.js','utf8');

assert.match(login,/kinesys_meus_perfis/,'login must resolve profiles from the authenticated account');
assert.doesNotMatch(login,/filter\(p=>normalize\(p\.tipo\)===selectedRole\)/,'login must not pre-filter profiles by a role chosen before authentication');
assert.match(login,/profiles\.length===1/,'single real profile must enter without a second role choice');
assert.match(login,/Selecione seu perfil/,'multiple real profiles must be selectable after authentication');
assert.match(login,/https:\/\/app\.fisiofixfisioterapia\.com\/recuperar-acesso\.html/,'self-service recovery must target the canonical production recovery page');
assert.match(login,/\.ks-access-tabs'\)\?\.setAttribute\('hidden'/,'legacy role tabs must be hidden from the unified login');

assert.match(recovery,/auth\.updateUser\(\{password\}\)/,'recovery page must update the authenticated recovery user password');
assert.match(recovery,/detectSessionInUrl:true/,'recovery page must consume the Supabase recovery session from the URL');
assert.match(recovery,/PASSWORD_RECOVERY/,'recovery page must recognize the recovery auth event');
assert.doesNotMatch(recovery,/service_role|SUPABASE_SERVICE_ROLE_KEY/i,'public recovery page must never contain a service role secret');

assert.match(admin,/addEventListener\('click',interceptarClique,true\)/,'team reset must intercept the legacy action in capture phase');
assert.match(admin,/action:'reset_password'/,'team reset must call the authenticated server-side reset action');
assert.match(admin,/usuarioEhMaster|MASTER_FEM/,'team password administration must remain MASTER-only in the UI');
assert.doesNotMatch(admin,/service_role|SUPABASE_SERVICE_ROLE_KEY/i,'frontend access admin must never contain a service role secret');
assert.doesNotMatch(admin,/from\('equipe'\)[\s\S]{0,180}update\(\{\s*senha/,'frontend must not store passwords in equipe.senha');

assert.match(edge,/action === 'reset_password'/,'edge function must expose the reset_password action');
assert.match(edge,/auth\.admin\.updateUserById/,'password changes must be performed by Supabase Auth admin server-side');
assert.match(edge,/\.eq\('clinica_id', caller\.clinica_id\)/,'target profile must be constrained to the caller clinic');
assert.match(edge,/activeClinics\.size > 1/,'multi-clinic identities must fail closed for direct password reset');
assert.match(edge,/kinesys_sessoes_perfil'[\s\S]{0,160}\.delete\(\)/,'profile sessions must be invalidated after an administrative password reset');
assert.match(edge,/update\(\{ senha: null \}\)/,'legacy equipe password value must be cleared, never replaced with the new password');

const resetStart=team.indexOf('async function enviarRedefinicaoAcessoFuncionario(id)');
const resetEnd=team.indexOf('async function excluirFuncionario(id)',resetStart);
assert.ok(resetStart>=0&&resetEnd>resetStart,'team reset compatibility function must exist in the dedicated team module');
const resetBlock=team.slice(resetStart,resetEnd);
assert.match(resetBlock,/KineSysAccessAdmin\?\.open/,'legacy team action must delegate to the secure access admin controller');
assert.doesNotMatch(resetBlock,/resetPasswordForEmail/,'team administration must not depend on recovery email');
assert.match(team,/>Definir nova senha<\/button>/,'team action must be labeled as direct password definition');
assert.doesNotMatch(core,/CAMPOS_PUBLICOS_PERFIL\s*=\s*\[[\s\S]{0,250}['"]senha['"]/,'public team profile projection must continue excluding the legacy password column');

assert.match(index,/styles\/access_admin-1\.0\.0\.css/,'access admin stylesheet must be loaded');
assert.match(index,/src\/admin\/access_admin-1\.0\.0\.js/,'access admin controller must be loaded');
assert.ok(index.indexOf('src/auth/login_access-1.18.0.js')<index.indexOf('src/admin/access_admin-1.0.0.js'),'access admin must load after login access and the core globals it relies on');

console.log('Access management contract OK: unified profile login, dedicated recovery and MASTER-only server-side password reset.');
// Chrome novo, cache antigo ou preferência de movimento reduzido não podem
// depender de uma animação para revelar o login ou a aplicação.
assert.doesNotMatch(index, /<body[^>]*\bks-app-booting\b/, 'não ocultar o body inteiro nem depender de animação');
assert.doesNotMatch(fs.readFileSync('styles/design_screens.css','utf8'), /body\.ks-app-booting\s*\{[^}]*visibility:\s*hidden/i, 'CSS não pode esconder o body durante o bootstrap');
assert.match(fs.readFileSync('src/core/design_system-1.20.1.js','utf8'), /classList\.remove\('ks-app-booting'\)/, 'HTML legado em cache deve ser revelado sem depender de animação');
assert.match(index,/<body data-ks-startup="pending">/,'a primeira pintura mostra somente a apresentação neutra');
assert.match(index,/id="ks_startup" role="status"/,'a inicialização deve explicar o que está acontecendo');
assert.match(index,/<noscript>/,'navegador sem JavaScript recebe uma instrução explícita');
const startupCss=fs.readFileSync('styles/login_access-1.18.0.css','utf8');
assert.match(startupCss,/body\[data-ks-startup="pending"\]>:not\(#ks_startup\)/,'não exibir telas intermediárias antes de restaurar o acesso');
assert.match(startupCss,/#ks_startup \[hidden\]/,'respeitar hidden na ação de recarregar');
assert.match(login,/finally\{[\s\S]*removeAttribute\('data-ks-startup'\)/,'sucesso, sessão ausente e falha concluem a apresentação');
const foundation=fs.readFileSync('styles/design_foundation.css','utf8');
assert.match(foundation,/:is\(h1,h2,h3,h4,h5,h6\):not\(\[role="button"\]\):not\(\[role="link"\]\):not\(\[tabindex="0"\]\):focus\{outline:none/,'remover contorno somente de títulos de leitura, mesmo após remoção do tabindex');
assert.doesNotMatch(foundation,/(?:^|\n)\s*(?:\*|body)\s*:focus/,'não apagar o foco dos controles de teclado');
console.log('Boot visibility: apresentação neutra, compatibilidade e foco de leitura OK.');

// Exercita o controlador real com respostas sintéticas, sem chamadas à nuvem.
const vm=require('node:vm');
function startupHarness(options={}){
 const nodes=new Map(),frames=[],timers=new Map(),messages=[];let serial=0,authEvent;
 const node=id=>{if(!nodes.has(id))nodes.set(id,{hidden:true,style:{},value:'',textContent:'',replaceChildren(){},remove(){this.removed=true;}});return nodes.get(id);};
 const body={pending:true,removeAttribute(name){if(name==='data-ks-startup')this.pending=false;}};
 const session=options.session||(()=>Promise.resolve({data:{session:null},error:null}));
 const env={console,Promise,URLSearchParams,Option:function(text,value){this.text=text;this.value=value;},document:{body,getElementById:node,querySelector:()=>null,querySelectorAll:()=>[],addEventListener(){}},localStorage:{removeItem(){if(options.storageError)throw Error('storage indisponível');}},location:{search:options.search||'',reload(){}},autenticacaoInicializada:false,authStateSubscription:null,usuarioLogado:null,loginPerfisDisponiveis:[],loginCredencialChave:'',loginEmAndamento:false,persistirSessao(){},sincronizarEstadoAutenticacaoVisual(){},mostrarFeedbackLogin(...args){messages.push(args);},mensagemErroAutenticacao:()=>'',navegarPara(route){env.route=route;},liberarAcessoSistema(){env.route='tela_home';env.entries=(env.entries||0)+1;return options.navigation?.();},requestAnimationFrame:fn=>frames.push(fn),setTimeout(fn,ms){const id=++serial;timers.set(id,{fn,ms});return id;},clearTimeout:id=>timers.delete(id)};
 env._supabase=options.offline?null:{auth:{onAuthStateChange(fn){authEvent=fn;return {data:{subscription:{}}};},getSession:session},rpc:options.rpc||(()=>Promise.resolve({data:{id:'perfil-qa',tipo:'MASTER',nome:'Demonstração'},error:null}))};
 vm.runInNewContext(login+'\nthis.loginController=KineSysLogin;',env);
 return {env,node,body,frames,timers,messages,event:value=>authEvent(value),async settle(task){for(let i=0;i<15;i++){await Promise.resolve();frames.splice(0).forEach(fn=>fn());}await task;}};
}
(async()=>{
 const absent=startupHarness();await absent.settle(absent.env.loginController.start());assert(!absent.body.pending);assert.equal(absent.env.route,'tela_login');assert.equal(absent.env.usuarioLogado,null);
 let finishNavigation;const active=startupHarness({session:async()=>({data:{session:{}},error:null}),navigation:()=>new Promise(resolve=>finishNavigation=resolve)});const starting=active.env.loginController.start();for(let i=0;i<12;i++)await Promise.resolve();assert(active.body.pending,'não revelar painel durante navegação inicial');assert.equal(active.env.entries,1);finishNavigation();await active.settle(starting);assert(!active.body.pending);assert.equal(active.env.route,'tela_home');assert.equal(active.env.usuarioLogado.id,'perfil-qa');
 for(const options of [{offline:true},{storageError:true},{session:async()=>{throw Error('falha de rede');}}]){const h=startupHarness(options);await h.settle(h.env.loginController.start());assert(!h.body.pending);assert.equal(h.env.usuarioLogado,null);assert(h.messages.some(x=>/recuperar o acesso/.test(x[0])));}
 const recovery=startupHarness({search:'?recuperar=1'});await recovery.settle(recovery.env.loginController.start());assert(!recovery.body.pending);assert.equal(recovery.node('login_acesso_nova_senha').hidden,false);assert.equal(recovery.env.entries,undefined);
 let finishProfile;const race=startupHarness({session:async()=>({data:{session:{}},error:null}),rpc:()=>new Promise(resolve=>finishProfile=resolve)});const loading=race.env.loginController.start();for(let i=0;i<12;i++)await Promise.resolve();race.event('SIGNED_OUT');finishProfile({data:{id:'antigo',tipo:'MASTER'},error:null});await race.settle(loading);assert.equal(race.env.usuarioLogado,null);assert.equal(race.env.entries,undefined);assert.equal(race.env.route,'tela_login');
 let finishSession;const slow=startupHarness({session:()=>new Promise(resolve=>finishSession=resolve)});const waiting=slow.env.loginController.start();[...slow.timers.values()].find(t=>t.ms===12000).fn();assert.equal(slow.node('ks_startup_retry').hidden,false);assert.match(slow.node('ks_startup_message').textContent,/demorando/);assert(slow.body.pending);finishSession({data:{session:null},error:null});await slow.settle(waiting);assert(!slow.body.pending);assert.equal(slow.timers.size,0);
 console.log('Startup runtime: sessão válida/ausente, rede, storage, recuperação, saída concorrente e espera prolongada OK.');
})().catch(error=>{console.error(error);process.exitCode=1;});
