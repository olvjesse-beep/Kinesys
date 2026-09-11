/* KineSys — banco clínico base regional cervical 1.0.0.
 * Gerado deterministicamente de database/mapeamento_clinico.js.
 * Não editar manualmente sem atualizar o contrato de equivalência.
 */
(function(){
  'use strict';
  if(typeof BANCO_MAPEAMENTO_CLINICO==='undefined')return;
  BANCO_MAPEAMENTO_CLINICO["cervical"]={
  "nome": "Coluna Cervical",
  "palavrasChave": [
    "cervical",
    "pescoco",
    "nuca",
    "cervicalgia",
    "braco",
    "mao",
    "cefaleia",
    "dor de cabeca"
  ],
  "clusters": [
    {
      "id": "radiculopatia_cervical",
      "nome": "Radiculopatia Cervical — cluster de exame",
      "testes": [
        "Spurling / compressão foraminal reproduz sintomas radiculares típicos",
        "Distração cervical reduz sintomas radiculares",
        "ULTT1 / teste neurodinâmico do nervo mediano compatível com os sintomas",
        "Rotação cervical ativa < 60° para o lado sintomático"
      ],
      "limiar": 3,
      "regraConfirmacao": {
        "tipo": "minimo",
        "minimo": 3
      },
      "interpretacao": "Três ou mais achados concordantes aumentam a suspeita de radiculopatia cervical; quatro achados tornam o padrão mais convincente. Correlacione com dermátomos, miótomos, reflexos e déficit neurológico. O cluster não identifica sozinho a causa anatômica da radiculopatia.",
      "palavrasChaveHMA": [
        "formigamento no braco",
        "formigamento na mao",
        "dormencia",
        "choque",
        "irradia para o braco",
        "fraqueza no braco",
        "dor descendo pelo braco"
      ],
      "mecanismoPreferido": [
        "insidioso",
        "esforco_repetitivo"
      ],
      "tipoDorPreferido": [
        "neuropatica"
      ],
      "fatoresPioraRisco": [
        "movimento",
        "posicao_sentada"
      ],
      "pesos": {
        "palavraChave": 2.2,
        "mecanismo": 1,
        "tipoDor": 2.5,
        "fatorPiora": 0.5,
        "esporte": 0.25,
        "ocupacao": 0.25,
        "comorbidade": 0.5,
        "medicamento": 0.5,
        "idade": 0.5,
        "cirurgia": 0.5
      },
      "evidencia": "Wainner et al.; Neck Pain CPG/JOSPT."
    },
    {
      "id": "mielopatia_cervical_suspeita",
      "nome": "Suspeita de Mielopatia Cervical Degenerativa",
      "testes": [
        "Hoffmann positivo associado a outros sinais de trato longo",
        "Hiperreflexia difusa / clônus",
        "Alteração de marcha, equilíbrio ou destreza manual",
        "Fraqueza multissegmentar / sintomas em mais de um membro"
      ],
      "limiar": 2,
      "regraConfirmacao": {
        "tipo": "minimo",
        "minimo": 2
      },
      "interpretacao": "Combinação de sinais de trato longo, alteração de marcha/destreza e sintomas multissegmentares deve elevar a suspeita de mielopatia e indicar avaliação médica especializada. Não utilizar um teste isolado para excluir mielopatia.",
      "palavrasChaveHMA": [
        "maos desajeitadas",
        "derrubando objetos",
        "dificuldade para andar",
        "pernas pesadas",
        "choque ao flexionar pescoco",
        "sintomas nos quatro membros"
      ],
      "tipoDorPreferido": [
        "neuropatica"
      ],
      "idadeFaixaBonus": {
        "min": 50,
        "max": 100,
        "bonus": 1
      },
      "pesos": {
        "palavraChave": 3,
        "mecanismo": 0,
        "tipoDor": 1,
        "fatorPiora": 0,
        "esporte": 0,
        "ocupacao": 0,
        "comorbidade": 0.5,
        "medicamento": 0,
        "idade": 1,
        "cirurgia": 0
      },
      "evidencia": "Clinical reasoning for degenerative cervical myelopathy; serious pathology screening."
    },
    {
      "id": "pos_operatorio_cervical",
      "nome": "Pós-operatório Cervical — artrodese / discectomia / descompressão",
      "testes": [
        "Procedimento, data e níveis operados confirmados em documento ou relato confiável",
        "Déficit neurológico atual comparado ao pré-operatório",
        "ADM, dor, função e tolerância à carga dentro das restrições do cirurgião",
        "Ferida, febre, disfagia progressiva ou piora neurológica ausentes"
      ],
      "limiar": 2,
      "regraConfirmacao": {
        "tipo": "minimo",
        "minimo": 2
      },
      "interpretacao": "Organiza a reavaliação pós-operatória, mas não define progressão por tempo isolado. Restrições de carga, mobilidade e retorno funcional devem respeitar técnica cirúrgica, níveis envolvidos, consolidação e orientação do cirurgião. Nova piora neurológica, febre, secreção, disfagia progressiva ou dor desproporcional exigem reavaliação médica.",
      "palavrasChaveHMA": [
        "artrodese cervical",
        "discectomia cervical",
        "cirurgia cervical",
        "pos operatorio cervical",
        "descompressao cervical"
      ],
      "mecanismoPreferido": [
        "pos_cirurgico"
      ],
      "pesos": {
        "palavraChave": 2.5,
        "mecanismo": 3,
        "tipoDor": 0,
        "fatorPiora": 0,
        "esporte": 0,
        "ocupacao": 0,
        "comorbidade": 0.5,
        "medicamento": 0.5,
        "idade": 0,
        "cirurgia": 2.5
      },
      "evidencia": "Neck Pain CPG; princípios de reabilitação pós-operatória e triagem de complicações. Progressão deve ser individualizada conforme procedimento."
    },
    {
      "id": "lesao_muscular_cervical_aguda",
      "nome": "Lesão muscular cervical aguda / distensão — hipótese",
      "testes": [
        "Dor localizada após mecanismo de sobrecarga ou movimento rápido",
        "Dor reproduzida por contração resistida e/ou alongamento do grupo sintomático",
        "Sensibilidade focal sem déficit neurológico",
        "Ausência de sinais de fratura, mielopatia ou patologia vascular"
      ],
      "limiar": 2,
      "interpretacao": "Compatível com lesão muscular quando há mecanismo, dor focal e provocação por carga muscular. O diagnóstico é clínico e deve permanecer subordinado à exclusão de lesão cervical estrutural ou neurológica quando o trauma foi relevante.",
      "palavrasChaveHMA": [
        "puxou o pescoco",
        "distensao cervical",
        "estiramento no pescoco",
        "dor muscular cervical"
      ],
      "mecanismoPreferido": [
        "trauma_agudo",
        "esforco_repetitivo"
      ],
      "tipoDorPreferido": [
        "mecanica"
      ],
      "pesos": {
        "palavraChave": 1.8,
        "mecanismo": 1.8,
        "tipoDor": 1,
        "fatorPiora": 0.3,
        "esporte": 0.1,
        "ocupacao": 0.1,
        "comorbidade": 0,
        "medicamento": 0,
        "idade": 0,
        "cirurgia": 0
      }
    }
  ],
  "diferenciais": [
    {
      "id": "dor_cervical_mecanica",
      "nome": "Dor Cervical Mecânica / com déficit de mobilidade",
      "testes": [
        "Dor predominantemente cervical reproduzida por movimento/postura",
        "Limitação de ADM cervical concordante com sintomas",
        "Exame neurológico sem padrão radicular ou mielopático"
      ],
      "interpretacao": "Padrão compatível com dor cervical musculoesquelética quando os sintomas são mecanicamente moduláveis e não há sinais que apontem para comprometimento neurológico ou patologia séria. Evite atribuir causalidade a 'postura ruim' isoladamente.",
      "palavrasChaveHMA": [
        "dor no pescoco",
        "dor cervical",
        "cervicalgia",
        "rigidez no pescoco",
        "trava o pescoco",
        "dor ao virar"
      ],
      "mecanismoPreferido": [
        "insidioso",
        "esforco_repetitivo"
      ],
      "tipoDorPreferido": [
        "mecanica"
      ],
      "fatoresPioraRisco": [
        "movimento",
        "posicao_sentada"
      ],
      "pesos": {
        "palavraChave": 1.5,
        "mecanismo": 0.5,
        "tipoDor": 1.5,
        "fatorPiora": 0.5,
        "esporte": 0.1,
        "ocupacao": 0.1,
        "comorbidade": 0,
        "medicamento": 0,
        "idade": 0,
        "cirurgia": 0.3
      }
    },
    {
      "id": "cefaleia_cervicogenica",
      "nome": "Cefaleia Cervicogênica",
      "testes": [
        "ADM cervical reduzida e a cefaleia piora/reproduz com manobra cervical provocativa",
        "Teste de Flexão-Rotação Cervical (CFRT) restrito e/ou reproduz cefaleia familiar",
        "Cefaleia apresenta relação temporal clara com o quadro cervical"
      ],
      "interpretacao": "A hipótese ganha força quando há relação causal demonstrável entre o quadro cervical e a cefaleia. Dor unilateral fixa, provocação cervical e padrão posterior-anterior podem apoiar, mas não são exclusivos. Diferenciar de migrânea e cefaleia tipo tensão.",
      "palavrasChaveHMA": [
        "dor de cabeca que comeca no pescoco",
        "cefaleia unilateral",
        "dor de cabeca ao virar o pescoco",
        "dor da nuca para a testa"
      ],
      "mecanismoPreferido": [
        "insidioso",
        "esforco_repetitivo"
      ],
      "tipoDorPreferido": [
        "mecanica"
      ],
      "fatoresPioraRisco": [
        "movimento",
        "posicao_sentada"
      ],
      "pesos": {
        "palavraChave": 2,
        "mecanismo": 0.5,
        "tipoDor": 1.2,
        "fatorPiora": 0.5,
        "esporte": 0,
        "ocupacao": 0.1,
        "comorbidade": 0,
        "medicamento": 0,
        "idade": 0,
        "cirurgia": 0
      },
      "evidencia": "ICHD-3 cervicogenic headache criteria."
    },
    {
      "id": "dor_cervical_padrao_irradiado",
      "nome": "Dor Cervical com Padrão Irradiado — sem confirmação radicular",
      "testes": [
        "Dor parte da região cervical e se estende para cintura escapular e/ou membro superior",
        "Movimentos ou posições cervicais modificam de forma consistente os sintomas irradiados",
        "Exame neurológico não demonstra déficit motor, sensitivo ou reflexo suficiente para classificar radiculopatia"
      ],
      "regraConfirmacao": {
        "tipo": "combinada",
        "obrigatorios": [
          0,
          2
        ],
        "minimo": 2
      },
      "interpretacao": "Fenótipo operacional útil quando há dor cervical irradiada/referida, porém faltam critérios para radiculopatia. Mantém a investigação neurológica aberta sem rotular hérnia ou raiz nervosa sem evidência.",
      "palavrasChaveHMA": [
        "dor cervical irradia",
        "pescoco irradia",
        "dor do pescoco para o braco",
        "dor do pescoco para ombro",
        "dor cervical para escapula"
      ],
      "pesos": {
        "palavraChave": 1.8,
        "mecanismo": 0.4,
        "tipoDor": 0.6,
        "fatorPiora": 0.3,
        "esporte": 0,
        "ocupacao": 0.1,
        "comorbidade": 0,
        "medicamento": 0,
        "idade": 0,
        "cirurgia": 0
      }
    },
    {
      "id": "dor_cervical_coordenacao_movimento",
      "nome": "Dor Cervical com Déficit de Coordenação do Movimento / pós-trauma",
      "testes": [
        "Início após trauma/aceleração-desaceleração ou episódio compatível com whiplash",
        "Dor cervical associada a prejuízo de controle motor, resistência cervical ou tolerância postural",
        "Pode haver tontura, hipersensibilidade ou sintomas persistentes, sem sinais de patologia grave ou déficit neurológico progressivo"
      ],
      "regraConfirmacao": {
        "tipo": "minimo",
        "minimo": 2
      },
      "interpretacao": "Fenótipo funcional para quadros pós-trauma/whiplash nos quais alterações de coordenação, resistência e tolerância ao movimento são mais úteis para orientar reabilitação do que um rótulo anatômico isolado.",
      "palavrasChaveHMA": [
        "whiplash",
        "chicote cervical",
        "acidente de carro",
        "batida de carro",
        "trauma cervical",
        "dor cervical apos acidente"
      ],
      "mecanismoPreferido": [
        "trauma_agudo"
      ],
      "pesos": {
        "palavraChave": 2,
        "mecanismo": 1.8,
        "tipoDor": 0.3,
        "fatorPiora": 0.2,
        "esporte": 0,
        "ocupacao": 0,
        "comorbidade": 0,
        "medicamento": 0,
        "idade": 0,
        "cirurgia": 0
      }
    },
    {
      "id": "instabilidade_craniocervical",
      "nome": "Instabilidade Craniocervical — hipótese de segurança",
      "testes": [
        "História compatível: trauma importante, doença inflamatória, síndrome do tecido conjuntivo ou cirurgia cervical alta",
        "Sinais/sintomas neurológicos ou sensação de instabilidade incompatíveis com quadro mecânico simples",
        "Sharp-Purser / teste de ligamento alar somente quando clinicamente indicado e com interpretação cautelosa"
      ],
      "interpretacao": "A suspeita deve ser guiada principalmente pela história e pelo contexto de risco. Testes ligamentares isolados não garantem segurança para manipulação cervical e não substituem avaliação médica quando há suspeita de instabilidade.",
      "palavrasChaveHMA": [
        "instabilidade no pescoco",
        "trauma cervical",
        "whiplash",
        "artrite reumatoide",
        "sindrome de ehlers danlos"
      ],
      "mecanismoPreferido": [
        "trauma_agudo",
        "pos_cirurgico"
      ],
      "pesos": {
        "palavraChave": 2.5,
        "mecanismo": 2,
        "tipoDor": 0,
        "fatorPiora": 0,
        "esporte": 0,
        "ocupacao": 0,
        "comorbidade": 1,
        "medicamento": 0,
        "idade": 0,
        "cirurgia": 1.5
      }
    }
  ],
  "redFlags": [
    "Cefaleia ou dor cervical nova, súbita e intensa, especialmente diferente do padrão habitual, com ou sem sinais neurológicos — considerar patologia vascular cervical/craniana",
    "Diplopia, disartria, disfagia, déficit neurológico focal, ataxia, nistagmo novo, síndrome de Horner ou outros sinais neurológicos associados à dor cervical/cefaleia",
    "Sinais de mielopatia: alteração de marcha, hiperreflexia/clônus, perda de destreza manual, sintomas multissegmentares ou alterações esfincterianas",
    "Trauma significativo, especialmente com dor cervical intensa, deformidade, incapacidade funcional ou fatores de risco para fratura",
    "Febre, imunossupressão, infecção recente, uso de drogas IV ou dor cervical progressiva não mecânica — considerar infecção",
    "História de câncer, perda de peso inexplicada ou dor progressiva não mecânica — considerar neoplasia",
    "Não utilizar teste posicional vertebrobasilar como método de 'liberação' para manipulação; a decisão de segurança deve seguir raciocínio clínico vascular"
  ]
};
})();
