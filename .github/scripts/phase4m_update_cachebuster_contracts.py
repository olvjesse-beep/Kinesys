from pathlib import Path

old='core_mod=20260911-phase4l-r1'
new='core_mod=20260911-phase4m-r1'
changed=[]
for p in Path('tests').glob('*.js'):
    text=p.read_text(encoding='utf-8')
    if old not in text:
        continue
    p.write_text(text.replace(old,new),encoding='utf-8')
    changed.append(str(p))
print('Updated cache-buster contracts:', ', '.join(changed) if changed else 'none')
