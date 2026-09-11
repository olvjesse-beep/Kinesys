from pathlib import Path

core_path=Path('script-1.18.0.js')
index_path=Path('index.html')
core=core_path.read_text(encoding='utf-8')
index=index_path.read_text(encoding='utf-8')

start='function instanteRegistroClinico(registro) {'
end='async function salvarPacienteNaNuvem(pacienteObjeto, opcoes = {})'
assert core.count(start)==1,'patient chart read start must be unique'
assert core.count(end)==1,'patient mutation boundary must be unique'
a=core.index(start)
b=core.index(end,a)
core=core[:a]+core[b:]

core_tag_prefix='    <script defer src="script-1.18.0.js?v=20260910-hma-perf-r3&patient_self_service=20260910-r1&access_admin=20260910-r1&data_cache=20260911-r1&core_mod=20260911-phase4i-r1"></script>\n'
chart_tag='    <script defer src="patient_chart_read_core-1.0.0.js?v=20260911-phase4j-r1"></script>\n'
assert index.count(core_tag_prefix)==1,'Phase 4I core tag must be unique'
assert 'patient_chart_read_core-1.0.0.js' not in index,'chart read module already registered'
new_core_tag=core_tag_prefix.replace('core_mod=20260911-phase4i-r1','core_mod=20260911-phase4j-r1')
index=index.replace(core_tag_prefix,new_core_tag+chart_tag,1)

core_path.write_text(core,encoding='utf-8')
index_path.write_text(index,encoding='utf-8')
