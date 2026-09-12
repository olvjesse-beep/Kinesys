const assert=require('assert');
const fs=require('fs');
const index=fs.readFileSync('index.html','utf8');
const ds=fs.readFileSync('src/core/design_system-1.20.1.js','utf8');

assert.match(index,/src\/core\/design_system-1\.20\.1\.js/,'index deve carregar a versão ativa do Design System');
assert.doesNotMatch(ds,/const poll=setInterval\(/,'Design System ativo não deve manter polling global de 1,2 s');
assert.doesNotMatch(ds,/beforeunload[^\n]*clearInterval\(poll\)/,'cleanup do polling antigo não deve permanecer');
assert.match(ds,/function sincronizarDesignDinamico\(\)/,'deve existir sincronização dinâmica orientada a eventos');
assert.match(ds,/document\.addEventListener\('kinesys:tela-ativada',sincronizarDesignDinamico\)/,'deve reagir à ativação de telas');
assert.match(ds,/document\.addEventListener\('kinesys:tela-dom-pronta',sincronizarDesignDinamico\)/,'deve reagir a DOM lazy pronto');
assert.match(ds,/escutarSeletoresPaciente\(\);[\s\S]*atualizarGruposNav\(\);/,'deve preservar seleção de paciente e grupos de navegação');
assert.match(ds,/ks_sidebar_role[\s\S]*rotuloPerfil/,'deve preservar atualização do rótulo de perfil');
console.log('Design System lifecycle contract OK');
