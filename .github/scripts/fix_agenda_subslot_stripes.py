from pathlib import Path

css_path=Path('design_agenda.css')
css=css_path.read_text(encoding='utf-8')
marker='AGENDA SUBSLOT STRIPES FIX R3'
block='''\n\n/* ============================================================================\n   AGENDA SUBSLOT STRIPES FIX R3\n   A grade continua calculando em passos de 10 min, mas só hora cheia e\n   meia-hora recebem divisores visuais. Subslots não desenham listras.\n   ========================================================================== */\n@media (min-width:760px){\n  #tela_agenda .agenda-hora-eixo.subhora,\n  #tela_agenda .agenda-celula.subhora{\n    border-top-width:0!important;\n    border-top-style:none!important;\n  }\n  #tela_agenda .agenda-hora-eixo.meia-hora,\n  #tela_agenda .agenda-celula.meia-hora{\n    border-top:1px dashed var(--kds-line-soft)!important;\n  }\n  #tela_agenda .agenda-hora-eixo.hora-cheia,\n  #tela_agenda .agenda-celula.hora-cheia{\n    border-top:1px solid var(--kds-line)!important;\n  }\n  #tela_agenda .agenda-celula.bloqueado.subhora,\n  #tela_agenda .agenda-celula.feriado.subhora{\n    border-top:0!important;\n  }\n}\n'''
if marker not in css:
    css += block
css_path.write_text(css,encoding='utf-8')

index_path=Path('index.html')
html=index_path.read_text(encoding='utf-8')
old='design_agenda.css?v=20260910-compact-r2'
new='design_agenda.css?v=20260910-compact-r3'
if old not in html and new not in html:
    raise SystemExit('design_agenda cache marker not found')
html=html.replace(old,new,1)
index_path.write_text(html,encoding='utf-8')

print('Agenda subslot stripe fix applied.')
