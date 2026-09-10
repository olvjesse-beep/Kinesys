from pathlib import Path

shoulder = Path('clinical_reasoning_shoulder-3.1.0.js')
s = shoulder.read_text(encoding='utf-8')
s = s.replace("const VERSION='3.1.2-shoulder3';", "const VERSION='3.1.3-shoulder4';", 1)
start = s.index('  function pontuar(cond,texto,c){')
end = s.index('\n\n  function itemBancoPorCondicao', start)
novo = r'''  function pontuar(cond,texto,c){
    const t=norm(texto);
    const hits=arr(VOCABULARIO_COMPILADO[cond.id]).filter(x=>x.normalizado&&t.includes(x.normalizado)).map(x=>x.raw);
    let score=Math.min(9,hits.length*1.35);
    const idade=Number(c?.idade||document.getElementById('paciente_idade')?.value||0);
    const temOmbro=/ombro|braco|deltoid|escapul/.test(t);
    const trauma=/(?:cai|caiu|queda|pancad|impact|acidente|lux|desloc)/.test(t)&&temOmbro;
    const incapacidadeAguda=/(?:nao consegue|nao levanta|deform|pendurado|perdeu.{0,20}forca|fraqueza.{0,20}repente)/.test(t);
    const neuroDistal=/(?:formig|dormen|adormec|amortec|choque).{0,55}(?:mao|dedo|polegar|indicador|anelar|mindinho)|(?:mao|dedo|polegar|indicador|anelar|mindinho).{0,55}(?:formig|dormen|adormec|amortec|choque)/.test(t);
    const cervicalLigada=/(?:pescoco|nuca|cervic).{0,80}(?:ombro|braco|mao|dedo)|(?:virar|mexer|olhar).{0,30}(?:pescoco|cima).{0,80}(?:dor|braco|mao)/.test(t);
    const elevacao=/(?:levantar|levanto|elev|ergu|acima da cabeca|no alto|prateleira|armario)/.test(t);
    const lateral=/(?:lateral|lado de fora|deltoid)/.test(t);
    const decubito=/(?:dormir|deitar|apoiar).{0,45}(?:ombro|braco)|(?:ombro|braco).{0,45}(?:dormir|deitar|apoiar)/.test(t);
    const acSuperior=/(?:ossinho|clavicul|topo|em cima|ponta).{0,35}ombro|ombro.{0,35}(?:ossinho|clavicul|topo|ponta)/.test(t);
    const cruzarBraco=/(?:mao|braco).{0,35}(?:ombro contrario|outro ombro)|(?:cruzar|abracar).{0,30}braco/.test(t);
    const perdaAtivaPassiva=/(?:nao consegue).{0,35}(?:erguer|levantar).{0,55}(?:alguem|outra pessoa|passiv)|(?:alguem|outra pessoa|passiv).{0,55}(?:consegue|levanta).{0,45}braco/.test(t);

    if(cond.id==='ombro_pmr'&&idade>=50)score+=2;
    if(cond.id==='ombro_capsulite'&&(c?.diabetico||/diabet|tireo/.test(t)))score+=1.3;
    if(cond.id==='ombro_trauma_maior'&&trauma)score+=incapacidadeAguda?4.2:2.8;
    if(cond.id==='ombro_cervical_referida'){
      if(neuroDistal)score+=3.1;
      if(cervicalLigada)score+=2.2;
    }
    if(cond.id==='ombro_manguito'&&temOmbro){
      if(elevacao&&lateral)score+=3.2;
      else if(elevacao&&/(dor|doi)/.test(t))score+=2.7;
      if(decubito&&/(dor|doi)/.test(t))score+=1.2;
    }
    if(cond.id==='ombro_ac'){
      if(acSuperior)score+=2.9;
      if(cruzarBraco)score+=1.7;
    }
    if(cond.id==='ombro_ruptura_manguito'&&perdaAtivaPassiva)score+=4;
    return {score:score+cond.ordem/1000,hits:hits.slice(0,5)};
  }'''
