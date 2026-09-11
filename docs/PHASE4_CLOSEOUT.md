# KineSys — Phase 4 Closeout

Data do baseline: 2026-09-11

## Objetivo

A Phase 4 encerra a rodada de modularização incremental do `script-1.18.0.js` sem forçar extrações em fronteiras clínicas ou de persistência sensível.

A Phase 4T é exclusivamente uma fase de auditoria/fechamento. Ela não altera runtime, regras clínicas, Supabase, persistência, Avaliação, Evolução ou Motor Clínico.

## Baseline de entrada da 4T

- `main`: `656fff2d919875de316ba41eb3e1bcd30f243338`
- Merge anterior: Phase 4S (`report_ui_helpers_core-1.0.0.js`)
- Pós-merge da 4S: 21 workflows de `push` concluídos sem falha.

## Grafo de runtime auditado

Auditoria automatizada a partir de `index.html`:

- 38 scripts locais carregados diretamente.
- 21 folhas de estilo locais carregadas diretamente.
- 59 assets locais diretos no total.
- 57 assets adicionais alcançados por referências de runtime/lazy loading.
- 116 assets locais alcançáveis no grafo de runtime.
- 81 arquivos JavaScript alcançáveis no runtime passaram `node --check`.
- Nenhum asset local direto referenciado pelo `index.html` estava ausente.

Arquivos clínicos que não aparecem diretamente no `index.html`, mas são runtime válido e NÃO devem ser tratados como lixo incluem, entre outros:

- `clinical_region_loader-1.0.0.js`
- `clinical_engine-1.17.0.js`
- `clinical_reasoning_hma-3.0.0.js`
- `clinical_reasoning_shoulder-3.1.0.js`
- `clinical_reasoning_elbow-3.1.0.js`
- `clinical_reasoning_cervical-3.1.0.js`
- `clinical_reasoning_wrist-3.1.0.js`
- respectivos CSS do Motor Clínico
- `database/mapeamento_clinico_core-1.0.0.js`
- `database/mapeamento_regioes-1.0.0.js`
- bancos regionais em `database/regioes/`
- `agenda-1.20.0.js`
- `agenda_lifecycle-1.0.0.js`
- `financeiro_workspace-1.20.1.js/.css`
- `financeiro_lancamentos-1.20.0.js/.css`
- `prontuario_export_impl.js`

## Monólito ao final da modularização

`script-1.18.0.js`:

- 658.583 bytes.
- 325 declarações `function` detectadas; 31 são `async function`.
- 16 ocorrências de `_supabase`.
- 3 ocorrências de `salvarPacienteNaNuvem`.
- 363 menções textuais relacionadas a Avaliação.
- 91 menções textuais relacionadas a Evolução.

Esses indicadores, somados à inspeção das fronteiras restantes, mostram que o código que permaneceu no monólito está significativamente concentrado em persistência, prontuário e fluxo clínico. A modularização é encerrada aqui para não trocar redução de arquivo por risco clínico/operacional.

## Candidatos para limpeza posterior

A lista abaixo NÃO é autorização de exclusão. Ela é o ponto de partida da Phase 5 e cada arquivo deve passar por nova verificação antes de ser removido.

### Alta confiança — sem referência de runtime e sem outra referência textual encontrada na auditoria

- `KineSys_v1.15.0_DEPLOY_APP.zip`
- `agenda-audit__agenda-1.20.0.js`
- `analise_admin.js`
- `cirurgias-1.17.0.js`
- `credito_cliente.js`
- `descontos_financeiros.js`
- `design_clinical_direction.css`
- `design_evaluation_workspace-1.17.0.css`
- `design_evaluation_workspace-1.17.1.css`
- `design_home_activity-1.18.2.css`
- `design_home_activity-1.18.4.css`
- `design_system-1.17.1.js`
- `design_system-1.18.0.js`
- `design_system-1.18.1.js`
- `design_system-1.18.2.js`
- `design_system-1.18.4.js`
- `design_system-1.18.5.js`
- `financeiro_workspace-1.19.0.css`
- `financeiro_workspace-1.19.0.js`
- `financeiro_workspace-1.20.0.css`
- `financeiro_workspace-1.20.0.js`
- `home_detalhes-1.18.2.js`
- `home_detalhes-1.18.4.js`
- `home_fisioterapeuta_util-1.23.0.css`
- `home_fisioterapeuta_util-1.23.0.js`
- `pendencias_financeiras.js`
- `script-1.17.0.js`
- `script-1.17.1.js`

### Referência apenas histórica/documental — revisar antes de excluir

- `balanco_financeiro_admin.js`
- `clinical_engine_v232.js`
- `design_system.js`
- `financeiro.js`
- `home_detalhes.js`

Esses arquivos não são alcançados pelo grafo de runtime atual, mas aparecem em documentação/auditorias históricas.

### Ambíguos — exigem inspeção específica de referência antes de qualquer exclusão

- `agenda.js`
- `script.js`

Ambos ficaram fora do grafo de runtime, porém seus nomes ainda aparecem em arquivos que fazem parte do runtime ou em legado que referencia outros legados. A Phase 5 deve localizar a referência exata e provar se é apenas comentário/string histórica ou dependência real.

## Regras para Phase 5

1. Não remover arquivo apenas porque não está no `index.html`; considerar lazy loading e referências indiretas.
2. Revalidar cada candidato contra o código atual da `main` imediatamente antes da exclusão.
3. Fazer exclusões em lotes pequenos e temáticos.
4. Não combinar exclusão de legado com alteração funcional.
5. Rodar Quality Gate, contratos de dados e regressão clínica após cada lote relevante.
6. Manter Motor Clínico, Avaliação, Evolução e persistência fora da limpeza estrutural, salvo quando a mudança for somente de caminho e plenamente coberta por testes.
7. Reorganização de pastas deve ocorrer depois da remoção de legado comprovado, em PR separado e sem renomear APIs/funções/contratos internos.

## Próximo bloco

- **Phase 5A — App Cleanup Audit/Removal:** remoção dos candidatos de alta confiança em lotes rastreáveis.
- **Phase 5B — Legacy Resolution:** investigação dos candidatos históricos/ambíguos antes de remover ou preservar.
- **Phase 5C — Folder Organization:** reorganização física da pasta/app somente depois da limpeza, com mudanças de caminho separadas de mudanças funcionais.
