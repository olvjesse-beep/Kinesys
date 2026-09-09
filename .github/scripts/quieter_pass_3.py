from pathlib import Path
import re


def read(path):
    return Path(path).read_text(encoding="utf-8")


def write(path, text):
    Path(path).write_text(text, encoding="utf-8")


def replace_exact(path, old, new, count=1):
    text = read(path)
    actual = text.count(old)
    if actual != count:
        raise SystemExit(f"{path}: expected {count}, found {actual}: {old[:120]!r}")
    write(path, text.replace(old, new))


def replace_regex(path, pattern, repl, min_count=1, flags=0):
    text = read(path)
    new_text, count = re.subn(pattern, repl, text, flags=flags)
    if count < min_count:
        raise SystemExit(f"{path}: pattern changed {count}, expected at least {min_count}: {pattern!r}")
    write(path, new_text)
    return count


def quiet_positive_tracking(text):
    pattern = re.compile(r"letter-spacing\s*:\s*(?!-)(?:\d+(?:\.\d+)?px|\d*\.\d+em)", re.I)
    return pattern.sub("letter-spacing:0", text)


# ---------------------------------------------------------------------------
# 1. design_base.css — sentence case and flatter operational surfaces.
# Preserve the formal FisioFix printed-document section exactly.
# ---------------------------------------------------------------------------
base = read("design_base.css")
start_marker = "/* ==========================================================================\n           DOCUMENTOS FISIOFIX — padrão editorial clínico"
end_marker = "        #campos_comparecimento, #bloco_ia{"
if base.count(start_marker) != 1 or base.count(end_marker) != 1:
    raise SystemExit("Could not isolate FisioFix document section safely")
pre, rest = base.split(start_marker, 1)
doc, post = rest.split(end_marker, 1)

for name, segment in (("pre", pre), ("post", post)):
    segment = re.sub(r"text-transform\s*:\s*uppercase", "text-transform:none", segment, flags=re.I)
    segment = quiet_positive_tracking(segment)
    segment = re.sub(r"border-left\s*:\s*[34]px", "border-left:1px", segment, flags=re.I)
    if name == "pre":
        pre = segment
    else:
        post = segment

base = pre + start_marker + doc + end_marker + post

old_font = 'font-family: "Inter", "Segoe UI", Roboto, Helvetica, Arial, sans-serif;'
if base.count(old_font) != 1:
    raise SystemExit(f"Legacy Inter body guard failed: {base.count(old_font)}")
base = base.replace(old_font, "font-family: var(--kds-font-family-ui);")

base_replacements = [
    ("border: 1px solid var(--kds-brand-teal) ;", "border: 1px solid var(--kds-line) ;"),
    ("border-radius: 6px ;", "border-radius: var(--kds-radius-sm) ;"),
    ("box-shadow: 0 8px 20px rgba(0,0,0,0.15) ;", "box-shadow: none ;"),
    ("box-shadow:0 12px 26px rgba(25,72,77,.09);background:#FCFFFE", "box-shadow:none;background:var(--kds-surface-soft)"),
    ("box-shadow:0 18px 52px rgba(19,49,57,.18);z-index:1500", "box-shadow:none;z-index:1500"),
    ("box-shadow:0 24px 70px rgba(0,0,0,.22)", "box-shadow:none"),
    ("box-shadow:0 -10px 20px rgba(25,55,62,.05)", "box-shadow:none"),
]
for old, new in base_replacements:
    if old in base:
        base = base.replace(old, new)

write("design_base.css", base)


# ---------------------------------------------------------------------------
# 2. Sentence case / neutral tracking across operational UI source files.
# Short statuses may remain uppercase in their literal text, but CSS no longer
# forces full words and long labels into uppercase.
# ---------------------------------------------------------------------------
case_files = [
    "design_features.css",
    "financeiro_lancamentos-1.20.0.css",
    "design_navigation.css",
    "design_agenda.css",
    "design_clinical.css",
    "design_utilities.css",
]
for path in case_files:
    text = read(path)
    before = text
    text = re.sub(r"text-transform\s*:\s*uppercase", "text-transform:none", text, flags=re.I)
    text = quiet_positive_tracking(text)
    if text == before:
        raise SystemExit(f"No typography source cleaned in {path}")
    write(path, text)

