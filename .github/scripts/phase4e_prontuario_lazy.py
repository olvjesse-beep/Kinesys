from pathlib import Path

INDEX=Path('index.html')
FACADE=Path('prontuario_export.js')
IMPL=Path('prontuario_export_impl.js')
DESIGN=Path('design_system-1.20.1.js')
TEST=Path('tests/prontuario_export_lazy.contract.js')
QUALITY=Path('.github/workflows/kinesys-quality.yml')

html=INDEX.read_text(encoding='utf-8')
original=FACADE.read_text(encoding='utf-8')
design=DESIGN.read_text(encoding='utf-8')
quality=QUALITY.read_text(encoding='utf-8')

if IMPL.exists():
    raise SystemExit('prontuario_export_impl.js já existe; abortando para evitar sobrescrita')
if "window.gerarProntuarioCompletoPDF=gerar;" not in original or "window.abrirEscolhaProntuarioPDF=abrirEscolha;" not in original:
    raise SystemExit('Contrato público atual do exportador não foi encontrado')

impl=original
old_sig="async function gerar(pacienteId,modo='simplificado'){"
new_sig="async function gerar(pacienteId,modo='simplificado',janelaPreparada=null){"
if impl.count(old_sig)!=1:
    raise SystemExit('Assinatura gerar não encontrada exatamente uma vez')
impl=impl.replace(old_sig,new_sig)
old_open="    const w=abrirJanelaCarregando();if(!w)return;"
new_open="    const w=janelaPreparada||abrirJanelaCarregando();if(!w)return;"
if impl.count(old_open)!=1:
    raise SystemExit('Abertura de janela atual não encontrada exatamente uma vez')
impl=impl.replace(old_open,new_open)

facade=r'''/* ============================================================================
   KineSys — fachada leve de exportação de prontuário · Phase 4E
   Mantém os contratos públicos no bootstrap e carrega a implementação pesada
   somente no primeiro uso. A janela de impressão é aberta durante o gesto do
   usuário para preservar compatibilidade com bloqueadores de pop-up.
   ============================================================================ */
(function(){
'use strict';

const VERSION='1.0.0-phase4e';
const IMPLEMENTACAO='prontuario_export_impl.js?v=20260910-phase4e-r1';
const PERFIS_DETALHADO=new Set(['MASTER','MASTER_FEM','ADMINISTRADOR','ADMINISTRADORA','FISIOTERAPEUTA','PROFISSIONAL']);
let carregamento=null;

function usuarioAtual(){
    try{return (typeof usuarioLogado!=='undefined'&&usuarioLogado)?usuarioLogado:(window.usuarioLogado||null);}
    catch(_){return window.usuarioLogado||null;}
}
function podeDetalhado(){return PERFIS_DETALHADO.has(String(usuarioAtual()?.tipo||'').toUpperCase());}

function esc(v){
    return String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}
function abrirJanelaCarregando(){
    const w=window.open('','_blank');
    if(!w){alert('⚠️ O navegador bloqueou a janela de impressão. Permita pop-ups para o KineSys e tente novamente.');return null;}
    w.document.open();
    w.document.write('<!doctype html><html><head><meta charset="utf-8"><title>Preparando prontuário…</title><style>body{font-family:Arial,sans-serif;padding:36px;color:#173B45}small{color:#60757A}</style></head><body><h2>Preparando prontuário…</h2><small>Carregando o módulo de exportação e os registros do paciente.</small></body></html>');
    w.document.close();
    return w;
}
function informarFalha(error,janela=null){
    console.error('KineSys: falha ao carregar o módulo de exportação do prontuário.',error);
    const mensagem='Não foi possível carregar a exportação do prontuário agora. Verifique a conexão e tente novamente.';
    if(janela&&!janela.closed){
        try{
            janela.document.open();
            janela.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>Erro</title></head><body style="font-family:Arial;padding:32px"><h2>Não foi possível abrir a exportação.</h2><p>${esc(error?.message||mensagem)}</p></body></html>`);
            janela.document.close();
            return;
        }catch(_){}
    }
    if(typeof window.mostrarToastKineSys==='function')window.mostrarToastKineSys(mensagem,'erro',6500);
    else alert(mensagem);
}
function implementacaoPronta(){
    return typeof window.gerarProntuarioCompletoPDF==='function'&&
        window.gerarProntuarioCompletoPDF!==gerarProxy&&
        typeof window.abrirEscolhaProntuarioPDF==='function'&&
        window.abrirEscolhaProntuarioPDF!==abrirEscolhaProxy;
}
function carregarImplementacao(){
    if(implementacaoPronta())return Promise.resolve(true);
    if(carregamento)return carregamento;
    carregamento=new Promise((resolve,reject)=>{
        const script=document.createElement('script');
        script.src=IMPLEMENTACAO;
        script.async=false;
        script.dataset.kinesysLazy='prontuario-export';
        const limpar=()=>{
            script.removeEventListener('load',aoCarregar);
            script.removeEventListener('error',aoErro);
        };
        const aoCarregar=()=>{
            limpar();
            if(!implementacaoPronta()){
                script.remove();
                reject(new Error('O módulo de exportação foi baixado, mas não publicou os contratos esperados.'));
                return;
            }
            resolve(true);
        };
        const aoErro=()=>{
            limpar();
            script.remove();
            reject(new Error('Falha ao baixar prontuario_export_impl.js.'));
        };
        script.addEventListener('load',aoCarregar,{once:true});
        script.addEventListener('error',aoErro,{once:true});
        document.body.appendChild(script);
    }).catch(error=>{
        carregamento=null;
        throw error;
    });
    return carregamento;
}

async function abrirEscolhaProxy(pacienteId){
    try{
        await carregarImplementacao();
        return window.abrirEscolhaProntuarioPDF(pacienteId);
    }catch(error){informarFalha(error);return false;}
}
async function gerarProxy(pacienteId,modo='simplificado'){
    const id=String(pacienteId||'').trim();
    if(!id){alert('⚠️ Selecione um paciente antes de gerar o prontuário.');return false;}
    if(modo==='detalhado'&&!podeDetalhado()){
        alert('🔒 O prontuário detalhado com trilha de alterações é restrito a administradores e fisioterapeutas.');
        return false;
    }
    const janela=abrirJanelaCarregando();
    if(!janela)return false;
    try{
        await carregarImplementacao();
        return window.gerarProntuarioCompletoPDF(id,modo,janela);
    }catch(error){informarFalha(error,janela);return false;}
}

window.podeExportarProntuarioDetalhado=podeDetalhado;
window.abrirEscolhaProntuarioPDF=abrirEscolhaProxy;
window.gerarProntuarioCompletoPDF=gerarProxy;
window.KineSysProntuarioExportLoader=Object.freeze({
    version:VERSION,
    load:carregarImplementacao,
    isLoaded:implementacaoPronta
});
})();
'''

