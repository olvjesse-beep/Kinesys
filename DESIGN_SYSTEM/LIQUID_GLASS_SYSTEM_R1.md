# KineSys — Liquid Glass System R1

## Direção

O Liquid Glass do KineSys é uma extensão da direção **Clínica de Precisão**, não uma substituição da identidade existente. Petróleo continua estruturando leitura e teal continua significando ação/foco. O glass é o material de superfícies interativas e camadas elevadas.

A referência é **clear / optical / liquid glass**, não frosted glass leitoso.

## Modo Impeccable

**Operate.** O usuário está trabalhando. Familiaridade, legibilidade, velocidade e consistência vencem espetáculo visual.

## Regra de aplicação

### Glass forte
Usar em superfícies que realmente se elevam ou orientam:
- sidebar/drawer;
- topbar;
- login;
- modais e diálogos;
- toasts e overlays;
- botões primários/secundários;
- popovers e superfícies flutuantes.

### Glass leve
Usar com alta opacidade e baixo ruído em:
- cards administrativos;
- campos de formulário;
- tabs/segmented controls;
- filtros e painéis auxiliares;
- KPIs e resumos operacionais.

### Flat / quase sólido
Preservar em superfícies densas de leitura:
- HMA;
- Avaliação;
- Evolução;
- relatórios longos;
- tabelas;
- áreas de documentação clínica;
- grids densos da Agenda.

Nessas áreas o material pode manter borda/reflexo sutil, mas a opacidade sobe para preservar contraste e leitura prolongada.

## Material

O efeito não deve depender apenas de blur. A sensação de vidro vem de:
- transparência controlada;
- highlight especular superior;
- borda óptica clara;
- leve contraste entre luz e sombra internas;
- tint petróleo/teal;
- backdrop-filter moderado;
- sombra somente quando há elevação real.

Evitar:
- névoa branca;
- blur excessivo;
- cards em cápsulas por toda a interface;
- glass dentro de glass sem função;
- sombra pesada em cards comuns;
- teal decorativo sem significado funcional.

## Componentes

### Botão primário
Teal translúcido de alta opacidade, highlight interno e sombra curta funcional. Hover ilumina ligeiramente; active desloca 1px; disabled remove profundidade.

### Botão secundário
Vidro claro translúcido, texto petróleo, borda clara e sem volume excessivo.

### Inputs
Superfície clara translúcida. Focus aumenta opacidade, define borda teal e halo de foco. Disabled perde blur e contraste.

### Cards
Vidro claro quase sólido, sem sombra externa por padrão. A hierarquia vem da borda/reflexo e do espaçamento.

### Modal / diálogo
Glass forte com sombra real de elevação e backdrop discreto.

### Login
Composição dedicada: fundo petróleo, intro em vidro teal escuro e painel de autenticação em vidro claro. O login deve comunicar imediatamente a identidade KineSys.

## Estados obrigatórios

Todo controle interativo deve contemplar:
- default;
- hover;
- focus-visible;
- active/selected;
- disabled;
- error quando aplicável;
- loading quando aplicável.

## Browser surfaces

Seleção de texto, caret e scrollbar também seguem a paleta teal/petróleo.

## Acessibilidade e performance

- contraste de texto preservado;
- 16px em campos mobile quando previsto pelo KDS;
- `prefers-reduced-motion` respeitado;
- fallback sem `backdrop-filter` obrigatório;
- no mobile, maior opacidade e blur mais contido para reduzir custo de composição.

## Fonte de verdade

Implementação sistêmica: `styles/liquid_glass_system-1.0.0.css`.

O sidebar mantém sua camada especializada em `styles/navigation_glass-1.0.0.css`; a camada sistêmica não deve redefinir `#ks_sidebar`.
