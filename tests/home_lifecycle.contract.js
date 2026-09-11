const assert=require('assert');
const fs=require('fs');
const home=fs.readFileSync('home_detalhes-1.18.5.js','utf8');

assert.doesNotMatch(home,/new MutationObserver\(\(\)=>\{if\(!home\.classList\.contains\('ativa'\)\)fecharAtendimentosHome\(false\);\}\)/,'Home não deve observar classe apenas para fechar atendimentos');
assert.doesNotMatch(home,/new MutationObserver\(\(\)=>\{if\(!home\.classList\.contains\('ativa'\)\)fecharPendenciasHome\(false\);\}\)/,'Home não deve observar classe apenas para fechar pendências');
assert.doesNotMatch(home,/setInterval\(\(\)=>\{if\(document\.visibilityState==='visible'&&document\.getElementById\('tela_home'\)\?\.classList\.contains\('ativa'\)\)/,'polling global antigo de 60 s não pode permanecer');
assert.match(home,/let homeDetalhesRefreshTimer=null;/,'timer da Home deve ter lifecycle explícito');
assert.match(home,/homeDetalhesRefreshTimer=setInterval\(executarRefreshPeriodicoHome,60000\)/,'cadência histórica de 60 s deve ser preservada enquanto ativa');
assert.match(home,/clearInterval\(homeDetalhesRefreshTimer\)/,'timer deve ser suspenso ao sair da Home');
assert.match(home,/document\.addEventListener\('kinesys:tela-ativada',aoTelaAtivadaHomeDetalhes\)/,'Home deve reagir ao lifecycle oficial de ativação');
assert.match(home,/document\.addEventListener\('kinesys:tela-desativada',aoTelaDesativadaHomeDetalhes\)/,'Home deve reagir ao lifecycle oficial de desativação');
assert.match(home,/fecharAtendimentosHome\(false\);[\s\S]*fecharPendenciasHome\(false\);/,'saída da Home deve fechar diálogos sem devolver foco');
assert.match(home,/document\.visibilityState!=='visible'/,'refresh deve continuar respeitando visibilidade do documento');
console.log('Home lifecycle contract OK');
