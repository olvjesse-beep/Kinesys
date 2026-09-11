/* KineSys — banco clínico base regional tornozelo_pe 1.0.0.
 * Gerado deterministicamente de database/mapeamento_clinico.js.
 * Não editar manualmente sem atualizar o contrato de equivalência.
 */
(function(){
  'use strict';
  if(typeof BANCO_MAPEAMENTO_CLINICO==='undefined')return;
  BANCO_MAPEAMENTO_CLINICO["tornozelo_pe"]={
  "nome": "Tornozelo e Pé",
  "palavrasChave": [
    "tornozelo",
    "pe",
    "calcanhar",
    "aquiles",
    "fascia",
    "metatarso",
    "maleolo",
    "plantar"
  ],
  "clusters": [
    {
      "id": "entorse_lateral_tornozelo",
      "nome": "Entorse Lateral de Tornozelo",
      "testes": [
        "Anterior Drawer do tornozelo: laxidade/dor compatível com LTFA",
        "Talar Tilt: laxidade/dor compatível com LCF",
        "História de inversão com dor/edema lateral",
        "Capacidade de apoio e função avaliadas após triagem de fratura"
      ],
      "limiar": 2,
      "interpretacao": "História de inversão, dor/edema lateral e testes ligamentares concordantes apoiam entorse lateral. Na fase aguda, primeiro aplique critérios de necessidade de radiografia quando apropriado.",
      "palavrasChaveHMA": [
        "torceu o tornozelo",
        "virou o pe",
        "entorse",
        "inchou do lado de fora"
      ],
      "mecanismoPreferido": [
        "trauma_agudo"
      ],
      "tipoDorPreferido": [
        "mecanica"
      ],
      "esportesRisco": [
        "futebol",
        "basquete",
        "volei",
        "corrida"
      ],
      "pesos": {
        "palavraChave": 2.3,
        "mecanismo": 2.2,
        "tipoDor": 0.5,
        "fatorPiora": 0.3,
        "esporte": 0.15,
        "ocupacao": 0,
        "comorbidade": 0,
        "medicamento": 0,
        "idade": 0,
        "cirurgia": 0.5
      }
    },
    {
      "id": "lesao_sindesmose",
      "nome": "Lesão da Sindesmose / Entorse Alta",
      "testes": [
        "Squeeze Test reproduz dor distal na sindesmose",
        "External Rotation Stress Test reproduz dor sindesmótica",
        "Dor acima da articulação do tornozelo após rotação externa/dorsiflexão",
        "Dor desproporcional para entorse lateral simples / dificuldade importante de apoio"
      ],
      "limiar": 2,
      "interpretacao": "Dois ou mais achados concordantes aumentam a suspeita de lesão sindesmótica. Lesões instáveis podem necessitar imagem e avaliação ortopédica.",
      "palavrasChaveHMA": [
        "entorse alta",
        "dor acima do tornozelo",
        "torceu com pe preso",
        "sindesmose"
      ],
      "mecanismoPreferido": [
        "trauma_agudo"
      ],
      "pesos": {
        "palavraChave": 2.2,
        "mecanismo": 2,
        "tipoDor": 0.5,
        "fatorPiora": 0.3,
        "esporte": 0.1,
        "ocupacao": 0,
        "comorbidade": 0,
        "medicamento": 0,
        "idade": 0,
        "cirurgia": 0.3
      }
    },
    {
      "id": "ruptura_aquiles",
      "nome": "Ruptura do Tendão de Aquiles",
      "testes": [
        "Thompson/Simmonds: ausência ou redução importante de flexão plantar",
        "Defeito palpável no tendão em contexto agudo",
        "Perda súbita de capacidade de impulsão / sensação de 'chute' na panturrilha"
      ],
      "limiar": 2,
      "interpretacao": "Thompson positivo e perda funcional súbita são altamente preocupantes para ruptura do Aquiles. Encaminhar prontamente para avaliação médica/ortopédica; tratamento pode ser operatório ou não operatório conforme caso.",
      "palavrasChaveHMA": [
        "pareceu que chutaram minha panturrilha",
        "estalo no aquiles",
        "rompeu aquiles",
        "nao consegue ficar na ponta do pe"
      ],
      "mecanismoPreferido": [
        "trauma_agudo"
      ],
      "medicamentosRisco": [
        "fluoroquinolona",
        "corticoide"
      ],
      "idadeFaixaBonus": {
        "min": 30,
        "max": 60,
        "bonus": 0.5
      },
      "pesos": {
        "palavraChave": 3,
        "mecanismo": 2.5,
        "tipoDor": 0.5,
        "fatorPiora": 0,
        "esporte": 0.2,
        "ocupacao": 0,
        "comorbidade": 0.3,
        "medicamento": 1,
        "idade": 0.4,
        "cirurgia": 0.2
      }
    },
    {
      "id": "fratura_tornozelo_pos_operatorio",
      "nome": "Pós-fratura de tornozelo / osteossíntese",
      "testes": [
        "Padrão de fratura e procedimento registrados",
        "Carga permitida e uso de órtese/bota documentados",
        "ADM, edema, marcha, força de panturrilha e função monitorados"
      ],
      "limiar": 2,
      "interpretacao": "A progressão de mobilidade e descarga de peso deve respeitar estabilidade da fixação, consolidação e orientação ortopédica. O motor deve registrar restrições específicas e evitar protocolo único para todas as fraturas maleolares/sindesmóticas.",
      "palavrasChaveHMA": [
        "fratura tornozelo",
        "quebrou tornozelo",
        "placa no tornozelo",
        "parafuso maleolo",
        "orif tornozelo"
      ],
      "mecanismoPreferido": [
        "trauma_agudo",
        "pos_cirurgico"
      ],
      "pesos": {
        "palavraChave": 2.4,
        "mecanismo": 2.4,
        "tipoDor": 0,
        "fatorPiora": 0,
        "esporte": 0,
        "ocupacao": 0,
        "comorbidade": 0.3,
        "medicamento": 0.2,
        "idade": 0,
        "cirurgia": 2.5
      }
    },
    {
      "id": "lesao_muscular_panturrilha",
      "nome": "Lesão muscular da panturrilha — gastrocnêmio / sóleo",
      "testes": [
        "Dor súbita focal na panturrilha durante corrida, aceleração, salto ou mudança de direção",
        "Dor reproduzida por elevação de calcanhar e/ou flexão plantar resistida",
        "Dor à palpação/alongamento do gastrocnêmio ou sóleo em padrão concordante",
        "Thompson preservado quando não há suspeita de ruptura completa do Aquiles"
      ],
      "limiar": 2,
      "interpretacao": "A lesão de panturrilha é heterogênea e deve ser diferenciada de ruptura do Aquiles e trombose venosa profunda. Progressão de carga e retorno à corrida devem usar sintomas, capacidade de força e demandas esportivas; imagem pode ajudar na graduação/prognóstico, mas não substitui avaliação clínica.",
      "palavrasChaveHMA": [
        "estiramento panturrilha",
        "pedrada na panturrilha",
        "puxou gemeos",
        "rasgou panturrilha"
      ],
      "mecanismoPreferido": [
        "trauma_agudo"
      ],
      "esportesRisco": [
        "futebol",
        "corrida",
        "tenis",
        "beach tennis",
        "atletismo"
      ],
      "pesos": {
        "palavraChave": 2.4,
        "mecanismo": 2.2,
        "tipoDor": 1,
        "fatorPiora": 0.2,
        "esporte": 0.2,
        "ocupacao": 0,
        "comorbidade": 0,
        "medicamento": 0,
        "idade": 0,
        "cirurgia": 0
      },
      "evidencia": "Green et al. expert consensus; Pagan-Rosado et al. review 2025."
    },
    {
      "id": "ruptura_aquiles_pos_operatorio",
      "nome": "Ruptura do Aquiles — pós-operatório ou tratamento funcional",
      "testes": [
        "Tipo de tratamento e data da lesão/reparo registrados",
        "Proteção do tendão e limites de dorsiflexão/carga documentados conforme protocolo",
        "Função de flexão plantar e progressão de marcha acompanhadas",
        "Sem sinais de reruptura, infecção, TVP ou falha de cicatrização"
      ],
      "limiar": 2,
      "interpretacao": "O motor deve distinguir diagnóstico de ruptura aguda da fase de reabilitação. Após reparo ou tratamento funcional, carga e dorsiflexão são progressivas e dependem do protocolo e da evolução; não usar um calendário universal sem dados do procedimento.",
      "palavrasChaveHMA": [
        "ruptura aquiles",
        "cirurgia aquiles",
        "sutura aquiles",
        "pos operatorio aquiles"
      ],
      "mecanismoPreferido": [
        "pos_cirurgico",
        "trauma_agudo"
      ],
      "pesos": {
        "palavraChave": 2.5,
        "mecanismo": 2.7,
        "tipoDor": 0,
        "fatorPiora": 0,
        "esporte": 0.1,
        "ocupacao": 0,
        "comorbidade": 0.2,
        "medicamento": 0.4,
        "idade": 0,
        "cirurgia": 2.5
      }
    }
  ],
  "diferenciais": [
    {
      "id": "dor_plantar_calcanhar",
      "nome": "Dor Plantar do Calcâneo / Fasciopatia Plantar",
      "testes": [
        "Dor medial plantar no calcâneo, pior nos primeiros passos após repouso",
        "Palpação da inserção medial da fáscia reproduz dor",
        "Windlass test / dorsiflexão dos dedos reproduz dor em contexto compatível"
      ],
      "interpretacao": "A apresentação típica é dor plantar medial no calcâneo com padrão de primeiros passos e sensibilidade local. O termo 'esporão' não deve ser usado como explicação causal automática.",
      "palavrasChaveHMA": [
        "dor no calcanhar de manha",
        "primeiros passos doem",
        "dor na sola do pe",
        "fascite plantar"
      ],
      "mecanismoPreferido": [
        "insidioso",
        "esforco_repetitivo"
      ],
      "tipoDorPreferido": [
        "mecanica"
      ],
      "fatoresPioraRisco": [
        "posicao_em_pe"
      ],
      "pesos": {
        "palavraChave": 2,
        "mecanismo": 0.6,
        "tipoDor": 1,
        "fatorPiora": 0.4,
        "esporte": 0.1,
        "ocupacao": 0.1,
        "comorbidade": 0,
        "medicamento": 0,
        "idade": 0,
        "cirurgia": 0.2
      }
    },
    {
      "id": "tendinopatia_tibial_posterior",
      "nome": "Disfunção do Tendão Tibial Posterior / Pé Plano Adquirido",
      "testes": [
        "Dor/edema no trajeto posteromedial do tornozelo",
        "Single-leg heel raise doloroso, fraco ou incapaz",
        "Queda progressiva do arco / sinal de muitos dedos em contexto compatível"
      ],
      "interpretacao": "A incapacidade de elevação unilateral do calcâneo e deformidade progressiva aumentam a suspeita de disfunção do tibial posterior."
    },
    {
      "id": "neuroma_morton",
      "nome": "Neuroma de Morton / Dor Intermetatarsal",
      "testes": [
        "Dor/parestesia em espaço intermetatarsal, frequentemente 3º",
        "Compressão do antepé reproduz sintomas",
        "Mulder click pode estar presente, mas não é obrigatório"
      ],
      "interpretacao": "Considere neuroma quando há dor neuropática focal no antepé e reprodução por compressão. Diferencie de metatarsalgia, fratura por estresse e neuropatia."
    },
    {
      "id": "tendinopatia_aquiles",
      "nome": "Tendinopatia do Tendão de Aquiles",
      "testes": [
        "Dor localizada no tendão de Aquiles relacionada à carga, corrida, salto ou elevação de calcanhar",
        "Palpação/carga do tendão reproduz a dor familiar sem sinais de ruptura aguda",
        "Capacidade de elevação de calcanhar está dolorosa ou reduzida, mas Thompson não sugere ruptura completa"
      ],
      "regraConfirmacao": {
        "tipo": "minimo",
        "minimo": 2
      },
      "interpretacao": "Padrão compatível com tendinopatia quando a dor é localizada e relacionada à carga. Diferenciar de ruptura, bursite, dor referida e condições inflamatórias conforme contexto.",
      "palavrasChaveHMA": [
        "dor no aquiles",
        "tendinite aquiles",
        "dor no tendao de aquiles",
        "aquiles doi correndo"
      ],
      "mecanismoPreferido": [
        "insidioso",
        "esforco_repetitivo"
      ],
      "pesos": {
        "palavraChave": 2,
        "mecanismo": 0.8,
        "esporte": 0.2
      }
    },
    {
      "id": "instabilidade_cronica_tornozelo",
      "nome": "Instabilidade Crônica do Tornozelo — hipótese funcional",
      "testes": [
        "História de entorses recorrentes ou sensação de falseio/giving way",
        "Déficit funcional em equilíbrio, salto ou tarefas específicas após entorse prévia",
        "Laxidade mecânica pode estar presente, mas sintomas recorrentes e função são considerados em conjunto"
      ],
      "regraConfirmacao": {
        "tipo": "minimo",
        "minimo": 2
      },
      "interpretacao": "Fenótipo útil após entorse quando persistem falseio e déficits funcionais. Diferenciar instabilidade funcional de lesão aguda não cicatrizada, sindesmose e causas neurológicas.",
      "palavrasChaveHMA": [
        "tornozelo falseia",
        "entorse recorrente",
        "tornozelo vira sempre",
        "instabilidade tornozelo"
      ],
      "mecanismoPreferido": [
        "trauma_agudo",
        "esforco_repetitivo"
      ],
      "pesos": {
        "palavraChave": 1.9,
        "mecanismo": 0.4
      }
    },
    {
      "id": "neuropatia_periferica",
      "nome": "Neuropatia Periférica / Risco de Pé Diabético",
      "testes": [
        "Monofilamento de 10 g com perda de sensibilidade protetora",
        "Sensibilidade vibratória/neurológica alterada",
        "Inspeção de pele, perfusão e deformidades"
      ],
      "interpretacao": "Em diabetes ou suspeita neuropática, priorize avaliação de sensibilidade protetora, integridade cutânea e perfusão. Úlcera, infecção ou isquemia exigem encaminhamento apropriado.",
      "comorbidadesRisco": [
        "diabetico"
      ],
      "pesos": {
        "palavraChave": 1,
        "mecanismo": 0,
        "tipoDor": 1,
        "fatorPiora": 0,
        "esporte": 0,
        "ocupacao": 0,
        "comorbidade": 2,
        "medicamento": 0,
        "idade": 0.3,
        "cirurgia": 0
      }
    }
  ],
  "redFlags": [
    "Aplicar Ottawa Ankle/Foot Rules após trauma quando apropriado: dor em zona maleolar/midfoot + dor óssea específica ou incapacidade de apoiar pode indicar necessidade de radiografia",
    "Deformidade, ferida aberta, comprometimento neurovascular ou suspeita de luxação/fratura instável",
    "Dor desproporcional, tensão progressiva, parestesia e piora rápida após trauma — considerar síndrome compartimental",
    "Pé diabético com úlcera, infecção, necrose, isquemia ou perda importante de sensibilidade protetora",
    "Panturrilha dolorosa/inchada assimétrica, especialmente com fatores de risco trombóticos — considerar TVP",
    "Dor óssea focal progressiva em atleta, pior com carga e eventualmente em repouso — considerar fratura por estresse",
    "Pós-fratura/pós-operatório com dor progressiva desproporcional, sinais de infecção, alteração neurovascular ou suspeita de falha de fixação",
    "Panturrilha quente/edemaciada com dor não explicada mecanicamente, especialmente pós-imobilização — considerar TVP"
  ]
};
})();
