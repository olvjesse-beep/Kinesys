from pathlib import Path
import re


def replace_once(path, old, new):
    p = Path(path)
    s = p.read_text(encoding='utf-8')
    count = s.count(old)
    if count != 1:
        raise RuntimeError(f'{path}: expected exactly 1 literal match, found {count}: {old[:100]!r}')
    p.write_text(s.replace(old, new, 1), encoding='utf-8')


def sub_once(path, pattern, repl, flags=0):
    p = Path(path)
    s = p.read_text(encoding='utf-8')
    out, count = re.subn(pattern, repl, s, count=1, flags=flags)
    if count != 1:
        raise RuntimeError(f'{path}: expected exactly 1 regex match, found {count}: {pattern[:100]!r}')
    p.write_text(out, encoding='utf-8')

# -----------------------------------------------------------------------------
# OMBRO — negação contextual, relato de terceiros, temporalidade e lateralidade.
# -----------------------------------------------------------------------------
shoulder = 'clinical_reasoning_shoulder-3.1.0.js'
replace_once(shoulder, "const VERSION='3.1.4-shoulder5';", "const VERSION='3.1.5-shoulder6';")
replace_once(
    shoulder,
    ".replace(/\\bpra\\b/g,'para')\n    .replace(/\\s+/g,' ').trim();",
    ".replace(/\\bpra\\b/g,'para')\n    .replace(/\\bn\\b/g,'nao')\n    .replace(/\\s+/g,' ').trim();\n  const relatoTerceiro=(v='')=>/(?:minha|meu)\\s+(?:mae|pai|esposa|marido|companheira|companheiro|irma|irmao|avo|avo|filha|filho)\\b/.test(norm(v));\n  const hmaPacienteAtual=()=>String(hmaTexto()).split(/[.!?;\\n]+/).filter(x=>x.trim()&&!relatoTerceiro(x)).join(' ');"
)
replace_once(
    shoulder,
    "return [hmaTexto(),c?.origemIrradiacao||'',c?.irradiacao||'',c?.textoMedicamentos||'',c?.textoCirurgias||'',arr(c?.comorbidades).join(' '),c?.textoComorbidades||''].join(' ');",
    "return [hmaPacienteAtual(),c?.origemIrradiacao||'',c?.irradiacao||'',c?.textoMedicamentos||'',c?.textoCirurgias||'',arr(c?.comorbidades).join(' '),c?.textoComorbidades||''].join(' ');"
)
replace_once(
    shoulder,
    "const hits=arr(VOCABULARIO_COMPILADO[cond.id]).filter(x=>x.normalizado&&t.includes(x.normalizado)).map(x=>x.raw);",
    "let hits=arr(VOCABULARIO_COMPILADO[cond.id]).filter(x=>x.normalizado&&t.includes(x.normalizado)).map(x=>x.raw);"
)
replace_once(
    shoulder,
    "    const trauma=traumaMecanismo&&!traumaNegado&&temOmbro;\n    const incapacidadeAguda=/(?:nao consegue|nao levanta|deform|pendurado|perdeu.{0,20}forca|fraqueza.{0,20}repente)/.test(t);\n    const neuroDistal=/(?:formig|dormen|adormec|amortec|choque).{0,55}(?:mao|dedo|polegar|indicador|anelar|mindinho)|(?:mao|dedo|polegar|indicador|anelar|mindinho).{0,55}(?:formig|dormen|adormec|amortec|choque)/.test(t);\n    const cervicalLigada=/(?:pescoco|nuca|cervic).{0,80}(?:ombro|braco|mao|dedo)|(?:virar|mexer|olhar).{0,30}(?:pescoco|cima).{0,80}(?:dor|braco|mao)/.test(t);",
    "    const historiaRemotaResolvida=/(?:ha\\s+)?\\d+\\s+anos?\\b|anos?\\s+atras/.test(t)&&/(?:recuperei|recuperou|fiquei\\s+(?:bem|bom)|sem sequela|alta sem sequela|recebi alta)/.test(t);\n    const trauma=traumaMecanismo&&!traumaNegado&&!historiaRemotaResolvida&&temOmbro;\n    const incapacidadeAguda=/(?:nao consegue|nao levanta|deform|pendurado|perdeu.{0,20}forca|fraqueza.{0,20}repente)/.test(t);\n    const neuroNegado=/(?:sem|nao\\s+(?:tenho|tem|sinto|sente|apresenta)?|nem).{0,55}(?:formig|dormen|adormec|amortec|choque)/.test(t);\n    const neuroDistal=/(?:formig|dormen|adormec|amortec|choque).{0,55}(?:mao|dedo|polegar|indicador|anelar|mindinho)|(?:mao|dedo|polegar|indicador|anelar|mindinho).{0,55}(?:formig|dormen|adormec|amortec|choque)/.test(t)&&!neuroNegado;\n    const cervicalNegada=/(?:mexer|virar|olhar).{0,35}(?:pescoco|cima).{0,35}(?:nao muda|nao piora|nao reproduz|sem efeito)|(?:pescoco|cervic).{0,45}(?:nao muda|nao piora|nao reproduz)/.test(t);\n    const cervicalLigada=/(?:pescoco|nuca|cervic).{0,80}(?:ombro|braco|mao|dedo)|(?:virar|mexer|olhar).{0,30}(?:pescoco|cima).{0,80}(?:dor|braco|mao)/.test(t)&&!cervicalNegada;"
)
replace_once(
    shoulder,
    "    const toracico=/(?:dor|pressao|aperto|peso).{0,35}(?:peito|torax)|(?:peito|torax).{0,35}(?:dor|pressao|aperto|peso)/.test(t);\n    const esforcoCardio=/(?:subir|ladeira|escada|caminhar|correr|esforco|atividade fisica)/.test(t);\n    const associadosCardio=/(?:falta de ar|dispneia|suor frio|sudorese|nausea|enjoo|tontura)/.test(t);",
    "    const toracicoNegado=/(?:sem|nao\\s+(?:tenho|tem|sinto|sente)?).{0,38}(?:dor|pressao|aperto|peso).{0,28}(?:peito|torax)|nem.{0,20}(?:dor|pressao|aperto|peso).{0,28}(?:peito|torax)/.test(t);\n    const toracico=/(?:dor|pressao|aperto|peso).{0,35}(?:peito|torax)|(?:peito|torax).{0,35}(?:dor|pressao|aperto|peso)/.test(t)&&!toracicoNegado;\n    const esforcoCardio=/(?:subir|subi|subo|subindo|ladeira|escada|caminhar|caminhei|correr|corri|esforco|atividade fisica)/.test(t);\n    const cardioAssociadoNegado=/(?:sem|nao\\s+(?:tenho|tem|sinto|sente)?).{0,30}(?:falta de ar|dispneia|suor frio|sudorese|nausea|enjoo|tontura)|nao\\s+(?:suo|suei).{0,10}frio/.test(t);\n    const associadosCardio=/(?:falta de ar|dispneia|suor frio|suei frio|sudorese|nausea|enjoo|enjoei|tontura)/.test(t)&&!cardioAssociadoNegado;"
)
replace_once(
    shoulder,
    "    if(cond.id==='ombro_cardiorrespiratorio'&&temOmbro&&toracico&&esforcoCardio&&associadosCardio){score+=7;hits.push('ombro + esforço + sintomas cardiorrespiratórios');}\n    if(cond.id==='ombro_pmr'&&idade>=50)score+=2;",
    "    if(cond.id==='ombro_cardiorrespiratorio'&&temOmbro&&toracico&&esforcoCardio&&associadosCardio){score+=7;hits.push('ombro + esforço + sintomas cardiorrespiratórios');}\n    if(cond.id==='ombro_cardiorrespiratorio'&&(toracicoNegado||cardioAssociadoNegado)&&!(toracico&&associadosCardio)){score=-5;hits=[];}\n    if(cond.id==='ombro_pmr'&&idade>=50)score+=2;"
)
replace_once(
    shoulder,
    "    if(cond.id==='ombro_cervical_referida'){\n      if(neuroDistal)score+=3.1;\n      if(cervicalLigada)score+=2.2;\n    }",
    "    if(cond.id==='ombro_cervical_referida'){\n      if(neuroDistal)score+=3.1;\n      if(cervicalLigada)score+=2.2;\n      if(neuroNegado&&cervicalNegada){score=-5;hits=[];}\n      else if(neuroNegado&&!cervicalLigada){hits=hits.filter(x=>!/formig|dorm|adorm|choque/i.test(norm(x)));}\n    }"
)
replace_once(
    shoulder,
    "    if(cond.id==='ombro_ac'){\n      if(acSuperior)score+=2.9;\n      if(cruzarBraco)score+=1.7;\n    }\n    if(cond.id==='ombro_ruptura_manguito'&&perdaAtivaPassiva)score+=4;\n    return {score:score+cond.ordem/1000,hits:hits.slice(0,5)};",
    "    if(cond.id==='ombro_ac'){\n      if(acSuperior)score+=2.9;\n      if(cruzarBraco)score+=1.7;\n    }\n    if(cond.id==='ombro_capsulite'&&passivoPreservado){score=-5;hits=[];}\n    const mecanicoLabralNegado=/(?:clique|estalo).{0,30}(?:nao doi|indolor)|(?:nao trava|nao prende|sem travamento)/.test(t);\n    if(cond.id==='ombro_labral'&&mecanicoLabralNegado){score=-5;hits=[];}\n    const calcariaContralateral=/(?:calcific|calcio).{0,50}ombro\\s+(?:esquerdo|direito).{0,70}(?:nunca doi|sem dor|assintomatic).{0,120}ombro\\s+(?:direito|esquerdo)/.test(t);\n    if(cond.id==='ombro_calcaria'&&calcariaContralateral){score=-5;hits=[];}\n    if(cond.id==='ombro_trauma_maior'&&historiaRemotaResolvida){score=-5;hits=[];}\n    if(cond.id==='ombro_instabilidade'&&historiaRemotaResolvida&&/(?:sem|nao\\s+(?:tenho|tem)?).{0,55}(?:falseio|apreens|sai|desencaix|instabil)/.test(t)){score=-5;hits=[];}\n    if(cond.id==='ombro_ruptura_manguito'&&perdaAtivaPassiva)score+=4;\n    return {score:score+cond.ordem/1000,hits:hits.slice(0,5)};"
)

