from pathlib import Path

# Apply the original deterministic patch set first.
exec(Path('tools/chaos_hardening_patch.py').read_text(encoding='utf-8'), {'__name__': '__main__'})

# Correct a malformed JS grouping emitted by the first patcher revision.
p = Path('clinical_reasoning_elbow-3.1.0.js')
s = p.read_text(encoding='utf-8')
bad = "const olecrano=/(?:bola|caroco).{0,60}(?:ponta|olecrano|cotovelo)|(?:ponta|olecrano).{0,60}(?:bola|caroco)/.test(t)||((?:/(?:inch|edema)/.test(t)&&!negado('inch\\w*|edema'))&&/(?:ponta|atras do cotovelo|olecrano)/.test(t));"
good = "const olecrano=/(?:bola|caroco).{0,60}(?:ponta|olecrano|cotovelo)|(?:ponta|olecrano).{0,60}(?:bola|caroco)/.test(t)||((/(?:inch|edema)/.test(t)&&!negado('inch\\w*|edema'))&&/(?:ponta|atras do cotovelo|olecrano)/.test(t));"
if s.count(bad) != 1:
    raise RuntimeError(f'Expected malformed olecranon expression once, found {s.count(bad)}')
p.write_text(s.replace(bad, good, 1), encoding='utf-8')
print('Chaos hardening v2 syntax fix applied.')
