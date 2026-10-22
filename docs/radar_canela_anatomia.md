# Correção de reconhecimento anatômico: canela

O caso sintético reproduz “dor na lateral da canela”, início gradual e piora com eversão. O resumo usava uma lista histórica sem “canela”, embora a topologia segmentada já reconhecesse o termo. Isso gerava “Dor em não especificado”.

## Correção

- Resumo reaproveita o reconhecimento segmentado para canela/canelas e apresenta “Dor na região lateral da perna (canela)”, preservando outros qualificadores explicitados.
- O grafo registra o segmento anatômico perna e a origem exata, sem fingir que corresponde à articulação do tornozelo ou criar novo banco/diagnóstico. Localização conhecida e banco articular de exame são conceitos separados.
- Perguntas esclarecem lado, início e ponto em que o movimento reproduz o sintoma. Eversão permanece comportamento relatado, não confirmação de uma doença tendínea.
- Sintomas da canela não fornecem pistas positivas de primeiros passos/eversão para outra queixa do calcanhar/tornozelo. Negativas, familiares e destinos de irradiação não viram nova queixa própria.
- O JSON/relatório conserva o segmento, canela, evolução e eversão sem editar a HMA nem sobrescrever texto profissional revisado.
- Corrigida separação Unicode de orações: o “e” final de “mãe” não inicia uma nova oração que perderia o sujeito familiar.
- Revisão de cache dos quatro módulos afetados; nenhum CSS, dado clínico real, banco ou regra de confirmação alterado.

## Verificação e segurança

Sete cenários novos em `tests/clinical_canela_anatomy.test.cjs`, incluindo o renderizador real, integrados à barreira hospedada de Agenda e Planos, além das suítes anteriores. Testes usam somente dados sintéticos; não foi digitado o caso em avaliação real.

Base de produção: `dc8a8eafb4bd2862b36c4f97694bddc64ca24f87`. Backup pré-edição: `C:/Users/User/.codex/backups/kinesys-20261022-canela-anatomia/antes.zip`, 530 entradas verificadas, SHA256 `91385CBD73DC49DA6FDE41BBD50DD87583051B93BB37A669412FAF3FC0E00AD1`.

Reversão seletiva por nova PR do commit desta correção, passando a barreira obrigatória novamente. Preservar versão 23, dados reais e site institucional; não restaurar banco ou pasta pública inteira. Implementação em branch não significa publicação.