# Tracking-only satellite modules.
for path in ["agenda_referencia-1.20.0.css", "design_clinical_direction-1.17.0.css"]:
    text = read(path)
    new = quiet_positive_tracking(text)
    if new == text:
        raise SystemExit(f"No positive tracking found in {path}")
    write(path, new)


# ---------------------------------------------------------------------------
# 3. Clinical layout: remove box-within-box framing and thick semantic stripes.
# Clinical state colors stay intact; only decorative width/elevation changes.
# ---------------------------------------------------------------------------
clinical = read("design_clinical.css")
clinical = re.sub(r"border-left\s*:\s*[34]px", "border-left:1px", clinical, flags=re.I)
clinical = clinical.replace(
    ".ks-data-governance-card{margin-top:18px;border-top:4px solid var(--kds-teal-strong)}",
    ".ks-data-governance-card{margin-top:18px;border-top:1px solid var(--kds-line)}",
)

old_hma = """.hma-live-suggestions{
    margin-top:10px;
    padding:11px 13px;
    background:#FBFCFA;
    border:1px solid #DCE8E4;
    border-left:1px solid #6B9F96;
    border-radius:9px;
    color:#52686B;
    font-size:12.5px;
    line-height:1.52;
}"""
new_hma = """.hma-live-suggestions{
    margin-top:12px;
    padding:10px 0 0;
    background:transparent;
    border:0;
    border-top:1px solid var(--kds-line-soft);
    border-radius:0;
    color:var(--kds-text-secondary);
    font-size:var(--kds-font-metadata);
    line-height:var(--kds-leading-text);
}"""
if clinical.count(old_hma) != 1:
    raise SystemExit(f"HMA live suggestions guard failed: {clinical.count(old_hma)}")
clinical = clinical.replace(old_hma, new_hma)

old_patient_strip = "#tela_avaliacao .patient-strip{gap:10px;padding:12px 13px 0;border:1px solid #E2EAE8;border-radius:11px;background:#FAFCFB;margin-bottom:14px}"
new_patient_strip = "#tela_avaliacao .patient-strip{gap:10px;padding:0;border:0;border-radius:0;background:transparent;margin-bottom:14px}"
if clinical.count(old_patient_strip) != 1:
    raise SystemExit(f"Patient strip legacy frame guard failed: {clinical.count(old_patient_strip)}")
clinical = clinical.replace(old_patient_strip, new_patient_strip)

if clinical.count("border:1px solid transparent!important;") != 1:
    raise SystemExit("Patient strip transparent border guard failed")
clinical = clinical.replace("border:1px solid transparent!important;", "border:0!important;")

old_na = ".teste-botoes-v14 .selecionado-nao_aplicavel{ background:#EDE9FE; border-color:#8B5CF6; color:#5B21B6; }"
new_na = ".teste-botoes-v14 .selecionado-nao_aplicavel{ background:var(--kds-surface-muted); border-color:var(--kds-line-strong); color:var(--kds-muted-strong); }"
if clinical.count(old_na) != 1:
    raise SystemExit("Non-applicable purple state guard failed")
clinical = clinical.replace(old_na, new_na)

# Source-level flattening for structural clinical cards; true alert semantics remain.
clinical = clinical.replace("box-shadow:0 8px 24px rgba(18,45,52,.08)", "box-shadow:none")
clinical = clinical.replace("box-shadow:0 8px 24px rgba(23,59,69,.05)", "box-shadow:none")
clinical = clinical.replace("box-shadow:0 5px 18px rgba(23,59,69,.04)", "box-shadow:none")
clinical = clinical.replace("box-shadow:0 6px 18px rgba(23,59,69,.04)", "box-shadow:none")

# HMA microtitles use normal clinical leading and less weight.
clinical = clinical.replace("line-height:1.2;\n    font-weight:820;", "line-height:var(--kds-leading-ui);\n    font-weight:700;")
clinical = clinical.replace("line-height:1.25;\n    font-weight:820;", "line-height:var(--kds-leading-ui);\n    font-weight:700;")
write("design_clinical.css", clinical)


