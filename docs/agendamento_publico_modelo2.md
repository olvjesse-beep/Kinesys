# Portal público de agendamento — modelo 2

Escolha visual do usuário em 22/10/2026: masthead petróleo, progresso horizontal,
calendário mensal à esquerda e resumo do atendimento à direita. Abaixo de 900px,
calendário/formulário vêm antes do perfil longo. Todos os dados do responsável,
consentimento, validação e reserva atômica continuam no fluxo canônico existente.

O calendário é apenas uma apresentação dos `dias` retornados pela fronteira pública.
Datas sem horários são desabilitadas; navegação limita-se aos meses retornados.
Construção em UTC evita mudar o dia conforme fuso. Retorno atrasado de outra consulta
não pode preencher o atendimento atual. Não existe consulta direta a tabelas públicas.

Nenhum schema, Edge Function, prontuário, financeiro, Agenda interna ou site institucional
foi alterado. Nenhum agendamento real foi criado durante o desenvolvimento.

## Verificação

- `node tests/agendamento_online_public_portal.contract.js`
- `node tests/agendamento_publico_modelo2.test.cjs`
- Demais suítes de `agenda-edit-contract.yml`, sem reduzir a barreira hospedada.
- Prévia segura: `node tests/helpers/public_booking_preview.cjs`, porta local 4173.
  Usa dados sintéticos e simula confirmação sem chamar produção. Não executar o helper no hosting.
- Capturas/relatório de comparação visual em `artifacts/design-agendamento-20261022/`
  e `design-qa.md` local (incluindo relatórios anteriores preservados).

## Backup e reversão

Base de produção anterior: `325636e5bb606875e8c18b7be25a7e44ed957a23`.
Backup de arquivos e QA anterior fora da pasta pública:
`C:/Users/User/.codex/backups/kinesys-20261022-agendamento-modelo2`.
Reverter exclusivamente esta alteração por nova PR. Não restaurar bancos nem pastas
inteiras. Publicação futura só em `public_html/app`, depois da aprovação e da barreira
de regressão; nunca a pasta pai institucional.

Arte de fundo criada com ImageGen nativo a partir do modelo escolhido, sem texto,
salva em `agendamento/banner-kinesys.png`. Ícones oficiais Tabler v3.31.0, licença MIT,
reutilizados de `assets/vendor/tabler`; não há ícones SVG desenhados manualmente.
