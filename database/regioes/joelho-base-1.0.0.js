/* KineSys — banco clínico base regional joelho 1.0.0.
 * Gerado deterministicamente de database/mapeamento_clinico.js.
 * Não editar manualmente sem atualizar o contrato de equivalência.
 */
(function(){
  'use strict';
  if(typeof BANCO_MAPEAMENTO_CLINICO==='undefined')return;
  BANCO_MAPEAMENTO_CLINICO["joelho"]={
  "nome": "Joelho",
  "palavrasChave": [
    "joelho",
    "patela",
    "menisco",
    "lca",
    "ligamento",
    "femorotibial",
    "patelofemoral"
  ],
  "clusters": [
    {
      "id": "lesao_lca",
      "nome": "Lesão do Ligamento Cruzado Anterior (LCA)",
      "testes": [
        "Lachman com aumento de translação e/ou end-feel alterado",
        "Pivot Shift positivo quando tolerado e apropriado",
        "Anterior Drawer positivo, especialmente fora da fase aguda",
        "História de trauma sem contato/pivô com estalo, derrame rápido e sensação de falseio"
      ],
      "limiar": 2,
      "interpretacao": "Lachman e Pivot Shift têm maior utilidade clínica quando o mecanismo e a história são compatíveis. Derrame agudo e falseio aumentam a suspeita; confirmação e planejamento podem exigir imagem/ortopedia.",
      "palavrasChaveHMA": [
        "estalo no joelho",
        "joelho falseia",
        "girou o joelho",
        "inchou rapido",
        "lca"
      ],
      "mecanismoPreferido": [
        "trauma_agudo"
      ],
      "tipoDorPreferido": [
        "mecanica"
      ],
      "esportesRisco": [
        "futebol",
        "futsal",
        "basquete",
        "volei",
        "handebol"
      ],
      "pesos": {
        "palavraChave": 2.5,
        "mecanismo": 2.5,
        "tipoDor": 0.5,
        "fatorPiora": 0.2,
        "esporte": 0.2,
        "ocupacao": 0,
        "comorbidade": 0,
        "medicamento": 0,
        "idade": 0,
        "cirurgia": 0.5
      }
    },
    {
      "id": "lesao_colateral",
      "nome": "Lesão dos Ligamentos Colaterais (LCM/LCL)",
      "testes": [
        "Valgo a 30°: dor e/ou laxidade sugestiva de LCM",
        "Varo a 30°: dor e/ou laxidade sugestiva de LCL",
        "Instabilidade em 0° sugere lesão mais extensa e exige maior cautela"
      ],
      "limiar": 1,
      "interpretacao": "Dor localizada e principalmente laxidade em estresse valgo/varo sustentam lesão colateral. Instabilidade em extensão completa sugere envolvimento de estruturas adicionais.",
      "palavrasChaveHMA": [
        "pancada do lado do joelho",
        "abriu o joelho",
        "ligamento colateral",
        "dor medial apos trauma",
        "dor lateral apos trauma"
      ],
      "mecanismoPreferido": [
        "trauma_agudo"
      ],
      "pesos": {
        "palavraChave": 2,
        "mecanismo": 2,
        "tipoDor": 0.5,
        "fatorPiora": 0,
        "esporte": 0.1,
        "ocupacao": 0,
        "comorbidade": 0,
        "medicamento": 0,
        "idade": 0,
        "cirurgia": 0.3
      }
    },
    {
      "id": "meniscal_traumatica",
      "nome": "Lesão Meniscal — padrão clínico",
      "testes": [
        "Dor na interlinha articular concordante",
        "Thessaly reproduz sintomas mecânicos familiares quando seguro",
        "McMurray reproduz dor/click concordante",
        "História de torção, travamento verdadeiro ou bloqueio articular"
      ],
      "limiar": 2,
      "interpretacao": "Testes meniscais têm acurácia limitada isoladamente. A combinação de mecanismo, dor em interlinha e sintomas mecânicos aumenta a suspeita. 'Click' assintomático isolado não confirma lesão.",
      "palavrasChaveHMA": [
        "travou o joelho",
        "joelho bloqueia",
        "dor na linha articular",
        "torceu o joelho",
        "menisco"
      ],
      "mecanismoPreferido": [
        "trauma_agudo",
        "insidioso"
      ],
      "tipoDorPreferido": [
        "mecanica"
      ],
      "pesos": {
        "palavraChave": 2,
        "mecanismo": 1.2,
        "tipoDor": 1,
        "fatorPiora": 0.3,
        "esporte": 0.1,
        "ocupacao": 0,
        "comorbidade": 0,
        "medicamento": 0,
        "idade": 0.3,
        "cirurgia": 0.5
      }
    },
    {
      "id": "ruptura_mecanismo_extensor",
      "nome": "Suspeita de ruptura do mecanismo extensor — quadríceps / patelar",
      "testes": [
        "Incapacidade ou grande déficit para extensão ativa do joelho / straight-leg raise",
        "Defeito palpável ou alteração do contorno acima ou abaixo da patela",
        "Mecanismo súbito com contração excêntrica forte, queda ou salto",
        "Edema/equimose e perda funcional aguda"
      ],
      "limiar": 2,
      "interpretacao": "Incapacidade de extensão ativa após mecanismo agudo deve levantar suspeita de ruptura do tendão do quadríceps ou patelar e requer avaliação ortopédica rápida. Após reparo, a progressão de ADM e carga depende da técnica e do protocolo do cirurgião; mobilização excessivamente agressiva não deve ser automatizada.",
      "palavrasChaveHMA": [
        "rompeu tendao do quadriceps",
        "rompeu patelar",
        "nao consegue esticar o joelho",
        "estalo no joelho e caiu"
      ],
      "mecanismoPreferido": [
        "trauma_agudo"
      ],
      "tipoDorPreferido": [
        "mecanica"
      ],
      "pesos": {
        "palavraChave": 3,
        "mecanismo": 2.5,
        "tipoDor": 0.5,
        "fatorPiora": 0,
        "esporte": 0.2,
        "ocupacao": 0,
        "comorbidade": 0.4,
        "medicamento": 0.5,
        "idade": 0.3,
        "cirurgia": 0
      }
    },
    {
      "id": "fratura_planalto_tibial_pos_operatorio",
      "nome": "Pós-fratura do planalto tibial / ORIF",
      "testes": [
        "Classificação/descrição da fratura e método de fixação registrados",
        "Status de carga permitido pelo cirurgião documentado",
        "ADM do joelho, edema, força do quadríceps e controle funcional monitorados"
      ],
      "limiar": 2,
      "interpretacao": "A literatura favorece mobilização do joelho relativamente precoce quando a estabilidade permite, mas o momento de descarga de peso varia com padrão de fratura e fixação. O KineSys deve tratar carga como restrição individual documentada, não como prazo universal.",
      "palavrasChaveHMA": [
        "fratura planalto tibial",
        "fratura tibia no joelho",
        "placa no planalto tibial",
        "orif planalto tibial"
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
        "medicamento": 0.3,
        "idade": 0,
        "cirurgia": 2.5
      },
      "evidencia": "Iliopoulos & Galanis, systematic review; Elsenosy et al., systematic review/meta-analysis 2025."
    },
    {
      "id": "lesao_muscular_quadriceps",
      "nome": "Lesão muscular do quadríceps / reto femoral",
      "testes": [
        "Dor aguda focal após sprint, chute ou aceleração/desaceleração",
        "Dor à contração resistida de extensão do joelho e/ou flexão do quadril",
        "Dor à elongação do quadríceps e sensibilidade focal",
        "Perda de força comparável e limitação funcional sem falha completa do mecanismo extensor"
      ],
      "limiar": 2,
      "interpretacao": "Padrão compatível com lesão muscular quando mecanismo, dor focal e testes de carga concordam. Diferenciar de ruptura tendínea, contusão, avulsão e lesão óssea, especialmente quando há incapacidade funcional importante.",
      "palavrasChaveHMA": [
        "estiramento quadriceps",
        "rasgou a coxa na frente",
        "dor no reto femoral",
        "puxou quadriceps"
      ],
      "mecanismoPreferido": [
        "trauma_agudo"
      ],
      "esportesRisco": [
        "futebol",
        "corrida",
        "atletismo",
        "crossfit"
      ],
      "pesos": {
        "palavraChave": 2,
        "mecanismo": 2,
        "tipoDor": 1,
        "fatorPiora": 0.2,
        "esporte": 0.2,
        "ocupacao": 0,
        "comorbidade": 0,
        "medicamento": 0,
        "idade": 0,
        "cirurgia": 0
      }
    }
  ],
  "diferenciais": [
    {
      "id": "dor_patelofemoral",
      "nome": "Dor Patelofemoral",
      "testes": [
        "Dor retropatelar/peripatelar durante agachamento, escadas, corrida ou salto",
        "Dor reproduzida em tarefa com flexão do joelho sob carga",
        "Ausência de outro diagnóstico mais provável"
      ],
      "interpretacao": "O diagnóstico é clínico e baseado em dor ao redor/atrás da patela agravada por atividades com joelho flexionado sob carga. Testes de compressão patelar isolados não são necessários e podem ser irritativos.",
      "palavrasChaveHMA": [
        "dor na frente do joelho",
        "dor na patela",
        "dor descendo escada",
        "dor agachando",
        "dor sentado muito tempo"
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
      "esportesRisco": [
        "corrida",
        "futebol",
        "basquete",
        "volei"
      ],
      "pesos": {
        "palavraChave": 2,
        "mecanismo": 0.7,
        "tipoDor": 1.2,
        "fatorPiora": 0.5,
        "esporte": 0.2,
        "ocupacao": 0,
        "comorbidade": 0,
        "medicamento": 0,
        "idade": 0,
        "cirurgia": 0.3
      }
    },
    {
      "id": "tendinopatia_patelar",
      "nome": "Tendinopatia Patelar",
      "testes": [
        "Dor bem localizada no polo inferior da patela / tendão patelar",
        "Dor reproduzida com carga do extensor (decline squat, salto ou resistência)",
        "Relação carga-sintoma típica, especialmente em esportes de salto"
      ],
      "interpretacao": "Tendinopatia patelar é uma condição de dor localizada e dependente de carga. Achados de imagem podem existir sem sintomas e não devem ser usados isoladamente.",
      "palavrasChaveHMA": [
        "dor no tendao patelar",
        "dor abaixo da patela",
        "dor pulando",
        "joelho do saltador"
      ],
      "mecanismoPreferido": [
        "esforco_repetitivo",
        "insidioso"
      ],
      "tipoDorPreferido": [
        "mecanica"
      ],
      "esportesRisco": [
        "volei",
        "basquete",
        "corrida",
        "futebol"
      ],
      "pesos": {
        "palavraChave": 2,
        "mecanismo": 1,
        "tipoDor": 1.2,
        "fatorPiora": 0.3,
        "esporte": 0.25,
        "ocupacao": 0,
        "comorbidade": 0,
        "medicamento": 0.2,
        "idade": 0,
        "cirurgia": 0.3
      }
    },
    {
      "id": "instabilidade_patelar",
      "nome": "Instabilidade Patelar",
      "testes": [
        "Apprehension patelar reproduz apreensão",
        "História de luxação/subluxação patelar",
        "Sinais de hipermobilidade patelar interpretados junto aos sintomas"
      ],
      "interpretacao": "História de luxação/subluxação e apreensão patelar são mais relevantes que hipermobilidade isolada."
    },
    {
      "id": "dor_lateral_corrida",
      "nome": "Dor Lateral do Joelho relacionada à corrida / trato iliotibial",
      "testes": [
        "Dor focal lateral próximo ao epicôndilo femoral, relacionada à corrida",
        "Dor reproduzida por tarefa/carga específica",
        "Outras causas intra-articulares e tendíneas foram consideradas"
      ],
      "interpretacao": "O termo 'síndrome da banda iliotibial' descreve uma apresentação de dor lateral relacionada à corrida. Testes como Ober não confirmam a condição nem demonstram 'encurtamento causal'."
    },
    {
      "id": "osteoartrite_joelho",
      "nome": "Osteoartrite de Joelho — hipótese clínica",
      "testes": [
        "Idade e história compatíveis com dor relacionada à atividade",
        "Rigidez matinal curta e/ou crepitação",
        "Redução de ADM, derrame ou sinais clínicos degenerativos em contexto compatível"
      ],
      "interpretacao": "OA pode ser suspeitada clinicamente; imagem não é obrigatória em todos os casos e alterações radiográficas não determinam intensidade da dor."
    }
  ],
  "redFlags": [
    "Trauma com incapacidade de apoiar peso, deformidade, dor óssea focal importante ou suspeita de fratura",
    "Joelho quente, muito inchado, vermelho, com febre ou mal-estar — considerar artrite séptica",
    "Bloqueio articular verdadeiro persistente após trauma — considerar lesão mecânica deslocada",
    "Déficit neurovascular após trauma/luxação: pulso reduzido, pé frio/pálido, parestesias ou fraqueza progressiva",
    "Dor e edema de panturrilha, assimetria importante ou dispneia — considerar TVP/TEP conforme contexto",
    "Dor óssea progressiva não mecânica, história de câncer ou sintomas sistêmicos inexplicados",
    "Pós-operatório de fratura ou reparo tendíneo com febre, secreção, abertura de ferida, perda súbita da extensão ativa ou suspeita de falha do reparo",
    "Edema importante de panturrilha, dispneia ou dor torácica no pós-operatório — considerar TVP/TEP"
  ]
};
})();
