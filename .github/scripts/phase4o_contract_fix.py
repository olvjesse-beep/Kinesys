from pathlib import Path

p=Path('tests/team_management_modularization.contract.js')
t=p.read_text(encoding='utf-8')
old="assert.match(team,/KineSysAccessAdmin\\?\\.open\\(id\\)/,'redefinição de senha deve continuar delegada ao controlador seguro');"
new="assert.match(team,/(?:window\\.)?KineSysAccessAdmin\\?\\.open\\(id\\)/,'redefinição de senha deve continuar delegada ao controlador seguro');"
if t.count(old)!=1:
    raise SystemExit(f'expected one reset assertion, got {t.count(old)}')
p.write_text(t.replace(old,new,1),encoding='utf-8')
print('Phase 4O contract assertion fixed')
