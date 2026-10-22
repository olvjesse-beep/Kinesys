# Radar KineSys: evidências compartilhadas da HMA, versão 23

## Escopo e seis alterações

1. **Anatomia antes da prioridade:** o relato diferencia localização plantar/medial do calcanhar, lateral e retromaleolar, posterior, acima do tornozelo, seio do tarso e dor profunda. Primeiros passos não fornecem sozinhos a localização plantar. Regiões, lados e sujeitos distintos não devem ser somados.
2. **Cronologia e mecanismo:** entorse sem data ou relação esclarecida fica pendente. Antecedente remoto não vira lesão aguda. Duração/data são preservadas sem classificação automática por número; relação temporal relatada não equivale a causalidade estabelecida.
3. **Evidência rastreável:** cada evidência registra trecho, posição, fato, região/lado e estado. A interface distingue apoio, contraprova explícita, localização divergente e informação faltante. Ausência não significa negativa.
4. **Entrevista discriminativa:** perguntas sobre sublocalização, evento, estabilidade, estalo, bloqueio e segurança aparecem separadas do exame. Outras regiões recebem perguntas gerais de localização e evolução sem inventar regras clínicas específicas.
5. **Uma fonte documental:** HMA, plano adaptativo e relatório usam o mesmo identificador e texto de origem. Uma HMA modificada invalida o cache e solicita atualização do plano; a auditoria do relatório sinaliza exame positivo ainda discordante da história. Metadados persistem no JSON existente; texto manual/revisado e proteções de identidade são preservados.
6. **Base científica e regressões:** nove perfis detalhados de tornozelo/pé; quatro novos diferenciais canônicos com avaliações próprias: patologia dos tendões fibulares, instabilidade dos tendões fibulares, lesão osteocondral do tálus e dor do seio do tarso. Catálogo suplementar idempotente antes/depois da carga regional. Nenhum limiar, probabilidade ou cluster de confirmação novo foi inventado.

Não é uma expansão científica específica de todas as condições das onze regiões. A infraestrutura compartilhada e as perguntas gerais abrangem outras regiões, preservando seus bancos e motores especializados existentes. A biblioteca sintética não constitui validação clínica profissional.

## Caso motivador e comportamento esperado

Relato sintético: dor no primeiro passo do dia, lateral do tornozelo e perna lateral, com entorse mencionada sem data em outra frase.

- Não destacar fasciopatia apenas por “primeiros passos”. Mostrar menor compatibilidade anatômica e pedir localização plantar/medial.
- Conservar a entorse como evento, perguntar data e relação com a dor, sem classificá-la como causa ou trauma agudo.
- Orientar investigação ligamentar/fibular e outras possibilidades conforme respostas/exame; não rotular um diagnóstico definitivo.
- Uma hipótese ainda pendente pode receber perguntas/testes de esclarecimento sem ganhar bônus positivo por similaridade de nomes.
- Seleções manuais e hipóteses com exame registrado permanecem disponíveis mesmo após mudança da HMA.

## Fontes e limites

Consultadas em 22/10/2026. As regras documentais de priorização são decisões de implementação, não escores clínicos validados.

- [Heel Pain / Plantar Fasciitis — CPG 2023](https://doi.org/10.2519/jospt.2023.0303): história e exame precisam compor padrão anatômico compatível; não usar primeiros passos isolados como confirmação.
- [Lateral Ankle Ligament Sprains — CPG 2021](https://doi.org/10.2519/jospt.2021.0302): história, exame, função e investigação diferencial; antecedente traumático não equivale a lesão atual.
- [ESSKA-AFAS: peroneal tendon pathologies, 2018](https://pmc.ncbi.nlm.nih.gov/articles/PMC6154028/): consenso com evidência limitada em vários aspectos; não criar confirmação por contagem de testes.
- [ACR: Acute Trauma to the Ankle, 2020](https://pubmed.ncbi.nlm.nih.gov/33153549/): indicação de imagem depende de contexto e aplicabilidade das regras. HMA incompleta não fornece Ottawa negativo/positivo.
- [The Evolution of Sinus Tarsi Syndrome — critical review, 2023](https://pubmed.ncbi.nlm.nih.gov/37959343/): quadro heterogêneo, sem teste clínico isolado confirmatório; registrar como dor regional a investigar.
- [Midportion Achilles Tendinopathy — CPG 2024](https://doi.org/10.2519/jospt.2024.0302): diretriz específica para porção média; dor posterior genérica não permite presumir tendinopatia ou localização no tendão.

## Validação e preservação

- `clinical_evidence_reasoning.test.cjs`: 18 cenários, incluindo caso motivador, calcanhar inespecífico, negativas/pseudonegativas, familiares, regiões/lados distintos, eventos remotos, seleção dos quatro novos diferenciais, idempotência e origem/cache.
- `clinical_evidence_integration.test.cjs`: fonte compartilhada, advertência de divergência no relatório/JSON, HMA atual versus antiga, texto manual e renderização real/lazy.
- `radar_lifecycle.contract.js`: integração real com camada nova, dez padrões regionais, trinta combinações de resultados e oito padrões científicos, além dos contratos anteriores.
- Suíte crítica completa de Agenda/Planos, financeiro/identidade, WhatsApp, câmera, Documentos, Anamnese/sugestões, Evolução, relatórios, isolamento e motores regionais mantida no workflow hospedado `Agenda e planos - regressao critica`.
- Sem alteração de dados de pacientes, esquema, autenticação, pagamentos, CSS global ou site institucional. Checagem visual usa somente página sintética isolada, sem autosave/autenticação.

## Backup e reversão

Base: `37a9ee517e1124664bee15c5dfba08da70bced5e` (PR 217 já publicada).

Backup pré-edição fora da pasta pública: `C:/Users/User/.codex/backups/kinesys-20261022-radar-evidencias-v23/antes.zip`, 525 entradas verificadas, SHA-256 `A1431366D74F1763DB891843F866BE672B2AD3B3CCED01FBEA77BB5A6C4ED470`.

Reversão seletiva via nova PR do commit desta versão, preservando as versões anteriores e dados reais; passar a barreira novamente. Não restaurar banco nem a pasta institucional. Esta implementação em branch não autoriza publicação; integração em `main` depende de pedido de publicação e check obrigatório aprovado.