# -----------------------------------------------------------------------------
# COTOVELO — negação por escopo, história remota, terceiros e linguagem coloquial.
# -----------------------------------------------------------------------------
elbow = 'clinical_reasoning_elbow-3.1.0.js'
replace_once(elbow, "const VERSION='3.1.2-elbow3';", "const VERSION='3.1.3-elbow4';")
replace_once(
    elbow,
    "const norm=(v='')=>String(v||'').normalize('NFD').replace(/[\\u0300-\\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,' ').replace(/\\s+/g,' ').trim();",
    "const norm=(v='')=>String(v||'').normalize('NFD').replace(/[\\u0300-\\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,' ').replace(/\\s+/g,' ').trim().replace(/\\blado d fora\\b/g,'lado de fora').replace(/\\blado d dentro\\b/g,'lado de dentro').replace(/\\bn\\b/g,'nao');"
)
replace_once(
    elbow,
    "  function textoContexto(c=contexto()){return [hmaTexto(),c?.origemIrradiacao||'',c?.irradiacao||'',c?.textoMedicamentos||'',c?.textoCirurgias||'',arr(c?.comorbidades).join(' '),c?.textoComorbidades||''].join(' ');}",
    "  const relatoTerceiro=(v='')=>/(?:minha|meu)\\s+(?:mae|pai|esposa|marido|companheira|companheiro|irma|irmao|avo|filha|filho)\\b/.test(norm(v));\n  const hmaPacienteAtual=()=>String(hmaTexto()).split(/[.!?;\\n]+/).filter(x=>x.trim()&&!relatoTerceiro(x)).join(' ');\n  function textoContexto(c=contexto()){return [hmaPacienteAtual(),c?.origemIrradiacao||'',c?.irradiacao||'',c?.textoMedicamentos||'',c?.textoCirurgias||'',arr(c?.comorbidades).join(' '),c?.textoComorbidades||''].join(' ');}"
)
replace_once(
    elbow,
    "const t=norm(texto);const hits=contem(texto,cond.termos).slice(0,6);let score=Math.min(9,hits.length*1.35);\n    const negado=(termo)=>new RegExp(`(?:(?:sem|nega|negou|nao tem|nao apresenta)\\\\s+(?:sinais?\\\\s+de\\\\s+)?|nem\\\\s+)${termo}`).test(t);",
    "const t=norm(texto);let hits=contem(texto,cond.termos).slice(0,6);let score=Math.min(9,hits.length*1.35);\n    const negado=(termo)=>new RegExp(`(?:sem|nega(?:do|ou)?|nao(?:\\\\s+(?:tem|tenho|teve|tive|houve|sinto|sente|sentiu|apresenta|apresentou|esta|estou|ficou|teve))?|nem)\\\\s*.{0,38}(?:${termo})`).test(t);"
)
replace_once(
    elbow,
    "    const relacaoOmbro=/ombro.{0,70}(?:cotovelo|braco)|(?:cotovelo|braco).{0,70}ombro/.test(t);\n    const distal=/(?:passa|ultrapassa|vai|chega).{0,35}(?:cotovelo).{0,55}(?:mao|dedo|polegar|indicador|anelar|mindinho)|\\bate\\b.{0,20}(?:mao|dedo|polegar|indicador|anelar|mindinho)/.test(t);\n    const neuroDistal=/(?:formig|dormen|adormec|amortec|choque).{0,55}(?:mao|dedo|polegar|indicador|anelar|mindinho)|(?:mao|dedo|polegar|indicador|anelar|mindinho).{0,55}(?:formig|dormen|adormec|amortec|choque)/.test(t);",
    "    const ombroNegado=negado('(?:dor.{0,15})?ombro|ombro.{0,15}dor');\n    const relacaoOmbro=/(?:ombro).{0,70}(?:cotovelo|braco)|(?:cotovelo|braco).{0,70}ombro/.test(t)&&!ombroNegado;\n    const distal=/(?:passa|ultrapassa|vai|chega).{0,35}(?:cotovelo).{0,55}(?:mao|dedo|polegar|indicador|anelar|mindinho)|\\bate\\b.{0,20}(?:mao|dedo|polegar|indicador|anelar|mindinho)/.test(t);\n    const parestesiaNegada=negado('formig\\\\w*|dormen\\\\w*|adormec\\\\w*|amortec\\\\w*|choque');\n    const neuroDistal=/(?:formig|dormen|adormec|amortec|choque).{0,55}(?:mao|dedo|polegar|indicador|anelar|mindinho)|(?:mao|dedo|polegar|indicador|anelar|mindinho).{0,55}(?:formig|dormen|adormec|amortec|choque)/.test(t)&&!parestesiaNegada;"
)
replace_once(
    elbow,
    "    const localLateral=lateralAnatomica;",
    "    const localLateral=lateralAnatomica||(/(?:dor|doi).{0,18}(?:lateral|lado de fora)/.test(t)&&/cotovelo/.test(t)&&!/lateral do braco/.test(t));"
)
replace_once(
    elbow,
    "    const padraoRadialDistal=/(?:mais para baixo|abaixo|distal|antebraco).{0,65}(?:epicond|cotovelo|lateral)|(?:lateral).{0,65}(?:antebraco|abaixo|distal)/.test(t);\n    const padraoPLRI=/(?:falseio|cede|cedendo|insegur|instavel|clunk).{0,90}(?:cotovelo|apoi|cadeira|empurr)|(?:cotovelo|apoi|cadeira|empurr).{0,90}(?:falseio|cede|insegur|instavel|clunk)/.test(t);\n    const historiaPLRI=/(?:lux|desloc|trauma|queda).{0,130}(?:falseio|cede|insegur|instavel|clunk)|(?:falseio|cede|insegur|instavel|clunk).{0,130}(?:lux|desloc|trauma|queda)/.test(t);\n    const digitosUlnares=/(?:quarto|quinto|4o|5o|anelar|mindinho).{0,55}(?:formig|dormen|adormec|amortec|choque)|(?:formig|dormen|adormec|amortec|choque).{0,55}(?:quarto|quinto|4o|5o|anelar|mindinho)/.test(t);",
    "    const padraoRadialDistal=/(?:mais para baixo|abaixo|distal|antebraco).{0,65}(?:epicond|cotovelo|lateral|lado de fora)|(?:lateral|lado de fora).{0,65}(?:antebraco|abaixo|distal)|(?:dedos?|quatro|4).{0,30}abaixo.{0,45}cotovelo/.test(t);\n    const instabilidadeNegada=negado('falseio|clunk|insegur\\\\w*|instavel|cede|ceder');\n    const padraoPLRI=/(?:falseio|cede|cedendo|insegur|instavel|clunk).{0,90}(?:cotovelo|apoi|cadeira|empurr)|(?:cotovelo|apoi|cadeira|empurr).{0,90}(?:falseio|cede|insegur|instavel|clunk)/.test(t)&&!instabilidadeNegada;\n    const historiaPLRI=/(?:lux|desloc|trauma|queda).{0,130}(?:falseio|cede|insegur|instavel|clunk)|(?:falseio|cede|insegur|instavel|clunk).{0,130}(?:lux|desloc|trauma|queda)/.test(t);\n    const digitosUlnares=/(?:quarto|quinto|4o|5o|anelar|mindinho).{0,55}(?:formig|dormen|adormec|amortec|choque)|(?:formig|dormen|adormec|amortec|choque).{0,55}(?:quarto|quinto|4o|5o|anelar|mindinho)/.test(t)&&!parestesiaNegada;"
)
replace_once(
    elbow,
    "    const trauma=traumaMecanismo&&!traumaNegado&&/cotovelo/.test(t);",
    "    const historiaRemotaResolvida=/(?:ha\\s+)?\\d+\\s+anos?\\b|anos?\\s+atras/.test(t)&&/(?:recuperei|recuperou|fiquei\\s+(?:bem|bom)|sem sequela|alta sem sequela|recebi alta)/.test(t);\n    const trauma=traumaMecanismo&&!traumaNegado&&!historiaRemotaResolvida&&/cotovelo/.test(t);"
)
replace_once(
    elbow,
    "    const tricepsCarga=/(?:atras|posterior|triceps).{0,55}cotovelo|cotovelo.{0,55}(?:atras|posterior|triceps)/.test(t)&&/(?:estend|empurr|supino|flexao de braco)/.test(t);\n    const articular=/(?:cotovelo).{0,70}(?:trav|bloque|rigid|nao estic|range|crepit)|(?:trav|bloque|rigid|nao estic|range|crepit).{0,70}cotovelo/.test(t);\n    const olecrano=/(?:bola|caroco|inch|edema).{0,60}(?:ponta|atras|olecrano|cotovelo)|(?:ponta|atras|olecrano).{0,60}(?:bola|caroco|inch|edema)/.test(t);",
    "    const tricepsCarga=/(?:dor\\s+)?atras\\s+do\\s+cotovelo|posterior.{0,35}cotovelo|cotovelo.{0,35}posterior|triceps.{0,45}cotovelo|cotovelo.{0,45}triceps/.test(t)&&/(?:estend|empurr|supino|flexao de braco)/.test(t);\n    const perdaExtensao=/(?:cotovelo).{0,35}(?:nao estic|nao estend|perdeu extensao|falta extensao)|(?:nao estic|nao estend|perdeu extensao).{0,35}cotovelo/.test(t);\n    const articularBruto=/(?:cotovelo).{0,70}(?:trav|bloque|rigid|range|crepit)|(?:trav|bloque|rigid|range|crepit).{0,70}cotovelo/.test(t);\n    const articular=perdaExtensao||(articularBruto&&!negado('trav\\\\w*|bloque\\\\w*|rigid\\\\w*|range\\\\w*|crepit\\\\w*'));\n    const olecrano=/(?:bola|caroco).{0,60}(?:ponta|olecrano|cotovelo)|(?:ponta|olecrano).{0,60}(?:bola|caroco)/.test(t)||((?:/(?:inch|edema)/.test(t)&&!negado('inch\\\\w*|edema'))&&/(?:ponta|atras do cotovelo|olecrano)/.test(t));"
)
replace_once(
    elbow,
    "    const perdaSupinacao=/(?:perdeu|perda|muita|grande).{0,35}(?:forca).{0,55}(?:supin|palma para cima)|(?:supin).{0,55}(?:perdeu|perda).{0,30}(?:forca)/.test(t);\n    const febrePositiva=/(?:febre|calafrio)/.test(t)&&!negado('febre')&&!negado('calafrio');\n    const sinaisInfeccao=[/(?:vermelh|rubor)/.test(t),/(?:quente|calor)/.test(t),/(?:inch|edema)/.test(t)].filter(Boolean).length;",
    "    const perdaSupinacao=/(?:perdeu|perda|muita|grande).{0,35}(?:forca).{0,55}(?:supin|palma para cima)|(?:supin).{0,55}(?:perdeu|perda).{0,30}(?:forca)/.test(t)&&!negado('(?:perdeu|perda).{0,20}forca');\n    const febrePositiva=/(?:febre|calafrio)/.test(t)&&!negado('febre')&&!negado('calafrio');\n    const sinaisInfeccao=[/(?:vermelh|rubor)/.test(t)&&!negado('vermelh\\\\w*|rubor'),/(?:quente|calor)/.test(t)&&!negado('quente|calor'),/(?:inch|edema)/.test(t)&&!negado('inch\\\\w*|edema')].filter(Boolean).length;"
)
replace_once(
    elbow,
    "      if(febrePositiva&&sinaisInfeccao>=1)score+=5.4;\n      else if(febrePositiva&&/cotovelo/.test(t))score+=4.2;\n      if(inflamacaoLocal)score+=2.6;",
    "      if(febrePositiva&&sinaisInfeccao>=1)score+=5.4;\n      if(inflamacaoLocal)score+=2.6;\n      if(febrePositiva&&sinaisInfeccao===0)score-=2.5;"
)
replace_once(
    elbow,
    "    if(cond.id==='cotovelo_tunel_radial'&&/(?:mais para baixo|distal|antebraco).{0,60}(?:epicond|lateral)|(?:lateral).{0,60}antebraco/.test(t)&&cargaSupinacao)score+=3.2;",
    "    if(cond.id==='cotovelo_tunel_radial'&&padraoRadialDistal&&cargaSupinacao)score+=3.2;"
)
replace_once(
    elbow,
    "    const evidenciaForte=cond.id==='cotovelo_lateral'?(localLateral&&cargaExtensoraPositiva&&!rotuloTendineoIsolado):cond.id==='cotovelo_medial'?(localMedial&&(cargaFlexorPronadora||(digitosUlnares&&!cargaFlexorPronadoraNegada))&&!rotuloTendineoIsolado):true;",
    "    if(cond.id==='cotovelo_plri'&&(instabilidadeNegada||historiaRemotaResolvida)){score=-5;hits=[];}\n    if(cond.id==='cotovelo_trauma_maior'&&historiaRemotaResolvida){score=-5;hits=[];}\n    if(cond.id==='cotovelo_ulnar'&&parestesiaNegada){score=-5;hits=[];}\n    if(cond.id==='cotovelo_ruptura_biceps_distal'&&negado('estalo|hematoma|equimose|perda.{0,20}forca')&&!perdaSupinacao){score=-5;hits=[];}\n    const evidenciaForte=cond.id==='cotovelo_lateral'?(localLateral&&cargaExtensoraPositiva&&!rotuloTendineoIsolado):cond.id==='cotovelo_medial'?(localMedial&&(cargaFlexorPronadora||(digitosUlnares&&!cargaFlexorPronadoraNegada))&&!rotuloTendineoIsolado):true;"
)