replacements={
    "            window.abrirEscolhaProntuarioPDF(pacienteId);\n            return;":"            return window.abrirEscolhaProntuarioPDF(pacienteId);",
    "            window.gerarProntuarioCompletoPDF(pacienteId,'simplificado');\n            return;":"            return window.gerarProntuarioCompletoPDF(pacienteId,'simplificado');",
    "            window.gerarProntuarioCompletoPDF(pacienteId,'detalhado');\n            return;":"            return window.gerarProntuarioCompletoPDF(pacienteId,'detalhado');",
}
for old,new in replacements.items():
    if design.count(old)!=1:
        raise SystemExit(f'Âncora do design_system não encontrada exatamente uma vez: {old[:60]}')
    design=design.replace(old,new)

html_replacements={
    '<script defer src="prontuario_export.js"></script>':'<script defer src="prontuario_export.js?v=20260910-phase4e-r1"></script>',
    '<script defer src="design_system-1.20.1.js?v=20260901-r1"></script>':'<script defer src="design_system-1.20.1.js?v=20260910-phase4e-r1"></script>',
}
for old,new in html_replacements.items():
    if html.count(old)!=1:
        raise SystemExit(f'Âncora HTML não encontrada exatamente uma vez: {old}')
    html=html.replace(old,new)

contract=r''' 'use strict';

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
    assert.ok(deferred-eager>18000,`Phase 4E deve retirar mais de 18 KB brutos do bootstrap; ganho atual ${deferred-eager}`);
    console.log(`Prontuario export lazy contract Phase 4E: fachada eager ${eager} bytes; implementação lazy ${deferred} bytes; redução bruta aproximada ${deferred-eager} bytes.`);
})().catch(error=>{console.error(error);process.exitCode=1;});
'''.lstrip()

quality_step="""
      - name: Prontuario export lazy contract
        shell: bash
        run: node tests/prontuario_export_lazy.contract.js
"""
if 'Prontuario export lazy contract' in quality:
    raise SystemExit('Quality Gate já contém contrato de exportação lazy')
anchor='\n# validation touch: quieter visual pass 4'
if quality.count(anchor)!=1:
    raise SystemExit('Âncora final do Quality Gate não encontrada exatamente uma vez')
quality=quality.replace(anchor,quality_step+anchor)

INDEX.write_text(html,encoding='utf-8')
FACADE.write_text(facade,encoding='utf-8')
IMPL.write_text(impl,encoding='utf-8')
DESIGN.write_text(design,encoding='utf-8')
TEST.write_text(contract,encoding='utf-8')
QUALITY.write_text(quality,encoding='utf-8')
print('Phase 4E prepared: prontuario export implementation deferred behind stable public facade.')
