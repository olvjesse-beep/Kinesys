from pathlib import Path
p=Path('script-1.18.0.js')
s=p.read_text(encoding='utf-8')

old="""    if (fraquezaAfirmada) {
      add('Déficit motor referido', 'fraqueza/perda de força');
    }
    if (sinais.has('trajetoAlemCotovelo')) {
"""
new="""    if (fraquezaAfirmada) {
      add('Déficit motor referido', 'fraqueza/perda de força');
    }
    if (sinais.has('decubitoOmbro')) {
      add('Comportamento ao deitar/dormir', 'sintoma relacionado ao apoio/decúbito sobre ombro ou membro superior; esclarecer localização e natureza do sintoma');
    }
    if (sinais.has('trajetoAlemCotovelo')) {
"""
if old not in s: raise SystemExit('visible finding anchor missing')
s=s.replace(old,new,1)

old="""    if (/\\b(fraqueza|perda de forca|perdeu forca|forca reduzida)\\b/.test(normalizar(texto || ''))) {
      lacunasBase.unshift('Caracterizar a fraqueza: início, progressão, distribuição, miótomos, reflexos e diferença entre déficit motor e inibição por dor.');
    }
    if (sinais.has('flexaoProfundaJoelho')) {
"""
new="""    if (/\\b(fraqueza|perda de forca|perdeu forca|forca reduzida)\\b/.test(normalizar(texto || ''))) {
      lacunasBase.unshift('Caracterizar a fraqueza: início, progressão, distribuição, miótomos, reflexos e diferença entre déficit motor e inibição por dor.');
    }
    if (sinais.has('decubitoOmbro')) {
      lacunasBase.unshift('Ao deitar/dormir sobre o braço ou ombro, esclarecer onde surge o sintoma e se é dor no topo/lateral/anterior, pressão, formigamento ou dormência.');
    }
    if (sinais.has('flexaoProfundaJoelho')) {
"""
if old not in s: raise SystemExit('decubitus lacuna anchor missing')
s=s.replace(old,new,1)

# Add isolated-phrase regressions: signal + visible finding, no forced diagnosis requirement.
anchor="""    caso('C2A','cervical_ombro','Dor no ombro e piora ao dormir em cima do braço.',{
"""
if anchor not in s: raise SystemExit('C2A anchor missing')
insert="""    caso('C2ISO1','cervical_ombro','Dormir encima do braço incomoda.',{
      sinaisIncluem:['decubitoOmbro']
    }),
    caso('C2ISO2','cervical_ombro','Ao deitar sobre o braco piora.',{
      sinaisIncluem:['decubitoOmbro']
    }),
"""
s=s.replace(anchor,insert+anchor,1)
p.write_text(s,encoding='utf-8')
print('visible decubitus Radar finding added')
