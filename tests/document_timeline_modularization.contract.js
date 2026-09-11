'use strict';
const fs=require('fs'); const assert=require('assert');
const core=fs.readFileSync('script-1.18.0.js','utf8');
const mod=fs.readFileSync('document_timeline_core-1.0.0.js','utf8');
const html=fs.readFileSync('index.html','utf8');

for(const symbol of ['let documentoAtualMeta=null;','const documentosTimelineNuvemCache = new Map();']) {
  assert(mod.includes(symbol),`módulo perdeu estado: ${symbol}`);
  assert(!core.includes(symbol),`estado documental permaneceu no monólito: ${symbol}`);
}
for(const fn of ['obterDocumentosTimelineLocal','carregarDocumentosTimelineNuvem','salvarDocumentoTimelineLocal','removerDocumentoTimelineLocal','registrarDocumentoAtual','imprimirDocumento']) {
  assert(mod.includes(`function ${fn}(`)||mod.includes(`async function ${fn}(`),`módulo perdeu ${fn}`);
  assert(!core.includes(`function ${fn}(`)&&!core.includes(`async function ${fn}(`),`declaração ${fn} permaneceu no monólito`);
}
assert(mod.includes("_supabase.from('documentos_timeline')"),'módulo perdeu persistência Supabase documental');
assert(mod.includes("localStorage.getItem('kinesys_documentos_timeline')"),'módulo perdeu fallback local documental');
assert(mod.includes('await registrarDocumentoAtual();')&&mod.includes('window.print();'),'impressão deve registrar timeline antes de imprimir');

const tag='<script defer src="document_timeline_core-1.0.0.js?v=20260911-phase4h-r1"></script>';
const crm='<script defer src="crm_relationship_core-1.0.0.js?v=20260911-phase4g-r1"></script>';
const main='<script defer src="script-1.18.0.js';
assert(html.includes(tag),'index não carrega document timeline core');
assert(html.indexOf(crm)<html.indexOf(tag),'document timeline deve carregar após CRM core');
assert(html.indexOf(tag)<html.indexOf(main),'document timeline deve carregar antes do core consumidor');
assert(html.includes('core_mod=20260911-phase4i-r1'),'cache-bust do monólito deve acompanhar a modularização corrente sem reutilizar o core da 4H');
assert(html.includes('onclick="imprimirDocumento()"'),'HTML perdeu consumidor histórico imprimirDocumento');
console.log('Document timeline modularization contract Phase 4H: OK');
