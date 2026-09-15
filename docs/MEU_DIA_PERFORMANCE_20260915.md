# Meu dia clínico + performance segura — 2026-09-15

## Escopo

Esta alteração corrige o vínculo do **Meu dia clínico** com a Agenda e reduz trabalho repetido do frontend/banco sem alterar regras clínicas, papéis de acesso, dados financeiros ou o conjunto de políticas RLS.

## Causa do Meu dia clínico

O Home comparava a referência JavaScript de `usuarioLogado` antes e depois de uma chamada assíncrona. A reidratação do mesmo perfil em um novo objeto fazia uma resposta válida de `kinesys_contexto_agenda` ser descartada. A correção compara a identidade estável `perfil_id + clinica_id` e mantém a validação do perfil/clínica retornados pelo backend.

## Otimizações conservadoras

- coalescimento de carregamentos simultâneos do Meu dia;
- coalescimento de leituras simultâneas de notificações e cache silencioso curto (15 s), preservando o polling de 60 s;
- índices para consultas reais observadas em Agenda, bloqueios, horários, pagamentos e notificações;
- avaliação única por instrução dos helpers RLS que não dependem da linha, sem remover políticas nem mudar papéis autorizados.

## Segurança e reversão

A migration não altera registros de pacientes, agenda, prontuário ou financeiro. Existe rollback SQL dedicado que restaura as expressões RLS anteriores e remove somente os novos índices. Os contratos automatizados verificam que a lógica de permissão permanece referenciando os mesmos helpers e papéis existentes.
