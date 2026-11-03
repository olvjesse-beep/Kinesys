'use strict';
// DOM real; a geometria controlada exercita limites e conservação sem navegador
// ou dados reais. A conferência visual complementa este contrato de paginação.
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const {JSDOM}=require(process.env.JSDOM_MODULE||'jsdom');
const helper=fs.readFileSync('src/reports/report_ui_helpers_core-1.0.0.js','utf8');
const timeline=fs.readFileSync('src/core/document_timeline_core-1.0.0.js','utf8');
const css=fs.readFileSync('styles/design_base.css','utf8');
const index=fs.readFileSync('index.html','utf8');
const dom=new JSDOM('<!doctype html><html><head><style>'+css+'</style></head><body><section class="tela ativa"><div id="preview_relatorio_container"><div id="documento_impressao"></div></div></section></body></html>',{url:'https://example.test/',runScripts:'outside-only'});
const w=dom.window,doc=w.document;
w.console.warn=()=>{};
vm.runInContext(helper,dom.getInternalVMContext());
const qtdLinhas=texto=>Math.max(1,Math.ceil(texto.length/84));
function altura(el){
 if(el.nodeType===3)return el.textContent.trim()?22:0;
 if(el.matches('.fechamento-documento'))return 320;
 if(el.matches('table'))return 32+el.querySelectorAll('tbody>tr').length*28;
 if(el.matches('h1,h2,h3,h4,.doc-secao-titulo'))return 36;
 return qtdLinhas(el.textContent)*22+8;
}
Object.defineProperty(w.HTMLElement.prototype,'clientHeight',{get(){return this.matches('.timbrado-conteudo')?733:0;}});
Object.defineProperty(w.HTMLElement.prototype,'scrollHeight',{get(){return this.matches('.timbrado-conteudo')?Math.max(733,[...this.childNodes].reduce((n,el)=>n+altura(el),0)):0;}});
function paginar(html){
 // Os nós pertencem ao mesmo protótipo que contém a geometria de teste.
 const corpo=doc.createElement('div');doc.body.appendChild(corpo);
 const pseudo={createElement:tag=>doc.createElement(tag),createTreeWalker:(...args)=>doc.createTreeWalker(...args),createRange:()=>doc.createRange(),body:corpo};
 w.paginarDocumentoKineSys(pseudo,html,'https://example.test/timbrado.png');
 const folhas=[...corpo.querySelectorAll('article')];
 assert(folhas.every(f=>f.querySelector('.timbrado-conteudo').scrollHeight<=734),'nenhum conteúdo pode ficar cortado');
 assert(folhas.every(f=>f.querySelector('.timbrado-conteudo').textContent.trim()),'não produzir folhas vazias');
 const texto=folhas.map(f=>f.querySelector('.timbrado-conteudo').textContent).join('');
 corpo.remove();return {folhas,texto};
}
const assinatura='<div class="fechamento-documento"><p>Montes Claros, 3 de novembro de 2026.</p><div class="assinatura-dinamica"><p>Profissional sintético</p></div></div>';
const curto='<p class="doc-titulo">Declaração de Comparecimento</p><p>Paciente sintético compareceu de 08h00 às 09h00.</p>'+assinatura;
const um=paginar(curto);assert.equal(um.folhas.length,1);assert.equal(um.texto,'Declaração de ComparecimentoPaciente sintético compareceu de 08h00 às 09h00.Montes Claros, 3 de novembro de 2026.Profissional sintético');
const paragrafos=Array.from({length:35},(_,i)=>'<p>Registro '+i+': nega trauma, dor à esquerda, EVA 6/10. '+('Descrição documentada. '.repeat(12))+'</p>').join('');
const varios=paginar(paragrafos+assinatura);assert(varios.folhas.length>1);assert.equal(varios.folhas.flatMap(f=>[...f.querySelectorAll('.assinatura-dinamica')]).length,1);
for(let i=0;i<35;i++)assert.equal(varios.texto.split('Registro '+i+':').length-1,1);
const longo='<section class="doc-secao"><h3 class="doc-secao-titulo">Achados</h3><p>'+Array.from({length:350},(_,i)=>'Trecho '+i+' <strong>sem dor</strong> à esquerda, 75 mg. ').join('')+'</p></section>';
const fragmentado=paginar(longo+assinatura);assert(fragmentado.folhas.length>2);
const origem=doc.createElement('div');origem.innerHTML=longo+assinatura;assert.equal(fragmentado.texto,origem.textContent,'não perder/reordenar texto, negativa, dose ou marcação');
assert.equal(fragmentado.folhas.flatMap(f=>[...f.querySelectorAll('strong')]).filter(el=>el.textContent==='sem dor').length,350);
const tabela='<table class="doc-quadro-medidas"><thead><tr><th>Registro</th><th>Valor</th></tr></thead><tbody>'+Array.from({length:70},(_,i)=>'<tr><td>Item '+i+':</td><td>'+i+' mm</td></tr>').join('')+'</tbody></table>';
const tab=paginar('<h3>Medidas</h3>'+tabela+assinatura);assert(tab.folhas.length>=3);assert.equal(tab.folhas.flatMap(f=>[...f.querySelectorAll('tbody>tr')]).length,70);assert(tab.folhas.flatMap(f=>[...f.querySelectorAll('thead')]).length>1);
assert.throws(()=>paginar('<pre>'+('Bloco não divisível. '.repeat(400))+'</pre>'),/excede/,'não imprimir conteúdo cortado silenciosamente');
const seg=paginar('<p onclick="erro()">Documento B</p><script>erro()</script>'+assinatura);assert(!seg.folhas.some(f=>f.querySelector('script,[onclick]')));
const mirror=w.criarEspelhoImpressaoDocumentoKineSys({styleSheets:[],body:{children:um.folhas}});
assert.equal(mirror.shadowRoot.querySelectorAll('article').length,1);assert.equal(mirror.shadowRoot.querySelector('.timbrado-conteudo').textContent,um.texto);
w.eval('documentoVisualAtualKineSys={espelho:document.getElementById("ks_documento_impressao")}');
w.dispatchEvent(new w.Event('beforeprint'));assert.equal(doc.body.getAttribute('data-ks-documento-impressao'),'true');
w.dispatchEvent(new w.Event('afterprint'));assert(!doc.body.hasAttribute('data-ks-documento-impressao'));
doc.getElementById('preview_relatorio_container').style.display='none';
w.dispatchEvent(new w.Event('beforeprint'));assert(!doc.body.hasAttribute('data-ks-documento-impressao'),'prévia oculta não imprime documento anterior');
assert(css.includes('width: 210mm')&&css.includes('height: 297mm')&&css.includes('height: 194mm'));
const print=css.slice(css.indexOf('@media print'),css.indexOf('/* ============================================================',css.indexOf('@media print')));
assert(!/font-size|line-height|text-align|visibility:\s*hidden|padding:\s*(?:49|48|54)mm/.test(print),'impressão não deve refluir fontes, largura ou margens internas');
assert(print.includes('display: none !important'),'impressão nativa remove a interface do fluxo');
assert(helper.includes('await doc.fonts?.ready')&&helper.includes('img.decode()'),'aguardar fontes e timbre antes de imprimir');
assert(index.includes('documento_impressao" class="documento-preview"'));
assert(index.includes('20261103-documento-a4-r2')&&helper.includes('20261103-r2'));

