/* ============================================================================
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
