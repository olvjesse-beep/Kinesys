# KineSys — Auditoria focal de tipografia: Regiões e Eixos de Exame

## Falha encontrada
A camada global de conforto tipográfico aumentava `.checkbox-pill`, porém o texto das regiões era renderizado em um `span` com regra legada mais específica (`.region-chips .checkbox-pill span`) fixada em 11 px. Assim, o label crescia, mas o texto visível permanecia pequeno.

O Motor Clínico 2.3.2 também mantinha regras locais de 10–12.5 px para direção do exame, cards de rota, achados e biblioteca manual, abaixo da escala confortável adotada no restante da Avaliação.

## Correção
- Regiões anatômicas: 17 px, altura mínima 44 px.
- Título “Regiões e eixos de exame”: 20 px.
- Região selecionada: 21 px.
- Direção/eixos: 18 px.
- Achados dos eixos: 15 px.
- Botões de rota: 14–14.5 px.
- Biblioteca manual: 14.5–15 px.
- Condições específicas: 15.5–16 px.
- Em telas <=1280 px, rotas passam de 3 para 2 colunas para evitar compressão tipográfica.

Nenhuma lógica clínica foi alterada.
