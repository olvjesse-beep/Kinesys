from pathlib import Path

INDEX = Path('index.html')
LOADER = Path('screen_loader-1.25.0.js')
TEST = Path('tests/screen_loader.contract.js')

html = INDEX.read_text(encoding='utf-8')
loader = LOADER.read_text(encoding='utf-8')
test = TEST.read_text(encoding='utf-8')

def replace_once(text, old, new, label):
    count = text.count(old)
    if count != 1:
        raise SystemExit(f'{label}: expected exactly one anchor, found {count}')
    return text.replace(old, new, 1)

html = replace_once(
    html,
    '<link rel="stylesheet" href="design_clinical.css?v=1.19.0-hma-layout-r14">',
    '<link rel="stylesheet" data-kinesys-lazy-href="design_clinical.css?v=1.19.0-hma-layout-r14">',
    'design_clinical placeholder'
)
html = replace_once(
    html,
    '<link rel="stylesheet" href="design_clinical_direction-1.17.0.css">',
    '<link rel="stylesheet" data-kinesys-lazy-href="design_clinical_direction-1.17.0.css">',
    'clinical direction placeholder'
)
html = replace_once(
    html,
    'screen_loader-1.25.0.js?v=20260910-phase4c-r1',
    'screen_loader-1.25.0.js?v=20260910-phase4d-r1',
    'Screen Loader cache key'
)

loader = replace_once(
    loader,
    "const VERSION='1.25.3-phase4c';",
    "const VERSION='1.25.4-phase4d';",
    'Screen Loader version'
)
loader = replace_once(
    loader,
    """            styles:Object.freeze([\n                'design_evaluation_workspace-1.18.0.css',""",
    """            styles:Object.freeze([\n                'design_clinical.css?v=1.19.0-hma-layout-r14',\n                'design_clinical_direction-1.17.0.css',\n                'design_evaluation_workspace-1.18.0.css',""",
    'Evaluation style bundle'
)
loader = replace_once(
    loader,
    """        const existente=Array.from(document.querySelectorAll('link[rel=\"stylesheet\"][href]')).find(link=>link.href===href);\n        if(existente){\n            const pronta=Promise.resolve(existente);\n            estilos.set(href,pronta);\n            return pronta;\n        }\n        const promessa=new Promise((resolve,reject)=>{""",
    """        const existente=Array.from(document.querySelectorAll('link[rel=\"stylesheet\"][href]')).find(link=>link.href===href);\n        if(existente){\n            const pronta=Promise.resolve(existente);\n            estilos.set(href,pronta);\n            return pronta;\n        }\n        const reservado=Array.from(document.querySelectorAll('link[rel=\"stylesheet\"][data-kinesys-lazy-href]')).find(link=>{\n            const reservadoSrc=link.dataset.kinesysLazyHref||'';\n            return reservadoSrc&&urlAbsoluta(reservadoSrc)===href;\n        });\n        if(reservado){\n            const promessa=new Promise((resolve,reject)=>{\n                reservado.addEventListener('load',()=>resolve(reservado),{once:true});\n                reservado.addEventListener('error',()=>reject(new Error('Falha ao carregar estilo: '+src)),{once:true});\n                reservado.dataset.kinesysLazy='1';\n                reservado.href=src;\n            });\n            estilos.set(href,promessa);\n            promessa.catch(()=>estilos.delete(href));\n            return promessa;\n        }\n        const promessa=new Promise((resolve,reject)=>{""",
    'reserved stylesheet loader'
)

test = replace_once(
    test,
    """const lazyStyles=[\n  'design_evaluation_workspace-1.18.0.css',""",
    """const lazyStyles=[\n  'design_clinical.css',\n  'design_clinical_direction-1.17.0.css',\n  'design_evaluation_workspace-1.18.0.css',""",
    'lazy style contract list'
)

contract_anchor = "const workspace=fs.readFileSync('evaluation_workspace-1.17.0.js','utf8');"
phase4d_contract = r'''const phase4dClinicalStyles=['design_clinical.css','design_clinical_direction-1.17.0.css'];
for(const file of phase4dClinicalStyles){
  const escaped=file.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
  assert.match(html,new RegExp(`<link[^>]+rel=["']stylesheet["'][^>]+data-kinesys-lazy-href=["'][^"']*${escaped}[^"']*["']`,'i'),`${file} deve manter placeholder na posição histórica do head`);
}
assert.ok(html.indexOf('data-kinesys-lazy-href="design_clinical.css')<html.indexOf('data-kinesys-lazy-href="design_clinical_direction-1.17.0.css'),'cascade clínico deve preservar design_clinical antes de clinical_direction');
assert.ok(loader.indexOf('design_clinical.css')<loader.indexOf('design_clinical_direction-1.17.0.css'),'bundle deve preservar a ordem clínica das duas folhas');
assert.match(loader,/data-kinesys-lazy-href/,'Screen Loader deve reconhecer placeholders CSS lazy');
assert.match(loader,/reservado\.href=src/,'Screen Loader deve ativar o href no placeholder em vez de anexar a folha ao fim do head');
const phase4dCssDeferredBytes=phase4dClinicalStyles.reduce((total,file)=>total+fs.statSync(file).size,0);
assert.ok(phase4dCssDeferredBytes>=100000,`Fase 4D deve adiar pelo menos 100 KB brutos de CSS clínico; atual ${phase4dCssDeferredBytes} bytes`);

'''
test = replace_once(test, contract_anchor, phase4d_contract + contract_anchor, 'Phase 4D contract insertion')

test = replace_once(
    test,
    "assert.match(loader,/VERSION='1\\.25\\.3-phase4c'/,'Screen Loader deve identificar a Fase 4C');",
    "assert.match(loader,/VERSION='1\\.25\\.4-phase4d'/,'Screen Loader deve identificar a Fase 4D');",
    'Phase 4D version assertion'
)
test = replace_once(
    test,
    "assert.match(html,/screen_loader-1\\.25\\.0\\.js\\?v=20260910-phase4c-r1/,'index deve invalidar o cache do Screen Loader na Fase 4C');",
    "assert.match(html,/screen_loader-1\\.25\\.0\\.js\\?v=20260910-phase4d-r1/,'index deve invalidar o cache do Screen Loader na Fase 4D');",
    'Phase 4D cache assertion'
)
test = replace_once(
    test,
    "console.log(`Screen Loader contract Phase 4C: bases clínicas estáticas da Avaliação adiam ${evaluationDatabaseDeferredBytes} bytes brutos adicionais; Agenda continua lazy (${agendaLazyBytes} bytes) e núcleo de notificações eager (${coreBytes} bytes).`);",
    "console.log(`Screen Loader contract Phase 4D: CSS clínico da Avaliação adia ${phase4dCssDeferredBytes} bytes brutos adicionais preservando cascade; bases clínicas lazy somam ${evaluationDatabaseDeferredBytes} bytes; Agenda continua lazy (${agendaLazyBytes} bytes).`);",
    'Phase 4D summary'
)

INDEX.write_text(html, encoding='utf-8')
LOADER.write_text(loader, encoding='utf-8')
TEST.write_text(test, encoding='utf-8')
print('Phase 4D prepared: evaluation clinical CSS deferred with cascade preserved.')
