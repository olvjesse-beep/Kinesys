from pathlib import Path

p=Path('design_agenda.css')
s=p.read_text(encoding='utf-8')
s=s.replace('@media (min-width:761px)', '@media (min-width:760px)')
s=s.replace('@media (min-width:1281px)', '@media (min-width:1280px)')
p.write_text(s, encoding='utf-8')
print('Agenda breakpoints aligned to KDS contract.')
