/* ============================================================================
   KINESYS — BANCO DE MAPEAMENTO CLÍNICO v2.0 — EXPANSÃO TRAUMA / PÓS-OPERATÓRIO / LESÕES MUSCULARES
   Revisão clínica do motor por região anatômica.

   PRINCÍPIOS DO MOTOR 1.2
   - O escore abaixo é HEURÍSTICO e serve para PRIORIZAR INVESTIGAÇÃO.
   - Nenhum escore representa probabilidade diagnóstica validada.
   - Testes especiais não devem ser interpretados isoladamente quando a
     literatura recomenda combinação com história, exame neurológico, ROM,
     carga/provocação ou imagem.
   - Red flags são gatilhos de raciocínio/encaminhamento, não diagnósticos.
   - Uma red flag isolada pode ter baixa acurácia; contexto e combinação de
     achados importam.
   - Terminologia foi atualizada para reduzir rótulos biomecânicos excessivamente
     determinísticos (ex.: "impacto"/"conflito" como diagnóstico isolado).

   CAMPOS DE PESO POR ITEM (opcionais)
   pesos: {
      palavraChave, mecanismo, tipoDor, fatorPiora, esporte, ocupacao,
      comorbidade, medicamento, idade, cirurgia
   }
   Na ausência, script.js usa valores-padrão conservadores.
   ============================================================================ */