# Clinical satellite: 3px rails -> 1px, structural shadows -> none, true modal -> shadow without border.
direction = read("design_clinical_direction-1.17.0.css")
direction = re.sub(r"border-left\s*:\s*3px", "border-left:1px", direction, flags=re.I)
direction = direction.replace("box-shadow:0 10px 26px rgba(21,72,72,.06)", "box-shadow:none")
direction = direction.replace("box-shadow:0 9px 24px rgba(21,72,72,.055)!important", "box-shadow:none!important")
old_dialog = ".ks-investigation-dialog{display:flex;flex-direction:column;width:min(700px,calc(100vw - 32px));max-height:min(86vh,820px);overflow:hidden;border:1px solid #CFE4DF;border-radius:18px;background:#FFFFFF;box-shadow:0 24px 70px rgba(7,38,43,.27);color:#24484E}"
new_dialog = ".ks-investigation-dialog{display:flex;flex-direction:column;width:min(700px,calc(100vw - 32px));max-height:min(86vh,820px);overflow:hidden;border:0;border-radius:var(--kds-radius-lg);background:var(--kds-surface);box-shadow:var(--kds-shadow-float);color:var(--kds-text)}"
if direction.count(old_dialog) != 1:
    raise SystemExit("Investigation dialog guard failed")
direction = direction.replace(old_dialog, new_dialog)
direction = direction.replace("background:rgba(13,40,43,.52);backdrop-filter:blur(5px);-webkit-backdrop-filter:blur(5px)", "background:var(--kds-overlay-backdrop);backdrop-filter:none;-webkit-backdrop-filter:none")
write("design_clinical_direction-1.17.0.css", direction)

# Semantic utility rails keep color, become thin.
utilities = read("design_utilities.css")
utilities = re.sub(r"border-left\s*:\s*4px", "border-left:1px", utilities, flags=re.I)
write("design_utilities.css", utilities)


# ---------------------------------------------------------------------------
# 4. Agenda: the grid itself provides structure; remove redundant outer frame.
# ---------------------------------------------------------------------------
agenda = read("design_agenda.css")
old_grade = "#tela_agenda .agenda-grade-scroll{margin-top:12px;border:1px solid var(--kds-line-soft);border-radius:10px;box-shadow:none}"
new_grade = "#tela_agenda .agenda-grade-scroll{margin-top:12px;border:0;border-radius:0;box-shadow:none}"
if agenda.count(old_grade) != 1:
    raise SystemExit("Agenda outer frame guard failed")
agenda = agenda.replace(old_grade, new_grade)
write("design_agenda.css", agenda)


# ---------------------------------------------------------------------------
# 5. Finance: flatter plan cards and suggestion dropdowns.
# ---------------------------------------------------------------------------
finance_workspace = read("financeiro_workspace-1.20.1.css")
finance_workspace = finance_workspace.replace("border-left:4px solid var(--fin-accent)", "border-left:1px solid var(--fin-accent)")
finance_workspace = finance_workspace.replace("box-shadow:0 12px 30px rgba(18,56,59,.16)", "box-shadow:none")
write("financeiro_workspace-1.20.1.css", finance_workspace)

ledger = read("financeiro_lancamentos-1.20.0.css")
ledger = ledger.replace("box-shadow:0 12px 30px rgba(18,56,59,.16)", "box-shadow:none")
write("financeiro_lancamentos-1.20.0.css", ledger)


# ---------------------------------------------------------------------------
# 6. Administrative analytics: fewer decorative gradients, semantic solids.
# ---------------------------------------------------------------------------
tokens = read("design_tokens.css")
anchor = "  --kds-success-soft: #FBFFFC;\n"
if tokens.count(anchor) != 1:
    raise SystemExit("Warning-token anchor guard failed")
tokens = tokens.replace(anchor, anchor + "  --kds-warning: #9B6A1F;\n  --kds-warning-soft: #FFF8E9;\n")
write("design_tokens.css", tokens)

