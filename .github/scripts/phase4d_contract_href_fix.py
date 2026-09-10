from pathlib import Path

path = Path('tests/screen_loader.contract.js')
text = path.read_text(encoding='utf-8')
old = "const eager=new RegExp(`<link[^>]+href=[\"'][^\"']*${escaped}[^\"']*[\"']`,'i');"
new = "const eager=new RegExp(`<link[^>]+\\shref=[\"'][^\"']*${escaped}[^\"']*[\"']`,'i');"
count = text.count(old)
if count != 1:
    raise SystemExit(f'Expected one generic lazy stylesheet href matcher, found {count}')
path.write_text(text.replace(old, new, 1), encoding='utf-8')
print('Phase 4D contract href matcher hardened.')
