/* KineSys — banco clínico base regional ombro 1.0.0.
 * Gerado deterministicamente de database/mapeamento_clinico.js.
 * Não editar manualmente sem atualizar o contrato de equivalência.
 */
(function(){
  'use strict';
  if(typeof BANCO_MAPEAMENTO_CLINICO==='undefined')return;
  BANCO_MAPEAMENTO_CLINICO["ombro"]={
  "nome": "Ombro / Complexo Glenoumeral",
  "palavrasChave": [
    "ombro",
    "manguito",
    "supraespinhal",
    "glenoumeral",
    "escapula",
    "deltoide",
    "braco"
  ],
  "clusters": [
    {
      "id": "dor_ombro_relacionada_manguito",
      "nome": "Dor do Ombro Relacionada ao Manguito Rotador",
      "testes": [
        "Arco doloroso durante elevação ativa",
        "Dor e/ou fraqueza na rotação externa resistida",
        "Dor e/ou fraqueza na abdução / teste de Jobe em contexto compatível",
        "Hawkins-Kennedy ou outra manobra de compressão reproduz a dor familiar"
      ],
      "limiar": 2,
      "regraConfirmacao": {
        "tipo": "minimo",
        "minimo": 2
      },
      "interpretacao": "Padrão de dor relacionada ao manguito deve ser definido pela combinação de história, carga provocativa, força e movimento. Testes de 'impingement' isolados têm baixa especificidade e não demonstram necessariamente conflito mecânico subacromial.",
      "palavrasChaveHMA": [
        "dor ao levantar o braco",
        "dor acima da cabeca",
        "dor lateral do ombro",
        "dor para vestir",
        "dor no manguito"
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
        "periodo_noturno"
      ],
      "esportesRisco": [
        "volei",
        "natacao",
        "tenis",
        "beach tennis",
        "handebol"
      ],
      "ocupacoesRisco": [
        "pintor",
        "eletricista",
        "cabeleireiro"
      ],
      "pesos": {
        "palavraChave": 1.8,
        "mecanismo": 0.8,
        "tipoDor": 1.3,
        "fatorPiora": 0.5,
        "esporte": 0.2,
        "ocupacao": 0.2,
        "comorbidade": 0.3,
        "medicamento": 0.3,
        "idade": 0.4,
        "cirurgia": 0.5
      }
    },
    {
      "id": "ruptura_manguito_maior",
      "nome": "Suspeita de Ruptura Significativa do Manguito Rotador",
      "testes": [
        "External Rotation Lag Sign positivo",
        "Drop Arm / incapacidade de controlar descida em abdução",
        "Fraqueza marcada e não explicada apenas por dor em rotação externa/abdução",
        "Trauma compatível ou perda funcional súbita"
      ],
      "limiar": 2,
      "regraConfirmacao": {
        "tipo": "minimo",
        "minimo": 2
      },
      "interpretacao": "Achados de lag, queda do braço, fraqueza marcada e perda funcional após trauma aumentam a suspeita de ruptura de maior extensão. Considerar imagem/avaliação ortopédica quando o resultado modificar conduta.",
      "palavrasChaveHMA": [
        "estalo no ombro",
        "nao consegue levantar o braco",
        "perdeu forca de repente",
        "queda no ombro",
        "rompeu manguito"
      ],
      "mecanismoPreferido": [
        "trauma_agudo"
      ],
      "idadeFaixaBonus": {
        "min": 50,
        "max": 100,
        "bonus": 1
      },
      "medicamentosRisco": [
        "corticoide",
        "fluoroquinolona"
      ],
      "pesos": {
        "palavraChave": 2.5,
        "mecanismo": 2.5,
        "tipoDor": 0.5,
        "fatorPiora": 0,
        "esporte": 0.2,
        "ocupacao": 0.2,
        "comorbidade": 0.5,
        "medicamento": 1,
        "idade": 0.8,
        "cirurgia": 0.5
      }
    },
    {
      "id": "instabilidade_glenoumeral",
      "nome": "Instabilidade Glenoumeral Anterior / Multidirecional",
      "testes": [
        "Apprehension test reproduz apreensão (não apenas dor)",
        "Relocation test reduz apreensão/sintomas",
        "Sinal do sulco / hiperlaxidade interpretado junto à história"
      ],
      "limiar": 2,
      "interpretacao": "Apreensão em posição de risco associada a melhora com relocation e história de subluxação/luxação apoia instabilidade. Laxidade isolada não equivale a instabilidade sintomática.",
      "palavrasChaveHMA": [
        "ombro saiu do lugar",
        "luxacao",
        "subluxacao",
        "sensacao de sair",
        "apreensao"
      ],
      "mecanismoPreferido": [
        "trauma_agudo"
      ],
      "tipoDorPreferido": [
        "mecanica"
      ],
      "esportesRisco": [
        "volei",
        "handebol",
        "natacao",
        "tenis"
      ],
      "pesos": {
        "palavraChave": 2.5,
        "mecanismo": 2,
        "tipoDor": 0.5,
        "fatorPiora": 0.5,
        "esporte": 0.2,
        "ocupacao": 0,
        "comorbidade": 0,
        "medicamento": 0,
        "idade": 0,
        "cirurgia": 0.5
      }
    },
    {
      "id": "fratura_proximal_umero_pos_operatorio",
      "nome": "Pós-fratura proximal do úmero — conservador ou pós-operatório",
      "testes": [
        "Tipo de fratura e tratamento confirmados (conservador, placa/parafuso ou haste)",
        "Estado de consolidação e restrições de carga/ADM documentados",
        "Dor, edema, ADM ativa/passiva e função acompanhados longitudinalmente"
      ],
      "limiar": 2,
      "interpretacao": "A reabilitação após fratura proximal do úmero apresenta grande heterogeneidade entre protocolos. O motor deve registrar fase, consolidação e restrições específicas, evitando liberar amplitude ou fortalecimento apenas pelo número de semanas. Mobilização e progressão de carga devem respeitar estabilidade da fratura/fixação e orientação ortopédica.",
      "palavrasChaveHMA": [
        "fratura do ombro",
        "fratura do umero proximal",
        "placa no ombro",
        "parafuso no umero",
        "fratura umero"
      ],
      "mecanismoPreferido": [
        "trauma_agudo",
        "pos_cirurgico"
      ],
      "pesos": {
        "palavraChave": 2.2,
        "mecanismo": 2.2,
        "tipoDor": 0,
        "fatorPiora": 0,
        "esporte": 0,
        "ocupacao": 0,
        "comorbidade": 0.4,
        "medicamento": 0.2,
        "idade": 0.5,
        "cirurgia": 2.5
      },
      "evidencia": "Budharaju et al., systematic review of proximal humerus fracture rehabilitation, 2024."
    },
    {
      "id": "ruptura_peitoral_maior",
      "nome": "Suspeita de ruptura do peitoral maior",
      "testes": [
        "Mecanismo excêntrico sob carga, frequentemente em supino ou movimento de abdução/rotação externa",
        "Equimose/deformidade na prega axilar anterior ou assimetria do contorno peitoral",
        "Fraqueza dolorosa marcada em adução horizontal/rotação interna",
        "Perda funcional súbita após estalo ou sensação de rasgo"
      ],
      "limiar": 2,
      "interpretacao": "Mecanismo excêntrico, deformidade/equimose e perda súbita de força aumentam a suspeita de ruptura relevante do peitoral maior. Em pacientes ativos e lesões completas, avaliação ortopédica precoce é importante porque atraso pode modificar opções terapêuticas.",
      "palavrasChaveHMA": [
        "rompeu peitoral",
        "estalo no peito",
        "rasgou no supino",
        "equimose no peito",
        "deformidade peitoral"
      ],
      "mecanismoPreferido": [
        "trauma_agudo"
      ],
      "tipoDorPreferido": [
        "mecanica"
      ],
      "esportesRisco": [
        "musculacao",
        "powerlifting",
        "crossfit"
      ],
      "pesos": {
        "palavraChave": 2.5,
        "mecanismo": 2.5,
        "tipoDor": 0.5,
        "fatorPiora": 0,
        "esporte": 0.3,
        "ocupacao": 0,
        "comorbidade": 0,
        "medicamento": 0.4,
        "idade": 0,
        "cirurgia": 0
      }
    }
  ],
  "diferenciais": [
    {
      "id": "capsulite_adesiva",
      "nome": "Capsulite Adesiva",
      "testes": [
        "Restrição relevante de ADM ativa e passiva",
        "Rotação externa passiva proporcionalmente mais limitada",
        "Padrão progressivo de dor/rigidez sem outra explicação mais provável"
      ],
      "interpretacao": "Capsulite é predominantemente um diagnóstico clínico baseado em perda global de mobilidade ativa e passiva, com destaque para rotação externa. Diabetes e distúrbios tireoidianos aumentam a plausibilidade, mas não confirmam o diagnóstico.",
      "palavrasChaveHMA": [
        "ombro congelado",
        "ombro travado",
        "perdeu movimento",
        "rigidez progressiva"
      ],
      "mecanismoPreferido": [
        "insidioso",
        "pos_cirurgico"
      ],
      "tipoDorPreferido": [
        "mecanica",
        "inflamatoria"
      ],
      "comorbidadesRisco": [
        "diabetico"
      ],
      "idadeFaixaBonus": {
        "min": 40,
        "max": 70,
        "bonus": 1
      },
      "pesos": {
        "palavraChave": 2,
        "mecanismo": 0.8,
        "tipoDor": 0.8,
        "fatorPiora": 0.3,
        "esporte": 0,
        "ocupacao": 0,
        "comorbidade": 1,
        "medicamento": 0,
        "idade": 0.8,
        "cirurgia": 1
      }
    },
    {
      "id": "tendinopatia_biceps_longa",
      "nome": "Dor relacionada à cabeça longa do bíceps",
      "testes": [
        "Dor anterior localizada no sulco bicipital",
        "Speed reproduz dor anterior familiar",
        "Uppercut ou Yergason reproduz sintomas em contexto compatível"
      ],
      "interpretacao": "Testes para a cabeça longa do bíceps têm acurácia limitada isoladamente. Use a localização da dor e a reprodução por carga como apoio e considere associação com manguito/labrum.",
      "palavrasChaveHMA": [
        "dor na frente do ombro",
        "dor no sulco bicipital",
        "dor no biceps"
      ],
      "mecanismoPreferido": [
        "esforco_repetitivo"
      ],
      "tipoDorPreferido": [
        "mecanica"
      ],
      "pesos": {
        "palavraChave": 1.5,
        "mecanismo": 0.5,
        "tipoDor": 1,
        "fatorPiora": 0.3,
        "esporte": 0.1,
        "ocupacao": 0.1,
        "comorbidade": 0,
        "medicamento": 0,
        "idade": 0,
        "cirurgia": 0.2
      }
    },
    {
      "id": "lesao_labral_slap",
      "nome": "Lesão Labral / SLAP — hipótese diferencial",
      "testes": [
        "História compatível com tração, queda, luxação ou gesto overhead",
        "O'Brien / Active Compression reproduz sintomas profundos em conjunto com outros achados",
        "Crank / Biceps Load II ou outro teste labral concordante"
      ],
      "interpretacao": "Nenhum teste clínico isolado confirma SLAP com segurança. Mantenha como diferencial quando história e múltiplos achados são concordantes e considere imagem/especialista se o resultado alterar manejo.",
      "palavrasChaveHMA": [
        "estalo profundo no ombro",
        "clique no ombro",
        "dor profunda",
        "dor arremessando"
      ],
      "mecanismoPreferido": [
        "trauma_agudo",
        "esforco_repetitivo"
      ],
      "esportesRisco": [
        "volei",
        "tenis",
        "handebol",
        "natacao"
      ],
      "pesos": {
        "palavraChave": 1.5,
        "mecanismo": 1.2,
        "tipoDor": 0.5,
        "fatorPiora": 0.2,
        "esporte": 0.2,
        "ocupacao": 0,
        "comorbidade": 0,
        "medicamento": 0,
        "idade": 0,
        "cirurgia": 0.2
      }
    },
    {
      "id": "dor_referida_cervical",
      "nome": "Dor Referida de Origem Cervical",
      "testes": [
        "Movimentos cervicais reproduzem/modificam dor no ombro",
        "Exame do ombro não reproduz de forma consistente a queixa principal",
        "Sinais neurológicos cervicais ou padrão de dor referido estão presentes"
      ],
      "interpretacao": "Considerar origem cervical quando a dor do ombro é modulada pelo pescoço ou quando o exame local não explica a apresentação.",
      "palavrasChaveHMA": [
        "dor cervical irradia ombro",
        "dor no pescoco irradia ombro",
        "dor que sai do pescoco para ombro",
        "dor nos ombros vinda do pescoco",
        "pescoco para os ombros"
      ],
      "pesos": {
        "palavraChave": 2.3,
        "mecanismo": 0,
        "tipoDor": 0,
        "fatorPiora": 0,
        "esporte": 0,
        "ocupacao": 0,
        "comorbidade": 0,
        "medicamento": 0,
        "idade": 0,
        "cirurgia": 0
      }
    },
    {
      "id": "osteoartrite_glenoumeral",
      "nome": "Osteoartrite Glenoumeral — hipótese clínica",
      "testes": [
        "Dor e rigidez progressivas com perda de ADM ativa e passiva, especialmente rotação externa",
        "Crepitação/rigidez e limitação funcional predominam sobre fraqueza isolada do manguito",
        "Idade/contexto e, quando disponível, imagem são coerentes com processo degenerativo"
      ],
      "regraConfirmacao": {
        "tipo": "minimo",
        "minimo": 2
      },
      "interpretacao": "Suspeitar quando há dor + rigidez global e limitação passiva em contexto compatível. Diferenciar de capsulite adesiva e dor relacionada ao manguito; imagem é complementar quando modifica manejo.",
      "palavrasChaveHMA": [
        "artrose no ombro",
        "ombro rigido",
        "crepitacao ombro",
        "desgaste no ombro"
      ],
      "idadeFaixaBonus": {
        "min": 50,
        "max": 100,
        "bonus": 0.8
      },
      "pesos": {
        "palavraChave": 1.8,
        "idade": 0.7
      }
    },
    {
      "id": "dor_acromioclavicular",
      "nome": "Dor da Articulação Acromioclavicular — hipótese",
      "testes": [
        "Dor focal sobre a articulação acromioclavicular",
        "Adução horizontal/cross-body reproduz a dor familiar",
        "Palpação local e/ou testes de compressão AC reproduzem a queixa mais do que testes do manguito"
      ],
      "regraConfirmacao": {
        "tipo": "minimo",
        "minimo": 2
      },
      "interpretacao": "Dor focal superior com provocação específica aumenta a compatibilidade com envolvimento acromioclavicular. Correlacione com história de trauma, carga e exame do restante do ombro.",
      "palavrasChaveHMA": [
        "dor em cima do ombro",
        "dor na acromioclavicular",
        "dor ao cruzar o braco"
      ],
      "pesos": {
        "palavraChave": 1.7
      }
    },
    {
      "id": "polimialgia_reumatica_rastreamento",
      "nome": "Polimialgia Reumática — rastreamento médico",
      "testes": [
        "Paciente com 50 anos ou mais apresenta dor/rigidez bilateral predominante em cintura escapular",
        "Rigidez matinal prolongada, tipicamente maior que 45 minutos, e dificuldade funcional importante",
        "Há sintomas sistêmicos e/ou avaliação laboratorial inflamatória que justificam investigação médica"
      ],
      "regraConfirmacao": {
        "tipo": "combinada",
        "obrigatorios": [
          0,
          1
        ],
        "minimo": 2
      },
      "interpretacao": "Padrão bilateral em pessoa ≥50 anos com rigidez matinal prolongada deve gerar investigação médica para polimialgia reumática, especialmente se houver sintomas sistêmicos. Não rotular como manguito bilateral automaticamente.",
      "palavrasChaveHMA": [
        "dor nos dois ombros e rigidez",
        "rigidez matinal nos ombros",
        "ombros bilaterais rigidos"
      ],
      "idadeFaixaBonus": {
        "min": 50,
        "max": 100,
        "bonus": 1.2
      },
      "pesos": {
        "palavraChave": 1.7,
        "idade": 1
      }
    },
    {
      "id": "thoracic_outlet",
      "nome": "Síndrome do Desfiladeiro Torácico — diferencial neurovascular",
      "testes": [
        "Sintomas neurogênicos/vasculares relacionados a posição ou carga do membro superior",
        "Exame neurológico e vascular direcionado",
        "Testes provocativos apenas como parte de um conjunto, sem confiar em pulso isolado"
      ],
      "interpretacao": "Testes provocativos de TOS apresentam limitações importantes. O diagnóstico é de exclusão e exige diferenciação de radiculopatia, neuropatias periféricas e causas vasculares."
    }
  ],
  "redFlags": [
    "Trauma com deformidade, incapacidade importante, suspeita de fratura/luxação ou comprometimento neurovascular",
    "Ombro quente, vermelho, muito doloroso, com febre ou sintomas sistêmicos — considerar infecção",
    "Dor no ombro associada a dispneia, dor torácica, sudorese, náusea ou esforço cardiovascular — considerar causa cardíaca/pulmonar",
    "Dor intensa progressiva não mecânica, história de câncer ou perda de peso inexplicada",
    "Fraqueza súbita importante após trauma com pseudoparalisia — considerar ruptura extensa ou lesão neurológica",
    "Déficit vascular do membro superior: palidez/cianose persistente, frio, ausência de pulso, edema súbito ou dor desproporcional",
    "Pós-operatório/fratura com febre, secreção, eritema progressivo, dor desproporcional, perda súbita de função ou suspeita de falha de fixação",
    "Trauma com deformidade, déficit neurovascular ou incapacidade funcional importante — considerar fratura/luxação e encaminhar"
  ]
};
})();