features = read("design_features.css")
analytics = {
    "background:linear-gradient(180deg,#38c7aa,#1f9788)": "background:var(--kds-brand-teal)",
    "background:linear-gradient(180deg,#ffb86c,#f18445)": "background:var(--kds-warning)",
    "background:linear-gradient(180deg,#6fc3ff,#2f84d6)": "background:var(--kds-accent)",
    "background:linear-gradient(180deg,#8dd8c8,#2fa48c)": "background:var(--kds-success)",
    "background:linear-gradient(180deg,#ffc782,#f18d3f)": "background:var(--kds-warning)",
    "background:linear-gradient(180deg,#d8dfe6,#8ca0ad)": "background:var(--kds-muted)",
    "background:linear-gradient(180deg,#9cb5ff,#6076ff)": "background:var(--kds-accent-hover)",
    "background:linear-gradient(90deg,#6ea7ff,#375dff)": "background:var(--kds-accent)",
    "background:linear-gradient(90deg,#ffcf8e,#f08a3f)": "background:var(--kds-warning)",
    "background:linear-gradient(90deg,#90e2ca,#2ea78f)": "background:var(--kds-success)",
    "background:linear-gradient(90deg,#d7dde2,#8ca0ad)": "background:var(--kds-muted)",
}
for old, new in analytics.items():
    if old not in features:
        raise SystemExit(f"Analytics palette guard failed: {old}")
    features = features.replace(old, new)
features = features.replace("box-shadow:0 12px 26px rgba(17,76,86,.08)", "box-shadow:none")
features = features.replace("line-height:1.2", "line-height:var(--kds-leading-ui)")
write("design_features.css", features)


# ---------------------------------------------------------------------------
# 7. Login + true dialogs: normal surfaces stay flat; overlays elevate without
# hairline border + giant shadow combinations.
# ---------------------------------------------------------------------------
login = read("login_access-1.18.0.css")
old_shell = ".ks-access-shell{display:grid;grid-template-columns:1fr 1.05fr;background:#fff;border:1px solid #dce6e3;border-radius:24px;overflow:hidden;box-shadow:0 20px 70px #123d4410}"
new_shell = ".ks-access-shell{display:grid;grid-template-columns:1fr 1.05fr;background:var(--kds-surface);border:1px solid var(--kds-line);border-radius:var(--kds-radius-lg);overflow:hidden;box-shadow:none}"
if login.count(old_shell) != 1:
    raise SystemExit("Login access shell guard failed")
login = login.replace(old_shell, new_shell)
login = login.replace("letter-spacing:1.4px", "letter-spacing:0")
login = login.replace("border-radius:18px", "border-radius:var(--kds-radius-lg)")
write("login_access-1.18.0.css", login)

workspace = read("design_evaluation_workspace-1.18.0.css")
old_eval_dialog = ".ks-evaluation-dialog{width:min(660px,calc(100vw - 28px));max-height:84dvh;padding:0;border:1px solid #cfe4df;border-radius:18px;box-shadow:0 24px 70px #07262b45;color:#24484e;background:#fff}"
new_eval_dialog = ".ks-evaluation-dialog{width:min(660px,calc(100vw - 28px));max-height:84dvh;padding:0;border:0;border-radius:var(--kds-radius-lg);box-shadow:var(--kds-shadow-float);color:var(--kds-text);background:var(--kds-surface)}"
if workspace.count(old_eval_dialog) != 1:
    raise SystemExit("Evaluation dialog guard failed")
workspace = workspace.replace(old_eval_dialog, new_eval_dialog)
workspace = workspace.replace("background:#0d282b85;backdrop-filter:blur(5px)", "background:var(--kds-overlay-backdrop);backdrop-filter:none")
write("design_evaluation_workspace-1.18.0.css", workspace)

home = read("design_home_activity-1.18.5.css")
old_home_modal = "#tela_home .ks-home-modal{position:fixed;inset:0;margin:auto;width:min(700px,calc(100vw - 28px));max-height:84dvh;border:1px solid #d8e3e0;border-radius:16px;padding:0;box-shadow:0 24px 70px #07262b45;background:#fff;color:#173e46;overflow:hidden}"
new_home_modal = "#tela_home .ks-home-modal{position:fixed;inset:0;margin:auto;width:min(700px,calc(100vw - 28px));max-height:84dvh;border:0;border-radius:var(--kds-radius-lg);padding:0;box-shadow:var(--kds-shadow-float);background:var(--kds-surface);color:var(--kds-text);overflow:hidden}"
if home.count(old_home_modal) != 1:
    raise SystemExit("Home modal guard failed")
