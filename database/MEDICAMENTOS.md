# Registro medicamentoso individual

Fonte: [Medicamentos registrados no Brasil — Anvisa](https://dados.anvisa.gov.br/dados/DADOS_ABERTOS_MEDICAMENTOS.csv), obtida em 24/10/2026. SHA-256: `f0b546e2d3a737a90fbc866348356cd766344bd2f4b8f488a43d66a0d7a30877`.

O snapshot contém 228.869 linhas. Das 85.092 linhas marcadas **Ativo**, 12.367 foram excluídas por ausência de nome, princípio ativo ou registro. As demais foram deduplicadas pelo nome e pelo campo integral de princípio ativo, resultando em **6.959 opções**. Registros, classes e categorias de origem são mantidos em cada opção. São nomes/produtos, não apresentações, posologias ou recomendações de tratamento.

O arquivo oficial tem codificação Windows-1252, delimitador `;` e campos entre aspas, inclusive vírgulas internas. Nomes comerciais e genéricos não são tratados como alternativas intercambiáveis. O campo de princípios ativos pode conter associações, sais ou formas: mantemos o campo completo sem inferir coadministração, equivalência ou apresentação. Produtos de mesmo nome com campos distintos continuam separados e identificados pelo campo correspondente. A situação é a do snapshot, não uma consulta regulatória em tempo real nem garantia de comercialização.

Busca por nome e princípio ativo, sem acentos/caixa, prioriza nome exato e prefixo. A interface mostra até 20 resultados, sem truncar a base. Refinar a busca encontra os demais. O nome e os princípios ativos do item selecionado compõem **uma tag**, persistida pelas funções existentes. Enter sem opção destacada continua registrando o texto informado, sem inferir fármaco. Não são enviadas buscas ou informações de pacientes à Anvisa.

Descrições antigas permanecem literais, mesmo que ambíguas. Não há alteração de prontuários, recebimentos, banco, regras de prescrição ou relatórios revisados. As associações incorretas da antiga tabela (por exemplo Dorflex Uno com tramadol, Vonau com vonoprazana e diferentes insulinas agrupadas) não são usadas nas novas opções.

## Atualização reprodutível

Baixe a fonte oficial fora do repositório. Execute, com a data real da obtenção:

```
node tools/import_medication_catalog.cjs caminho/arquivo.csv YYYY-MM-DD database/medicamentos_anvisa-YYYYMMDD.js
```

O importador é uma transformação mecânica local. Não altera o CSV. Não separar ingredientes pela vírgula, remover sais ou associar marcas por proximidade de nomes. Revise diffs e exclusões, atualize o caminho no loader e nos testes e invalide seus caches. Execute `node tests/medication_catalog.test.cjs` e toda a barreira hospedada de Agenda e Planos antes de integrar.

Não incluir o CSV bruto, dados de pacientes ou credenciais na PR. Reversão seletiva: reverter a PR desta funcionalidade (catálogo, adaptador, busca e revisões dos assets), sem restaurar bancos ou prontuários.
