from pathlib import Path


def replace_exact(path_name, old, new, count=1):
    path = Path(path_name)
    text = path.read_text(encoding="utf-8")
    actual = text.count(old)
    if actual != count:
        raise SystemExit(
            f"{path_name}: expected {count} occurrence(s), found {actual}: {old[:100]!r}"
        )
    path.write_text(text.replace(old, new), encoding="utf-8")


# KDS semantic tokens: preserve meaning while removing literal drift.
token_anchor = "  --kds-danger: #A53B33;\n  --kds-success: #2F735A;\n"
token_replacement = """  --kds-danger: #A53B33;
  --kds-danger-soft: #FFF7F7;
  --kds-danger-line: #E7C7C4;
  --kds-danger-line-strong: #DFA8A3;
  --kds-success: #2F735A;
  --kds-success-soft: #FBFFFC;
  --kds-focus-line: #72AFA8;
  --kds-focus-ring: rgba(42,167,157,.22);
  --kds-focus-halo: rgba(42,167,157,.10);
  --kds-overlay-backdrop: rgba(13,38,43,.46);
  --kds-shadow-control: 0 1px 4px rgba(9,42,48,.16);

  /* EVA — escala clínica contínua. Os cinco pontos preservam o gradiente
     funcional de intensidade da dor sem criar uma paleta decorativa. */
  --kds-eva-low: #43B97F;
  --kds-eva-mild: #A8CF62;
  --kds-eva-moderate: #F0CE4B;
  --kds-eva-high: #EE8B3E;
  --kds-eva-severe: #DC4D47;
"""
replace_exact("design_tokens.css", token_anchor, token_replacement)


# Base components: one radius scale, one semantic color vocabulary.
component_replacements = [
    ("border:1px solid #E1E9E6;", "border:1px solid var(--kds-line);"),
    ("border-radius:12px;", "border-radius:var(--kds-radius-md);"),
    ("    border-radius:10px;", "    border-radius:var(--kds-radius-sm);"),
    (
        "  color:#fff;\n}\n.btn-primary:hover{",
        "  color:var(--kds-surface);\n}\n.btn-primary:hover{",
    ),
    ("  box-shadow:0 5px 14px rgba(30,117,111,.12);", "  box-shadow:none;"),
    (
        "  background:#fff;\n  border-color:#D3DFDC;\n  color:#3A555B;",
        "  background:var(--kds-surface);\n  border-color:var(--kds-line);\n  color:var(--kds-text-secondary);",
    ),
    (
        "  background:#F6F9F8;\n  border-color:#ADC8C3;\n  color:#245D58;",
        "  background:var(--kds-surface-soft);\n  border-color:var(--kds-line-strong);\n  color:var(--kds-accent-hover);",
    ),
    (
        "  background:#fff;\n  border-color:#E7C7C4;\n  color:var(--kds-danger);",
        "  background:var(--kds-surface);\n  border-color:var(--kds-danger-line);\n  color:var(--kds-danger);",
    ),
    (
        "  background:#FFF3F2;\n  border-color:#DFA8A3;\n  color:#8F3029;",
        "  background:var(--kds-danger-soft);\n  border-color:var(--kds-danger-line-strong);\n  color:var(--kds-danger);",
    ),
    ("  border-radius:7px;", "  border-radius:var(--kds-radius-sm);"),
    ("  border-radius:6px;", "  border-radius:var(--kds-radius-sm);"),
    ("  border:1px solid #D4E0DD;", "  border:1px solid var(--kds-line-strong);"),
    ("  color:#243F45;", "  color:var(--kds-text-ink);"),
    ("  border-color:#72AFA8;", "  border-color:var(--kds-focus-line);"),
    (
        "  box-shadow:0 0 0 3px rgba(42,167,157,.10);",
        "  box-shadow:0 0 0 3px var(--kds-focus-halo);",
    ),
    (
        "  border-color:#D64545;\n  background:#FFF7F7;\n  box-shadow:0 0 0 3px rgba(214,69,69,.10);",
        "  border-color:var(--kds-danger);\n  background:var(--kds-danger-soft);\n  box-shadow:none;",
    ),
    (
        "  border-color:#36A269;\n  background:#FBFFFC;",
        "  border-color:var(--kds-success);\n  background:var(--kds-success-soft);",
    ),
]
for old, new in component_replacements:
    replace_exact("design_components.css", old, new)


