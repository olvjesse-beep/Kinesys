from pathlib import Path

p = Path('design_agenda.css')
s = p.read_text(encoding='utf-8')
replacements = [
    (
        '#modal_agendamento .agenda-patient-suggestion{\n  display:block;\n  width:100%;\n  min-height:42px;\n  padding:9px 11px;\n  border:0;\n  border-radius:7px;',
        '#modal_agendamento .agenda-patient-suggestion{\n  display:block;\n  width:100%;\n  min-height:42px;\n  padding:9px 11px;\n  border:0;\n  border-radius:var(--kds-radius-sm);'
    ),
    (
        '.agenda-plano-vinculo button{border:1px solid var(--kds-line);background:var(--kds-surface);color:var(--kds-accent);border-radius:6px;',
        '.agenda-plano-vinculo button{border:1px solid var(--kds-line);background:var(--kds-surface);color:var(--kds-accent);border-radius:var(--kds-radius-sm);'
    ),
]
for old, new in replacements:
    if s.count(old) != 1:
        raise SystemExit(f'Impeccable radius anchor absent/ambiguous: {old[:70]}')
    s = s.replace(old, new, 1)
p.write_text(s, encoding='utf-8')
