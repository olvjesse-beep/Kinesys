from pathlib import Path
import re

exec(Path('tools/chaos_hardening_patch_v4.py').read_text(encoding='utf-8'), {'__name__': '__main__'})

# Shoulder: keep a strong local mechanical pattern alive even when distal/neural
# vocabulary appears only inside explicit negatives.
p = Path('clinical_reasoning_shoulder-3.1.0.js')
s = p.read_text(encoding='utf-8')
anchor = "    const lateral=/(?:lateral|lado de fora|deltoid)/.test(t);\n"
insert = anchor + "    const manguitoLocalExplicito=/(?:(?:dor|doi).{0,24}(?:lateral|lado de fora|deltoid).{0,34}(?:ombro|braco)|(?:ombro|braco).{0,34}(?:dor|doi).{0,24}(?:lateral|lado de fora|deltoid))/.test(t)&&/(?:elev|levantar|erguer|peso|acima da cabeca|no alto)/.test(t);\n"
if s.count(anchor) != 1:
    raise RuntimeError(f'shoulder lateral anchor count={s.count(anchor)}')
s = s.replace(anchor, insert, 1)
anchor2 = "    if(cond.id==='ombro_manguito'&&temOmbro){\n"
insert2 = anchor2 + "      if(manguitoLocalExplicito)score=Math.max(score,4.2);\n"
if s.count(anchor2) != 1:
    raise RuntimeError(f'shoulder manguito anchor count={s.count(anchor2)}')
s = s.replace(anchor2, insert2, 1)
p.write_text(s, encoding='utf-8')

# Wrist: narrow median-negation scope so an unrelated phrase such as "sem sequela"
# cannot negate a later classic CTS clause; accept colloquial "dorme/dormente".
p = Path('clinical_reasoning_wrist-3.1.0.js')
s = p.read_text(encoding='utf-8')
median_neg = "    const parestesiaMedianaNegada=/(?:sem|nao\\s+(?:tenho|tem|sinto|sente)|nem)\\s*(?:formig\\w*|dorm\\w*|adormec\\w*).{0,70}(?:polegar|indicador|medio)|(?:polegar|indicador|medio).{0,38}(?:nao\\s+(?:formig\\w*|dorm\\w*|adormec\\w*)|sem\\s+(?:formig\\w*|dorm\\w*|adormec\\w*))/.test(t);\n"
s, count = re.subn(r"    const parestesiaMedianaNegada=.*?\n", lambda _m: median_neg, s, count=1)
if count != 1:
    raise RuntimeError(f'median negation line count={count}')
median_line = "    const parestesiaMediana=/(?:formig|dorme|dormenc|adormec)/.test(t);\n    const mediano=/(polegar.{0,35}(indicador|medio)|(indicador|medio).{0,35}polegar)/.test(t)&&parestesiaMediana&&!parestesiaMedianaNegada;\n"
s, count = re.subn(r"    const mediano=.*?\n", lambda _m: median_line, s, count=1)
if count != 1:
    raise RuntimeError(f'median positive line count={count}')

# Compartment syndrome: passive finger stretch is positive only when explicitly
# painful/worsening, never merely because the words "dor" and "esticar" coexist.
comp_line = "    const estiramentoPassivoPositivo=/(?:esticar os dedos|alongamento passivo).{0,30}(?:doi|doeu|piora|piorou|aumenta a dor)|(?:doi|doeu|piora|piorou|aumenta a dor).{0,30}(?:esticar os dedos|alongamento passivo)/.test(t)&&!/(?:esticar os dedos|alongamento passivo).{0,30}(?:nao doi|nao piora|sem dor)/.test(t);\n    const compartimentalPositivo=/(?:tenso|dura|desproporcional|insuportavel)/.test(t)&&!compartimentalNegado||estiramentoPassivoPositivo;\n"
s, count = re.subn(r"    const compartimentalPositivo=.*?\n", lambda _m: comp_line, s, count=1)
if count != 1:
    raise RuntimeError(f'compartment positive line count={count}')
p.write_text(s, encoding='utf-8')

print('Chaos hardening v5: four remaining failure classes patched.')
