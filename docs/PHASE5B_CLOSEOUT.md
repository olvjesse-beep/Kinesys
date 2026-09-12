# KineSys — Phase 5B Closeout

Data do baseline: 2026-09-12

## Objetivo

A Phase 5B encerra a investigação dos artefatos históricos e ambíguos identificados no closeout da Phase 4. O objetivo foi resolver cada caso com evidência de carregamento real, histórico do arquivo e sucessor ativo, sem alterar comportamento funcional para simplificar a limpeza.

A Phase 5B não renomeou APIs, funções, IDs, chaves, contratos, tabelas ou estruturas Supabase. Também não alterou lógica ativa de Avaliação, Evolução, persistência ou Motor Clínico.

## Baseline

- Entrada operacional da primeira remoção da 5B: `a3557b0fcf3226084451afd33378921cfbbeaca7`.
- Baseline após a última remoção: `7ede50757892b19d6715f46411ab1c11fabcdeb8`.
- O `tests/phase5_cleanup.contract.js` protege 35 artefatos removidos ao longo das Phases 5A e 5B.
- A Phase 5B resolveu 5 artefatos que exigiam investigação específica.

## Casos resolvidos na Phase 5B

### `agenda.js`

Removido no PR #78 após comprovar que:

- `screen_loader-1.25.0.js` carrega `agenda-1.20.0.js`;
- não havia referência de runtime para `agenda.js`;
- o arquivo sem versão era apenas a cópia histórica inicial.

Sucessor preservado: `agenda-1.20.0.js`.

### `design_clinical_direction.css`

Removido no PR #79 após comprovar que:

- `index.html` e o bundle de Avaliação usam `design_clinical_direction-1.17.0.css`;
- a cópia sem versão não era carregada;
- a versão ativa continha evolução posterior à base histórica.

Sucessor preservado: `design_clinical_direction-1.17.0.css`.

### `cirurgias-1.17.0.js`

Removido no PR #81 após comprovar que:

- o bundle de Avaliação usa `cirurgias-1.18.0.js`;
- não havia referência literal ao arquivo 1.17.0;
- a remoção passou pelo Clinical Reasoning Regression completo.

Sucessor preservado: `cirurgias-1.18.0.js`.

### `clinical_engine_v232.js`

Removido no PR #82 após comprovar que:

- o runtime usa `clinical_engine-1.17.0.js`;
- o arquivo ativo corresponde ao Clinical Engine 2.5.0;
- `clinical_engine_v232.js` era a variante histórica 2.4.0;
- a remoção passou pelo Clinical Reasoning Regression completo.

Sucessor preservado: `clinical_engine-1.17.0.js`.

### `script.js`

Removido no PR #84 após verificação adicional por ser o caso core de maior risco:

- `index.html` carrega explicitamente `script-1.18.0.js`;
- `index.html` não carrega `script.js`;
- `script.js` só possuía o commit inicial de importação do repositório;
- `script-1.18.0.js` é o core mantido e recebeu as modularizações posteriores;
- `default.php` foi inspecionado e é a página padrão do Hostinger, não um entrypoint alternativo do KineSys;
- o Clinical Reasoning Regression foi previamente configurado para observar `script.js` e passou integralmente no PR de remoção.

Sucessor preservado: `script-1.18.0.js`.

## Resultado quantitativo da 5B

Os cinco PRs de remoção (#78, #79, #81, #82 e #84) eliminaram 12.947 linhas do diff do repositório, concentradas em cópias históricas não carregadas. As alterações auxiliares nesses PRs foram apenas contratos/workflows de proteção.

Ao final da Phase 5B, o contrato acumulado da Phase 5 mantém 35 artefatos legados ausentes e protege os sucessores ativos relevantes.

## Infraestrutura de validação

Durante a Phase 5B, os gates necessários foram mantidos no runner self-hosted Windows para evitar dependência dos minutos hospedados do GitHub Actions.

O PR #80 migrou o Clinical Reasoning Regression para `[self-hosted, Windows, X64]`, preservando o corpus e os comandos existentes e adicionando os caminhos clínicos legados aos gatilhos.

O PR #83 adicionou `script.js` aos gatilhos do Clinical Reasoning Regression antes da remoção do arquivo core histórico.

O PR #84 concluiu com 7/7 checks verdes:

- Phase 5 Cleanup Contract;
- Patient Data Normalization Modularization Contract;
- Clinical Reasoning Regression;
- Patient Form Helpers Modularization Contract;
- Team Management Modularization Contract;
- Fisio Home Patient Self-Service Contract;
- KineSys Quality Gate.

## Arquivos deliberadamente preservados

A Phase 5B não autoriza exclusões adicionais por semelhança de nome ou por ausência no `index.html`.

Em especial, permanecem preservados:

- `prontuario_export.js` e `prontuario_export_impl.js`: a implementação é carregada dinamicamente pela fachada no primeiro uso;
- `data_governance.js`: não fez parte do conjunto de legado resolvido e não deve ser removido sem auditoria própria;
- `default.php`: é artefato de hospedagem e qualquer remoção deve ser tratada como decisão de deploy/Hostinger, não como limpeza de runtime do KineSys;
- `database/cirurgias.js` e demais bancos clínicos: não devem ser confundidos com as cópias versionadas resolvidas na 5B;
- `script-1.18.0.js`, `clinical_engine-1.17.0.js`, `cirurgias-1.18.0.js` e Motor Clínico 3.x: runtime ativo protegido.

## Regras para a Phase 5C

A Phase 5C é exclusivamente reorganização física de pastas e caminhos.

1. Não combinar movimentação de arquivos com refatoração funcional.
2. Não renomear funções, IDs, chaves, objetos, RPCs, tabelas ou contratos internos.
3. Mover pequenos grupos por PR, atualizando somente os caminhos de carregamento necessários.
4. Revalidar referências diretas, lazy loading e screen loader após cada movimento.
5. Manter `script-1.18.0.js`, Motor Clínico, Avaliação, Evolução, persistência e Supabase fora de movimentos iniciais de alto risco.
6. Priorizar primeiro grupos estáticos ou de infraestrutura com fronteira clara.
7. Cada lote deve passar pelos contratos relevantes antes de squash-merge.

## Próximo bloco

- **Phase 5C — Folder Organization:** organizar a raiz do aplicativo em grupos físicos coerentes, começando por fronteiras de baixo risco e sem mudança de comportamento.
