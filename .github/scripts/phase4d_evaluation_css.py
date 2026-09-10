from pathlib import Path

INDEX = Path('index.html')
LOADER = Path('screen_loader-1.25.0.js')
TEST = Path('tests/screen_loader.contract.js')

html = INDEX.read_text(encoding='utf-8')
loader = LOADER.read_text(encoding='utf-8')
test = TEST.read_text(encoding='utf-8')

html_replacements = {
    '<link rel="stylesheet" href="design_clinical.css?v=1.19.0-hma-layout-r14">':
        '<link rel="stylesheet" data-kinesys-lazy-href="design_clinical.css?v=1.19.0-hma-layout-r14">',
    '<link rel="stylesheet" href="design_clinical_direction-1.17.0.css">':
        '<link rel="stylesheet" data-kinesys-lazy-href="design_clinical_direction-1.17.0.css">',
    'screen_loader-1.25.0.js?v=20260910-phase4c-r1':
        'screen_loader-1.25.0.js?v=20260910-phase4d-r1',
}
for old, new in html_replacements.items():
    count = html.count(old)
    if count != 1:
        raise SystemExit(f'Expected exactly one HTML anchor, found {count}: {old}')
    html = html.replace(old, new)

old_version = "const VERSION='1.25.3-phase4c';"
if loader.count(old_version) != 1:
    raise SystemExit('Phase 4C Screen Loader version marker not found exactly once')
loader = loader.replace(old_version, "const VERSION='1.25.4-phase4d';")

old_styles = """            styles:Object.freeze([\n                'design_evaluation_workspace-1.18.0.css',"""
new_styles = """            styles:Object.freeze([\n                'design_clinical.css?v=1.19.0-hma-layout-r14',\n                'design_clinical_direction-1.17.0.css',\n                'design_evaluation_workspace-1.18.0.css',"""
if loader.count(old_styles) != 1:
    raise SystemExit('Evaluation styles bundle anchor not found exactly once')
loader = loader.replace(old_styles, new_styles)

old_style_loader = """        const existente=Array.from(document.querySelectorAll('link[rel=\"stylesheet\"][href]')).find(link=>link.href===href);\n        if(existente){\n            const pronta=Promise.resolve(existente);\n            estilos.set(href,pronta);\n            return pronta;\n        }\n        const promessa=new Promise((resolve,reject)=>{"""
new_style_loader = """        const existente=Array.from(document.querySelectorAll('link[rel=\"stylesheet\"][href]')).find(link=>link.href===href);\n        if(existente){\n            const pronta=Promise.resolve(existente);\n            estilos.set(href,pronta);\n            return pronta;\n        }\n        const reservado=Array.from(document.querySelectorAll('link[rel=\"stylesheet\"][data-kinesys-lazy-href]')).find(link=>{\n            const reservadoSrc=link.dataset.kinesysLazyHref||'';\n            return reservadoSrc&&urlAbsoluta(reservadoSrc)===href;\n        });\n        if(reservado){\n            const promessa=new Promise((resolve,reject)=>{\n                reservado.addEventListener('load',()=>resolve(reservado),{once:true});\n                reservado.addEventListener('error',()=>reject(new Error('Falha ao carregar estilo: '+src)),{once:true});\n                reservado.dataset.kinesysLazy='1';\n                reservado.href=src;\n            });\n            estilos.set(href,promessa);\n            promessa.catch(()=>estilos.delete(href));\n            return promessa;\n        }\n        const promessa=new Promise((resolve,reject)=>{"""
if loader.count(old_style_loader) != 1:
    raise SystemExit('carregarEstilo insertion anchor not found exactly once')
loader = loader.replace(old_style_loader, new_style_loader)

old_lazy_styles = """const lazyStyles=[\n  'design_evaluation_workspace-1.18.0.css',"""
new_lazy_styles = """const lazyStyles=[\n  'design_clinical.css',\n  'design_clinical_direction-1.17.0.css',\n  'design_evaluation_workspace-1.18.0.css',"""
if test.count(old_lazy_styles) != 1:
    raise SystemExit('lazyStyles contract anchor not found exactly once')
test = test.replace(old_lazy_styles, new_lazy_styles)