# Screen surfaces: flatten the source rather than overriding later.
screen_replacements = [
    (
        "body.ks-design-ready ::selection{background:#CFEAE5;color:#123F42}",
        "body.ks-design-ready ::selection{background:var(--kds-accent-soft);color:var(--kds-text)}",
    ),
    (
        ".ks-patient-context{margin-top:13px;margin-bottom:2px;border-radius:12px;border-color:var(--kds-line);box-shadow:var(--kds-shadow-soft);gap:12px}",
        ".ks-patient-context{margin-top:13px;margin-bottom:2px;border-radius:var(--kds-radius-md);border-color:var(--kds-line);box-shadow:none;gap:12px}",
    ),
    (
        ".ks-patient-avatar, .ks-patient-initial{border-radius:9px}",
        ".ks-patient-avatar, .ks-patient-initial{border-radius:var(--kds-radius-sm)}",
    ),
    (
        ".ks-patient-tabs{gap:2px;padding:2px;border-radius:9px;background:#F6F9F8}",
        ".ks-patient-tabs{gap:2px;padding:2px;border-radius:var(--kds-radius-sm);background:var(--kds-surface-soft)}",
    ),
    (
        ".ks-patient-tabs button{font-weight:650;border-radius:7px}",
        ".ks-patient-tabs button{font-weight:650;border-radius:var(--kds-radius-sm)}",
    ),
    (
        ".ks-patient-tabs button:hover, .ks-patient-tabs button.active{background:#E8F4F1;color:#176E67}",
        ".ks-patient-tabs button:hover, .ks-patient-tabs button.active{background:var(--kds-accent-soft);color:var(--kds-accent-hover)}",
    ),
    (
        ".ks-eyebrow, .eyebrow, .ks-section-eyebrow{font-weight:760!important;color:var(--kds-text-subtle)!important}",
        ".ks-eyebrow, .eyebrow, .ks-section-eyebrow{font-weight:650!important;color:var(--kds-text-subtle)!important}",
    ),
    (
        ".ks-home-stats>div{padding:14px 15px;border-radius:12px;box-shadow:none;background:#fff}",
        ".ks-home-stats>div{padding:14px 15px;border-radius:var(--kds-radius-md);box-shadow:none;background:var(--kds-surface)}",
    ),
    (
        ".ks-home-crm{border-radius:12px;box-shadow:none}",
        ".ks-home-crm{border-radius:var(--kds-radius-md);box-shadow:none}",
    ),
    (
        ".ks-patient-card{border-radius:12px!important;box-shadow:none!important;border-color:#DCE6E3!important}",
        ".ks-patient-card{border-radius:var(--kds-radius-md)!important;box-shadow:none!important;border-color:var(--kds-line)!important}",
    ),
    (
        ".ks-patient-card:hover{border-color:#B9D1CC!important;background:#FEFFFF}",
        ".ks-patient-card:hover{border-color:var(--kds-line-strong)!important;background:var(--kds-surface-soft)}",
    ),
    (
        ".ks-prontuario-resumo{padding:16px 18px!important;border-radius:13px!important;box-shadow:0 9px 24px rgba(17,53,61,.10)!important}",
        ".ks-prontuario-resumo{padding:16px 18px!important;border-radius:var(--kds-radius-md)!important;box-shadow:none!important;background:var(--kds-surface)!important;color:var(--kds-text)!important;border:1px solid var(--kds-line)!important}",
    ),
    (
        ".ks-prontuario-actions .btn-nav[onclick*=\"excluirPaciente\"]:hover{background:#FFF3F2!important;color:#9B3932!important;border-color:#F0D4D1!important}",
        ".ks-prontuario-actions .btn-nav[onclick*=\"excluirPaciente\"]:hover{background:var(--kds-danger-soft)!important;color:var(--kds-danger)!important;border-color:var(--kds-danger-line)!important}",
    ),
    (
        "#tela_financeiro .finance-stats>div{padding:12px 13px;border-radius:10px;box-shadow:none}",
        "#tela_financeiro .finance-stats>div{padding:12px 13px;border-radius:var(--kds-radius-sm);box-shadow:none}",
    ),
    (
        "#tela_financeiro .finance-plan-card{padding:12px 13px;border-radius:10px}",
        "#tela_financeiro .finance-plan-card{padding:12px 13px;border-radius:var(--kds-radius-sm)}",
    ),
    (
        "#tela_financeiro .finance-plan-actions button{border-radius:7px}",
        "#tela_financeiro .finance-plan-actions button{border-radius:var(--kds-radius-sm)}",
    ),
    (
        ".ks-drawer{box-shadow:-16px 0 44px rgba(18,48,55,.15)!important}",
        ".ks-drawer{box-shadow:var(--kds-shadow-float)!important}",
    ),
    (
        "#tela_configuracoes .ks-msg-template-item{border-radius:10px;box-shadow:none;padding:11px 12px}",
        "#tela_configuracoes .ks-msg-template-item{border-radius:var(--kds-radius-sm);box-shadow:none;padding:11px 12px}",
    ),
    (
        "#tela_configuracoes .ks-msg-editor{border-radius:12px;padding:15px}",
        "#tela_configuracoes .ks-msg-editor{border-radius:var(--kds-radius-md);padding:15px}",
    ),
    (
        "body.ks-design-ready .tabela-pacientes{border-radius:10px;border-color:var(--kds-line);box-shadow:none}",
        "body.ks-design-ready .tabela-pacientes{border-radius:var(--kds-radius-sm);border-color:var(--kds-line);box-shadow:none}",
    ),
    (
        ".ks-dialog{border-radius:14px;box-shadow:0 26px 70px rgba(13,35,41,.24)}",
        ".ks-dialog{border-radius:var(--kds-radius-lg);box-shadow:var(--kds-shadow-float)}",
    ),
    (
        "body.ks-design-ready .modal-box{border-radius:14px;box-shadow:0 26px 70px rgba(13,35,41,.22)}",
        "body.ks-design-ready .modal-box{border-radius:var(--kds-radius-lg);box-shadow:var(--kds-shadow-float)}",
    ),
    (
        "body.ks-design-ready[data-tela=\"tela_login\"] .login-card{max-width:430px;padding:31px!important;border-radius:15px!important;box-shadow:0 20px 54px rgba(20,50,57,.09)!important}",
        "body.ks-design-ready[data-tela=\"tela_login\"] .login-card{max-width:430px;padding:31px!important;border-radius:var(--kds-radius-lg)!important;box-shadow:var(--kds-shadow-float)!important}",
    ),
]
for old, new in screen_replacements:
    replace_exact("design_screens.css", old, new)


