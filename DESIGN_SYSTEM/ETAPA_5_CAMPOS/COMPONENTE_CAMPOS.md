# KineSys — Componente de Campos | Etapa 5

Fonte de verdade: `design_components.css`.

## Contrato padrão
- Input/select: **15,5 px / 45 px / raio 8 px**.
- Padding base: **10 px 12 px**.
- Select: reserva de espaço à direita para o indicador nativo.
- Textarea: mesma base, `min-height:120px` e redimensionamento vertical.
- Placeholder, foco, disabled, readonly, erro e sucesso são unificados.
- Mobile: **16 px** para evitar zoom automático.

## Exceção compacta
A Agenda pode usar **14 px / 42 px** apenas em:
- filtros da toolbar;
- inputs da grade semanal de horários.

## Regra de manutenção
Módulos podem ajustar **largura, grid, margem e altura funcional**. Não devem redefinir globalmente:
- fonte;
- altura padrão;
- padding;
- borda;
- raio;
- placeholder;
- foco;
- estados disabled/readonly/error.

Se uma exceção visual for realmente necessária, ela deve ser explícita, limitada ao módulo e documentada — nunca outro `input/select/textarea` global.
