/* KineSys — Input Helpers Core 1.0.0
 * EVA e autocompletes extraídos do core sem alterar contratos históricos.
 */
'use strict';

/* ================= 5. TERMÔMETRO DA DOR (ESCALA EVA) ================= */
function aplicarClasseEvaKineSys(el, val) {
    if (!el) return;
    for (let i = 0; i <= 5; i++) el.classList.remove('kds-eva-level-' + i);
    const faixa = val === 0 ? 0 : val <= 3 ? 1 : val <= 5 ? 2 : val <= 7 ? 3 : val <= 9 ? 4 : 5;
    el.classList.add('kds-eva-level-' + faixa);
}

const sliderEVA = document.getElementById("eva_slider");
const valorEVA = document.getElementById("eva_valor");

if (sliderEVA) {
    sliderEVA.addEventListener("input", function() {
        const val = parseInt(this.value) || 0;
        if (valorEVA) {
            valorEVA.innerText = val + "/10";
            aplicarClasseEvaKineSys(valorEVA, val);
        }
    });
}

const sliderEvo = document.getElementById("eva_slider_evo");
const valorEvo = document.getElementById("eva_valor_evo");

if (sliderEvo) {
    sliderEvo.addEventListener("input", function() {
        const val = parseInt(this.value) || 0;
        if (valorEvo) {
            valorEvo.innerText = "Nível " + val;
            aplicarClasseEvaKineSys(valorEvo, val);
        }
    });
}

/* ================= 6. AUTOCOMPLETES (RESTAURADOS E ORIGINAIS) ================= */

function toggleCirurgias(labelElement) {
    const checkbox = labelElement.querySelector('input');
    const bloco = document.getElementById('bloco_cirurgias');
    const inputCirurgia = document.getElementById('input_cirurgia');
    const tagsCirurgias = document.getElementById('tags_cirurgias');
    const sugestaoBox = document.getElementById('sugestao_box');

    if (checkbox && checkbox.checked) {
        if (bloco) bloco.style.display = 'block';
        if (inputCirurgia) inputCirurgia.focus();
    } else {
        if (bloco) bloco.style.display = 'none';
        if (tagsCirurgias) tagsCirurgias.innerHTML = '';
        if (inputCirurgia) inputCirurgia.value = '';
        if (sugestaoBox) sugestaoBox.style.display = 'none';
        if (typeof processarRadarEmTempoReal === 'function') processarRadarEmTempoReal();
    }
}

