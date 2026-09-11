from pathlib import Path

# Build the proposed motor edits from the clean branch state.
exec(Path('tools/chaos_hardening_patch.py').read_text(encoding='utf-8'), {'__name__': '__main__'})

# The first patcher emitted a regex literal prefixed by a Python-style non-capturing
# marker. Fix only that exact syntactic fragment; node --check is the authority next.
p = Path('clinical_reasoning_elbow-3.1.0.js')
s = p.read_text(encoding='utf-8')
bad = "||((?:/(?:inch|edema)/"
good = "||((/(?:inch|edema)/"
if s.count(bad) != 1:
    raise RuntimeError(f'Expected malformed olecranon fragment once, found {s.count(bad)}')
p.write_text(s.replace(bad, good, 1), encoding='utf-8')
print('Chaos hardening v3 syntax repair applied.')
