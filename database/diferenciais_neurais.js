/* Diferenciais periféricos e dor referida — KineSys 1.7.
   Estes itens ajudam a organizar diferenciais; não são diagnósticos automáticos. */
(function(){
 if(typeof BANCO_MAPEAMENTO_CLINICO==='undefined')return;
 function add(reg,id,nome,testes,interpretacao,extras={}){
   const r=BANCO_MAPEAMENTO_CLINICO[reg];if(!r)return;if(!Array.isArray(r.diferenciais))r.diferenciais=[];
   if(r.diferenciais.some(x=>x.id===id)||(r.clusters||[]).some(x=>x.id===id))return;
   r.diferenciais.push({id,nome,testes,interpretacao,...extras});
 }
 add('ombro','neuropatia_dorsal_escapular','Neuropatia do nervo dorsal da escápula — diferencial',['Mapeamento da dor na borda medial da escápula e comparação com a queixa familiar','Força de retração escapular dos romboides, comparando os lados','Inspeção de assimetria, discinesia ou alamento escapular durante o movimento','Exame neurológico cervical e do membro superior para diferenciação de origem proximal'],'Dor na borda medial da escápula associada a alterações dos romboides pode justificar investigação do nervo dorsal da escápula. Estes achados não constituem um conjunto diagnóstico validado; diferenciar causas cervicais, musculares e outras neuropatias e considerar investigação complementar conforme avaliação profissional.',{palavrasChaveHMA:['dor borda medial escapula','fraqueza romboides','nervo dorsal escapula','dor interescapular','retracao escapular fraca'],tipoDorPreferido:['neuropatica','mista'],evidencia:'Muir 2017, revisão narrativa: https://pubmed.ncbi.nlm.nih.gov/28928496/; Sultan et al., estudo clínico de dor interescapular: https://pubmed.ncbi.nlm.nih.gov/23220342/'});
 add('ombro','neuropatia_supraescapular','Neuropatia do Nervo Supraescapular — diferencial',[ 'Dor posterior/superior do ombro com distribuição compatível', 'Fraqueza de rotação externa e/ou abdução não explicada apenas por dor', 'Atrofia de supra/infraespinal ou contexto de tração/compressão do nervo' ],'Considere neuropatia supraescapular quando dor posterior do ombro e déficit motor/atrofia forem coerentes; correlacione com exame neurológico e, quando necessário, investigação complementar.',{palavrasChaveHMA:['dor posterior ombro','fraqueza rotacao externa','atrofia infraespinhal'],tipoDorPreferido:['neuropatica','mista']});
 add('cotovelo','pronador_mediano','Síndrome do Pronador / Neuropatia Proximal do Mediano',[ 'Dor volar/proximal do antebraço agravada por pronação resistida ou esforço repetitivo', 'Parestesia em distribuição do mediano incluindo possível palma/eminência tenar', 'Diferenciação de túnel do carpo e radiculopatia cervical' ],'Padrão compatível com compressão proximal do nervo mediano deve ser diferenciado de túnel do carpo, radiculopatia cervical e outras neuropatias.',{palavrasChaveHMA:['dor antebraco pronacao','parestesia mediano','pronador'],tipoDorPreferido:['neuropatica']});
 add('quadril','deep_gluteal','Síndrome Glútea Profunda / Aprisionamento Não Discogênico do Ciático',[ 'Dor profunda glútea com possível irradiação posterior', 'Piora sentada e/ou com posições que tensionam estruturas glúteas profundas', 'Exame lombar e neurológico para diferenciar origem radicular' ],'Síndrome glútea profunda descreve aprisionamento não discogênico do ciático no espaço glúteo profundo; deve ser diferenciada de radiculopatia lombar e patologia do quadril.',{palavrasChaveHMA:['dor glutea piora sentado','gluteo posterior coxa','piriforme'],tipoDorPreferido:['neuropatica','mista']});
 add('quadril','hamstring_proximal_neural','Isquiotibiais Proximais / Interface com Nervo Ciático',[ 'Dor na tuberosidade isquiática ou glúteo inferior', 'Dor reproduzida por carga de isquiotibiais/flexão de quadril e frequentemente por sedestação', 'Pesquisar sintomas neurais quando houver irradiação distal' ],'Diferencie tendinopatia/lesão proximal dos isquiotibiais de síndrome glútea profunda e radiculopatia quando houver sintomas posteriores irradiados.',{palavrasChaveHMA:['dor isquio sentado','posterior coxa corrida','tuberosidade isquiatica']});
 add('quadril','meralgia_parestetica','Meralgia Parestésica — Nervo Cutâneo Femoral Lateral',[ 'Queimação/parestesia na face anterolateral da coxa', 'Ausência de déficit motor atribuível ao nervo cutâneo femoral lateral', 'Considerar compressão junto ao ligamento inguinal e diferenciar de radiculopatia' ],'Padrão sensitivo anterolateral isolado da coxa é compatível com investigação de meralgia parestésica.',{palavrasChaveHMA:['queimacao lateral coxa','parestesia anterolateral coxa'],tipoDorPreferido:['neuropatica']});
 add('quadril','neuropatia_femoral','Neuropatia Femoral — diferencial',[ 'Alteração sensitiva anterior da coxa/perna medial conforme distribuição', 'Fraqueza de quadríceps/extensão do joelho', 'Reflexo patelar reduzido e diferenciação de raízes L2-L4' ],'Déficit motor de quadríceps associado a alterações sensitivas/reflexas exige diferenciação entre neuropatia femoral, plexopatia e radiculopatia L2-L4.',{tipoDorPreferido:['neuropatica']});
 add('quadril','neuropatia_obturatoria','Neuropatia Obturatória — diferencial',[ 'Dor/parestesia medial da coxa', 'Fraqueza de adução do quadril', 'Diferenciação de lesão adutora, quadril e radiculopatia' ],'Considere neuropatia obturatória em sintomas mediais da coxa associados a déficit de adução e contexto compatível.',{tipoDorPreferido:['neuropatica']});
 add('joelho','neuropatia_safeno','Neuropatia do Nervo Safeno — diferencial',[ 'Dor/parestesia medial de joelho e perna sem déficit motor', 'Sensibilidade ao longo do canal dos adutores/região safena conforme contexto', 'Diferenciação de joelho local e radiculopatia L3-L4' ],'O safeno é sensitivo; sintomas mediais sem fraqueza correspondente podem justificar investigação periférica.',{tipoDorPreferido:['neuropatica']});
 add('joelho','neuropatia_fibular_comum','Neuropatia do Nervo Fibular Comum',[ 'Sintomas junto à cabeça da fíbula com extensão à perna lateral/dorso do pé', 'Fraqueza de dorsiflexão e/ou eversão; pesquisar pé caído', 'Diferenciação de radiculopatia L5 e lesões mais distais do fibular' ],'Pé caído ou déficit de dorsiflexão/eversão requer localização neurológica cuidadosa entre nervo fibular, raiz L5 e outras causas.',{tipoDorPreferido:['neuropatica']});
 add('tornozelo_pe','tunel_tarsal_neural','Síndrome do Túnel do Tarso / Neuropatia Tibial',[ 'Dor/queimação ou parestesia posterior ao maléolo medial', 'Irradiação para planta do pé/dedos conforme distribuição tibial', 'Provocação local e diferenciação de radiculopatia S1/S2 e causas plantares' ],'Sintomas plantares neuropáticos originados no tornozelo medial podem justificar investigação do nervo tibial/túnel do tarso.',{tipoDorPreferido:['neuropatica']});
 add('tornozelo_pe','fibular_superficial','Neuropatia do Nervo Fibular Superficial',[ 'Parestesia/dor em perna anterolateral e dorso do pé', 'Distribuição costuma poupar o primeiro espaço interdigital', 'Avaliar eversão e diferenciar de L5/fibular comum' ],'Localize a lesão comparando distribuição sensitiva, força e sítio de provocação.',{tipoDorPreferido:['neuropatica']});
 add('tornozelo_pe','fibular_profundo','Neuropatia do Nervo Fibular Profundo / Túnel Tarsal Anterior',[ 'Sintomas dorsais no tornozelo/pé com parestesia no primeiro espaço interdigital', 'Possível associação a compressão por calçado/retináculo', 'Diferenciação de L5 e fibular comum' ],'Parestesia focal no primeiro espaço interdigital é uma pista de distribuição do fibular profundo, sempre correlacionada ao exame.',{tipoDorPreferido:['neuropatica']});
 add('tornozelo_pe','neuropatia_sural','Neuropatia do Nervo Sural — diferencial',[ 'Dor/parestesia posterolateral da panturrilha/tornozelo', 'Irradiação para maléolo lateral e borda lateral do pé', 'Ausência de déficit motor atribuível ao sural' ],'O sural é predominantemente sensitivo; diferencie de S1 e de outras neuropatias periféricas.',{tipoDorPreferido:['neuropatica']});
 add('coluna_toracica','neuralgia_intercostal','Neuralgia Intercostal / Dor em Faixa',[ 'Dor em faixa seguindo espaço intercostal', 'Qualidade queimante/choque ou alodinia', 'Triagem de causas cardiopulmonares, viscerais e herpes-zóster conforme contexto' ],'Dor em faixa torácica pode ser neuropática/intercostal, mas exige exclusão de causas não musculoesqueléticas relevantes.',{tipoDorPreferido:['neuropatica']});
 // Revisão científica 2026-10-15. IDs e os testes anteriores são preservados:
 // achados salvos não mudam de significado quando a biblioteca é ampliada.
 function aprimorar(reg,id,extras,adicionais=[]){
   const r=BANCO_MAPEAMENTO_CLINICO[reg];
   const item=[...(r?.clusters||[]),...(r?.diferenciais||[])].find(x=>x.id===id);
   if(!item)return;
   Object.assign(item,extras);
   item.testes=[...(item.testes||[]),...adicionais.filter(t=>!item.testes.includes(t))];
 }
 aprimorar('ombro','neuropatia_dorsal_escapular',{
   nome:'Síndrome de encarceramento do nervo escapular dorsal — neuropatia dorsal da escápula',
   sinonimos:['encarceramento do escapular dorsal','encarceramento do nervo escapular dorsal','aprisionamento do nervo dorsal da escapula','neuropatia escapular dorsal','dorsal scapular nerve entrapment'],
   palavrasChaveHMA:['dor borda medial escapula','dor medial escapula','fraqueza romboides','nervo dorsal escapula','escapular dorsal','retracao escapular fraca','dor interescapular'],
   nivelEvidencia:'Estudo descritivo e revisão narrativa; sem cluster clínico de confirmação validado.',
   interpretacao:'Dor medial escapular com alteração de retração dos romboides justifica investigar o nervo escapular dorsal, sem comprovar encarceramento. Diferenciar origem cervical, dor miofascial, nervo torácico longo e acessório. Discinesia e alamento não localizam sozinhos o nervo. A eletroneuromiografia direcionada pode apoiar a localização conforme avaliação especializada.',
   evidencia:'Sultan 2013, estudo descritivo: https://pubmed.ncbi.nlm.nih.gov/23220342/; Muir 2017, revisão narrativa: https://pubmed.ncbi.nlm.nih.gov/28928496/'
 },['Fraqueza de retração escapular dos romboides em comparação com o lado contralateral','Reprodução da queixa medial escapular durante exame local, diferenciada da modulação por movimentos cervicais']);
 add('ombro','neuropatia_toracico_longo','Neuropatia do nervo torácico longo — disfunção do serrato anterior',[
   'Alamento medial da escápula durante elevação anterior do braço',
   'Alamento escapular acentuado ao empurrar a parede com os braços estendidos',
   'Fraqueza de protração escapular do serrato anterior, comparando os lados',
   'Exame cervical e dos demais estabilizadores escapulares para localização diferencial'
 ],'A combinação de alamento e déficit do serrato anterior orienta investigação do nervo torácico longo, mas não confirma neuropatia. Diferenciar romboides, trapézio, causas estruturais e discinesia não neurogênica. Considerar eletroneuromiografia conforme avaliação especializada.',{
   sinonimos:['lesao do nervo toracico longo','neuropatia do toracico longo','paralisia do serrato anterior'],
   palavrasChaveHMA:['escapula alada','alamento medial escapula','fraqueza serrato anterior','dificuldade empurrar parede','toracico longo'],
   nivelEvidencia:'Revisão anatômico-clínica; observação do alamento não é teste confirmatório isolado.',
   evidencia:'Martin e Fish 2008, revisão: https://pubmed.ncbi.nlm.nih.gov/19468892/'
 });
 add('ombro','neuropatia_acessorio_espinal','Neuropatia do nervo acessório espinal — disfunção do trapézio',[
   'Fraqueza de elevação do ombro contra resistência, comparando os lados',
   'Atrofia ou assimetria do trapézio observada à inspeção',
   'Alamento lateral ou alteração de rotação escapular durante abdução',
   'Exame dos romboides, serrato anterior e região cervical para diferenciação'
 ],'Déficit do trapézio, assimetria e contexto cervical compatível justificam investigação do nervo acessório espinal. História de cirurgia ou biópsia cervical aumenta a relevância, mas não confirma lesão. Déficit novo ou progressivo demanda avaliação médica.',{
   sinonimos:['lesao do nervo acessorio espinal','neuropatia do nervo acessorio','paralisia do trapezio'],
   palavrasChaveHMA:['fraqueza trapezio','atrofia trapezio','ombro caido','cirurgia cervical','biopsia cervical','alamento lateral escapula'],
   nivelEvidencia:'Revisão anatômico-clínica; sem regra numérica de confirmação.',
   evidencia:'Martin e Fish 2008, revisão: https://pubmed.ncbi.nlm.nih.gov/19468892/'
 });
 add('ombro','amiotrofia_neuralgica','Amiotrofia neurálgica — síndrome de Parsonage-Turner',[
   'Cronologia de dor intensa no ombro ou braço seguida por fraqueza',
   'Fraqueza com distribuição irregular em diferentes músculos do membro superior',
   'Inspeção de atrofia e alamento escapular conforme músculos acometidos',
   'Exame neurológico para diferenciar mononeuropatia, plexopatia e radiculopatia'
 ],'Dor intensa seguida por paresia irregular é um padrão de investigação, não diagnóstico automático de amiotrofia neurálgica. Excluir causas estruturais e radiculares. Fraqueza nova ou progressiva exige avaliação médica e investigação complementar; um antecedente infeccioso isolado não estabelece a causa.',{
   sinonimos:['amiotrofia neuralgica','parsonage turner','neurite braquial'],
   palavrasChaveHMA:['dor intensa seguida fraqueza','dor forte depois fraqueza','paresia irregular','parsonage turner','amiotrofia neuralgica'],
   nivelEvidencia:'Revisão clínica; avaliação especializada e diferenciação neurológica necessárias.',
   evidencia:'Holle et al. 2024: https://pubmed.ncbi.nlm.nih.gov/38835178/; revisão diagnóstica 2024: https://pubmed.ncbi.nlm.nih.gov/39402917/'
 });
 add('ombro','sindrome_escapula_crepitante','Síndrome da escápula crepitante — diferencial escapulotorácico',[
   'Crepitação dolorosa palpável durante o movimento escapulotorácico',
   'Estalido doloroso reproduzindo a queixa familiar durante elevação do braço',
   'Dor à palpação na região escapulotorácica correspondente à queixa',
   'Exame de mobilidade e controle escapular para diferenciar alteração mecânica de déficit neurológico'
 ],'Crepitação ou estalido doloroso pode orientar investigação escapulotorácica. Ruído indolor isolado não estabelece síndrome nem bursite. Correlacionar com função, exame neurológico e investigação de causas estruturais quando indicada.',{
   sinonimos:['escapula crepitante','snapping scapula','bursite escapulotoracica'],
   palavrasChaveHMA:['crepitacao dolorosa escapula','estalido doloroso escapula','escapula estala com dor','dor escapulotoracica'],
   nivelEvidencia:'Revisões clínicas; sem cluster numérico universal de confirmação.',
   evidencia:'Revisão crítica: https://pubmed.ncbi.nlm.nih.gov/24664139/; revisão de escopo: https://pmc.ncbi.nlm.nih.gov/articles/PMC9109590/'
 });
 aprimorar('ombro','neuropatia_supraescapular',{
   sinonimos:['neuropatia supraescapular','encarceramento do nervo supraescapular'],
   nivelEvidencia:'Revisões clínicas; exames complementares conforme localização e diagnóstico diferencial.',
   evidencia:'Freehill et al. 2012: https://pubmed.ncbi.nlm.nih.gov/22508253/; Strauss et al. 2020: https://pubmed.ncbi.nlm.nih.gov/32732653/'
 });
 aprimorar('quadril','deep_gluteal',{
   sinonimos:['sindrome glutea profunda','sindrome do piriforme','aprisionamento ciatico gluteo'],
   palavrasChaveHMA:['dor glutea piora sentado','gluteo posterior coxa','piriforme','dor profunda glutea','dor nadega sentado'],
   nivelEvidencia:'Estudo de acurácia retrospectivo com 33 participantes e referência endoscópica; aplicabilidade limitada à população estudada.',
   evidencia:'Martin et al. 2014: https://pubmed.ncbi.nlm.nih.gov/24217716/',
   interpretacao:'Os testes ativo do piriforme e de alongamento sentado podem apoiar a investigação de aprisionamento glúteo do ciático. O estudo disponível é pequeno e selecionado; não autoriza diagnóstico automático. Comparar com exame lombar, neurológico e do quadril.'
 },['Teste ativo do piriforme reproduz a dor glútea familiar','Teste de alongamento do piriforme sentado reproduz a dor glútea familiar']);
 aprimorar('tornozelo_pe','tunel_tarsal_neural',{
   sinonimos:['sindrome do tunel do tarso','neuropatia tibial no tornozelo'],
   palavrasChaveHMA:['queimacao planta pe','parestesia plantar','dor maleolo medial','tunel tarso','dormencia planta pe'],
   nivelEvidencia:'Estudo clínico em pacientes operados; sensibilidade e critérios variam entre estudos.',
   evidencia:'Kinoshita et al. 2001: https://pubmed.ncbi.nlm.nih.gov/11741063/; revisão sistemática: https://pmc.ncbi.nlm.nih.gov/articles/PMC12875632/'
 },['Tinel posterior ao maléolo medial reproduz parestesia plantar familiar','Teste de dorsiflexão e eversão reproduz os sintomas plantares familiares, quando seguro e tolerado']);
 aprimorar('quadril','gtps',{
   regraConfirmacao:{tipo:'combinada',minimo:2,obrigatorios:[0,1],descricao:'Combinação estudada: palpação glútea/trocantérica e abdução resistida concordantes, no contexto de dor lateral do quadril.'},
   nivelEvidencia:'Revisão sistemática com meta-análise; certeza de muito baixa a moderada e dependência do contexto clínico.',
   evidencia:'Kinsella et al. 2024: https://pubmed.ncbi.nlm.nih.gov/37561820/',
   interpretacao:'Na dor lateral do quadril, palpação glútea/trocantérica e abdução resistida concordantes ajudam a modificar a suspeita de síndrome dolorosa trocantérica. Não equivale a escolher quaisquer dois dos quatro itens nem a confirmar uma lesão anatômica. Probabilidades do estudo não são probabilidades individuais do paciente.'
 });
})();
