from pathlib import Path
p=Path('financeiro_agendamento-1.21.0.js')
s=p.read_text(encoding='utf-8')
old="""    function instalarModalBaixaPendencia(){\n        if(document.getElementById('fin_ag_baixa_dialog'))return;\n        document.body.insertAdjacentHTML('beforeend',`<dialog id=\"fin_ag_baixa_dialog\" class=\"fin-ag-writeoff-dialog\">\n"""
new="""    function instalarModalBaixaPendencia(){\n        if(!document.body||document.getElementById('fin_ag_baixa_dialog'))return;\n        document.body.insertAdjacentHTML('beforeend',`<dialog id=\"fin_ag_baixa_dialog\" class=\"fin-ag-writeoff-dialog\">\n"""
if s.count(old)!=1: raise SystemExit('DOM-safe anchor absent/ambiguous')
p.write_text(s.replace(old,new,1),encoding='utf-8')
