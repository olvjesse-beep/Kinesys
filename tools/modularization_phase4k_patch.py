from pathlib import Path

core_path=Path('script-1.18.0.js')
index_path=Path('index.html')
core=core_path.read_text(encoding='utf-8')
index=index_path.read_text(encoding='utf-8')

start='let exibindoTodosPreCadastros = true;'
end='/* =========================================================================='
assert core.count(start)==1,'pre-registration state start must be unique'
a=core.index(start)
b=core.index(end,a)
block=core[a:b]
for marker in [
    'async function alternarFiltroPreCadastro()',
    'function fecharBuscaPacientesPreCadastro()',
    'function sincronizarBuscaPacientePreCadastro()',
    'function selecionarPacienteBuscaPreCadastro(pacienteId)',
    'function filtrarPacientesPreCadastro()',
    'function navegarBuscaPacientesPreCadastro(event)',
    'async function atualizarSelectPacientesPreCadastro()',
    'async function carregarPacientePreCadastradoNaAvaliacao()'
]:
    assert marker in block, f'missing target marker: {marker}'
assert 'function removerAcentos(str)' not in block,'shared clinical text helper must stay in core'
assert 'function obterTextoExibicao(item)' not in block,'shared display helper must stay in core'
assert 'function calcularIdadeCadastro()' not in block,'age calculator is outside Phase 4K'
core=core[:a]+core[b:]

input_tag='    <script defer src="input_helpers_core-1.0.0.js?v=20260911-phase4f-r1"></script>\n'
pre_tag='    <script defer src="patient_pre_registration_core-1.0.0.js?v=20260911-phase4k-r1"></script>\n'
assert index.count(input_tag)==1,'input helpers tag must be unique'
assert 'patient_pre_registration_core-1.0.0.js' not in index,'pre-registration module already registered'
index=index.replace(input_tag,input_tag+pre_tag,1)

old='core_mod=20260911-phase4j-r1'
new='core_mod=20260911-phase4k-r1'
assert index.count(old)==1,'Phase 4J core cache-bust must be unique'
index=index.replace(old,new,1)

core_path.write_text(core,encoding='utf-8')
index_path.write_text(index,encoding='utf-8')
