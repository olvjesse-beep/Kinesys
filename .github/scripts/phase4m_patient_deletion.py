from pathlib import Path

SCRIPT = Path('script-1.18.0.js')
INDEX = Path('index.html')
TEST_SELF = Path('tests/fisio_home_patient_self_service.contract.js')
NEW_MODULE = Path('patient_deletion_core-1.0.0.js')
NEW_TEST = Path('tests/patient_deletion_modularization.contract.js')

text = SCRIPT.read_text(encoding='utf-8')

NAMES = [
    ('limparDadosLocaisPacienteExcluido', 'function '),
    ('excluirPacienteNuvemSeguro', 'async function '),
    ('excluirArquivosLocaisPaciente', 'async function '),
    ('excluirPaciente', 'async function '),
]

def find_function_block(src, name, prefix):
    marker = prefix + name + '('
    start = src.find(marker)
    if start < 0:
        raise SystemExit(f'Function not found: {marker}')
    brace = src.find('{', start)
    if brace < 0:
        raise SystemExit(f'Opening brace not found: {name}')

    i = brace
    depth = 0
    quote = None
    template = False
    line_comment = False
    block_comment = False
    escape = False

    while i < len(src):
        ch = src[i]
        nxt = src[i + 1] if i + 1 < len(src) else ''

        if line_comment:
            if ch == '\n':
                line_comment = False
            i += 1
            continue
        if block_comment:
            if ch == '*' and nxt == '/':
                block_comment = False
                i += 2
                continue
            i += 1
            continue
        if quote:
            if escape:
                escape = False
            elif ch == '\\':
                escape = True
            elif ch == quote:
                quote = None
            i += 1
            continue
        if template:
            if escape:
                escape = False
            elif ch == '\\':
                escape = True
            elif ch == '`':
                template = False
            # braces inside template expressions are intentionally counted below only
            # when not inside raw template text; these functions do not contain `${...}`
            i += 1
            continue

        if ch == '/' and nxt == '/':
            line_comment = True
            i += 2
            continue
        if ch == '/' and nxt == '*':
            block_comment = True
            i += 2
            continue
        if ch in ('\"', "'"):
            quote = ch
            i += 1
            continue
        if ch == '`':
            template = True
            i += 1
            continue
        if ch == '{':
            depth += 1
        elif ch == '}':
            depth -= 1
            if depth == 0:
                end = i + 1
                while end < len(src) and src[end] in ' \t':
                    end += 1
                if end < len(src) and src[end] == '\r':
                    end += 1
                if end < len(src) and src[end] == '\n':
                    end += 1
                return start, end, src[start:end].rstrip()
        i += 1
    raise SystemExit(f'Unclosed function: {name}')

blocks = []
for name, prefix in NAMES:
    blocks.append((name, *find_function_block(text, name, prefix)))

# Validate they are unique and keep the original source exactly.
for name, start, end, block in blocks:
    marker = ('async function ' if name != 'limparDadosLocaisPacienteExcluido' else 'function ') + name + '('
    if text.count(marker) != 1:
        raise SystemExit(f'Expected one occurrence for {name}, found {text.count(marker)}')

module_header = """'use strict';
/* ==========================================================================\n   KineSys — Patient Deletion Core 1.0.0\n   Phase 4M: extraído do monólito sem alteração de regras.\n   Mantém exclusão administrativa transacional, limpeza local e KineSys Local.\n   ========================================================================== */\n\n"""
module_body = '\n\n'.join(block for _, _, _, block in blocks)
module_footer = """\n\n// Contrato público preservado para onclick e módulos existentes.\nwindow.limparDadosLocaisPacienteExcluido = limparDadosLocaisPacienteExcluido;\nwindow.excluirPacienteNuvemSeguro = excluirPacienteNuvemSeguro;\nwindow.excluirArquivosLocaisPaciente = excluirArquivosLocaisPaciente;\nwindow.excluirPaciente = excluirPaciente;\n"""
NEW_MODULE.write_text(module_header + module_body + module_footer, encoding='utf-8')

# Remove from monolith from bottom to top, preserving every other byte.
new_text = text
for _, start, end, _ in sorted(blocks, key=lambda x: x[1], reverse=True):
    new_text = new_text[:start] + new_text[end:]
SCRIPT.write_text(new_text, encoding='utf-8')

# Insert module immediately after the monolith: all legacy lexical dependencies exist,
# while callers loaded later see the same global function names.
html = INDEX.read_text(encoding='utf-8')
needle = '    <script defer src="script-1.18.0.js?v=20260910-hma-perf-r3&patient_self_service=20260910-r1&access_admin=20260910-r1&data_cache=20260911-r1&core_mod=20260911-phase4l-r1"></script>\n'
replacement = needle.replace('phase4l-r1', 'phase4m-r1') + '    <script defer src="patient_deletion_core-1.0.0.js?v=20260911-phase4m-r1"></script>\n'
if html.count(needle) != 1:
    raise SystemExit(f'Expected exact monolith tag once, found {html.count(needle)}')
