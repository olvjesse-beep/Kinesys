/* KineSys — banco clínico base regional quadril 1.0.0.
 * Gerado deterministicamente de database/mapeamento_clinico.js.
 * Não editar manualmente sem atualizar o contrato de equivalência.
 */
(function(){
  'use strict';
  if(typeof BANCO_MAPEAMENTO_CLINICO==='undefined')return;
  BANCO_MAPEAMENTO_CLINICO["quadril"]={
  "nome": "Quadril / Virilha / Pelve",
  "palavrasChave": [
    "quadril",
    "virilha",
    "coxa",
    "coxofemoral",
    "trocanter",
    "gluteo",
    "pelve",
    "pubalgia"
  ],
  "clusters": [
    {
      "id": "fai_sindrome",
      "nome": "Síndrome do Impacto Femoroacetabular (FAI) — suspeita",
      "testes": [
        "Sintomas típicos de quadril/virilha relacionados a flexão, rotação ou atividade",
        "FADIR reproduz dor familiar",
        "Redução dolorosa de rotação interna / flexão em contexto compatível",
        "Imagem demonstra morfologia compatível quando necessária para confirmar a síndrome"
      ],
      "limiar": 3,
      "interpretacao": "FAI syndrome requer a tríade de sintomas, sinais clínicos e achados de imagem. FADIR é útil para provocar sintomas, mas tem baixa especificidade e não confirma FAI isoladamente.",
      "palavrasChaveHMA": [
        "dor na virilha",
        "dor flexionando quadril",
        "pinça na frente do quadril",
        "fai",
        "impacto femoroacetabular"
      ],
      "mecanismoPreferido": [
        "insidioso",
        "esforco_repetitivo"
      ],
      "tipoDorPreferido": [
        "mecanica"
      ],
      "esportesRisco": [
        "futebol",
        "hockey",
        "artes marciais",
        "danca"
      ],
      "idadeFaixaBonus": {
        "min": 15,
        "max": 50,
        "bonus": 0.5
      },
      "pesos": {
        "palavraChave": 2,
        "mecanismo": 0.5,
        "tipoDor": 1.2,
        "fatorPiora": 0.3,
        "esporte": 0.15,
        "ocupacao": 0,
        "comorbidade": 0,
        "medicamento": 0,
        "idade": 0.4,
        "cirurgia": 0.5
      },
      "evidencia": "Warwick Agreement: symptoms + clinical signs + imaging."
    },
    {
      "id": "osteoartrite_quadril",
      "nome": "Osteoartrite de Quadril — cluster clínico",
      "testes": [
        "Dor anterior/lateral de quadril relacionada à carga",
        "Rotação interna limitada e/ou dolorosa",
        "Flexão de quadril reduzida",
        "Rigidez matinal geralmente < 60 min"
      ],
      "limiar": 3,
      "interpretacao": "Combinação de idade, dor relacionada à carga e perda de mobilidade, especialmente rotação interna, aumenta a suspeita de OA de quadril. Achado radiográfico isolado não explica necessariamente a dor.",
      "palavrasChaveHMA": [
        "desgaste no quadril",
        "artrose do quadril",
        "rigidez na virilha",
        "dor para calcar sapato"
      ],
      "tipoDorPreferido": [
        "mecanica"
      ],
      "idadeFaixaBonus": {
        "min": 50,
        "max": 100,
        "bonus": 1
      },
      "fatoresPioraRisco": [
        "movimento",
        "posicao_em_pe"
      ],
      "pesos": {
        "palavraChave": 2,
        "mecanismo": 0,
        "tipoDor": 1.2,
        "fatorPiora": 0.3,
        "esporte": 0,
        "ocupacao": 0,
        "comorbidade": 0,
        "medicamento": 0,
        "idade": 1,
        "cirurgia": 0.5
      }
    },
    {
      "id": "gtps",
      "nome": "Síndrome da Dor Trocantérica Maior / Tendinopatia Glútea",
      "testes": [
        "Palpação do grande trocânter reproduz dor familiar",
        "Abdução resistida reproduz dor lateral",
        "Teste de apoio unipodal / carga compressiva lateral reproduz sintomas",
        "Dor lateral ao deitar sobre o lado afetado"
      ],
      "limiar": 2,
      "interpretacao": "Dor lateral focal com reprodução à palpação e carga dos abdutores aumenta a suspeita de GTPS. 'Bursite' isolada é uma explicação incompleta; tendões glúteos frequentemente participam do quadro.",
      "palavrasChaveHMA": [
        "dor do lado do quadril",
        "dor no trocanter",
        "dor deitado de lado",
        "tendinopatia glutea"
      ],
      "mecanismoPreferido": [
        "insidioso",
        "esforco_repetitivo"
      ],
      "tipoDorPreferido": [
        "mecanica"
      ],
      "fatoresPioraRisco": [
        "periodo_noturno",
        "posicao_em_pe"
      ],
      "idadeFaixaBonus": {
        "min": 40,
        "max": 75,
        "bonus": 0.5
      },
      "pesos": {
        "palavraChave": 2,
        "mecanismo": 0.5,
        "tipoDor": 1,
        "fatorPiora": 0.4,
        "esporte": 0.1,
        "ocupacao": 0,
        "comorbidade": 0,
        "medicamento": 0.2,
        "idade": 0.4,
        "cirurgia": 0.3
      }
    },
    {
      "id": "fratura_quadril_pos_operatorio",
      "nome": "Pós-fratura de quadril / fêmur proximal — osteossíntese ou artroplastia",
      "testes": [
        "Tipo de fratura e procedimento registrados",
        "Status de carga permitido e precauções pós-operatórias documentados",
        "Marcha, transferências, dor e força de abdutores/extensores monitoradas"
      ],
      "limiar": 2,
      "interpretacao": "A reabilitação deve priorizar mobilidade e recuperação funcional precoces quando clinicamente permitidas, mas a carga depende do padrão da fratura, estabilidade da fixação e orientação ortopédica. O motor não deve impor precauções universais sem conhecer a abordagem cirúrgica.",
      "palavrasChaveHMA": [
        "fratura do quadril",
        "quebrou femur",
        "fratura colo femur",
        "parafuso no femur",
        "cirurgia fratura quadril"
      ],
      "mecanismoPreferido": [
        "trauma_agudo",
        "pos_cirurgico"
      ],
      "pesos": {
        "palavraChave": 2.5,
        "mecanismo": 2.5,
        "tipoDor": 0,
        "fatorPiora": 0,
        "esporte": 0,
        "ocupacao": 0,
        "comorbidade": 0.4,
        "medicamento": 0.2,
        "idade": 0.8,
        "cirurgia": 2.5
      }
    },
    {
      "id": "lesao_adutores",
      "nome": "Lesão muscular de adutores / dor aguda de virilha",
      "testes": [
        "Mecanismo agudo em mudança de direção, chute ou abertura excessiva",
        "Dor focal em adutores reproduzida por adução resistida",
        "Dor à palpação do complexo adutor concordante",
        "Alongamento dos adutores reproduz sintomas sem sinais predominantes intra-articulares"
      ],
      "limiar": 2,
      "interpretacao": "A combinação de mecanismo, dor focal e adução resistida dolorosa apoia lesão do complexo adutor. Diferenciar de dor inguinal relacionada ao iliopsoas, sínfise púbica, quadril e hérnia/causa visceral.",
      "palavrasChaveHMA": [
        "puxou virilha",
        "estiramento adutor",
        "rasgou adutor",
        "dor na virilha chutando"
      ],
      "mecanismoPreferido": [
        "trauma_agudo"
      ],
      "esportesRisco": [
        "futebol",
        "futsal",
        "tenis",
        "beach tennis",
        "artes marciais"
      ],
      "pesos": {
        "palavraChave": 2.2,
        "mecanismo": 2,
        "tipoDor": 1,
        "fatorPiora": 0.3,
        "esporte": 0.2,
        "ocupacao": 0,
        "comorbidade": 0,
        "medicamento": 0,
        "idade": 0,
        "cirurgia": 0
      }
    },
    {
      "id": "lesao_isquiotibiais",
      "nome": "Lesão muscular de isquiotibiais",
      "testes": [
        "Dor posterior de coxa de início súbito em corrida, sprint ou alongamento forçado",
        "Dor à contração resistida de flexores do joelho/extensores do quadril",
        "Dor à palpação/alongamento do músculo ou junção miotendínea",
        "Déficit de força ou função em comparação ao lado contralateral"
      ],
      "limiar": 2,
      "interpretacao": "A avaliação deve considerar músculo/tecido envolvido, mecanismo, gravidade, sintomas, força e resposta à carga. A progressão é preferencialmente baseada em critérios e demanda esportiva, incluindo exposição progressiva à corrida/sprint quando pertinente, e não apenas em tempo.",
      "palavrasChaveHMA": [
        "estiramento posterior de coxa",
        "puxou posterior",
        "lesao hamstring",
        "rasgou posterior"
      ],
      "mecanismoPreferido": [
        "trauma_agudo"
      ],
      "esportesRisco": [
        "futebol",
        "corrida",
        "atletismo",
        "rugby"
      ],
      "pesos": {
        "palavraChave": 2.3,
        "mecanismo": 2.2,
        "tipoDor": 1,
        "fatorPiora": 0.3,
        "esporte": 0.2,
        "ocupacao": 0,
        "comorbidade": 0,
        "medicamento": 0,
        "idade": 0,
        "cirurgia": 0
      },
      "evidencia": "London International Consensus on Hamstring Injuries, BJSM."
    }
  ],
  "diferenciais": [
    {
      "id": "dor_referida_lombar_quadril",
      "nome": "Dor Referida de Origem Lombar",
      "testes": [
        "Movimento lombar modifica a dor no quadril/coxa",
        "Sinais neurológicos ou padrão radicular presentes",
        "Exame local do quadril não explica adequadamente a queixa"
      ],
      "interpretacao": "Diferencie origem lombar quando a apresentação do quadril é pouco concordante ou há modulação clara pela coluna."
    },
    {
      "id": "dor_inguinal_adutor",
      "nome": "Dor Inguinal relacionada a Adutores / Púbis / Parede Abdominal",
      "testes": [
        "Palpação e adução resistida reproduzem dor de adutor",
        "Sit-up/carga abdominal reproduz dor de parede abdominal",
        "Dor pubiana focal reproduzida à palpação/carga"
      ],
      "interpretacao": "Classifique dor inguinal pela estrutura clínica predominante (adutor, iliopsoas, inguinal, púbica ou relacionada ao quadril) em vez de agrupar tudo como 'pubalgia'."
    },
    {
      "id": "fratura_estresse_colo_femur",
      "nome": "Fratura por Estresse do Colo Femoral — hipótese de segurança",
      "testes": [
        "Dor na virilha com carga progressiva e corrida/salto",
        "Dor em repouso/noturna ou piora rápida",
        "Hop test/carga axial provoca dor importante — não insistir se suspeita alta"
      ],
      "interpretacao": "Suspeita de fratura por estresse do colo femoral exige interrupção da carga e avaliação por imagem, especialmente em atletas, baixa disponibilidade energética ou dor progressiva."
    }
  ],
  "redFlags": [
    "Trauma com incapacidade de apoiar peso, deformidade/rotação externa do membro ou suspeita de fratura do colo femoral",
    "Dor na virilha progressiva em corredor/atleta com dor noturna ou em repouso — considerar fratura por estresse do colo femoral",
    "Febre, quadril muito doloroso e limitação importante — considerar artrite séptica",
    "Dor intensa súbita com fatores de risco para osteonecrose (ex.: uso prolongado de corticoide, álcool em excesso) — considerar investigação médica",
    "Dor pélvica/inguinal com sintomas abdominais, urinários, ginecológicos ou massa inguinal não redutível — considerar origem visceral/hérnia complicada",
    "Dor não mecânica progressiva, perda de peso ou história de câncer",
    "Pós-fratura/pós-operatório com nova incapacidade de apoio, deformidade, rotação anormal, estalido ou dor súbita intensa — considerar falha mecânica/luxação/nova fratura",
    "Edema unilateral importante, dispneia ou dor torácica no pós-operatório — considerar TVP/TEP"
  ]
};
})();