s = s[:start] + novo + s[end:]
shoulder.write_text(s, encoding='utf-8')

elbow = Path('clinical_reasoning_elbow-3.1.0.js')
e = elbow.read_text(encoding='utf-8')
e = e.replace("const VERSION='3.1.0-elbow1';", "const VERSION='3.1.1-elbow2';", 1)
start = e.index('  function pontuar(cond,texto){')
end = e.index('\n  function itemBancoPorCondicao', start)
novo = r'''  function pontuar(cond,texto){
    const t=norm(texto);const hits=contem(texto,cond.termos).slice(0,6);let score=Math.min(9,hits.length*1.35);
    const negado=(termo)=>new RegExp(`(?:sem|nega|negou|nao tem|nao apresenta)\\s+(?:sinais?\\s+de\\s+)?${termo}`).test(t);
    const relacaoOmbro=/ombro.{0,70}(?:cotovelo|braco)|(?:cotovelo|braco).{0,70}ombro/.test(t);
    const distal=/(?:passa|ultrapassa|vai|chega).{0,35}(?:cotovelo).{0,55}(?:mao|dedo|polegar|indicador|anelar|mindinho)|(?:ate).{0,20}(?:mao|dedo|polegar|indicador|anelar|mindinho)/.test(t);
    const neuroDistal=/(?:formig|dormen|adormec|amortec|choque).{0,55}(?:mao|dedo|polegar|indicador|anelar|mindinho)|(?:mao|dedo|polegar|indicador|anelar|mindinho).{0,55}(?:formig|dormen|adormec|amortec|choque)/.test(t);
    const cervicalLigada=/(?:pescoco|nuca|cervic).{0,90}(?:braco|cotovelo|mao|dedo)|(?:mexer|virar|olhar).{0,35}(?:pescoco|cima).{0,90}(?:dor|braco|cotovelo|mao)/.test(t);
    const localLateral=/(?:lateral|lado de fora|epicondilo lateral).{0,55}(?:cotovelo|antebraco)|(?:cotovelo).{0,55}(?:apert|carreg|segur|punho|xicara|sacola)/.test(t);
    const localMedial=/(?:medial|lado de dentro|epicondilo medial).{0,55}cotovelo|cotovelo.{0,55}(?:medial|lado de dentro)/.test(t);
    const digitosUlnares=/(?:quarto|quinto|4o|5o|anelar|mindinho).{0,55}(?:formig|dormen|adormec|amortec|choque)|(?:formig|dormen|adormec|amortec|choque).{0,55}(?:quarto|quinto|4o|5o|anelar|mindinho)/.test(t);
    const flexaoApoio=/(?:dobrad|flex|apoi).{0,45}(?:cotovelo)|cotovelo.{0,45}(?:dobrad|flex|apoi)/.test(t);
    const trauma=/(?:cai|caiu|queda|pancad|trauma|impact|lux|saiu do lugar|deform)/.test(t)&&/cotovelo/.test(t);
    const incapacidadeTrauma=/(?:deform|nao consegue|nao mexe|incapac|edema rapido)/.test(t);
    const arremessoValgo=/(?:arremess|pitcher|valgo).{0,70}(?:cotovelo|medial)|(?:cotovelo|medial).{0,70}(?:arremess|valgo)/.test(t);
    const tricepsCarga=/(?:atras|posterior|triceps).{0,55}cotovelo|cotovelo.{0,55}(?:atras|posterior|triceps)/.test(t)&&/(?:estend|empurr|supino|flexao de braco)/.test(t);
    const articular=/(?:cotovelo).{0,70}(?:trav|bloque|rigid|nao estic|range|crepit)|(?:trav|bloque|rigid|nao estic|range|crepit).{0,70}cotovelo/.test(t);
    const olecrano=/(?:bola|caroco|inch|edema).{0,60}(?:ponta|atras|olecrano|cotovelo)|(?:ponta|atras|olecrano).{0,60}(?:bola|caroco|inch|edema)/.test(t);
    const bicepsLocal=/(?:frente|fossa cubital|biceps).{0,55}cotovelo|cotovelo.{0,55}(?:frente|fossa cubital|biceps)/.test(t);
    const cargaSupinacao=/(?:supin|palma para cima|rosca)/.test(t);
    const estaloPositivo=/(?:estalo|rasgou)/.test(t)&&!negado('estalo');
    const hematomaPositivo=/(?:hematoma|equimose)/.test(t)&&!negado('hematoma')&&!negado('equimose');
    const perdaSupinacao=/(?:perdeu|perda|muita|grande).{0,35}(?:forca).{0,55}(?:supin|palma para cima)|(?:supin).{0,55}(?:perdeu|perda).{0,30}(?:forca)/.test(t);
    const febrePositiva=/(?:febre|calafrio)/.test(t)&&!negado('febre')&&!negado('calafrio');
    const inflamacaoLocal=/(?:vermelh|rubor)/.test(t)&&/(?:quente|calor)/.test(t)&&/(?:inch|edema)/.test(t);

    if(cond.id==='cotovelo_ombro_referida'&&relacaoOmbro){score+=2.8;hits.push('relação proximal ombro–braço/cotovelo');}
    if(cond.id==='cotovelo_ombro_referida'&&/bursite.{0,35}ombro|ombro.{0,35}bursite|manguito|supraespinhal/.test(t))score+=1.2;
    if(cond.id==='cotovelo_ombro_referida'&&(distal||neuroDistal||cervicalLigada))score-=2.2;
    if(cond.id==='cotovelo_ombro_referida'&&localLateral&&/(apert|punho|preens|segur|carreg)/.test(t))score-=1.1;

    if(cond.id==='cotovelo_cervical_neural'){
      if(neuroDistal||distal)score+=3.2;
      if(cervicalLigada)score+=2.4;
    }
    if(cond.id==='cotovelo_lateral'&&localLateral)score+=2.8;
    if(cond.id==='cotovelo_medial'&&localMedial)score+=2.8;
    if(cond.id==='cotovelo_ulnar'){
      if(digitosUlnares)score+=3.4;
      if(digitosUlnares&&flexaoApoio)score+=1.2;
    }
    if(cond.id==='cotovelo_ruptura_biceps_distal'){
      const marcadores=[estaloPositivo,hematomaPositivo,perdaSupinacao].filter(Boolean).length;
      if(marcadores>=2)score+=5.2;else if(marcadores===1&&bicepsLocal)score+=2.7;
    }
    if(cond.id==='cotovelo_infeccao_articular'){
      if(febrePositiva&&/cotovelo|inch|vermelh|quente/.test(t))score+=3.8;
      if(inflamacaoLocal)score+=2.4;
      if(negado('febre')&&!inflamacaoLocal)score-=4;
    }
    if(cond.id==='cotovelo_trauma_maior'&&trauma)score+=incapacidadeTrauma?4.5:3;
    if(cond.id==='cotovelo_ucl'&&arremessoValgo)score+=3.8;
    if(cond.id==='cotovelo_triceps_posterior'&&tricepsCarga)score+=3.3;
    if(cond.id==='cotovelo_articular'&&articular)score+=3.4;
    if(cond.id==='cotovelo_olecrano'&&olecrano)score+=3.1;
    if(cond.id==='cotovelo_biceps_distal'&&bicepsLocal&&cargaSupinacao)score+=2.9;
    if(cond.id==='cotovelo_tunel_radial'&&/(?:mais para baixo|distal|antebraco).{0,60}(?:epicond|lateral)|(?:lateral).{0,60}antebraco/.test(t)&&cargaSupinacao)score+=3.2;
    return {score:score+cond.ordem/1000,hits:uniq(hits).slice(0,6)};
  }'''
e = e[:start] + novo + e[end:]
elbow.write_text(e, encoding='utf-8')
