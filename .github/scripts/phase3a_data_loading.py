from pathlib import Path


def replace_once(text, old, new, label):
    count = text.count(old)
    if count != 1:
        raise SystemExit(f'{label}: expected exactly one match, found {count}')
    return text.replace(old, new, 1)


path = Path('script-1.18.0.js')
text = path.read_text(encoding='utf-8')

anchor = """async function obterPacientesSalvos() {
    const locais = lerPacientesLocaisComSeguranca();
"""
helper = r'''const KINESYS_CAMPOS_PACIENTE_BASICO = [
    'id','nome','cpf','nascimento','telefone','profissao','sexo','estado_civil',
    'dependente','responsavel_nome','responsavel_parentesco','responsavel_telefone',
    'cep','endereco','data_cadastro','cadastrado_por','timestamp_cadastro'
].join(',');

const KINESYS_CAMPOS_PACIENTE_BASICO_LEGADO = [
    'id','nome','cpf','nascimento','telefone','profissao','sexo','estado_civil',
    'cep','endereco','data_cadastro','cadastrado_por','timestamp_cadastro'
].join(',');

let pacientesBasicosEmCurso = null;
const pacientesCompletosEmCurso = new Map();

function projetarPacienteBasico(paciente) {
    const normalizado = normalizarPacienteDoBanco(paciente || {});
    const { avaliacoes, evolucoes, documentos, ...basico } = normalizado;
    return basico;
}

function mesclarPacienteBasicoCloudLocal(pacienteCloud, pacienteLocal) {
    const cloud = projetarPacienteBasico(pacienteCloud || {});
    const local = projetarPacienteBasico(pacienteLocal || {});
    return {
        ...local,
        ...cloud,
        __dadosLocaisPendentes: !!pacienteLocal?.__dadosLocaisPendentes
    };
}

async function consultarPacientesBasicosNaNuvem() {
    let resposta = await _supabase.from('pacientes').select(KINESYS_CAMPOS_PACIENTE_BASICO);
    if (resposta.error && /dependente|responsavel_nome|responsavel_parentesco|responsavel_telefone|schema cache|column/i.test(String(resposta.error?.message || resposta.error || ''))) {
        resposta = await _supabase.from('pacientes').select(KINESYS_CAMPOS_PACIENTE_BASICO_LEGADO);
    }
    if (resposta.error) throw resposta.error;
    return Array.isArray(resposta.data) ? resposta.data : [];
}

async function obterPacientesBasicos() {
    if (pacientesBasicosEmCurso) return pacientesBasicosEmCurso;
    const carregar = async () => {
        const locais = lerPacientesLocaisComSeguranca();
        if (_supabase) {
            try {
                const dados = await consultarPacientesBasicosNaNuvem();
                const locaisPorId = new Map(locais.map(p => [String(p.id), p]));
                const resultado = dados.map(registro => {
                    const cloud = projetarPacienteBasico(registro);
                    const local = locaisPorId.get(String(cloud.id));
                    if (local) locaisPorId.delete(String(cloud.id));
                    return mesclarPacienteBasicoCloudLocal(cloud, local);
                });
                locaisPorId.forEach(local => resultado.push(projetarPacienteBasico({ ...local, __dadosLocaisPendentes: true })));
                return resultado;
            } catch (err) {
                console.warn('KineSys: índice leve de pacientes indisponível; usando cadastros locais preservados.', err);
            }
        }
        return locais.map(p => projetarPacienteBasico({ ...p, __dadosLocaisPendentes: true }));
    };
    pacientesBasicosEmCurso = Promise.resolve(carregar()).finally(() => { pacientesBasicosEmCurso = null; });
    return pacientesBasicosEmCurso;
}

async function obterPacienteCompletoPorId(id) {
    const chave = String(id || '').trim();
    if (!chave) return null;
    if (pacientesCompletosEmCurso.has(chave)) return pacientesCompletosEmCurso.get(chave);

    const carregar = async () => {
        const local = lerPacientesLocaisComSeguranca().find(p => String(p.id) === chave) || null;
        if (_supabase) {
            try {
                const { data, error } = await _supabase
                    .from('pacientes')
                    .select('*, avaliacoes(*), evolucoes(*)')
                    .eq('id', chave)
                    .maybeSingle();
                if (error) throw error;
                if (data) return mesclarPacienteCloudLocal(normalizarPacienteDoBanco(data), local);
            } catch (err) {
                console.warn(`KineSys: prontuário ${chave} não pôde ser carregado individualmente; tentando cópia local preservada.`, err);
            }
        }
        return local ? normalizarPacienteDoBanco({ ...local, __dadosLocaisPendentes: true }) : null;
    };

    const promessa = Promise.resolve(carregar()).finally(() => pacientesCompletosEmCurso.delete(chave));
    pacientesCompletosEmCurso.set(chave, promessa);
    return promessa;
}

async function obterPacientesSalvos() {
    const locais = lerPacientesLocaisComSeguranca();
'''
text = replace_once(text, anchor, helper, 'insert on-demand patient loaders')

