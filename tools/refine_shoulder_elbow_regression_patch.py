from pathlib import Path
import runpy

# Apply the first hardening pass in the runner workspace, then refine edge cases.
runpy.run_path('tools/harden_shoulder_elbow_from_regression.py', run_name='__main__')

p = Path('clinical_reasoning_shoulder-3.1.0.js')
s = p.read_text(encoding='utf-8')
s = s.replace(
    "    const trauma=/(?:cai|caiu|queda|pancad|impact|acidente|lux|desloc)/.test(t)&&temOmbro;",
    "    const traumaMecanismo=/\\b(?:cai|caiu|cair|queda|impacto|acidente|luxacao|deslocou|deslocamento)\\b|\\bpancad\\w*/.test(t);\n    const traumaNegado=/(?:sem|nega|negou|nao houve).{0,18}(?:cair|queda|trauma|pancad|impacto)/.test(t);\n    const trauma=traumaMecanismo&&!traumaNegado&&temOmbro;",
    1
)
s = s.replace(
    "    const acSuperior=/(?:ossinho|clavicul|topo|em cima|ponta).{0,35}ombro|ombro.{0,35}(?:ossinho|clavicul|topo|ponta)/.test(t);",
    "    const acSuperior=/(?:ossinho|clavicul|topo|ponta).{0,35}ombro|ombro.{0,35}(?:ossinho|clavicul|topo|ponta)/.test(t);",
    1
)
s = s.replace(
    "    const perdaAtivaPassiva=/(?:nao consegue).{0,35}(?:erguer|levantar).{0,55}(?:alguem|outra pessoa|passiv)|(?:alguem|outra pessoa|passiv).{0,55}(?:consegue|levanta).{0,45}braco/.test(t);",
    "    const passivoPreservado=/(?:passiv).{0,30}(?:preserv|livre|vai|consegue)|(?:alguem consegue|outra pessoa consegue|levanto com a outra mao).{0,45}(?:levantar|erguer|braco)/.test(t)&&!/(?:alguem|outra pessoa).{0,25}(?:tambem )?nao consegue/.test(t);\n    const perdaAtivaPassiva=/(?:nao consigo|nao consegue).{0,40}(?:erguer|levantar)|(?:braco despenca|nao sustenta o braco)/.test(t)&&passivoPreservado;",
    1
)
p.write_text(s, encoding='utf-8')

p = Path('clinical_reasoning_elbow-3.1.0.js')
e = p.read_text(encoding='utf-8')
e = e.replace(
    "    const negado=(termo)=>new RegExp(`(?:sem|nega|negou|nao tem|nao apresenta)\\\\s+(?:sinais?\\\\s+de\\\\s+)?${termo}`).test(t);",
    "    const negado=(termo)=>new RegExp(`(?:(?:sem|nega|negou|nao tem|nao apresenta)\\\\s+(?:sinais?\\\\s+de\\\\s+)?|nem\\\\s+)${termo}`).test(t);",
    1
)
e = e.replace(
    "    const localLateral=/(?:lateral|lado de fora|epicondilo lateral).{0,55}(?:cotovelo|antebraco)|(?:cotovelo).{0,55}(?:apert|carreg|segur|punho|xicara|sacola)/.test(t);",
    "    const lateralAnatomica=/(?:lateral|lado de fora|epicondilo lateral).{0,28}cotovelo|cotovelo.{0,28}(?:lateral|lado de fora|epicondilo lateral)/.test(t);\n    const cargaExtensoraLocal=/(?:cotovelo).{0,65}(?:apert|preens|estend.{0,12}punho)|(?:apert|preens|estend.{0,12}punho).{0,65}cotovelo/.test(t);\n    const localLateral=lateralAnatomica||cargaExtensoraLocal;",
    1
)
e = e.replace(
    "    const trauma=/(?:cai|caiu|queda|pancad|trauma|impact|lux|saiu do lugar|deform)/.test(t)&&/cotovelo/.test(t);",
    "    const traumaMecanismo=/\\b(?:cai|caiu|cair|queda|trauma|impacto|acidente|luxacao)\\b|\\bpancad\\w*|saiu do lugar|deform/.test(t);\n    const traumaNegado=/(?:sem|nega|negou|nao houve).{0,18}(?:cair|queda|trauma|pancad|impacto)/.test(t);\n    const trauma=traumaMecanismo&&!traumaNegado&&/cotovelo/.test(t);",
    1
)
e = e.replace(
    "    const inflamacaoLocal=/(?:vermelh|rubor)/.test(t)&&/(?:quente|calor)/.test(t)&&/(?:inch|edema)/.test(t);",
    "    const sinaisInfeccao=[/(?:vermelh|rubor)/.test(t),/(?:quente|calor)/.test(t),/(?:inch|edema)/.test(t)].filter(Boolean).length;\n    const inflamacaoLocal=sinaisInfeccao>=3;",
    1
)
e = e.replace(
    "      if(febrePositiva&&/cotovelo|inch|vermelh|quente/.test(t))score+=3.8;\n      if(inflamacaoLocal)score+=2.4;",
    "      if(febrePositiva&&sinaisInfeccao>=1)score+=5.4;\n      else if(febrePositiva&&/cotovelo/.test(t))score+=4.2;\n      if(inflamacaoLocal)score+=2.6;",
    1
)
e = e.replace(
    "    if(cond.id==='cotovelo_ucl'&&arremessoValgo)score+=3.8;",
    "    if(cond.id==='cotovelo_ucl'&&arremessoValgo)score+=/valgo/.test(t)?5.2:4.5;\n    if(cond.id==='cotovelo_medial'&&arremessoValgo&&!/(?:flexion|flexao|pron|punho)/.test(t))score-=1.1;",
    1
)
e = e.replace(
    "    if(!fortes.length)fortes=avaliadas.filter(x=>['cotovelo_lateral','cotovelo_medial','cotovelo_ombro_referida','cotovelo_cervical_neural'].includes(x.cond.id)).slice(0,4);\n",
    "",
    1
)
p.write_text(e, encoding='utf-8')

