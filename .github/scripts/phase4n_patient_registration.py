from pathlib import Path

SCRIPT=Path('script-1.18.0.js')
INDEX=Path('index.html')
MODULE=Path('patient_registration_core-1.0.0.js')
TEST=Path('tests/patient_registration_modularization.contract.js')

src=SCRIPT.read_text(encoding='utf-8')

FUNCTIONS=[
    ('salvarCadastroSomente','async function '),
    ('salvarEIniciarAvaliacao','async function '),
    ('editarCadastro','async function '),
]

def block(source,name,prefix):
    marker=prefix+name+'('
    start=source.find(marker)
    if start<0: raise SystemExit(f'not found: {marker}')
    brace=source.find('{',start)
    if brace<0: raise SystemExit(f'opening brace not found: {name}')
    depth=0; quote=None; template=False; line=False; comment=False; esc=False; i=brace
    while i<len(source):
        ch=source[i]; nxt=source[i+1] if i+1<len(source) else ''
        if line:
            if ch=='\n': line=False
            i+=1; continue
        if comment:
            if ch=='*' and nxt=='/': comment=False; i+=2; continue
            i+=1; continue
        if quote:
            if esc: esc=False
            elif ch=='\\': esc=True
            elif ch==quote: quote=None
            i+=1; continue
        if template:
            if esc: esc=False
            elif ch=='\\': esc=True
            elif ch=='`': template=False
            i+=1; continue
        if ch=='/' and nxt=='/': line=True; i+=2; continue
        if ch=='/' and nxt=='*': comment=True; i+=2; continue
        if ch in ('\"',"'"): quote=ch; i+=1; continue
        if ch=='`': template=True; i+=1; continue
        if ch=='{': depth+=1
        elif ch=='}':
            depth-=1
            if depth==0:
                end=i+1
                while end<len(source) and source[end] in ' \t': end+=1
                if end<len(source) and source[end]=='\r': end+=1
                if end<len(source) and source[end]=='\n': end+=1
                return start,end,source[start:end].rstrip()
        i+=1
    raise SystemExit(f'unclosed function: {name}')

blocks=[]
for name,prefix in FUNCTIONS:
    marker=prefix+name+'('
    if src.count(marker)!=1: raise SystemExit(f'{name}: expected 1 occurrence, got {src.count(marker)}')
    blocks.append((name,*block(src,name,prefix)))

MODULE.write_text("""'use strict';
/* ==========================================================================\n   KineSys — Patient Registration Core 1.0.0\n   Phase 4N: fluxo administrativo de cadastro extraído sem alteração de regra.\n   A persistência (`salvarPacienteNaNuvem`) e lógica clínica permanecem no core.\n   ========================================================================== */\n\n"""+'\n\n'.join(x[3] for x in blocks)+"""\n\n// APIs históricas preservadas para HTML e módulos existentes.\nwindow.salvarCadastroSomente = salvarCadastroSomente;\nwindow.salvarEIniciarAvaliacao = salvarEIniciarAvaliacao;\nwindow.editarCadastro = editarCadastro;\n""",encoding='utf-8')

newsrc=src
for _,start,end,_ in sorted(blocks,key=lambda x:x[1],reverse=True):
    newsrc=newsrc[:start]+newsrc[end:]
SCRIPT.write_text(newsrc,encoding='utf-8')

html=INDEX.read_text(encoding='utf-8')
old='core_mod=20260911-phase4m-r1'
new='core_mod=20260911-phase4n-r1'
if html.count(old)!=1: raise SystemExit(f'core cache marker expected once, got {html.count(old)}')
html=html.replace(old,new,1)
anchor='    <script defer src="patient_chart_read_core-1.0.0.js?v=20260911-phase4j-r1"></script>\n'
insert=anchor+'    <script defer src="patient_registration_core-1.0.0.js?v=20260911-phase4n-r1"></script>\n'
if html.count(anchor)!=1: raise SystemExit(f'chart anchor expected once, got {html.count(anchor)}')
INDEX.write_text(html.replace(anchor,insert,1),encoding='utf-8')

# Coordinated cache-buster expectations in modularization contracts.
for p in Path('tests').glob('*.js'):
    t=p.read_text(encoding='utf-8')
    if old in t:
        p.write_text(t.replace(old,new),encoding='utf-8')