// ============================================================================
// MOTOR 1.3 — SUGESTÕES CANÔNICAS INDIVIDUAIS
// Evita opções agrupadas como "Ciclismo / MTB / Gravel". O item selecionado
// permanece vinculado à chave-base do dicionário para compatibilidade com o
// Radar, mas a descrição exata escolhida fica preservada no campo/tag.
// ============================================================================
const OPCOES_INDIVIDUAIS_OCUPACAO_ESPORTE = {
    "Trabalho Administrativo / Escritório Geral": ["Assistente Administrativo", "Analista Administrativo", "Trabalho de Escritório"],
    "Programador / Desenvolvedor de Software / TI": ["Programador", "Desenvolvedor de Software", "Profissional de TI"],
    "Designer Gráfico / Ilustrador / Editor de Vídeo": ["Designer Gráfico", "Ilustrador", "Editor de Vídeo"],
    "Advogado / Jurídico / Promotor": ["Advogado", "Profissional Jurídico", "Promotor"],
    "Contador / Auditor / Analista Financeiro": ["Contador", "Auditor", "Analista Financeiro"],
    "Fisioterapeuta / Osteopata / Terapeuta Manual": ["Fisioterapeuta", "Osteopata", "Terapeuta Manual"],
    "Cirurgião-Dentista / Ortodontista / Endodontista": ["Cirurgião-Dentista", "Ortodontista", "Endodontista"],
    "Médico Cirurgião / Instrumentador Cirúrgico": ["Médico Cirurgião", "Instrumentador Cirúrgico"],
    "Enfermeiro / Técnico de Enfermagem / Cuidador": ["Enfermeiro", "Técnico de Enfermagem", "Cuidador"],
    "Pedreiro / Servente / Construção Civil": ["Pedreiro", "Servente de Obra", "Trabalhador da Construção Civil"],
    "Pintor / Marceneiro / Carpinteiro": ["Pintor", "Marceneiro", "Carpinteiro"],
    "Mecânico / Montador Industrial / Funileiro": ["Mecânico", "Montador Industrial", "Funileiro"],
    "Carregador / Estoquista / Carga e Descarga / Ajudante": ["Carregador", "Estoquista", "Trabalhador de Carga e Descarga", "Ajudante de Depósito"],
    "Motorista Profissional / Caminhoneiro / Uber / Taxista": ["Motorista Profissional", "Caminhoneiro", "Motorista de Aplicativo", "Taxista"],
    "Motoboy / Entregador de Motocicleta / Piloto": ["Motoboy", "Entregador de Motocicleta", "Piloto de Motocicleta"],
    "Cabeleireiro / Barbeiro / Esteticista Capilar": ["Cabeleireiro", "Barbeiro", "Esteticista Capilar"],
    "Massoterapeuta / Esteticista Corporal / Podólogo": ["Massoterapeuta", "Esteticista Corporal", "Podólogo"],
    "Professor / Educador / Atendente de Sala": ["Professor", "Educador", "Atendente de Sala"],
    "Vendedor / Caixa / Atendente de Balcão / Garçom": ["Vendedor", "Operador de Caixa", "Atendente de Balcão", "Garçom"],

    "Caminhada Recreativa / Aeróbico de Baixo Impacto": ["Caminhada Recreativa", "Aeróbico de Baixo Impacto"],
    "Pilates Solo / Aparelhos": ["Pilates Solo", "Pilates em Aparelhos"],
    "Yoga / Hatha / Vinyasa": ["Yoga", "Hatha Yoga", "Vinyasa Yoga"],
    "Corrida de Rua / Maratona / Trail Run": ["Corrida de Rua", "Maratona", "Trail Running"],
    "Ciclismo de Estrada / Mountain Bike (MTB) / Gravel": ["Ciclismo de Estrada (Speed)", "Mountain Bike (MTB)", "Ciclismo Gravel"],
    "Beach Tennis / Tênis de Arena / Padel": ["Beach Tennis", "Tênis", "Padel"],
    "Natação (Crawl / Costas / Peito / Borboleta)": ["Natação Crawl", "Natação Costas", "Natação Peito", "Natação Borboleta"],
    "CrossFit / Treinamento Funcional de Alta Intensidade": ["CrossFit", "Treinamento Funcional de Alta Intensidade"],
    "Musculação Pesada / Powerlifting / LPO": ["Musculação", "Powerlifting", "Levantamento de Peso Olímpico (LPO)"],
    "Futebol de Campo / Society": ["Futebol de Campo", "Futebol Society"],
    "Futsal / Futebol de Salão": ["Futsal", "Futebol de Salão"],
    "Basquetebol / Basquete 3x3": ["Basquetebol", "Basquete 3x3"],
    "Voleibol / Vôlei de Praia": ["Voleibol de Quadra", "Vôlei de Praia"],
    "Jiu-Jitsu / Lutas de Solo / Grappling": ["Jiu-Jitsu", "Luta de Solo", "Grappling"],
    "Muay Thai / Kickboxing / Boxe": ["Muay Thai", "Kickboxing", "Boxe"],
    "Judô / Lutas de Projeção": ["Judô", "Luta de Projeção"],
    "Surfe / Bodyboard": ["Surfe", "Bodyboard"],
    "Skate (Street / Park / Bowl)": ["Skate Street", "Skate Park", "Skate Bowl"],
    "Futebol / Futsal": ["Futebol", "Futsal"]
};

