/* Metadados de investigação, não clusters diagnósticos nem probabilidades.
 * Fontes primárias/consensos: limites explícitos e nenhum limiar inventado.
 * Este catálogo suplementa os bancos regionais sem reescrever os fragmentos gerados. */
(function(root){
 'use strict';
 const fontes={
  plantar:{titulo:'JOSPT — Heel Pain / Plantar Fasciitis, 2023',url:'https://doi.org/10.2519/jospt.2023.0303',tipo:'diretriz',limite:'Padrão de história e exame; primeiros passos isoladamente não localizam a dor nem confirmam fasciopatia.'},
  aquiles:{titulo:'JOSPT — Midportion Achilles Tendinopathy, 2024',url:'https://doi.org/10.2519/jospt.2024.0302',tipo:'diretriz',limite:'Diretriz para a porção média do Aquiles; localização, carga e exame precisam concordar. Dor posterior isolada não define tendinopatia nem sua localização no tendão.'},
  entorse:{titulo:'JOSPT — Lateral Ankle Ligament Sprains, 2021',url:'https://doi.org/10.2519/jospt.2021.0302',tipo:'diretriz',limite:'História, exame, função e diagnósticos diferenciais; trauma prévio não equivale a lesão aguda atual.'},
  fibulares:{titulo:'ESSKA-AFAS — Peroneal Tendon Pathologies, 2018',url:'https://pmc.ncbi.nlm.nih.gov/articles/PMC6154028/',tipo:'consenso',limite:'Evidência limitada para vários testes; diferenciar tendão, ligamento e instabilidade tendínea sem confirmação por contagem.'},
  imagem:{titulo:'ACR — Acute Trauma to the Ankle, 2020',url:'https://pubmed.ncbi.nlm.nih.gov/33153549/',tipo:'diretriz_imagem',limite:'Necessidade de imagem depende de trauma, exame e aplicabilidade das regras; não calcular Ottawa a partir de HMA incompleta.'},
  sinus:{titulo:'Sinus Tarsi Syndrome — Critical Review, 2023',url:'https://pubmed.ncbi.nlm.nih.gov/37959343/',tipo:'revisao_critica',limite:'Síndrome heterogênea, sem teste clínico isolado que estabeleça o diagnóstico.'},
  fraturas:{titulo:'AAOS — Tibial Shaft Fractures',url:'https://www.orthoinfo.org/diseases--conditions/tibia-shinbone-shaft-fractures/',tipo:'informacao_institucional',limite:'Referência sobre fratura da diáfise tibial. Não generalizar localização, consolidação, técnica cirúrgica ou liberação de carga a partir do nome da fratura.'},
  reabilitacao:{titulo:'OMS — Package of interventions for rehabilitation: musculoskeletal conditions, 2023',url:'https://www.who.int/publications/i/item/9789240071100',tipo:'referencia_reabilitacao',limite:'Contexto de reabilitação, não critérios de diagnóstico nem protocolo individual automático.'},
  reumaticas:{titulo:'NIAMS — Arthritis and Rheumatic Diseases',url:'https://www.niams.nih.gov/health-topics/arthritis-and-rheumatic-diseases',tipo:'informacao_institucional',limite:'Doenças reumáticas são heterogêneas. Reumatismo ou artrite sem subtipo não equivalem a artrite reumatoide.'},
  chikungunya:{titulo:'Ministério da Saúde — Chikungunya: manejo clínico, 2ª edição, 2024',url:'https://bvsms.saude.gov.br/bvs/publicacoes/chikungunya_manejo_clinico_2ed.pdf',tipo:'manual_institucional',limite:'Distinguir diagnóstico informado, fase e antecedente. Não atribuir automaticamente toda dor à infecção nem definir fase apenas pela presença do nome.'},
  neurologicas:{titulo:'OMS — Package of interventions for rehabilitation: neurological conditions, 2023',url:'https://www.who.int/publications/i/item/9789240071131',tipo:'referencia_reabilitacao',limite:'Referência de reabilitação neurológica. O registro textual não define gravidade, prognóstico ou segurança de técnicas.'}
 };
 // id, título, nomes legados, anatomia aceitável, pistas discriminativas, fonte.
 const linhas=[
  ['dor_plantar_calcanhar','Fasciopatia plantar — investigar',['fasciopatia plantar','dor plantar do calcaneo'],['plantar_calcanhar'],['primeiros_passos','carga'],['plantar']],
  ['entorse_lateral_tornozelo','Lesão ligamentar lateral após entorse — investigar',['entorse lateral'],['lateral_tornozelo'],['entorse','inversao'],['entorse','imagem']],
  ['lesao_sindesmose','Lesão da sindesmose — investigar',['sindesmose','entorse alta'],['acima_tornozelo'],['rotacao_externa','entorse'],['entorse','imagem']],
  ['patologia_tendoes_fibulares','Patologia dos tendões fibulares — investigar',['fibulares','peroneais'],['retromaleolar_lateral'],['eversao','estalo_lateral'],['fibulares']],
  ['instabilidade_tendoes_fibulares','Instabilidade dos tendões fibulares — investigar',['instabilidade dos fibulares'],['retromaleolar_lateral'],['estalo_lateral'],['fibulares']],
  ['lesao_osteocondral_talus','Lesão osteocondral do tálus — investigar',['osteocondral','domo talar'],['profunda_tornozelo'],['travamento','dor_persistente'],['entorse','imagem']],
  ['dor_sinus_tarsi','Dor do seio do tarso — investigar',['seio do tarso','sinus tarsi'],['sinus_tarsi'],['terreno_irregular','entorse'],['sinus']],
  ['instabilidade_cronica_tornozelo','Instabilidade crônica do tornozelo — investigar',['instabilidade cronica do tornozelo'],['lateral_tornozelo','tornozelo'],['falseio','recorrencia'],['entorse']],
  ['tendinopatia_aquiles','Tendinopatia do Aquiles — investigar',['tendinopatia do tendao de aquiles','tendinopatia do aquiles'],['posterior_tornozelo'],['carga'],['aquiles']]
 ];
 const perguntas={
  local:{id:'local',texto:'Onde exatamente está a dor: planta/calcanhar, à frente, atrás, acima ou ao lado do maléolo?',distingue:['dor_plantar_calcanhar','entorse_lateral_tornozelo','lesao_sindesmose','patologia_tendoes_fibulares']},
  evento:{id:'evento',texto:'Quando ocorreu a entorse? A dor atual começou naquele episódio, apareceu depois ou já existia antes?',distingue:['entorse_lateral_tornozelo','instabilidade_cronica_tornozelo','lesao_osteocondral_talus']},
  entorse:{id:'entorse',texto:'Como o pé virou e houve edema ou equimose logo após o episódio?',distingue:['entorse_lateral_tornozelo','lesao_sindesmose']},
  plantar:{id:'plantar',texto:'A dor dos primeiros passos fica sob o calcanhar, especialmente na porção medial, ou apenas na lateral do tornozelo?',distingue:['dor_plantar_calcanhar','entorse_lateral_tornozelo']},
  fibulares:{id:'fibulares',texto:'Há dor ou estalo atrás do maléolo lateral ao mover o pé para fora?',distingue:['patologia_tendoes_fibulares','instabilidade_tendoes_fibulares','entorse_lateral_tornozelo']},
  sindesmose:{id:'sindesmose',texto:'A dor fica acima da articulação e piora ao girar o pé para fora?',distingue:['lesao_sindesmose','entorse_lateral_tornozelo']},
  mecanica:{id:'mecanica',texto:'Há dor profunda, travamento ou bloqueio persistente após a entorse?',distingue:['lesao_osteocondral_talus','instabilidade_cronica_tornozelo']},
  falseio:{id:'falseio',texto:'O tornozelo falseia ou torce repetidamente? Isso já acontecia antes da lesão atual?',distingue:['instabilidade_cronica_tornozelo','entorse_lateral_tornozelo']},
  seguranca:{id:'seguranca',texto:'Após o trauma, verificar capacidade de apoio, dor óssea específica e aplicabilidade das regras de Ottawa antes de testes provocativos.',distingue:['triagem_fratura'],seguranca:true}
 };
 const exames={
  patologia_tendoes_fibulares:['Palpação do trajeto retromaleolar lateral reproduz a dor familiar','Eversão resistida e avaliação dinâmica dos fibulares, quando seguras','Diferenciação de lesão ligamentar, fratura e origem neural conforme exame'],
  instabilidade_tendoes_fibulares:['Estalo ou deslocamento retromaleolar lateral observado em avaliação dinâmica segura','Correlação entre o movimento, o sintoma familiar e a estabilidade tendínea','Avaliação especializada/imagem dinâmica quando necessária; não presumir instabilidade por estalo isolado'],
  lesao_osteocondral_talus:['Dor profunda e limitação funcional persistentes após trauma documentadas','Investigar bloqueio, derrame e dor articular familiar no exame','Correlacionar com avaliação médica e imagem quando indicadas; exame clínico isolado não confirma lesão osteocondral'],
  dor_sinus_tarsi:['Dor focal no seio do tarso reproduzida à palpação','Avaliação subtalar e tolerância a terreno irregular conforme segurança','Diferenciação de instabilidade, tendões fibulares e outras causas de dor lateral do retropé']
 };
 const perfis=linhas.map(([id,nome,aliases,anatomia,pistas,refs])=>({id,nome,regiaoId:'tornozelo_pe',aliases,anatomia,pistas,fontes:refs.map(k=>fontes[k]),testes:exames[id]||[],
  limite:'Hipótese de investigação. Não confirma diagnóstico, causalidade ou indicação de cirurgia; exige história e exame concordantes.'}));
 function instalarBanco(banco){
  const reg=banco?.tornozelo_pe;if(!reg)return 0;reg.diferenciais=reg.diferenciais||[];let total=0;
  perfis.filter(p=>p.testes.length).forEach(p=>{if([...reg.clusters||[],...reg.diferenciais].some(i=>i.id===p.id))return;
   reg.diferenciais.push({id:p.id,nome:p.nome,testes:p.testes.slice(),palavrasChaveHMA:p.aliases.slice(),interpretacao:p.limite,
    evidencia:p.fontes.map(f=>f.titulo+': '+f.url).join('; '),nivelEvidencia:p.fontes.map(f=>f.tipo+' — '+f.limite).join(' '),categoriaClinica:'investigacao_contextual'});total++;});return total;
 }
 // Condições NOMINALMENTE informadas. Não entram em instalarBanco nem recebem
 // testes positivos, limiares, causalidade, prescrição ou probabilidade.
 const familiasCondicoes={
  fratura:{nome:'Fraturas',fontes:['reabilitacao'],perguntas:['Confirmar segmento, lado e data da fratura no encaminhamento ou relato.','Consultar tratamento realizado, consolidação e restrições de apoio/movimento estabelecidas pela equipe responsável.'],limite:'Não presumir consolidação, material de síntese ou liberação para carga.'},
  procedimento:{nome:'Procedimentos e pós-operatório',fontes:['reabilitacao'],perguntas:['Qual procedimento foi realizado, em que lado e em qual data?','Há orientação da equipe cirúrgica sobre carga, amplitude ou outras restrições?'],limite:'Cirurgia indicada ou programada não significa cirurgia realizada. Não inferir protocolo por tempo.'},
  reumatica:{nome:'Condições reumáticas',fontes:['reumaticas','reabilitacao'],perguntas:['Qual é o diagnóstico informado e quem o estabeleceu?','Esclarecer atividade da doença, acompanhamento, medicações e limitações atuais relevantes à avaliação.'],limite:'Não atribuir toda queixa à doença de base nem presumir atividade inflamatória.'},
  musculoesqueletica:{nome:'Condições musculoesqueléticas',fontes:['reabilitacao'],perguntas:['Confirmar a condição informada, localização e limitações atuais.','Correlacionar as queixas e o exame funcional; achado de imagem isolado não explica automaticamente os sintomas.'],limite:'Condição informada não substitui avaliação funcional ou exame das outras queixas.'},
  chikungunya:{nome:'Chikungunya',fontes:['chikungunya'],perguntas:['Quando ocorreu a doença e como foi estabelecido o diagnóstico?','Há sintomas atuais, acompanhamento ou restrições informadas? Diferenciar episódio anterior e queixa atual.'],limite:'Antecedente de chikungunya não confirma doença ativa nem causa da dor atual.'},
  infecciosa:{nome:'Condições infecciosas informadas',fontes:[],perguntas:['Confirmar diagnóstico, época, situação atual e orientações da equipe assistente.'],limite:'Não inferir infecção ativa, agente ou sequela por exposição, sintoma ou antecedente isolados.'},
  neurologica:{nome:'Condições neurológicas',fontes:['neurologicas'],perguntas:['Confirmar diagnóstico, início e acompanhamento atual.','Registrar déficits funcionais, evolução e restrições individualizadas já informadas.'],limite:'Não inferir nível de lesão, incapacidade ou prognóstico a partir do nome.'},
  contexto:{nome:'Condições de saúde associadas',fontes:[],perguntas:['Confirmar diagnóstico e acompanhamento; registrar repercussões e orientações relevantes à avaliação.'],limite:'Comorbidade informada não equivale à causa da queixa nem define contraindicação de técnica.'}
 };
 // id, nome, família, sinônimos explícitos adicionais. Abreviações ambíguas
 // (AR, EM, EA, DM isolada) não são usadas como diagnóstico por palavra-chave.
 const linhasCondicoes=[
  ['fratura_tibia','Fratura de tíbia','fratura',['fratura da tibia','fratura tibial','fratura de tibia']],
  ['fratura_planalto','Fratura do planalto tibial','fratura',['fratura de planalto tibial','fratura do plateau tibial']],
  ['fratura_pilao','Fratura do pilão tibial','fratura',['fratura de pilao tibial']],
  ['fratura_fibula','Fratura de fíbula','fratura',['fratura da fibula','fratura de peronio','fratura do peronio']],
  ['fratura_tornozelo','Fratura de tornozelo','fratura',['fratura do tornozelo','fratura maleolar','fratura bimaleolar','fratura trimaleolar']],
  ['fratura_femur','Fratura de fêmur','fratura',['fratura do femur','fratura femoral']],
  ['fratura_colo_femur','Fratura do colo do fêmur','fratura',['fratura de colo femoral','fratura do colo femoral']],
  ['fratura_patelar','Fratura de patela','fratura',['fratura da patela']],
  ['fratura_umero','Fratura de úmero','fratura',['fratura do umero','fratura umeral']],
  ['fratura_clavicula','Fratura de clavícula','fratura',['fratura da clavicula']],
  ['fratura_radio','Fratura de rádio','fratura',['fratura do radio','fratura de radio distal','fratura distal do radio']],
  ['fratura_ulna','Fratura de ulna','fratura',['fratura da ulna','fratura de cubito','fratura do cubito']],
  ['fratura_escafoide','Fratura de escafoide','fratura',['fratura do escafoide']],
  ['fratura_metacarpo','Fratura de metacarpo','fratura',['fratura do metacarpo','fratura de metacarpiano']],
  ['fratura_vertebral','Fratura vertebral','fratura',['fratura de vertebra','fratura da vertebra']],
  ['fratura_pelve','Fratura de pelve','fratura',['fratura da pelve','fratura pelvica']],
  ['fratura_calcaneo','Fratura de calcâneo','fratura',['fratura do calcaneo']],
  ['fratura_metatarso','Fratura de metatarso','fratura',['fratura do metatarso','fratura de metatarsiano']],
  ['fratura_estresse','Fratura por estresse','fratura',['fratura de estresse']],
  ['artroplastia_quadril','Artroplastia de quadril','procedimento',['artroplastia total de quadril','artroplastia total do quadril','protese de quadril','protese do quadril']],
  ['artroplastia_joelho','Artroplastia de joelho','procedimento',['artroplastia total de joelho','artroplastia total do joelho','protese de joelho','protese do joelho']],
  ['artroplastia_ombro','Artroplastia de ombro','procedimento',['artroplastia total de ombro','artroplastia do ombro','protese de ombro']],
  ['artrodese','Artrodese','procedimento',['artrodese lombar','artrodese cervical','fusao vertebral']],
  ['discectomia','Discectomia','procedimento',['microdiscectomia']],
  ['laminectomia','Laminectomia','procedimento',[]],
  ['reconstrucao_lca','Reconstrução do ligamento cruzado anterior','procedimento',['reconstrucao de lca','reconstrucao do lca']],
  ['reconstrucao_lcp','Reconstrução do ligamento cruzado posterior','procedimento',['reconstrucao de lcp','reconstrucao do lcp']],
  ['meniscectomia','Meniscectomia','procedimento',[]],
  ['sutura_meniscal','Sutura meniscal','procedimento',['reparo meniscal']],
  ['reparo_manguito','Reparo do manguito rotador','procedimento',['sutura do manguito rotador','reparo de manguito rotador']],
  ['reparo_aquiles','Reparo do tendão de Aquiles','procedimento',['sutura do tendao de aquiles','tenorrafia de aquiles']],
  ['osteossintese','Osteossíntese','procedimento',[]],
  ['amputacao','Amputação','procedimento',['amputacao transtibial','amputacao transfemoral']],
  ['artrite_reumatoide','Artrite reumatoide','reumatica',['artrite reumatoidea']],
  ['artrite_psoriasica','Artrite psoriásica','reumatica',['artrite psoriatica']],
  ['espondilite','Espondilite anquilosante','reumatica',[]],
  ['espondiloartrite_axial','Espondiloartrite axial','reumatica',[]],
  ['artrite_reativa','Artrite reativa','reumatica',[]],
  ['artrite_juvenil','Artrite idiopática juvenil','reumatica',['artrite juvenil']],
  ['gota','Gota','reumatica',['artrite gotosa']],
  ['condrocalcinose','Condrocalcinose','reumatica',['doenca por deposicao de pirofosfato de calcio','pseudogota']],
  ['polimialgia','Polimialgia reumática','reumatica',[]],
  ['lupus','Lúpus','reumatica',['lupus eritematoso sistemico']],
  ['sjogren','Síndrome de Sjögren','reumatica',['sjogren']],
  ['esclerose_sistemica','Esclerose sistêmica','reumatica',['esclerodermia']],
  ['dermatomiosite','Dermatomiosite','reumatica',[]],
  ['polimiosite','Polimiosite','reumatica',[]],
  ['vasculite','Vasculite','reumatica',[]],
  ['doenca_reumatica','Doença reumática não especificada','reumatica',['doenca reumatica','doencas reumaticas','reumatismo']],
  ['artrite_inespecifica','Artrite sem subtipo informado','reumatica',['artrite']],
  ['fibromialgia','Fibromialgia','musculoesqueletica',[]],
  ['osteoartrite','Osteoartrite','musculoesqueletica',['osteoartrose','artrose']],
  ['gonartrose','Gonartrose','musculoesqueletica',[]],
  ['coxartrose','Coxartrose','musculoesqueletica',[]],
  ['osteoporose','Osteoporose','musculoesqueletica',[]],
  ['osteopenia','Osteopenia','musculoesqueletica',[]],
  ['escoliose','Escoliose','musculoesqueletica',[]],
  ['hernia_discal','Hérnia de disco','musculoesqueletica',['hernia discal']],
  ['estenose_canal','Estenose do canal vertebral','musculoesqueletica',['estenose de canal vertebral','estenose lombar','estenose cervical']],
  ['espondilolistese','Espondilolistese','musculoesqueletica',['anterolistese']],
  ['espondilolise','Espondilólise','musculoesqueletica',[]],
  ['radiculopatia','Radiculopatia','musculoesqueletica',['radiculopatia cervical','radiculopatia lombar']],
  ['capsulite','Capsulite adesiva','musculoesqueletica',[]],
  ['ruptura_manguito','Ruptura do manguito rotador','musculoesqueletica',['lesao do manguito rotador']],
  ['tunel_carpo','Síndrome do túnel do carpo','musculoesqueletica',['tunel do carpo']],
  ['chikungunya','Chikungunya','chikungunya',['chikungunha','chicungunha']],
  ['dengue','Dengue','infecciosa',[]],
  ['zika','Zika','infecciosa',['zika virus']],
  ['covid','COVID-19','infecciosa',['covid 19','covid','pos covid','covid longa']],
  ['osteomielite','Osteomielite','infecciosa',[]],
  ['artrite_septica','Artrite séptica','infecciosa',[]],
  ['avc','Acidente vascular cerebral','neurologica',['avc','acidente vascular encefalico']],
  ['parkinson','Doença de Parkinson','neurologica',['parkinson']],
  ['lesao_medular','Lesão medular','neurologica',['traumatismo raquimedular']],
  ['tce','Traumatismo cranioencefálico','neurologica',['traumatismo cranio encefalico','tce']],
  ['esclerose_multipla','Esclerose múltipla','neurologica',[]],
  ['guillain_barre','Síndrome de Guillain-Barré','neurologica',['guillain barre','guillain-barre']],
  ['neuropatia_diabetica','Neuropatia diabética','neurologica',[]],
  ['polineuropatia','Polineuropatia','neurologica',[]],
  ['paralisia_facial','Paralisia facial','neurologica',['paralisia de bell']],
  ['paralisia_cerebral','Paralisia cerebral','neurologica',[]],
  ['distrofia_muscular','Distrofia muscular','neurologica',[]],
  ['ela','Esclerose lateral amiotrófica','neurologica',[]],
  ['hipertensao','Hipertensão arterial','contexto',['hipertensao','hipertensao arterial sistemica']],
  ['diabetes','Diabetes mellitus','contexto',['diabetes','diabetes tipo 1','diabetes tipo 2','diabetes mellitus tipo 1','diabetes mellitus tipo 2']],
  ['hipotireoidismo','Hipotireoidismo','contexto',[]],
  ['hipertireoidismo','Hipertireoidismo','contexto',[]],
  ['insuficiencia_cardiaca','Insuficiência cardíaca','contexto',[]],
  ['dpoc','Doença pulmonar obstrutiva crônica','contexto',['dpoc']],
  ['asma','Asma','contexto',[]],
  ['doenca_renal','Doença renal crônica','contexto',['insuficiencia renal cronica']]
 ];
 const condicoes=linhasCondicoes.map(([id,nome,familia,aliases])=>Object.freeze({id,nome,familia,aliases:Object.freeze([nome,...aliases]),tipo:familia==='procedimento'?'procedimento_informado':'condicao_informada'}));
 root.KineSysEvidenceProfiles=Object.freeze({version:'1.1.0',perfis:Object.freeze(perfis),perguntas:Object.freeze(perguntas),fontes:Object.freeze(fontes),condicoes:Object.freeze(condicoes),familiasCondicoes:Object.freeze(familiasCondicoes),instalarBanco});
})(typeof window==='undefined'?globalThis:window);
