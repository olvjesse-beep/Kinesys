from pathlib import Path

core_path = Path('script-1.18.0.js')
index_path = Path('index.html')
core = core_path.read_text(encoding='utf-8')
index = index_path.read_text(encoding='utf-8')

start_local = 'function lerPacientesLocaisComSeguranca() {'
end_local = 'function instanteRegistroClinico(registro) {'
assert core.count(start_local) == 1, 'safe local patient reader start must be unique'
assert core.count(end_local) == 1, 'clinical timestamp helper boundary must be unique'
s = core.index(start_local)
e = core.index(end_local, s)
core = core[:s] + core[e:]

start_index = 'const KINESYS_CAMPOS_PACIENTE_BASICO = ['
end_index = 'async function obterPacienteCompletoPorId(id) {'
assert core.count(start_index) == 1, 'patient index block start must be unique'
assert core.count(end_index) == 1, 'selected full chart boundary must be unique'
s = core.index(start_index)
e = core.index(end_index, s)
core = core[:s] + core[e:]

cache_tag = '    <script defer src="kinesys_data_cache-1.0.0.js?v=20260911-cache-r1"></script>\n'
patient_tag = '    <script defer src="patient_index_cache_core-1.0.0.js?v=20260911-phase4i-r1"></script>\n'
assert index.count(cache_tag) == 1, 'central cache script tag must be unique'
assert 'patient_index_cache_core-1.0.0.js' not in index, 'patient cache module already registered'
index = index.replace(cache_tag, cache_tag + patient_tag, 1)

old_bust = 'core_mod=20260911-phase4h-r1'
new_bust = 'core_mod=20260911-phase4i-r1'
assert index.count(old_bust) == 1, 'Phase 4H core cache-bust must be unique'
index = index.replace(old_bust, new_bust, 1)

core_path.write_text(core, encoding='utf-8')
index_path.write_text(index, encoding='utf-8')