# Safe index/list callers: they only need registration-level fields.
replacements = [
    (
        "const cpfDigitado = document.getElementById('cad_cpf').value.trim();\n    if (cpfDigitado && somenteDigitos(cpfDigitado).length > 0) {\n        const listaAtual = await obterPacientesSalvos();",
        "const cpfDigitado = document.getElementById('cad_cpf').value.trim();\n    if (cpfDigitado && somenteDigitos(cpfDigitado).length > 0) {\n        const listaAtual = await obterPacientesBasicos();",
        'CPF duplicate check uses lightweight index'
    ),
    (
        "async function editarCadastro(id) {\n    const lista = await obterPacientesSalvos();",
        "async function editarCadastro(id) {\n    const lista = await obterPacientesBasicos();",
        'registration edit uses lightweight index'
    ),
    (
        "async function renderizarPacientesRecentesHome() {\n    const container = document.getElementById('lista_pacientes_recentes');\n    if (!container) return;\n\n    const lista = await obterPacientesSalvos();",
        "async function renderizarPacientesRecentesHome() {\n    const container = document.getElementById('lista_pacientes_recentes');\n    if (!container) return;\n\n    const lista = await obterPacientesBasicos();",
        'Home recent patients uses lightweight index'
    ),
    (
        "async function excluirPaciente(id) {\n    if (!usuarioEhMaster()) {",
        "async function excluirPaciente(id) {\n    if (!usuarioEhMaster()) {",
        'delete function anchor'
    ),
    (
        "    const lista = await obterPacientesSalvos();\n    const paciente = lista.find(p => String(p.id) === String(id));\n    if (!paciente) { alert('⚠️ Paciente não encontrado. Atualize a lista e tente novamente.'); return false; }",
        "    const lista = await obterPacientesBasicos();\n    const paciente = lista.find(p => String(p.id) === String(id));\n    if (!paciente) { alert('⚠️ Paciente não encontrado. Atualize a lista e tente novamente.'); return false; }",
        'delete confirmation uses lightweight index'
    ),
    (
        "async function atualizarSelectsPacientes() {\n    const selectEvo = document.getElementById('evo_paciente_select');",
        "async function atualizarSelectsPacientes() {\n    const selectEvo = document.getElementById('evo_paciente_select');",
        'patient selects anchor'
    ),
    (
        "    const relSelecionado = String(selectRel?.value || '').trim() || (typeof obterPacienteIdRelatorioAtivo === 'function' ? String(obterPacienteIdRelatorioAtivo() || '').trim() : '');\n    const lista = await obterPacientesSalvos();",
        "    const relSelecionado = String(selectRel?.value || '').trim() || (typeof obterPacienteIdRelatorioAtivo === 'function' ? String(obterPacienteIdRelatorioAtivo() || '').trim() : '');\n    const lista = await obterPacientesBasicos();",
        'evolution/report selectors use lightweight index'
    ),
    (
        "async function popularSelectCRM() {\n    const select = document.getElementById('crm_paciente_select');\n    if (!select) return;\n    const lista = await obterPacientesSalvos();",
        "async function popularSelectCRM() {\n    const select = document.getElementById('crm_paciente_select');\n    if (!select) return;\n    const lista = await obterPacientesBasicos();",
        'CRM selector uses lightweight index'
    ),
    (
        "async function carregarPacienteCRM() {\n    const select = document.getElementById('crm_paciente_select');",
        "async function carregarPacienteCRM() {\n    const select = document.getElementById('crm_paciente_select');",
        'CRM patient anchor'
    ),
    (
        "    const lista = await obterPacientesSalvos();\n    const p = lista.find(item => item.id === id);\n    if (p) {\n        pacienteCRM = p;",
        "    const lista = await obterPacientesBasicos();\n    const p = lista.find(item => item.id === id);\n    if (p) {\n        pacienteCRM = p;",
        'CRM selected patient uses lightweight index'
    ),
    (
        "async function popularSelectMidiasPaciente(preSelecionado = '') {\n    const select = document.getElementById('midia_paciente_select');\n    if (!select) return;\n    const lista = await obterPacientesSalvos();",
        "async function popularSelectMidiasPaciente(preSelecionado = '') {\n    const select = document.getElementById('midia_paciente_select');\n    if (!select) return;\n    const lista = await obterPacientesBasicos();",
        'media selector uses lightweight index'
    ),
]
for old, new, label in replacements:
    text = replace_once(text, old, new, label)

