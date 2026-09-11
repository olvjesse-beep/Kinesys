/* KineSys — Document Timeline Core 1.0.0
 * Timeline documental e registro de impressão extraídos de script-1.18.0.js
 * preservando APIs, storage local e persistência Supabase existentes.
 */
'use strict';

let documentoAtualMeta=null;
const documentosTimelineNuvemCache = new Map();

function obterDocumentosTimelineLocal(pacienteId){try{const base=JSON.parse(localStorage.getItem('kinesys_documentos_timeline')||'{}');return Array.isArray(base[pacienteId])?base[pacienteId]:[];}catch{return[];}}

async function carregarDocumentosTimelineNuvem(pacienteId){
    const id=String(pacienteId||'');if(!id||!_supabase)return[];
    try{
        const {data,error}=await _supabase.from('documentos_timeline').select('id,paciente_id,tipo,titulo,data_hora,emitido_por,detalhes,criado_em').eq('paciente_id',id).order('data_hora',{ascending:false});
        if(error)throw error;
        const docs=(data||[]).map(d=>({id:d.id,pacienteId:d.paciente_id,tipo:d.tipo,titulo:d.titulo,dataHoraISO:d.data_hora,emitidoPor:d.emitido_por,detalhes:d.detalhes||{},criadoEm:d.criado_em}));
        documentosTimelineNuvemCache.set(id,docs);return docs;
    }catch(err){
        if(!/documentos_timeline|relation|schema cache|does not exist/i.test(String(err?.message||err)))console.warn('KineSys: não foi possível carregar eventos documentais da nuvem.',err);
        documentosTimelineNuvemCache.set(id,[]);return[];
    }
}

function salvarDocumentoTimelineLocal(pacienteId,doc){try{const base=JSON.parse(localStorage.getItem('kinesys_documentos_timeline')||'{}');if(!Array.isArray(base[pacienteId]))base[pacienteId]=[];base[pacienteId].push(doc);localStorage.setItem('kinesys_documentos_timeline',JSON.stringify(base));}catch(e){console.warn('Falha ao gravar evento documental local:',e);}}

function removerDocumentoTimelineLocal(pacienteId,docId){try{const base=JSON.parse(localStorage.getItem('kinesys_documentos_timeline')||'{}');if(!Array.isArray(base[pacienteId]))return;const restante=base[pacienteId].filter(doc=>String(doc?.id||'')!==String(docId||''));if(restante.length)base[pacienteId]=restante;else delete base[pacienteId];localStorage.setItem('kinesys_documentos_timeline',JSON.stringify(base));}catch(e){console.warn('Falha ao remover evento documental local após confirmação da nuvem:',e);}}

async function registrarDocumentoAtual(){
    if(!documentoAtualMeta?.pacienteId)return;
    const doc={id:`doc_${Date.now()}_${Math.random().toString(36).slice(2,6)}`,tipo:documentoAtualMeta.tipo,titulo:documentoAtualMeta.titulo,dataHoraISO:new Date().toISOString(),emitidoPor:usuarioLogado?.nome||'N/I',detalhes:documentoAtualMeta.detalhes||{}};
    let salvoNaNuvem=false;
    if(_supabase){
        try{
            const {error}=await _supabase.from('documentos_timeline').upsert([{id:doc.id,paciente_id:String(documentoAtualMeta.pacienteId),tipo:doc.tipo||'outro',titulo:doc.titulo||'Documento',data_hora:doc.dataHoraISO,emitido_por:doc.emitidoPor||'',detalhes:doc.detalhes||{},criado_em:doc.dataHoraISO}],{onConflict:'id'});
            salvoNaNuvem=!error;
        }catch(_){salvoNaNuvem=false;}
    }
    if(salvoNaNuvem){
        documentosTimelineNuvemCache.set(String(documentoAtualMeta.pacienteId),[doc,...(documentosTimelineNuvemCache.get(String(documentoAtualMeta.pacienteId))||[])]);
        removerDocumentoTimelineLocal(documentoAtualMeta.pacienteId,doc.id);
    }else salvarDocumentoTimelineLocal(documentoAtualMeta.pacienteId,doc);
}

async function imprimirDocumento() {
    await registrarDocumentoAtual();
    window.print();
}
