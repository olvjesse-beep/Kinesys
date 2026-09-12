'use strict';

/* Phase 4S — helpers de apresentação/formatação de documentos.
 * Sem persistência, Supabase, autorização ou regra clínica.
 */

function montarDocumentoComTimbrado(htmlConteudo) {
    const documento = document.getElementById('documento_impressao');
    documento.innerHTML = `
        <div class="timbrado-fundo"></div>
        <div class="timbrado-conteudo">${htmlConteudo}</div>
    `;

    const container = document.getElementById('preview_relatorio_container');
    container.style.display = 'block';
    container.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function endpointGemini(modelo) {
    return `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(modelo)}:generateContent`;
}

function minutosEntreHoras(inicio,fim){if(!inicio||!fim)return null;const [hi,mi]=inicio.split(':').map(Number),[hf,mf]=fim.split(':').map(Number);const n=(hf*60+mf)-(hi*60+mi);return n>0?n:null;}

function atualizarDuracaoComparecimento(){const i=document.getElementById('rel_comp_entrada')?.value,f=document.getElementById('rel_comp_saida')?.value,el=document.getElementById('rel_comp_duracao');if(!el)return;const m=minutosEntreHoras(i,f);el.value=m==null?'':`${Math.floor(m/60)}h ${String(m%60).padStart(2,'0')}min`;}

document.addEventListener('change',e=>{if(['rel_comp_entrada','rel_comp_saida'].includes(e.target?.id))atualizarDuracaoComparecimento();});

function formatarDataBR(v){if(!v)return'';if(/^\d{4}-\d{2}-\d{2}$/.test(v)){const [a,m,d]=v.split('-');return `${d}/${m}/${a}`;}return v;}
