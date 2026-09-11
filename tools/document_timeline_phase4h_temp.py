from pathlib import Path

p=Path('script-1.18.0.js')
s=p.read_text(encoding='utf-8')
start="let documentoAtualMeta=null;\n"
end="\n/* ================= 13. MAPEAMENTO ANATÔMICO (RADAR DE CLUSTERS ORTOPÉDICOS) ================="
a=s.find(start)
b=s.find(end,a)
if a<0 or b<0:
    raise SystemExit('bloco documental 4H não encontrado')
block=s[a:b]
required=['documentosTimelineNuvemCache','obterDocumentosTimelineLocal','carregarDocumentosTimelineNuvem','salvarDocumentoTimelineLocal','removerDocumentoTimelineLocal','registrarDocumentoAtual','async function imprimirDocumento()']
for item in required:
    if item not in block:
        raise SystemExit(f'bloco 4H incompleto: {item}')
s=s[:a]+s[b:]
p.write_text(s,encoding='utf-8')

p=Path('index.html')
h=p.read_text(encoding='utf-8')
anchor='    <script defer src="crm_relationship_core-1.0.0.js?v=20260911-phase4g-r1"></script>\n'
tag='    <script defer src="document_timeline_core-1.0.0.js?v=20260911-phase4h-r1"></script>\n'
if h.count(anchor)!=1:
    raise SystemExit('âncora CRM ambígua/ausente')
if tag not in h:
    h=h.replace(anchor,anchor+tag,1)
old='script-1.18.0.js?v=20260910-hma-perf-r3&patient_self_service=20260910-r1&access_admin=20260910-r1&data_cache=20260911-r1'
new=old+'&core_mod=20260911-phase4h-r1'
if old not in h:
    raise SystemExit('cache key do monólito não encontrada')
h=h.replace(old,new,1)
p.write_text(h,encoding='utf-8')