const OPCOES_INDIVIDUAIS_CIRURGIAS = {
    "Artrodese de Coluna (Parafusos / Hastes / Cages)": ["Artrodese de Coluna com Parafusos", "Artrodese de Coluna com Hastes", "Artrodese de Coluna com Cage"],
    "Herniectomia / Discectomia Lombar ou Cervical": ["Discectomia Lombar", "Discectomia Cervical", "Herniectomia Lombar", "Herniectomia Cervical"],
    "Vertebroplastia / Cifoplastia (Cimento Ósseo)": ["Vertebroplastia", "Cifoplastia"],
    "Artroplastia Total/Parcial de Quadril (ATQ)": ["Artroplastia Total de Quadril", "Artroplastia Parcial de Quadril"],
    "Osteossintese de Fêmur Proximal / Pelve": ["Osteossíntese de Fêmur Proximal", "Osteossíntese de Pelve"],
    "Artroscopia de Quadril (Impacto Femoroacetabular / Labrum)": ["Artroscopia de Quadril para FAI", "Artroscopia de Quadril com Reparo Labral"],
    "Osteotomia Periacetabular / Femoral": ["Osteotomia Periacetabular", "Osteotomia Femoral"],
    "Reparo / Sutura de Tendão Glúteo Médio/Mínimo": ["Reparo do Tendão Glúteo Médio", "Reparo do Tendão Glúteo Mínimo"],
    "Osteossíntese de Acetábulo / Pelve": ["Osteossíntese de Acetábulo", "Osteossíntese de Pelve"],
    "Reconstrução de Ligamento Colateral (LCM / LCL)": ["Reconstrução do Ligamento Colateral Medial (LCM)", "Reconstrução do Ligamento Colateral Lateral (LCL)"],
    "Meniscectomia / Sutura Meniscal": ["Meniscectomia", "Sutura Meniscal"],
    "Artroplastia Total/Parcial de Joelho (ATJ)": ["Artroplastia Total de Joelho", "Artroplastia Parcial de Joelho"],
    "Realinhamento Patelar / Reconstrução de MPFL": ["Realinhamento Patelar", "Reconstrução do Ligamento Patelofemoral Medial (MPFL)"],
    "Osteotomia Valgrizante / Varizante de Tíbia ou Fêmur": ["Osteotomia Valgizante de Tíbia", "Osteotomia Varizante de Tíbia", "Osteotomia Valgizante de Fêmur", "Osteotomia Varizante de Fêmur"],
    "Sutura / Reconstrução de Tendão Patelar ou Quadricipital": ["Sutura do Tendão Patelar", "Reconstrução do Tendão Patelar", "Sutura do Tendão Quadricipital", "Reconstrução do Tendão Quadricipital"],
    "Mosaicoplastia / Transplante Osteocondral de Joelho": ["Mosaicoplastia de Joelho", "Transplante Osteocondral de Joelho"],
    "Reparo / Sutura de Manguito Rotador (Artroscopia)": ["Reparo Artroscópico do Manguito Rotador", "Sutura Artroscópica do Manguito Rotador"],
    "Artroplastia Total / Inversa de Ombro": ["Artroplastia Total Anatômica de Ombro", "Artroplastia Reversa de Ombro"],
    "Reparo de Lesão de Bankart / SLAP (Instabilidade)": ["Reparo de Bankart", "Reparo de SLAP"],
    "Procedimento de Latarjet / Enxerto Ósseo Glenoidal": ["Procedimento de Latarjet", "Enxerto Ósseo Glenoidal"],
    "Acromioplastia / Descompressão Subacromial": ["Acromioplastia", "Descompressão Subacromial"],
    "Osteossíntese de Clavícula (Placa / Parafuso)": ["Osteossíntese de Clavícula com Placa", "Osteossíntese de Clavícula com Parafuso"],
    "Osteossíntese de Cotovelo / Olecrano / Cabeça do Rádio": ["Osteossíntese de Cotovelo", "Osteossíntese de Olécrano", "Osteossíntese de Cabeça do Rádio"],
    "Sutura / Reconstrução de Tendão Bíceps Distal": ["Sutura do Bíceps Distal", "Reconstrução do Bíceps Distal"],
    "Desbridamento / Liberação de Epicôndilo Lateral/Medial": ["Desbridamento do Epicôndilo Lateral", "Desbridamento do Epicôndilo Medial", "Liberação do Epicôndilo Lateral", "Liberação do Epicôndilo Medial"],
    "Osteossíntese de Rádio Distal / Ulna": ["Osteossíntese de Rádio Distal", "Osteossíntese de Ulna"],
    "Sutura / Reconstrução de Tendão de Aquiles (Calcâneo)": ["Sutura do Tendão de Aquiles", "Reconstrução do Tendão de Aquiles"],
    "Osteossíntese de Maleólo / Tornozelo (Placa / Parafusos)": ["Osteossíntese de Maléolo com Placa", "Osteossíntese de Maléolo com Parafusos", "Osteossíntese de Tornozelo"],
    "Artrodese Subtalar / Tiobiotalar": ["Artrodese Subtalar", "Artrodese Tibiotalar"],
    "Procedimento de Broström / Ligamentoplastia de Tornozelo": ["Procedimento de Broström", "Ligamentoplastia de Tornozelo"],
    "Fasciotomia Plantar / Liberação de Esporão": ["Fasciotomia Plantar", "Ressecção de Esporão Calcâneo"],
    "Abdominoplastia / Plicatura de Reto Abdominal": ["Abdominoplastia", "Plicatura do Reto Abdominal"],
    "Hernioplastia Umbilical / Inguinal / Incisional": ["Hernioplastia Umbilical", "Hernioplastia Inguinal", "Hernioplastia Incisional"],
    "Cirurgia Bariátrica (Bypass / Sleeve / Gastrectomia)": ["Bypass Gástrico", "Gastrectomia Sleeve", "Gastrectomia Bariátrica"],
    "Histerectomia Total / Parcial (Retirada do Útero)": ["Histerectomia Total", "Histerectomia Parcial"],
    "Cauterização / Exerese de Focos de Endometriose": ["Cauterização de Focos de Endometriose", "Exérese de Focos de Endometriose"],
    "Esternotomia / Revascularização do Miocárdio": ["Esternotomia", "Revascularização do Miocárdio"],
    "Procedimento por pneumotórax": ["Procedimento por pneumotórax — técnica não informada", "Drenagem torácica / toracostomia por pneumotórax", "Pleurodese por pneumotórax", "Cirurgia torácica por pneumotórax"],
    "Esternotomia / Troca Valvar Cardíaca": ["Esternotomia", "Troca Valvar Cardíaca"],
    "Esternotomia / Cirurgia Cardíaca Aberta": ["Esternotomia", "Cirurgia Cardíaca Aberta"],
    "Safenectomia / Escleroterapia Vascular de MMI": ["Safenectomia", "Escleroterapia Vascular de Membro Inferior"],
    "Explante de Prótese de Silicone Mamária / Capsulotomia": ["Explante de Prótese Mamária", "Capsulotomia Mamária"],
    "Mamoplastia Redutora / Mastopexia": ["Mamoplastia Redutora", "Mastopexia"],
    "Mastectomia Total / Parcial (Reconstrução Mamária)": ["Mastectomia Total", "Mastectomia Parcial", "Reconstrução Mamária"],
    "Lipoaspiração / Lipoescultura (Torse / Membros)": ["Lipoaspiração de Tronco", "Lipoaspiração de Membros", "Lipoescultura de Tronco", "Lipoescultura de Membros"],
    "Artroplastia / Cirurgia de ATM (Mandíbula)": ["Artroplastia de ATM", "Cirurgia de ATM"],
    "Osteotomia Ortognática (Maxilar / Mandíbula)": ["Osteotomia Ortognática Maxilar", "Osteotomia Ortognática Mandibular"],
    "Tireoidectomia Total / Parcial (Pescoço)": ["Tireoidectomia Total", "Tireoidectomia Parcial"],
    "Fixação Occipitocervical / Coluna Cervical Alta": ["Fixação Occipitocervical", "Fixação de Coluna Cervical Alta"],
    "Amputação Transtibial / Transfemoral (MMII)": ["Amputação Transtibial", "Amputação Transfemoral"],
    "Amputação Transradial / Transhumeral (MMSS)": ["Amputação Transradial", "Amputação Transhumeral"],
    "Osteossíntese com Fixador Externo (Gaiola / Ilizarov)": ["Osteossíntese com Fixador Externo", "Osteossíntese com Fixador Ilizarov"],
    "Enxerto Ósseo Autólogo / Homólogo": ["Enxerto Ósseo Autólogo", "Enxerto Ósseo Homólogo"]
};

