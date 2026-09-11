/* KineSys — extensão clínica regional punho_mao 1.0.0.
 * Gerada deterministicamente de condicoes_mobilidade_v23.js + diferenciais_neurais.js.
 * Não editar manualmente sem atualizar o contrato de equivalência.
 */
(function(){
  'use strict';
  if(typeof BANCO_MAPEAMENTO_CLINICO==='undefined')return;
  const r=BANCO_MAPEAMENTO_CLINICO["punho_mao"];
  if(!r)return;
  Object.assign(r,{
  "palavrasChave": [
    "punho",
    "mao",
    "dedo",
    "polegar",
    "carpo",
    "escafoide",
    "formigamento",
    "dedo em gatilho",
    "trigger finger",
    "dupuytren",
    "dedo travando",
    "dedo em martelo",
    "boutonniere",
    "rigidez dos dedos",
    "dedos rigidos"
  ],
  "diferenciais": [
    {
      "id": "tfcc",
      "nome": "Lesão do Complexo da Fibrocartilagem Triangular (TFCC)",
      "testes": [
        "Dor ulnar do punho com carga/rotação",
        "Fovea Sign doloroso",
        "Ulnar grind / press test reproduz dor em contexto compatível"
      ],
      "interpretacao": "A suspeita de TFCC depende de localização ulnar, mecanismo e provocação por carga/rotação. Trauma com instabilidade da DRUJ merece avaliação especializada."
    },
    {
      "id": "instabilidade_escafolunar",
      "nome": "Lesão / Instabilidade Escafolunar",
      "testes": [
        "Dor dorsal-radial após queda/trauma",
        "Watson / Scaphoid Shift reproduz dor/clunk concordante",
        "Sinais de instabilidade persistente"
      ],
      "interpretacao": "Lesão escafolunar relevante pode evoluir para instabilidade crônica. Trauma importante com dor persistente requer imagem/especialista."
    },
    {
      "id": "rizartrose",
      "nome": "Osteoartrite CMC do Polegar / Rizartrose",
      "testes": [
        "Dor na base do polegar relacionada a pinça/preensão",
        "Grind test reproduz dor/crepitação em contexto compatível",
        "Redução funcional de pinça / deformidade em casos avançados"
      ],
      "interpretacao": "Dor típica de base do polegar e limitação funcional sustentam OA CMC; Grind positivo isolado não determina gravidade."
    },
    {
      "id": "radiculopatia_neuropatia_proximal",
      "nome": "Origem Cervical / Neuropatia Proximal — diferencial",
      "testes": [
        "Distribuição não restrita ao nervo mediano/ulnar local",
        "Sintomas modulados pela coluna cervical",
        "Exame neurológico proximal alterado"
      ],
      "interpretacao": "Quando o padrão sensitivo/motor não se encaixa em uma compressão local, investigue cervical e outros locais de compressão neural."
    },
    {
      "id": "dedo_gatilho",
      "nome": "Dedo em Gatilho / Tenossinovite Estenosante dos Flexores",
      "testes": [
        "Travamento, ressalto ou clique durante flexão/extensão do dedo",
        "Sensibilidade ou espessamento na região da polia A1",
        "Perda de extensão ativa/passiva ou necessidade de destravar manualmente",
        "Comparar impacto funcional na preensão e tarefas repetitivas"
      ],
      "interpretacao": "Padrão compatível quando há travamento mecânico do tendão flexor na região da polia A1. Diferencie de bloqueio articular, contratura fixa e outras causas de perda de movimento.",
      "palavrasChaveHMA": [
        "dedo em gatilho",
        "dedo trava",
        "dedo travando",
        "estala ao abrir a mao",
        "trigger finger"
      ],
      "fatoresPioraRisco": [
        "movimento",
        "carga"
      ],
      "tagsBusca": [
        "tenossinovite estenosante",
        "polia a1",
        "travamento",
        "trigger thumb"
      ],
      "evidencia": "Avaliação clínica de mobilidade tendínea e função da mão.",
      "categoriaClinica": "mobilidade_deformidade"
    },
    {
      "id": "contratura_dupuytren",
      "nome": "Contratura de Dupuytren",
      "testes": [
        "Nódulo ou cordão palmar palpável",
        "Déficit de extensão passiva de MCP/PIP",
        "Teste da mesa para incapacidade de apoiar a mão plana quando pertinente",
        "Documentar graus de contratura e impacto funcional"
      ],
      "interpretacao": "A limitação é estrutural e progressiva em parte dos casos. Quantifique a perda de extensão e impacto funcional; encaminhamento especializado pode ser indicado conforme gravidade e progressão.",
      "palavrasChaveHMA": [
        "dupuytren",
        "cordao na palma",
        "dedo nao estica",
        "contratura da mao"
      ],
      "tagsBusca": [
        "fibromatose palmar",
        "contratura palmar",
        "perda de extensao"
      ],
      "categoriaClinica": "mobilidade_deformidade"
    },
    {
      "id": "rigidez_digital_pos_traumatica",
      "nome": "Rigidez Digital Pós-traumática / Pós-imobilização",
      "testes": [
        "ADM ativa e passiva por articulação (MCP, PIP e DIP)",
        "Diferença entre limitação ativa e passiva",
        "Deslizamento tendíneo e mobilidade de tecidos quando pertinentes",
        "Edema, dor e função de preensão/pinça"
      ],
      "interpretacao": "Use como eixo de mobilidade quando a principal limitação é perda de movimento após trauma, cirurgia ou imobilização. Diferencie restrição capsular, aderência tendínea, dor e bloqueio mecânico.",
      "palavrasChaveHMA": [
        "dedo rigido",
        "dedos rigidos",
        "depois da tala",
        "depois da imobilizacao",
        "nao dobra o dedo",
        "nao estica o dedo"
      ],
      "tagsBusca": [
        "rigidez interfalangica",
        "aderencia tendinea",
        "pos imobilizacao"
      ],
      "categoriaClinica": "mobilidade_deformidade"
    },
    {
      "id": "dedo_martelo_mao",
      "nome": "Dedo em Martelo (Mallet Finger) — sequela / reabilitação",
      "testes": [
        "Déficit de extensão ativa da DIP",
        "Extensão passiva da DIP e presença de contratura",
        "História de trauma em flexão forçada da falange distal",
        "Integridade cutânea e alinhamento após imobilização quando aplicável"
      ],
      "interpretacao": "Padrão típico envolve perda de extensão ativa da DIP após lesão do mecanismo extensor distal. Em trauma recente, deformidade importante ou suspeita óssea, seguir avaliação médica/ortopédica.",
      "palavrasChaveHMA": [
        "dedo em martelo",
        "mallet finger",
        "ponta do dedo caiu",
        "nao estica a ponta do dedo"
      ],
      "mecanismoPreferido": [
        "trauma_agudo"
      ],
      "tagsBusca": [
        "extensor distal",
        "dip",
        "deformidade dedo"
      ],
      "categoriaClinica": "mobilidade_deformidade"
    },
    {
      "id": "deformidade_boutonniere",
      "nome": "Deformidade em Boutonnière — sequela / mobilidade",
      "testes": [
        "Flexão da PIP associada a hiperextensão relativa da DIP",
        "ADM ativa e passiva da PIP/DIP",
        "Teste de Elson quando clinicamente apropriado",
        "História de trauma, artrite ou evolução progressiva"
      ],
      "interpretacao": "Avalie como alteração do mecanismo extensor e da mobilidade interfalângica. Em lesão aguda ou deformidade progressiva, considerar avaliação especializada.",
      "palavrasChaveHMA": [
        "boutonniere",
        "dedo torto depois de trauma",
        "pip dobrada",
        "deformidade no dedo"
      ],
      "tagsBusca": [
        "mecanismo extensor",
        "pip",
        "dip"
      ],
      "categoriaClinica": "mobilidade_deformidade"
    },
    {
      "id": "osteoartrite_interfalangica_mao",
      "nome": "Osteoartrite Interfalângica da Mão — mobilidade e função",
      "testes": [
        "Dor/rigidez em DIP/PIP com limitação funcional",
        "ADM ativa/passiva e deformidade articular quando presente",
        "Força de preensão/pinça se relevante",
        "Diferenciar padrão degenerativo de processo inflamatório sistêmico"
      ],
      "interpretacao": "O exame deve priorizar mobilidade, função, carga tolerada e impacto nas tarefas, sem atribuir sintomas apenas à alteração estrutural.",
      "palavrasChaveHMA": [
        "artrose nos dedos",
        "osteoartrite mao",
        "nodulos nos dedos",
        "dedos rigidos de manha"
      ],
      "idadeFaixaBonus": {
        "min": 45,
        "max": 100,
        "bonus": 0.3
      },
      "tagsBusca": [
        "artrose interfalangica",
        "heberden",
        "bouchard"
      ],
      "categoriaClinica": "mobilidade_deformidade"
    },
    {
      "id": "rigidez_punho_pos_traumatica",
      "nome": "Rigidez do Punho Pós-traumática / Pós-imobilização",
      "testes": [
        "ADM ativa e passiva do punho e antebraço",
        "Comparar padrão capsular, dor e bloqueio mecânico",
        "Força de preensão quando segura e pertinente",
        "Função em apoio, preensão e tarefas manuais"
      ],
      "interpretacao": "Útil quando a perda de mobilidade é o problema principal após fratura, cirurgia ou imobilização. Investigue causas mecânicas relevantes se houver bloqueio, dor desproporcional ou perda progressiva.",
      "palavrasChaveHMA": [
        "punho rigido",
        "punho travado",
        "depois do gesso",
        "depois da fratura do punho"
      ],
      "tagsBusca": [
        "pos imobilizacao",
        "rigidez radiocarpal",
        "prono supinacao"
      ],
      "categoriaClinica": "mobilidade_deformidade"
    }
  ]
});
})();
