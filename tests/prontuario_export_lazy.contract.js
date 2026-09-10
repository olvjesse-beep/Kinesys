'use strict';

const fs=require('fs');
const assert=require('assert');
const vm=require('vm');

const html=fs.readFileSync('index.html','utf8');
const facade=fs.readFileSync('prontuario_export.js','utf8');
const impl=fs.readFileSync('prontuario_export_impl.js','utf8');
const design=fs.readFileSync('design_system-1.20.1.js','utf8');

assert.match(html,/prontuario_export\.js\?v=20260910-phase4e-r1/,'index deve invalidar cache da fachada Phase 4E');
assert.doesNotMatch(html,/prontuario_export_impl\.js/,'implementação pesada não pode voltar ao bootstrap');
assert.match(html,/design_system-1\.20\.1\.js\?v=20260910-phase4e-r1/,'design system modificado deve ter cache invalidado');
assert.ok(fs.statSync('prontuario_export.js').size<9000,'fachada eager deve permanecer pequena');
assert.ok(fs.statSync('prontuario_export_impl.js').size>25000,'implementação pesada deve permanecer fora do bootstrap');

for(const nome of ['podeExportarProntuarioDetalhado','abrirEscolhaProntuarioPDF','gerarProntuarioCompletoPDF']){
    assert.ok(facade.includes(`window.${nome}=`),`${nome} deve continuar publicado pela fachada eager`);
}
assert.match(facade,/prontuario_export_impl\.js\?v=20260910-phase4e-r1/,'fachada deve registrar implementação sob demanda');
assert.match(impl,/async function gerar\(pacienteId,modo='simplificado',janelaPreparada=null\)/,'implementação deve aceitar janela pré-aberta sem quebrar os dois parâmetros públicos');
assert.match(impl,/const w=janelaPreparada\|\|abrirJanelaCarregando\(\);if\(!w\)return;/,'implementação deve reutilizar janela aberta no gesto do usuário');
assert.match(design,/return window\.abrirEscolhaProntuarioPDF\(pacienteId\);/,'design system deve aguardar a fachada de escolha');
assert.match(design,/return window\.gerarProntuarioCompletoPDF\(pacienteId,'simplificado'\);/,'design system deve aguardar PDF simplificado');
assert.match(design,/return window\.gerarProntuarioCompletoPDF\(pacienteId,'detalhado'\);/,'design system deve aguardar PDF detalhado');

// Smoke test do primeiro clique: a janela precisa abrir antes do download do módulo.
const listeners={};
let appended=null;
let openCount=0;
let recebido=null;
const popup={
    closed:false,
    document:{open(){},write(){},close(){}},
    focus(){}
};
const scriptEl={
    src:'',async:true,dataset:{},
    addEventListener(type,fn){listeners[type]=fn;},
    removeEventListener(type,fn){if(listeners[type]===fn)delete listeners[type];},
    remove(){this.removed=true;}
};
const fakeDocument={
    createElement(tag){assert.strictEqual(tag,'script');return scriptEl;},
    body:{appendChild(el){appended=el;}}
};
const context={
    console,
    document:fakeDocument,
    alert(){},
    usuarioLogado:{tipo:'FISIOTERAPEUTA'},
    window:{
        usuarioLogado:{tipo:'FISIOTERAPEUTA'},
        open(){openCount++;return popup;}
    },
    Promise,
    Set,
    Object,
    String,
    Error
};
context.window.window=context.window;
vm.runInNewContext(facade,context,{filename:'prontuario_export.js',timeout:1000});
assert.strictEqual(context.window.podeExportarProntuarioDetalhado(),true,'permissão detalhada deve continuar síncrona antes da carga pesada');
const primeira=context.window.gerarProntuarioCompletoPDF('pac-1','simplificado');
assert.strictEqual(openCount,1,'primeiro clique deve abrir a janela sincronamente, antes do módulo chegar');
assert.strictEqual(appended,scriptEl,'primeiro uso deve anexar exatamente o script lazy');
assert.match(scriptEl.src,/prontuario_export_impl\.js\?v=20260910-phase4e-r1/);
context.window.abrirEscolhaProntuarioPDF=function realAbrir(){};
context.window.gerarProntuarioCompletoPDF=function realGerar(id,modo,janela){recebido={id,modo,janela};return 'ok';};
listeners.load();

(async()=>{
    const resultado=await primeira;
    assert.strictEqual(resultado,'ok');
    assert.deepStrictEqual(recebido,{id:'pac-1',modo:'simplificado',janela:popup},'implementação deve receber a mesma janela pré-aberta');
    assert.strictEqual(openCount,1,'lazy load não pode abrir uma segunda janela');
    const deferred=fs.statSync('prontuario_export_impl.js').size;
    const eager=fs.statSync('prontuario_export.js').size;
    const baselineEagerBytes=27027;
    const reducaoBootstrap=baselineEagerBytes-eager;
    assert.ok(reducaoBootstrap>18000,`Phase 4E deve retirar mais de 18 KB brutos do bootstrap; redução atual ${reducaoBootstrap}`);
    console.log(`Prontuario export lazy contract Phase 4E: baseline eager ${baselineEagerBytes} bytes; fachada eager ${eager} bytes; implementação lazy ${deferred} bytes; redução real do bootstrap ${reducaoBootstrap} bytes.`);
})().catch(error=>{console.error(error);process.exitCode=1;});