# Registration save must preserve only the selected patient's current object, not every chart.
text = replace_once(
    text,
    """    let pacienteExistente = {};
    if (pacienteAtualId) {
        const lista = await obterPacientesSalvos();
        pacienteExistente = lista.find(p => p.id === pacienteAtualId) || {};
    }
""",
    """    let pacienteExistente = {};
    if (pacienteAtualId) {
        pacienteExistente = await obterPacienteCompletoPorId(pacienteAtualId) || {};
    }
""",
    'registration save loads only selected chart'
)

# Evaluation preselection keeps its full-list filter, but the definitive reload is per patient.
text = replace_once(
    text,
    """        const lista = await obterPacientesSalvos();
        const p = lista.find(item => String(item.id) === String(pacienteIdAlvo));
        if (p) {
""",
    """        const p = await obterPacienteCompletoPorId(pacienteIdAlvo);
        if (p) {
""",
    'Evaluation preselection loads selected chart only'
)

# Selected clinical chart callers.
text = replace_once(
    text,
    """async function editarAvaliacaoClinica(pacienteId, avaliacaoId) {
    const lista=await obterPacientesSalvos(), p=lista.find(x=>String(x.id)===String(pacienteId));
""",
    """async function editarAvaliacaoClinica(pacienteId, avaliacaoId) {
    const p=await obterPacienteCompletoPorId(pacienteId);
""",
    'edit evaluation loads selected chart only'
)
text = replace_once(
    text,
    """async function carregarPacienteParaEdicao(id, avaliacaoIdEditar = null) {
    const lista = await obterPacientesSalvos();
    const p = lista.find(item => item.id === id);
""",
    """async function carregarPacienteParaEdicao(id, avaliacaoIdEditar = null) {
    const p = await obterPacienteCompletoPorId(id);
""",
    'open evaluation loads selected chart only'
)
text = replace_once(
    text,
    """    const listaAtual=await obterPacientesSalvos();const pacienteAtual=listaAtual.find(x=>String(x.id)===String(pacienteId));
""",
    """    const pacienteAtual=await obterPacienteCompletoPorId(pacienteId);
""",
    'save evolution loads selected chart only'
)
text = replace_once(
    text,
    """    const lista=await obterPacientesSalvos(),p=lista.find(x=>String(x.id)===String(pacienteId)),e=(p?.evolucoes||[]).find(x=>String(x.id)===String(evolucaoId));
""",
    """    const p=await obterPacienteCompletoPorId(pacienteId),e=(p?.evolucoes||[]).find(x=>String(x.id)===String(evolucaoId));
""",
    'edit evolution loads selected chart only'
)
text = replace_once(
    text,
    """    const lista = await obterPacientesSalvos();
    const p = lista.find(item => String(item.id) === String(pacienteId));
    renderResumoPaciente('resumo_paciente_evolucao', p);
""",
    """    const p = await obterPacienteCompletoPorId(pacienteId);
    renderResumoPaciente('resumo_paciente_evolucao', p);
""",
    'evolution history loads selected chart only'
)

