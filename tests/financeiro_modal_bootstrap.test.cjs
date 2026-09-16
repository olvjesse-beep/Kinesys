const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const html=fs.readFileSync('index.html','utf8');
assert(html.indexOf('src/ui/modal_helpers-1.0.0.js')<html.indexOf('src/finance/financeiro-1.19.0.js'));
assert.doesNotMatch(fs.readFileSync('src/agenda/agenda-1.20.0.js','utf8'),/function (abrirModal|fecharModal)\(/);
const classes=new Set(),ctx=vm.createContext({document:{getElementById:id=>id==='modal_fin_plano'?{classList:{add:v=>classes.add(v),remove:v=>classes.delete(v)}}:null}});
vm.runInContext(fs.readFileSync('src/ui/modal_helpers-1.0.0.js','utf8'),ctx);
ctx.abrirModal('modal_fin_plano');assert(classes.has('ativa'));ctx.fecharModal('modal_fin_plano');assert(!classes.has('ativa'));ctx.abrirModal('ausente');
console.log('PASS: diálogos financeiros disponíveis sem carregar Agenda.');