lazy_loop = """for(const file of lazyStyles){\n  const escaped=file.replace(/[.*+?^${}()|[\\]\\\\]/g,'\\\\$&');\n  const eager=new RegExp(`<link[^>]+href=[\"'][^\"']*${escaped}[^\"']*[\"']`,'i');\n  assert.ok(!eager.test(html),`${file} não pode voltar ao CSS inicial`);\n  assert.ok(loader.includes(file),`${file} deve permanecer no bundle de estilos sob demanda`);\n  assert.ok(fs.existsSync(file),`${file} deve existir fisicamente no repositório`);\n}\n"""
phase4d_contract = r'''
const phase4dClinicalStyles=['design_clinical.css','design_clinical_direction-1.17.0.css'];
for(const file of phase4dClinicalStyles){
  const escaped=file.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
  assert.match(html,new RegExp(`<link[^>]+rel=["']stylesheet["'][^>]+data-kinesys-lazy-href=["'][^"']*${escaped}[^"']*["']`,'i'),`${file} deve manter placeholder na posição histórica do head`);
}
assert.ok(html.indexOf('data-kinesys-lazy-href="design_clinical.css')<html.indexOf('data-kinesys-lazy-href="design_clinical_direction-1.17.0.css'),'cascade clínico deve preservar design_clinical antes de clinical_direction');
assert.match(loader,/data-kinesys-lazy-href/,'Screen Loader deve reconhecer placeholders CSS lazy');
assert.match(loader,/reservado\.href=src/,'Screen Loader deve ativar o href no placeholder em vez de anexar a folha ao fim do head');
const phase4dCssDeferredBytes=phase4dClinicalStyles.reduce((total,file)=>total+fs.statSync(file).size,0);
assert.ok(phase4dCssDeferredBytes>=100000,`Fase 4D deve adiar pelo menos 100 KB brutos de CSS clínico; atual ${phase4dCssDeferredBytes} bytes`);
'''
if test.count(lazy_loop) != 1:
    raise SystemExit('lazyStyles validation loop not found exactly once')
test = test.replace(lazy_loop, lazy_loop + phase4d_contract + '\n')

old_test_version = "assert.match(loader,/VERSION='1\\.25\\.3-phase4c'/,'Screen Loader deve identificar a Fase 4C');"
new_test_version = "assert.match(loader,/VERSION='1\\.25\\.4-phase4d'/,'Screen Loader deve identificar a Fase 4D');"
if test.count(old_test_version) != 1:
    raise SystemExit('Phase 4C version assertion not found exactly once')
test = test.replace(old_test_version, new_test_version)

old_cache = "assert.match(html,/screen_loader-1\\.25\\.0\\.js\\?v=20260910-phase4c-r1/,'index deve invalidar o cache do Screen Loader na Fase 4C');"
new_cache = "assert.match(html,/screen_loader-1\\.25\\.0\\.js\\?v=20260910-phase4d-r1/,'index deve invalidar o cache do Screen Loader na Fase 4D');"
if test.count(old_cache) != 1:
    raise SystemExit('Phase 4C cache assertion not found exactly once')
test = test.replace(old_cache, new_cache)

old_log = "console.log(`Screen Loader contract Phase 4C: bases clínicas estáticas da Avaliação adiam ${evaluationDatabaseDeferredBytes} bytes brutos adicionais; Agenda continua lazy (${agendaLazyBytes} bytes) e núcleo de notificações eager (${coreBytes} bytes).`);"
new_log = "console.log(`Screen Loader contract Phase 4D: CSS clínico da Avaliação adia ${phase4dCssDeferredBytes} bytes brutos adicionais preservando cascade; bases clínicas lazy somam ${evaluationDatabaseDeferredBytes} bytes; Agenda continua lazy (${agendaLazyBytes} bytes).`);"
if test.count(old_log) != 1:
    raise SystemExit('Phase 4C contract summary not found exactly once')
test = test.replace(old_log, new_log)

INDEX.write_text(html, encoding='utf-8')
LOADER.write_text(loader, encoding='utf-8')
TEST.write_text(test, encoding='utf-8')
print('Phase 4D prepared: evaluation clinical CSS deferred with cascade placeholders.')
