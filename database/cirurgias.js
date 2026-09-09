/* ==========================================================================
   KINESYS - DICIONÁRIO DE CIRURGIAS E TRAUMAS (DATABASE)
   Arquivo: database/cirurgias.js - PARTE 1 DE 6
   ========================================================================== */

const dicionarioCirurgias = {
    // --- COLUNA VERTEBRAL ---
    "artrodese": {
        exibicao: "Artrodese de Coluna (Parafusos / Hastes / Cages)",
        categoria: "Coluna Vertebral",
        regiaoAnatomica: ["coluna_vertebral", "tronco"],
        estruturasAfetadas: ["articulacao_facetaria", "disco_intervertebral", "musculatura_paravertebral"],
        riscosClinicos: ["rigidez_segmentar", "sobrecarga_nivel_adjacente", "deficit_mobilidade_axial"]
    },
    "pino na coluna": {
        exibicao: "Artrodese de Coluna (Parafusos / Hastes / Cages)",
        categoria: "Coluna Vertebral",
        regiaoAnatomica: ["coluna_vertebral", "tronco"],
        estruturasAfetadas: ["articulacao_facetaria", "disco_intervertebral", "musculatura_paravertebral"],
        riscosClinicos: ["rigidez_segmentar", "sobrecarga_nivel_adjacente", "deficit_mobilidade_axial"]
    },
    "placa na coluna": {
        exibicao: "Artrodese de Coluna (Parafusos / Hastes / Cages)",
        categoria: "Coluna Vertebral",
        regiaoAnatomica: ["coluna_vertebral", "tronco"],
        estruturasAfetadas: ["articulacao_facetaria", "disco_intervertebral", "musculatura_paravertebral"],
        riscosClinicos: ["rigidez_segmentar", "sobrecarga_nivel_adjacente", "deficit_mobilidade_axial"]
    },
    "cirurgia de parafuso na coluna": {
        exibicao: "Artrodese de Coluna (Parafusos / Hastes / Cages)",
        categoria: "Coluna Vertebral",
        regiaoAnatomica: ["coluna_vertebral", "tronco"],
        estruturasAfetadas: ["articulacao_facetaria", "disco_intervertebral", "musculatura_paravertebral"],
        riscosClinicos: ["rigidez_segmentar", "sobrecarga_nivel_adjacente", "deficit_mobilidade_axial"]
    },

    "herniectomia": {
        exibicao: "Herniectomia / Discectomia Lombar ou Cervical",
        categoria: "Coluna Vertebral",
        regiaoAnatomica: ["coluna_vertebral"],
        estruturasAfetadas: ["disco_intervertebral", "raiz_nervosa", "ligamento_amarelo"],
        riscosClinicos: ["recidiva_discal", "instabilidade_segmentar", "aderencia_radicular_dural"]
    },
    "operou hernia de disco": {
        exibicao: "Herniectomia / Discectomia Lombar ou Cervical",
        categoria: "Coluna Vertebral",
        regiaoAnatomica: ["coluna_vertebral"],
        estruturasAfetadas: ["disco_intervertebral", "raiz_nervosa", "ligamento_amarelo"],
        riscosClinicos: ["recidiva_discal", "instabilidade_segmentar", "aderencia_radicular_dural"]
    },
    "raspagem de hernia": {
        exibicao: "Herniectomia / Discectomia Lombar ou Cervical",
        categoria: "Coluna Vertebral",
        regiaoAnatomica: ["coluna_vertebral"],
        estruturasAfetadas: ["disco_intervertebral", "raiz_nervosa", "ligamento_amarelo"],
        riscosClinicos: ["recidiva_discal", "instabilidade_segmentar", "aderencia_radicular_dural"]
    },
    "retirada de hernia": {
        exibicao: "Herniectomia / Discectomia Lombar ou Cervical",
        categoria: "Coluna Vertebral",
        regiaoAnatomica: ["coluna_vertebral"],
        estruturasAfetadas: ["disco_intervertebral", "raiz_nervosa", "ligamento_amarelo"],
        riscosClinicos: ["recidiva_discal", "instabilidade_segmentar", "aderencia_radicular_dural"]
    },

    "laminectomia": {
        exibicao: "Laminectomia Descompressiva Espinhal",
        categoria: "Coluna Vertebral",
        regiaoAnatomica: ["coluna_vertebral"],
        estruturasAfetadas: ["lamina_vertebral", "ligamento_amarelo", "canal_vertebral"],
        riscosClinicos: ["instabilidade_postural", "perda_protecao_dural", "fibrose_epidural"]
    },
    "descompressao de coluna": {
        exibicao: "Laminectomia Descompressiva Espinhal",
        categoria: "Coluna Vertebral",
        regiaoAnatomica: ["coluna_vertebral"],
        estruturasAfetadas: ["lamina_vertebral", "ligamento_amarelo", "canal_vertebral"],
        riscosClinicos: ["instabilidade_postural", "perda_protecao_dural", "fibrose_epidural"]
    },
    "cirurgia de canal estreito": {
        exibicao: "Laminectomia Descompressiva Espinhal",
        categoria: "Coluna Vertebral",
        regiaoAnatomica: ["coluna_vertebral"],
        estruturasAfetadas: ["lamina_vertebral", "ligamento_amarelo", "canal_vertebral"],
        riscosClinicos: ["instabilidade_postural", "perda_protecao_dural", "fibrose_epidural"]
    },

    "vertebroplastia": {
        exibicao: "Vertebroplastia / Cifoplastia (Cimento Ósseo)",
        categoria: "Coluna Vertebral",
        regiaoAnatomica: ["coluna_vertebral"],
        estruturasAfetadas: ["corpo_vertebral"],
        riscosClinicos: ["rigidez_corpo_vertebral", "fratura_nivel_adjacente"]
    },
    "cimento na coluna": {
        exibicao: "Vertebroplastia / Cifoplastia (Cimento Ósseo)",
        categoria: "Coluna Vertebral",
        regiaoAnatomica: ["coluna_vertebral"],
        estruturasAfetadas: ["corpo_vertebral"],
        riscosClinicos: ["rigidez_corpo_vertebral", "fratura_nivel_adjacente"]
    },
    "cirurgia de fratura de vertebra": {
        exibicao: "Vertebroplastia / Cifoplastia (Cimento Ósseo)",
        categoria: "Coluna Vertebral",
        regiaoAnatomica: ["coluna_vertebral"],
        estruturasAfetadas: ["corpo_vertebral"],
        riscosClinicos: ["rigidez_corpo_vertebral", "fratura_nivel_adjacente"]
    },
// --- QUADRIL E PELVE ---
    "artroplastia de quadril": {
        exibicao: "Artroplastia Total/Parcial de Quadril (ATQ)",
        categoria: "Quadril e Pelve",
        regiaoAnatomica: ["quadril", "membro_inferior", "pelve"],
        estruturasAfetadas: ["articulacao_coxofemoral", "capsula_articular", "musculatura_glutea"],
        riscosClinicos: ["luxacao_protese", "discrepancia_comprimento_membros", "soltura_componentes", "restricao_adm_flexao_rotacao"]
    },
    "protese de quadril": {
        exibicao: "Artroplastia Total/Parcial de Quadril (ATQ)",
        categoria: "Quadril e Pelve",
        regiaoAnatomica: ["quadril", "membro_inferior", "pelve"],
        estruturasAfetadas: ["articulacao_coxofemoral", "capsula_articular", "musculatura_glutea"],
        riscosClinicos: ["luxacao_protese", "discrepancia_comprimento_membros", "soltura_componentes", "restricao_adm_flexao_rotacao"]
    },
    "protese na bacia": {
        exibicao: "Artroplastia Total/Parcial de Quadril (ATQ)",
        categoria: "Quadril e Pelve",
        regiaoAnatomica: ["quadril", "membro_inferior", "pelve"],
        estruturasAfetadas: ["articulacao_coxofemoral", "capsula_articular", "musculatura_glutea"],
        riscosClinicos: ["luxacao_protese", "discrepancia_comprimento_membros", "soltura_componentes", "restricao_adm_flexao_rotacao"]
    },
    "troca do quadril": {
        exibicao: "Artroplastia Total/Parcial de Quadril (ATQ)",
        categoria: "Quadril e Pelve",
        regiaoAnatomica: ["quadril", "membro_inferior", "pelve"],
        estruturasAfetadas: ["articulacao_coxofemoral", "capsula_articular", "musculatura_glutea"],
        riscosClinicos: ["luxacao_protese", "discrepancia_comprimento_membros", "soltura_componentes", "restricao_adm_flexao_rotacao"]
    },

    "osteossintese de femur": {
        exibicao: "Osteossintese de Fêmur Proximal / Pelve",
        categoria: "Quadril e Pelve",
        regiaoAnatomica: ["quadril", "membro_inferior"],
        estruturasAfetadas: ["colo_femoral", "regiao_trocanterica", "periosteo"],
        riscosClinicos: ["necrose_avascular_cabeca_femoral", "pseudoartrose", "deficit_carga_peso"]
    },
    "placa no femur": {
        exibicao: "Osteossintese de Fêmur Proximal / Pelve",
        categoria: "Quadril e Pelve",
        regiaoAnatomica: ["quadril", "membro_inferior"],
        estruturasAfetadas: ["colo_femoral", "regiao_trocanterica", "periosteo"],
        riscosClinicos: ["necrose_avascular_cabeca_femoral", "pseudoartrose", "deficit_carga_peso"]
    },
    "pino no quadril": {
        exibicao: "Osteossintese de Fêmur Proximal / Pelve",
        categoria: "Quadril e Pelve",
        regiaoAnatomica: ["quadril", "membro_inferior"],
        estruturasAfetadas: ["colo_femoral", "regiao_trocanterica", "periosteo"],
        riscosClinicos: ["necrose_avascular_cabeca_femoral", "pseudoartrose", "deficit_carga_peso"]
    },
    "parafuso no quadril": {
        exibicao: "Osteossintese de Fêmur Proximal / Pelve",
        categoria: "Quadril e Pelve",
        regiaoAnatomica: ["quadril", "membro_inferior"],
        estruturasAfetadas: ["colo_femoral", "regiao_trocanterica", "periosteo"],
        riscosClinicos: ["necrose_avascular_cabeca_femoral", "pseudoartrose", "deficit_carga_peso"]
    },

    "artroscopia de quadril": {
        exibicao: "Artroscopia de Quadril (Impacto Femoroacetabular / Labrum)",
        categoria: "Quadril e Pelve",
        regiaoAnatomica: ["quadril"],
        estruturasAfetadas: ["labrum_acetabular", "cartilagem_femoral", "capsula_articular"],
        riscosClinicos: ["aderencia_capsular", "parestesia_nervo_pudendo", "sindrome_impacto_residual"]
    },
    "raspagem no quadril": {
        exibicao: "Artroscopia de Quadril (Impacto Femoroacetabular / Labrum)",
        categoria: "Quadril e Pelve",
        regiaoAnatomica: ["quadril"],
        estruturasAfetadas: ["labrum_acetabular", "cartilagem_femoral", "capsula_articular"],
        riscosClinicos: ["aderencia_capsular", "parestesia_nervo_pudendo", "sindrome_impacto_residual"]
    },
    "cirurgia de labrum do quadril": {
        exibicao: "Artroscopia de Quadril (Impacto Femoroacetabular / Labrum)",
        categoria: "Quadril e Pelve",
        regiaoAnatomica: ["quadril"],
        estruturasAfetadas: ["labrum_acetabular", "cartilagem_femoral", "capsula_articular"],
        riscosClinicos: ["aderencia_capsular", "parestesia_nervo_pudendo", "sindrome_impacto_residual"]
    },

    "osteotomia de quadril": {
        exibicao: "Osteotomia Periacetabular / Femoral",
        categoria: "Quadril e Pelve",
        regiaoAnatomica: ["quadril", "pelve"],
        estruturasAfetadas: ["acetabulo", "femur_proximal"],
        riscosClinicos: ["atraso_consolidacao", "alteracao_biomecanica_marcha", "perda_fixacao"]
    },
    "corte no osso do quadril": {
        exibicao: "Osteotomia Periacetabular / Femoral",
        categoria: "Quadril e Pelve",
        regiaoAnatomica: ["quadril", "pelve"],
        estruturasAfetadas: ["acetabulo", "femur_proximal"],
        riscosClinicos: ["atraso_consolidacao", "alteracao_biomecanica_marcha", "perda_fixacao"]
    },
    "reorientacao do quadril": {
        exibicao: "Osteotomia Periacetabular / Femoral",
        categoria: "Quadril e Pelve",
        regiaoAnatomica: ["quadril", "pelve"],
        estruturasAfetadas: ["acetabulo", "femur_proximal"],
        riscosClinicos: ["atraso_consolidacao", "alteracao_biomecanica_marcha", "perda_fixacao"]
    },

    "sutura de gluteo medio": {
        exibicao: "Reparo / Sutura de Tendão Glúteo Médio/Mínimo",
        categoria: "Quadril e Pelve",
        regiaoAnatomica: ["quadril", "pelve"],
        estruturasAfetadas: ["tendao_gluteo_medio", "tendao_gluteo_minimo", "bursa_trocanterica"],
        riscosClinicos: ["sinal_trendelenburg", "fraqueza_abducao", "trocanterite_residual"]
    },
    "operou tendao do quadril": {
        exibicao: "Reparo / Sutura de Tendão Glúteo Médio/Mínimo",
        categoria: "Quadril e Pelve",
        regiaoAnatomica: ["quadril", "pelve"],
        estruturasAfetadas: ["tendao_gluteo_medio", "tendao_gluteo_minimo", "bursa_trocanterica"],
        riscosClinicos: ["sinal_trendelenburg", "fraqueza_abducao", "trocanterite_residual"]
    },
    "cirurgia de bursite no quadril": {
        exibicao: "Reparo / Sutura de Tendão Glúteo Médio/Mínimo",
        categoria: "Quadril e Pelve",
        regiaoAnatomica: ["quadril", "pelve"],
        estruturasAfetadas: ["tendao_gluteo_medio", "tendao_gluteo_minimo", "bursa_trocanterica"],
        riscosClinicos: ["sinal_trendelenburg", "fraqueza_abducao", "trocanterite_residual"]
    },

    "fratura de acetabulo": {
        exibicao: "Osteossíntese de Acetábulo / Pelve",
        categoria: "Quadril e Pelve",
        regiaoAnatomica: ["quadril", "pelve"],
        estruturasAfetadas: ["acetabulo", "coluna_iliopubica", "coluna_ilioisquiática"],
        riscosClinicos: ["artrose_postraumatica", "ossificacao_heterotopica", "lesao_nervo_sciatico"]
    },
    "cirurgia na bacia": {
        exibicao: "Osteossíntese de Acetábulo / Pelve",
        categoria: "Quadril e Pelve",
        regiaoAnatomica: ["quadril", "pelve"],
        estruturasAfetadas: ["acetabulo", "coluna_iliopubica", "coluna_ilioisquiática"],
        riscosClinicos: ["artrose_postraumatica", "ossificacao_heterotopica", "lesao_nervo_sciatico"]
    },
    "placa na bacia": {
        exibicao: "Osteossíntese de Acetábulo / Pelve",
        categoria: "Quadril e Pelve",
        regiaoAnatomica: ["quadril", "pelve"],
        estruturasAfetadas: ["acetabulo", "coluna_iliopubica", "coluna_ilioisquiática"],
        riscosClinicos: ["artrose_postraumatica", "ossificacao_heterotopica", "lesao_nervo_sciatico"]
    },

    // --- JOELHO ---
    "reconstrucao de lca": {
        exibicao: "Reconstrução de Ligamento Cruzado Anterior (LCA)",
        categoria: "Joelho",
        regiaoAnatomica: ["joelho", "membro_inferior"],
        estruturasAfetadas: ["ligamento_cruzado_anterior", "tendao_patelar_ou_isquiotibiais", "cONDILOS_FEMORAIS"],
        riscosClinicos: ["deficit_extensao_completa", "inibinicao_artrogenica_quadriceps", "frouxidao_residual"]
    },
    "operou ligamento do joelho": {
        exibicao: "Reconstrução de Ligamento Cruzado Anterior (LCA)",
        categoria: "Joelho",
        regiaoAnatomica: ["joelho", "membro_inferior"],
        estruturasAfetadas: ["ligamento_cruzado_anterior", "tendao_patelar_ou_isquiotibiais", "cONDILOS_FEMORAIS"],
        riscosClinicos: ["deficit_extensao_completa", "inibinicao_artrogenica_quadriceps", "frouxidao_residual"]
    },
    "enxerto no joelho": {
        exibicao: "Reconstrução de Ligamento Cruzado Anterior (LCA)",
        categoria: "Joelho",
        regiaoAnatomica: ["joelho", "membro_inferior"],
        estruturasAfetadas: ["ligamento_cruzado_anterior", "tendao_patelar_ou_isquiotibiais", "cONDILOS_FEMORAIS"],
        riscosClinicos: ["deficit_extensao_completa", "inibinicao_artrogenica_quadriceps", "frouxidao_residual"]
    },
    "lca": {
        exibicao: "Reconstrução de Ligamento Cruzado Anterior (LCA)",
        categoria: "Joelho",
        regiaoAnatomica: ["joelho", "membro_inferior"],
        estruturasAfetadas: ["ligamento_cruzado_anterior", "tendao_patelar_ou_isquiotibiais", "cONDILOS_FEMORAIS"],
        riscosClinicos: ["deficit_extensao_completa", "inibinicao_artrogenica_quadriceps", "frouxidao_residual"]
    },

    "reconstrucao de lcp": {
        exibicao: "Reconstrução de Ligamento Cruzado Posterior (LCP)",
        categoria: "Joelho",
        regiaoAnatomica: ["joelho", "membro_inferior"],
        estruturasAfetadas: ["ligamento_cruzado_posterior", "capsula_posterior"],
        riscosClinicos: ["gaveta_posterior_residual", "sobrecarga_femoropatelar", "deficit_flexao_extrema"]
    },
    "lcp": {
        exibicao: "Reconstrução de Ligamento Cruzado Posterior (LCP)",
        categoria: "Joelho",
        regiaoAnatomica: ["joelho", "membro_inferior"],
        estruturasAfetadas: ["ligamento_cruzado_posterior", "capsula_posterior"],
        riscosClinicos: ["gaveta_posterior_residual", "sobrecarga_femoropatelar", "deficit_flexao_extrema"]
    },
    "ligamento de tras do joelho": {
        exibicao: "Reconstrução de Ligamento Cruzado Posterior (LCP)",
        categoria: "Joelho",
        regiaoAnatomica: ["joelho", "membro_inferior"],
        estruturasAfetadas: ["ligamento_cruzado_posterior", "capsula_posterior"],
        riscosClinicos: ["gaveta_posterior_residual", "sobrecarga_femoropatelar", "deficit_flexao_extrema"]
    },

    "reconstrucao colateral": {
        exibicao: "Reconstrução de Ligamento Colateral (LCM / LCL)",
        categoria: "Joelho",
        regiaoAnatomica: ["joelho", "membro_inferior"],
        estruturasAfetadas: ["ligamento_colateral_medial", "ligamento_colateral_lateral"],
        riscosClinicos: ["instabilidade_valgo_varo", "rigidez_medial_lateral"]
    },
    "ligamento do lado do joelho": {
        exibicao: "Reconstrução de Ligamento Colateral (LCM / LCL)",
        categoria: "Joelho",
        regiaoAnatomica: ["joelho", "membro_inferior"],
        estruturasAfetadas: ["ligamento_colateral_medial", "ligamento_colateral_lateral"],
        riscosClinicos: ["instabilidade_valgo_varo", "rigidez_medial_lateral"]
    },
    "plastica ligamentar joelho": {
        exibicao: "Reconstrução de Ligamento Colateral (LCM / LCL)",
        categoria: "Joelho",
        regiaoAnatomica: ["joelho", "membro_inferior"],
        estruturasAfetadas: ["ligamento_colateral_medial", "ligamento_colateral_lateral"],
        riscosClinicos: ["instabilidade_valgo_varo", "rigidez_medial_lateral"]
    },

    "meniscectomia": {
        exibicao: "Meniscectomia / Sutura Meniscal",
        categoria: "Joelho",
        regiaoAnatomica: ["joelho"],
        estruturasAfetadas: ["menisco_medial", "menisco_lateral"],
        riscosClinicos: ["aceleracao_condroprotecao_artrose", "pico_pressao_femorotibial"]
    },
    "operou menisco": {
        exibicao: "Meniscectomia / Sutura Meniscal",
        categoria: "Joelho",
        regiaoAnatomica: ["joelho"],
        estruturasAfetadas: ["menisco_medial", "menisco_lateral"],
        riscosClinicos: ["aceleracao_condroprotecao_artrose", "pico_pressao_femorotibial"]
    },
    "raspagem de menisco": {
        exibicao: "Meniscectomia / Sutura Meniscal",
        categoria: "Joelho",
        regiaoAnatomica: ["joelho"],
        estruturasAfetadas: ["menisco_medial", "menisco_lateral"],
        riscosClinicos: ["aceleracao_condroprotecao_artrose", "pico_pressao_femorotibial"]
    },
    "costura no menisco": {
        exibicao: "Meniscectomia / Sutura Meniscal",
        categoria: "Joelho",
        regiaoAnatomica: ["joelho"],
        estruturasAfetadas: ["menisco_medial", "menisco_lateral"],
        riscosClinicos: ["aceleracao_condroprotecao_artrose", "pico_pressao_femorotibial"]
    },

    "artroplastia de joelho": {
        exibicao: "Artroplastia Total/Parcial de Joelho (ATJ)",
        categoria: "Joelho",
        regiaoAnatomica: ["joelho", "membro_inferior"],
        estruturasAfetadas: ["articulacao_femorotibial", "articulacao_femoropatelar"],
        riscosClinicos: ["arthrofibrose", "deficit_flexao_extensao", "dor_anterior_residual"]
    },
    "protese de joelho": {
        exibicao: "Artroplastia Total/Parcial de Joelho (ATJ)",
        categoria: "Joelho",
        regiaoAnatomica: ["joelho", "membro_inferior"],
        estruturasAfetadas: ["articulacao_femorotibial", "articulacao_femoropatelar"],
        riscosClinicos: ["arthrofibrose", "deficit_flexao_extensao", "dor_anterior_residual"]
    },
    "troca do joelho": {
        exibicao: "Artroplastia Total/Parcial de Joelho (ATJ)",
        categoria: "Joelho",
        regiaoAnatomica: ["joelho", "membro_inferior"],
        estruturasAfetadas: ["articulacao_femorotibial", "articulacao_femoropatelar"],
        riscosClinicos: ["arthrofibrose", "deficit_flexao_extensao", "dor_anterior_residual"]
    },

    "realinhamento patelar": {
        exibicao: "Realinhamento Patelar / Reconstrução de MPFL",
        categoria: "Joelho",
        regiaoAnatomica: ["joelho"],
        estruturasAfetadas: ["ligamento_patelofemoral_medial", "retinaculo_lateral", "tuberosidade_anterior_tibia"],
        riscosClinicos: ["hiperpressao_patelar_medial", "rigidez_patelar", "instabilidade_residual"]
    },
    "cirurgia de patela": {
        exibicao: "Realinhamento Patelar / Reconstrução de MPFL",
        categoria: "Joelho",
        regiaoAnatomica: ["joelho"],
        estruturasAfetadas: ["ligamento_patelofemoral_medial", "retinaculo_lateral", "tuberosidade_anterior_tibia"],
        riscosClinicos: ["hiperpressao_patelar_medial", "rigidez_patelar", "instabilidade_residual"]
    },
    "patela deslocada cirurgia": {
        exibicao: "Realinhamento Patelar / Reconstrução de MPFL",
        categoria: "Joelho",
        regiaoAnatomica: ["joelho"],
        estruturasAfetadas: ["ligamento_patelofemoral_medial", "retinaculo_lateral", "tuberosidade_anterior_tibia"],
        riscosClinicos: ["hiperpressao_patelar_medial", "rigidez_patelar", "instabilidade_residual"]
    },

    "osteotomia de joelho": {
        exibicao: "Osteotomia Valgrizante / Varizante de Tíbia ou Fêmur",
        categoria: "Joelho",
        regiaoAnatomica: ["joelho", "membro_inferior"],
        estruturasAfetadas: ["tibia_proximal", "femur_distal"],
        riscosClinicos: ["atraso_consolidacao", "supercorrecao_angulo", "sobrecarga_compartimento_oposto"]
    },
    "corte no osso do joelho": {
        exibicao: "Osteotomia Valgrizante / Varizante de Tíbia ou Fêmur",
        categoria: "Joelho",
        regiaoAnatomica: ["joelho", "membro_inferior"],
        estruturasAfetadas: ["tibia_proximal", "femur_distal"],
        riscosClinicos: ["atraso_consolidacao", "supercorrecao_angulo", "sobrecarga_compartimento_oposto"]
    },
    "alinhamento de perna torta": {
        exibicao: "Osteotomia Valgrizante / Varizante de Tíbia ou Fêmur",
        categoria: "Joelho",
        regiaoAnatomica: ["joelho", "membro_inferior"],
        estruturasAfetadas: ["tibia_proximal", "femur_distal"],
        riscosClinicos: ["atraso_consolidacao", "supercorrecao_angulo", "sobrecarga_compartimento_oposto"]
    },

    "reparo de tendao patelar": {
        exibicao: "Sutura / Reconstrução de Tendão Patelar ou Quadricipital",
        categoria: "Joelho",
        regiaoAnatomica: ["joelho"],
        estruturasAfetadas: ["tendao_patelar", "tendao_quadricipital"],
        riscosClinicos: ["lag_extensao", "patela_baixa_alta", "falha_sutura_carga_precoce"]
    },
    "operou tendao do joelho": {
        exibicao: "Sutura / Reconstrução de Tendão Patelar ou Quadricipital",
        categoria: "Joelho",
        regiaoAnatomica: ["joelho"],
        estruturasAfetadas: ["tendao_patelar", "tendao_quadricipital"],
        riscosClinicos: ["lag_extensao", "patela_baixa_alta", "falha_sutura_carga_precoce"]
    },
    "rotura de tendao patelar": {
        exibicao: "Sutura / Reconstrução de Tendão Patelar ou Quadricipital",
        categoria: "Joelho",
        regiaoAnatomica: ["joelho"],
        estruturasAfetadas: ["tendao_patelar", "tendao_quadricipital"],
        riscosClinicos: ["lag_extensao", "patela_baixa_alta", "falha_sutura_carga_precoce"]
    },

    "mosaicoplastia": {
        exibicao: "Mosaicoplastia / Transplante Osteocondral de Joelho",
        categoria: "Joelho",
        regiaoAnatomica: ["joelho"],
        estruturasAfetadas: ["cartilagem_articular", "osso_subcondral"],
        riscosClinicos: ["falha_integracao_enxerto", "dor_sitio_doador", "delaminacao"]
    },
    "cirurgia de cartilagem no joelho": {
        exibicao: "Mosaicoplastia / Transplante Osteocondral de Joelho",
        categoria: "Joelho",
        regiaoAnatomica: ["joelho"],
        estruturasAfetadas: ["cartilagem_articular", "osso_subcondral"],
        riscosClinicos: ["falha_integracao_enxerto", "dor_sitio_doador", "delaminacao"]
    },
    "microfraturas joelho": {
        exibicao: "Mosaicoplastia / Transplante Osteocondral de Joelho",
        categoria: "Joelho",
        regiaoAnatomica: ["joelho"],
        estruturasAfetadas: ["cartilagem_articular", "osso_subcondral"],
        riscosClinicos: ["falha_integracao_enxerto", "dor_sitio_doador", "delaminacao"]
    },

// --- OMBRO E CINTURA ESCAPULAR ---
    "sutura de manguito rotador": {
        exibicao: "Reparo / Sutura de Manguito Rotador (Artroscopia)",
        categoria: "Ombro e Cintura Escapular",
        regiaoAnatomica: ["ombro", "cintura_escapular", "membro_superior"],
        estruturasAfetadas: ["supraespinal", "infraespinal", "subescapular", "biceps_cabeça_longa"],
        riscosClinicos: ["rerrotura_tendinea", "capsulite_adesiva", "deficit_forca_elevacao_rotacao"]
    },
    "operou manguito": {
        exibicao: "Reparo / Sutura de Manguito Rotador (Artroscopia)",
        categoria: "Ombro e Cintura Escapular",
        regiaoAnatomica: ["ombro", "cintura_escapular", "membro_superior"],
        estruturasAfetadas: ["supraespinal", "infraespinal", "subescapular", "biceps_cabeça_longa"],
        riscosClinicos: ["rerrotura_tendinea", "capsulite_adesiva", "deficit_forca_elevacao_rotacao"]
    },
    "cirurgia no tendao do ombro": {
        exibicao: "Reparo / Sutura de Manguito Rotador (Artroscopia)",
        categoria: "Ombro e Cintura Escapular",
        regiaoAnatomica: ["ombro", "cintura_escapular", "membro_superior"],
        estruturasAfetadas: ["supraespinal", "infraespinal", "subescapular", "biceps_cabeça_longa"],
        riscosClinicos: ["rerrotura_tendinea", "capsulite_adesiva", "deficit_forca_elevacao_rotacao"]
    },
    "costura no ombro": {
        exibicao: "Reparo / Sutura de Manguito Rotador (Artroscopia)",
        categoria: "Ombro e Cintura Escapular",
        regiaoAnatomica: ["ombro", "cintura_escapular", "membro_superior"],
        estruturasAfetadas: ["supraespinal", "infraespinal", "subescapular", "biceps_cabeça_longa"],
        riscosClinicos: ["rerrotura_tendinea", "capsulite_adesiva", "deficit_forca_elevacao_rotacao"]
    },

    "artroplastia de ombro": {
        exibicao: "Artroplastia Total / Inversa de Ombro",
        categoria: "Ombro e Cintura Escapular",
        regiaoAnatomica: ["ombro", "cintura_escapular", "membro_superior"],
        estruturasAfetadas: ["articulacao_glenoumeral", "deltoide", "glenoide"],
        riscosClinicos: ["instabilidade_componente", "dependencia_deltoidea", "restricao_rotacao_interna"]
    },
    "protese de ombro": {
        exibicao: "Artroplastia Total / Inversa de Ombro",
        categoria: "Ombro e Cintura Escapular",
        regiaoAnatomica: ["ombro", "cintura_escapular", "membro_superior"],
        estruturasAfetadas: ["articulacao_glenoumeral", "deltoide", "glenoide"],
        riscosClinicos: ["instabilidade_componente", "dependencia_deltoidea", "restricao_rotacao_interna"]
    },
    "protese inversa de ombro": {
        exibicao: "Artroplastia Total / Inversa de Ombro",
        categoria: "Ombro e Cintura Escapular",
        regiaoAnatomica: ["ombro", "cintura_escapular", "membro_superior"],
        estruturasAfetadas: ["articulacao_glenoumeral", "deltoide", "glenoide"],
        riscosClinicos: ["instabilidade_componente", "dependencia_deltoidea", "restricao_rotacao_interna"]
    },
    "troca do ombro": {
        exibicao: "Artroplastia Total / Inversa de Ombro",
        categoria: "Ombro e Cintura Escapular",
        regiaoAnatomica: ["ombro", "cintura_escapular", "membro_superior"],
        estruturasAfetadas: ["articulacao_glenoumeral", "deltoide", "glenoide"],
        riscosClinicos: ["instabilidade_componente", "dependencia_deltoidea", "restricao_rotacao_interna"]
    },

    "cirurgia de labrum do ombro": {
        exibicao: "Reparo de Lesão de Bankart / SLAP (Instabilidade)",
        categoria: "Ombro e Cintura Escapular",
        regiaoAnatomica: ["ombro", "cintura_escapular"],
        estruturasAfetadas: ["labrum_glenoidal", "ligamento_glenoumeral", "biceps_ancora"],
        riscosClinicos: ["perda_rotacao_externa", "recidiva_instabilidade", "rigidez_anterior"]
    },
    "bankart": {
        exibicao: "Reparo de Lesão de Bankart / SLAP (Instabilidade)",
        categoria: "Ombro e Cintura Escapular",
        regiaoAnatomica: ["ombro", "cintura_escapular"],
        estruturasAfetadas: ["labrum_glenoidal", "ligamento_glenoumeral", "biceps_ancora"],
        riscosClinicos: ["perda_rotacao_externa", "recidiva_instabilidade", "rigidez_anterior"]
    },
    "slap": {
        exibicao: "Reparo de Lesão de Bankart / SLAP (Instabilidade)",
        categoria: "Ombro e Cintura Escapular",
        regiaoAnatomica: ["ombro", "cintura_escapular"],
        estruturasAfetadas: ["labrum_glenoidal", "ligamento_glenoumeral", "biceps_ancora"],
        riscosClinicos: ["perda_rotacao_externa", "recidiva_instabilidade", "rigidez_anterior"]
    },
    "ombro saindo do lugar cirurgia": {
        exibicao: "Reparo de Lesão de Bankart / SLAP (Instabilidade)",
        categoria: "Ombro e Cintura Escapular",
        regiaoAnatomica: ["ombro", "cintura_escapular"],
        estruturasAfetadas: ["labrum_glenoidal", "ligamento_glenoumeral", "biceps_ancora"],
        riscosClinicos: ["perda_rotacao_externa", "recidiva_instabilidade", "rigidez_anterior"]
    },

    "cirurgia de latarjet": {
        exibicao: "Procedimento de Latarjet / Enxerto Ósseo Glenoidal",
        categoria: "Ombro e Cintura Escapular",
        regiaoAnatomica: ["ombro", "cintura_escapular"],
        estruturasAfetadas: ["processo_coracoide", "tendao_conjunto", "glenoide_anterior"],
        riscosClinicos: ["pseudoartrose_enxerto", "lesao_nervo_musculocutaneo", "bloqueio_rotacao"]
    },
    "latarjet": {
        exibicao: "Procedimento de Latarjet / Enxerto Ósseo Glenoidal",
        categoria: "Ombro e Cintura Escapular",
        regiaoAnatomica: ["ombro", "cintura_escapular"],
        estruturasAfetadas: ["processo_coracoide", "tendao_conjunto", "glenoide_anterior"],
        riscosClinicos: ["pseudoartrose_enxerto", "lesao_nervo_musculocutaneo", "bloqueio_rotacao"]
    },
    "enxerto no ombro": {
        exibicao: "Procedimento de Latarjet / Enxerto Ósseo Glenoidal",
        categoria: "Ombro e Cintura Escapular",
        regiaoAnatomica: ["ombro", "cintura_escapular"],
        estruturasAfetadas: ["processo_coracoide", "tendao_conjunto", "glenoide_anterior"],
        riscosClinicos: ["pseudoartrose_enxerto", "lesao_nervo_musculocutaneo", "bloqueio_rotacao"]
    },

    "acromioplastia": {
        exibicao: "Acromioplastia / Descompressão Subacromial",
        categoria: "Ombro e Cintura Escapular",
        regiaoAnatomica: ["ombro", "cintura_escapular"],
        estruturasAfetadas: ["acromio", "ligamento_coracoacromial", "bursa_subacromial"],
        riscosClinicos: ["incompetencia_acromial", "formacao_osteofito_reativo"]
    },
    "raspagem no osso do ombro": {
        exibicao: "Acromioplastia / Descompressão Subacromial",
        categoria: "Ombro e Cintura Escapular",
        regiaoAnatomica: ["ombro", "cintura_escapular"],
        estruturasAfetadas: ["acromio", "ligamento_coracoacromial", "bursa_subacromial"],
        riscosClinicos: ["incompetencia_acromial", "formacao_osteofito_reativo"]
    },
    "cirurgia de impacto no ombro": {
        exibicao: "Acromioplastia / Descompressão Subacromial",
        categoria: "Ombro e Cintura Escapular",
        regiaoAnatomica: ["ombro", "cintura_escapular"],
        estruturasAfetadas: ["acromio", "ligamento_coracoacromial", "bursa_subacromial"],
        riscosClinicos: ["incompetencia_acromial", "formacao_osteofito_reativo"]
    },

    "osteossintese de clavicula": {
        exibicao: "Osteossíntese de Clavícula (Placa / Parafuso)",
        categoria: "Ombro e Cintura Escapular",
        regiaoAnatomica: ["cintura_escapular", "torax"],
        estruturasAfetadas: ["clavicula", "musculo_subclavio", "periosteo"],
        riscosClinicos: ["parestesia_supraclavicular", "falha_material", "ponta_placa_saliente"]
    },
    "placa na clavicula": {
        exibicao: "Osteossíntese de Clavícula (Placa / Parafuso)",
        categoria: "Ombro e Cintura Escapular",
        regiaoAnatomica: ["cintura_escapular", "torax"],
        estruturasAfetadas: ["clavicula", "musculo_subclavio", "periosteo"],
        riscosClinicos: ["parestesia_supraclavicular", "falha_material", "ponta_placa_saliente"]
    },
    "pino na clavicula": {
        exibicao: "Osteossíntese de Clavícula (Placa / Parafuso)",
        categoria: "Ombro e Cintura Escapular",
        regiaoAnatomica: ["cintura_escapular", "torax"],
        estruturasAfetadas: ["clavicula", "musculo_subclavio", "periosteo"],
        riscosClinicos: ["parestesia_supraclavicular", "falha_material", "ponta_placa_saliente"]
    },

    "amarrilho acromioclavicular": {
        exibicao: "Reconstrução Ligamentar Acromioclavicular (Disjunção)",
        categoria: "Ombro e Cintura Escapular",
        regiaoAnatomica: ["ombro", "cintura_escapular"],
        estruturasAfetadas: ["ligamentos_coracoclaviculares", "articulacao_acromioclavicular"],
        riscosClinicos: ["perda_reducao", "osteolise_clavicula_distal", "dor_articular_ac"]
    },
    "operou disjuncao no ombro": {
        exibicao: "Reconstrução Ligamentar Acromioclavicular (Disjunção)",
        categoria: "Ombro e Cintura Escapular",
        regiaoAnatomica: ["ombro", "cintura_escapular"],
        estruturasAfetadas: ["ligamentos_coracoclaviculares", "articulacao_acromioclavicular"],
        riscosClinicos: ["perda_reducao", "osteolise_clavicula_distal", "dor_articular_ac"]
    },
    "placa no ombro em cima": {
        exibicao: "Reconstrução Ligamentar Acromioclavicular (Disjunção)",
        categoria: "Ombro e Cintura Escapular",
        regiaoAnatomica: ["ombro", "cintura_escapular"],
        estruturasAfetadas: ["ligamentos_coracoclaviculares", "articulacao_acromioclavicular"],
        riscosClinicos: ["perda_reducao", "osteolise_clavicula_distal", "dor_articular_ac"]
    },

    // --- COTOVELO ---
    "artroplastia de cotovelo": {
        exibicao: "Artroplastia de Cotovelo (Prótese de Cotovelo)",
        categoria: "Cotovelo",
        regiaoAnatomica: ["cotovelo", "membro_superior"],
        estruturasAfetadas: ["articulacao_ulnoumeral", "articulacao_radioumeral"],
        riscosClinicos: ["soltura_asseptica", "neuropatia_ulnar", "restricao_carga_peso"]
    },
    "protese de cotovelo": {
        exibicao: "Artroplastia de Cotovelo (Prótese de Cotovelo)",
        categoria: "Cotovelo",
        regiaoAnatomica: ["cotovelo", "membro_superior"],
        estruturasAfetadas: ["articulacao_ulnoumeral", "articulacao_radioumeral"],
        riscosClinicos: ["soltura_asseptica", "neuropatia_ulnar", "restricao_carga_peso"]
    },

    "osteossintese de cotovelo": {
        exibicao: "Osteossíntese de Cotovelo / Olecrano / Cabeça do Rádio",
        categoria: "Cotovelo",
        regiaoAnatomica: ["cotovelo", "membro_superior"],
        estruturasAfetadas: ["olecrano", "cabeca_do_radio", "capitulo_umero"],
        riscosClinicos: ["rigidez_em_flexoextensao", "perda_pronosupinacao", "ossificacao_heterotopica"]
    },
    "placa no cotovelo": {
        exibicao: "Osteossíntese de Cotovelo / Olecrano / Cabeça do Rádio",
        categoria: "Cotovelo",
        regiaoAnatomica: ["cotovelo", "membro_superior"],
        estruturasAfetadas: ["olecrano", "cabeca_do_radio", "capitulo_umero"],
        riscosClinicos: ["rigidez_em_flexoextensao", "perda_pronosupinacao", "ossificacao_heterotopica"]
    },
    "pino no cotovelo": {
        exibicao: "Osteossíntese de Cotovelo / Olecrano / Cabeça do Rádio",
        categoria: "Cotovelo",
        regiaoAnatomica: ["cotovelo", "membro_superior"],
        estruturasAfetadas: ["olecrano", "cabeca_do_radio", "capitulo_umero"],
        riscosClinicos: ["rigidez_em_flexoextensao", "perda_pronosupinacao", "ossificacao_heterotopica"]
    },

    "reparo de biceps distal": {
        exibicao: "Sutura / Reconstrução de Tendão Bíceps Distal",
        categoria: "Cotovelo",
        regiaoAnatomica: ["cotovelo", "membro_superior"],
        estruturasAfetadas: ["tendao_biceps_branquial_distal", "tuberosidade_bicipital_radio"],
        riscosClinicos: ["perda_forca_supinacao", "paresteia_nervo_antebraquial", "sinostose_radioulnar"]
    },
    "operou biceps no cotovelo": {
        exibicao: "Sutura / Reconstrução de Tendão Bíceps Distal",
        categoria: "Cotovelo",
        regiaoAnatomica: ["cotovelo", "membro_superior"],
        estruturasAfetadas: ["tendao_biceps_branquial_distal", "tuberosidade_bicipital_radio"],
        riscosClinicos: ["perda_forca_supinacao", "paresteia_nervo_antebraquial", "sinostose_radioulnar"]
    },
    "rotura de biceps distal": {
        exibicao: "Sutura / Reconstrução de Tendão Bíceps Distal",
        categoria: "Cotovelo",
        regiaoAnatomica: ["cotovelo", "membro_superior"],
        estruturasAfetadas: ["tendao_biceps_branquial_distal", "tuberosidade_bicipital_radio"],
        riscosClinicos: ["perda_forca_supinacao", "paresteia_nervo_antebraquial", "sinostose_radioulnar"]
    },

    "cirurgia de epicondilite": {
        exibicao: "Desbridamento / Liberação de Epicôndilo Lateral/Medial",
        categoria: "Cotovelo",
        regiaoAnatomica: ["cotovelo"],
        estruturasAfetadas: ["extensor_radial_curto_carpo", "origem_flexores_pronadores"],
        riscosClinicos: ["instabilidade_posterolateral", "persistencia_dor_epicondilar"]
    },
    "operou cotovelo de tenista": {
        exibicao: "Desbridamento / Liberação de Epicôndilo Lateral/Medial",
        categoria: "Cotovelo",
        regiaoAnatomica: ["cotovelo"],
        estruturasAfetadas: ["extensor_radial_curto_carpo", "origem_flexores_pronadores"],
        riscosClinicos: ["instabilidade_posterolateral", "persistencia_dor_epicondilar"]
    },
    "raspagem de epicondilite": {
        exibicao: "Desbridamento / Liberação de Epicôndilo Lateral/Medial",
        categoria: "Cotovelo",
        regiaoAnatomica: ["cotovelo"],
        estruturasAfetadas: ["extensor_radial_curto_carpo", "origem_flexores_pronadores"],
        riscosClinicos: ["instabilidade_posterolateral", "persistencia_dor_epicondilar"]
    },

    // --- PUNHO E MÃO ---
    "liberacao de tunel do carpo": {
        exibicao: "Descompressão do Nervo Mediano (Túnel do Carpo)",
        categoria: "Punho e Mão",
        regiaoAnatomica: ["punho", "mao", "membro_superior"],
        estruturasAfetadas: ["retinaculo_flexor", "nervo_mediano"],
        riscosClinicos: ["pillar_pain", "recidiva_parestesia", "perda_forca_pinça_oposição"]
    },
    "operou tunel do carpo": {
        exibicao: "Descompressão do Nervo Mediano (Túnel do Carpo)",
        categoria: "Punho e Mão",
        regiaoAnatomica: ["punho", "mao", "membro_superior"],
        estruturasAfetadas: ["retinaculo_flexor", "nervo_mediano"],
        riscosClinicos: ["pillar_pain", "recidiva_parestesia", "perda_forca_pinça_oposição"]
    },
    "cirurgia no pulso formigamento": {
        exibicao: "Descompressão do Nervo Mediano (Túnel do Carpo)",
        categoria: "Punho e Mão",
        regiaoAnatomica: ["punho", "mao", "membro_superior"],
        estruturasAfetadas: ["retinaculo_flexor", "nervo_mediano"],
        riscosClinicos: ["pillar_pain", "recidiva_parestesia", "perda_forca_pinça_oposição"]
    },

    "osteossintese de escafoide": {
        exibicao: "Osteossíntese de Escafóide (Parafuso de Herbert)",
        categoria: "Punho e Mão",
        regiaoAnatomica: ["punho", "mao"],
        estruturasAfetadas: ["escafoide", "vascularizacao_polo_proximal"],
        riscosClinicos: ["necrose_avascular_escafoide", "pseudoartrose", "colapso_carpal_snac"]
    },
    "pino no escafoide": {
        exibicao: "Osteossíntese de Escafóide (Parafuso de Herbert)",
        categoria: "Punho e Mão",
        regiaoAnatomica: ["punho", "mao"],
        estruturasAfetadas: ["escafoide", "vascularizacao_polo_proximal"],
        riscosClinicos: ["necrose_avascular_escafoide", "pseudoartrose", "colapso_carpal_snac"]
    },
    "cirurgia de osso da mao": {
        exibicao: "Osteossíntese de Escafóide (Parafuso de Herbert)",
        categoria: "Punho e Mão",
        regiaoAnatomica: ["punho", "mao"],
        estruturasAfetadas: ["escafoide", "vascularizacao_polo_proximal"],
        riscosClinicos: ["necrose_avascular_escafoide", "pseudoartrose", "colapso_carpal_snac"]
    },

    "osteossintese de radio distal": {
        exibicao: "Osteossíntese de Rádio Distal / Ulna",
        categoria: "Punho e Mão",
        regiaoAnatomica: ["punho", "membro_superior"],
        estruturasAfetadas: ["radio_distal", "articulacao_radioulnar_distal"],
        riscosClinicos: ["impacto_ulnocarpal", "ruptura_tendinea_extensor_longo_polegar", "perda_extensao_flexao"]
    },
    "placa no pulso": {
        exibicao: "Osteossíntese de Rádio Distal / Ulna",
        categoria: "Punho e Mão",
        regiaoAnatomica: ["punho", "membro_superior"],
        estruturasAfetadas: ["radio_distal", "articulacao_radioulnar_distal"],
        riscosClinicos: ["impacto_ulnocarpal", "ruptura_tendinea_extensor_longo_polegar", "perda_extensao_flexao"]
    },
    "pino no pulso": {
        exibicao: "Osteossíntese de Rádio Distal / Ulna",
        categoria: "Punho e Mão",
        regiaoAnatomica: ["punho", "membro_superior"],
        estruturasAfetadas: ["radio_distal", "articulacao_radioulnar_distal"],
        riscosClinicos: ["impacto_ulnocarpal", "ruptura_tendinea_extensor_longo_polegar", "perda_extensao_flexao"]
    },
    "operou fratura do pulso": {
        exibicao: "Osteossíntese de Rádio Distal / Ulna",
        categoria: "Punho e Mão",
        regiaoAnatomica: ["punho", "membro_superior"],
        estruturasAfetadas: ["radio_distal", "articulacao_radioulnar_distal"],
        riscosClinicos: ["impacto_ulnocarpal", "ruptura_tendinea_extensor_longo_polegar", "perda_extensao_flexao"]
    },

    "tenossinovite de quervain cirurgia": {
        exibicao: "Liberação do 1º Compartimento Extensor (De Quervain)",
        categoria: "Punho e Mão",
        regiaoAnatomica: ["punho", "mao"],
        estruturasAfetadas: ["abdutor_longo_polegar", "extensor_curto_polegar", "ramo_sensitivo_nervo_radial"],
        riscosClinicos: ["subluxacao_tendinea", "neuroma_nervo_radial_superficial"]
    },
    "operou tendinite no pulso": {
        exibicao: "Liberação do 1º Compartimento Extensor (De Quervain)",
        categoria: "Punho e Mão",
        regiaoAnatomica: ["punho", "mao"],
        estruturasAfetadas: ["abdutor_longo_polegar", "extensor_curto_polegar", "ramo_sensitivo_nervo_radial"],
        riscosClinicos: ["subluxacao_tendinea", "neuroma_nervo_radial_superficial"]
    },

    "dedo em gatilho cirurgia": {
        exibicao: "Liberação da Polia A1 (Dedo em Gatilho)",
        categoria: "Punho e Mão",
        regiaoAnatomica: ["mao"],
        estruturasAfetadas: ["polia_a1", "tendao_flexor_profundo_superficial"],
        riscosClinicos: ["arco_de_corda_tendineo", "parestesia_nervo_digital"]
    },
    "operou dedo enganchando": {
        exibicao: "Liberação da Polia A1 (Dedo em Gatilho)",
        categoria: "Punho e Mão",
        regiaoAnatomica: ["mao"],
        estruturasAfetadas: ["polia_a1", "tendao_flexor_profundo_superficial"],
        riscosClinicos: ["arco_de_corda_tendineo", "parestesia_nervo_digital"]
    },

    "fasciectomia de dupuytren": {
        exibicao: "Fasciectomia Palmar (Contratura de Dupuytren)",
        categoria: "Punho e Mão",
        regiaoAnatomica: ["mao"],
        estruturasAfetadas: ["fascia_palmar", "pediculo_vasculonervoso_digital"],
        riscosClinicos: ["recidiva_contratura", "necrosia_retalho_cutaneo", "rigidez_interfalangica"]
    },
    "operou mao travada para dentro": {
        exibicao: "Fasciectomia Palmar (Contratura de Dupuytren)",
        categoria: "Punho e Mão",
        regiaoAnatomica: ["mao"],
        estruturasAfetadas: ["fascia_palmar", "pediculo_vasculonervoso_digital"],
        riscosClinicos: ["recidiva_contratura", "necrosia_retalho_cutaneo", "rigidez_interfalangica"]
    },
// --- TORNOZELO E PÉ ---
    "sutura de tendao de aquiles": {
        exibicao: "Sutura / Reconstrução de Tendão de Aquiles (Calcâneo)",
        categoria: "Tornozelo e Pé",
        regiaoAnatomica: ["tornozelo", "pe", "membro_inferior"],
        estruturasAfetadas: ["tendao_calcaneo", "nervo_sural", "paratendao"],
        riscosClinicos: ["rerrotura_tendinea", "aderencia_cicatricial", "perda_propulsao_planitflexao"]
    },
    "operou tendao de aquiles": {
        exibicao: "Sutura / Reconstrução de Tendão de Aquiles (Calcâneo)",
        categoria: "Tornozelo e Pé",
        regiaoAnatomica: ["tornozelo", "pe", "membro_inferior"],
        estruturasAfetadas: ["tendao_calcaneo", "nervo_sural", "paratendao"],
        riscosClinicos: ["rerrotura_tendinea", "aderencia_cicatricial", "perda_propulsao_planitflexao"]
    },
    "rompeu tendao de aquiles cirurgia": {
        exibicao: "Sutura / Reconstrução de Tendão de Aquiles (Calcâneo)",
        categoria: "Tornozelo e Pé",
        regiaoAnatomica: ["tornozelo", "pe", "membro_inferior"],
        estruturasAfetadas: ["tendao_calcaneo", "nervo_sural", "paratendao"],
        riscosClinicos: ["rerrotura_tendinea", "aderencia_cicatricial", "perda_propulsao_planitflexao"]
    },
    "costura no calcanhar": {
        exibicao: "Sutura / Reconstrução de Tendão de Aquiles (Calcâneo)",
        categoria: "Tornozelo e Pé",
        regiaoAnatomica: ["tornozelo", "pe", "membro_inferior"],
        estruturasAfetadas: ["tendao_calcaneo", "nervo_sural", "paratendao"],
        riscosClinicos: ["rerrotura_tendinea", "aderencia_cicatricial", "perda_propulsao_planitflexao"]
    },

    "osteossintese de tornozelo": {
        exibicao: "Osteossíntese de Maleólo / Tornozelo (Placa / Parafusos)",
        categoria: "Tornozelo e Pé",
        regiaoAnatomica: ["tornozelo", "membro_inferior"],
        estruturasAfetadas: ["maleolo_lateral", "maleolo_medial", "sindesmose_tibiofibular"],
        riscosClinicos: ["rigidez_dorsiflexao", "artrose_postraumatica_talocrural", "sindesmose_incongruente"]
    },
    "placa no tornozelo": {
        exibicao: "Osteossíntese de Maleólo / Tornozelo (Placa / Parafusos)",
        categoria: "Tornozelo e Pé",
        regiaoAnatomica: ["tornozelo", "membro_inferior"],
        estruturasAfetadas: ["maleolo_lateral", "maleolo_medial", "sindesmose_tibiofibular"],
        riscosClinicos: ["rigidez_dorsiflexao", "artrose_postraumatica_talocrural", "sindesmose_incongruente"]
    },
    "pino no tornozelo": {
        exibicao: "Osteossíntese de Maleólo / Tornozelo (Placa / Parafusos)",
        categoria: "Tornozelo e Pé",
        regiaoAnatomica: ["tornozelo", "membro_inferior"],
        estruturasAfetadas: ["maleolo_lateral", "maleolo_medial", "sindesmose_tibiofibular"],
        riscosClinicos: ["rigidez_dorsiflexao", "artrose_postraumatica_talocrural", "sindesmose_incongruente"]
    },
    "parafuso no tornozelo": {
        exibicao: "Osteossíntese de Maleólo / Tornozelo (Placa / Parafusos)",
        categoria: "Tornozelo e Pé",
        regiaoAnatomica: ["tornozelo", "membro_inferior"],
        estruturasAfetadas: ["maleolo_lateral", "maleolo_medial", "sindesmose_tibiofibular"],
        riscosClinicos: ["rigidez_dorsiflexao", "artrose_postraumatica_talocrural", "sindesmose_incongruente"]
    },

    "artrodese de tornozelo": {
        exibicao: "Artrodese Subtalar / Tiobiotalar",
        categoria: "Tornozelo e Pé",
        regiaoAnatomica: ["tornozelo", "pe"],
        estruturasAfetadas: ["articulacao_talocrural", "articulacao_subtalar"],
        riscosClinicos: ["perda_mobilidade_eixo_frontal_sagital", "sobrecarga_articulacoes_mediope"]
    },
    "travar tornozelo cirurgia": {
        exibicao: "Artrodese Subtalar / Tiobiotalar",
        categoria: "Tornozelo e Pé",
        regiaoAnatomica: ["tornozelo", "pe"],
        estruturasAfetadas: ["articulacao_talocrural", "articulacao_subtalar"],
        riscosClinicos: ["perda_mobilidade_eixo_frontal_sagital", "sobrecarga_articulacoes_mediope"]
    },
    "fusao no tornozelo": {
        exibicao: "Artrodese Subtalar / Tiobiotalar",
        categoria: "Tornozelo e Pé",
        regiaoAnatomica: ["tornozelo", "pe"],
        estruturasAfetadas: ["articulacao_talocrural", "articulacao_subtalar"],
        riscosClinicos: ["perda_mobilidade_eixo_frontal_sagital", "sobrecarga_articulacoes_mediope"]
    },

    "reconstrucao ligamentar de tornozelo": {
        exibicao: "Procedimento de Broström / Ligamentoplastia de Tornozelo",
        categoria: "Tornozelo e Pé",
        regiaoAnatomica: ["tornozelo"],
        estruturasAfetadas: ["ligamento_talofibular_anterior", "ligamento_calcaneofibular"],
        riscosClinicos: ["rigidez_em_inversao", "sindrome_impacto_fibular_residual"]
    },
    "operou entorse de tornozelo": {
        exibicao: "Procedimento de Broström / Ligamentoplastia de Tornozelo",
        categoria: "Tornozelo e Pé",
        regiaoAnatomica: ["tornozelo"],
        estruturasAfetadas: ["ligamento_talofibular_anterior", "ligamento_calcaneofibular"],
        riscosClinicos: ["rigidez_em_inversao", "sindrome_impacto_fibular_residual"]
    },
    "cirurgia de hiperfrouxidao no tornozelo": {
        exibicao: "Procedimento de Broström / Ligamentoplastia de Tornozelo",
        categoria: "Tornozelo e Pé",
        regiaoAnatomica: ["tornozelo"],
        estruturasAfetadas: ["ligamento_talofibular_anterior", "ligamento_calcaneofibular"],
        riscosClinicos: ["rigidez_em_inversao", "sindrome_impacto_fibular_residual"]
    },

    "cirurgia de joanete": {
        exibicao: "Osteotomia de Hálux Valgo (Joanete)",
        categoria: "Tornozelo e Pé",
        regiaoAnatomica: ["pe"],
        estruturasAfetadas: ["primeiro_metatarso", "falange_proximal_halux", "sesamoides"],
        riscosClinicos: ["rigidez_mtf_halux", "metatarsalgia_de_transferencia", "hallux_varus_residual"]
    },
    "operou joanete": {
        exibicao: "Osteotomia de Hálux Valgo (Joanete)",
        categoria: "Tornozelo e Pé",
        regiaoAnatomica: ["pe"],
        estruturasAfetadas: ["primeiro_metatarso", "falange_proximal_halux", "sesamoides"],
        riscosClinicos: ["rigidez_mtf_halux", "metatarsalgia_de_transferencia", "hallux_varus_residual"]
    },
    "raspagem de joanete": {
        exibicao: "Osteotomia de Hálux Valgo (Joanete)",
        categoria: "Tornozelo e Pé",
        regiaoAnatomica: ["pe"],
        estruturasAfetadas: ["primeiro_metatarso", "falange_proximal_halux", "sesamoides"],
        riscosClinicos: ["rigidez_mtf_halux", "metatarsalgia_de_transferencia", "hallux_varus_residual"]
    },

    "cirurgia de fascite plantar": {
        exibicao: "Fasciotomia Plantar / Liberação de Esporão",
        categoria: "Tornozelo e Pé",
        regiaoAnatomica: ["pe"],
        estruturasAfetadas: ["fascia_plantar", "tuberosidade_calcanea"],
        riscosClinicos: ["colapso_arco_longitudinal_medial", "dor_lateral_colateral_cuboide"]
    },
    "operou esporao no pe": {
        exibicao: "Fasciotomia Plantar / Liberação de Esporão",
        categoria: "Tornozelo e Pé",
        regiaoAnatomica: ["pe"],
        estruturasAfetadas: ["fascia_plantar", "tuberosidade_calcanea"],
        riscosClinicos: ["colapso_arco_longitudinal_medial", "dor_lateral_colateral_cuboide"]
    },
    "liberacao da sola do pe": {
        exibicao: "Fasciotomia Plantar / Liberação de Esporão",
        categoria: "Tornozelo e Pé",
        regiaoAnatomica: ["pe"],
        estruturasAfetadas: ["fascia_plantar", "tuberosidade_calcanea"],
        riscosClinicos: ["colapso_arco_longitudinal_medial", "dor_lateral_colateral_cuboide"]
    },

    "cirurgia de neuroma de morton": {
        exibicao: "Ressecção de Neuroma de Morton",
        categoria: "Tornozelo e Pé",
        regiaoAnatomica: ["pe"],
        estruturasAfetadas: ["nervo_interdigital", "ligamento_metatarsal_transverso_profundo"],
        riscosClinicos: ["neuroma_de_amputacao", "parestesia_interdigital_permanente"]
    },
    "operou nervo do pe": {
        exibicao: "Ressecção de Neuroma de Morton",
        categoria: "Tornozelo e Pé",
        regiaoAnatomica: ["pe"],
        estruturasAfetadas: ["nervo_interdigital", "ligamento_metatarsal_transverso_profundo"],
        riscosClinicos: ["neuroma_de_amputacao", "parestesia_interdigital_permanente"]
    },

    // --- ABDOMINAIS, PÉLVICAS E CICATRIZES (IMPACTO FASCIAL E COLUNA) ---
    "cesarea": {
        exibicao: "Cesariana (Cicatriz Abdominal Baixa)",
        categoria: "Abdominal / Pélvica",
        regiaoAnatomica: ["abdome", "pelve", "coluna_lombar"],
        estruturasAfetadas: ["fascia_abdominal", "reto_abdominal", "utero"],
        riscosClinicos: ["aderencia_fascial_pelve", "inibicao_core", "dor_lombar_referida", "alteracao_mobilidade_visceral"]
    },
    "cesariana": {
        exibicao: "Cesariana (Cicatriz Abdominal Baixa)",
        categoria: "Abdominal / Pélvica",
        regiaoAnatomica: ["abdome", "pelve", "coluna_lombar"],
        estruturasAfetadas: ["fascia_abdominal", "reto_abdominal", "utero"],
        riscosClinicos: ["aderencia_fascial_pelve", "inibicao_core", "dor_lombar_referida", "alteracao_mobilidade_visceral"]
    },
    "corte de parto cesarea": {
        exibicao: "Cesariana (Cicatriz Abdominal Baixa)",
        categoria: "Abdominal / Pélvica",
        regiaoAnatomica: ["abdome", "pelve", "coluna_lombar"],
        estruturasAfetadas: ["fascia_abdominal", "reto_abdominal", "utero"],
        riscosClinicos: ["aderencia_fascial_pelve", "inibicao_core", "dor_lombar_referida", "alteracao_mobilidade_visceral"]
    },

    "abdominoplastia": {
        exibicao: "Abdominoplastia / Plicatura de Reto Abdominal",
        categoria: "Abdominal / Pélvica",
        regiaoAnatomica: ["abdome", "pelve", "coluna_lombar", "postura"],
        estruturasAfetadas: ["linha_alba", "reto_abdominal", "tecido_subcutaneo_torso"],
        riscosClinicos: ["extrema_tensa_fascial_anterior", "postura_em_flexao_tronco", "hipomobilidade_lombar", "seroma"]
    },
    "plasticas na barriga": {
        exibicao: "Abdominoplastia / Plicatura de Reto Abdominal",
        categoria: "Abdominal / Pélvica",
        regiaoAnatomica: ["abdome", "pelve", "coluna_lombar", "postura"],
        estruturasAfetadas: ["linha_alba", "reto_abdominal", "tecido_subcutaneo_torso"],
        riscosClinicos: ["extrema_tensa_fascial_anterior", "postura_em_flexao_tronco", "hipomobilidade_lombar", "seroma"]
    },
    "costura da diástase": {
        exibicao: "Abdominoplastia / Plicatura de Reto Abdominal",
        categoria: "Abdominal / Pélvica",
        regiaoAnatomica: ["abdome", "pelve", "coluna_lombar", "postura"],
        estruturasAfetadas: ["linha_alba", "reto_abdominal", "tecido_subcutaneo_torso"],
        riscosClinicos: ["extrema_tensa_fascial_anterior", "postura_em_flexao_tronco", "hipomobilidade_lombar", "seroma"]
    },

    "hernioplastia umbilical": {
        exibicao: "Hernioplastia Umbilical / Inguinal / Incisional",
        categoria: "Abdominal / Pélvica",
        regiaoAnatomica: ["abdome", "pelve"],
        estruturasAfetadas: ["parede_abdominal", "canal_inguinal", "fascia_transversalis"],
        riscosClinicos: ["dor_cronica_pos_herniorrafia", "aderencia_de_tela", "restricao_mobilidade_pelve"]
    },
    "operou hernia na barriga": {
        exibicao: "Hernioplastia Umbilical / Inguinal / Incisional",
        categoria: "Abdominal / Pélvica",
        regiaoAnatomica: ["abdome", "pelve"],
        estruturasAfetadas: ["parede_abdominal", "canal_inguinal", "fascia_transversalis"],
        riscosClinicos: ["dor_cronica_pos_herniorrafia", "aderencia_de_tela", "restricao_mobilidade_pelve"]
    },
    "operou hernia na virilha": {
        exibicao: "Hernioplastia Umbilical / Inguinal / Incisional",
        categoria: "Abdominal / Pélvica",
        regiaoAnatomica: ["abdome", "pelve"],
        estruturasAfetadas: ["parede_abdominal", "canal_inguinal", "fascia_transversalis"],
        riscosClinicos: ["dor_cronica_pos_herniorrafia", "aderencia_de_tela", "restricao_mobilidade_pelve"]
    },
    "tela na barriga": {
        exibicao: "Hernioplastia Umbilical / Inguinal / Incisional",
        categoria: "Abdominal / Pélvica",
        regiaoAnatomica: ["abdome", "pelve"],
        estruturasAfetadas: ["parede_abdominal", "canal_inguinal", "fascia_transversalis"],
        riscosClinicos: ["dor_cronica_pos_herniorrafia", "aderencia_de_tela", "restricao_mobilidade_pelve"]
    },

    "apendicectomia": {
        exibicao: "Apendicectomia (Retirada do Apêndice)",
        categoria: "Abdominal / Pélvica",
        regiaoAnatomica: ["abdome", "fossa_iliaca_direita"],
        estruturasAfetadas: ["peritonio", "cieco", "parede_abdominal_fossa_iliaca"],
        riscosClinicos: ["aderencias_viscerais_fossa_iliaca_direita", "restricao_mobilidade_ceco_ileo"]
    },
    "operou apendcite": {
        exibicao: "Apendicectomia (Retirada do Apêndice)",
        categoria: "Abdominal / Pélvica",
        regiaoAnatomica: ["abdome", "fossa_iliaca_direita"],
        estruturasAfetadas: ["peritonio", "cieco", "parede_abdominal_fossa_iliaca"],
        riscosClinicos: ["aderencias_viscerais_fossa_iliaca_direita", "restricao_mobilidade_ceco_ileo"]
    },
    "tirou o apendice": {
        exibicao: "Apendicectomia (Retirada do Apêndice)",
        categoria: "Abdominal / Pélvica",
        regiaoAnatomica: ["abdome", "fossa_iliaca_direita"],
        estruturasAfetadas: ["peritonio", "cieco", "parede_abdominal_fossa_iliaca"],
        riscosClinicos: ["aderencias_viscerais_fossa_iliaca_direita", "restricao_mobilidade_ceco_ileo"]
    },

    "colecistectomia": {
        exibicao: "Colecistectomia (Retirada da Vesícula Biliar)",
        categoria: "Abdominal / Pélvica",
        regiaoAnatomica: ["abdome", "hipocondrio_direito", "ombro_direito"],
        estruturasAfetadas: ["vesicula_biliar", "peritonio_subhepatico", "diafragma"],
        riscosClinicos: ["dor_referida_ombro_direito_nervo_frenico", "aderencia_subhepatica", "restricao_diafragmatica"]
    },
    "operou vesicula": {
        exibicao: "Colecistectomia (Retirada da Vesícula Biliar)",
        categoria: "Abdominal / Pélvica",
        regiaoAnatomica: ["abdome", "hipocondrio_direito", "ombro_direito"],
        estruturasAfetadas: ["vesicula_biliar", "peritonio_subhepatico", "diafragma"],
        riscosClinicos: ["dor_referida_ombro_direito_nervo_frenico", "aderencia_subhepatica", "restricao_diafragmatica"]
    },
    "tirou a vesicula": {
        exibicao: "Colecistectomia (Retirada da Vesícula Biliar)",
        categoria: "Abdominal / Pélvica",
        regiaoAnatomica: ["abdome", "hipocondrio_direito", "ombro_direito"],
        estruturasAfetadas: ["vesicula_biliar", "peritonio_subhepatico", "diafragma"],
        riscosClinicos: ["dor_referida_ombro_direito_nervo_frenico", "aderencia_subhepatica", "restricao_diafragmatica"]
    },
    "pedra na vesicula cirurgia": {
        exibicao: "Colecistectomia (Retirada da Vesícula Biliar)",
        categoria: "Abdominal / Pélvica",
        regiaoAnatomica: ["abdome", "hipocondrio_direito", "ombro_direito"],
        estruturasAfetadas: ["vesicula_biliar", "peritonio_subhepatico", "diafragma"],
        riscosClinicos: ["dor_referida_ombro_direito_nervo_frenico", "aderencia_subhepatica", "restricao_diafragmatica"]
    },

    "bariatrica": {
        exibicao: "Cirurgia Bariátrica (Bypass / Sleeve / Gastrectomia)",
        categoria: "Abdominal / Pélvica",
        regiaoAnatomica: ["abdome", "coluna_vertebral", "postura"],
        estruturasAfetadas: ["estomago", "jejuno", "parede_abdominal_superior"],
        riscosClinicos: ["perda_massa_magra_rapida", "sarcopenia_postural", "alteracao_centro_gravidade", "deficiencia_nutricional"]
    },
    "reducao de estomago": {
        exibicao: "Cirurgia Bariátrica (Bypass / Sleeve / Gastrectomia)",
        categoria: "Abdominal / Pélvica",
        regiaoAnatomica: ["abdome", "coluna_vertebral", "postura"],
        estruturasAfetadas: ["estomago", "jejuno", "parede_abdominal_superior"],
        riscosClinicos: ["perda_massa_magra_rapida", "sarcopenia_postural", "alteracao_centro_gravidade", "deficiencia_nutricional"]
    },
    "operou estomago pra emagrecer": {
        exibicao: "Cirurgia Bariátrica (Bypass / Sleeve / Gastrectomia)",
        categoria: "Abdominal / Pélvica",
        regiaoAnatomica: ["abdome", "coluna_vertebral", "postura"],
        estruturasAfetadas: ["estomago", "jejuno", "parede_abdominal_superior"],
        riscosClinicos: ["perda_massa_magra_rapida", "sarcopenia_postural", "alteracao_centro_gravidade", "deficiencia_nutricional"]
    },

    "histerectomia": {
        exibicao: "Histerectomia Total / Parcial (Retirada do Útero)",
        categoria: "Abdominal / Pélvica",
        regiaoAnatomica: ["pelve", "abdome", "coluna_lombar"],
        estruturasAfetadas: ["utero", "ligamentos_uterossacros", "assoalho_pelvico"],
        riscosClinicos: ["prolapso_vaginal_vesical", "disfuncao_assoalho_pelvico", "aderencia_pelvica_lombar"]
    },
    "tirou o utero": {
        exibicao: "Histerectomia Total / Parcial (Retirada do Útero)",
        categoria: "Abdominal / Pélvica",
        regiaoAnatomica: ["pelve", "abdome", "coluna_lombar"],
        estruturasAfetadas: ["utero", "ligamentos_uterossacros", "assoalho_pelvico"],
        riscosClinicos: ["prolapso_vaginal_vesical", "disfuncao_assoalho_pelvico", "aderencia_pelvica_lombar"]
    },
    "operou utero": {
        exibicao: "Histerectomia Total / Parcial (Retirada do Útero)",
        categoria: "Abdominal / Pélvica",
        regiaoAnatomica: ["pelve", "abdome", "coluna_lombar"],
        estruturasAfetadas: ["utero", "ligamentos_uterossacros", "assoalho_pelvico"],
        riscosClinicos: ["prolapso_vaginal_vesical", "disfuncao_assoalho_pelvico", "aderencia_pelvica_lombar"]
    },

    "cirurgia de endometriose": {
        exibicao: "Cauterização / Exerese de Focos de Endometriose",
        categoria: "Abdominal / Pélvica",
        regiaoAnatomica: ["pelve", "abdome", "coluna_lumbar"],
        estruturasAfetadas: ["peritonio_pelvico", "ligamentos_pélvicos", "septo_retovaginal"],
        riscosClinicos: ["fibrose_pelvica_extensa", "dor_pelvica_cronica", "sindrome_miofascial_pelvica"]
    },
    "raspagem de endometriose": {
        exibicao: "Cauterização / Exerese de Focos de Endometriose",
        categoria: "Abdominal / Pélvica",
        regiaoAnatomica: ["pelve", "abdome", "coluna_lumbar"],
        estruturasAfetadas: ["peritonio_pelvico", "ligamentos_pélvicos", "septo_retovaginal"],
        riscosClinicos: ["fibrose_pelvica_extensa", "dor_pelvica_cronica", "sindrome_miofascial_pelvica"]
    },
    "operou endometriose": {
        exibicao: "Cauterização / Exerese de Focos de Endometriose",
        categoria: "Abdominal / Pélvica",
        regiaoAnatomica: ["pelve", "abdome", "coluna_lumbar"],
        estruturasAfetadas: ["peritonio_pelvico", "ligamentos_pélvicos", "septo_retovaginal"],
        riscosClinicos: ["fibrose_pelvica_extensa", "dor_pelvica_cronica", "sindrome_miofascial_pelvica"]
    },
// --- TORÁCICAS E CARDIOVASCULARES ---
    "cirurgia cardiaca aberta": {
        exibicao: "Esternotomia / Revascularização do Miocárdio",
        categoria: "Torácica / Cardíaca",
        regiaoAnatomica: ["torax", "coluna_toracica", "cintura_escapular"],
        estruturasAfetadas: ["esterno", "cartilagens_costais", "peitoral_maior"],
        riscosClinicos: ["pseudoartrose_esternal", "hipomobilidade_caixa_toracica", "dor_miofascial_intercostal", "postura_antalgica_em_flexao"]
    },
    "ponte de safena": {
        exibicao: "Esternotomia / Revascularização do Miocárdio",
        categoria: "Torácica / Cardíaca",
        regiaoAnatomica: ["torax", "coluna_toracica", "cintura_escapular", "membro_inferior"],
        estruturasAfetadas: ["esterno", "veia_safena_magna", "peitoral_maior"],
        riscosClinicos: ["pseudoartrose_esternal", "edema_membro_inferior_doador", "hipomobilidade_toracica"]
    },
    "ponte de mamaria": {
        exibicao: "Esternotomia / Revascularização do Miocárdio",
        categoria: "Torácica / Cardíaca",
        regiaoAnatomica: ["torax", "coluna_toracica", "cintura_escapular"],
        estruturasAfetadas: ["esterno", "arteria_toracica_interna", "peitoral_maior"],
        riscosClinicos: ["pseudoartrose_esternal", "hipomobilidade_caixa_toracica", "dor_parede_toracica_anterior"]
    },
    "trocou valvula do coracao": {
        exibicao: "Esternotomia / Troca Valvar Cardíaca",
        categoria: "Torácica / Cardíaca",
        regiaoAnatomica: ["torax", "coluna_toracica"],
        estruturasAfetadas: ["esterno", "pericardio"],
        riscosClinicos: ["hipomobilidade_caixa_toracica", "restricao_expansibilidade_pulmonar"]
    },
    "corte no meio do peito": {
        exibicao: "Esternotomia / Cirurgia Cardíaca Aberta",
        categoria: "Torácica / Cardíaca",
        regiaoAnatomica: ["torax", "coluna_toracica"],
        estruturasAfetadas: ["esterno", "peitoral_maior"],
        riscosClinicos: ["pseudoartrose_esternal", "aderencia_cicatricial_esternal"]
    },

    "implante de marcapasso": {
        exibicao: "Implante de Marcapasso Cardiaco Subcutâneo",
        categoria: "Torácica / Cardíaca",
        regiaoAnatomica: ["torax", "ombro"],
        estruturasAfetadas: ["loja_subcutanea_infraclavicular", "veia_subclavia"],
        riscosClinicos: ["restricao_abducao_ombro_fase_inicial", "aderencia_loja_gerador"]
    },
    "colocou marcapasso": {
        exibicao: "Implante de Marcapasso Cardiaco Subcutâneo",
        categoria: "Torácica / Cardíaca",
        regiaoAnatomica: ["torax", "ombro"],
        estruturasAfetadas: ["loja_subcutanea_infraclavicular", "veia_subclavia"],
        riscosClinicos: ["restricao_abducao_ombro_fase_inicial", "aderencia_loja_gerador"]
    },

    "simpatectomia": {
        exibicao: "Simpatectomia Torácica (Hiperidrose)",
        categoria: "Torácica / Cardíaca",
        regiaoAnatomica: ["torax", "coluna_toracica"],
        estruturasAfetadas: ["cadeia_simpatica_toracica", "espaco_pleural"],
        riscosClinicos: ["sindrome_horner_raro", "hiperidrose_compensatoria", "dor_neuropatica_intercostal"]
    },
    "operou suor excessivo": {
        exibicao: "Simpatectomia Torácica (Hiperidrose)",
        categoria: "Torácica / Cardíaca",
        regiaoAnatomica: ["torax", "coluna_toracica"],
        estruturasAfetadas: ["cadeia_simpatica_toracica", "espaco_pleural"],
        riscosClinicos: ["sindrome_horner_raro", "hiperidrose_compensatoria", "dor_neuropatica_intercostal"]
    },

    "cirurgia de varizes": {
        exibicao: "Safenectomia / Escleroterapia Vascular de MMI",
        categoria: "Vascular",
        regiaoAnatomica: ["membro_inferior"],
        estruturasAfetadas: ["veia_safena", "tecido_subcutaneo_perna"],
        riscosClinicos: ["parestesia_nervo_safeno", "hematoma_trajeto", "edema_residual_tornozelo"]
    },
    "operou varizes": {
        exibicao: "Safenectomia / Escleroterapia Vascular de MMI",
        categoria: "Vascular",
        regiaoAnatomica: ["membro_inferior"],
        estruturasAfetadas: ["veia_safena", "tecido_subcutaneo_perna"],
        riscosClinicos: ["parestesia_nervo_safeno", "hematoma_trajeto", "edema_residual_tornozelo"]
    },
    "tirou veia safena": {
        exibicao: "Safenectomia / Escleroterapia Vascular de MMI",
        categoria: "Vascular",
        regiaoAnatomica: ["membro_inferior"],
        estruturasAfetadas: ["veia_safena", "tecido_subcutaneo_perna"],
        riscosClinicos: ["parestesia_nervo_safeno", "hematoma_trajeto", "edema_residual_tornozelo"]
    },

    "fistula arteriovenosa": {
        exibicao: "Confecção de Fístula Arteriovenosa (Hemodiálise)",
        categoria: "Vascular",
        regiaoAnatomica: ["membro_superior", "antebraço"],
        estruturasAfetadas: ["arteria_radial_ou_braquial", "veia_cefalica_ou_basilica"],
        riscosClinicos: ["sindrome_roubo_vascular", "hipotrofia_muscular_distal", "vulnerabilidade_trauma_local"]
    },
    "operou braco pra hemodialise": {
        exibicao: "Confecção de Fístula Arteriovenosa (Hemodiálise)",
        categoria: "Vascular",
        regiaoAnatomica: ["membro_superior", "antebraço"],
        estruturasAfetadas: ["arteria_radial_ou_braquial", "veia_cefalica_ou_basilica"],
        riscosClinicos: ["sindrome_roubo_vascular", "hipotrofia_muscular_distal", "vulnerabilidade_trauma_local"]
    },

    // --- PLÁSTICAS, MAMÁRIAS E ESTÉTICAS ---
    "mamoplastia de aumento": {
        exibicao: "Inclusão de Prótese de Silicone Mamária",
        categoria: "Mamária / Estética",
        regiaoAnatomica: ["torax", "cintura_escapular", "ombro"],
        estruturasAfetadas: ["peitoral_maior", "glandula_mamaria", "fascia_pectoral"],
        riscosClinicos: ["contratura_capsular", "retracao_fascial_peitoral", "encurtamento_cadeia_anterior_ombro"]
    },
    "protese de silicone peito": {
        exibicao: "Inclusão de Prótese de Silicone Mamária",
        categoria: "Mamária / Estética",
        regiaoAnatomica: ["torax", "cintura_escapular", "ombro"],
        estruturasAfetadas: ["peitoral_maior", "glandula_mamaria", "fascia_pectoral"],
        riscosClinicos: ["contratura_capsular", "retracao_fascial_peitoral", "encurtamento_cadeia_anterior_ombro"]
    },
    "colocou silicone no peito": {
        exibicao: "Inclusão de Prótese de Silicone Mamária",
        categoria: "Mamária / Estética",
        regiaoAnatomica: ["torax", "cintura_escapular", "ombro"],
        estruturasAfetadas: ["peitoral_maior", "glandula_mamaria", "fascia_pectoral"],
        riscosClinicos: ["contratura_capsular", "retracao_fascial_peitoral", "encurtamento_cadeia_anterior_ombro"]
    },

    "explante mamario": {
        exibicao: "Explante de Prótese de Silicone Mamária / Capsulotomia",
        categoria: "Mamária / Estética",
        regiaoAnatomica: ["torax", "cintura_escapular", "ombro"],
        estruturasAfetadas: ["peitoral_maior", "capsula_fibrosa", "fascia_toracica"],
        riscosClinicos: ["aderencia_retrosternal", "alteracao_dinamica_peitoral"]
    },
    "tirou o silicone": {
        exibicao: "Explante de Prótese de Silicone Mamária / Capsulotomia",
        categoria: "Mamária / Estética",
        regiaoAnatomica: ["torax", "cintura_escapular", "ombro"],
        estruturasAfetadas: ["peitoral_maior", "capsula_fibrosa", "fascia_toracica"],
        riscosClinicos: ["aderencia_retrosternal", "alteracao_dinamica_peitoral"]
    },
    "retirada de silicone": {
        exibicao: "Explante de Prótese de Silicone Mamária / Capsulotomia",
        categoria: "Mamária / Estética",
        regiaoAnatomica: ["torax", "cintura_escapular", "ombro"],
        estruturasAfetadas: ["peitoral_maior", "capsula_fibrosa", "fascia_toracica"],
        riscosClinicos: ["aderencia_retrosternal", "alteracao_dinamica_peitoral"]
    },

    "mamoplastia redutora": {
        exibicao: "Mamoplastia Redutora / Mastopexia",
        categoria: "Mamária / Estética",
        regiaoAnatomica: ["torax", "coluna_toracica", "cintura_escapular"],
        estruturasAfetadas: ["glandula_mamaria", "tecido_adiposo", "pele_toracica"],
        riscosClinicos: ["alteracao_postural_pos_readequacao_peso", "aderencia_cicatricial_sulco_mamario"]
    },
    "reducao de mama": {
        exibicao: "Mamoplastia Redutora / Mastopexia",
        categoria: "Mamária / Estética",
        regiaoAnatomica: ["torax", "coluna_toracica", "cintura_escapular"],
        estruturasAfetadas: ["glandula_mamaria", "tecido_adiposo", "pele_toracica"],
        riscosClinicos: ["alteracao_postural_pos_readequacao_peso", "aderencia_cicatricial_sulco_mamario"]
    },
    "operou peito muito grande": {
        exibicao: "Mamoplastia Redutora / Mastopexia",
        categoria: "Mamária / Estética",
        regiaoAnatomica: ["torax", "coluna_toracica", "cintura_escapular"],
        estruturasAfetadas: ["glandula_mamaria", "tecido_adiposo", "pele_toracica"],
        riscosClinicos: ["alteracao_postural_pos_readequacao_peso", "aderencia_cicatricial_sulco_mamario"]
    },

    "mastectomia": {
        exibicao: "Mastectomia Total / Parcial (Reconstrução Mamária)",
        categoria: "Mamária / Oncológica",
        regiaoAnatomica: ["torax", "cintura_escapular", "ombro", "membro_superior"],
        estruturasAfetadas: ["peitoral_maior", "peitoral_menor", "serratil_anterior", "nervo_toracico_longo"],
        riscosClinicos: ["escapula_alada", "linfedema_membro_superior", "restricao_adm_ombro", "sindrome_cordao_linfatico_cording"]
    },
    "retirada da mama": {
        exibicao: "Mastectomia Total / Parcial (Reconstrução Mamária)",
        categoria: "Mamária / Oncológica",
        regiaoAnatomica: ["torax", "cintura_escapular", "ombro", "membro_superior"],
        estruturasAfetadas: ["peitoral_maior", "peitoral_menor", "serratil_anterior", "nervo_toracico_longo"],
        riscosClinicos: ["escapula_alada", "linfedema_membro_superior", "restricao_adm_ombro", "sindrome_cordao_linfatico_cording"]
    },
    "operou cancer de mama": {
        exibicao: "Mastectomia Total / Parcial (Reconstrução Mamária)",
        categoria: "Mamária / Oncológica",
        regiaoAnatomica: ["torax", "cintura_escapular", "ombro", "membro_superior"],
        estruturasAfetadas: ["peitoral_maior", "peitoral_menor", "serratil_anterior", "nervo_toracico_longo"],
        riscosClinicos: ["escapula_alada", "linfedema_membro_superior", "restricao_adm_ombro", "sindrome_cordao_linfatico_cording"]
    },

    "esvaziamento ganglionar axilar": {
        exibicao: "Linfadenectomia Axilar (Risco de Linfedema)",
        categoria: "Mamária / Oncológica",
        regiaoAnatomica: ["axila", "ombro", "cintura_escapular", "membro_superior"],
        estruturasAfetadas: ["linfonodos_axilares", "nervo_intercostobraquial", "nervo_toraco_dorsal"],
        riscosClinicos: ["linfedema_membro_superior", "parestesia_face_medial_braco", "deficit_latissimo_do_dorso"]
    },
    "tirou ganglios da axila": {
        exibicao: "Linfadenectomia Axilar (Risco de Linfedema)",
        categoria: "Mamária / Oncológica",
        regiaoAnatomica: ["axila", "ombro", "cintura_escapular", "membro_superior"],
        estruturasAfetadas: ["linfonodos_axilares", "nervo_intercostobraquial", "nervo_toraco_dorsal"],
        riscosClinicos: ["linfedema_membro_superior", "parestesia_face_medial_braco", "deficit_latissimo_do_dorso"]
    },
    "linfonodo axilar cirurgia": {
        exibicao: "Linfadenectomia Axilar (Risco de Linfedema)",
        categoria: "Mamária / Oncológica",
        regiaoAnatomica: ["axila", "ombro", "cintura_escapular", "membro_superior"],
        estruturasAfetadas: ["linfonodos_axilares", "nervo_intercostobraquial", "nervo_toraco_dorsal"],
        riscosClinicos: ["linfedema_membro_superior", "parestesia_face_medial_braco", "deficit_latissimo_do_dorso"]
    },

    "liposuccao": {
        exibicao: "Lipoaspiração / Lipoescultura (Torse / Membros)",
        categoria: "Plástica / Estética",
        regiaoAnatomica: ["abdome", "dorso", "membros"],
        estruturasAfetadas: ["tecido_adiposo_subcutaneo", "fascia_superficial"],
        riscosClinicos: ["fibrose_subcutanea_difusa", "aderencias_fasciais_extensas", "alteracao_sensibilidade_cutanea"]
    },
    "lipo": {
        exibicao: "Lipoaspiração / Lipoescultura (Torse / Membros)",
        categoria: "Plástica / Estética",
        regiaoAnatomica: ["abdome", "dorso", "membros"],
        estruturasAfetadas: ["tecido_adiposo_subcutaneo", "fascia_superficial"],
        riscosClinicos: ["fibrose_subcutanea_difusa", "aderencias_fasciais_extensas", "alteracao_sensibilidade_cutanea"]
    },
    "lipo hd": {
        exibicao: "Lipoaspiração / Lipoescultura (Torse / Membros)",
        categoria: "Plástica / Estética",
        regiaoAnatomica: ["abdome", "dorso", "membros"],
        estruturasAfetadas: ["tecido_adiposo_subcutaneo", "fascia_superficial"],
        riscosClinicos: ["fibrose_subcutanea_difusa", "aderencias_fasciais_extensas", "alteracao_sensibilidade_cutanea"]
    },
// --- CABEÇA, PESCOÇO E TRAUMA FACIAL ---
    "artroplastia de atm": {
        exibicao: "Artroplastia / Cirurgia de ATM (Mandíbula)",
        categoria: "Cabeça e Pescoço",
        regiaoAnatomica: ["atm", "cabeca", "pescoco", "coluna_cervical"],
        estruturasAfetadas: ["disco_articular_atm", "condilo_mandibular", "musculo_pterigoideo_lateral"],
        riscosClinicos: ["limitacao_abertura_bucal", "desvio_mandibular_na_abertura", "dor_orofacial_referida_cervical"]
    },
    "operou mandibula": {
        exibicao: "Artroplastia / Cirurgia de ATM (Mandíbula)",
        categoria: "Cabeça e Pescoço",
        regiaoAnatomica: ["atm", "cabeca", "pescoco", "coluna_cervical"],
        estruturasAfetadas: ["disco_articular_atm", "condilo_mandibular", "musculo_pterigoideo_lateral"],
        riscosClinicos: ["limitacao_abertura_bucal", "desvio_mandibular_na_abertura", "dor_orofacial_referida_cervical"]
    },
    "cirurgia na articulacao da boca": {
        exibicao: "Artroplastia / Cirurgia de ATM (Mandíbula)",
        categoria: "Cabeça e Pescoço",
        regiaoAnatomica: ["atm", "cabeca", "pescoco", "coluna_cervical"],
        estruturasAfetadas: ["disco_articular_atm", "condilo_mandibular", "musculo_pterigoideo_lateral"],
        riscosClinicos: ["limitacao_abertura_bucal", "desvio_mandibular_na_abertura", "dor_orofacial_referida_cervical"]
    },
    "cirurgia de estalo na mandibula": {
        exibicao: "Artroplastia / Cirurgia de ATM (Mandíbula)",
        categoria: "Cabeça e Pescoço",
        regiaoAnatomica: ["atm", "cabeca", "pescoco", "coluna_cervical"],
        estruturasAfetadas: ["disco_articular_atm", "condilo_mandibular", "musculo_pterigoideo_lateral"],
        riscosClinicos: ["limitacao_abertura_bucal", "desvio_mandibular_na_abertura", "dor_orofacial_referida_cervical"]
    },

    "cirurgia ortognatica": {
        exibicao: "Osteotomia Ortognática (Maxilar / Mandíbula)",
        categoria: "Cabeça e Pescoço",
        regiaoAnatomica: ["face", "atm", "coluna_cervical"],
        estruturasAfetadas: ["maxila", "mandibula", "nervo_alveolar_inferior"],
        riscosClinicos: ["parestesia_labial_queixo", "alteracao_padrao_masticatorio", "tensao_muscular_cervico_facial"]
    },
    "ortognatica": {
        exibicao: "Osteotomia Ortognática (Maxilar / Mandíbula)",
        categoria: "Cabeça e Pescoço",
        regiaoAnatomica: ["face", "atm", "coluna_cervical"],
        estruturasAfetadas: ["maxila", "mandibula", "nervo_alveolar_inferior"],
        riscosClinicos: ["parestesia_labial_queixo", "alteracao_padrao_masticatorio", "tensao_muscular_cervico_facial"]
    },
    "operou queixo e morder": {
        exibicao: "Osteotomia Ortognática (Maxilar / Mandíbula)",
        categoria: "Cabeça e Pescoço",
        regiaoAnatomica: ["face", "atm", "coluna_cervical"],
        estruturasAfetadas: ["maxila", "mandibula", "nervo_alveolar_inferior"],
        riscosClinicos: ["parestesia_labial_queixo", "alteracao_padrao_masticatorio", "tensao_muscular_cervico_facial"]
    },

    "tiroidectomia": {
        exibicao: "Tireoidectomia Total / Parcial (Pescoço)",
        categoria: "Cabeça e Pescoço",
        regiaoAnatomica: ["pescoco", "coluna_cervical"],
        estruturasAfetadas: ["glandula_tireoide", "musculos_infra_hioideos", "nervo_laringeo_recorrente"],
        riscosClinicos: ["aderencia_cicatricial_cervical_anterior", "postura_post_cervical_em_flexao", "restricao_extensao_cervical"]
    },
    "operou tireoide": {
        exibicao: "Tireoidectomia Total / Parcial (Pescoço)",
        categoria: "Cabeça e Pescoço",
        regiaoAnatomica: ["pescoco", "coluna_cervical"],
        estruturasAfetadas: ["glandula_tireoide", "musculos_infra_hioideos", "nervo_laringeo_recorrente"],
        riscosClinicos: ["aderencia_cicatricial_cervical_anterior", "postura_post_cervical_em_flexao", "restricao_extensao_cervical"]
    },
    "tirou a tireoide": {
        exibicao: "Tireoidectomia Total / Parcial (Pescoço)",
        categoria: "Cabeça e Pescoço",
        regiaoAnatomica: ["pescoco", "coluna_cervical"],
        estruturasAfetadas: ["glandula_tireoide", "musculos_infra_hioideos", "nervo_laringeo_recorrente"],
        riscosClinicos: ["aderencia_cicatricial_cervical_anterior", "postura_post_cervical_em_flexao", "restricao_extensao_cervical"]
    },

    "artrodese cervical occipital": {
        exibicao: "Fixação Occipitocervical / Coluna Cervical Alta",
        categoria: "Cabeça e Pescoço",
        regiaoAnatomica: ["coluna_cervical", "cabeca"],
        estruturasAfetadas: ["escama_occipital", "c1_atlas", "c2_subaxial"],
        riscosClinicos: ["perda_quase_total_rotacao_flexoextensao_cervical_alta", "sobrecarga_cervical_baixa"]
    },
    "cirurgia na nuca": {
        exibicao: "Fixação Occipitocervical / Coluna Cervical Alta",
        categoria: "Cabeça e Pescoço",
        regiaoAnatomica: ["coluna_cervical", "cabeca"],
        estruturasAfetadas: ["escama_occipital", "c1_atlas", "c2_subaxial"],
        riscosClinicos: ["perda_quase_total_rotacao_flexoextensao_cervical_alta", "sobrecarga_cervical_baixa"]
    },

    // --- AMPUTAÇÕES, ENXERTOS E FIXADORES EXTERNOS ---
    "amputacao de membro inferior": {
        exibicao: "Amputação Transtibial / Transfemoral (MMII)",
        categoria: "Amputações e Traumas Complexos",
        regiaoAnatomica: ["membro_inferior", "coxa", "perna", "pelve"],
        estruturasAfetadas: ["osso_femur_ou_tibia", "coxim_muscular_mioplastia", "feixe_vasculonervoso_principal"],
        riscosClinicos: ["dor_membro_fantasma", "neuroma_de_amputacao", "contratura_em_flexao_quidril_joelho", "revelacao_postural"]
    },
    "amputou a perna": {
        exibicao: "Amputação Transtibial / Transfemoral (MMII)",
        categoria: "Amputações e Traumas Complexos",
        regiaoAnatomica: ["membro_inferior", "coxa", "perna", "pelve"],
        estruturasAfetadas: ["osso_femur_ou_tibia", "coxim_muscular_mioplastia", "feixe_vasculonervoso_principal"],
        riscosClinicos: ["dor_membro_fantasma", "neuroma_de_amputacao", "contratura_em_flexao_quidril_joelho", "revelacao_postural"]
    },
    "perda de membro perna": {
        exibicao: "Amputação Transtibial / Transfemoral (MMII)",
        categoria: "Amputações e Traumas Complexos",
        regiaoAnatomica: ["membro_inferior", "coxa", "perna", "pelve"],
        estruturasAfetadas: ["osso_femur_ou_tibia", "coxim_muscular_mioplastia", "feixe_vasculonervoso_principal"],
        riscosClinicos: ["dor_membro_fantasma", "neuroma_de_amputacao", "contratura_em_flexao_quidril_joelho", "revelacao_postural"]
    },

    "amputacao de membro superior": {
        exibicao: "Amputação Transradial / Transhumeral (MMSS)",
        categoria: "Amputações e Traumas Complexos",
        regiaoAnatomica: ["membro_superior", "braco", "antebroaco", "cintura_escapular"],
        estruturasAfetadas: ["osso_umero_ou_radio_ulna", "plexo_braquial_distal", "musculatura_braco_antebraço"],
        riscosClinicos: ["dor_membro_fantasma", "neuroma_de_amputacao", "assimetria_cintura_escapular"]
    },
    "amputou o braco": {
        exibicao: "Amputação Transradial / Transhumeral (MMSS)",
        categoria: "Amputações e Traumas Complexos",
        regiaoAnatomica: ["membro_superior", "braco", "antebroaco", "cintura_escapular"],
        estruturasAfetadas: ["osso_umero_ou_radio_ulna", "plexo_braquial_distal", "musculatura_braco_antebraço"],
        riscosClinicos: ["dor_membro_fantasma", "neuroma_de_amputacao", "assimetria_cintura_escapular"]
    },
    "perda de membro braco": {
        exibicao: "Amputação Transradial / Transhumeral (MMSS)",
        categoria: "Amputações e Traumas Complexos",
        regiaoAnatomica: ["membro_superior", "braco", "antebroaco", "cintura_escapular"],
        estruturasAfetadas: ["osso_umero_ou_radio_ulna", "plexo_braquial_distal", "musculatura_braco_antebraço"],
        riscosClinicos: ["dor_membro_fantasma", "neuroma_de_amputacao", "assimetria_cintura_escapular"]
    },

    "fixador externo": {
        exibicao: "Osteossíntese com Fixador Externo (Gaiola / Ilizarov)",
        categoria: "Amputações e Traumas Complexos",
        regiaoAnatomica: ["membro_inferior", "membro_superior"],
        estruturasAfetadas: ["pinos_schanz", "fios_kirschner", "periosteo", "tecido_subcutaneo"],
        riscosClinicos: ["infecção_trajeto_pino", "arthrofibrose_por_transfixacao_muscular", "rigidez_articular_adjacente"]
    },
    "gaiola na perna": {
        exibicao: "Osteossíntese com Fixador Externo (Gaiola / Ilizarov)",
        categoria: "Amputações e Traumas Complexos",
        regiaoAnatomica: ["membro_inferior", "membro_superior"],
        estruturasAfetadas: ["pinos_schanz", "fios_kirschner", "periosteo", "tecido_subcutaneo"],
        riscosClinicos: ["infecção_trajeto_pino", "arthrofibrose_por_transfixacao_muscular", "rigidez_articular_adjacente"]
    },
    "pino por fora da pele": {
        exibicao: "Osteossíntese com Fixador Externo (Gaiola / Ilizarov)",
        categoria: "Amputações e Traumas Complexos",
        regiaoAnatomica: ["membro_inferior", "membro_superior"],
        estruturasAfetadas: ["pinos_schanz", "fios_kirschner", "periosteo", "tecido_subcutaneo"],
        riscosClinicos: ["infecção_trajeto_pino", "arthrofibrose_por_transfixacao_muscular", "rigidez_articular_adjacente"]
    },
    "ilizarov": {
        exibicao: "Osteossíntese com Fixador Externo (Gaiola / Ilizarov)",
        categoria: "Amputações e Traumas Complexos",
        regiaoAnatomica: ["membro_inferior", "membro_superior"],
        estruturasAfetadas: ["pinos_schanz", "fios_kirschner", "periosteo", "tecido_subcutaneo"],
        riscosClinicos: ["infecção_trajeto_pino", "arthrofibrose_por_transfixacao_muscular", "rigidez_articular_adjacente"]
    },

    "enxerto osseo": {
        exibicao: "Enxerto Ósseo Autólogo / Homólogo",
        categoria: "Amputações e Traumas Complexos",
        regiaoAnatomica: ["sitio_doador_crista_iliaca", "sitio_receptor"],
        estruturasAfetadas: ["crista_iliaca", "matriz_ossea"],
        riscosClinicos: ["dor_cronica_sitio_doador_crista_iliaca", "parestesia_nervo_cutaneo_femoral_lateral"]
    },
    "colocou osso da bacia": {
        exibicao: "Enxerto Ósseo Autólogo / Homólogo",
        categoria: "Amputações e Traumas Complexos",
        regiaoAnatomica: ["sitio_doador_crista_iliaca", "sitio_receptor"],
        estruturasAfetadas: ["crista_iliaca", "matriz_ossea"],
        riscosClinicos: ["dor_cronica_sitio_doador_crista_iliaca", "parestesia_nervo_cutaneo_femoral_lateral"]
    },
    "preenchimento osseo cirurgia": {
        exibicao: "Enxerto Ósseo Autólogo / Homólogo",
        categoria: "Amputações e Traumas Complexos",
        regiaoAnatomica: ["sitio_doador_crista_iliaca", "sitio_receptor"],
        estruturasAfetadas: ["crista_iliaca", "matriz_ossea"],
        riscosClinicos: ["dor_cronica_sitio_doador_crista_iliaca", "parestesia_nervo_cutaneo_femoral_lateral"]
    }
};