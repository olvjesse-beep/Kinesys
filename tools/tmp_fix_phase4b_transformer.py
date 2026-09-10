from pathlib import Path

p = Path('tools/tmp_phase4b_agenda_lazy.py')
s = p.read_text(encoding='utf-8')

# Fix escaped JavaScript template literals used only for exact source matching.
s = s.replace('${{fmt(s.valorPendente)}}', '${fmt(s.valorPendente)}')
s = s.replace('${{cls}}', '${cls}')
s = s.replace('${{esc(titulo)}}', '${esc(titulo)}')

old = '''old_bundle = """    tela_agenda:Object.freeze({
      id:'agenda',
      styles:Object.freeze([
        'agenda_referencia-1.20.0.css?v=20260901-r1'
      ]),
      scripts:Object.freeze([])
    })
"""
new_bundle = """    tela_agenda:Object.freeze({
      id:'agenda',
      styles:Object.freeze([
        'agenda_referencia-1.20.0.css?v=20260901-r1'
      ]),
      scripts:Object.freeze([
        'agenda-1.20.0.js?v=20260910-phase4b-r1'
      ])
    })
"""
require_once(loader, old_bundle, 'bundle Agenda 4A')
loader = loader.replace(old_bundle, new_bundle)
load_line = '      await carregarScripts(bundle.scripts);\\n'
require_once(loader, load_line, 'carregar scripts bundle')
load_new = load_line + "      if(idTela==='tela_agenda'){\\n        try{window.instalarIntegracaoFinanceiroAgenda?.();}catch(error){console.error('KineSys Screen Loader: integração Agenda/Financeiro falhou.',error);}\\n        try{window.aplicarProtecoesAgendaKineSys?.();}catch(error){console.error('KineSys Screen Loader: proteções da Agenda falharam.',error);}\\n      }\\n"
loader = loader.replace(load_line, load_new)
loader_path.write_text(loader, encoding='utf-8')
'''
new = '''old_bundle = """        tela_agenda:Object.freeze({
            id:'agenda',
            styles:Object.freeze([
                'agenda_referencia-1.20.0.css?v=20260901-r1'
            ]),
            scripts:Object.freeze([])
        })
"""
new_bundle = """        tela_agenda:Object.freeze({
            id:'agenda',
            styles:Object.freeze([
                'agenda_referencia-1.20.0.css?v=20260901-r1'
            ]),
            scripts:Object.freeze([
                'agenda-1.20.0.js?v=20260910-phase4b-r1'
            ])
        })
"""
require_once(loader, old_bundle, 'bundle Agenda 4A')
loader = loader.replace(old_bundle, new_bundle)
load_line = "            await Promise.all([estilosProntos,carregarScriptsEmOrdem(bundle.scripts)]);\\n"
require_once(loader, load_line, 'carregar scripts bundle')
load_new = load_line + "            if(idTela==='tela_agenda'){\\n                try{window.instalarIntegracaoFinanceiroAgenda?.();}catch(error){console.error('KineSys Screen Loader: integração Agenda/Financeiro falhou.',error);}\\n                try{window.aplicarProtecoesAgendaKineSys?.();}catch(error){console.error('KineSys Screen Loader: proteções da Agenda falharam.',error);}\\n            }\\n"
loader = loader.replace(load_line, load_new)
loader_path.write_text(loader, encoding='utf-8')
'''
if old not in s:
    raise SystemExit('Screen Loader transformer block not found exactly')
s = s.replace(old, new)
p.write_text(s, encoding='utf-8')
print('Phase 4B transformer source corrected')
