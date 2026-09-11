/* KineSys — banco clínico base regional lombar 1.0.0.
 * Gerado deterministicamente de database/mapeamento_clinico.js.
 * Não editar manualmente sem atualizar o contrato de equivalência.
 */
(function(){
  'use strict';
  if(typeof BANCO_MAPEAMENTO_CLINICO==='undefined')return;
  BANCO_MAPEAMENTO_CLINICO["lombar"]={
  "nome": "Coluna Lombar / Lombossacra",
  "palavrasChave": [
    "lombar",
    "lombalgia",
    "coluna baixa",
    "ciatica",
    "ciatico",
    "perna",
    "gluteo",
    "sacroiliaca"
  ],
  "clusters": [
    {
      "id": "radiculopatia_lombossacra",
      "nome": "Radiculopatia Lombossacra",
      "testes": [
        "SLR/Lasègue reproduz dor radicular familiar em distribuição compatível",
        "Slump / teste neurodinâmico concordante",
        "Déficit de miótomo, dermátomo e/ou reflexo compatível",
        "Sintomas distais/neurológicos com padrão radicular"
      ],
      "limiar": 2,
      "regraConfirmacao": {
        "tipo": "minimo",
        "minimo": 2
      },
      "interpretacao": "A hipótese de radiculopatia deve combinar sintomas radiculares com exame neurológico e/ou neurodinâmico concordante. Evite usar 'hérnia de disco' como sinônimo de radiculopatia sem correlação clínica e, quando necessário, imagem.",
      "palavrasChaveHMA": [
        "ciatica",
        "dor descendo pela perna",
        "formigamento na perna",
        "dormencia no pe",
        "fraqueza na perna",
        "choque na perna"
      ],
      "mecanismoPreferido": [
        "insidioso",
        "trauma_agudo"
      ],
      "tipoDorPreferido": [
        "neuropatica"
      ],
      "fatoresPioraRisco": [
        "posicao_sentada",
        "movimento"
      ],
      "pesos": {
        "palavraChave": 2.2,
        "mecanismo": 0.5,
        "tipoDor": 2.5,
        "fatorPiora": 0.4,
        "esporte": 0.1,
        "ocupacao": 0.1,
        "comorbidade": 0.2,
        "medicamento": 0,
        "idade": 0,
        "cirurgia": 0.5
      }
    },
    {
      "id": "dor_sacroiliaca_provocacao",
      "nome": "Dor da Articulação Sacroilíaca — cluster de provocação",
      "testes": [
        "Distração pélvica",
        "Thigh Thrust",
        "Compressão pélvica",
        "Sacral Thrust",
        "Gaenslen"
      ],
      "limiar": 2,
      "regraConfirmacao": {
        "tipo": "minimo",
        "minimo": 2
      },
      "interpretacao": "Dois ou mais testes de provocação concordantes aumentam a plausibilidade de dor originada na região sacroilíaca. Interprete junto ao padrão de dor e descarte origem lombar/coxofemoral; não rotular como 'desalinhamento' pélvico.",
      "palavrasChaveHMA": [
        "dor na sacroiliaca",
        "dor perto da covinha",
        "dor unilateral no gluteo",
        "dor posterior da pelve"
      ],
      "mecanismoPreferido": [
        "trauma_agudo",
        "pos_cirurgico",
        "insidioso"
      ],
      "tipoDorPreferido": [
        "mecanica"
      ],
      "fatoresPioraRisco": [
        "posicao_em_pe",
        "movimento"
      ],
      "pesos": {
        "palavraChave": 1.8,
        "mecanismo": 0.5,
        "tipoDor": 1.2,
        "fatorPiora": 0.4,
        "esporte": 0.1,
        "ocupacao": 0.1,
        "comorbidade": 0,
        "medicamento": 0,
        "idade": 0,
        "cirurgia": 0.3
      },
      "evidencia": "Laslett pain provocation cluster."
    },
    {
      "id": "fratura_compressao_vertebral",
      "nome": "Suspeita de fratura vertebral por compressão",
      "testes": [
        "Trauma relevante ou trauma menor em pessoa com fragilidade óssea",
        "Dor focal vertebral nova e importante",
        "Idade avançada, osteoporose ou uso prolongado de corticoide aumentam plausibilidade",
        "Mudança funcional aguda sem padrão mecânico habitual"
      ],
      "limiar": 2,
      "interpretacao": "A combinação de trauma, fragilidade óssea e dor vertebral focal eleva a suspeita de fratura por compressão. Nenhum achado isolado exclui ou confirma; quando a suspeita é relevante, encaminhar para avaliação médica/imagem antes de tratamento de carga ou manipulação.",
      "palavrasChaveHMA": [
        "fratura na coluna",
        "vertebra quebrada",
        "compressao vertebral",
        "caiu e doeu a coluna"
      ],
      "mecanismoPreferido": [
        "trauma_agudo"
      ],
      "medicamentosRisco": [
        "corticoide"
      ],
      "idadeFaixaBonus": {
        "min": 65,
        "max": 100,
        "bonus": 1
      },
      "pesos": {
        "palavraChave": 2.5,
        "mecanismo": 2.5,
        "tipoDor": 0.5,
        "fatorPiora": 0,
        "esporte": 0,
        "ocupacao": 0,
        "comorbidade": 1,
        "medicamento": 1.5,
        "idade": 1,
        "cirurgia": 0
      }
    },
    {
      "id": "pos_operatorio_lombar",
      "nome": "Pós-operatório Lombar — descompressão / discectomia / artrodese",
      "testes": [
        "Procedimento, nível e data da cirurgia registrados",
        "Sintomas neurológicos atuais comparados ao pré-operatório",
        "Tolerância a marcha, posições e atividades funcionais acompanhada",
        "Sem febre, secreção, déficit neurológico progressivo ou nova alteração esfincteriana"
      ],
      "limiar": 2,
      "interpretacao": "O foco é monitorar recuperação funcional e sinais de complicação, sem presumir que um protocolo temporal único sirva para discectomia, descompressão e artrodese. Progressão deve considerar técnica, consolidação quando aplicável, sintomas e orientação cirúrgica.",
      "palavrasChaveHMA": [
        "cirurgia de hernia",
        "artrodese lombar",
        "discectomia lombar",
        "laminectomia",
        "pos operatorio lombar"
      ],
      "mecanismoPreferido": [
        "pos_cirurgico"
      ],
      "pesos": {
        "palavraChave": 2.2,
        "mecanismo": 3,
        "tipoDor": 0,
        "fatorPiora": 0,
        "esporte": 0,
        "ocupacao": 0,
        "comorbidade": 0.4,
        "medicamento": 0.2,
        "idade": 0,
        "cirurgia": 2.5
      }
    }
  ],
  "diferenciais": [
    {
      "id": "lombalgia_inespecifica",
      "nome": "Dor Lombar Inespecífica",
      "testes": [
        "Dor lombar sem sinais de patologia séria",
        "Exame neurológico sem déficit radicular relevante",
        "Sintomas moduláveis por movimento, carga ou atividade"
      ],
      "interpretacao": "A maioria das apresentações de dor lombar em atenção musculoesquelética é inespecífica. A classificação deve orientar manejo e prognóstico, não presumir uma estrutura anatômica causal sem evidência suficiente.",
      "palavrasChaveHMA": [
        "dor lombar",
        "lombalgia",
        "travou a lombar",
        "dor nas costas"
      ],
      "mecanismoPreferido": [
        "insidioso",
        "esforco_repetitivo",
        "trauma_agudo"
      ],
      "tipoDorPreferido": [
        "mecanica"
      ],
      "pesos": {
        "palavraChave": 1,
        "mecanismo": 0.4,
        "tipoDor": 1,
        "fatorPiora": 0.3,
        "esporte": 0.05,
        "ocupacao": 0.05,
        "comorbidade": 0,
        "medicamento": 0,
        "idade": 0,
        "cirurgia": 0.2
      }
    },
    {
      "id": "estenose_lombar",
      "nome": "Estenose Lombar com Claudicação Neurogênica",
      "testes": [
        "Dor/parestesia em MMII piora com caminhada ou ortostatismo",
        "Sintomas aliviam ao sentar ou flexionar a coluna",
        "Extensão lombar tende a agravar e flexão tende a aliviar"
      ],
      "interpretacao": "Padrão de claudicação neurogênica em pessoa mais velha aumenta a suspeita de estenose. Diferenciar de claudicação vascular e correlacionar com exame neurológico e imagem quando indicado.",
      "palavrasChaveHMA": [
        "dor andando que melhora sentado",
        "pernas pesadas ao caminhar",
        "melhora curvado",
        "carrinho de supermercado"
      ],
      "idadeFaixaBonus": {
        "min": 60,
        "max": 100,
        "bonus": 1.5
      },
      "tipoDorPreferido": [
        "neuropatica",
        "mecanica"
      ],
      "fatoresPioraRisco": [
        "posicao_em_pe"
      ],
      "pesos": {
        "palavraChave": 2.5,
        "mecanismo": 0,
        "tipoDor": 1,
        "fatorPiora": 1,
        "esporte": 0,
        "ocupacao": 0,
        "comorbidade": 0,
        "medicamento": 0,
        "idade": 1.2,
        "cirurgia": 0.3
      }
    },
    {
      "id": "espondilolise_espondilolistese",
      "nome": "Espondilólise / Espondilolistese — suspeita clínica",
      "testes": [
        "Dor lombar relacionada à extensão em atleta/jovem",
        "Dor localizada com carga repetida em extensão/rotação",
        "Imagem é necessária para confirmar defeito ósseo / deslizamento quando clinicamente indicado"
      ],
      "interpretacao": "Testes físicos isolados, incluindo extensão unipodal, não confirmam espondilólise. Em jovens com dor persistente associada a extensão, considere investigação médica/imagem conforme quadro.",
      "palavrasChaveHMA": [
        "dor com extensao lombar",
        "ginastica",
        "lombar em atleta jovem"
      ],
      "idadeFaixaBonus": {
        "min": 10,
        "max": 25,
        "bonus": 1
      },
      "esportesRisco": [
        "ginastica",
        "bale",
        "mergulho",
        "levantamento"
      ],
      "pesos": {
        "palavraChave": 1.8,
        "mecanismo": 0.5,
        "tipoDor": 0.8,
        "fatorPiora": 0.3,
        "esporte": 0.3,
        "ocupacao": 0,
        "comorbidade": 0,
        "medicamento": 0,
        "idade": 1,
        "cirurgia": 0
      }
    },
    {
      "id": "instabilidade_lombar",
      "nome": "Padrão de Instabilidade / Controle de Movimento Lombar",
      "testes": [
        "Prone Instability Test reproduz/modifica sintomas em contexto compatível",
        "Movimentos aberrantes / Gower / arco doloroso inconsistente",
        "Sintomas relacionados a controle de movimento e sustentação de carga"
      ],
      "interpretacao": "Achados podem apoiar uma classificação de controle de movimento, mas não demonstram 'vértebra fora do lugar' nem instabilidade radiológica. Use para orientar exame e intervenção, não como diagnóstico estrutural definitivo.",
      "palavrasChaveHMA": [
        "sensacao de instabilidade lombar",
        "falha na lombar",
        "trava e destrava"
      ],
      "mecanismoPreferido": [
        "insidioso",
        "esforco_repetitivo"
      ],
      "tipoDorPreferido": [
        "mecanica"
      ],
      "pesos": {
        "palavraChave": 1,
        "mecanismo": 0.3,
        "tipoDor": 0.8,
        "fatorPiora": 0.3,
        "esporte": 0,
        "ocupacao": 0,
        "comorbidade": 0,
        "medicamento": 0,
        "idade": 0,
        "cirurgia": 0.2
      }
    }
  ],
  "redFlags": [
    "Disfunção urinária nova (retenção/incontinência), anestesia em sela, alteração sexual ou déficit neurológico bilateral/progressivo — considerar síndrome da cauda equina e encaminhamento emergencial",
    "Déficit motor progressivo, perda rápida de força ou sinais neurológicos extensos",
    "Trauma importante ou trauma menor em pessoa com osteoporose/idade avançada/uso prolongado de corticoide — considerar fratura",
    "Febre, imunossupressão, infecção recente, procedimento invasivo recente ou uso de drogas IV com dor espinal — considerar infecção",
    "História de câncer, perda de peso inexplicada ou dor progressiva não mecânica — considerar neoplasia",
    "Dor lombar/abdominal com massa pulsátil, síncope, instabilidade hemodinâmica ou fatores de risco vasculares — considerar aneurisma de aorta abdominal",
    "Dor lombar com sintomas sistêmicos/inflamatórios atípicos ou forte suspeita de doença visceral/geniturinária — encaminhar conforme contexto"
  ]
};
})();