# -----------------------------------------------------------------------------
# PUNHO/MÃO — negação, linguagem popular e distinção de história remota.
# -----------------------------------------------------------------------------
wrist = 'clinical_reasoning_wrist-3.1.0.js'
replace_once(wrist, "const VERSION='3.1.1-wrist2';", "const VERSION='3.1.2-wrist3';")
replace_once(
    wrist,
    "const n=(v='')=>String(v||'').normalize('NFD').replace(/[\\u0300-\\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,' ').replace(/\\s+/g,' ').trim();",
    "const n=(v='')=>String(v||'').normalize('NFD').replace(/[\\u0300-\\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,' ').replace(/\\s+/g,' ').trim().replace(/\\bdedao\\b/g,'polegar').replace(/\\bdedo do meio\\b/g,'medio').replace(/\\bn\\b/g,'nao');"
)
replace_once(
    wrist,
    "  function negado(t,padrao){return new RegExp('(?:sem|nega|negou|nao houve|nao tem|nao sinto).{0,28}(?:'+padrao+')').test(t);}",
    "  function negado(t,padrao){return new RegExp('(?:sem|nega(?:do|ou)?|nao(?:\\\\s+(?:houve|tem|tenho|teve|tive|sinto|sente|esta|estou|ficou|e))?|nem)\\\\s*.{0,38}(?:'+padrao+')').test(t);}"
)
replace_once(
    wrist,
    "const t=n(texto), hits=hit(t,cond.termos);let score=Math.min(2.4,hits.length*1.2);const add=(v,m)=>{score+=v;if(m)hits.push(m);};",
    "const t=n(texto);let hits=hit(t,cond.termos);let score=Math.min(2.4,hits.length*1.2);const add=(v,m)=>{score+=v;if(m)hits.push(m);};"
)
replace_once(
    wrist,
    "    const mediano=/(polegar.{0,35}(indicador|medio)|(indicador|medio).{0,35}polegar)/.test(t)&&/(formig|dormen|adormec)/.test(t);\n    const ulnar=/(anelar|mindinho|quarto|quinto|4o|5o).{0,45}(formig|dormen|adormec)|(formig|dormen|adormec).{0,45}(anelar|mindinho|quarto|quinto|4o|5o)/.test(t);",
    "    const parestesiaMedianaNegada=/(?:sem|nao(?:\\s+(?:tenho|tem|sinto|sente))?|nem).{0,55}(?:formig|dormen|adormec).{0,70}(?:polegar|indicador|medio)|(?:sem|nao(?:\\s+(?:tenho|tem|sinto|sente))?).{0,70}(?:polegar|indicador|medio).{0,45}(?:formig|dormen|adormec)/.test(t);\n    const parestesiaUlnarNegada=/(?:sem|nao(?:\\s+(?:tenho|tem|sinto|sente))?|nem).{0,55}(?:formig|dormen|adormec).{0,70}(?:anelar|mindinho|quarto|quinto|4o|5o)|(?:sem|nao(?:\\s+(?:tenho|tem|sinto|sente))?).{0,70}(?:anelar|mindinho|quarto|quinto|4o|5o).{0,45}(?:formig|dormen|adormec)/.test(t);\n    const mediano=/(polegar.{0,35}(indicador|medio)|(indicador|medio).{0,35}polegar)/.test(t)&&/(formig|dormen|adormec)/.test(t)&&!parestesiaMedianaNegada;\n    const ulnar=/(anelar|mindinho|quarto|quinto|4o|5o).{0,45}(formig|dormen|adormec)|(formig|dormen|adormec).{0,45}(anelar|mindinho|quarto|quinto|4o|5o)/.test(t)&&!parestesiaUlnarNegada;"
)
replace_once(
    wrist,
    "    const labelOnly=/(medico|doutor|laudo|exame).{0,35}(falou|disse|mostrou|deu).{0,35}(tunel do carpo|tfcc|tendinite|de quervain)/.test(t)&&!/(formig|dormen|radial|ulnar|tabaqueira|base do polegar|trauma|queda|noite|dirig|carga|movimento)/.test(t.replace(/tunel do carpo|tfcc|tendinite|de quervain/g,''));",
    "    const labelOnly=/(medico|doutor|laudo|exame).{0,35}(falou|disse|mostrou|deu).{0,35}(tunel do carpo|tfcc|tendinite|de quervain)/.test(t)&&!/(formig|dormen|radial|ulnar|tabaqueira|base do polegar|trauma|queda|noite|dirig|carga|movimento)/.test(t.replace(/tunel do carpo|tfcc|tendinite|de quervain/g,''));\n    const historiaRemotaResolvida=/(?:ha\\s+)?\\d+\\s+anos?\\b|anos?\\s+atras/.test(t)&&/(?:alta|sem sequela|recuperei|recuperou|fiquei\\s+(?:bem|bom)|resolvido)/.test(t);\n    const vascularNegado=negado(t,'fria|frio|palida|palido|roxa|azulada|cianose|sem pulso|perdeu o pulso');\n    const compartimentalNegado=negado(t,'tenso|dura|desproporcional|insuportavel')||/(?:esticar|alongar).{0,25}dedos.{0,30}(?:nao piora|nao doi|sem dor)/.test(t);\n    const crpsNegado=negado(t,'desproporcional|alodinia|doi ate ao toque|dor ate ao toque')&&negado(t,'muda de cor|temperatura|sua|sudorese|edema');"
)
replace_once(
    wrist,
    "    if(cond.id==='punho_compartimental'&&trauma&&/(tenso|dura|desproporcional|insuportavel|esticar os dedos|alongamento passivo)/.test(t))add(5.7,'trauma + padrão compartimental');\n    if(cond.id==='punho_vascular_agudo'&&(/\\b(fria|frio|palida|palido|roxa|azulada|cianose)\\b/.test(t)||/sem pulso|perdeu o pulso/.test(t)))add(6,'alteração vascular distal');",
    "    const compartimentalPositivo=/(tenso|dura|desproporcional|insuportavel)/.test(t)&&!compartimentalNegado||/(?:dor|piora).{0,30}(?:esticar os dedos|alongamento passivo)|(?:esticar os dedos|alongamento passivo).{0,30}(?:doi|piora)/.test(t);\n    if(cond.id==='punho_compartimental'&&trauma&&compartimentalPositivo)add(5.7,'trauma + padrão compartimental');\n    if(cond.id==='punho_vascular_agudo'&&(/\\b(fria|frio|palida|palido|roxa|azulada|cianose)\\b/.test(t)||/sem pulso|perdeu o pulso/.test(t))&&!vascularNegado)add(6,'alteração vascular distal');"
)
replace_once(
    wrist,
    "    if(cond.id==='fratura_radio_distal_reabilitacao'&&/(fratura|quebrei|quebrou|gesso|placa).{0,45}(punho|radio)|(punho|radio).{0,45}(fratura|gesso|placa)/.test(t))add(4.2,'fratura de punho/rádio distal');",
    "    if(cond.id==='fratura_radio_distal_reabilitacao'&&!historiaRemotaResolvida&&/(fratura|quebrei|quebrou|gesso|placa).{0,45}(punho|radio)|(punho|radio).{0,45}(fratura|gesso|placa)/.test(t))add(4.2,'fratura de punho/rádio distal');"
)
replace_once(
    wrist,
    "    if(cond.id==='pos_operatorio_tendao_mao'&&/(cirurgia|reparo|sutura|pos operatorio).{0,55}(tendao|flexor|extensor)|(tendao|flexor|extensor).{0,55}(cirurgia|reparo|sutura)/.test(t))add(5.5,'pós-reparo tendíneo');\n    if(cond.id==='punho_crps'&&/(desproporcional|alodinia|doi ate ao toque|dor ate ao toque)/.test(t)&&/(muda de cor|temperatura|sua|sudorese|edema)/.test(t))add(5.5,'dor desproporcional + alteração autonômica');\n    return {score:score+cond.ordem/1000,hits:uniq(hits).slice(0,6)};",
    "    if(cond.id==='pos_operatorio_tendao_mao'&&!historiaRemotaResolvida&&/(cirurgia|reparo|sutura|pos operatorio).{0,55}(tendao|flexor|extensor)|(tendao|flexor|extensor).{0,55}(cirurgia|reparo|sutura)/.test(t))add(5.5,'pós-reparo tendíneo');\n    const crpsDor=/(desproporcional|alodinia|doi ate ao toque|dor ate ao toque)/.test(t)&&!negado(t,'desproporcional|alodinia|doi ate ao toque|dor ate ao toque');\n    const crpsAutonomico=/(muda de cor|temperatura|sua|sudorese|edema)/.test(t)&&!negado(t,'muda de cor|temperatura|sua|sudorese|edema');\n    if(cond.id==='punho_crps'&&crpsDor&&crpsAutonomico)add(5.5,'dor desproporcional + alteração autonômica');\n    if(cond.id==='tunel_carpo'&&parestesiaMedianaNegada){score=-5;hits=[];}\n    if(cond.id==='punho_ulnar_guyon'&&parestesiaUlnarNegada){score=-5;hits=[];}\n    if(cond.id==='punho_vascular_agudo'&&vascularNegado){score=-5;hits=[];}\n    if(cond.id==='punho_compartimental'&&compartimentalNegado&&!compartimentalPositivo){score=-5;hits=[];}\n    if(cond.id==='punho_crps'&&crpsNegado){score=-5;hits=[];}\n    if((cond.id==='fratura_radio_distal_reabilitacao'||cond.id==='pos_operatorio_tendao_mao')&&historiaRemotaResolvida){score=-5;hits=[];}\n    return {score:score+cond.ordem/1000,hits:uniq(hits).slice(0,6)};"
)

print('Chaos hardening patches applied.')
