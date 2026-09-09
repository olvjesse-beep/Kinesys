KINESYS — DESIGN SYSTEM — ETAPA 11
Redução sistemática de !important

Base: Design System Etapa 10

Resultado seguro:
- 826 -> 789 ocorrências ativas de !important
- 37 removidas (-4,48%)
- design_foundation.css: 14 -> 0
- design_navigation.css: 6 -> 0
- KineSys.html: 319 -> 302

Critério:
Não foi adotada a menor contagem possível; foi adotada a menor contagem validada nesta etapa sem mudar a cascata computada nos cenários representativos de runtime.

Por que ainda existem 789?
A tipografia e partes do módulo clínico ainda precisam vencer estilos inline históricos existentes no HTML/JS. A remoção desses estilos inline visuais pertence à Etapa 12. Retirar seus !important antes disso produz regressão real de tipografia, espaçamento e alguns estados visuais.

Validações:
- 22/22 JS carregados: sintaxe OK
- 22/22 JS carregados: byte a byte idênticos à Etapa 10
- 8/8 CSS externos: parse OK
- 8/8 blocos CSS inline: parse OK
- IDs duplicados: 0
- referências locais ausentes: 0
- tokens --kds-* indefinidos: 0
- cascata simulada com body.ks-design-ready: 0 diferenças nos cenários validados
- auditoria histórica: mesmas 4 falhas já presentes na Etapa 10

Próxima etapa:
ETAPA 12 — limpar estilos inline puramente visuais.
