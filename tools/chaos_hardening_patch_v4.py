from pathlib import Path
import re

exec(Path('tools/chaos_hardening_patch_v3.py').read_text(encoding='utf-8'), {'__name__': '__main__'})

p = Path('clinical_reasoning_elbow-3.1.0.js')
s = p.read_text(encoding='utf-8')
replacement = "    const perdaExtensao=/(?:nao estic|nao estend).{0,24}(?:todo|complet|ate o fim)|(?:cotovelo).{0,70}(?:nao estic|nao estend|perdeu extensao|falta extensao)|(?:nao estic|nao estend|perdeu extensao).{0,70}cotovelo/.test(t);\n"
s2, count = re.subn(r"    const perdaExtensao=.*?\n", replacement, s, count=1)
if count != 1:
    raise RuntimeError(f'Expected one perdaExtensao line, found {count}')
p.write_text(s2, encoding='utf-8')
print('Chaos hardening v4: true extension loss preserved.')