TEST.write_text(r"""'use strict';
const fs=require('fs');
const assert=require('assert');
const core=fs.readFileSync('script-1.18.0.js','utf8');
const reg=fs.readFileSync('patient_registration_core-1.0.0.js','utf8');
const index=fs.readFileSync('index.html','utf8');

for(const fn of ['salvarCadastroSomente','salvarEIniciarAvaliacao','editarCadastro']){
  assert.match(reg,new RegExp(`async function ${fn}\\(`),`${fn} deve existir no módulo de cadastro`);
  assert.doesNotMatch(core,new RegExp(`async function ${fn}\\(`),`${fn} não pode permanecer duplicada no monólito`);
  assert.match(reg,new RegExp(`window\\.${fn}\\s*=\\s*${fn}`),`${fn} deve preservar contrato global`);
}

assert.match(core,/async function salvarPacienteNaNuvem\(pacienteObjeto, opcoes = \{\}\)/,'persistência central deve continuar no monólito nesta fase');
assert.match(core,/async function carregarPacienteParaEdicao\(/,'edição clínica do prontuário deve permanecer fora do escopo da 4N');

const saveStart=reg.indexOf('async function salvarCadastroSomente');
const startEval=reg.indexOf('async function salvarEIniciarAvaliacao');
const editStart=reg.indexOf('async function editarCadastro');
assert.ok(saveStart>=0&&startEval>saveStart&&editStart>startEval,'ordem histórica das três APIs deve ser preservada');
const saveBlock=reg.slice(saveStart,startEval);
assert.match(saveBlock,/obterPacientesBasicos\(\)/,'cadastro deve manter verificação leve de CPF');
assert.match(saveBlock,/obterPacienteCompletoPorId\(pacienteAtualId\)/,'edição deve preservar histórico completo do paciente');
assert.match(saveBlock,/salvarPacienteNaNuvem\(novoPaciente\)/,'cadastro deve continuar usando persistência central');
assert.match(saveBlock,/validarResponsavelCadastro\(\)/,'validação de responsável deve permanecer');

const evalBlock=reg.slice(startEval,editStart);
assert.match(evalBlock,/telaPermitida\('tela_avaliacao'\)/,'perfil sem Avaliação deve continuar protegido');
assert.match(evalBlock,/await salvarCadastroSomente\(false\)/,'salvar + avaliar deve reutilizar o mesmo cadastro');
assert.match(evalBlock,/navegarPara\('tela_avaliacao', true\)/,'navegação para Avaliação deve permanecer explícita');

const editBlock=reg.slice(editStart);
assert.match(editBlock,/obterPacientesBasicos\(\)/,'abrir edição deve continuar usando índice leve');
assert.match(editBlock,/navegarPara\('tela_cadastro', true\)/,'edição deve continuar abrindo a tela de cadastro');
assert.match(editBlock,/atualizarAcoesCadastroPorPerfil\(\)/,'ações por perfil devem continuar sincronizadas');

const corePos=index.indexOf('script-1.18.0.js');
const delPos=index.indexOf('patient_deletion_core-1.0.0.js');
const chartPos=index.indexOf('patient_chart_read_core-1.0.0.js');
const regPos=index.indexOf('patient_registration_core-1.0.0.js');
const loaderPos=index.indexOf('screen_loader-1.25.0.js');
assert.ok(corePos>=0&&delPos>corePos&&chartPos>delPos&&regPos>chartPos,'cadastro deve carregar depois das dependências de prontuário');
assert.ok(loaderPos<0||regPos<loaderPos,'cadastro deve estar disponível antes dos fluxos de tela posteriores');
assert.match(index,/core_mod=20260911-phase4n-r1/,'cache-buster do core deve acompanhar a Phase 4N');

const regSize=fs.statSync('patient_registration_core-1.0.0.js').size;
const coreSize=fs.statSync('script-1.18.0.js').size;
assert.ok(regSize>4000,'extração parece pequena demais para conter o fluxo real de cadastro');
assert.ok(coreSize<703202,`monólito deve reduzir em relação à 4M; atual=${coreSize}`);
console.log(`Patient registration modularization: OK | module=${regSize} bytes | monolith=${coreSize} bytes`);
""",encoding='utf-8')

print('Phase 4N transform prepared')