function expandirSugestoesIndividuais(item, mapa) {
    const exibicao = obterTextoExibicao(item);
    return (mapa && mapa[exibicao]) ? mapa[exibicao] : [exibicao];
}

// --- AUTOCOMPLETE: CIRURGIAS ---
const inputCirurgia = document.getElementById('input_cirurgia');
const sugestaoBoxCirurgia = document.getElementById('sugestao_box');

if (inputCirurgia) {
    inputCirurgia.addEventListener("input", function() {
        let textoDigitado = removerAcentos(this.value);
        let sugestoesEncontradas = [];

        if (typeof dicionarioCirurgias !== 'undefined' && textoDigitado.length > 2) {
            for (let palavraChave in dicionarioCirurgias) {
                let palavraLimpa = removerAcentos(palavraChave);
                const objetoItem = dicionarioCirurgias[palavraChave];
                const opcoes = expandirSugestoesIndividuais(objetoItem, OPCOES_INDIVIDUAIS_CIRURGIAS);
                const bateChave = palavraLimpa.includes(textoDigitado) || textoDigitado.includes(palavraLimpa);
                const bateExibicao = opcoes.some(op => removerAcentos(op).includes(textoDigitado));
                const bateGrupo = removerAcentos(obterTextoExibicao(objetoItem)).includes(textoDigitado);
                if (bateChave || bateExibicao || bateGrupo) {
                    opcoes.forEach(textoExibicao => {
                        // Se o usuário digitou um subtipo específico (ex.: speed, MTB, reversa),
                        // prioriza/mostra somente opções semanticamente compatíveis quando houver match direto.
                        const opMatch = removerAcentos(textoExibicao).includes(textoDigitado);
                        if (bateExibicao && !opMatch && !bateChave) return;
                        if (!sugestoesEncontradas.some(s => s.texto === textoExibicao)) {
                            sugestoesEncontradas.push({ chave: palavraChave, texto: textoExibicao });
                        }
                    });
                }
            }
        }

        if (sugestaoBoxCirurgia) {
            if (sugestoesEncontradas.length > 0) {
                sugestaoBoxCirurgia.innerHTML = "";
                sugestoesEncontradas.forEach(item => {
                    const div = document.createElement('div');
                    div.classList.add('kds-u-p-10px', 'kds-u-bb-1px-solid-e2e8f0', 'kds-u-cursor-pointer', 'kds-u-text-petrol', 'kds-u-fw-600', 'kds-u-fs-ui', 'kds-u-transition-0p2s');
                    div.innerText = "➔ " + item.texto;
                    div.classList.add('kds-u-hover-soft');
                    div.onclick = function(e) {
                        e.stopPropagation();
                        adicionarTagCirurgia(item.chave, item.texto);
                    };
                    sugestaoBoxCirurgia.appendChild(div);
                });
                sugestaoBoxCirurgia.style.display = "block";
            } else {
                sugestaoBoxCirurgia.style.display = "none";
            }
        }
    });
}

