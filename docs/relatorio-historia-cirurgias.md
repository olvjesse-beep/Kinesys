# História clínica e datas individuais de cirurgias — sem IA

25/10/2026. Alteração separada do piloto de IA local. Base de produção: `755311e61b5e4fc45e758f4b95bc1a7eea3afb96`. Não acessa banco, não modifica critérios diagnósticos e não regrava prontuários existentes.

## Diagnóstico do gerador

O compositor já possui inventário, grafo documental, roteiro e auditoria. Porém, a realização gramatical tinha cobertura estreita: várias frases chegavam ao relatório praticamente iguais à anotação, e transições conversacionais como “Outra coisa.” eram tratadas como conteúdo a preservar. Isso não é resolvido trocando palavras aleatoriamente nem removendo as barreiras contra mudança de significado.

A revisão 6 amplia a gramática finita para origem/trajeto explícitos da irradiação, sublocalização declarada e agravantes coordenados. O roteiro separa parágrafos na transição discursiva auditada. A anotação original e seus offsets permanecem intactos. Negações, familiares, hipóteses, citações, termos desconhecidos e referências ambíguas continuam protegidos. A auditoria compara fonte e redação; um formato desconhecido pode continuar preservado e exigir revisão. Não há compreensão universal ou promessa de reescrever qualquer texto.

Exemplo sintético:

> Relata dor no ombro direito, com irradiação para mão. Essa dor piora ao deitar à noite e ao elevar o braço.
>
> Relata dor na região do tornozelo, principalmente na porção medial. Essa dor piora ao caminhar muito ou ficar muito tempo em pé.

O lado da mão e do tornozelo não é inventado. Referências ainda não resolvidas permanecem na revisão, sem liberar um diagnóstico. Relatórios manuais ou revisados não são regenerados automaticamente.

## Cirurgias

Cada procedimento selecionado recebe um campo acessível “Data (opcional)”, ao lado em largura ampla e abaixo em celular. Aceita a precisão efetivamente informada, como `15/03/2019`, `03/2019` ou `2019`, sem completar mês/dia nem inventar exatidão.

`dataCirurgia` pertence ao registro `{chave, texto, dataCirurgia, ...chavesLegadas}`, não à posição da tag. É preservada no array `avaliacao.cirurgias` e no JSON clínico existente (`clinicaEstruturada.cirurgias`), incluindo rascunho/reabertura. Sem migração ou mudança de API/RLS. As chaves legadas são preservadas, e abrir outro contexto limpa os registros anteriores. A restauração programática não dispara autosave/Radar no meio da carga.

O nome canônico não contém rótulo do campo nem botão de remoção. O relatório e a exportação somente leitura exibem a data junto ao procedimento: `Procedimento A (data informada: 03/2019)`. Registros antigos sem data continuam válidos; uma data geral antiga não é distribuída automaticamente entre várias cirurgias.

## Verificação e reversão

- `node tests/evaluation_history_surgery_dates.test.cjs`: pipeline real, significado, transições com origem, JSON clínico, datas independentes, legado, exclusão, limpeza de contexto e texto revisado.
- Demais suítes obrigatórias continuam no workflow de Agenda e Planos; nenhum teste anterior é retirado.
- Rodada local final: 98 comandos obrigatórios aprovados, incluindo sintaxe da prévia, Agenda/Planos/Financeiro e os contratos clínicos anteriores. Esse resultado não é certificação clínica nem garantia universal de ausência de erros.
- Conferência real no navegador: edição/reabertura de duas datas e relatório, com os módulos reais em prévia sem banco; tela estreita de 545 px sem overflow horizontal. A captura detectou contraste herdado inadequado nos nomes, corrigido com estilo estritamente limitado às tags de cirurgia. Screenshot preservado em `G:/KineSys-IA/Resultados/cirurgias-datas-previa-20261025.png`. A emulação das dimensões de notebook no Chrome não pôde ser concluída por indisponibilidade do controle de depuração; não declarar aprovação visual nesses tamanhos.
- Prévia sem banco: `node tests/helpers/free_exam_preview.cjs --history-surgeries`, `http://127.0.0.1:4199/`. Os botões Salvar/Finalizar reais ficam desativados; “Reabrir dados fictícios” apenas exercita as tags em memória. O roundtrip do JSON clínico é testado separadamente pelo código real no contrato acima.
- Backup completo original, 574 entradas verificadas: `G:/KineSys-IA/Backups/relatorio-base-completa-755311e-20261025.zip`, SHA256 `96714a3dcecfaa4f4af52563deeb67e614f609ea16da5154c488d2e15d422833`.
- Reverter seletivamente somente os arquivos desta mudança. Não restaurar banco, pastas públicas ou o piloto de IA. Nenhuma publicação é feita por este trabalho; merge/deploy exige o check hospedado obrigatório aprovado e pedido de publicação.
