KineSys Clinical — Design System Etapa 12

ETAPA 12 CONCLUÍDA: LIMPEZA DE ESTILOS INLINE VISUAIS

Base: KineSys_clinico_v1.11.2_DESIGN_SYSTEM_ETAPA_11

Principais mudanças:
- criado design_utilities.css como camada oficial de utilitários;
- 129 atributos style no HTML -> 31, todos apenas display:none;
- 0 propriedades visuais estáticas inline no HTML principal;
- script.js: 56 style="..." -> 0;
- script.js: 18 style.cssText -> 0;
- estados visuais finitos migrados para classes/modificadores;
- estilos calculados de runtime preservados;
- exportações/documentos independentes preservam formatação própria;
- 789 !important ativos mantidos por segurança após teste de cascata.

Próxima etapa:
ETAPA 13 — Consolidação da responsividade.