# Evaluation workspace: preserve clinical semantics; standardize source.
eval_replacements = [
    ("    border-radius: 10px;", "    border-radius: var(--kds-radius-sm);", 1),
    (
        "    outline: 3px solid rgba(21, 159, 145, .28);",
        "    outline: 3px solid var(--kds-focus-ring);",
        1,
    ),
    ("    border-radius: 12px;", "    border-radius: var(--kds-radius-md);", 2),
    (
        "    box-shadow: 0 0 0 3px rgba(21, 159, 145, .10);",
        "    box-shadow: 0 0 0 3px var(--kds-focus-halo);",
        1,
    ),
    ("    border-color: #a9dcd5;", "    border-color: var(--kds-line-strong);", 1),
    (
        "    background: rgba(13, 38, 43, .66);\n    backdrop-filter: blur(3px);",
        "    background: var(--kds-overlay-backdrop);\n    backdrop-filter: none;",
        1,
    ),
    (
        "    border-radius: 18px;\n    background: var(--kds-surface);\n    box-shadow: 0 24px 72px rgba(5, 28, 33, .30);",
        "    border-radius: var(--kds-radius-lg);\n    background: var(--kds-surface);\n    box-shadow: var(--kds-shadow-float);",
        1,
    ),
    ("    font-size: 24px;", "    font-size: var(--kds-font-title-mobile);", 1),
    (
        "    background: linear-gradient(90deg, #43b97f 0%, #a8cf62 25%, #f0ce4b 50%, #ee8b3e 75%, #dc4d47 100%);",
        "    background: linear-gradient(90deg, var(--kds-eva-low) 0%, var(--kds-eva-mild) 25%, var(--kds-eva-moderate) 50%, var(--kds-eva-high) 75%, var(--kds-eva-severe) 100%);",
        1,
    ),
    (
        "    box-shadow: 0 1px 4px rgba(9, 42, 48, .22);",
        "    box-shadow: var(--kds-shadow-control);",
        2,
    ),
    (
        "    border-radius: 14px;\n    background: rgba(255, 255, 255, .96);\n    box-shadow: 0 10px 28px rgba(22, 63, 70, .10);\n    backdrop-filter: blur(8px);",
        "    border-radius: var(--kds-radius-md);\n    background: var(--kds-surface);\n    box-shadow: none;\n    backdrop-filter: none;",
        1,
    ),
    ("    border-color: #cfe1dd;", "    border-color: var(--kds-line-strong);", 1),
    (
        "        border-radius: 18px 18px 0 0;",
        "        border-radius: var(--kds-radius-lg) var(--kds-radius-lg) 0 0;",
        1,
    ),
]
for old, new, count in eval_replacements:
    replace_exact("avaliacao_experiencia-1.22.0.css", old, new, count=count)

