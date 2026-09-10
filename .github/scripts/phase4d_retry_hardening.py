from pathlib import Path

loader_path = Path('screen_loader-1.25.0.js')
test_path = Path('tests/screen_loader.contract.js')
loader = loader_path.read_text(encoding='utf-8')
test = test_path.read_text(encoding='utf-8')

old = """        if(reservado){\n            const promessa=new Promise((resolve,reject)=>{\n                reservado.addEventListener('load',()=>resolve(reservado),{once:true});\n                reservado.addEventListener('error',()=>reject(new Error('Falha ao carregar estilo: '+src)),{once:true});\n                reservado.dataset.kinesysLazy='1';\n                reservado.href=src;\n            });\n            estilos.set(href,promessa);\n            promessa.catch(()=>estilos.delete(href));\n            return promessa;\n        }"""
new = """        if(reservado){\n            const promessa=new Promise((resolve,reject)=>{\n                const aoCarregar=()=>{\n                    reservado.removeEventListener('error',aoErro);\n                    resolve(reservado);\n                };\n                const aoErro=()=>{\n                    reservado.removeEventListener('load',aoCarregar);\n                    reservado.removeAttribute('href');\n                    reject(new Error('Falha ao carregar estilo: '+src));\n                };\n                reservado.addEventListener('load',aoCarregar,{once:true});\n                reservado.addEventListener('error',aoErro,{once:true});\n                reservado.dataset.kinesysLazy='1';\n                reservado.href=src;\n            });\n            estilos.set(href,promessa);\n            promessa.catch(()=>estilos.delete(href));\n            return promessa;\n        }"""
count = loader.count(old)
if count != 1:
    raise SystemExit(f'Expected one reserved stylesheet promise block, found {count}')
loader = loader.replace(old, new, 1)

anchor = "assert.match(loader,/reservado\\.href=src/,'Screen Loader deve ativar o href no placeholder em vez de anexar a folha ao fim do head');"
extra = "\nassert.match(loader,/reservado\\.removeAttribute\\('href'\\)/,'falha de rede deve liberar o placeholder para uma nova tentativa real');\nassert.match(loader,/removeEventListener\\('load',aoCarregar\\)/,'retry CSS não deve deixar listener de carga órfão após erro');"
count = test.count(anchor)
if count != 1:
    raise SystemExit(f'Expected one Phase 4D placeholder assertion anchor, found {count}')
test = test.replace(anchor, anchor + extra, 1)

loader_path.write_text(loader, encoding='utf-8')
test_path.write_text(test, encoding='utf-8')
print('Phase 4D stylesheet retry path hardened.')
