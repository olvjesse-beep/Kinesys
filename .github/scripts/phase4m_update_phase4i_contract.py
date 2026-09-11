from pathlib import Path

p=Path('tests/patient_index_cache_modularization.contract.js')
text=p.read_text(encoding='utf-8')

old="const patient=fs.readFileSync('patient_index_cache_core-1.0.0.js','utf8');\nconst chart=fs.readFileSync('patient_chart_read_core-1.0.0.js','utf8');"
new="const patient=fs.readFileSync('patient_index_cache_core-1.0.0.js','utf8');\nconst chart=fs.readFileSync('patient_chart_read_core-1.0.0.js','utf8');\nconst deletion=fs.readFileSync('patient_deletion_core-1.0.0.js','utf8');"
if text.count(old)!=1:
    raise SystemExit(f'import anchor expected once, found {text.count(old)}')
text=text.replace(old,new,1)

old2="""const deleteStart=core.indexOf('async function excluirPaciente(id)');
assert.ok(deleteStart>=0,'patient deletion must remain in core');
assert.match(core.slice(deleteStart,deleteStart+700),/invalidarCachePacientesBasicos\\(\\)/,'patient deletion must still invalidate the lightweight cache');
"""
new2="""assert.doesNotMatch(core,/async function excluirPaciente\\(id\\)/,'patient deletion must leave the monolithic core after Phase 4M');
const deleteStart=deletion.indexOf('async function excluirPaciente(id)');
assert.ok(deleteStart>=0,'patient deletion must remain available in the dedicated Phase 4M module');
assert.match(deletion.slice(deleteStart,deleteStart+900),/invalidarCachePacientesBasicos\\(\\)/,'patient deletion must still invalidate the lightweight cache');
"""
if text.count(old2)!=1:
    raise SystemExit(f'deletion assertion anchor expected once, found {text.count(old2)}')
text=text.replace(old2,new2,1)
text=text.replace("after Phase 4J.')","after Phase 4M.')")
p.write_text(text,encoding='utf-8')
print('Phase 4I contract adapted for Phase 4M')