INDEX.write_text(html.replace(needle, replacement, 1), encoding='utf-8')

# Existing self-service contract follows the function to its new owner.
self_text = TEST_SELF.read_text(encoding='utf-8')
old = "const script = fs.readFileSync('script-1.18.0.js','utf8');\nconst index = fs.readFileSync('index.html','utf8');"
new = "const script = fs.readFileSync('script-1.18.0.js','utf8');\nconst deletion = fs.readFileSync('patient_deletion_core-1.0.0.js','utf8');\nconst index = fs.readFileSync('index.html','utf8');"
if self_text.count(old) != 1:
    raise SystemExit('Self-service import anchor not found exactly once')
self_text = self_text.replace(old, new, 1)
old2 = "const excluirSeguro = bloco(script,'async function excluirPacienteNuvemSeguro','async function excluirArquivosLocaisPaciente');"
new2 = "const excluirSeguro = bloco(deletion,'async function excluirPacienteNuvemSeguro','async function excluirArquivosLocaisPaciente');"
if self_text.count(old2) != 1:
    raise SystemExit('Self-service deletion block anchor not found exactly once')
self_text = self_text.replace(old2, new2, 1)
self_text = self_text.replace("assert.match(script,/Nenhum dado foi removido parcialmente/, 'Falha deve deixar claro o comportamento atômico');", "assert.match(deletion,/Nenhum dado foi removido parcialmente/, 'Falha deve deixar claro o comportamento atômico');")
self_text = self_text.replace("assert.match(index,/script-1\\.18\\.0\\.js\\?v=20260910-hma-perf-r3&patient_self_service=20260910-r1/,'Script precisa invalidar cache sem perder o contrato anterior');", "assert.match(index,/script-1\\.18\\.0\\.js\\?v=20260910-hma-perf-r3&patient_self_service=20260910-r1[^\"']*core_mod=20260911-phase4m-r1/,'Script precisa invalidar cache sem perder o contrato anterior');\nassert.match(index,/patient_deletion_core-1\\.0\\.0\\.js\\?v=20260911-phase4m-r1/,'Módulo de exclusão precisa estar no runtime');")
TEST_SELF.write_text(self_text, encoding='utf-8')

NEW_TEST.write_text(r"""'use strict';
const fs = require('fs');
const assert = require('assert');

const core = fs.readFileSync('patient_deletion_core-1.0.0.js','utf8');
const monolith = fs.readFileSync('script-1.18.0.js','utf8');
const index = fs.readFileSync('index.html','utf8');

const moved = [
  'limparDadosLocaisPacienteExcluido',
  'excluirPacienteNuvemSeguro',
  'excluirArquivosLocaisPaciente',
  'excluirPaciente'
];
for (const fn of moved) {
  assert.ok(core.includes(`function ${fn}(`), `${fn} deve existir no módulo dedicado`);
  assert.ok(!monolith.includes(`function ${fn}(`), `${fn} não pode permanecer duplicada no monólito`);
}

assert.match(core,/\.rpc\('kinesys_excluir_paciente_completo',\s*\{\s*p_paciente_id:\s*id\s*\}\)/,'Exclusão deve manter RPC transacional existente');
assert.match(core,/usuarioEhMaster\(\)/,'Exclusão deve continuar exclusiva do administrador');
assert.match(core,/kinesys_prontuarios/,'Limpeza local do índice legado deve ser preservada');
assert.match(core,/kinesys_rascunho_avaliacao_v11/,'Rascunho local do paciente excluído deve ser limpo');
assert.match(core,/\/api\/patient-delete/,'Limpeza de arquivos do KineSys Local deve ser preservada');
assert.match(core,/invalidarCachePacientesBasicos\(\)/,'Índice leve de pacientes deve ser invalidado');
assert.match(core,/Nenhum dado foi removido parcialmente/,'Mensagem de atomicidade deve permanecer');
assert.match(core,/window\.excluirPaciente\s*=\s*excluirPaciente/,'Contrato global de excluirPaciente deve ser explícito');

const monolithPos = index.indexOf('script-1.18.0.js');
const deletionPos = index.indexOf('patient_deletion_core-1.0.0.js');
const chartPos = index.indexOf('patient_chart_read_core-1.0.0.js');
assert.ok(monolithPos >= 0 && deletionPos > monolithPos, 'Módulo de exclusão deve carregar depois do core legado');
assert.ok(chartPos < 0 || deletionPos < chartPos, 'Módulo de exclusão deve estar disponível antes dos módulos carregados depois do core');

const statCore = fs.statSync('patient_deletion_core-1.0.0.js').size;
const statMonolith = fs.statSync('script-1.18.0.js').size;
assert.ok(statCore > 1500, 'Extração de exclusão parece pequena demais para ser real');
assert.ok(statMonolith < 709195, `Monólito deve reduzir em relação à Phase 4L; atual=${statMonolith}`);

console.log(`Patient deletion modularization: OK | module=${statCore} bytes | monolith=${statMonolith} bytes`);
""", encoding='utf-8')

print('Phase 4M transform prepared')
