from pathlib import Path

p=Path('script-1.18.0.js')
s=p.read_text(encoding='utf-8')
s=s.replace('"decubitoOmbro": "piora ao deitar ou dormir sobre o ombro/membro superior"','"decubitoOmbro": "relação dos sintomas com deitar ou dormir sobre o ombro/membro superior"',1)
p.write_text(s,encoding='utf-8')

p=Path('clinical_reasoning_shoulder-3.1.0.js')
s=p.read_text(encoding='utf-8')
old="""      'doi no lado de fora do ombro','dor desce so ate o meio do braco','doi no meio do levantamento','doi mais para subir do que parado',
      'dormir em cima do ombro','dormir sobre o ombro','deitar em cima do ombro','deitar sobre o ombro','dormir em cima do braco','dormir sobre o braco',
      'deitar em cima do braco','deitar sobre o braco','dormir do lado do ombro','deitar do lado do ombro','doi ao dormir de lado','doi quando deita sobre o ombro'
"""
new="""      'doi no lado de fora do ombro','dor desce so ate o meio do braco','doi no meio do levantamento','doi mais para subir do que parado'
"""
if old not in s: raise SystemExit('decubitus direct-vocab block missing')
s=s.replace(old,new,1)

anchor="""  const contexto=()=>{try{return typeof coletarContextoClinico==='function'?(coletarContextoClinico()||{}):{};}catch(_){return{};}};
"""
insert="""  const contexto=()=>{try{return typeof coletarContextoClinico==='function'?(coletarContextoClinico()||{}):{};}catch(_){return{};}};
  const PADRAO_DECUBITO_OMBRO=/(?:dormir|deitar|apoiar).{0,28}(?:em cima|sobre|lado).{0,22}(?:ombro|braco)|(?:ombro|braco).{0,22}(?:dormir|deitar|apoiar)/;
  const PERGUNTA_DECUBITO_OMBRO='Ao deitar/dormir sobre o braço ou ombro, o que surge exatamente: dor no topo, dor lateral, dor anterior, pressão, formigamento ou dormência?';
  const OBJETIVO_DECUBITO_OMBRO='Localizar o sintoma provocado pelo decúbito e diferenciar compressão local do ombro/AC de sintomas neurais no membro superior';
"""
if s.count(anchor)!=1: raise SystemExit('context anchor missing')
s=s.replace(anchor,insert,1)

old="""    const c=contexto(); const texto=textoContexto(c);
    const avaliadas=CONDICOES.map(cond=>({cond,...pontuar(cond,texto,c)})).sort((a,b)=>b.score-a.score);
"""
new="""    const c=contexto(); const texto=textoContexto(c);
    const relatoDecubito=PADRAO_DECUBITO_OMBRO.test(norm(hmaTexto()));
    const avaliadas=CONDICOES.map(cond=>({cond,...pontuar(cond,texto,c)})).sort((a,b)=>b.score-a.score);
"""
if old not in s: raise SystemExit('plano context anchor missing')
s=s.replace(old,new,1)

old="""    const perguntas=uniq([...BASE_PERGUNTAS,...fortes.flatMap(x=>x.cond.perguntas)]).slice(0,14);
    const objetivos=uniq(fortes.flatMap(x=>x.cond.objetivos)).slice(0,16);
"""
new="""    const perguntas=uniq([...(relatoDecubito?[PERGUNTA_DECUBITO_OMBRO]:[]),...BASE_PERGUNTAS,...fortes.flatMap(x=>x.cond.perguntas)]).slice(0,14);
    const objetivos=uniq([...(relatoDecubito?[OBJETIVO_DECUBITO_OMBRO]:[]),...fortes.flatMap(x=>x.cond.objetivos)]).slice(0,16);
"""
if old not in s: raise SystemExit('questions/objectives anchor missing')
s=s.replace(old,new,1)

old="""    plano.motor31={versao:VERSION,regiao:'ombro',frasesReconhecidas:uniq(fortes.flatMap(x=>x.hits)),perguntas,condicoes:plano.exame.familiasOmbro,aviso:'Palavras e frases da HMA orientam investigação; não equivalem a diagnóstico.'};
"""
new="""    plano.motor31={versao:VERSION,regiao:'ombro',frasesReconhecidas:uniq([...(relatoDecubito?['relação com decúbito sobre ombro/membro superior']:[]),...fortes.flatMap(x=>x.hits)]),perguntas,condicoes:plano.exame.familiasOmbro,aviso:'Palavras e frases da HMA orientam investigação; não equivalem a diagnóstico.'};
"""
if old not in s: raise SystemExit('motor31 snapshot anchor missing')
s=s.replace(old,new,1)

p.write_text(s,encoding='utf-8')
print('decubitus semantics refined')