# Saving an evaluation: full selected chart, basic global list only for duplicate-name check.
text = replace_once(
    text,
    """    let lista=await obterPacientesSalvos();
    let pacienteExistente=pacienteAtualId?lista.find(p=>String(p.id)===String(pacienteAtualId)):null;
    if(!pacienteExistente&&!pacienteAtualId){const duplicados=lista.filter(p=>(p.nome||'').toLowerCase()===nome.toLowerCase());if(duplicados.length&&!(await confirmarKineSys(`Já existe(m) ${duplicados.length} paciente(s) chamado(s) \"${nome}\".\\
\\
Salvar como NOVO cadastro?`, {titulo:'Paciente com nome semelhante', confirmar:'Salvar como novo'})))return;}
""",
    """    let pacienteExistente=pacienteAtualId?await obterPacienteCompletoPorId(pacienteAtualId):null;
    if(!pacienteExistente&&!pacienteAtualId){const listaBasica=await obterPacientesBasicos();const duplicados=listaBasica.filter(p=>(p.nome||'').toLowerCase()===nome.toLowerCase());if(duplicados.length&&!(await confirmarKineSys(`Já existe(m) ${duplicados.length} paciente(s) chamado(s) \"${nome}\".\\
\\
Salvar como NOVO cadastro?`, {titulo:'Paciente com nome semelhante', confirmar:'Salvar como novo'})))return;}
""",
    'save evaluation separates selected chart from duplicate-name index'
)

# Report screens need one full patient, never all patient histories.
report_patterns = [
    (
        "const lista=await obterPacientesSalvos();const p=lista.find(x=>String(x.id)===String(pacienteId));renderResumoPaciente('resumo_paciente_relatorio',p);",
        "const p=await obterPacienteCompletoPorId(pacienteId);renderResumoPaciente('resumo_paciente_relatorio',p);",
        'report change selected chart'
    ),
    (
        "const lista=await obterPacientesSalvos(),p=lista.find(x=>x.id===id);if(!p){alert('Paciente não encontrado.');return;}",
        "const p=await obterPacienteCompletoPorId(id);if(!p){alert('Paciente não encontrado.');return;}",
        'attendance document selected chart'
    ),
    (
        "const lista = await obterPacientesSalvos();\n    const p = lista.find(x => x.id === pacienteId);",
        "const p = await obterPacienteCompletoPorId(pacienteId);",
        'AI report selected chart'
    ),
    (
        "const lista=await obterPacientesSalvos(),p=lista.find(x=>x.id===pacienteId);\n    const tipoDocumento",
        "const p=await obterPacienteCompletoPorId(pacienteId);\n    const tipoDocumento",
        'report print selected chart'
    )
]
for old, new, label in report_patterns:
    text = replace_once(text, old, new, label)