function adicionarTagCirurgia(chave, termoExibicao) {
    const container = document.getElementById('tags_cirurgias');
    if (container) {
        const tag = document.createElement('div');
        tag.className = 'tag-cirurgia';
        tag.dataset.chave = chave;
        tag.dataset.exibicao = termoExibicao;

        const textoTag = document.createTextNode(termoExibicao + " ");
        const botaoRemover = document.createElement('span');
        botaoRemover.title = "Remover";
        botaoRemover.textContent = "✕";
        botaoRemover.onclick = function() {
            tag.remove();
            if (typeof processarRadarEmTempoReal === 'function') processarRadarEmTempoReal();
        };

        tag.appendChild(textoTag);
        tag.appendChild(botaoRemover);
        container.appendChild(tag);
    }
    if (inputCirurgia) inputCirurgia.value = '';
    if (sugestaoBoxCirurgia) sugestaoBoxCirurgia.style.display = 'none';
    if (typeof processarRadarEmTempoReal === 'function') processarRadarEmTempoReal();
}

// --- AUTOCOMPLETE: PROFISSÕES ---
const inputProfissao = document.getElementById('paciente_ocupacao');
const sugestaoBoxProfissao = document.getElementById('sugestao_box_profissao');

if (inputProfissao) {
    inputProfissao.addEventListener("input", function() {
        let textoDigitado = removerAcentos(this.value);
        let sugestoesEncontradas = [];

        if (typeof dicionarioOcupacoesEsportes !== 'undefined' && textoDigitado.length >= 2) {
            for (let palavraChave in dicionarioOcupacoesEsportes) {
                let item = dicionarioOcupacoesEsportes[palavraChave];
                if (item && item.tipo === "profissao") {
                    let palavraLimpa = removerAcentos(palavraChave);
                    const opcoes = expandirSugestoesIndividuais(item, OPCOES_INDIVIDUAIS_OCUPACAO_ESPORTE);
                    const bateChave = palavraLimpa.includes(textoDigitado);
                    const bateOpcao = opcoes.some(op => removerAcentos(op).includes(textoDigitado));
                    const bateGrupo = removerAcentos(obterTextoExibicao(item)).includes(textoDigitado);
                    if (bateChave || bateOpcao || bateGrupo) {
                        opcoes.forEach(textoExibicao => {
                            const opMatch = removerAcentos(textoExibicao).includes(textoDigitado);
                            if (bateOpcao && !opMatch && !bateChave) return;
                            if (!sugestoesEncontradas.some(s => s.texto === textoExibicao)) {
                                sugestoesEncontradas.push({ chave: palavraChave, texto: textoExibicao });
                            }
                        });
                    }
                }
            }
        }

        if (sugestaoBoxProfissao) {
            if (sugestoesEncontradas.length > 0) {
                sugestaoBoxProfissao.innerHTML = "";
                sugestoesEncontradas.forEach(item => {
                    const div = document.createElement('div');
                    div.classList.add('kds-u-p-10px', 'kds-u-bb-1px-solid-e2e8f0', 'kds-u-cursor-pointer', 'kds-u-text-003b46', 'kds-u-fw-600', 'kds-u-fs-ui', 'kds-u-transition-0p2s');
                    div.innerText = "➔ " + item.texto;
                    div.classList.add('kds-u-hover-soft');
                    
                    div.onclick = function(e) {
                        e.stopPropagation();
                        inputProfissao.value = item.texto;
                        sugestaoBoxProfissao.style.display = "none";
                        if (typeof processarRadarEmTempoReal === 'function') processarRadarEmTempoReal();
                    };

                    sugestaoBoxProfissao.appendChild(div);
                });
                sugestaoBoxProfissao.style.display = "block";
            } else {
                sugestaoBoxProfissao.style.display = "none";
            }
        }
    });
}

