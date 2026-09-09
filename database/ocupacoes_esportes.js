/* ==========================================================================
   KINESYS - DICIONÁRIO DE OCUPAÇÕES E ESPORTES (DATABASE COMPLETO)
   Arquivo: database/ocupacoes_esportes.js - PARTE 1 DE 5
   ========================================================================== */

const dicionarioOcupacoesEsportes = {
    // --- PROFISSÕES: ESCRITÓRIO, TECNOLOGIA E CORPORATIVO ---
    "escritorio": {
        exibicao: "Trabalho Administrativo / Escritório Geral",
        tipo: "profissao",
        nivelRisco: "medio",
        vetoresCarga: [
            "posicao_sentada_prolongada_ininterrupta",
            "flexao_cervical_sustentada_monitor",
            "protracao_cintura_escapular",
            "inatividade_glutea_continua"
        ],
        regioesAcometidas: ["coluna_cervical", "coluna_lombar", "cintura_escapular", "quadril_anterior", "punho_mao"],
        riscosClinicos: [
            "sindrome_do_computador",
            "sindrome_cruzada_superior",
            "amnesia_glutea_inibicao",
            "encurtamento_ilio_psoas",
            "tensao_trapezio_superior_elevador",
            "ler_dort_incipiente"
        ]
    },
    "programador": {
        exibicao: "Programador / Desenvolvedor de Software / TI",
        tipo: "profissao",
        nivelRisco: "medio",
        vetoresCarga: [
            "sedestacao_continua_elevada",
            "microtraumas_repetitivos_digitacao_intensiva",
            "anteversao_cefalica_sustentada",
            "ausencia_de_pausas_ergonomicas"
        ],
        regioesAcometidas: ["punho", "mao", "antebraço", "coluna_cervical", "coluna_toracica", "coluna_lombar"],
        riscosClinicos: [
            "sindrome_do_tunel_do_carpo",
            "epicondilite_lateral",
            "tenossinovite_de_de_quervain",
            "cervicobraquialgia_compressiva",
            "hipercifose_toracica_postural"
        ]
    },
    "designer": {
        exibicao: "Designer Gráfico / Ilustrador / Editor de Vídeo",
        tipo: "profissao",
        nivelRisco: "medio",
        vetoresCarga: [
            "desvio_ulnar_sustentado_mouse_mesa_digitalizadora",
            "elevacao_assimetrica_ombro_dominante",
            "sedestacao_focada_longos_periodos"
        ],
        regioesAcometidas: ["punho_dominante", "ombro_dominante", "coluna_cervical", "regiao_interescapular"],
        riscosClinicos: [
            "sindrome_do_canal_de_guyon",
            "tendinopatia_extensores_punho",
            "sindrome_miofascial_cervicoescapular",
            "parestesia_membro_superior"
        ]
    },
    "advogado": {
        exibicao: "Advogado / Jurídico / Promotor",
        tipo: "profissao",
        nivelRisco: "medio",
        vetoresCarga: [
            "sedestacao_continua",
            "estresse_psicofisiologico_com_hipertonia_muscular",
            "flexao_cervical_leitura_documental"
        ],
        regioesAcometidas: ["coluna_cervical", "coluna_lombar", "articulacao_temporomandibular_atm"],
        riscosClinicos: [
            "cervicalgia_tensional",
            "dtm_bruxismo_por_estresse",
            "hipomobilidade_lombossacra",
            "cefalea_cervicogenica"
        ]
    },
    "contador": {
        exibicao: "Contador / Auditor / Analista Financeiro",
        tipo: "profissao",
        nivelRisco: "medio",
        vetoresCarga: [
            "sedestacao_prolongada_picos_estresse",
            "digitacao_intensiva_teclado_numerico"
        ],
        regioesAcometidas: ["punho_direito", "coluna_lombar", "coluna_cervical"],
        riscosClinicos: [
            "tenossinovite_extensores",
            "lombalgia_postural_estatica",
            "hipercifose_com_rigidez_toracica"
        ]
    },

    // --- PROFISSÕES: SAÚDE, TERAPIA E CUIDADOS CLINICOS ---
    "fisioterapeuta": {
        exibicao: "Fisioterapeuta / Osteopata / Terapeuta Manual",
        tipo: "profissao",
        nivelRisco: "critico",
        vetoresCarga: [
            "descarga_peso_membros_superiores_terapia_manual",
            "flexao_tronco_repetitiva_com_carga_paciente",
            "pressao_palmar_digital_sustentada",
            "posturas_assimetricas_ao_lado_da_maca"
        ],
        regioesAcometidas: ["coluna_lombar", "polegar_articulacao_tmc", "cintura_escapular", "punhos", "joelhos"],
        riscosClinicos: [
            "rizartrose_ocupacional_trapezio_metacarpiana",
            "hernia_discal_lombar_mecanica",
            "sindrome_do_impacto_glenoumeral",
            "tenossinovite_flexores_dos_dedos",
            "sobrecarga_paravertebral_lombar"
        ]
    },
    "dentista": {
        exibicao: "Cirurgião-Dentista / Ortodontista / Endodontista",
        tipo: "profissao",
        nivelRisco: "critico",
        vetoresCarga: [
            "rotacao_flexao_assimetrica_cervical_sustentada",
            "isometria_sustentada_membros_superiores",
            "preensao_fina_repetitiva_instrumentos"
        ],
        regioesAcometidas: ["coluna_cervical", "coluna_toracica_alta", "ombro_dominante", "mao_punho"],
        riscosClinicos: [
            "sindrome_do_desfiladeiro_toracico",
            "radiculopatia_cervical_focal",
            "dor_miofascial_trapezio_elevador_escapula",
            "escoliose_funcional_compensatoria",
            "epicondilite_medial"
        ]
    },
    "medico_cirurgiao": {
        exibicao: "Médico Cirurgião / Instrumentador Cirúrgico",
        tipo: "profissao",
        nivelRisco: "critico",
        vetoresCarga: [
            "ortostatismo_estatico_prolongado_em_campo",
            "flexao_cervical_forçada_foco_cirurgico",
            "isometria_bracos_suspensos_sem_apoio"
        ],
        regioesAcometidas: ["coluna_cervical", "coluna_lombar", "ombros", "membros_inferiores"],
        riscosClinicos: [
            "hernia_discal_cervical_postural",
            "lombalgia_estatica_por_exaustao",
            "insuficiencia_venosa_mmii",
            "fascite_plantar_ortostatica"
        ]
    },
    "enfermeiro": {
        exibicao: "Enfermeiro / Técnico de Enfermagem / Cuidador",
        tipo: "profissao",
        nivelRisco: "critico",
        vetoresCarga: [
            "transferencia_e_movimentacao_de_pacientes_leito",
            "flexao_tronco_forçada_sem_vantagem_mecanica",
            "ortostatismo_dinamico_prolongado"
        ],
        regioesAcometidas: ["coluna_lombossacra", "joelhos", "ombros", "tornozelo_pe"],
        riscosClinicos: [
            "hernia_discal_lombar_aguda",
            "estiramento_paravertebral_agudo",
            "artrose_patelofemoral",
            "tenossinovite_ombro"
        ]
    },
// --- PROFISSÕES: CONSTRUÇÃO CIVIL, MANUTENÇÃO E TRABALHO BRAÇAL ---
    "pedreiro": {
        exibicao: "Pedreiro / Servente / Construção Civil",
        tipo: "profissao",
        nivelRisco: "critico",
        vetoresCarga: [
            "levantamento_carga_pesada_solo",
            "flexo_rotacao_tronco_com_sobrecarga",
            "postura_agachada_prolongada",
            "vibracao_ferramentas_impacto"
        ],
        regioesAcometidas: ["coluna_lombossacra", "joelhos", "ombros", "punhos_maos", "quadril"],
        riscosClinicos: [
            "hernia_discal_aguda_extusa",
            "osteoartrose_femorotibial_patelar",
            "sindrome_do_impacto_ombro",
            "espondilolistese_traumatica",
            "tendinopatia_patelar"
        ]
    },
    "pintor": {
        exibicao: "Pintor / Marceneiro / Carpinteiro",
        tipo: "profissao",
        nivelRisco: "medio",
        vetoresCarga: [
            "movimentacao_repetitiva_membros_superiores_acima_cabeca",
            "extensao_cervical_forçada_sustentada",
            "preensao_fina_ferramentas"
        ],
        regioesAcometidas: ["ombros", "coluna_cervical", "cotovelos", "cintura_escapular"],
        riscosClinicos: [
            "tendinopatia_manguito_rotador",
            "epicondilite_lateral",
            "cervicalgia_posicional_compressiva",
            "sindrome_desfiladeiro_toracico"
        ]
    },
    "mecanico": {
        exibicao: "Mecânico / Montador Industrial / Funileiro",
        tipo: "profissao",
        nivelRisco: "critico",
        vetoresCarga: [
            "hiperextensao_cervical_em_trabalho_subterraneo_veicular",
            "torcao_tronco_em_espacos_reduzidos",
            "torque_manual_elevado_ferramentas"
        ],
        regioesAcometidas: ["coluna_cervical", "coluna_lombar", "cotovelos", "punhos", "ombros"],
        riscosClinicos: [
            "hernia_discal_cervical",
            "epicondilite_medial_lateral",
            "sindrome_do_tunel_do_carpo",
            "lombalgia_aguda_incapacitante"
        ]
    },
    "carregador": {
        exibicao: "Carregador / Estoquista / Carga e Descarga / Ajudante",
        tipo: "profissao",
        nivelRisco: "critico",
        vetoresCarga: [
            "levantamento_repetitivo_pesos_acima_capacidade",
            "cisalhamento_discal_por_rotacao_com_carga",
            "impacto_articular_calcaneo"
        ],
        regioesAcometidas: ["coluna_lombar", "coluna_toracica", "joelhos", "ombros", "tornozelos"],
        riscosClinicos: [
            "hernia_discal_lumbar_múltipla",
            "sindrome_impacto_manguito",
            "meniscopatia_de_sobrecarga",
            "fascite_plantar_de_impacto"
        ]
    },

    // --- PROFISSÕES: TRANSPORTE E TRÂNSITO ---
    "motorista": {
        exibicao: "Motorista Profissional / Caminhoneiro / Uber / Taxista",
        tipo: "profissao",
        nivelRisco: "critico",
        vetoresCarga: [
            "vibracao_corpo_inteiro_sedestacao",
            "microtraumas_axiais_repetitivos_piso",
            "inatividade_glutea_pressao_isquiatica",
            "manutencao_postura_estatica_longa_duracao"
        ],
        regioesAcometidas: ["coluna_lombossacra", "quadril", "articulacao_sacroiliaca", "joelho_direito_pedal"],
        riscosClinicos: [
            "degeneracao_discal_acelerada",
            "sindrome_do_piriforme_compressiva",
            "sacroileite_mecanica",
            "sindrome_patelofemoral_pedal",
            "estase_venosa_mmii"
        ]
    },
    "motoboy": {
        exibicao: "Motoboy / Entregador de Motocicleta / Piloto",
        tipo: "profissao",
        nivelRisco: "critico",
        vetoresCarga: [
            "vibracao_direta_guidao_impacto_axial",
            "postura_fletida_com_mochila_bag_pesada",
            "estresse_isometrico_cervicoescapular",
            "exposicao_ao_frio_e_intemperies"
        ],
        regioesAcometidas: ["coluna_lombar", "coluna_cervical", "punhos_maos", "ombros", "cintura_escapular"],
        riscosClinicos: [
            "espondiloartrose_precoce",
            "tenossinovite_de_de_quervain",
            "hernia_discal_toracolombar_bag",
            "sindrome_do_tunel_carpico_vibracional",
            "cervicobraquialgia"
        ]
    },

    // --- PROFISSÕES: ESTÉTICA, BELEZA E CUIDADOS PESSOAIS ---
    "cabeleireiro": {
        exibicao: "Cabeleireiro / Barbeiro / Esteticista Capilar",
        tipo: "profissao",
        nivelRisco: "medio",
        vetoresCarga: [
            "elevacao_membros_superiores_sem_apoio_ombros",
            "ortostatismo_prolongado_estatico",
            "preensao_repetitiva_tesoura_secador"
        ],
        regioesAcometidas: ["ombros", "coluna_cervical", "punhos", "membros_inferiores", "tornozelos"],
        riscosClinicos: [
            "sindrome_do_impacto_glenoumeral",
            "tendinopatia_do_supraespinal",
            "insuficiencia_venosa_cronica",
            "fascite_plantar",
            "tenossinovite_extensores_polegar"
        ]
    },
    "massoterapeuta": {
        exibicao: "Massoterapeuta / Esteticista Corporal / Podólogo",
        tipo: "profissao",
        nivelRisco: "medio",
        vetoresCarga: [
            "pressao_palmar_e_digital_repetitiva",
            "flexao_cervical_e_tronco_sobre_maca",
            "postura_em_pe_ou_sentado_assimetrico"
        ],
        regioesAcometidas: ["polegares_tmc", "punhos", "coluna_cervical", "coluna_lombar"],
        riscosClinicos: [
            "rizartrose_ocupacional",
            "tenossinovite_flexores_punho",
            "lombalgia_postural",
            "dor_miofascial_cervicotoracica"
        ]
    },

    // --- PROFISSÕES: COMÉRCIO, VENDAS E ATENDIMENTO ---
    "professor": {
        exibicao: "Professor / Educador / Atendente de Sala",
        tipo: "profissao",
        nivelRisco: "medio",
        vetoresCarga: [
            "ortostatismo_prolongado",
            "elevacao_repetitiva_membro_superior_lousa",
            "estresse_vocal_e_postural_combinado"
        ],
        regioesAcometidas: ["coluna_lombar", "ombro_dominante", "membros_inferiores", "pes_tornozelos"],
        riscosClinicos: [
            "fascite_plantar",
            "tendinopatia_bicipital_supraespinal",
            "insuficiencia_venosa_mmii",
            "fadiga_muscular_paravertebral"
        ]
    },
    "vendedor": {
        exibicao: "Vendedor / Caixa / Atendente de Balcão / Garçom",
        tipo: "profissao",
        nivelRisco: "medio",
        vetoresCarga: [
            "ortostatismo_prolongado_em_superficies_duras",
            "transporte_de_bandejas_cargas_assimetricas",
            "movimentos_repetitivos_de_caixa_e_bipagem"
        ],
        regioesAcometidas: ["membros_inferiores", "coluna_lombossacra", "ombro_e_punho_garcom_caixa"],
        riscosClinicos: [
            "varizes_insuficiencia_venosa",
            "fascite_plantar",
            "lombalgia_estatica",
            "epicondilite_medial_lateral"
        ]
    },
// --- ESPORTES: BAIXO RISCO E IMPACTO CONTROLADO ---
    "caminhada": {
        exibicao: "Caminhada Recreativa / Aeróbico de Baixo Impacto",
        tipo: "esporte",
        nivelRisco: "leve",
        vetoresCarga: [
            "impacto_vertical_baixo_repetitivo",
            "trabalho_cardiovascular_moderado",
            "ausencia_de_forcas_de_cisalhamento_agudas"
        ],
        regioesAcometidas: ["tornozelo_pe", "joelho", "coluna_lombar"],
        riscosClinicos: [
            "fadiga_muscular_leve_mmii",
            "desconforto_plantar_eventual",
            "agravamento_minimo_de_quadros_de_artrose"
        ]
    },
    "pilates": {
        exibicao: "Pilates Solo / Aparelhos",
        tipo: "esporte",
        nivelRisco: "leve",
        vetoresCarga: [
            "fortalecimento_isometrico_e_isotonico_controlado",
            "mobilidade_articular_guiada",
            "ativacao_profunda_do_core"
        ],
        regioesAcometidas: ["coluna_vertebral", "core_abdominal", "quadril"],
        riscosClinicos: [
            "dor_muscular_tardia_em_iniciantes",
            "sobrecarga_em_flexao_de_tronco_se_hernia_discal_aguda",
            "estresse_em_punhos_em_posturas_de_quatro_apoios"
        ]
    },
    "yoga": {
        exibicao: "Yoga / Hatha / Vinyasa",
        tipo: "esporte",
        nivelRisco: "leve",
        vetoresCarga: [
            "alongamento_estatico_e_dinamico_extremo",
            "isometria_em_amplitudes_maximas",
            "descarga_de_peso_em_membros_superiores"
        ],
        regioesAcometidas: ["coluna_vertebral", "ombros", "punhos", "quadril"],
        riscosClinicos: [
            "estiramento_ligamentar_por_hipermobilidade",
            "sindrome_do_impacto_em_posturas_de_inversao",
            "parestesia_transitoria_por_estresse_neural"
        ]
    },

    // --- ESPORTES: MÉDIO RISCO, ENDURANCE E GESTO REPETITIVO ---
    "corrida": {
        exibicao: "Corrida de Rua / Maratona / Trail Run",
        tipo: "esporte",
        nivelRisco: "medio",
        vetoresCarga: [
            "impacto_vertical_repetitivo_2_a_3x_peso_corporal",
            "ciclos_sucessivos_de_carga_e_desaceleracao",
            "forca_de_reacao_do_solo_continua"
        ],
        regioesAcometidas: ["joelho", "tornozelo_pe", "tibia", "quadril", "tendao_de_aquiles"],
        riscosClinicos: [
            "sindrome_do_estresse_tibial_medial_canelite",
            "fascite_plantar_de_repeticao",
            "tendinopatia_aquileana",
            "sindrome_do_trato_iliotibial",
            "sindrome_patelofemoral"
        ]
    },
    "ciclismo": {
        exibicao: "Ciclismo de Estrada / Mountain Bike (MTB) / Gravel",
        tipo: "esporte",
        nivelRisco: "medio",
        vetoresCarga: [
            "flexao_de_tronco_sustentada_no_selim",
            "extensao_cervical_forcada_para_visao_de_campo",
            "vibracao_de_terreno_em_mtb",
            "pressao_isquiatica_e_perineal_continua"
        ],
        regioesAcometidas: ["coluna_cervical", "coluna_lombar", "joelho", "punhos", "regiao_perineal"],
        riscosClinicos: [
            "cervicalgia_posicional_com_hipertonia_de_trapezio",
            "sindrome_patelofemoral_por_ajuste_de_bike_fit",
            "sindrome_do_canal_de_guyon_e_tunel_do_carpo",
            "parestesia_do_nervo_pudendo",
            "lombalgia_por_extensao_glutea_incompleta"
        ]
    },
    "beach tennis": {
        exibicao: "Beach Tennis / Tênis de Arena / Padel",
        tipo: "esporte",
        nivelRisco: "medio",
        vetoresCarga: [
            "gesto_de_arremesso_e_smash_acima_da_cabeca",
            "deslocamento_e_desaceleracao_em_terreno_instavel_areia",
            "pronossupinacao_rapida_de_antebraco"
        ],
        regioesAcometidas: ["ombro_dominante", "cotovelo_dominante", "tornozelos", "joelhos"],
        riscosClinicos: [
            "epicondilite_lateral_beach_tennis_elbow",
            "tendinopatia_do_manguito_rotador",
            "entorse_de_tornozelo_por_instabilidade_de_areia",
            "tendinopatia_patelar"
        ]
    },
    "natacao": {
        exibicao: "Natação (Crawl / Costas / Peito / Borboleta)",
        tipo: "esporte",
        nivelRisco: "medio",
        vetoresCarga: [
            "rotacao_glenoumeral_repetitiva_em_alta_amplitude",
            "hiperlordose_lombar_dinamica_estilo_peito_borboleta",
            "hiperextensao_cervical_para_respiracao"
        ],
        regioesAcometidas: ["ombros", "coluna_lombar", "coluna_cervical", "joelho_estilo_peito"],
        riscosClinicos: [
            "sindrome_do_ombro_do_nadador_impacto",
            "bursite_subacromial",
            "lombalgia_mecanica_por_chute_de_borboleta",
            "estresse_medial_no_joelho_estilo_peito"
        ]
    },

    // --- ESPORTES: ALTO RISCO, COMPRESSÃO AXIAL E IMPACTO ELEVADO ---
    "crossfit": {
        exibicao: "CrossFit / Treinamento Funcional de Alta Intensidade",
        tipo: "esporte",
        nivelRisco: "critico",
        vetoresCarga: [
            "alta_compressao_axial_em_velocidade",
            "movimentos_olimpicos_lpo_sob_fadiga",
            "forca_de_cisalhamento_em_ombros_e_coluna",
            "manobra_de_valsalva_repetitiva"
        ],
        regioesAcometidas: ["coluna_lombar", "ombros", "joelhos", "punhos", "articulacao_sacroiliaca"],
        riscosClinicos: [
            "hernia_discal_aguda_por_perda_de_controle_motor",
            "lesao_labral_glenoidal_slap",
            "tendinopatia_patelar_e_quadricipital",
            "sindrome_do_impacto_acromioclavicular",
            "rhabdomyolise_em_casos_extremos"
        ]
    },
    "musculacao heavy": {
        exibicao: "Musculação Pesada / Powerlifting / LPO",
        tipo: "esporte",
        nivelRisco: "critico",
        vetoresCarga: [
            "carga_compressiva_axial_extrema_agachamento_terra",
            "pressao_intraabdominal_elevada",
            "estresse_tensil_maximo_em_insercoes_tendineas"
        ],
        regioesAcometidas: ["coluna_lombossacra", "joelhos", "cotovelos", "ombros"],
        riscosClinicos: [
            "sobrecarga_articular_facetaria_lombar",
            "rotura_ou_avulsao_tendinea_bicipital_quadricipital",
            "espondilolistese_por_estresse",
            "hernia_discal_extusa"
        ]
    },
// --- ESPORTES: COLETIVOS, CONTATO E MOVIMENTO DE PIVÔ ---
    "futebol": {
        exibicao: "Futebol de Campo / Society",
        tipo: "esporte",
        nivelRisco: "critico",
        vetoresCarga: [
            "mecanismo_de_pivo_e_torcao_com_pe_fixo",
            "desaceleracao_brusca_e_mudanca_de_direcao",
            "impacto_direto_por_contato_fisico",
            "chute_com_hiperextensao_de_joelho_e_flexao_de_quadril"
        ],
        regioesAcometidas: ["joelho", "tornozelo", "pubis_virilha", "coxa_posterior", "articulacao_sacroiliaca"],
        riscosClinicos: [
            "ruptura_do_ligamento_cruzado_anterior_lca",
            "lesao_meniscal_medial_e_lateral",
            "pubalgia_do_atleta_osteite_pubica",
            "straint_estiramento_dos_isquiotibiais",
            "entorse_de_tornozelo_com_lesao_ligamentar"
        ]
    },
    "futsal": {
        exibicao: "Futsal / Futebol de Salão",
        tipo: "esporte",
        nivelRisco: "critico",
        vetoresCarga: [
            "alta_taxa_de_desaceleracao_em_piso_rigido",
            "constantes_giros_e_mudancas_de_direcao",
            "impacto_recorrente_em_superficie_nao_flexivel"
        ],
        regioesAcometidas: ["joelho", "tornozelo", "tibia", "coluna_lombar"],
        riscosClinicos: [
            "ruptura_de_lca_e_mcl",
            "sindrome_patelofemoral_aguda",
            "canelite_e_osteoartrose_precoce_de_tornozelo",
            "tendinopatia_calcanea"
        ]
    },
    "basquete": {
        exibicao: "Basquetebol / Basquete 3x3",
        tipo: "esporte",
        nivelRisco: "critico",
        vetoresCarga: [
            "salto_e_aterrissagem_com_alta_forca_de_reacao_do_solo",
            "mudanca_de_direcao_em_alta_velocidade",
            "contato_fisico_em_fase_aerea"
        ],
        regioesAcometidas: ["joelho", "tornozelo", "coluna_lombar", "dedos_das_maos"],
        riscosClinicos: [
            "tendinopatia_patelar_jumper_knee",
            "entorse_grave_de_tornozelo_inversao",
            "hernia_discal_por_impacto_de_aterrissagem",
            "luxacao_e_entorse_interfalangica"
        ]
    },
    "volei": {
        exibicao: "Voleibol / Vôlei de Praia",
        tipo: "esporte",
        nivelRisco: "critico",
        vetoresCarga: [
            "repeticao_de_saltos_e_aterrissagens_em_superficie_dura_ou_areia",
            "gesto_de_ataque_e_bloqueio_com_hiperlordose_e_impacto_no_ombro",
            "desvio_forcado_de_punho_e_dedos"
        ],
        regioesAcometidas: ["joelhos", "ombro_dominante", "coluna_lombar", "punhos_dedos"],
        riscosClinicos: [
            "tendinopatia_patelar",
            "sindrome_do_impacto_glenoumeral",
            "espondilolistese_por_hiperextensao",
            "capsulite_e_entorse_digital"
        ]
    },

    // --- ESPORTES: LUTAS E ARTES MARCIAIS ---
    "jiu jitsu": {
        exibicao: "Jiu-Jitsu / Lutas de Solo / Grappling",
        tipo: "esporte",
        nivelRisco: "critico",
        vetoresCarga: [
            "hiperextensao_e_hiperflexao_articular_forcada_chaves",
            "torsao_e_compressao_de_tronco_em_guarda",
            "sobrecarga_de_membros_superiores_em_pegadas",
            "impacto_e_queda_no_tatame"
        ],
        regioesAcometidas: ["coluna_cervical", "cotovelos", "joelhos", "ombros", "dedos_das_maos"],
        riscosClinicos: [
            "hernia_discal_cervical_e_lombar",
            "lesao_ligamentar_de_cotovelo_e_joelho",
            "subluxacao_acromioclavicular",
            "artrose_precoce_interfalangica",
            "sindrome_do_chicote_cervical"
        ]
    },
    "muay thai": {
        exibicao: "Muay Thai / Kickboxing / Boxe",
        tipo: "esporte",
        nivelRisco: "critico",
        vetoresCarga: [
            "impacto_direto_de_golpes_membros_inferiores_e_superiores",
            "rotacao_de_tronco_com_forca_explosiva",
            "chutes_com_mecanismo_de_alavanca_na_tibia_e_quadril"
        ],
        regioesAcometidas: ["tibia", "punhos", "quadril", "coluna_cervical", "costelas"],
        riscosClinicos: [
            "periostite_e_fratura_de_estresse_na_tibia",
            "instabilidade_carpal_e_boxer_fracture",
            "impacto_femoracetabular_quadril",
            "fratura_e_subluxacao_costal"
        ]
    },
    "judo": {
        exibicao: "Judô / Lutas de Projeção",
        tipo: "esporte",
        nivelRisco: "critico",
        vetoresCarga: [
            "quedas_com_alta_energia_e_impacto_no_tatame",
            "tracao_isometrica_extrema_em_pegadas_kimono",
            "rotacao_forcada_de_tronco_para_projecao"
        ],
        regioesAcometidas: ["ombro", "coluna_vertebral", "joelho", "dedos_das_maos"],
        riscosClinicos: [
            "luxacao_glenoumeral_e_acromioclavicular",
            "hernia_discal_traumatica",
            "ruptura_de_ligamento_colateral_de_joelho",
            "tenossinovite_dos_flexores_da_mao"
        ]
    },

    // --- ESPORTES: PRÁTICAS DE DESLIZAMENTO E ACROBÁTICAS ---
    "surf": {
        exibicao: "Surfe / Bodyboard",
        tipo: "esporte",
        nivelRisco: "medio",
        vetoresCarga: [
            "hiperextensao_cervical_e_lombar_sustentada_remada",
            "impacto_agudo_em_manobras_e_quedas_wipeout",
            "rotacao_explosiva_de_tronco_no_pop_up"
        ],
        regioesAcometidas: ["coluna_cervical", "coluna_lombar", "ombros", "joelhos"],
        riscosClinicos: [
            "cervicalgia_e_lombalgia_de_remada",
            "sindrome_do_impacto_subacromial",
            "entorse_de_joelho_por_rotacao_na_prancha",
            "exostose_do_canal_auditivo"
        ]
    },
    "skate": {
        exibicao: "Skate (Street / Park / Bowl)",
        tipo: "esporte",
        nivelRisco: "critico",
        vetoresCarga: [
            "impacto_recorrente_de_aterrissagens_de_manobras",
            "assimetria_de_impulso_leg_push",
            "quedas_com_trauma_direto_em_membros_superiores"
        ],
        regioesAcometidas: ["punhos", "tornozelos", "joelhos", "coluna_lombar"],
        riscosClinicos: [
            "fratura_de_escafoide_e_radio_distal",
            "entorse_grave_de_tornozelo",
            "sindrome_patelofemoral",
            "lombalgia_assimetrica"
        ]
    },
// --- SINÔNIMOS, TERMOS POPULARES E MAPEAMENTOS ALTERNATIVOS ---
    "uber": {
        exibicao: "Motorista Profissional / Caminhoneiro / Uber / Taxista",
        tipo: "profissao",
        nivelRisco: "critico",
        vetoresCarga: [
            "vibracao_corpo_inteiro_sedestacao",
            "microtraumas_axiais_repetitivos_piso",
            "inatividade_glutea_pressao_isquiatica"
        ],
        regioesAcometidas: ["coluna_lombossacra", "quadril", "articulacao_sacroiliaca"],
        riscosClinicos: [
            "degeneracao_discal_acelerada",
            "sindrome_do_piriforme_compressiva",
            "sacroileite_mecanica"
        ]
    },
    "taxista": {
        exibicao: "Motorista Profissional / Caminhoneiro / Uber / Taxista",
        tipo: "profissao",
        nivelRisco: "critico",
        vetoresCarga: [
            "vibracao_corpo_inteiro_sedestacao",
            "manutencao_postura_estatica_longa_duracao"
        ],
        regioesAcometidas: ["coluna_lombossacra", "quadril", "joelho_direito_pedal"],
        riscosClinicos: [
            "degeneracao_discal_acelerada",
            "sindrome_patelofemoral_pedal"
        ]
    },
    "caminhoneiro": {
        exibicao: "Motorista Profissional / Caminhoneiro / Uber / Taxista",
        tipo: "profissao",
        nivelRisco: "critico",
        vetoresCarga: [
            "vibracao_corpo_inteiro_sedestacao",
            "microtraumas_axiais_repetitivos_piso"
        ],
        regioesAcometidas: ["coluna_lombossacra", "coluna_cervical", "quadril"],
        riscosClinicos: [
            "hernia_discal_lombar_extusa",
            "sindrome_do_piriforme_compressiva"
        ]
    },
    "mtb": {
        exibicao: "Ciclismo de Estrada / Mountain Bike (MTB) / Gravel",
        tipo: "esporte",
        nivelRisco: "medio",
        vetoresCarga: [
            "flexao_de_tronco_sustentada_no_selim",
            "extensao_cervical_forcada_para_visao_de_campo",
            "vibracao_de_terreno_em_mtb"
        ],
        regioesAcometidas: ["coluna_cervical", "coluna_lombar", "joelho", "punhos"],
        riscosClinicos: [
            "cervicalgia_posicional_com_hipertonia_de_trapezio",
            "sindrome_patelofemoral_por_ajuste_de_bike_fit",
            "sindrome_do_canal_de_guyon_e_tunel_do_carpo"
        ]
    },
    "bike": {
        exibicao: "Ciclismo de Estrada / Mountain Bike (MTB) / Gravel",
        tipo: "esporte",
        nivelRisco: "medio",
        vetoresCarga: [
            "flexao_de_tronco_sustentada_no_selim",
            "extensao_cervical_forcada_para_visao_de_campo"
        ],
        regioesAcometidas: ["coluna_cervical", "coluna_lombar", "joelho"],
        riscosClinicos: [
            "cervicalgia_posicional_com_hipertonia_de_trapezio",
            "sindrome_patelofemoral_por_ajuste_de_bike_fit"
        ]
    },
    "musculacao": {
        exibicao: "Musculação Pesada / Powerlifting / LPO",
        tipo: "esporte",
        nivelRisco: "critico",
        vetoresCarga: [
            "carga_compressiva_axial_extrema_agachamento_terra",
            "pressao_intraabdominal_elevada"
        ],
        regioesAcometidas: ["coluna_lombossacra", "joelhos", "cotovelos", "ombros"],
        riscosClinicos: [
            "sobrecarga_articular_facetaria_lombar",
            "rotura_ou_avulsao_tendinea_bicipital_quadricipital"
        ]
    },
    "lutador": {
        exibicao: "Jiu-Jitsu / Lutas de Solo / Grappling",
        tipo: "esporte",
        nivelRisco: "critico",
        vetoresCarga: [
            "hiperextensao_e_hiperflexao_articular_forcada_chaves",
            "torsao_e_compressao_de_tronco_em_guarda"
        ],
        regioesAcometidas: ["coluna_cervical", "cotovelos", "joelhos", "ombros"],
        riscosClinicos: [
            "hernia_discal_cervical_e_lombar",
            "lesao_ligamentar_de_cotovelo_e_joelho"
        ]
    },
    "fut": {
        exibicao: "Futebol / Futsal",
        tipo: "esporte",
        nivelRisco: "critico",
        vetoresCarga: [
            "mecanismo_de_pivo_e_torcao_com_pe_fixo",
            "desaceleracao_brusca_e_mudanca_de_direcao"
        ],
        regioesAcometidas: ["joelho", "tornozelo", "pubis_virilha", "coxa_posterior"],
        riscosClinicos: [
            "ruptura_do_ligamento_cruzado_anterior_lca",
            "lesao_meniscal_medial_e_lateral",
            "pubalgia_do_atleta_osteite_pubica"
        ]
    }
};