# Media actions only require registration identity/contact fields.
text = replace_once(
    text,
    """    const lista = await obterPacientesSalvos();
    const p = lista.find(x=>String(x.id)===String(pacienteId)); if (!p) { alert('Paciente não encontrado.'); return; }
    try {
        const r = await kinesysLocalFetch('/api/session', {
""",
    """    const lista = await obterPacientesBasicos();
    const p = lista.find(x=>String(x.id)===String(pacienteId)); if (!p) { alert('Paciente não encontrado.'); return; }
    try {
        const r = await kinesysLocalFetch('/api/session', {
""",
    'iPhone capture uses lightweight index'
)
text = replace_once(
    text,
    """    const lista=await obterPacientesSalvos();
    const p=lista.find(x=>String(x.id)===String(pacienteId));
    if(!p){input.value='';alert('Paciente não encontrado.');return;}
""",
    """    const lista=await obterPacientesBasicos();
    const p=lista.find(x=>String(x.id)===String(pacienteId));
    if(!p){input.value='';alert('Paciente não encontrado.');return;}
""",
    'computer document import uses lightweight index'
)

path.write_text(text, encoding='utf-8')

# Permanent static contract.
Path('tests/data_loading.contract.js').write_text(r'''\'use strict\';
const fs=require('fs');
const assert=require('assert');
const src=fs.readFileSync('script-1.18.0.js','utf8');

assert.match(src,/async function obterPacientesBasicos\(\)/,'lightweight patient index must exist');
assert.match(src,/async function obterPacienteCompletoPorId\(id\)/,'single-chart loader must exist');
assert.match(src,/KINESYS_CAMPOS_PACIENTE_BASICO/,'explicit lightweight field contract must exist');

const basicStart=src.indexOf('async function consultarPacientesBasicosNaNuvem()');
const basicEnd=src.indexOf('async function obterPacientesBasicos()',basicStart);
const basicBlock=src.slice(basicStart,basicEnd);
assert.doesNotMatch(basicBlock,/avaliacoes\(\*\)|evolucoes\(\*\)/,'lightweight index cannot embed clinical histories');

const oneStart=src.indexOf('async function obterPacienteCompletoPorId(id)');
const oneEnd=src.indexOf('async function obterPacientesSalvos()',oneStart);
const oneBlock=src.slice(oneStart,oneEnd);
assert.match(oneBlock,/\.eq\('id', chave\)/,'single-chart loader must filter by patient id');
assert.match(oneBlock,/\.maybeSingle\(\)/,'single-chart loader must request one patient');
assert.match(oneBlock,/avaliacoes\(\*\), evolucoes\(\*\)/,'single-chart loader must preserve full clinical history for the selected patient');

for(const marker of [
  "async function renderizarPacientesRecentesHome()",
  "async function atualizarSelectsPacientes()",
  "async function popularSelectCRM()",
  "async function popularSelectMidiasPaciente(preSelecionado = '')"
]){
  const pos=src.indexOf(marker);
  assert.ok(pos>=0,`${marker} must exist`);
  const chunk=src.slice(pos,pos+1800);
  assert.match(chunk,/obterPacientesBasicos\(\)/,`${marker} must use lightweight patient data`);
}

for(const marker of [
  "async function carregarPacienteParaEdicao(id, avaliacaoIdEditar = null)",
  "async function editarAvaliacaoClinica(pacienteId, avaliacaoId)",
  "async function carregarHistoricoEvolucao()"
]){
  const pos=src.indexOf(marker);
  assert.ok(pos>=0,`${marker} must exist`);
  const chunk=src.slice(pos,pos+2600);
  assert.match(chunk,/obterPacienteCompletoPorId\(/,`${marker} must load only the selected full chart`);
}

const oldAllHistory=(src.match(/\.from\('pacientes'\)\s*\n\s*\.select\('\*, avaliacoes\(\*\), evolucoes\(\*\)'\)/g)||[]).length;
assert.strictEqual(oldAllHistory,2,'full-history patient query must exist only in selected-chart loader and legacy compatibility loader');

console.log('Data Loading contract Phase 3A: lightweight index + selected full chart are separated.');
'''.replace("\\'use strict\\';","'use strict';"),encoding='utf-8')

print('Phase 3A data-loading rewrite prepared.')
