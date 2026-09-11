from pathlib import Path

core_path=Path('script-1.18.0.js')
index_path=Path('index.html')
core=core_path.read_text(encoding='utf-8')
index=index_path.read_text(encoding='utf-8')

start='async function renderizarTabelaProntuarios(filtro = "") {'
end='async function carregarPacienteParaEdicao(id, avaliacaoIdEditar = null) {'
assert core.count(start)==1,'records browse start must be unique'
assert core.count(end)==1,'clinical edit boundary must be unique'
a=core.index(start)
b=core.index(end,a)
block=core[a:b]
for marker in [
    'async function renderizarTabelaProntuarios(filtro = "")',
    'function filtrarPacientesSalvos()',
    'async function renderizarPacientesRecentesHome()'
]:
    assert marker in block, f'missing browse marker: {marker}'
for forbidden in [
    'async function carregarPacienteParaEdicao',
    'async function excluirPaciente',
    '_supabase'
]:
    assert forbidden not in block, f'unsafe boundary includes: {forbidden}'
core=core[:a]+core[b:]

pre_tag='    <script defer src="patient_pre_registration_core-1.0.0.js?v=20260911-phase4k-r1"></script>\n'
browse_tag='    <script defer src="patient_records_browse_core-1.0.0.js?v=20260911-phase4l-r1"></script>\n'
assert index.count(pre_tag)==1,'pre-registration tag must be unique'
assert 'patient_records_browse_core-1.0.0.js' not in index,'records browse module already registered'
index=index.replace(pre_tag,pre_tag+browse_tag,1)

old='core_mod=20260911-phase4k-r1'
new='core_mod=20260911-phase4l-r1'
assert index.count(old)==1,'Phase 4K core cache-bust must be unique'
index=index.replace(old,new,1)

core_path.write_text(core,encoding='utf-8')
index_path.write_text(index,encoding='utf-8')
