from pathlib import Path


def replace_once(text, old, new, label):
    count = text.count(old)
    if count != 1:
        raise SystemExit(f'{label}: esperado 1 bloco, encontrado {count}')
    return text.replace(old, new, 1)

core_path = Path('script-1.18.0.js')
core = core_path.read_text(encoding='utf-8')
old_guard = '''/* ================= v1.10.4 — PROTEÇÃO GLOBAL CONTRA DUPLO CLIQUE ================= */
const KINESYS_OPERACOES_EM_CURSO = new Set();

async function executarAcaoProtegida(chave, botao, textoOcupado, acao) {
    const chaveFinal = String(chave || 'operacao');
    if (KINESYS_OPERACOES_EM_CURSO.has(chaveFinal)) return null;
    KINESYS_OPERACOES_EM_CURSO.add(chaveFinal);
    const btn = botao && botao.tagName === 'BUTTON' ? botao : (document.activeElement?.tagName === 'BUTTON' ? document.activeElement : null);
    const textoAnterior = btn ? btn.textContent : '';
    if (btn) {
        btn.disabled = true;
        btn.setAttribute('aria-busy', 'true');
        if (textoOcupado) btn.textContent = textoOcupado;
    }
    try {
        return await acao();
    } finally {
        KINESYS_OPERACOES_EM_CURSO.delete(chaveFinal);
        if (btn) {
            btn.disabled = false;
            btn.removeAttribute('aria-busy');
            if (textoOcupado) btn.textContent = textoAnterior;
        }
    }
}

function protegerFuncaoKineSys(nome, chave, seletorBotao = null, textoOcupado = 'Salvando…') {
    const original = window[nome];
    if (typeof original !== 'function' || original.__kinesysProtegida) return;
    const protegida = async function(...args) {
        const chaveFinal = typeof chave === 'function' ? chave(...args) : chave;
        const btn = seletorBotao ? document.querySelector(seletorBotao) : (document.activeElement?.tagName === 'BUTTON' ? document.activeElement : null);
        return executarAcaoProtegida(chaveFinal || nome, btn, textoOcupado, () => original.apply(this, args));
    };
    protegida.__kinesysProtegida = true;
    protegida.__original = original;
    window[nome] = protegida;
}

'''
core = replace_once(core, old_guard, '', 'operation guard no core')
core_path.write_text(core, encoding='utf-8')

index_path = Path('index.html')
html = index_path.read_text(encoding='utf-8')
old_order = '''    <script defer src="menu_dropdown-1.0.0.js?v=20260911-phase4a-r1"></script>
    <script defer src="script-1.18.0.js?v=20260910-hma-perf-r3&patient_self_service=20260910-r1&access_admin=20260910-r1&data_cache=20260911-r1"></script>'''
new_order = '''    <script defer src="menu_dropdown-1.0.0.js?v=20260911-phase4a-r1"></script>
    <script defer src="operation_guard-1.0.0.js?v=20260911-phase4b-r1"></script>
    <script defer src="script-1.18.0.js?v=20260910-hma-perf-r3&patient_self_service=20260910-r1&access_admin=20260910-r1&data_cache=20260911-r1"></script>'''
html = replace_once(html, old_order, new_order, 'ordem eager no index')
index_path.write_text(html, encoding='utf-8')
