from pathlib import Path

INDEX=Path('index.html')
LOADER=Path('screen_loader-1.25.0.js')
TEST=Path('tests/screen_loader.contract.js')

index=INDEX.read_text(encoding='utf-8')
loader=LOADER.read_text(encoding='utf-8')
test=TEST.read_text(encoding='utf-8')

# Phase 4C: clinical static databases are needed only when the Evaluation bundle is used.
# Keep ocupacoes_esportes eager for now because script-1.18.0.js explicitly validates it at bootstrap.
remove_lines=[
    '    <script defer src="cirurgias-1.18.0.js?v=20260902-r1"></script>\n',
    '    <script defer src="database/medicamentos.js"></script>\n',
    '    <script defer src="database/irradiacao_clinica.js"></script>\n',
    '    <script defer src="database/mapeamento_clinico.js"></script>\n',
    '    <script defer src="database/condicoes_mobilidade_v23.js"></script>\n',
    '    <script defer src="database/diferenciais_neurais.js"></script>\n',
]
for line in remove_lines:
    if index.count(line)!=1:
        raise SystemExit(f'Expected exactly one eager asset line: {line.strip()}')
    index=index.replace(line,'')

old_version="const VERSION='1.25.2-phase4b';"
new_version="const VERSION='1.25.3-phase4c';"
if loader.count(old_version)!=1:
    raise SystemExit('Screen Loader Phase 4B version marker not found exactly once')
loader=loader.replace(old_version,new_version)

anchor="""            scripts:Object.freeze([\n                'clinical_engine-1.17.0.js',"""
replacement="""            scripts:Object.freeze([\n                'cirurgias-1.18.0.js?v=20260902-r1',\n                'database/medicamentos.js',\n                'database/irradiacao_clinica.js',\n                'database/mapeamento_clinico.js',\n                'database/condicoes_mobilidade_v23.js',\n                'database/diferenciais_neurais.js',\n                'clinical_engine-1.17.0.js',"""
if loader.count(anchor)!=1:
    raise SystemExit('Evaluation script bundle anchor not found exactly once')
loader=loader.replace(anchor,replacement)

phase4c_block=r'''
const evaluationDatabaseLazyScripts=[
  'cirurgias-1.18.0.js',
  'database/medicamentos.js',
  'database/irradiacao_clinica.js',
  'database/mapeamento_clinico.js',
  'database/condicoes_mobilidade_v23.js',
  'database/diferenciais_neurais.js'
];
for(const file of evaluationDatabaseLazyScripts)assertLazyAsset(file,'script');

let evaluationDbPos=-1;
for(const file of evaluationDatabaseLazyScripts){
  const pos=loader.indexOf(file);
  assert.ok(pos>evaluationDbPos,`${file} deve preservar a ordem clínica histórica no bundle da Avaliação`);
  evaluationDbPos=pos;
}
assert.ok(loader.indexOf('database/mapeamento_clinico.js')<loader.indexOf('database/condicoes_mobilidade_v23.js'),'mapeamento clínico deve carregar antes da extensão de mobilidade');
assert.ok(loader.indexOf('database/mapeamento_clinico.js')<loader.indexOf('database/diferenciais_neurais.js'),'mapeamento clínico deve carregar antes dos diferenciais neurais');
assert.match(html,/<script[^>]+src=["'][^"']*database\/ocupacoes_esportes\.js[^"']*["']/i,'ocupações/esportes permanece eager nesta fase porque o núcleo principal ainda o valida no bootstrap');
assert.doesNotMatch(loader,/scripts:Object\.freeze\(\[[\s\S]*?database\/ocupacoes_esportes\.js[\s\S]*?clinical_engine-1\.17\.0\.js/,'ocupações/esportes não deve ser carregado duas vezes no bundle da Avaliação');

// Smoke test real das bases: scripts clássicos separados compartilham o mesmo lexical environment.
const clinicalDbContext={console};
vm.createContext(clinicalDbContext);
for(const file of evaluationDatabaseLazyScripts){
  vm.runInContext(fs.readFileSync(file,'utf8'),clinicalDbContext,{filename:file,timeout:1500});
}
assert.strictEqual(vm.runInContext('typeof dicionarioCirurgias',clinicalDbContext),'object','dicionário de cirurgias deve existir após carga tardia');
assert.strictEqual(vm.runInContext('typeof dicionarioMedicamentos',clinicalDbContext),'object','dicionário de medicamentos deve existir após carga tardia');
assert.strictEqual(vm.runInContext('typeof BANCO_IRRADIACAO_CLINICA',clinicalDbContext),'object','banco de irradiação deve existir após carga tardia');
assert.strictEqual(vm.runInContext('typeof BANCO_MAPEAMENTO_CLINICO',clinicalDbContext),'object','banco de mapeamento deve existir após carga tardia');
const evaluationDatabaseDeferredBytes=evaluationDatabaseLazyScripts.reduce((total,file)=>total+fs.statSync(file).size,0);
assert.ok(evaluationDatabaseDeferredBytes>=275000,`Fase 4C deve adiar pelo menos 275 KB brutos; atual ${evaluationDatabaseDeferredBytes} bytes`);
'''
insert_after="""for(const file of agendaLazyScripts)assertLazyAsset(file,'script');\nfor(const file of agendaLazyStyles)assertLazyAsset(file,'style');\n"""
if test.count(insert_after)!=1:
    raise SystemExit('Screen-loader contract insertion anchor not found exactly once')
test=test.replace(insert_after,insert_after+phase4c_block+'\n')

old_assert="assert.match(loader,/VERSION='1\\.25\\.2-phase4b'/,'Screen Loader deve identificar a Fase 4B');"
new_assert="assert.match(loader,/VERSION='1\\.25\\.3-phase4c'/,'Screen Loader deve identificar a Fase 4C');"
if test.count(old_assert)!=1:
    raise SystemExit('Phase 4B version assertion not found exactly once')
test=test.replace(old_assert,new_assert)

old_log="console.log(`Screen Loader contract Phase 4B: Financeiro mantém ${deferredRawBytes} bytes brutos adiados da 4A; Agenda completa agora é lazy (${agendaLazyBytes} bytes), preservando núcleo global de notificações eager (${coreBytes} bytes).`);"
new_log="console.log(`Screen Loader contract Phase 4C: bases clínicas estáticas da Avaliação adiam ${evaluationDatabaseDeferredBytes} bytes brutos adicionais; Agenda continua lazy (${agendaLazyBytes} bytes) e núcleo de notificações eager (${coreBytes} bytes).`);"
if test.count(old_log)!=1:
    raise SystemExit('Phase 4B contract summary not found exactly once')
test=test.replace(old_log,new_log)

INDEX.write_text(index,encoding='utf-8')
LOADER.write_text(loader,encoding='utf-8')
TEST.write_text(test,encoding='utf-8')
print('Phase 4C prepared: six static clinical databases moved to tela_avaliacao bundle.')
