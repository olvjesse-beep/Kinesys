from pathlib import Path

def replace_once(text, old, new, label):
    count=text.count(old)
    if count!=1:
        raise SystemExit(f'{label}: esperado 1 bloco, encontrado {count}')
    return text.replace(old,new,1)

core_path=Path('script-1.18.0.js')
core=core_path.read_text(encoding='utf-8')
old='''/* ==========================================================================
   FUNÇÃO DE SEGURANÇA: ESCAPE DE HTML (PROTEÇÃO CONTRA XSS)
   ========================================================================== */
function escapeHTML(valor) {
    if (valor === null || valor === undefined) return "";
    return String(valor)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/\"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

'''
core=replace_once(core,old,'','escapeHTML no core')
core_path.write_text(core,encoding='utf-8')

index_path=Path('index.html')
html=index_path.read_text(encoding='utf-8')
old_order='''    <script defer src="operation_guard-1.0.0.js?v=20260911-phase4b-r1"></script>
    <script defer src="script-1.18.0.js?v=20260910-hma-perf-r3&patient_self_service=20260910-r1&access_admin=20260910-r1&data_cache=20260911-r1"></script>'''
new_order='''    <script defer src="operation_guard-1.0.0.js?v=20260911-phase4b-r1"></script>
    <script defer src="html_escape-1.0.0.js?v=20260911-phase4c-r1"></script>
    <script defer src="script-1.18.0.js?v=20260910-hma-perf-r3&patient_self_service=20260910-r1&access_admin=20260910-r1&data_cache=20260911-r1"></script>'''
html=replace_once(html,old_order,new_order,'ordem eager no index')
index_path.write_text(html,encoding='utf-8')
