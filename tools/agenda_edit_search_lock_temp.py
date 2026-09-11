from pathlib import Path
p=Path('agenda-1.20.0.js')
s=p.read_text(encoding='utf-8')
old="""    const paciente = document.getElementById('ag_paciente_select');
    const data = document.getElementById('ag_data_input');
"""
new="""    const paciente = document.getElementById('ag_paciente_select');
    const pacienteBusca = document.getElementById('ag_paciente_busca');
    const data = document.getElementById('ag_data_input');
"""
if s.count(old)!=1: raise SystemExit(f'anchor count={s.count(old)}')
s=s.replace(old,new,1)
old="""    if (paciente) {
        paciente.disabled = editando;
        paciente.setAttribute('aria-disabled', String(editando));
    }
    if (data) {
"""
new="""    if (paciente) {
        paciente.disabled = editando;
        paciente.setAttribute('aria-disabled', String(editando));
    }
    if (pacienteBusca) {
        pacienteBusca.disabled = editando;
        pacienteBusca.setAttribute('aria-disabled', String(editando));
    }
    if (data) {
"""
if s.count(old)!=1: raise SystemExit(f'patient block count={s.count(old)}')
s=s.replace(old,new,1)
p.write_text(s,encoding='utf-8')

p=Path('tests/agenda_ux_corrections.contract.js')
t=p.read_text(encoding='utf-8')
old="assert.match(configurar, /data\\.disabled = false/,'Data deve permanecer editável no modo edição');\n"
new="assert.match(configurar, /pacienteBusca\\.disabled = editando/,'Busca de paciente deve ficar bloqueada no modo edição');\n"+old
if t.count(old)!=1: raise SystemExit(f'test anchor count={t.count(old)}')
t=t.replace(old,new,1)
p.write_text(t,encoding='utf-8')