// --- AUTOCOMPLETE: ESPORTES ---
const inputEsporte = document.getElementById('paciente_esporte');
const sugestaoBoxEsporte = document.getElementById('sugestao_box_esporte');

if (inputEsporte) {
    inputEsporte.addEventListener("input", function() {
        let textoDigitado = removerAcentos(this.value);
        let sugestoesEncontradas = [];

        if (typeof dicionarioOcupacoesEsportes !== 'undefined' && textoDigitado.length >= 2) {
            for (let palavraChave in dicionarioOcupacoesEsportes) {
                let item = dicionarioOcupacoesEsportes[palavraChave];
                if (item && item.tipo === "esporte") {
                    let palavraLimpa = removerAcentos(palavraChave);
                    const opcoes = expandirSugestoesIndividuais(item, OPCOES_INDIVIDUAIS_OCUPACAO_ESPORTE);
                    const bateChave = palavraLimpa.includes(textoDigitado);
                    const bateOpcao = opcoes.some(op => removerAcentos(op).includes(textoDigitado));
                    const bateGrupo = removerAcentos(obterTextoExibicao(item)).includes(textoDigitado);
                    if (bateChave || bateOpcao || bateGrupo) {
                        opcoes.forEach(textoExibicao => {
                            const opMatch = removerAcentos(textoExibicao).includes(textoDigitado);
                            if (bateOpcao && !opMatch && !bateChave) return;
                            if (!sugestoesEncontradas.some(s => s.texto === textoExibicao)) {
                                sugestoesEncontradas.push({ chave: palavraChave, texto: textoExibicao });
                            }
                        });
                    }
                }
            }
        }

        if (sugestaoBoxEsporte) {
            if (sugestoesEncontradas.length > 0) {
                sugestaoBoxEsporte.innerHTML = "";
                sugestoesEncontradas.forEach(item => {
                    const div = document.createElement('div');
                    div.classList.add('kds-u-p-10px', 'kds-u-bb-1px-solid-e2e8f0', 'kds-u-cursor-pointer', 'kds-u-text-003b46', 'kds-u-fw-600', 'kds-u-fs-ui', 'kds-u-transition-0p2s');
                    div.innerText = "➔ " + item.texto;
                    div.classList.add('kds-u-hover-soft');
                    
                    div.onclick = function(e) {
                        e.stopPropagation();
                        inputEsporte.value = item.texto;
                        sugestaoBoxEsporte.style.display = "none";
                        if (typeof processarRadarEmTempoReal === 'function') processarRadarEmTempoReal();
                    };

                    sugestaoBoxEsporte.appendChild(div);
                });
                sugestaoBoxEsporte.style.display = "block";
            } else {
                sugestaoBoxEsporte.style.display = "none";
            }
        }
    });
}

// --- AUTOCOMPLETE: MEDICAMENTOS ---
const inputMedicamento = document.getElementById('input_medicamento');
const sugestaoBoxMed = document.getElementById('sugestao_box_med');

