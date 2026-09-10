from pathlib import Path

css_path=Path('design_agenda.css')
css=css_path.read_text(encoding='utf-8')
marker='AGENDA AXIS + CLEAN GRID FIX R4'
block='''\n\n/* ============================================================================\n   AGENDA AXIS + CLEAN GRID FIX R4\n   Mantém subslots lógicos de 10 min para posicionamento/duração, mas mostra\n   somente divisores de hora cheia. Amplia o eixo para não cortar HH:MM.\n   ========================================================================== */\n@media (min-width:760px){\n  #tela_agenda .agenda-semana-grade{\n    --kds-agenda-hour-axis-width:70px;\n  }\n\n  #tela_agenda .agenda-hora-eixo,\n  #tela_agenda .agenda-celula{\n    border-top:0!important;\n  }\n\n  #tela_agenda .agenda-hora-eixo.meia-hora,\n  #tela_agenda .agenda-celula.meia-hora,\n  #tela_agenda .agenda-hora-eixo.subhora,\n  #tela_agenda .agenda-celula.subhora,\n  #tela_agenda .agenda-celula.bloqueado.meia-hora,\n  #tela_agenda .agenda-celula.bloqueado.subhora,\n  #tela_agenda .agenda-celula.feriado.meia-hora,\n  #tela_agenda .agenda-celula.feriado.subhora{\n    border-top:0!important;\n    border-top-style:none!important;\n  }\n\n  #tela_agenda .agenda-hora-eixo.hora-cheia,\n  #tela_agenda .agenda-celula.hora-cheia{\n    border-top:1px solid var(--kds-line)!important;\n  }\n\n  #tela_agenda .agenda-hora-eixo{\n    min-width:70px!important;\n    width:70px!important;\n    padding:1px 8px 0 4px!important;\n    overflow:visible!important;\n    white-space:nowrap!important;\n    text-overflow:clip!important;\n  }\n\n  #tela_agenda .agenda-canto{\n    min-width:70px!important;\n    width:70px!important;\n  }\n}\n'''
if marker not in css:
    css += block
css_path.write_text(css,encoding='utf-8')

index_path=Path('index.html')
html=index_path.read_text(encoding='utf-8')
old='design_agenda.css?v=20260910-compact-r3'
new='design_agenda.css?v=20260910-compact-r4'
if old not in html:
    raise SystemExit('cache-buster r3 not found')
index_path.write_text(html.replace(old,new,1),encoding='utf-8')
