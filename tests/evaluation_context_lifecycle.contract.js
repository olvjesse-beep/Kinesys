const assert=require('assert');
const fs=require('fs');
const src=fs.readFileSync('src/clinical/evaluation_context_panels-1.18.3.js','utf8');

assert.match(src,/const navegacao=new MutationObserver\(\(\)=>\{if\(aberto&&!triagem\.classList\.contains\('ativa'\)\)fechar\(false\);\}\)/,'observer deve permanecer restrito à subtela de triagem');
assert.match(src,/navegacao\.observe\(triagem,\{attributes:true,attributeFilter:\['class'\]\}\)/,'triagem deve continuar observada');
assert.doesNotMatch(src,/navegacao\.observe\(avaliacao/,'tela_avaliacao não deve ser observada de forma redundante');
assert.match(src,/document\.addEventListener\('kinesys:tela-desativada',[\s\S]*event\.detail\?\.id==='tela_avaliacao'[\s\S]*pararSincronizacaoContexto\(\);[\s\S]*if\(aberto\)fechar\(false\);/,'saída da avaliação deve continuar coberta pelo lifecycle oficial');
assert.match(src,/sincronizacaoTimer=setInterval\(sincronizarContextoSeAtivo,1000\)/,'cadência clínica existente de 1 s deve ser preservada');
assert.match(src,/if\(sincronizacaoTimer\)\{clearInterval\(sincronizacaoTimer\);sincronizacaoTimer=null;\}/,'timer deve continuar sendo suspenso explicitamente');
assert.match(src,/document\.visibilityState!=='visible'/,'timer deve continuar condicionado à visibilidade');
console.log('Evaluation context lifecycle contract OK');