if (inputMedicamento) {
    inputMedicamento.addEventListener("input", function() {
        let textoDigitado = removerAcentos(this.value);
        let sugestoesEncontradas = [];

        if (typeof dicionarioMedicamentos !== 'undefined' && textoDigitado.length > 2) {
            for (let palavraChave in dicionarioMedicamentos) {
                let palavraLimpa = removerAcentos(palavraChave);
                let regexChaveNoTexto = new RegExp("\\b" + palavraLimpa + "\\b", "i");
                if (regexChaveNoTexto.test(textoDigitado) || palavraLimpa.includes(textoDigitado)) {
                    let termoTecnico = dicionarioMedicamentos[palavraChave];
                    if (!sugestoesEncontradas.includes(termoTecnico)) {
                        sugestoesEncontradas.push(termoTecnico);
                    }
                }
            }
        }

        if (sugestaoBoxMed) {
            if (sugestoesEncontradas.length > 0) {
                sugestaoBoxMed.innerHTML = "";
                sugestoesEncontradas.forEach(termo => {
                    const div = document.createElement('div');
                    div.classList.add('kds-u-p-10px', 'kds-u-bb-1px-solid-e2e8f0', 'kds-u-cursor-pointer', 'kds-u-text-d35400', 'kds-u-fw-600', 'kds-u-fs-ui', 'kds-u-transition-0p2s');
                    div.innerText = "➔ " + termo;
                    div.classList.add('kds-u-hover-warm');
                    div.onclick = function(e) {
                        e.stopPropagation();
                        adicionarTagMedicamento(termo);
                    };
                    sugestaoBoxMed.appendChild(div);
                });
                sugestaoBoxMed.style.display = "block";
            } else {
                sugestaoBoxMed.style.display = "none";
            }
        }
    });

    inputMedicamento.addEventListener("keypress", function(event) {
        if (event.key === "Enter") {
            event.preventDefault();
            let texto = this.value.trim();
            if (texto !== "") {
                adicionarTagMedicamento(texto.charAt(0).toUpperCase() + texto.slice(1));
            }
        }
    });
}

function adicionarTagMedicamento(termo) {
    const container = document.getElementById('tags_medicamentos');
    if (container) {
        const tag = document.createElement('div');
        tag.classList.add('kds-u-bg-e67e22', 'kds-u-text-white', 'kds-u-p-6px-12px', 'kds-u-br-4px', 'kds-u-fs-label', 'kds-u-fw-bold', 'kds-u-d-flex', 'kds-u-ai-center', 'kds-u-gap-8px');

        const textoTag = document.createTextNode(termo);
        const botaoRemover = document.createElement('span');
        botaoRemover.classList.add('kds-u-cursor-pointer', 'kds-u-text-rgba-255-255-255-0p7');
        botaoRemover.title = "Remover";
        botaoRemover.textContent = "✕";
        botaoRemover.onclick = function() {
            tag.remove();
            if (typeof processarRadarEmTempoReal === 'function') processarRadarEmTempoReal();
        };

        tag.appendChild(textoTag);
        tag.appendChild(botaoRemover);
        container.appendChild(tag);
    }
    if (inputMedicamento) inputMedicamento.value = '';
    if (sugestaoBoxMed) sugestaoBoxMed.style.display = 'none';
    if (typeof processarRadarEmTempoReal === 'function') processarRadarEmTempoReal();
}

// FECHAMENTO DE CAIXAS AO CLICAR FORA
document.addEventListener('click', function(e) {
    if (inputMedicamento && sugestaoBoxMed && !inputMedicamento.contains(e.target) && !sugestaoBoxMed.contains(e.target)) {
        sugestaoBoxMed.style.display = 'none';
    }
    if (inputCirurgia && sugestaoBoxCirurgia && !inputCirurgia.contains(e.target) && !sugestaoBoxCirurgia.contains(e.target)) {
        sugestaoBoxCirurgia.style.display = 'none';
    }
    if (inputProfissao && sugestaoBoxProfissao && !inputProfissao.contains(e.target) && !sugestaoBoxProfissao.contains(e.target)) {
        sugestaoBoxProfissao.style.display = 'none';
    }
    if (inputEsporte && sugestaoBoxEsporte && !inputEsporte.contains(e.target) && !sugestaoBoxEsporte.contains(e.target)) {
        sugestaoBoxEsporte.style.display = 'none';
    }
});