async function fluxoImpressao(){
 let sequencia=[],alertas=[];
 const contexto={console:{warn(){}},alert:msg=>alertas.push(msg),window:{print(){throw Error('Não imprimir o aplicativo');}},document:{},localStorage:{},Map,Date,Math};
 vm.createContext(contexto);vm.runInContext(timeline,contexto);
 contexto.obterDocumentoProntoParaImpressaoKineSys=async()=>({atual:()=>true,janela:{focus(){sequencia.push('foco');},print(){sequencia.push('impressão');}}});
 contexto.registrarDocumentoAtual=async()=>sequencia.push('histórico');
 await contexto.imprimirDocumento();assert.deepEqual(sequencia,['histórico','foco','impressão']);
 let liberar;contexto.obterDocumentoProntoParaImpressaoKineSys=()=>new Promise(ok=>liberar=ok);
 sequencia=[];const primeiro=contexto.imprimirDocumento();await contexto.imprimirDocumento();
 liberar({atual:()=>true,janela:{focus(){},print(){sequencia.push('impressão');}}});await primeiro;
 assert.deepEqual(sequencia,['histórico','impressão'],'duplo clique não duplica histórico/impressão');
 sequencia=[];contexto.obterDocumentoProntoParaImpressaoKineSys=async()=>{throw Error('Timbre não carregou');};
 await contexto.imprimirDocumento();assert.equal(sequencia.length,0);assert.equal(alertas.length,1);
 let atual=true;contexto.obterDocumentoProntoParaImpressaoKineSys=async()=>({atual:()=>atual,janela:{focus(){},print(){throw Error('Documento antigo');}}});
 contexto.registrarDocumentoAtual=async()=>{atual=false;};await contexto.imprimirDocumento();assert.equal(alertas.length,1,'troca de documento durante histórico cancela impressão');
 contexto.obterDocumentoProntoParaImpressaoKineSys=async()=>({atual:()=>true,janela:{focus(){},print(){sequencia.push('recuperou');}}});
 contexto.registrarDocumentoAtual=async()=>{};await contexto.imprimirDocumento();assert.deepEqual(sequencia,['recuperou'],'falha deve liberar trava para tentar novamente');
}
fluxoImpressao().then(()=>{w.close();console.log('PASS: A4 único, múltiplas folhas, parágrafo longo, tabelas, assinatura, espelho nativo, conservação textual e impressão isolada/concorrente.');}).catch(err=>{console.error(err);process.exitCode=1;w.close();});