const BANCO_MAPEAMENTO_CLINICO = {

    cervical: {
        nome: "Coluna Cervical",
        palavrasChave: ["cervical", "pescoco", "nuca", "cervicalgia", "braco", "mao", "cefaleia", "dor de cabeca"],
        clusters: [
            {
                id: "radiculopatia_cervical",
                nome: "Radiculopatia Cervical — cluster de exame",
                testes: [
                    "Spurling / compressão foraminal reproduz sintomas radiculares típicos",
                    "Distração cervical reduz sintomas radiculares",
                    "ULTT1 / teste neurodinâmico do nervo mediano compatível com os sintomas",
                    "Rotação cervical ativa < 60° para o lado sintomático"
                ],
                limiar: 3,
                regraConfirmacao: { tipo: "minimo", minimo: 3 },
                interpretacao: "Três ou mais achados concordantes aumentam a suspeita de radiculopatia cervical; quatro achados tornam o padrão mais convincente. Correlacione com dermátomos, miótomos, reflexos e déficit neurológico. O cluster não identifica sozinho a causa anatômica da radiculopatia.",
                palavrasChaveHMA: ["formigamento no braco", "formigamento na mao", "dormencia", "choque", "irradia para o braco", "fraqueza no braco", "dor descendo pelo braco"],
                mecanismoPreferido: ["insidioso", "esforco_repetitivo"],
                tipoDorPreferido: ["neuropatica"],
                fatoresPioraRisco: ["movimento", "posicao_sentada"],
                pesos: { palavraChave: 2.2, mecanismo: 1, tipoDor: 2.5, fatorPiora: 0.5, esporte: 0.25, ocupacao: 0.25, comorbidade: 0.5, medicamento: 0.5, idade: 0.5, cirurgia: 0.5 },
                evidencia: "Wainner et al.; Neck Pain CPG/JOSPT."
            },
            {
                id: "mielopatia_cervical_suspeita",
                nome: "Suspeita de Mielopatia Cervical Degenerativa",
                testes: [
                    "Hoffmann positivo associado a outros sinais de trato longo",
                    "Hiperreflexia difusa / clônus",
                    "Alteração de marcha, equilíbrio ou destreza manual",
                    "Fraqueza multissegmentar / sintomas em mais de um membro"
                ],
                limiar: 2,
                regraConfirmacao: { tipo: "minimo", minimo: 2 },
                interpretacao: "Combinação de sinais de trato longo, alteração de marcha/destreza e sintomas multissegmentares deve elevar a suspeita de mielopatia e indicar avaliação médica especializada. Não utilizar um teste isolado para excluir mielopatia.",
                palavrasChaveHMA: ["maos desajeitadas", "derrubando objetos", "dificuldade para andar", "pernas pesadas", "choque ao flexionar pescoco", "sintomas nos quatro membros"],
                tipoDorPreferido: ["neuropatica"],
                idadeFaixaBonus: { min: 50, max: 100, bonus: 1 },
                pesos: { palavraChave: 3, mecanismo: 0, tipoDor: 1, fatorPiora: 0, esporte: 0, ocupacao: 0, comorbidade: 0.5, medicamento: 0, idade: 1, cirurgia: 0 },
                evidencia: "Clinical reasoning for degenerative cervical myelopathy; serious pathology screening."
            }
        ,
            {
                id: "pos_operatorio_cervical",
                nome: "Pós-operatório Cervical — artrodese / discectomia / descompressão",
                testes: [
                    "Procedimento, data e níveis operados confirmados em documento ou relato confiável",
                    "Déficit neurológico atual comparado ao pré-operatório",
                    "ADM, dor, função e tolerância à carga dentro das restrições do cirurgião",
                    "Ferida, febre, disfagia progressiva ou piora neurológica ausentes"
                ],
                limiar: 2,
                regraConfirmacao: { tipo: "minimo", minimo: 2 },
                interpretacao: "Organiza a reavaliação pós-operatória, mas não define progressão por tempo isolado. Restrições de carga, mobilidade e retorno funcional devem respeitar técnica cirúrgica, níveis envolvidos, consolidação e orientação do cirurgião. Nova piora neurológica, febre, secreção, disfagia progressiva ou dor desproporcional exigem reavaliação médica.",
                palavrasChaveHMA: ["artrodese cervical", "discectomia cervical", "cirurgia cervical", "pos operatorio cervical", "descompressao cervical"],
                mecanismoPreferido: ["pos_cirurgico"],
                pesos: { palavraChave: 2.5, mecanismo: 3, tipoDor: 0, fatorPiora: 0, esporte: 0, ocupacao: 0, comorbidade: 0.5, medicamento: 0.5, idade: 0, cirurgia: 2.5 },
                evidencia: "Neck Pain CPG; princípios de reabilitação pós-operatória e triagem de complicações. Progressão deve ser individualizada conforme procedimento."
            },
            {
                id: "lesao_muscular_cervical_aguda",
                nome: "Lesão muscular cervical aguda / distensão — hipótese",
                testes: [
                    "Dor localizada após mecanismo de sobrecarga ou movimento rápido",
                    "Dor reproduzida por contração resistida e/ou alongamento do grupo sintomático",
                    "Sensibilidade focal sem déficit neurológico",
                    "Ausência de sinais de fratura, mielopatia ou patologia vascular"
                ],
                limiar: 2,
                interpretacao: "Compatível com lesão muscular quando há mecanismo, dor focal e provocação por carga muscular. O diagnóstico é clínico e deve permanecer subordinado à exclusão de lesão cervical estrutural ou neurológica quando o trauma foi relevante.",
                palavrasChaveHMA: ["puxou o pescoco", "distensao cervical", "estiramento no pescoco", "dor muscular cervical"],
                mecanismoPreferido: ["trauma_agudo", "esforco_repetitivo"],
                tipoDorPreferido: ["mecanica"],
                pesos: { palavraChave: 1.8, mecanismo: 1.8, tipoDor: 1, fatorPiora: 0.3, esporte: 0.1, ocupacao: 0.1, comorbidade: 0, medicamento: 0, idade: 0, cirurgia: 0 }
            }
        ],
        diferenciais: [
            {
                id: "dor_cervical_mecanica",
                nome: "Dor Cervical Mecânica / com déficit de mobilidade",
                testes: [
                    "Dor predominantemente cervical reproduzida por movimento/postura",
                    "Limitação de ADM cervical concordante com sintomas",
                    "Exame neurológico sem padrão radicular ou mielopático"
                ],
                interpretacao: "Padrão compatível com dor cervical musculoesquelética quando os sintomas são mecanicamente moduláveis e não há sinais que apontem para comprometimento neurológico ou patologia séria. Evite atribuir causalidade a 'postura ruim' isoladamente.",
                palavrasChaveHMA: ["dor no pescoco", "dor cervical", "cervicalgia", "rigidez no pescoco", "trava o pescoco", "dor ao virar"],
                mecanismoPreferido: ["insidioso", "esforco_repetitivo"],
                tipoDorPreferido: ["mecanica"],
                fatoresPioraRisco: ["movimento", "posicao_sentada"],
                pesos: { palavraChave: 1.5, mecanismo: 0.5, tipoDor: 1.5, fatorPiora: 0.5, esporte: 0.1, ocupacao: 0.1, comorbidade: 0, medicamento: 0, idade: 0, cirurgia: 0.3 }
            },
            {
                id: "cefaleia_cervicogenica",
                nome: "Cefaleia Cervicogênica",
                testes: [
                    "ADM cervical reduzida e a cefaleia piora/reproduz com manobra cervical provocativa",
                    "Teste de Flexão-Rotação Cervical (CFRT) restrito e/ou reproduz cefaleia familiar",
                    "Cefaleia apresenta relação temporal clara com o quadro cervical"
                ],
                interpretacao: "A hipótese ganha força quando há relação causal demonstrável entre o quadro cervical e a cefaleia. Dor unilateral fixa, provocação cervical e padrão posterior-anterior podem apoiar, mas não são exclusivos. Diferenciar de migrânea e cefaleia tipo tensão.",
                palavrasChaveHMA: ["dor de cabeca que comeca no pescoco", "cefaleia unilateral", "dor de cabeca ao virar o pescoco", "dor da nuca para a testa"],
                mecanismoPreferido: ["insidioso", "esforco_repetitivo"],
                tipoDorPreferido: ["mecanica"],
                fatoresPioraRisco: ["movimento", "posicao_sentada"],
                pesos: { palavraChave: 2, mecanismo: 0.5, tipoDor: 1.2, fatorPiora: 0.5, esporte: 0, ocupacao: 0.1, comorbidade: 0, medicamento: 0, idade: 0, cirurgia: 0 },
                evidencia: "ICHD-3 cervicogenic headache criteria."
            },
            {
                id: "dor_cervical_padrao_irradiado",
                nome: "Dor Cervical com Padrão Irradiado — sem confirmação radicular",
                testes: [
                    "Dor parte da região cervical e se estende para cintura escapular e/ou membro superior",
                    "Movimentos ou posições cervicais modificam de forma consistente os sintomas irradiados",
                    "Exame neurológico não demonstra déficit motor, sensitivo ou reflexo suficiente para classificar radiculopatia"
                ],
                regraConfirmacao: { tipo: "combinada", obrigatorios: [0, 2], minimo: 2 },
                interpretacao: "Fenótipo operacional útil quando há dor cervical irradiada/referida, porém faltam critérios para radiculopatia. Mantém a investigação neurológica aberta sem rotular hérnia ou raiz nervosa sem evidência.",
                palavrasChaveHMA: ["dor cervical irradia", "pescoco irradia", "dor do pescoco para o braco", "dor do pescoco para ombro", "dor cervical para escapula"],
                pesos: { palavraChave: 1.8, mecanismo: 0.4, tipoDor: 0.6, fatorPiora: 0.3, esporte: 0, ocupacao: 0.1, comorbidade: 0, medicamento: 0, idade: 0, cirurgia: 0 }
            },
            {
                id: "dor_cervical_coordenacao_movimento",
                nome: "Dor Cervical com Déficit de Coordenação do Movimento / pós-trauma",
                testes: [
                    "Início após trauma/aceleração-desaceleração ou episódio compatível com whiplash",
                    "Dor cervical associada a prejuízo de controle motor, resistência cervical ou tolerância postural",
                    "Pode haver tontura, hipersensibilidade ou sintomas persistentes, sem sinais de patologia grave ou déficit neurológico progressivo"
                ],
                regraConfirmacao: { tipo: "minimo", minimo: 2 },
                interpretacao: "Fenótipo funcional para quadros pós-trauma/whiplash nos quais alterações de coordenação, resistência e tolerância ao movimento são mais úteis para orientar reabilitação do que um rótulo anatômico isolado.",
                palavrasChaveHMA: ["whiplash", "chicote cervical", "acidente de carro", "batida de carro", "trauma cervical", "dor cervical apos acidente"],
                mecanismoPreferido: ["trauma_agudo"],
                pesos: { palavraChave: 2.0, mecanismo: 1.8, tipoDor: 0.3, fatorPiora: 0.2, esporte: 0, ocupacao: 0, comorbidade: 0, medicamento: 0, idade: 0, cirurgia: 0 }
            },
            {
                id: "instabilidade_craniocervical",
                nome: "Instabilidade Craniocervical — hipótese de segurança",
                testes: [
                    "História compatível: trauma importante, doença inflamatória, síndrome do tecido conjuntivo ou cirurgia cervical alta",
                    "Sinais/sintomas neurológicos ou sensação de instabilidade incompatíveis com quadro mecânico simples",
                    "Sharp-Purser / teste de ligamento alar somente quando clinicamente indicado e com interpretação cautelosa"
                ],
                interpretacao: "A suspeita deve ser guiada principalmente pela história e pelo contexto de risco. Testes ligamentares isolados não garantem segurança para manipulação cervical e não substituem avaliação médica quando há suspeita de instabilidade.",
                palavrasChaveHMA: ["instabilidade no pescoco", "trauma cervical", "whiplash", "artrite reumatoide", "sindrome de ehlers danlos"],
                mecanismoPreferido: ["trauma_agudo", "pos_cirurgico"],
                pesos: { palavraChave: 2.5, mecanismo: 2, tipoDor: 0, fatorPiora: 0, esporte: 0, ocupacao: 0, comorbidade: 1, medicamento: 0, idade: 0, cirurgia: 1.5 }
            }
        ],
        redFlags: [
            "Cefaleia ou dor cervical nova, súbita e intensa, especialmente diferente do padrão habitual, com ou sem sinais neurológicos — considerar patologia vascular cervical/craniana",
            "Diplopia, disartria, disfagia, déficit neurológico focal, ataxia, nistagmo novo, síndrome de Horner ou outros sinais neurológicos associados à dor cervical/cefaleia",
            "Sinais de mielopatia: alteração de marcha, hiperreflexia/clônus, perda de destreza manual, sintomas multissegmentares ou alterações esfincterianas",
            "Trauma significativo, especialmente com dor cervical intensa, deformidade, incapacidade funcional ou fatores de risco para fratura",
            "Febre, imunossupressão, infecção recente, uso de drogas IV ou dor cervical progressiva não mecânica — considerar infecção",
            "História de câncer, perda de peso inexplicada ou dor progressiva não mecânica — considerar neoplasia",
            "Não utilizar teste posicional vertebrobasilar como método de 'liberação' para manipulação; a decisão de segurança deve seguir raciocínio clínico vascular"
        ]
    },


    cefaleia: {
        nome: "Cabeça / Cefaleia — triagem",
        palavrasChave: ["cefaleia", "dor de cabeca", "dor na cabeca", "enxaqueca", "migranea", "temporal", "testa"],
        clusters: [
            {
                id: "cefaleia_cervicogenica_triagem",
                nome: "Cefaleia Cervicogênica — investigação causal",
                testes: [
                    "Há relação temporal clara entre o início/piora da cefaleia e o quadro cervical",
                    "ADM cervical está reduzida e movimentos/manobras cervicais reproduzem ou pioram a cefaleia familiar",
                    "Teste de Flexão-Rotação Cervical (CFRT) está restrito e/ou reproduz a cefaleia familiar",
                    "A cefaleia melhora de forma concordante quando o quadro cervical melhora"
                ],
                limiar: 2,
                regraConfirmacao: { tipo: "minimo", minimo: 2 },
                interpretacao: "Compatibilidade aumenta quando existe evidência de relação causal com a coluna cervical. A coexistência de dor cervical e cefaleia, isoladamente, não confirma cefaleia cervicogênica. Diferenciar de cefaleias primárias e de causas secundárias.",
                palavrasChaveHMA: ["dor de cabeca comeca no pescoco", "dor da nuca para a testa", "cefaleia piora ao mexer pescoco", "dor de cabeca ao virar pescoco"],
                mecanismoPreferido: ["insidioso", "esforco_repetitivo"],
                fatoresPioraRisco: ["movimento", "posicao_sentada"],
                pesos: { palavraChave: 2.3, mecanismo: 0.4, tipoDor: 0.3, fatorPiora: 0.4, esporte: 0, ocupacao: 0.1, comorbidade: 0, medicamento: 0, idade: 0, cirurgia: 0 },
                evidencia: "ICHD-3 11.2.1; critérios de causalidade cervical."
            },
            {
                id: "cefaleia_atribuida_dtm_triagem",
                nome: "Cefaleia atribuída à DTM — investigação causal",
                testes: [
                    "A cefaleia é temporal/preauricular e mudou em relação temporal com o início da dor/disfunção temporomandibular",
                    "Movimento mandibular, mastigação ou parafunção (ex.: bruxismo/apertamento) pioram a cefaleia familiar",
                    "Palpação do músculo temporal reproduz a cefaleia familiar",
                    "Abertura, lateralidade ou protrusão mandibular reproduzem a cefaleia familiar"
                ],
                limiar: 2,
                regraConfirmacao: { tipo: "minimo", minimo: 2 },
                interpretacao: "A simples coexistência de dor na ATM e cefaleia não estabelece causalidade. Priorize reprodução da cefaleia familiar por função mandibular/palpação e relação temporal com DTM dolorosa.",
                palavrasChaveHMA: ["dor temporal piora mastigar", "cefaleia piora mastigacao", "dor de cabeca piora bruxismo", "cefaleia reproduzida ao abrir boca"],
                pesos: { palavraChave: 2.5, mecanismo: 0, tipoDor: 0, fatorPiora: 0, esporte: 0, ocupacao: 0, comorbidade: 0, medicamento: 0, idade: 0, cirurgia: 0 },
                evidencia: "ICHD-3 11.7; DC/TMD headache attributed to TMD."
            }
        ],
        diferenciais: [
            {
                id: "fenotipo_migranoso_triagem",
                nome: "Fenótipo migranoso — diferencial",
                testes: [
                    "Crises recorrentes com duração típica de horas e padrão semelhante entre episódios",
                    "Dor pulsátil e/ou moderada a forte, frequentemente piorada por atividade física rotineira",
                    "Náusea e/ou vômitos associados",
                    "Fotofobia e/ou fonofobia associadas"
                ],
                regraConfirmacao: { tipo: "combinada", obrigatorios: [0, 3], minimo: 3 },
                interpretacao: "Achados podem ser compatíveis com fenótipo migranoso, mas o KineSys não confirma diagnóstico de migrânea. Em cefaleia nova, atípica ou com red flags, priorize investigação médica.",
                palavrasChaveHMA: ["pulsatil", "latejante", "nausea", "fotofobia", "fonofobia", "enxaqueca", "migranea"],
                pesos: { palavraChave: 1.5 }
            },
            {
                id: "fenotipo_tensional_triagem",
                nome: "Fenótipo tipo tensão — diferencial",
                testes: [
                    "Dor bilateral ou difusa em pressão/aperto, não predominantemente pulsátil",
                    "Intensidade leve a moderada",
                    "Atividade física rotineira não agrava de forma importante",
                    "Sem náusea/vômitos relevantes; quando há foto/fonofobia, no máximo uma delas é predominante"
                ],
                regraConfirmacao: { tipo: "minimo", minimo: 3 },
                interpretacao: "Achados podem ser compatíveis com cefaleia tipo tensão, mas a classificação depende da história longitudinal e da exclusão de causas secundárias.",
                palavrasChaveHMA: ["pressao na cabeca", "aperto na cabeca", "peso na cabeca", "cefaleia bilateral", "dor em faixa"],
                pesos: { palavraChave: 1.4 }
            },
            {
                id: "cefaleia_uso_excessivo_medicacao",
                nome: "Cefaleia por uso excessivo de medicação — rastreamento",
                testes: [
                    "Cefaleia ocorre em 15 ou mais dias por mês em paciente com cefaleia pré-existente",
                    "Uso excessivo regular de medicação aguda/sintomática para cefaleia por mais de 3 meses",
                    "O padrão de frequência aumentou no mesmo período do uso frequente de medicação"
                ],
                regraConfirmacao: { tipo: "combinada", obrigatorios: [0, 1], minimo: 2 },
                interpretacao: "Padrão que merece revisão médica do manejo farmacológico e da cefaleia de base. Não orientar retirada abrupta de medicação prescrita sem avaliação do profissional responsável.",
                palavrasChaveHMA: ["analgesico todo dia", "remedio para dor de cabeca todo dia", "cefaleia diaria", "dor de cabeca quase todo dia"],
                pesos: { palavraChave: 1.8, medicamento: 1.2 }
            },
            {
                id: "neuralgia_occipital",
                nome: "Neuralgia Occipital — diferencial",
                testes: [
                    "Dor paroxística em choque, pontada ou facada na região occipital, podendo irradiar anteriormente",
                    "Hipersensibilidade, alodinia ou sensibilidade focal no trajeto do nervo occipital",
                    "O padrão é episódico/paroxístico e não é melhor explicado apenas por cefaleia primária ou dor cervical mecânica"
                ],
                regraConfirmacao: { tipo: "minimo", minimo: 2 },
                interpretacao: "Padrão neuralgiforme occipital deve ser diferenciado de cefaleia cervicogênica e migrânea. Déficits neurológicos ou apresentação atípica exigem avaliação médica.",
                palavrasChaveHMA: ["choque na nuca", "pontada na nuca", "dor occipital em choque", "nervo occipital"],
                pesos: { palavraChave: 2.0, tipoDor: 1.2 }
            },
            {
                id: "cefaleia_rinossinusal_secundaria",
                nome: "Cefaleia associada a rinossinusite — diferencial médico",
                testes: [
                    "Há sintomas nasossinusais objetivos/relevantes concomitantes, como secreção purulenta, obstrução nasal importante ou alteração de olfato",
                    "A cefaleia surgiu ou piorou em relação temporal ao quadro nasossinusal",
                    "A evolução da dor acompanha a melhora/piora do quadro nasossinusal"
                ],
                regraConfirmacao: { tipo: "minimo", minimo: 2 },
                interpretacao: "Evite o rótulo inespecífico de 'cefaleia sinusal' sem sinais nasossinusais. Quando o padrão é convincente, orientar avaliação médica/otorrinolaringológica conforme gravidade e duração.",
                palavrasChaveHMA: ["sinusite", "secrecao nasal", "nariz entupido e dor de cabeca", "dor facial com secrecao"],
                pesos: { palavraChave: 1.8 }
            }
        ],
        redFlags: [
            "Cefaleia de início súbito/abrupto, máxima em segundos ou descrita como a pior da vida — requer avaliação médica urgente",
            "Cefaleia nova ou com mudança importante de padrão associada a déficit neurológico focal, alteração de consciência, convulsão ou papiledema",
            "Febre, rigidez cervical importante, imunossupressão, infecção sistêmica ou estado geral comprometido associados à cefaleia",
            "Cefaleia nova após trauma relevante, durante gestação/puerpério ou precipitada de forma incomum por tosse, esforço ou mudança postural",
            "Em paciente >50 anos: nova cefaleia temporal/occipital com claudicação mandibular, sensibilidade do couro cabeludo ou sintomas visuais — considerar arterite de células gigantes e encaminhamento urgente",
            "Dor ocular intensa com alterações visuais/autonômicas ou cefaleia progressiva/atípica sem explicação musculoesquelética"
        ]
    },

    atm: {
        nome: "ATM / Dor Orofacial",
        palavrasChave: ["atm", "articulacao temporomandibular", "mandibula", "maxilar", "masseter", "temporal", "mastigar", "mastigacao", "bruxismo", "apertamento", "estalo na mandibula", "travamento da boca"],
        clusters: [
            {
                id: "dtm_dolorosa_muscular",
                nome: "DTM dolorosa — componente muscular",
                testes: [
                    "Dor familiar em masseter/temporal é modificada por movimento mandibular, mastigação ou parafunção",
                    "Palpação de masseter e/ou temporal reproduz a dor familiar do paciente",
                    "Abertura máxima ou movimentos mandibulares reproduzem a dor familiar",
                    "Não há sinais de condição odontogênica, infecciosa, traumática ou neurológica que expliquem melhor o quadro"
                ],
                limiar: 2,
                regraConfirmacao: { tipo: "minimo", minimo: 2 },
                interpretacao: "Padrão compatível com DTM dolorosa quando a dor familiar é modificada por função/parafunção mandibular e reproduzida no exame. Evite atribuir sintomas apenas a ruídos articulares ou postura.",
                palavrasChaveHMA: ["dor na atm", "dor na mandibula", "dor no masseter", "dor ao mastigar", "dor ao abrir boca", "apertamento", "bruxismo"],
                mecanismoPreferido: ["insidioso", "esforco_repetitivo"],
                pesos: { palavraChave: 2.1, mecanismo: 0.4, tipoDor: 0.3, fatorPiora: 0, esporte: 0, ocupacao: 0, comorbidade: 0, medicamento: 0, idade: 0, cirurgia: 0.3 },
                evidencia: "DC/TMD Axis I; pain-related TMD."
            },
            {
                id: "dtm_artralgia",
                nome: "DTM dolorosa — artralgia da ATM",
                testes: [
                    "Dor familiar localizada na região pré-auricular/ATM é modificada por movimento ou função mandibular",
                    "Palpação da ATM/lateral do polo condilar reproduz a dor familiar",
                    "Abertura, lateralidade ou protrusão reproduzem a dor familiar na ATM",
                    "Ausência de sinais que indiquem trauma/fratura, infecção ou outra condição que explique melhor a dor"
                ],
                limiar: 2,
                regraConfirmacao: { tipo: "minimo", minimo: 2 },
                interpretacao: "Compatibilidade com artralgia depende da reprodução de dor familiar na ATM em contexto coerente. Ruído articular isolado não é suficiente para classificar dor articular.",
                palavrasChaveHMA: ["dor na articulacao da mandibula", "dor pre auricular", "dor na atm", "dor na frente do ouvido"],
                pesos: { palavraChave: 2.0, mecanismo: 0.2, tipoDor: 0.3, fatorPiora: 0, esporte: 0, ocupacao: 0, comorbidade: 0, medicamento: 0, idade: 0, cirurgia: 0.3 },
                evidencia: "DC/TMD Axis I; arthralgia."
            }
        ],
        diferenciais: [
            {
                id: "cefaleia_atribuida_dtm",
                nome: "Cefaleia atribuída à DTM",
                testes: [
                    "Há DTM dolorosa clinicamente compatível",
                    "A cefaleia temporal é agravada por mastigação, movimento mandibular ou parafunção",
                    "Palpação do temporal e/ou movimentos mandibulares reproduzem a cefaleia familiar"
                ],
                interpretacao: "A coexistência de cefaleia e DTM não implica que uma cause a outra. A reprodução da cefaleia familiar e a modulação pela função mandibular aumentam a plausibilidade causal.",
                palavrasChaveHMA: ["cefaleia piora mastigar", "dor temporal mastigar", "dor de cabeca bruxismo", "dor de cabeca ao abrir boca"],
                pesos: { palavraChave: 2.4 },
                evidencia: "ICHD-3 11.7; DC/TMD headache attributed to TMD."
            },
            {
                id: "dor_orofacial_referida_cervical",
                nome: "Componente cervical associado / dor referida",
                testes: [
                    "Movimentos cervicais reproduzem ou modificam a dor orofacial/temporal familiar",
                    "Há limitação cervical ou achados cervicais concordantes com o comportamento dos sintomas",
                    "O exame da ATM isoladamente não explica toda a queixa"
                ],
                interpretacao: "Dor cervical e DTM frequentemente coexistem. Use reprodução familiar e comportamento mecânico para identificar contribuição cervical sem assumir causalidade automática.",
                palavrasChaveHMA: ["dor cervical e atm", "dor no pescoco e mandibula", "pescoco irradia para mandibula"],
                pesos: { palavraChave: 1.4 }
            },
            {
                id: "dtm_disco_com_reducao",
                nome: "Deslocamento de disco da ATM com redução — hipótese",
                testes: [
                    "Estalido articular reprodutível durante abertura e fechamento em padrão compatível",
                    "História de clique/estalido da ATM associado ao movimento mandibular",
                    "Não há travamento fechado persistente ou limitação importante de abertura que sugira deslocamento sem redução"
                ],
                regraConfirmacao: { tipo: "combinada", obrigatorios: [0], minimo: 2 },
                interpretacao: "Ruído articular isolado não implica necessidade de tratamento. A hipótese é mais relevante quando o som é reprodutível e associado a sintomas ou alteração funcional.",
                palavrasChaveHMA: ["estalo na atm", "mandibula estala", "clique na mandibula"],
                pesos: { palavraChave: 1.7 }
            },
            {
                id: "dtm_disco_sem_reducao_limitacao",
                nome: "Deslocamento de disco da ATM sem redução com limitação — hipótese",
                testes: [
                    "História de travamento fechado/episódio em que a boca deixou de abrir normalmente",
                    "Abertura máxima está reduzida de forma clinicamente relevante e há desvio/deflexão compatível",
                    "O padrão atual não é explicado melhor por dor muscular isolada, trauma/fratura ou processo infeccioso"
                ],
                regraConfirmacao: { tipo: "combinada", obrigatorios: [0, 1], minimo: 2 },
                interpretacao: "Travamento e limitação de abertura sustentam a hipótese de deslocamento sem redução, mas diagnóstico definitivo depende de critérios clínicos apropriados e, quando necessário, avaliação odontológica especializada/imagem.",
                palavrasChaveHMA: ["travou a boca", "mandibula travada", "nao consegue abrir a boca", "abertura limitada"],
                pesos: { palavraChave: 2.1 }
            },
            {
                id: "dtm_doenca_articular_degenerativa",
                nome: "Doença articular degenerativa da ATM — hipótese",
                testes: [
                    "Crepitação grosseira/reprodutível durante movimento mandibular",
                    "Dor/rigidez articular e limitação funcional compatíveis com envolvimento articular",
                    "História e exame justificam considerar avaliação odontológica/imagem quando o resultado puder alterar a conduta"
                ],
                regraConfirmacao: { tipo: "minimo", minimo: 2 },
                interpretacao: "Crepitação associada a sintomas articulares pode justificar investigação de doença degenerativa. Ruído isolado em paciente assintomático não deve ser tratado como doença por si só.",
                palavrasChaveHMA: ["crepitacao na atm", "atm rangendo", "artrose na atm", "mandibula rangendo"],
                idadeFaixaBonus: { min: 40, max: 100, bonus: 0.5 },
                pesos: { palavraChave: 1.8, idade: 0.4 }
            },
            {
                id: "dtm_subluxacao",
                nome: "Subluxação / travamento aberto da ATM — hipótese",
                testes: [
                    "História de travamento em posição aberta ou necessidade de manobra para conseguir fechar a boca",
                    "Episódios recorrentes de hipermobilidade mandibular com sensação de deslocamento"
                ],
                regraConfirmacao: { tipo: "qualquer" },
                interpretacao: "Episódios de travamento aberto sugerem hipermobilidade/subluxação. Luxação persistente ou incapacidade atual de fechar a boca exige atendimento médico/odontológico imediato.",
                palavrasChaveHMA: ["boca travou aberta", "mandibula saiu do lugar", "nao consegue fechar a boca"],
                pesos: { palavraChave: 2.3 }
            },
            {
                id: "neuralgia_trigeminal_diferencial",
                nome: "Neuralgia do Trigêmeo — diferencial neurológico",
                testes: [
                    "Dor facial unilateral em choques/descargas, de duração breve e recorrente",
                    "Crises são desencadeadas por estímulos leves como tocar o rosto, falar, escovar dentes ou mastigar",
                    "O padrão neuralgiforme não é reproduzido como dor musculoesquelética familiar pela palpação/movimento da ATM"
                ],
                regraConfirmacao: { tipo: "combinada", obrigatorios: [0, 1], minimo: 2 },
                interpretacao: "Padrão sugestivo de neuralgia trigeminal requer avaliação médica/neurológica. Não atribuir automaticamente a DTM quando a dor é paroxística, elétrica e desencadeada por estímulos leves.",
                palavrasChaveHMA: ["choque no rosto", "dor eletrica no rosto", "choque ao tocar rosto", "neuralgia trigemeo"],
                pesos: { palavraChave: 2.4, tipoDor: 1.2 }
            },
            {
                id: "origem_dentaria_otologica",
                nome: "Origem dentária / otológica — diferencial de encaminhamento",
                testes: [
                    "Dor dentária localizada, hipersensibilidade térmica, edema gengival ou história odontológica compatível",
                    "Otalgia, secreção, perda auditiva ou sintomas otológicos predominantes",
                    "Sintomas não são reproduzidos de forma consistente pelo exame musculoesquelético da ATM/cervical"
                ],
                interpretacao: "Quando os achados sugerem origem dentária ou otológica, encaminhar para avaliação profissional apropriada em vez de atribuir o quadro à DTM.",
                palavrasChaveHMA: ["dor de dente", "dente sensivel", "ouvido inflamado", "secrecao no ouvido", "perda auditiva"],
                pesos: { palavraChave: 1.8 }
            }
        ],
        redFlags: [
            "Trauma facial/mandibular importante, deformidade, maloclusão nova ou incapacidade de fechar/abrir a boca — considerar fratura/luxação e encaminhamento",
            "Edema facial progressivo, febre, calor/rubor, secreção ou comprometimento sistêmico — considerar infecção odontogênica/articular",
            "Trismo progressivo sem explicação mecânica, massa, perda de peso ou dor noturna progressiva — investigar causa não musculoesquelética",
            "Alteração sensitiva facial nova, déficit de nervos cranianos ou sintomas neurológicos associados",
            "Em paciente >50 anos: dor/fadiga mandibular ao mastigar associada a nova cefaleia temporal, sensibilidade do couro cabeludo ou sintomas visuais — não presumir DTM; considerar arterite de células gigantes"
        ]
    },

    ombro: {
        nome: "Ombro / Complexo Glenoumeral",
        palavrasChave: ["ombro", "manguito", "supraespinhal", "glenoumeral", "escapula", "deltoide", "braco"],
        clusters: [
            {
                id: "dor_ombro_relacionada_manguito",
                nome: "Dor do Ombro Relacionada ao Manguito Rotador",
                testes: [
                    "Arco doloroso durante elevação ativa",
                    "Dor e/ou fraqueza na rotação externa resistida",
                    "Dor e/ou fraqueza na abdução / teste de Jobe em contexto compatível",
                    "Hawkins-Kennedy ou outra manobra de compressão reproduz a dor familiar"
                ],
                limiar: 2,
                regraConfirmacao: { tipo: "minimo", minimo: 2 },
                interpretacao: "Padrão de dor relacionada ao manguito deve ser definido pela combinação de história, carga provocativa, força e movimento. Testes de 'impingement' isolados têm baixa especificidade e não demonstram necessariamente conflito mecânico subacromial.",
                palavrasChaveHMA: ["dor ao levantar o braco", "dor acima da cabeca", "dor lateral do ombro", "dor para vestir", "dor no manguito"],
                mecanismoPreferido: ["insidioso", "esforco_repetitivo"],
                tipoDorPreferido: ["mecanica"],
                fatoresPioraRisco: ["movimento", "periodo_noturno"],
                esportesRisco: ["volei", "natacao", "tenis", "beach tennis", "handebol"],
                ocupacoesRisco: ["pintor", "eletricista", "cabeleireiro"],
                pesos: { palavraChave: 1.8, mecanismo: 0.8, tipoDor: 1.3, fatorPiora: 0.5, esporte: 0.2, ocupacao: 0.2, comorbidade: 0.3, medicamento: 0.3, idade: 0.4, cirurgia: 0.5 }
            },
            {
                id: "ruptura_manguito_maior",
                nome: "Suspeita de Ruptura Significativa do Manguito Rotador",
                testes: [
                    "External Rotation Lag Sign positivo",
                    "Drop Arm / incapacidade de controlar descida em abdução",
                    "Fraqueza marcada e não explicada apenas por dor em rotação externa/abdução",
                    "Trauma compatível ou perda funcional súbita"
                ],
                limiar: 2,
                regraConfirmacao: { tipo: "minimo", minimo: 2 },
                interpretacao: "Achados de lag, queda do braço, fraqueza marcada e perda funcional após trauma aumentam a suspeita de ruptura de maior extensão. Considerar imagem/avaliação ortopédica quando o resultado modificar conduta.",
                palavrasChaveHMA: ["estalo no ombro", "nao consegue levantar o braco", "perdeu forca de repente", "queda no ombro", "rompeu manguito"],
                mecanismoPreferido: ["trauma_agudo"],
                idadeFaixaBonus: { min: 50, max: 100, bonus: 1 },
                medicamentosRisco: ["corticoide", "fluoroquinolona"],
                pesos: { palavraChave: 2.5, mecanismo: 2.5, tipoDor: 0.5, fatorPiora: 0, esporte: 0.2, ocupacao: 0.2, comorbidade: 0.5, medicamento: 1, idade: 0.8, cirurgia: 0.5 }
            },
            {
                id: "instabilidade_glenoumeral",
                nome: "Instabilidade Glenoumeral Anterior / Multidirecional",
                testes: [
                    "Apprehension test reproduz apreensão (não apenas dor)",
                    "Relocation test reduz apreensão/sintomas",
                    "Sinal do sulco / hiperlaxidade interpretado junto à história"
                ],
                limiar: 2,
                interpretacao: "Apreensão em posição de risco associada a melhora com relocation e história de subluxação/luxação apoia instabilidade. Laxidade isolada não equivale a instabilidade sintomática.",
                palavrasChaveHMA: ["ombro saiu do lugar", "luxacao", "subluxacao", "sensacao de sair", "apreensao"],
                mecanismoPreferido: ["trauma_agudo"],
                tipoDorPreferido: ["mecanica"],
                esportesRisco: ["volei", "handebol", "natacao", "tenis"],
                pesos: { palavraChave: 2.5, mecanismo: 2, tipoDor: 0.5, fatorPiora: 0.5, esporte: 0.2, ocupacao: 0, comorbidade: 0, medicamento: 0, idade: 0, cirurgia: 0.5 }
            }
        ,
            {
                id: "fratura_proximal_umero_pos_operatorio",
                nome: "Pós-fratura proximal do úmero — conservador ou pós-operatório",
                testes: [
                    "Tipo de fratura e tratamento confirmados (conservador, placa/parafuso ou haste)",
                    "Estado de consolidação e restrições de carga/ADM documentados",
                    "Dor, edema, ADM ativa/passiva e função acompanhados longitudinalmente"
                ],
                limiar: 2,
                interpretacao: "A reabilitação após fratura proximal do úmero apresenta grande heterogeneidade entre protocolos. O motor deve registrar fase, consolidação e restrições específicas, evitando liberar amplitude ou fortalecimento apenas pelo número de semanas. Mobilização e progressão de carga devem respeitar estabilidade da fratura/fixação e orientação ortopédica.",
                palavrasChaveHMA: ["fratura do ombro", "fratura do umero proximal", "placa no ombro", "parafuso no umero", "fratura umero"],
                mecanismoPreferido: ["trauma_agudo", "pos_cirurgico"],
                pesos: { palavraChave: 2.2, mecanismo: 2.2, tipoDor: 0, fatorPiora: 0, esporte: 0, ocupacao: 0, comorbidade: 0.4, medicamento: 0.2, idade: 0.5, cirurgia: 2.5 },
                evidencia: "Budharaju et al., systematic review of proximal humerus fracture rehabilitation, 2024."
            },
            {
                id: "ruptura_peitoral_maior",
                nome: "Suspeita de ruptura do peitoral maior",
                testes: [
                    "Mecanismo excêntrico sob carga, frequentemente em supino ou movimento de abdução/rotação externa",
                    "Equimose/deformidade na prega axilar anterior ou assimetria do contorno peitoral",
                    "Fraqueza dolorosa marcada em adução horizontal/rotação interna",
                    "Perda funcional súbita após estalo ou sensação de rasgo"
                ],
                limiar: 2,
                interpretacao: "Mecanismo excêntrico, deformidade/equimose e perda súbita de força aumentam a suspeita de ruptura relevante do peitoral maior. Em pacientes ativos e lesões completas, avaliação ortopédica precoce é importante porque atraso pode modificar opções terapêuticas.",
                palavrasChaveHMA: ["rompeu peitoral", "estalo no peito", "rasgou no supino", "equimose no peito", "deformidade peitoral"],
                mecanismoPreferido: ["trauma_agudo"],
                tipoDorPreferido: ["mecanica"],
                esportesRisco: ["musculacao", "powerlifting", "crossfit"],
                pesos: { palavraChave: 2.5, mecanismo: 2.5, tipoDor: 0.5, fatorPiora: 0, esporte: 0.3, ocupacao: 0, comorbidade: 0, medicamento: 0.4, idade: 0, cirurgia: 0 }
            }
        ],
        diferenciais: [
            {
                id: "capsulite_adesiva",
                nome: "Capsulite Adesiva",
                testes: [
                    "Restrição relevante de ADM ativa e passiva",
                    "Rotação externa passiva proporcionalmente mais limitada",
                    "Padrão progressivo de dor/rigidez sem outra explicação mais provável"
                ],
                interpretacao: "Capsulite é predominantemente um diagnóstico clínico baseado em perda global de mobilidade ativa e passiva, com destaque para rotação externa. Diabetes e distúrbios tireoidianos aumentam a plausibilidade, mas não confirmam o diagnóstico.",
                palavrasChaveHMA: ["ombro congelado", "ombro travado", "perdeu movimento", "rigidez progressiva"],
                mecanismoPreferido: ["insidioso", "pos_cirurgico"],
                tipoDorPreferido: ["mecanica", "inflamatoria"],
                comorbidadesRisco: ["diabetico"],
                idadeFaixaBonus: { min: 40, max: 70, bonus: 1 },
                pesos: { palavraChave: 2, mecanismo: 0.8, tipoDor: 0.8, fatorPiora: 0.3, esporte: 0, ocupacao: 0, comorbidade: 1, medicamento: 0, idade: 0.8, cirurgia: 1 }
            },
            {
                id: "tendinopatia_biceps_longa",
                nome: "Dor relacionada à cabeça longa do bíceps",
                testes: [
                    "Dor anterior localizada no sulco bicipital",
                    "Speed reproduz dor anterior familiar",
                    "Uppercut ou Yergason reproduz sintomas em contexto compatível"
                ],
                interpretacao: "Testes para a cabeça longa do bíceps têm acurácia limitada isoladamente. Use a localização da dor e a reprodução por carga como apoio e considere associação com manguito/labrum.",
                palavrasChaveHMA: ["dor na frente do ombro", "dor no sulco bicipital", "dor no biceps"],
                mecanismoPreferido: ["esforco_repetitivo"],
                tipoDorPreferido: ["mecanica"],
                pesos: { palavraChave: 1.5, mecanismo: 0.5, tipoDor: 1, fatorPiora: 0.3, esporte: 0.1, ocupacao: 0.1, comorbidade: 0, medicamento: 0, idade: 0, cirurgia: 0.2 }
            },
            {
                id: "lesao_labral_slap",
                nome: "Lesão Labral / SLAP — hipótese diferencial",
                testes: [
                    "História compatível com tração, queda, luxação ou gesto overhead",
                    "O'Brien / Active Compression reproduz sintomas profundos em conjunto com outros achados",
                    "Crank / Biceps Load II ou outro teste labral concordante"
                ],
                interpretacao: "Nenhum teste clínico isolado confirma SLAP com segurança. Mantenha como diferencial quando história e múltiplos achados são concordantes e considere imagem/especialista se o resultado alterar manejo.",
                palavrasChaveHMA: ["estalo profundo no ombro", "clique no ombro", "dor profunda", "dor arremessando"],
                mecanismoPreferido: ["trauma_agudo", "esforco_repetitivo"],
                esportesRisco: ["volei", "tenis", "handebol", "natacao"],
                pesos: { palavraChave: 1.5, mecanismo: 1.2, tipoDor: 0.5, fatorPiora: 0.2, esporte: 0.2, ocupacao: 0, comorbidade: 0, medicamento: 0, idade: 0, cirurgia: 0.2 }
            },
            {
                id: "dor_referida_cervical",
                nome: "Dor Referida de Origem Cervical",
                testes: [
                    "Movimentos cervicais reproduzem/modificam dor no ombro",
                    "Exame do ombro não reproduz de forma consistente a queixa principal",
                    "Sinais neurológicos cervicais ou padrão de dor referido estão presentes"
                ],
                interpretacao: "Considerar origem cervical quando a dor do ombro é modulada pelo pescoço ou quando o exame local não explica a apresentação.",
                palavrasChaveHMA: ["dor cervical irradia ombro", "dor no pescoco irradia ombro", "dor que sai do pescoco para ombro", "dor nos ombros vinda do pescoco", "pescoco para os ombros"],
                pesos: { palavraChave: 2.3, mecanismo: 0, tipoDor: 0, fatorPiora: 0, esporte: 0, ocupacao: 0, comorbidade: 0, medicamento: 0, idade: 0, cirurgia: 0 }
            },
            {
                id: "osteoartrite_glenoumeral",
                nome: "Osteoartrite Glenoumeral — hipótese clínica",
                testes: [
                    "Dor e rigidez progressivas com perda de ADM ativa e passiva, especialmente rotação externa",
                    "Crepitação/rigidez e limitação funcional predominam sobre fraqueza isolada do manguito",
                    "Idade/contexto e, quando disponível, imagem são coerentes com processo degenerativo"
                ],
                regraConfirmacao: { tipo: "minimo", minimo: 2 },
                interpretacao: "Suspeitar quando há dor + rigidez global e limitação passiva em contexto compatível. Diferenciar de capsulite adesiva e dor relacionada ao manguito; imagem é complementar quando modifica manejo.",
                palavrasChaveHMA: ["artrose no ombro", "ombro rigido", "crepitacao ombro", "desgaste no ombro"],
                idadeFaixaBonus: { min: 50, max: 100, bonus: 0.8 },
                pesos: { palavraChave: 1.8, idade: 0.7 }
            },
            {
                id: "dor_acromioclavicular",
                nome: "Dor da Articulação Acromioclavicular — hipótese",
                testes: [
                    "Dor focal sobre a articulação acromioclavicular",
                    "Adução horizontal/cross-body reproduz a dor familiar",
                    "Palpação local e/ou testes de compressão AC reproduzem a queixa mais do que testes do manguito"
                ],
                regraConfirmacao: { tipo: "minimo", minimo: 2 },
                interpretacao: "Dor focal superior com provocação específica aumenta a compatibilidade com envolvimento acromioclavicular. Correlacione com história de trauma, carga e exame do restante do ombro.",
                palavrasChaveHMA: ["dor em cima do ombro", "dor na acromioclavicular", "dor ao cruzar o braco"],
                pesos: { palavraChave: 1.7 }
            },
            {
                id: "polimialgia_reumatica_rastreamento",
                nome: "Polimialgia Reumática — rastreamento médico",
                testes: [
                    "Paciente com 50 anos ou mais apresenta dor/rigidez bilateral predominante em cintura escapular",
                    "Rigidez matinal prolongada, tipicamente maior que 45 minutos, e dificuldade funcional importante",
                    "Há sintomas sistêmicos e/ou avaliação laboratorial inflamatória que justificam investigação médica"
                ],
                regraConfirmacao: { tipo: "combinada", obrigatorios: [0, 1], minimo: 2 },
                interpretacao: "Padrão bilateral em pessoa ≥50 anos com rigidez matinal prolongada deve gerar investigação médica para polimialgia reumática, especialmente se houver sintomas sistêmicos. Não rotular como manguito bilateral automaticamente.",
                palavrasChaveHMA: ["dor nos dois ombros e rigidez", "rigidez matinal nos ombros", "ombros bilaterais rigidos"],
                idadeFaixaBonus: { min: 50, max: 100, bonus: 1.2 },
                pesos: { palavraChave: 1.7, idade: 1.0 }
            },
            {
                id: "thoracic_outlet",
                nome: "Síndrome do Desfiladeiro Torácico — diferencial neurovascular",
                testes: [
                    "Sintomas neurogênicos/vasculares relacionados a posição ou carga do membro superior",
                    "Exame neurológico e vascular direcionado",
                    "Testes provocativos apenas como parte de um conjunto, sem confiar em pulso isolado"
                ],
                interpretacao: "Testes provocativos de TOS apresentam limitações importantes. O diagnóstico é de exclusão e exige diferenciação de radiculopatia, neuropatias periféricas e causas vasculares."
            }
        ],
        redFlags: [
            "Trauma com deformidade, incapacidade importante, suspeita de fratura/luxação ou comprometimento neurovascular",
            "Ombro quente, vermelho, muito doloroso, com febre ou sintomas sistêmicos — considerar infecção",
            "Dor no ombro associada a dispneia, dor torácica, sudorese, náusea ou esforço cardiovascular — considerar causa cardíaca/pulmonar",
            "Dor intensa progressiva não mecânica, história de câncer ou perda de peso inexplicada",
            "Fraqueza súbita importante após trauma com pseudoparalisia — considerar ruptura extensa ou lesão neurológica",
            "Déficit vascular do membro superior: palidez/cianose persistente, frio, ausência de pulso, edema súbito ou dor desproporcional"
        ,
            "Pós-operatório/fratura com febre, secreção, eritema progressivo, dor desproporcional, perda súbita de função ou suspeita de falha de fixação",
            "Trauma com deformidade, déficit neurovascular ou incapacidade funcional importante — considerar fratura/luxação e encaminhar"
        ]
    },

    lombar: {
        nome: "Coluna Lombar / Lombossacra",
        palavrasChave: ["lombar", "lombalgia", "coluna baixa", "ciatica", "ciatico", "perna", "gluteo", "sacroiliaca"],
        clusters: [
            {
                id: "radiculopatia_lombossacra",
                nome: "Radiculopatia Lombossacra",
                testes: [
                    "SLR/Lasègue reproduz dor radicular familiar em distribuição compatível",
                    "Slump / teste neurodinâmico concordante",
                    "Déficit de miótomo, dermátomo e/ou reflexo compatível",
                    "Sintomas distais/neurológicos com padrão radicular"
                ],
                limiar: 2,
                regraConfirmacao: { tipo: "minimo", minimo: 2 },
                interpretacao: "A hipótese de radiculopatia deve combinar sintomas radiculares com exame neurológico e/ou neurodinâmico concordante. Evite usar 'hérnia de disco' como sinônimo de radiculopatia sem correlação clínica e, quando necessário, imagem.",
                palavrasChaveHMA: ["ciatica", "dor descendo pela perna", "formigamento na perna", "dormencia no pe", "fraqueza na perna", "choque na perna"],
                mecanismoPreferido: ["insidioso", "trauma_agudo"],
                tipoDorPreferido: ["neuropatica"],
                fatoresPioraRisco: ["posicao_sentada", "movimento"],
                pesos: { palavraChave: 2.2, mecanismo: 0.5, tipoDor: 2.5, fatorPiora: 0.4, esporte: 0.1, ocupacao: 0.1, comorbidade: 0.2, medicamento: 0, idade: 0, cirurgia: 0.5 }
            },
            {
                id: "dor_sacroiliaca_provocacao",
                nome: "Dor da Articulação Sacroilíaca — cluster de provocação",
                testes: [
                    "Distração pélvica",
                    "Thigh Thrust",
                    "Compressão pélvica",
                    "Sacral Thrust",
                    "Gaenslen"
                ],
                limiar: 2,
                regraConfirmacao: { tipo: "minimo", minimo: 2 },
                interpretacao: "Dois ou mais testes de provocação concordantes aumentam a plausibilidade de dor originada na região sacroilíaca. Interprete junto ao padrão de dor e descarte origem lombar/coxofemoral; não rotular como 'desalinhamento' pélvico.",
                palavrasChaveHMA: ["dor na sacroiliaca", "dor perto da covinha", "dor unilateral no gluteo", "dor posterior da pelve"],
                mecanismoPreferido: ["trauma_agudo", "pos_cirurgico", "insidioso"],
                tipoDorPreferido: ["mecanica"],
                fatoresPioraRisco: ["posicao_em_pe", "movimento"],
                pesos: { palavraChave: 1.8, mecanismo: 0.5, tipoDor: 1.2, fatorPiora: 0.4, esporte: 0.1, ocupacao: 0.1, comorbidade: 0, medicamento: 0, idade: 0, cirurgia: 0.3 },
                evidencia: "Laslett pain provocation cluster."
            }
        ,
            {
                id: "fratura_compressao_vertebral",
                nome: "Suspeita de fratura vertebral por compressão",
                testes: [
                    "Trauma relevante ou trauma menor em pessoa com fragilidade óssea",
                    "Dor focal vertebral nova e importante",
                    "Idade avançada, osteoporose ou uso prolongado de corticoide aumentam plausibilidade",
                    "Mudança funcional aguda sem padrão mecânico habitual"
                ],
                limiar: 2,
                interpretacao: "A combinação de trauma, fragilidade óssea e dor vertebral focal eleva a suspeita de fratura por compressão. Nenhum achado isolado exclui ou confirma; quando a suspeita é relevante, encaminhar para avaliação médica/imagem antes de tratamento de carga ou manipulação.",
                palavrasChaveHMA: ["fratura na coluna", "vertebra quebrada", "compressao vertebral", "caiu e doeu a coluna"],
                mecanismoPreferido: ["trauma_agudo"],
                medicamentosRisco: ["corticoide"],
                idadeFaixaBonus: { min: 65, max: 100, bonus: 1 },
                pesos: { palavraChave: 2.5, mecanismo: 2.5, tipoDor: 0.5, fatorPiora: 0, esporte: 0, ocupacao: 0, comorbidade: 1, medicamento: 1.5, idade: 1, cirurgia: 0 }
            },
            {
                id: "pos_operatorio_lombar",
                nome: "Pós-operatório Lombar — descompressão / discectomia / artrodese",
                testes: [
                    "Procedimento, nível e data da cirurgia registrados",
                    "Sintomas neurológicos atuais comparados ao pré-operatório",
                    "Tolerância a marcha, posições e atividades funcionais acompanhada",
                    "Sem febre, secreção, déficit neurológico progressivo ou nova alteração esfincteriana"
                ],
                limiar: 2,
                interpretacao: "O foco é monitorar recuperação funcional e sinais de complicação, sem presumir que um protocolo temporal único sirva para discectomia, descompressão e artrodese. Progressão deve considerar técnica, consolidação quando aplicável, sintomas e orientação cirúrgica.",
                palavrasChaveHMA: ["cirurgia de hernia", "artrodese lombar", "discectomia lombar", "laminectomia", "pos operatorio lombar"],
                mecanismoPreferido: ["pos_cirurgico"],
                pesos: { palavraChave: 2.2, mecanismo: 3, tipoDor: 0, fatorPiora: 0, esporte: 0, ocupacao: 0, comorbidade: 0.4, medicamento: 0.2, idade: 0, cirurgia: 2.5 }
            }
        ],
        diferenciais: [
            {
                id: "lombalgia_inespecifica",
                nome: "Dor Lombar Inespecífica",
                testes: [
                    "Dor lombar sem sinais de patologia séria",
                    "Exame neurológico sem déficit radicular relevante",
                    "Sintomas moduláveis por movimento, carga ou atividade"
                ],
                interpretacao: "A maioria das apresentações de dor lombar em atenção musculoesquelética é inespecífica. A classificação deve orientar manejo e prognóstico, não presumir uma estrutura anatômica causal sem evidência suficiente.",
                palavrasChaveHMA: ["dor lombar", "lombalgia", "travou a lombar", "dor nas costas"],
                mecanismoPreferido: ["insidioso", "esforco_repetitivo", "trauma_agudo"],
                tipoDorPreferido: ["mecanica"],
                pesos: { palavraChave: 1, mecanismo: 0.4, tipoDor: 1, fatorPiora: 0.3, esporte: 0.05, ocupacao: 0.05, comorbidade: 0, medicamento: 0, idade: 0, cirurgia: 0.2 }
            },
            {
                id: "estenose_lombar",
                nome: "Estenose Lombar com Claudicação Neurogênica",
                testes: [
                    "Dor/parestesia em MMII piora com caminhada ou ortostatismo",
                    "Sintomas aliviam ao sentar ou flexionar a coluna",
                    "Extensão lombar tende a agravar e flexão tende a aliviar"
                ],
                interpretacao: "Padrão de claudicação neurogênica em pessoa mais velha aumenta a suspeita de estenose. Diferenciar de claudicação vascular e correlacionar com exame neurológico e imagem quando indicado.",
                palavrasChaveHMA: ["dor andando que melhora sentado", "pernas pesadas ao caminhar", "melhora curvado", "carrinho de supermercado"],
                idadeFaixaBonus: { min: 60, max: 100, bonus: 1.5 },
                tipoDorPreferido: ["neuropatica", "mecanica"],
                fatoresPioraRisco: ["posicao_em_pe"],
                pesos: { palavraChave: 2.5, mecanismo: 0, tipoDor: 1, fatorPiora: 1, esporte: 0, ocupacao: 0, comorbidade: 0, medicamento: 0, idade: 1.2, cirurgia: 0.3 }
            },
            {
                id: "espondilolise_espondilolistese",
                nome: "Espondilólise / Espondilolistese — suspeita clínica",
                testes: [
                    "Dor lombar relacionada à extensão em atleta/jovem",
                    "Dor localizada com carga repetida em extensão/rotação",
                    "Imagem é necessária para confirmar defeito ósseo / deslizamento quando clinicamente indicado"
                ],
                interpretacao: "Testes físicos isolados, incluindo extensão unipodal, não confirmam espondilólise. Em jovens com dor persistente associada a extensão, considere investigação médica/imagem conforme quadro.",
                palavrasChaveHMA: ["dor com extensao lombar", "ginastica", "lombar em atleta jovem"],
                idadeFaixaBonus: { min: 10, max: 25, bonus: 1 },
                esportesRisco: ["ginastica", "bale", "mergulho", "levantamento"],
                pesos: { palavraChave: 1.8, mecanismo: 0.5, tipoDor: 0.8, fatorPiora: 0.3, esporte: 0.3, ocupacao: 0, comorbidade: 0, medicamento: 0, idade: 1, cirurgia: 0 }
            },
            {
                id: "instabilidade_lombar",
                nome: "Padrão de Instabilidade / Controle de Movimento Lombar",
                testes: [
                    "Prone Instability Test reproduz/modifica sintomas em contexto compatível",
                    "Movimentos aberrantes / Gower / arco doloroso inconsistente",
                    "Sintomas relacionados a controle de movimento e sustentação de carga"
                ],
                interpretacao: "Achados podem apoiar uma classificação de controle de movimento, mas não demonstram 'vértebra fora do lugar' nem instabilidade radiológica. Use para orientar exame e intervenção, não como diagnóstico estrutural definitivo.",
                palavrasChaveHMA: ["sensacao de instabilidade lombar", "falha na lombar", "trava e destrava"],
                mecanismoPreferido: ["insidioso", "esforco_repetitivo"],
                tipoDorPreferido: ["mecanica"],
                pesos: { palavraChave: 1, mecanismo: 0.3, tipoDor: 0.8, fatorPiora: 0.3, esporte: 0, ocupacao: 0, comorbidade: 0, medicamento: 0, idade: 0, cirurgia: 0.2 }
            }
        ],
        redFlags: [
            "Disfunção urinária nova (retenção/incontinência), anestesia em sela, alteração sexual ou déficit neurológico bilateral/progressivo — considerar síndrome da cauda equina e encaminhamento emergencial",
            "Déficit motor progressivo, perda rápida de força ou sinais neurológicos extensos",
            "Trauma importante ou trauma menor em pessoa com osteoporose/idade avançada/uso prolongado de corticoide — considerar fratura",
            "Febre, imunossupressão, infecção recente, procedimento invasivo recente ou uso de drogas IV com dor espinal — considerar infecção",
            "História de câncer, perda de peso inexplicada ou dor progressiva não mecânica — considerar neoplasia",
            "Dor lombar/abdominal com massa pulsátil, síncope, instabilidade hemodinâmica ou fatores de risco vasculares — considerar aneurisma de aorta abdominal",
            "Dor lombar com sintomas sistêmicos/inflamatórios atípicos ou forte suspeita de doença visceral/geniturinária — encaminhar conforme contexto"
        ]
    },

    joelho: {
        nome: "Joelho",
        palavrasChave: ["joelho", "patela", "menisco", "lca", "ligamento", "femorotibial", "patelofemoral"],
        clusters: [
            {
                id: "lesao_lca",
                nome: "Lesão do Ligamento Cruzado Anterior (LCA)",
                testes: [
                    "Lachman com aumento de translação e/ou end-feel alterado",
                    "Pivot Shift positivo quando tolerado e apropriado",
                    "Anterior Drawer positivo, especialmente fora da fase aguda",
                    "História de trauma sem contato/pivô com estalo, derrame rápido e sensação de falseio"
                ],
                limiar: 2,
                interpretacao: "Lachman e Pivot Shift têm maior utilidade clínica quando o mecanismo e a história são compatíveis. Derrame agudo e falseio aumentam a suspeita; confirmação e planejamento podem exigir imagem/ortopedia.",
                palavrasChaveHMA: ["estalo no joelho", "joelho falseia", "girou o joelho", "inchou rapido", "lca"],
                mecanismoPreferido: ["trauma_agudo"],
                tipoDorPreferido: ["mecanica"],
                esportesRisco: ["futebol", "futsal", "basquete", "volei", "handebol"],
                pesos: { palavraChave: 2.5, mecanismo: 2.5, tipoDor: 0.5, fatorPiora: 0.2, esporte: 0.2, ocupacao: 0, comorbidade: 0, medicamento: 0, idade: 0, cirurgia: 0.5 }
            },
            {
                id: "lesao_colateral",
                nome: "Lesão dos Ligamentos Colaterais (LCM/LCL)",
                testes: [
                    "Valgo a 30°: dor e/ou laxidade sugestiva de LCM",
                    "Varo a 30°: dor e/ou laxidade sugestiva de LCL",
                    "Instabilidade em 0° sugere lesão mais extensa e exige maior cautela"
                ],
                limiar: 1,
                interpretacao: "Dor localizada e principalmente laxidade em estresse valgo/varo sustentam lesão colateral. Instabilidade em extensão completa sugere envolvimento de estruturas adicionais.",
                palavrasChaveHMA: ["pancada do lado do joelho", "abriu o joelho", "ligamento colateral", "dor medial apos trauma", "dor lateral apos trauma"],
                mecanismoPreferido: ["trauma_agudo"],
                pesos: { palavraChave: 2, mecanismo: 2, tipoDor: 0.5, fatorPiora: 0, esporte: 0.1, ocupacao: 0, comorbidade: 0, medicamento: 0, idade: 0, cirurgia: 0.3 }
            },
            {
                id: "meniscal_traumatica",
                nome: "Lesão Meniscal — padrão clínico",
                testes: [
                    "Dor na interlinha articular concordante",
                    "Thessaly reproduz sintomas mecânicos familiares quando seguro",
                    "McMurray reproduz dor/click concordante",
                    "História de torção, travamento verdadeiro ou bloqueio articular"
                ],
                limiar: 2,
                interpretacao: "Testes meniscais têm acurácia limitada isoladamente. A combinação de mecanismo, dor em interlinha e sintomas mecânicos aumenta a suspeita. 'Click' assintomático isolado não confirma lesão.",
                palavrasChaveHMA: ["travou o joelho", "joelho bloqueia", "dor na linha articular", "torceu o joelho", "menisco"],
                mecanismoPreferido: ["trauma_agudo", "insidioso"],
                tipoDorPreferido: ["mecanica"],
                pesos: { palavraChave: 2, mecanismo: 1.2, tipoDor: 1, fatorPiora: 0.3, esporte: 0.1, ocupacao: 0, comorbidade: 0, medicamento: 0, idade: 0.3, cirurgia: 0.5 }
            }
        ,
            {
                id: "ruptura_mecanismo_extensor",
                nome: "Suspeita de ruptura do mecanismo extensor — quadríceps / patelar",
                testes: [
                    "Incapacidade ou grande déficit para extensão ativa do joelho / straight-leg raise",
                    "Defeito palpável ou alteração do contorno acima ou abaixo da patela",
                    "Mecanismo súbito com contração excêntrica forte, queda ou salto",
                    "Edema/equimose e perda funcional aguda"
                ],
                limiar: 2,
                interpretacao: "Incapacidade de extensão ativa após mecanismo agudo deve levantar suspeita de ruptura do tendão do quadríceps ou patelar e requer avaliação ortopédica rápida. Após reparo, a progressão de ADM e carga depende da técnica e do protocolo do cirurgião; mobilização excessivamente agressiva não deve ser automatizada.",
                palavrasChaveHMA: ["rompeu tendao do quadriceps", "rompeu patelar", "nao consegue esticar o joelho", "estalo no joelho e caiu"],
                mecanismoPreferido: ["trauma_agudo"],
                tipoDorPreferido: ["mecanica"],
                pesos: { palavraChave: 3, mecanismo: 2.5, tipoDor: 0.5, fatorPiora: 0, esporte: 0.2, ocupacao: 0, comorbidade: 0.4, medicamento: 0.5, idade: 0.3, cirurgia: 0 }
            },
            {
                id: "fratura_planalto_tibial_pos_operatorio",
                nome: "Pós-fratura do planalto tibial / ORIF",
                testes: [
                    "Classificação/descrição da fratura e método de fixação registrados",
                    "Status de carga permitido pelo cirurgião documentado",
                    "ADM do joelho, edema, força do quadríceps e controle funcional monitorados"
                ],
                limiar: 2,
                interpretacao: "A literatura favorece mobilização do joelho relativamente precoce quando a estabilidade permite, mas o momento de descarga de peso varia com padrão de fratura e fixação. O KineSys deve tratar carga como restrição individual documentada, não como prazo universal.",
                palavrasChaveHMA: ["fratura planalto tibial", "fratura tibia no joelho", "placa no planalto tibial", "orif planalto tibial"],
                mecanismoPreferido: ["trauma_agudo", "pos_cirurgico"],
                pesos: { palavraChave: 2.5, mecanismo: 2.5, tipoDor: 0, fatorPiora: 0, esporte: 0, ocupacao: 0, comorbidade: 0.4, medicamento: 0.3, idade: 0, cirurgia: 2.5 },
                evidencia: "Iliopoulos & Galanis, systematic review; Elsenosy et al., systematic review/meta-analysis 2025."
            },
            {
                id: "lesao_muscular_quadriceps",
                nome: "Lesão muscular do quadríceps / reto femoral",
                testes: [
                    "Dor aguda focal após sprint, chute ou aceleração/desaceleração",
                    "Dor à contração resistida de extensão do joelho e/ou flexão do quadril",
                    "Dor à elongação do quadríceps e sensibilidade focal",
                    "Perda de força comparável e limitação funcional sem falha completa do mecanismo extensor"
                ],
                limiar: 2,
                interpretacao: "Padrão compatível com lesão muscular quando mecanismo, dor focal e testes de carga concordam. Diferenciar de ruptura tendínea, contusão, avulsão e lesão óssea, especialmente quando há incapacidade funcional importante.",
                palavrasChaveHMA: ["estiramento quadriceps", "rasgou a coxa na frente", "dor no reto femoral", "puxou quadriceps"],
                mecanismoPreferido: ["trauma_agudo"],
                esportesRisco: ["futebol", "corrida", "atletismo", "crossfit"],
                pesos: { palavraChave: 2, mecanismo: 2, tipoDor: 1, fatorPiora: 0.2, esporte: 0.2, ocupacao: 0, comorbidade: 0, medicamento: 0, idade: 0, cirurgia: 0 }
            }
        ],
        diferenciais: [
            {
                id: "dor_patelofemoral",
                nome: "Dor Patelofemoral",
                testes: [
                    "Dor retropatelar/peripatelar durante agachamento, escadas, corrida ou salto",
                    "Dor reproduzida em tarefa com flexão do joelho sob carga",
                    "Ausência de outro diagnóstico mais provável"
                ],
                interpretacao: "O diagnóstico é clínico e baseado em dor ao redor/atrás da patela agravada por atividades com joelho flexionado sob carga. Testes de compressão patelar isolados não são necessários e podem ser irritativos.",
                palavrasChaveHMA: ["dor na frente do joelho", "dor na patela", "dor descendo escada", "dor agachando", "dor sentado muito tempo"],
                mecanismoPreferido: ["insidioso", "esforco_repetitivo"],
                tipoDorPreferido: ["mecanica"],
                fatoresPioraRisco: ["movimento", "posicao_sentada"],
                esportesRisco: ["corrida", "futebol", "basquete", "volei"],
                pesos: { palavraChave: 2, mecanismo: 0.7, tipoDor: 1.2, fatorPiora: 0.5, esporte: 0.2, ocupacao: 0, comorbidade: 0, medicamento: 0, idade: 0, cirurgia: 0.3 }
            },
            {
                id: "tendinopatia_patelar",
                nome: "Tendinopatia Patelar",
                testes: [
                    "Dor bem localizada no polo inferior da patela / tendão patelar",
                    "Dor reproduzida com carga do extensor (decline squat, salto ou resistência)",
                    "Relação carga-sintoma típica, especialmente em esportes de salto"
                ],
                interpretacao: "Tendinopatia patelar é uma condição de dor localizada e dependente de carga. Achados de imagem podem existir sem sintomas e não devem ser usados isoladamente.",
                palavrasChaveHMA: ["dor no tendao patelar", "dor abaixo da patela", "dor pulando", "joelho do saltador"],
                mecanismoPreferido: ["esforco_repetitivo", "insidioso"],
                tipoDorPreferido: ["mecanica"],
                esportesRisco: ["volei", "basquete", "corrida", "futebol"],
                pesos: { palavraChave: 2, mecanismo: 1, tipoDor: 1.2, fatorPiora: 0.3, esporte: 0.25, ocupacao: 0, comorbidade: 0, medicamento: 0.2, idade: 0, cirurgia: 0.3 }
            },
            {
                id: "instabilidade_patelar",
                nome: "Instabilidade Patelar",
                testes: [
                    "Apprehension patelar reproduz apreensão",
                    "História de luxação/subluxação patelar",
                    "Sinais de hipermobilidade patelar interpretados junto aos sintomas"
                ],
                interpretacao: "História de luxação/subluxação e apreensão patelar são mais relevantes que hipermobilidade isolada."
            },
            {
                id: "dor_lateral_corrida",
                nome: "Dor Lateral do Joelho relacionada à corrida / trato iliotibial",
                testes: [
                    "Dor focal lateral próximo ao epicôndilo femoral, relacionada à corrida",
                    "Dor reproduzida por tarefa/carga específica",
                    "Outras causas intra-articulares e tendíneas foram consideradas"
                ],
                interpretacao: "O termo 'síndrome da banda iliotibial' descreve uma apresentação de dor lateral relacionada à corrida. Testes como Ober não confirmam a condição nem demonstram 'encurtamento causal'."
            },
            {
                id: "osteoartrite_joelho",
                nome: "Osteoartrite de Joelho — hipótese clínica",
                testes: [
                    "Idade e história compatíveis com dor relacionada à atividade",
                    "Rigidez matinal curta e/ou crepitação",
                    "Redução de ADM, derrame ou sinais clínicos degenerativos em contexto compatível"
                ],
                interpretacao: "OA pode ser suspeitada clinicamente; imagem não é obrigatória em todos os casos e alterações radiográficas não determinam intensidade da dor."
            }
        ],
        redFlags: [
            "Trauma com incapacidade de apoiar peso, deformidade, dor óssea focal importante ou suspeita de fratura",
            "Joelho quente, muito inchado, vermelho, com febre ou mal-estar — considerar artrite séptica",
            "Bloqueio articular verdadeiro persistente após trauma — considerar lesão mecânica deslocada",
            "Déficit neurovascular após trauma/luxação: pulso reduzido, pé frio/pálido, parestesias ou fraqueza progressiva",
            "Dor e edema de panturrilha, assimetria importante ou dispneia — considerar TVP/TEP conforme contexto",
            "Dor óssea progressiva não mecânica, história de câncer ou sintomas sistêmicos inexplicados"
        ,
            "Pós-operatório de fratura ou reparo tendíneo com febre, secreção, abertura de ferida, perda súbita da extensão ativa ou suspeita de falha do reparo",
            "Edema importante de panturrilha, dispneia ou dor torácica no pós-operatório — considerar TVP/TEP"
        ]
    },

    quadril: {
        nome: "Quadril / Virilha / Pelve",
        palavrasChave: ["quadril", "virilha", "coxa", "coxofemoral", "trocanter", "gluteo", "pelve", "pubalgia"],
        clusters: [
            {
                id: "fai_sindrome",
                nome: "Síndrome do Impacto Femoroacetabular (FAI) — suspeita",
                testes: [
                    "Sintomas típicos de quadril/virilha relacionados a flexão, rotação ou atividade",
                    "FADIR reproduz dor familiar",
                    "Redução dolorosa de rotação interna / flexão em contexto compatível",
                    "Imagem demonstra morfologia compatível quando necessária para confirmar a síndrome"
                ],
                limiar: 3,
                interpretacao: "FAI syndrome requer a tríade de sintomas, sinais clínicos e achados de imagem. FADIR é útil para provocar sintomas, mas tem baixa especificidade e não confirma FAI isoladamente.",
                palavrasChaveHMA: ["dor na virilha", "dor flexionando quadril", "pinça na frente do quadril", "fai", "impacto femoroacetabular"],
                mecanismoPreferido: ["insidioso", "esforco_repetitivo"],
                tipoDorPreferido: ["mecanica"],
                esportesRisco: ["futebol", "hockey", "artes marciais", "danca"],
                idadeFaixaBonus: { min: 15, max: 50, bonus: 0.5 },
                pesos: { palavraChave: 2, mecanismo: 0.5, tipoDor: 1.2, fatorPiora: 0.3, esporte: 0.15, ocupacao: 0, comorbidade: 0, medicamento: 0, idade: 0.4, cirurgia: 0.5 },
                evidencia: "Warwick Agreement: symptoms + clinical signs + imaging."
            },
            {
                id: "osteoartrite_quadril",
                nome: "Osteoartrite de Quadril — cluster clínico",
                testes: [
                    "Dor anterior/lateral de quadril relacionada à carga",
                    "Rotação interna limitada e/ou dolorosa",
                    "Flexão de quadril reduzida",
                    "Rigidez matinal geralmente < 60 min"
                ],
                limiar: 3,
                interpretacao: "Combinação de idade, dor relacionada à carga e perda de mobilidade, especialmente rotação interna, aumenta a suspeita de OA de quadril. Achado radiográfico isolado não explica necessariamente a dor.",
                palavrasChaveHMA: ["desgaste no quadril", "artrose do quadril", "rigidez na virilha", "dor para calcar sapato"],
                tipoDorPreferido: ["mecanica"],
                idadeFaixaBonus: { min: 50, max: 100, bonus: 1 },
                fatoresPioraRisco: ["movimento", "posicao_em_pe"],
                pesos: { palavraChave: 2, mecanismo: 0, tipoDor: 1.2, fatorPiora: 0.3, esporte: 0, ocupacao: 0, comorbidade: 0, medicamento: 0, idade: 1, cirurgia: 0.5 }
            },
            {
                id: "gtps",
                nome: "Síndrome da Dor Trocantérica Maior / Tendinopatia Glútea",
                testes: [
                    "Palpação do grande trocânter reproduz dor familiar",
                    "Abdução resistida reproduz dor lateral",
                    "Teste de apoio unipodal / carga compressiva lateral reproduz sintomas",
                    "Dor lateral ao deitar sobre o lado afetado"
                ],
                limiar: 2,
                interpretacao: "Dor lateral focal com reprodução à palpação e carga dos abdutores aumenta a suspeita de GTPS. 'Bursite' isolada é uma explicação incompleta; tendões glúteos frequentemente participam do quadro.",
                palavrasChaveHMA: ["dor do lado do quadril", "dor no trocanter", "dor deitado de lado", "tendinopatia glutea"],
                mecanismoPreferido: ["insidioso", "esforco_repetitivo"],
                tipoDorPreferido: ["mecanica"],
                fatoresPioraRisco: ["periodo_noturno", "posicao_em_pe"],
                idadeFaixaBonus: { min: 40, max: 75, bonus: 0.5 },
                pesos: { palavraChave: 2, mecanismo: 0.5, tipoDor: 1, fatorPiora: 0.4, esporte: 0.1, ocupacao: 0, comorbidade: 0, medicamento: 0.2, idade: 0.4, cirurgia: 0.3 }
            }
        ,
            {
                id: "fratura_quadril_pos_operatorio",
                nome: "Pós-fratura de quadril / fêmur proximal — osteossíntese ou artroplastia",
                testes: [
                    "Tipo de fratura e procedimento registrados",
                    "Status de carga permitido e precauções pós-operatórias documentados",
                    "Marcha, transferências, dor e força de abdutores/extensores monitoradas"
                ],
                limiar: 2,
                interpretacao: "A reabilitação deve priorizar mobilidade e recuperação funcional precoces quando clinicamente permitidas, mas a carga depende do padrão da fratura, estabilidade da fixação e orientação ortopédica. O motor não deve impor precauções universais sem conhecer a abordagem cirúrgica.",
                palavrasChaveHMA: ["fratura do quadril", "quebrou femur", "fratura colo femur", "parafuso no femur", "cirurgia fratura quadril"],
                mecanismoPreferido: ["trauma_agudo", "pos_cirurgico"],
                pesos: { palavraChave: 2.5, mecanismo: 2.5, tipoDor: 0, fatorPiora: 0, esporte: 0, ocupacao: 0, comorbidade: 0.4, medicamento: 0.2, idade: 0.8, cirurgia: 2.5 }
            },
            {
                id: "lesao_adutores",
                nome: "Lesão muscular de adutores / dor aguda de virilha",
                testes: [
                    "Mecanismo agudo em mudança de direção, chute ou abertura excessiva",
                    "Dor focal em adutores reproduzida por adução resistida",
                    "Dor à palpação do complexo adutor concordante",
                    "Alongamento dos adutores reproduz sintomas sem sinais predominantes intra-articulares"
                ],
                limiar: 2,
                interpretacao: "A combinação de mecanismo, dor focal e adução resistida dolorosa apoia lesão do complexo adutor. Diferenciar de dor inguinal relacionada ao iliopsoas, sínfise púbica, quadril e hérnia/causa visceral.",
                palavrasChaveHMA: ["puxou virilha", "estiramento adutor", "rasgou adutor", "dor na virilha chutando"],
                mecanismoPreferido: ["trauma_agudo"],
                esportesRisco: ["futebol", "futsal", "tenis", "beach tennis", "artes marciais"],
                pesos: { palavraChave: 2.2, mecanismo: 2, tipoDor: 1, fatorPiora: 0.3, esporte: 0.2, ocupacao: 0, comorbidade: 0, medicamento: 0, idade: 0, cirurgia: 0 }
            },
            {
                id: "lesao_isquiotibiais",
                nome: "Lesão muscular de isquiotibiais",
                testes: [
                    "Dor posterior de coxa de início súbito em corrida, sprint ou alongamento forçado",
                    "Dor à contração resistida de flexores do joelho/extensores do quadril",
                    "Dor à palpação/alongamento do músculo ou junção miotendínea",
                    "Déficit de força ou função em comparação ao lado contralateral"
                ],
                limiar: 2,
                interpretacao: "A avaliação deve considerar músculo/tecido envolvido, mecanismo, gravidade, sintomas, força e resposta à carga. A progressão é preferencialmente baseada em critérios e demanda esportiva, incluindo exposição progressiva à corrida/sprint quando pertinente, e não apenas em tempo.",
                palavrasChaveHMA: ["estiramento posterior de coxa", "puxou posterior", "lesao hamstring", "rasgou posterior"],
                mecanismoPreferido: ["trauma_agudo"],
                esportesRisco: ["futebol", "corrida", "atletismo", "rugby"],
                pesos: { palavraChave: 2.3, mecanismo: 2.2, tipoDor: 1, fatorPiora: 0.3, esporte: 0.2, ocupacao: 0, comorbidade: 0, medicamento: 0, idade: 0, cirurgia: 0 },
                evidencia: "London International Consensus on Hamstring Injuries, BJSM."
            }
        ],
        diferenciais: [
            {
                id: "dor_referida_lombar_quadril",
                nome: "Dor Referida de Origem Lombar",
                testes: [
                    "Movimento lombar modifica a dor no quadril/coxa",
                    "Sinais neurológicos ou padrão radicular presentes",
                    "Exame local do quadril não explica adequadamente a queixa"
                ],
                interpretacao: "Diferencie origem lombar quando a apresentação do quadril é pouco concordante ou há modulação clara pela coluna."
            },
            {
                id: "dor_inguinal_adutor",
                nome: "Dor Inguinal relacionada a Adutores / Púbis / Parede Abdominal",
                testes: [
                    "Palpação e adução resistida reproduzem dor de adutor",
                    "Sit-up/carga abdominal reproduz dor de parede abdominal",
                    "Dor pubiana focal reproduzida à palpação/carga"
                ],
                interpretacao: "Classifique dor inguinal pela estrutura clínica predominante (adutor, iliopsoas, inguinal, púbica ou relacionada ao quadril) em vez de agrupar tudo como 'pubalgia'."
            },
            {
                id: "fratura_estresse_colo_femur",
                nome: "Fratura por Estresse do Colo Femoral — hipótese de segurança",
                testes: [
                    "Dor na virilha com carga progressiva e corrida/salto",
                    "Dor em repouso/noturna ou piora rápida",
                    "Hop test/carga axial provoca dor importante — não insistir se suspeita alta"
                ],
                interpretacao: "Suspeita de fratura por estresse do colo femoral exige interrupção da carga e avaliação por imagem, especialmente em atletas, baixa disponibilidade energética ou dor progressiva."
            }
        ],
        redFlags: [
            "Trauma com incapacidade de apoiar peso, deformidade/rotação externa do membro ou suspeita de fratura do colo femoral",
            "Dor na virilha progressiva em corredor/atleta com dor noturna ou em repouso — considerar fratura por estresse do colo femoral",
            "Febre, quadril muito doloroso e limitação importante — considerar artrite séptica",
            "Dor intensa súbita com fatores de risco para osteonecrose (ex.: uso prolongado de corticoide, álcool em excesso) — considerar investigação médica",
            "Dor pélvica/inguinal com sintomas abdominais, urinários, ginecológicos ou massa inguinal não redutível — considerar origem visceral/hérnia complicada",
            "Dor não mecânica progressiva, perda de peso ou história de câncer"
        ,
            "Pós-fratura/pós-operatório com nova incapacidade de apoio, deformidade, rotação anormal, estalido ou dor súbita intensa — considerar falha mecânica/luxação/nova fratura",
            "Edema unilateral importante, dispneia ou dor torácica no pós-operatório — considerar TVP/TEP"
        ]
    },

    tornozelo_pe: {
        nome: "Tornozelo e Pé",
        palavrasChave: ["tornozelo", "pe", "calcanhar", "aquiles", "fascia", "metatarso", "maleolo", "plantar"],
        clusters: [
            {
                id: "entorse_lateral_tornozelo",
                nome: "Entorse Lateral de Tornozelo",
                testes: [
                    "Anterior Drawer do tornozelo: laxidade/dor compatível com LTFA",
                    "Talar Tilt: laxidade/dor compatível com LCF",
                    "História de inversão com dor/edema lateral",
                    "Capacidade de apoio e função avaliadas após triagem de fratura"
                ],
                limiar: 2,
                interpretacao: "História de inversão, dor/edema lateral e testes ligamentares concordantes apoiam entorse lateral. Na fase aguda, primeiro aplique critérios de necessidade de radiografia quando apropriado.",
                palavrasChaveHMA: ["torceu o tornozelo", "virou o pe", "entorse", "inchou do lado de fora"],
                mecanismoPreferido: ["trauma_agudo"],
                tipoDorPreferido: ["mecanica"],
                esportesRisco: ["futebol", "basquete", "volei", "corrida"],
                pesos: { palavraChave: 2.3, mecanismo: 2.2, tipoDor: 0.5, fatorPiora: 0.3, esporte: 0.15, ocupacao: 0, comorbidade: 0, medicamento: 0, idade: 0, cirurgia: 0.5 }
            },
            {
                id: "lesao_sindesmose",
                nome: "Lesão da Sindesmose / Entorse Alta",
                testes: [
                    "Squeeze Test reproduz dor distal na sindesmose",
                    "External Rotation Stress Test reproduz dor sindesmótica",
                    "Dor acima da articulação do tornozelo após rotação externa/dorsiflexão",
                    "Dor desproporcional para entorse lateral simples / dificuldade importante de apoio"
                ],
                limiar: 2,
                interpretacao: "Dois ou mais achados concordantes aumentam a suspeita de lesão sindesmótica. Lesões instáveis podem necessitar imagem e avaliação ortopédica.",
                palavrasChaveHMA: ["entorse alta", "dor acima do tornozelo", "torceu com pe preso", "sindesmose"],
                mecanismoPreferido: ["trauma_agudo"],
                pesos: { palavraChave: 2.2, mecanismo: 2, tipoDor: 0.5, fatorPiora: 0.3, esporte: 0.1, ocupacao: 0, comorbidade: 0, medicamento: 0, idade: 0, cirurgia: 0.3 }
            },
            {
                id: "ruptura_aquiles",
                nome: "Ruptura do Tendão de Aquiles",
                testes: [
                    "Thompson/Simmonds: ausência ou redução importante de flexão plantar",
                    "Defeito palpável no tendão em contexto agudo",
                    "Perda súbita de capacidade de impulsão / sensação de 'chute' na panturrilha"
                ],
                limiar: 2,
                interpretacao: "Thompson positivo e perda funcional súbita são altamente preocupantes para ruptura do Aquiles. Encaminhar prontamente para avaliação médica/ortopédica; tratamento pode ser operatório ou não operatório conforme caso.",
                palavrasChaveHMA: ["pareceu que chutaram minha panturrilha", "estalo no aquiles", "rompeu aquiles", "nao consegue ficar na ponta do pe"],
                mecanismoPreferido: ["trauma_agudo"],
                medicamentosRisco: ["fluoroquinolona", "corticoide"],
                idadeFaixaBonus: { min: 30, max: 60, bonus: 0.5 },
                pesos: { palavraChave: 3, mecanismo: 2.5, tipoDor: 0.5, fatorPiora: 0, esporte: 0.2, ocupacao: 0, comorbidade: 0.3, medicamento: 1, idade: 0.4, cirurgia: 0.2 }
            }
        ,
            {
                id: "fratura_tornozelo_pos_operatorio",
                nome: "Pós-fratura de tornozelo / osteossíntese",
                testes: [
                    "Padrão de fratura e procedimento registrados",
                    "Carga permitida e uso de órtese/bota documentados",
                    "ADM, edema, marcha, força de panturrilha e função monitorados"
                ],
                limiar: 2,
                interpretacao: "A progressão de mobilidade e descarga de peso deve respeitar estabilidade da fixação, consolidação e orientação ortopédica. O motor deve registrar restrições específicas e evitar protocolo único para todas as fraturas maleolares/sindesmóticas.",
                palavrasChaveHMA: ["fratura tornozelo", "quebrou tornozelo", "placa no tornozelo", "parafuso maleolo", "orif tornozelo"],
                mecanismoPreferido: ["trauma_agudo", "pos_cirurgico"],
                pesos: { palavraChave: 2.4, mecanismo: 2.4, tipoDor: 0, fatorPiora: 0, esporte: 0, ocupacao: 0, comorbidade: 0.3, medicamento: 0.2, idade: 0, cirurgia: 2.5 }
            },
            {
                id: "lesao_muscular_panturrilha",
                nome: "Lesão muscular da panturrilha — gastrocnêmio / sóleo",
                testes: [
                    "Dor súbita focal na panturrilha durante corrida, aceleração, salto ou mudança de direção",
                    "Dor reproduzida por elevação de calcanhar e/ou flexão plantar resistida",
                    "Dor à palpação/alongamento do gastrocnêmio ou sóleo em padrão concordante",
                    "Thompson preservado quando não há suspeita de ruptura completa do Aquiles"
                ],
                limiar: 2,
                interpretacao: "A lesão de panturrilha é heterogênea e deve ser diferenciada de ruptura do Aquiles e trombose venosa profunda. Progressão de carga e retorno à corrida devem usar sintomas, capacidade de força e demandas esportivas; imagem pode ajudar na graduação/prognóstico, mas não substitui avaliação clínica.",
                palavrasChaveHMA: ["estiramento panturrilha", "pedrada na panturrilha", "puxou gemeos", "rasgou panturrilha"],
                mecanismoPreferido: ["trauma_agudo"],
                esportesRisco: ["futebol", "corrida", "tenis", "beach tennis", "atletismo"],
                pesos: { palavraChave: 2.4, mecanismo: 2.2, tipoDor: 1, fatorPiora: 0.2, esporte: 0.2, ocupacao: 0, comorbidade: 0, medicamento: 0, idade: 0, cirurgia: 0 },
                evidencia: "Green et al. expert consensus; Pagan-Rosado et al. review 2025."
            },
            {
                id: "ruptura_aquiles_pos_operatorio",
                nome: "Ruptura do Aquiles — pós-operatório ou tratamento funcional",
                testes: [
                    "Tipo de tratamento e data da lesão/reparo registrados",
                    "Proteção do tendão e limites de dorsiflexão/carga documentados conforme protocolo",
                    "Função de flexão plantar e progressão de marcha acompanhadas",
                    "Sem sinais de reruptura, infecção, TVP ou falha de cicatrização"
                ],
                limiar: 2,
                interpretacao: "O motor deve distinguir diagnóstico de ruptura aguda da fase de reabilitação. Após reparo ou tratamento funcional, carga e dorsiflexão são progressivas e dependem do protocolo e da evolução; não usar um calendário universal sem dados do procedimento.",
                palavrasChaveHMA: ["ruptura aquiles", "cirurgia aquiles", "sutura aquiles", "pos operatorio aquiles"],
                mecanismoPreferido: ["pos_cirurgico", "trauma_agudo"],
                pesos: { palavraChave: 2.5, mecanismo: 2.7, tipoDor: 0, fatorPiora: 0, esporte: 0.1, ocupacao: 0, comorbidade: 0.2, medicamento: 0.4, idade: 0, cirurgia: 2.5 }
            }
        ],
        diferenciais: [
            {
                id: "dor_plantar_calcanhar",
                nome: "Dor Plantar do Calcâneo / Fasciopatia Plantar",
                testes: [
                    "Dor medial plantar no calcâneo, pior nos primeiros passos após repouso",
                    "Palpação da inserção medial da fáscia reproduz dor",
                    "Windlass test / dorsiflexão dos dedos reproduz dor em contexto compatível"
                ],
                interpretacao: "A apresentação típica é dor plantar medial no calcâneo com padrão de primeiros passos e sensibilidade local. O termo 'esporão' não deve ser usado como explicação causal automática.",
                palavrasChaveHMA: ["dor no calcanhar de manha", "primeiros passos doem", "dor na sola do pe", "fascite plantar"],
                mecanismoPreferido: ["insidioso", "esforco_repetitivo"],
                tipoDorPreferido: ["mecanica"],
                fatoresPioraRisco: ["posicao_em_pe"],
                pesos: { palavraChave: 2, mecanismo: 0.6, tipoDor: 1, fatorPiora: 0.4, esporte: 0.1, ocupacao: 0.1, comorbidade: 0, medicamento: 0, idade: 0, cirurgia: 0.2 }
            },
            {
                id: "tendinopatia_tibial_posterior",
                nome: "Disfunção do Tendão Tibial Posterior / Pé Plano Adquirido",
                testes: [
                    "Dor/edema no trajeto posteromedial do tornozelo",
                    "Single-leg heel raise doloroso, fraco ou incapaz",
                    "Queda progressiva do arco / sinal de muitos dedos em contexto compatível"
                ],
                interpretacao: "A incapacidade de elevação unilateral do calcâneo e deformidade progressiva aumentam a suspeita de disfunção do tibial posterior."
            },
            {
                id: "neuroma_morton",
                nome: "Neuroma de Morton / Dor Intermetatarsal",
                testes: [
                    "Dor/parestesia em espaço intermetatarsal, frequentemente 3º",
                    "Compressão do antepé reproduz sintomas",
                    "Mulder click pode estar presente, mas não é obrigatório"
                ],
                interpretacao: "Considere neuroma quando há dor neuropática focal no antepé e reprodução por compressão. Diferencie de metatarsalgia, fratura por estresse e neuropatia."
            },
            {
                id: "tendinopatia_aquiles",
                nome: "Tendinopatia do Tendão de Aquiles",
                testes: [
                    "Dor localizada no tendão de Aquiles relacionada à carga, corrida, salto ou elevação de calcanhar",
                    "Palpação/carga do tendão reproduz a dor familiar sem sinais de ruptura aguda",
                    "Capacidade de elevação de calcanhar está dolorosa ou reduzida, mas Thompson não sugere ruptura completa"
                ],
                regraConfirmacao: { tipo: "minimo", minimo: 2 },
                interpretacao: "Padrão compatível com tendinopatia quando a dor é localizada e relacionada à carga. Diferenciar de ruptura, bursite, dor referida e condições inflamatórias conforme contexto.",
                palavrasChaveHMA: ["dor no aquiles", "tendinite aquiles", "dor no tendao de aquiles", "aquiles doi correndo"],
                mecanismoPreferido: ["insidioso", "esforco_repetitivo"],
                pesos: { palavraChave: 2.0, mecanismo: 0.8, esporte: 0.2 }
            },
            {
                id: "instabilidade_cronica_tornozelo",
                nome: "Instabilidade Crônica do Tornozelo — hipótese funcional",
                testes: [
                    "História de entorses recorrentes ou sensação de falseio/giving way",
                    "Déficit funcional em equilíbrio, salto ou tarefas específicas após entorse prévia",
                    "Laxidade mecânica pode estar presente, mas sintomas recorrentes e função são considerados em conjunto"
                ],
                regraConfirmacao: { tipo: "minimo", minimo: 2 },
                interpretacao: "Fenótipo útil após entorse quando persistem falseio e déficits funcionais. Diferenciar instabilidade funcional de lesão aguda não cicatrizada, sindesmose e causas neurológicas.",
                palavrasChaveHMA: ["tornozelo falseia", "entorse recorrente", "tornozelo vira sempre", "instabilidade tornozelo"],
                mecanismoPreferido: ["trauma_agudo", "esforco_repetitivo"],
                pesos: { palavraChave: 1.9, mecanismo: 0.4 }
            },
            {
                id: "neuropatia_periferica",
                nome: "Neuropatia Periférica / Risco de Pé Diabético",
                testes: [
                    "Monofilamento de 10 g com perda de sensibilidade protetora",
                    "Sensibilidade vibratória/neurológica alterada",
                    "Inspeção de pele, perfusão e deformidades"
                ],
                interpretacao: "Em diabetes ou suspeita neuropática, priorize avaliação de sensibilidade protetora, integridade cutânea e perfusão. Úlcera, infecção ou isquemia exigem encaminhamento apropriado.",
                comorbidadesRisco: ["diabetico"],
                pesos: { palavraChave: 1, mecanismo: 0, tipoDor: 1, fatorPiora: 0, esporte: 0, ocupacao: 0, comorbidade: 2, medicamento: 0, idade: 0.3, cirurgia: 0 }
            }
        ],
        redFlags: [
            "Aplicar Ottawa Ankle/Foot Rules após trauma quando apropriado: dor em zona maleolar/midfoot + dor óssea específica ou incapacidade de apoiar pode indicar necessidade de radiografia",
            "Deformidade, ferida aberta, comprometimento neurovascular ou suspeita de luxação/fratura instável",
            "Dor desproporcional, tensão progressiva, parestesia e piora rápida após trauma — considerar síndrome compartimental",
            "Pé diabético com úlcera, infecção, necrose, isquemia ou perda importante de sensibilidade protetora",
            "Panturrilha dolorosa/inchada assimétrica, especialmente com fatores de risco trombóticos — considerar TVP",
            "Dor óssea focal progressiva em atleta, pior com carga e eventualmente em repouso — considerar fratura por estresse"
        ,
            "Pós-fratura/pós-operatório com dor progressiva desproporcional, sinais de infecção, alteração neurovascular ou suspeita de falha de fixação",
            "Panturrilha quente/edemaciada com dor não explicada mecanicamente, especialmente pós-imobilização — considerar TVP"
        ]
    },

    cotovelo: {
        nome: "Cotovelo / Antebraço",
        palavrasChave: ["cotovelo", "epicondilo", "antebraco", "ulnar", "tenista", "golfista"],
        clusters: [
            {
                id: "tendinopatia_lateral_cotovelo",
                nome: "Dor Lateral do Cotovelo / Tendinopatia Extensora",
                testes: [
                    "Dor à palpação no epicôndilo lateral / origem extensora",
                    "Extensão de punho resistida (Cozen) reproduz dor lateral familiar",
                    "Extensão do dedo médio / Maudsley ou preensão reproduz dor",
                    "Grip strength dolorosa/reduzida comparativamente"
                ],
                limiar: 2,
                interpretacao: "O diagnóstico é predominantemente clínico: dor lateral relacionada à carga dos extensores e redução de força de preensão por dor. Cozen/Mill/Maudsley isolados não definem gravidade estrutural.",
                palavrasChaveHMA: ["dor do lado de fora do cotovelo", "cotovelo de tenista", "dor apertando", "dor segurando peso"],
                mecanismoPreferido: ["esforco_repetitivo", "insidioso"],
                tipoDorPreferido: ["mecanica"],
                ocupacoesRisco: ["mecanico", "pintor", "carpinteiro"],
                esportesRisco: ["tenis", "beach tennis", "padel"],
                pesos: { palavraChave: 2, mecanismo: 0.8, tipoDor: 1, fatorPiora: 0.3, esporte: 0.15, ocupacao: 0.15, comorbidade: 0, medicamento: 0.2, idade: 0, cirurgia: 0.2 }
            },
            {
                id: "tendinopatia_medial_cotovelo",
                nome: "Dor Medial do Cotovelo / Tendinopatia Flexor-Pronadora",
                testes: [
                    "Dor à palpação na origem flexor-pronadora",
                    "Flexão de punho/pronação resistida reproduz dor medial",
                    "Alongamento passivo dos flexores reproduz dor local"
                ],
                limiar: 2,
                interpretacao: "Padrão de dor medial dependente de carga dos flexores/pronadores apoia tendinopatia medial. Diferenciar de UCL e neuropatia ulnar.",
                palavrasChaveHMA: ["dor do lado de dentro do cotovelo", "cotovelo de golfista", "dor flexionando punho"],
                mecanismoPreferido: ["esforco_repetitivo"],
                tipoDorPreferido: ["mecanica"],
                pesos: { palavraChave: 2, mecanismo: 0.8, tipoDor: 1, fatorPiora: 0.3, esporte: 0.1, ocupacao: 0.1, comorbidade: 0, medicamento: 0, idade: 0, cirurgia: 0.2 }
            },
            {
                id: "instabilidade_ucl",
                nome: "Lesão / Instabilidade do Ligamento Colateral Ulnar",
                testes: [
                    "Moving Valgus Stress Test reproduz dor/instabilidade medial",
                    "Milking Maneuver / valgus stress concordante",
                    "História de arremesso/valgo repetido ou trauma"
                ],
                limiar: 2,
                interpretacao: "Em atleta de arremesso, história e Moving Valgus Stress Test concordantes aumentam a suspeita de UCL. Diferencie dor flexor-pronadora e neuropatia ulnar.",
                palavrasChaveHMA: ["dor medial arremessando", "cotovelo abre", "ligamento ulnar"],
                mecanismoPreferido: ["trauma_agudo", "esforco_repetitivo"],
                esportesRisco: ["beisebol", "handebol", "volei", "arremesso"],
                pesos: { palavraChave: 2.2, mecanismo: 1.5, tipoDor: 0.8, fatorPiora: 0.2, esporte: 0.25, ocupacao: 0, comorbidade: 0, medicamento: 0, idade: 0, cirurgia: 0.3 }
            }
        ,
            {
                id: "ruptura_biceps_distal",
                nome: "Suspeita de ruptura do bíceps distal",
                testes: [
                    "Hook test alterado/ausência do tendão palpável em contexto compatível",
                    "Mecanismo excêntrico súbito com estalo ou equimose anterior",
                    "Fraqueza importante de supinação e flexão",
                    "Alteração do contorno do bíceps / sinal clínico concordante"
                ],
                limiar: 2,
                interpretacao: "A combinação de história e exame físico pode identificar ruptura completa com boa confiança; suspeita de lesão parcial ou exame inconclusivo pode exigir imagem. Em ruptura completa aguda e paciente de alta demanda, avaliação ortopédica precoce é importante.",
                palavrasChaveHMA: ["rompeu biceps", "estalo no cotovelo", "biceps subiu", "fraqueza para girar a palma"],
                mecanismoPreferido: ["trauma_agudo"],
                esportesRisco: ["musculacao", "crossfit", "powerlifting"],
                pesos: { palavraChave: 2.8, mecanismo: 2.5, tipoDor: 0.5, fatorPiora: 0, esporte: 0.2, ocupacao: 0.1, comorbidade: 0, medicamento: 0.3, idade: 0.4, cirurgia: 0 },
                evidencia: "Distal biceps diagnostic strategy cohort; systematic reviews of treatment/rehabilitation."
            },
            {
                id: "fratura_cotovelo_pos_operatorio",
                nome: "Pós-fratura do cotovelo — olécrano / cabeça do rádio / úmero distal",
                testes: [
                    "Tipo de fratura, fixação e estabilidade documentados",
                    "Restrições de flexo-extensão, prono-supinação e carga registradas",
                    "Edema, ADM, função e estado neurovascular monitorados",
                    "Sem infecção, perda de redução, bloqueio mecânico novo ou neuropatia progressiva"
                ],
                limiar: 2,
                interpretacao: "O cotovelo é propenso a rigidez após trauma, mas a mobilização deve respeitar estabilidade da fratura/fixação e tecidos reparados. O KineSys deve registrar restrições específicas do procedimento em vez de sugerir ganho de ADM indiscriminado.",
                palavrasChaveHMA: ["fratura cotovelo", "fratura olecrano", "fratura cabeca radio", "fratura umero distal", "placa cotovelo"],
                mecanismoPreferido: ["trauma_agudo", "pos_cirurgico"],
                pesos: { palavraChave: 2.4, mecanismo: 2.4, tipoDor: 0, fatorPiora: 0, esporte: 0, ocupacao: 0, comorbidade: 0.2, medicamento: 0.2, idade: 0, cirurgia: 2.5 }
            }
        ],
        diferenciais: [
            {
                id: "tunel_cubital",
                nome: "Neuropatia Ulnar no Cotovelo / Túnel Cubital",
                testes: [
                    "Parestesia em 4º/5º dedos / distribuição ulnar",
                    "Tinel no túnel cubital reproduz sintomas",
                    "Elbow Flexion + Pressure Provocation reproduz sintomas",
                    "Fraqueza intrínseca da mão / sinais motores em casos avançados"
                ],
                interpretacao: "Combinação de distribuição sensitiva típica, provocação no túnel cubital e achados motores apoia neuropatia ulnar. Diferenciar de radiculopatia C8-T1 e compressão no punho."
            },
            {
                id: "bursite_olecrano",
                nome: "Bursite do Olécrano",
                testes: [
                    "Edema focal superficial sobre o olécrano",
                    "Dor/pressão local",
                    "Avaliar calor, rubor, ferida e febre para excluir bursite séptica"
                ],
                interpretacao: "Bursite asséptica costuma apresentar edema superficial. Calor, rubor e sintomas sistêmicos elevam preocupação com infecção."
            },
            {
                id: "radial_tunnel",
                nome: "Síndrome do Túnel Radial / PIN — diferencial",
                testes: [
                    "Dor mais distal/anterior que a origem extensora",
                    "Supinação resistida ou extensão do dedo médio reproduz dor profunda",
                    "Déficit motor de extensores sem alteração sensitiva sugere PIN"
                ],
                interpretacao: "Considere compressão radial quando a distribuição e os achados não se encaixam em tendinopatia lateral."
            }
        ],
        redFlags: [
            "Trauma com deformidade, perda importante de ADM, dor óssea focal intensa ou comprometimento neurovascular",
            "Cotovelo quente/vermelho com febre, ferida ou edema importante — considerar infecção/bursite séptica",
            "Déficit motor progressivo ou perda sensitiva persistente em território ulnar/radial/mediano",
            "Dor e edema importantes após trauma com suspeita de síndrome compartimental no antebraço",
            "Dor não mecânica progressiva, massa, história de câncer ou sintomas sistêmicos inexplicados"
        ,
            "Trauma ou pós-operatório com déficit neurovascular progressivo, deformidade, sinais de infecção ou perda súbita de função — encaminhar"
        ]
    },

    punho_mao: {
        nome: "Punho e Mão",
        palavrasChave: ["punho", "mao", "dedo", "polegar", "carpo", "escafoide", "formigamento"],
        clusters: [
            {
                id: "tunel_carpo",
                nome: "Síndrome do Túnel do Carpo — padrão clínico",
                testes: [
                    "Parestesia/dormência predominante em polegar, indicador e médio, especialmente noturna",
                    "Carpal Compression / Durkan reproduz sintomas",
                    "Phalen reproduz sintomas em contexto concordante",
                    "Alteração sensitiva e/ou fraqueza/atrofia tenar em casos mais avançados"
                ],
                limiar: 2,
                interpretacao: "A suspeita de túnel do carpo deve combinar distribuição de sintomas, história e exame. Phalen/Tinel isolados não confirmam nem excluem; escores clínicos como CTS-6 podem aumentar padronização quando implementados.",
                palavrasChaveHMA: ["formigamento na mao a noite", "dormencia polegar indicador medio", "mao adormece dirigindo", "tunel do carpo"],
                mecanismoPreferido: ["insidioso", "esforco_repetitivo"],
                tipoDorPreferido: ["neuropatica"],
                comorbidadesRisco: ["diabetico"],
                pesos: { palavraChave: 2.5, mecanismo: 0.5, tipoDor: 2, fatorPiora: 0.3, esporte: 0.05, ocupacao: 0.15, comorbidade: 0.5, medicamento: 0, idade: 0.3, cirurgia: 0.2 }
            },
            {
                id: "dequervain",
                nome: "Tenossinovite de De Quervain",
                testes: [
                    "Dor sobre o 1º compartimento dorsal / estiloide radial",
                    "Finkelstein reproduz dor típica",
                    "WHAT test / abdução do polegar resistida reproduz sintomas"
                ],
                limiar: 2,
                interpretacao: "Dor radial focal e provocação dos tendões APL/EPB sustentam De Quervain. O teste de Eichhoff pode ser mais irritativo e gerar falsos positivos; preferir interpretação clínica conjunta.",
                palavrasChaveHMA: ["dor no polegar", "dor do lado do radio", "de quervain", "dor pegando bebe"],
                mecanismoPreferido: ["esforco_repetitivo", "insidioso"],
                tipoDorPreferido: ["mecanica"],
                pesos: { palavraChave: 2, mecanismo: 0.7, tipoDor: 1, fatorPiora: 0.3, esporte: 0, ocupacao: 0.1, comorbidade: 0, medicamento: 0, idade: 0, cirurgia: 0.2 }
            }
        ,
            {
                id: "fratura_radio_distal_reabilitacao",
                nome: "Fratura distal do rádio — conservador ou pós-operatório",
                testes: [
                    "Tipo de fratura e tratamento confirmados",
                    "Estado de consolidação e restrições de carga documentados",
                    "ADM de punho/antebraço, edema, força de preensão e função monitorados",
                    "Sem sinais de síndrome compartimental, infecção, neuropatia mediana progressiva ou CRPS desproporcional"
                ],
                limiar: 2,
                interpretacao: "A avaliação deve acompanhar dor, edema, mobilidade, força e função, respeitando estabilidade e fase de consolidação. Intervenções e intensidade devem ser individualizadas; a CPG de 2024 fornece recomendações específicas para avaliação e reabilitação após fratura distal do rádio.",
                palavrasChaveHMA: ["fratura radio distal", "fratura punho", "placa no punho", "colles", "cirurgia punho fratura"],
                mecanismoPreferido: ["trauma_agudo", "pos_cirurgico"],
                pesos: { palavraChave: 2.6, mecanismo: 2.5, tipoDor: 0, fatorPiora: 0, esporte: 0, ocupacao: 0, comorbidade: 0.3, medicamento: 0.2, idade: 0.4, cirurgia: 2.5 },
                evidencia: "JOSPT Clinical Practice Guideline: Distal Radius Fracture Rehabilitation, 2024."
            },
            {
                id: "pos_operatorio_tendao_mao",
                nome: "Pós-reparo de tendão flexor/extensor da mão",
                testes: [
                    "Tendão/dedo e zona da lesão registrados",
                    "Técnica de reparo e protocolo de proteção identificados",
                    "Deslizamento tendíneo, edema, ADM e integridade do reparo acompanhados",
                    "Sem sinais de ruptura, infecção ou déficit neurovascular novo"
                ],
                limiar: 2,
                interpretacao: "Reparo de tendão da mão exige protocolo específico por tendão, zona, técnica cirúrgica e resistência do reparo. Não automatizar alongamento, fortalecimento ou amplitude sem essas informações; progressões inadequadas podem aumentar risco de aderência ou ruptura.",
                palavrasChaveHMA: ["sutura tendao mao", "tendao flexor cortado", "tendao extensor cortado", "cirurgia tendao dedo"],
                mecanismoPreferido: ["pos_cirurgico", "trauma_agudo"],
                pesos: { palavraChave: 2.5, mecanismo: 2.7, tipoDor: 0, fatorPiora: 0, esporte: 0, ocupacao: 0.1, comorbidade: 0.2, medicamento: 0, idade: 0, cirurgia: 2.5 }
            }
        ],
        diferenciais: [
            {
                id: "tfcc",
                nome: "Lesão do Complexo da Fibrocartilagem Triangular (TFCC)",
                testes: [
                    "Dor ulnar do punho com carga/rotação",
                    "Fovea Sign doloroso",
                    "Ulnar grind / press test reproduz dor em contexto compatível"
                ],
                interpretacao: "A suspeita de TFCC depende de localização ulnar, mecanismo e provocação por carga/rotação. Trauma com instabilidade da DRUJ merece avaliação especializada."
            },
            {
                id: "instabilidade_escafolunar",
                nome: "Lesão / Instabilidade Escafolunar",
                testes: [
                    "Dor dorsal-radial após queda/trauma",
                    "Watson / Scaphoid Shift reproduz dor/clunk concordante",
                    "Sinais de instabilidade persistente"
                ],
                interpretacao: "Lesão escafolunar relevante pode evoluir para instabilidade crônica. Trauma importante com dor persistente requer imagem/especialista."
            },
            {
                id: "rizartrose",
                nome: "Osteoartrite CMC do Polegar / Rizartrose",
                testes: [
                    "Dor na base do polegar relacionada a pinça/preensão",
                    "Grind test reproduz dor/crepitação em contexto compatível",
                    "Redução funcional de pinça / deformidade em casos avançados"
                ],
                interpretacao: "Dor típica de base do polegar e limitação funcional sustentam OA CMC; Grind positivo isolado não determina gravidade."
            },
            {
                id: "radiculopatia_neuropatia_proximal",
                nome: "Origem Cervical / Neuropatia Proximal — diferencial",
                testes: [
                    "Distribuição não restrita ao nervo mediano/ulnar local",
                    "Sintomas modulados pela coluna cervical",
                    "Exame neurológico proximal alterado"
                ],
                interpretacao: "Quando o padrão sensitivo/motor não se encaixa em uma compressão local, investigue cervical e outros locais de compressão neural."
            }
        ],
        redFlags: [
            "Trauma com dor na tabaqueira anatômica / suspeita de fratura de escafoide — considerar imobilização e imagem mesmo com radiografia inicial negativa conforme quadro",
            "Deformidade, ferida aberta, amputação parcial ou comprometimento vascular/sensitivo após trauma",
            "Dor intensa progressiva, edema tenso, parestesia ou dor ao alongamento passivo — considerar síndrome compartimental",
            "Mão quente/vermelha, ferida/inoculação, febre ou suspeita de infecção de bainha flexora/articulação",
            "Déficit motor progressivo, atrofia rápida ou perda sensitiva persistente",
            "Fenômeno vascular agudo: palidez/cianose persistente, frio ou perda de pulso/perfusão"
        ,
            "Dor desproporcional persistente com edema, alteração autonômica/sudomotora e perda funcional progressiva — considerar CRPS no contexto apropriado",
            "Pós-reparo de tendão com perda súbita do movimento ativo previamente presente — suspeitar falha do reparo"
        ]
    },

    coluna_toracica: {
        nome: "Coluna Torácica / Costelas",
        palavrasChave: ["toracica", "dorsal", "costela", "interescapular", "meio das costas", "torax"],
        clusters: [
            {
                id: "dor_toracica_musculoesqueletica",
                nome: "Dor Torácica Musculoesquelética / Mecânica",
                testes: [
                    "Dor familiar reproduzida de forma consistente por movimento/carga torácica",
                    "Palpação/mobilização local reproduz a queixa em conjunto com o restante do exame",
                    "Ausência de sinais sistêmicos, neurológicos e viscerais preocupantes"
                ],
                limiar: 2,
                interpretacao: "Dor torácica pode ser classificada como musculoesquelética quando existe reprodução mecânica concordante e a triagem de causas sérias é tranquilizadora. Hipomobilidade palpada isoladamente não prova uma 'disfunção vertebral'.",
                palavrasChaveHMA: ["dor no meio das costas", "dor entre as escapulas", "dor toracica ao mexer", "dor na costela ao movimento"],
                mecanismoPreferido: ["insidioso", "esforco_repetitivo", "trauma_agudo"],
                tipoDorPreferido: ["mecanica"],
                fatoresPioraRisco: ["movimento", "posicao_sentada"],
                pesos: { palavraChave: 1.5, mecanismo: 0.4, tipoDor: 1.2, fatorPiora: 0.4, esporte: 0.05, ocupacao: 0.05, comorbidade: 0, medicamento: 0, idade: 0, cirurgia: 0.3 }
            },
            {
                id: "lesao_costal_traumatica",
                nome: "Lesão Costal / Fratura de Costela — suspeita",
                testes: [
                    "Trauma direto ou compressão torácica recente",
                    "Dor focal costal intensa à palpação/respiração/tosse",
                    "Dispneia ou sinais respiratórios associados exigem maior cautela"
                ],
                limiar: 2,
                interpretacao: "Dor costal focal após trauma pode representar contusão ou fratura. A presença de dispneia, hipóxia, dor pleurítica intensa ou trauma relevante requer avaliação médica para complicações torácicas.",
                palavrasChaveHMA: ["pancada na costela", "caiu e bateu costela", "dor para respirar", "costela quebrada"],
                mecanismoPreferido: ["trauma_agudo"],
                pesos: { palavraChave: 2.5, mecanismo: 2.5, tipoDor: 0.5, fatorPiora: 0.5, esporte: 0, ocupacao: 0, comorbidade: 0, medicamento: 0, idade: 0.5, cirurgia: 0 }
            }
        ,
            {
                id: "fratura_toracica_compressao",
                nome: "Suspeita / pós-fratura vertebral torácica por compressão",
                testes: [
                    "Trauma ou fragilidade óssea relevante",
                    "Dor focal torácica nova e intensa",
                    "História de osteoporose, câncer ou uso prolongado de corticoide",
                    "Estado neurológico e respiratório sem deterioração"
                ],
                limiar: 2,
                interpretacao: "Dor torácica focal após trauma ou em pessoa com fragilidade óssea deve elevar a suspeita de fratura vertebral. Em pós-fratura, carga e exercício dependem de estabilidade, sintomas, consolidação e orientação médica; sinais neurológicos ou sistêmicos exigem reavaliação.",
                palavrasChaveHMA: ["fratura toracica", "vertebra toracica quebrada", "compressao toracica", "fratura coluna dorsal"],
                mecanismoPreferido: ["trauma_agudo", "pos_cirurgico"],
                medicamentosRisco: ["corticoide"],
                idadeFaixaBonus: { min: 65, max: 100, bonus: 1 },
                pesos: { palavraChave: 2.5, mecanismo: 2.3, tipoDor: 0.3, fatorPiora: 0, esporte: 0, ocupacao: 0, comorbidade: 1, medicamento: 1.5, idade: 1, cirurgia: 1 }
            },
            {
                id: "fratura_costela_reabilitacao",
                nome: "Fratura de costela / trauma torácico musculoesquelético",
                testes: [
                    "Trauma torácico compatível e dor focal à palpação/respiração",
                    "Dor com tosse, inspiração profunda ou movimento do tronco",
                    "Saturação, dispneia e sinais respiratórios monitorados quando aplicável",
                    "Sem sinais de pneumotórax, hemotórax ou deterioração respiratória"
                ],
                limiar: 2,
                interpretacao: "Fratura de costela pode ser tratada conservadoramente em muitos casos, mas a prioridade é reconhecer complicações respiratórias e dor que limita ventilação. Dispneia progressiva, dessaturação, trauma de alta energia ou piora sistêmica requerem avaliação médica imediata.",
                palavrasChaveHMA: ["fratura costela", "costela quebrada", "pancada nas costelas", "dor para respirar depois de queda"],
                mecanismoPreferido: ["trauma_agudo"],
                pesos: { palavraChave: 2.3, mecanismo: 2.2, tipoDor: 0.8, fatorPiora: 0.4, esporte: 0, ocupacao: 0, comorbidade: 0.3, medicamento: 0, idade: 0.2, cirurgia: 0 }
            },
            {
                id: "lesao_intercostal",
                nome: "Lesão muscular intercostal / parede torácica",
                testes: [
                    "Dor focal após rotação, tosse intensa ou esforço",
                    "Dor reproduzida por contração/alongamento do tronco ou inspiração profunda",
                    "Sensibilidade musculoesquelética localizada",
                    "Ausência de sinais cardiorrespiratórios de alarme"
                ],
                limiar: 2,
                interpretacao: "Padrão musculoesquelético da parede torácica é plausível quando a dor é claramente reprodutível por movimento/carga e não há sinais sistêmicos ou cardiorrespiratórios. O diagnóstico por exclusão é particularmente importante na região torácica.",
                palavrasChaveHMA: ["puxou intercostal", "dor muscular entre costelas", "estiramento toracico", "dor ao girar e respirar"],
                mecanismoPreferido: ["trauma_agudo", "esforco_repetitivo"],
                tipoDorPreferido: ["mecanica"],
                pesos: { palavraChave: 1.8, mecanismo: 1.5, tipoDor: 1, fatorPiora: 0.4, esporte: 0.1, ocupacao: 0.1, comorbidade: 0, medicamento: 0, idade: 0, cirurgia: 0 }
            }
        ],
        diferenciais: [
            {
                id: "dor_visceral_toracica",
                nome: "Origem Visceral / Cardiopulmonar / Gastrointestinal",
                testes: [
                    "Dor não reproduzida de forma convincente pelo exame musculoesquelético",
                    "Relação com esforço cardiovascular, alimentação, respiração ou sintomas sistêmicos",
                    "Sinais vitais/sintomas associados levantam suspeita não musculoesquelética"
                ],
                interpretacao: "Dor torácica/interescapular não mecânica deve manter baixo limiar para investigação de causas cardiopulmonares, vasculares ou viscerais conforme perfil clínico."
            },
            {
                id: "radiculopatia_toracica",
                nome: "Radiculopatia Torácica / Herpes Zoster — diferencial",
                testes: [
                    "Dor em faixa dermatomérica ao redor do tórax",
                    "Alodinia/hipersensibilidade cutânea segmentar",
                    "Rash vesicular presente ou surgindo posteriormente (herpes zoster)"
                ],
                interpretacao: "Padrão em faixa com alterações sensitivas pode sugerir radiculopatia ou herpes zoster. Investigue causas espinais e não espinais conforme contexto."
            },
            {
                id: "fratura_compressao_toracica_diferencial",
                nome: "Fratura Vertebral por Compressão — hipótese de segurança",
                testes: [
                    "Idade avançada/osteoporose/uso prolongado de corticoide",
                    "Dor torácica aguda focal após trauma menor ou espontânea",
                    "Dor à percussão/carga axial em contexto compatível"
                ],
                interpretacao: "A combinação de risco ósseo e dor focal aguda deve levar à consideração de fratura por compressão e avaliação por imagem."
            }
        ],
        redFlags: [
            "Dor torácica súbita/intensa com dispneia, sudorese, síncope, dor no peito ou irradiação — considerar emergência cardiopulmonar/vascular",
            "Dor interescapular abrupta e intensa com sintomas vasculares/neurológicos — considerar síndrome aórtica aguda",
            "Trauma torácico com dificuldade respiratória, hipóxia, assimetria ventilatória ou dor pleurítica importante",
            "História de câncer, perda de peso, dor progressiva não mecânica ou dor torácica persistente inexplicada",
            "Febre, imunossupressão, infecção recente ou dor espinal progressiva — considerar infecção",
            "Osteoporose, idade avançada ou uso prolongado de corticoide com dor torácica focal aguda — considerar fratura vertebral",
            "Sinais neurológicos de medula torácica: alteração de marcha, hiperreflexia, nível sensitivo, fraqueza bilateral ou disfunção esfincteriana"
        ,
            "Trauma torácico com dispneia, dessaturação, cianose, dor respiratória progressiva ou instabilidade clínica — considerar complicação intratorácica e encaminhar imediatamente"
        ]
    }
};
