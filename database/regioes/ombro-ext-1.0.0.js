/* KineSys — extensão clínica regional ombro 1.0.0.
 * Gerada deterministicamente de condicoes_mobilidade_v23.js + diferenciais_neurais.js.
 * Não editar manualmente sem atualizar o contrato de equivalência.
 */
(function(){
  'use strict';
  if(typeof BANCO_MAPEAMENTO_CLINICO==='undefined')return;
  const r=BANCO_MAPEAMENTO_CLINICO["ombro"];
  if(!r)return;
  Object.assign(r,{
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
      ]
    }
  ]
});
})();