# Strengthen the regression suite against false positives discovered in the first pass.
t = Path('tests/clinical_reasoning_shoulder_elbow.regression.js')
s = t.read_text(encoding='utf-8')
s = s.replace(
    "{id:'O02-manguito-decubito',hma:'Quando durmo em cima do braço o ombro dói na lateral e piora para elevar.',regioes:['ombro'],aplicar:['ombro'],inclui:{ombro:['ombro_manguito']},pergunta:/deitar\\/dormir sobre o braço ou ombro/i}",
    "{id:'O02-manguito-decubito',hma:'Quando durmo em cima do braço o ombro dói na lateral e piora para elevar.',regioes:['ombro'],aplicar:['ombro'],inclui:{ombro:['ombro_manguito']},naoInclui:{ombro:['ombro_ac']},pergunta:/deitar\\/dormir sobre o braço ou ombro/i}",
    1
)
s = s.replace(
    "{id:'O03-capsulite',hma:'Foi travando aos poucos. Não consigo coçar as costas e outra pessoa também não consegue levantar meu braço direito.',regioes:['ombro'],aplicar:['ombro'],inclui:{ombro:['ombro_capsulite']},top:{ombro:'ombro_capsulite'}}",
    "{id:'O03-capsulite',hma:'Foi travando aos poucos. Não consigo coçar as costas e outra pessoa também não consegue levantar meu braço direito.',regioes:['ombro'],aplicar:['ombro'],inclui:{ombro:['ombro_capsulite']},naoInclui:{ombro:['ombro_ruptura_manguito']},top:{ombro:'ombro_capsulite'}}",
    1
)
s = s.replace(
    "{id:'O10-calcaria',hma:'Raio X mostrou cálcio no ombro e tive uma crise de dor muito forte de repente sem cair.',regioes:['ombro'],aplicar:['ombro'],inclui:{ombro:['ombro_calcaria']},top:{ombro:'ombro_calcaria'}}",
    "{id:'O10-calcaria',hma:'Raio X mostrou cálcio no ombro e tive uma crise de dor muito forte de repente sem cair.',regioes:['ombro'],aplicar:['ombro'],inclui:{ombro:['ombro_calcaria']},naoInclui:{ombro:['ombro_trauma_maior']},top:{ombro:'ombro_calcaria'}}",
    1
)
s = s.replace(
    "{id:'C03-medial',hma:'Dor do lado de dentro do cotovelo; piora para flexionar o punho e pronar contra força.',regioes:['cotovelo'],aplicar:['cotovelo'],inclui:{cotovelo:['cotovelo_medial']},top:{cotovelo:'cotovelo_medial'}}",
    "{id:'C03-medial',hma:'Dor do lado de dentro do cotovelo; piora para flexionar o punho e pronar contra força.',regioes:['cotovelo'],aplicar:['cotovelo'],inclui:{cotovelo:['cotovelo_medial']},naoInclui:{cotovelo:['cotovelo_lateral']},top:{cotovelo:'cotovelo_medial'}}",
    1
)
s = s.replace(
    "{id:'C05-biceps-distal',hma:'Dor na frente do cotovelo para fazer rosca e virar a palma para cima, sem estalo nem hematoma.',regioes:['cotovelo'],aplicar:['cotovelo'],inclui:{cotovelo:['cotovelo_biceps_distal']}}",
    "{id:'C05-biceps-distal',hma:'Dor na frente do cotovelo para fazer rosca e virar a palma para cima, sem estalo nem hematoma.',regioes:['cotovelo'],aplicar:['cotovelo'],inclui:{cotovelo:['cotovelo_biceps_distal']},naoInclui:{cotovelo:['cotovelo_ruptura_biceps_distal']}}",
    1
)
s = s.replace(
    "{id:'C08-ucl',hma:'Sou arremessador e tenho dor medial no cotovelo durante o arremesso, principalmente com carga em valgo.',regioes:['cotovelo'],aplicar:['cotovelo'],inclui:{cotovelo:['cotovelo_ucl']}}",
    "{id:'C08-ucl',hma:'Sou arremessador e tenho dor medial no cotovelo durante o arremesso, principalmente com carga em valgo.',regioes:['cotovelo'],aplicar:['cotovelo'],inclui:{cotovelo:['cotovelo_ucl']},top:{cotovelo:'cotovelo_ucl'}}",
    1
)
s = s.replace(
    "{id:'C07-olecrano',hma:'Formou uma bola na ponta do cotovelo depois de ficar apoiando ele na mesa; está inchado atrás mas sem febre.',regioes:['cotovelo'],aplicar:['cotovelo'],inclui:{cotovelo:['cotovelo_olecrano']}}",
    "{id:'C07-olecrano',hma:'Formou uma bola na ponta do cotovelo depois de ficar apoiando ele na mesa; está inchado atrás mas sem febre.',regioes:['cotovelo'],aplicar:['cotovelo'],inclui:{cotovelo:['cotovelo_olecrano']},naoInclui:{cotovelo:['cotovelo_infeccao_articular']}}",
    1
)
s = s.replace(
    "{id:'M01-ombro-para-cotovelo',hma:'A dor começa no ombro, desce pela lateral do braço e vai até o cotovelo; levantar o braço piora.',regioes:['ombro','cotovelo'],aplicar:['ombro','cotovelo'],inclui:{ombro:['ombro_manguito'],cotovelo:['cotovelo_ombro_referida']},correlacao:true,registros:{ombro:true,cotovelo:true,legacy:'ombro'}}",
    "{id:'M01-ombro-para-cotovelo',hma:'A dor começa no ombro, desce pela lateral do braço e vai até o cotovelo; levantar o braço piora.',regioes:['ombro','cotovelo'],aplicar:['ombro','cotovelo'],inclui:{ombro:['ombro_manguito'],cotovelo:['cotovelo_ombro_referida']},naoInclui:{cotovelo:['cotovelo_lateral']},correlacao:true,registros:{ombro:true,cotovelo:true,legacy:'ombro'}}",
    1
)
s = s.replace(
    "{id:'M06-arremesso-cadeia',hma:'No arremesso sinto dor medial no cotovelo e também desconforto no ombro quando armo o braço.',regioes:['ombro','cotovelo'],aplicar:['ombro','cotovelo'],inclui:{cotovelo:['cotovelo_ucl']},correlacao:true}",
    "{id:'M06-arremesso-cadeia',hma:'No arremesso sinto dor medial no cotovelo e também desconforto no ombro quando armo o braço.',regioes:['ombro','cotovelo'],aplicar:['ombro','cotovelo'],inclui:{cotovelo:['cotovelo_ucl']},top:{cotovelo:'cotovelo_ucl'},correlacao:true}",
    1
)
t.write_text(s, encoding='utf-8')
