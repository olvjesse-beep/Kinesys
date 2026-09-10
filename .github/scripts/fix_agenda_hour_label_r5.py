from pathlib import Path

css_path=Path('design_agenda.css')
css=css_path.read_text(encoding='utf-8')
marker='AGENDA HOUR LABEL VERTICAL FIX R5'
block='''\n\n/* ============================================================================\n   AGENDA HOUR LABEL VERTICAL FIX R5\n   A escala compacta deixa cada subslot de 10 min menor que a fonte do eixo.\n   A hora cheia ocupa visualmente 30 min apenas na coluna do relógio, evitando\n   clipping vertical sem alterar a geometria temporal dos atendimentos.\n   ========================================================================== */\n@media (min-width:760px){\n  #tela_agenda .agenda-hora-eixo.hora-cheia{\n    grid-row-end:span 3!important;\n    z-index:8!important;\n    min-height:calc(var(--kds-agenda-slot-height) * 3)!important;\n    padding:2px 8px 0 4px!important;\n    overflow:visible!important;\n    line-height:var(--kds-leading-tight)!important;\n    background:#FAFBFB!important;\n  }\n\n  #tela_agenda .agenda-hora-eixo.subhora,\n  #tela_agenda .agenda-hora-eixo.meia-hora{\n    z-index:3!important;\n  }\n}\n'''
if marker not in css:
    css += block
css_path.write_text(css,encoding='utf-8')

index_path=Path('index.html')
html=index_path.read_text(encoding='utf-8')
old='design_agenda.css?v=20260910-compact-r4'
new='design_agenda.css?v=20260910-compact-r5'
if old not in html:
    raise SystemExit('cache-buster compact-r4 not found')
index_path.write_text(html.replace(old,new,1),encoding='utf-8')
