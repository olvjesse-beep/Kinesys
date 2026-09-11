'use strict';
const fs=require('fs');
const assert=require('assert');

const login=fs.readFileSync('login_access-1.18.0.js','utf8');
const admin=fs.readFileSync('access_admin-1.0.0.js','utf8');
const recovery=fs.readFileSync('recuperar-acesso.html','utf8');
const edge=fs.readFileSync('supabase/functions/cadastrar-equipe/index.ts','utf8');
const index=fs.readFileSync('index.html','utf8');
const core=fs.readFileSync('script-1.18.0.js','utf8');

assert.match(login,/kinesys_meus_perfis/,'login must resolve profiles from the authenticated account');
assert.doesNotMatch(login,/filter\(p=>normalize\(p\.tipo\)===selectedRole\)/,'login must not pre-filter profiles by a role chosen before authentication');
assert.match(login,/profiles\.length===1/,'single real profile must enter without a second role choice');
assert.match(login,/Selecione seu perfil/,'multiple real profiles must be selectable after authentication');
assert.match(login,/new URL\('recuperar-acesso\.html',location\.href\)/,'self-service recovery must use the dedicated public recovery page');
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

const resetStart=core.indexOf('async function enviarRedefinicaoAcessoFuncionario(id)');
const resetEnd=core.indexOf('async function excluirFuncionario(id)',resetStart);
assert.ok(resetStart>=0&&resetEnd>resetStart,'team reset compatibility function must exist');
const resetBlock=core.slice(resetStart,resetEnd);
assert.match(resetBlock,/KineSysAccessAdmin\?\.open/,'legacy team action must delegate to the secure access admin controller');
assert.doesNotMatch(resetBlock,/resetPasswordForEmail/,'team administration must not depend on recovery email');
assert.match(core,/>Definir nova senha<\/button>/,'team action must be labeled as direct password definition');
assert.doesNotMatch(core,/CAMPOS_PUBLICOS_PERFIL\s*=\s*\[[\s\S]{0,250}['"]senha['"]/,'public team profile projection must continue excluding the legacy password column');

assert.match(index,/access_admin-1\.0\.0\.css/,'access admin stylesheet must be loaded');
assert.match(index,/access_admin-1\.0\.0\.js/,'access admin controller must be loaded');
assert.ok(index.indexOf('login_access-1.18.0.js')<index.indexOf('access_admin-1.0.0.js'),'access admin must load after login access and the core globals it relies on');

console.log('Access management contract OK: unified profile login, dedicated recovery and MASTER-only server-side password reset.');
