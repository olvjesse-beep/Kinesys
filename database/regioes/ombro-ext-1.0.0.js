/* KineSys — extensão clínica regional ombro 1.0.0.
 * Gerada deterministicamente de condicoes_mobilidade_v23.js + diferenciais_neurais.js.
 * Não editar manualmente sem atualizar o contrato de equivalência.
 */
(function(){
  'use strict';
  if(typeof BANCO_MAPEAMENTO_CLINICO==='undefined')return;
  const r=BANCO_MAPEAMENTO_CLINICO["ombro"];
  if(!r)return;
  r.diferenciais=[...(Array.isArray(r.diferenciais)?r.diferenciais:[]),...[
  {
    "id": "neuropatia_dorsal_escapular",
    "nome": "Síndrome de encarceramento do nervo escapular dorsal — neuropatia dorsal da escápula",
    "testes": [
      "Mapeamento da dor na borda medial da escápula e comparação com a queixa familiar",
      "Força de retração escapular dos romboides, comparando os lados",
      "Inspeção de assimetria, discinesia ou alamento escapular durante o movimento",
      "Exame neurológico cervical e do membro superior para diferenciação de origem proximal",
      "Fraqueza de retração escapular dos romboides em comparação com o lado contralateral",
      "Reprodução da queixa medial escapular durante exame local, diferenciada da modulação por movimentos cervicais"
    ],
    "interpretacao": "Dor medial escapular com alteração de retração dos romboides justifica investigar o nervo escapular dorsal, sem comprovar encarceramento. Diferenciar origem cervical, dor miofascial, nervo torácico longo e acessório. Discinesia e alamento não localizam sozinhos o nervo. A eletroneuromiografia direcionada pode apoiar a localização conforme avaliação especializada.",
    "palavrasChaveHMA": [
      "dor borda medial escapula",
      "dor medial escapula",
      "fraqueza romboides",
      "nervo dorsal escapula",
      "escapular dorsal",
      "retracao escapular fraca",
      "dor interescapular"
    ],
    "tipoDorPreferido": [
      "neuropatica",
      "mista"
    ],
    "evidencia": "Sultan 2013, estudo descritivo: https://pubmed.ncbi.nlm.nih.gov/23220342/; Muir 2017, revisão narrativa: https://pubmed.ncbi.nlm.nih.gov/28928496/",
    "sinonimos": [
      "encarceramento do escapular dorsal",
      "encarceramento do nervo escapular dorsal",
      "aprisionamento do nervo dorsal da escapula",
      "neuropatia escapular dorsal",
      "dorsal scapular nerve entrapment"
    ],
    "nivelEvidencia": "Estudo descritivo e revisão narrativa; sem cluster clínico de confirmação validado."
  },
  {
    "id": "neuropatia_supraescapular",
    "nome": "Neuropatia do Nervo Supraescapular — diferencial",
    "testes": [
      "Dor posterior/superior do ombro com distribuição compatível",
      "Fraqueza de rotação externa e/ou abdução não explicada apenas por dor",
      "Atrofia de supra/infraespinal ou contexto de tração/compressão do nervo"
    ],
    "interpretacao": "Considere neuropatia supraescapular quando dor posterior do ombro e déficit motor/atrofia forem coerentes; correlacione com exame neurológico e, quando necessário, investigação complementar.",
    "palavrasChaveHMA": [
      "dor posterior ombro",
      "fraqueza rotacao externa",
      "atrofia infraespinhal"
    ],
    "tipoDorPreferido": [
      "neuropatica",
      "mista"
    ],
    "sinonimos": [
      "neuropatia supraescapular",
      "encarceramento do nervo supraescapular"
    ],
    "nivelEvidencia": "Revisões clínicas; exames complementares conforme localização e diagnóstico diferencial.",
    "evidencia": "Freehill et al. 2012: https://pubmed.ncbi.nlm.nih.gov/22508253/; Strauss et al. 2020: https://pubmed.ncbi.nlm.nih.gov/32732653/"
  },
  {
    "id": "neuropatia_toracico_longo",
    "nome": "Neuropatia do nervo torácico longo — disfunção do serrato anterior",
    "testes": [
      "Alamento medial da escápula durante elevação anterior do braço",
      "Alamento escapular acentuado ao empurrar a parede com os braços estendidos",
      "Fraqueza de protração escapular do serrato anterior, comparando os lados",
      "Exame cervical e dos demais estabilizadores escapulares para localização diferencial"
    ],
    "interpretacao": "A combinação de alamento e déficit do serrato anterior orienta investigação do nervo torácico longo, mas não confirma neuropatia. Diferenciar romboides, trapézio, causas estruturais e discinesia não neurogênica. Considerar eletroneuromiografia conforme avaliação especializada.",
    "sinonimos": [
      "lesao do nervo toracico longo",
      "neuropatia do toracico longo",
      "paralisia do serrato anterior"
    ],
    "palavrasChaveHMA": [
      "escapula alada",
      "alamento medial escapula",
      "fraqueza serrato anterior",
      "dificuldade empurrar parede",
      "toracico longo"
    ],
    "nivelEvidencia": "Revisão anatômico-clínica; observação do alamento não é teste confirmatório isolado.",
    "evidencia": "Martin e Fish 2008, revisão: https://pubmed.ncbi.nlm.nih.gov/19468892/"
  },
  {
    "id": "neuropatia_acessorio_espinal",
    "nome": "Neuropatia do nervo acessório espinal — disfunção do trapézio",
    "testes": [
      "Fraqueza de elevação do ombro contra resistência, comparando os lados",
      "Atrofia ou assimetria do trapézio observada à inspeção",
      "Alamento lateral ou alteração de rotação escapular durante abdução",
      "Exame dos romboides, serrato anterior e região cervical para diferenciação"
    ],
    "interpretacao": "Déficit do trapézio, assimetria e contexto cervical compatível justificam investigação do nervo acessório espinal. História de cirurgia ou biópsia cervical aumenta a relevância, mas não confirma lesão. Déficit novo ou progressivo demanda avaliação médica.",
    "sinonimos": [
      "lesao do nervo acessorio espinal",
      "neuropatia do nervo acessorio",
      "paralisia do trapezio"
    ],
    "palavrasChaveHMA": [
      "fraqueza trapezio",
      "atrofia trapezio",
      "ombro caido",
      "cirurgia cervical",
      "biopsia cervical",
      "alamento lateral escapula"
    ],
    "nivelEvidencia": "Revisão anatômico-clínica; sem regra numérica de confirmação.",
    "evidencia": "Martin e Fish 2008, revisão: https://pubmed.ncbi.nlm.nih.gov/19468892/"
  },
  {
    "id": "amiotrofia_neuralgica",
    "nome": "Amiotrofia neurálgica — síndrome de Parsonage-Turner",
    "testes": [
      "Cronologia de dor intensa no ombro ou braço seguida por fraqueza",
      "Fraqueza com distribuição irregular em diferentes músculos do membro superior",
      "Inspeção de atrofia e alamento escapular conforme músculos acometidos",
      "Exame neurológico para diferenciar mononeuropatia, plexopatia e radiculopatia"
    ],
    "interpretacao": "Dor intensa seguida por paresia irregular é um padrão de investigação, não diagnóstico automático de amiotrofia neurálgica. Excluir causas estruturais e radiculares. Fraqueza nova ou progressiva exige avaliação médica e investigação complementar; um antecedente infeccioso isolado não estabelece a causa.",
    "sinonimos": [
      "amiotrofia neuralgica",
      "parsonage turner",
      "neurite braquial"
    ],
    "palavrasChaveHMA": [
      "dor intensa seguida fraqueza",
      "dor forte depois fraqueza",
      "paresia irregular",
      "parsonage turner",
      "amiotrofia neuralgica"
    ],
    "nivelEvidencia": "Revisão clínica; avaliação especializada e diferenciação neurológica necessárias.",
    "evidencia": "Holle et al. 2024: https://pubmed.ncbi.nlm.nih.gov/38835178/; revisão diagnóstica 2024: https://pubmed.ncbi.nlm.nih.gov/39402917/"
  },
  {
    "id": "sindrome_escapula_crepitante",
    "nome": "Síndrome da escápula crepitante — diferencial escapulotorácico",
    "testes": [
      "Crepitação dolorosa palpável durante o movimento escapulotorácico",
      "Estalido doloroso reproduzindo a queixa familiar durante elevação do braço",
      "Dor à palpação na região escapulotorácica correspondente à queixa",
      "Exame de mobilidade e controle escapular para diferenciar alteração mecânica de déficit neurológico"
    ],
    "interpretacao": "Crepitação ou estalido doloroso pode orientar investigação escapulotorácica. Ruído indolor isolado não estabelece síndrome nem bursite. Correlacionar com função, exame neurológico e investigação de causas estruturais quando indicada.",
    "sinonimos": [
      "escapula crepitante",
      "snapping scapula",
      "bursite escapulotoracica"
    ],
    "palavrasChaveHMA": [
      "crepitacao dolorosa escapula",
      "estalido doloroso escapula",
      "escapula estala com dor",
      "dor escapulotoracica"
    ],
    "nivelEvidencia": "Revisões clínicas; sem cluster numérico universal de confirmação.",
    "evidencia": "Revisão crítica: https://pubmed.ncbi.nlm.nih.gov/24664139/; revisão de escopo: https://pmc.ncbi.nlm.nih.gov/articles/PMC9109590/"
  }
]];
})();