home = home.replace(old_home_modal, new_home_modal)
home = home.replace("background:#0d282b85;backdrop-filter:blur(6px);-webkit-backdrop-filter:blur(6px)", "background:var(--kds-overlay-backdrop);backdrop-filter:none;-webkit-backdrop-filter:none")
write("design_home_activity-1.18.5.css", home)

context = read("design_evaluation_context-1.18.3.css")
old_context_dialog = "#tela_avaliacao .ks-context-dialog{position:fixed;inset:0;margin:auto;width:min(680px,calc(100vw - 32px));max-width:calc(100vw - 32px);max-height:84dvh;padding:0;border:1px solid #d3e3de;border-radius:16px;background:#fff;color:#234a50;box-shadow:0 24px 80px #082d3b50;overflow:hidden}"
new_context_dialog = "#tela_avaliacao .ks-context-dialog{position:fixed;inset:0;margin:auto;width:min(680px,calc(100vw - 32px));max-width:calc(100vw - 32px);max-height:84dvh;padding:0;border:0;border-radius:var(--kds-radius-lg);background:var(--kds-surface);color:var(--kds-text);box-shadow:var(--kds-shadow-float);overflow:hidden}"
if context.count(old_context_dialog) != 1:
    raise SystemExit("Context dialog guard failed")
context = context.replace(old_context_dialog, new_context_dialog)
context = context.replace("background:rgba(10,32,38,.48);backdrop-filter:blur(6px);-webkit-backdrop-filter:blur(6px)", "background:var(--kds-overlay-backdrop);backdrop-filter:none;-webkit-backdrop-filter:none")
write("design_evaluation_context-1.18.3.css", context)


# ---------------------------------------------------------------------------
# 8. A later typography layer reduces weight of descriptive labels while
# preserving headings, values and safety states.
# ---------------------------------------------------------------------------
typography = read("design_typography.css")
marker = "QUIETER PASS 3 — DESCRIPTIVE WEIGHT"
if marker in typography:
    raise SystemExit("Pass 3 typography marker already present")
typography += """

/* QUIETER PASS 3 — DESCRIPTIVE WEIGHT
   Descriptive metadata recedes; values, headings and safety signals remain stronger. */
body.ks-design-ready .input-group > label,
body.ks-design-ready .finance-stats span,
body.ks-design-ready .finance-pending-stat span,
body.ks-design-ready .finance-discount-stat span,
body.ks-design-ready .finance-expense-admin-stat span,
body.ks-design-ready .finance-balance-stat span,
body.ks-design-ready .finance-balance-metric span,
body.ks-design-ready .midia-local-info span,
body.ks-design-ready .ks-form-section-title,
body.ks-design-ready .ks-home-detail-summary span,
body.ks-design-ready .ks-home-pro-group,
body.ks-design-ready .finance-analysis-kpi span,
body.ks-design-ready .ana-table-head,
body.ks-design-ready .ks-msg-template-group,
body.ks-design-ready #tela_financeiro .finance-ledger-suggestion-title,
body.ks-design-ready #tela_agenda .ks-horario-regra strong,
body.ks-design-ready #tela_agenda .ks-week-headers,
body.ks-design-ready #tela_avaliacao .hma-kicker,
body.ks-design-ready #tela_avaliacao .cluster-hypothesis .label,
body.ks-design-ready #tela_avaliacao .kinesys-integration-panel .integration-head span,
body.ks-design-ready #tela_avaliacao .ks-region-mode,
body.ks-design-ready #tela_avaliacao .ks-specific-name > small{
  font-weight:650!important;
  letter-spacing:0!important;
  text-transform:none!important;
}
"""
write("design_typography.css", typography)

print("KineSys quieter pass 3 completed without changing identifiers or application logic.")