eval_path = Path("avaliacao_experiencia-1.22.0.css")
eval_text = eval_path.read_text(encoding="utf-8")
marker = "/* QUIETER PASS 1 — EVALUATION WORKSPACE */"
if eval_text.count(marker) != 1:
    raise SystemExit("Could not safely integrate/remove QUIETER PASS 1 evaluation block")
eval_path.write_text(eval_text.split(marker, 1)[0].rstrip() + "\n", encoding="utf-8")


# Agenda: preserve status tint/border semantics, remove decorative stripes.
agenda_replacements = [
    (
        "  font-weight:800;\n  text-transform:uppercase;\n  letter-spacing:.25px;",
        "  font-weight:700;\n  text-transform:none;\n  letter-spacing:0;",
    ),
    (
        "#tela_agenda .agenda-dia-cabecalho.hoje{background:#EAF8F5;box-shadow:inset 0 -3px 0 var(--kds-accent)}",
        "#tela_agenda .agenda-dia-cabecalho.hoje{background:var(--kds-accent-soft);box-shadow:none;border-bottom:1px solid var(--kds-accent)}",
    ),
    (
        "#tela_agenda .agenda-dia-cabecalho.feriado{background:#F8F2F1;box-shadow:inset 0 -3px 0 #A45A50}",
        "#tela_agenda .agenda-dia-cabecalho.feriado{background:var(--kds-danger-soft);box-shadow:none;border-bottom:1px solid var(--kds-danger)}",
    ),
    (
        "#tela_agenda .agenda-dia-cabecalho.feriado.hoje{background:#F5EFEC;box-shadow:inset 0 -3px 0 #A45A50}",
        "#tela_agenda .agenda-dia-cabecalho.feriado.hoje{background:var(--kds-danger-soft);box-shadow:none;border-bottom:1px solid var(--kds-danger)}",
    ),
    ("  border-left:3px solid #247D73;", "  border-left:1px solid #247D73;"),
]
for old, new in agenda_replacements:
    replace_exact("design_agenda.css", old, new)

print(
    "KineSys quieter pass 2 applied: source tokens, radii, elevation and clinical semantic colors normalized."
)
