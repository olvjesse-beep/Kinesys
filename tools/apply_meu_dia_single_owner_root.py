from pathlib import Path
import re

# 1) Core: remove the old Meu Dia implementation and its Home navigation call.
core_path = Path('src/core/script-1.18.0.js')
core = core_path.read_text(encoding='utf-8')

home_block_old = """    if (idTela === 'tela_home') {
        renderizarPacientesRecentesHome();
        popularSelectCRM();
        renderizarPendenciasClinicas();
        carregarPainelFisioterapeuta();
    }"""
home_block_new = """    if (idTela === 'tela_home') {
        renderizarPacientesRecentesHome();
        popularSelectCRM();
        renderizarPendenciasClinicas();
    }"""
if home_block_old not in core:
    raise SystemExit('Core Home block with legacy Meu Dia call not found')
core = core.replace(home_block_old, home_block_new, 1)

pattern = re.compile(
    r'async function carregarPainelFisioterapeuta\(\)\{.*?\}async function renderizarPendenciasClinicas\(\)\{',
    re.S,
)
core, count = pattern.subn('async function renderizarPendenciasClinicas(){', core, count=1)
if count != 1:
    raise SystemExit(f'Expected one legacy carregarPainelFisioterapeuta implementation, removed {count}')
core_path.write_text(core, encoding='utf-8')

# 2) Meu Dia module: make ownership/version explicit. It remains the only loader/renderer.
home_path = Path('src/home/home_fisioterapeuta_util-1.24.0.js')
home = home_path.read_text(encoding='utf-8')
home = home.replace(
    'KineSys — Home do fisioterapeuta: Meu dia clínico v1.24.0',
    'KineSys — Home do fisioterapeuta: Meu dia clínico v1.24.1 — fonte única',
    1,
)
api_old = """    window.KineSysMeuDiaClinico=Object.freeze({
        refresh:atualizarPainelFisioterapeuta,"""
api_new = """    window.KineSysMeuDiaClinico=Object.freeze({
        version:'1.24.1-single-owner',
        refresh:atualizarPainelFisioterapeuta,"""
if api_old not in home:
    raise SystemExit('KineSysMeuDiaClinico API anchor not found')
home = home.replace(api_old, api_new, 1)
home_path.write_text(home, encoding='utf-8')

# 3) Operational resume: Agenda lifecycle only. No Home interception/guard/dedupe.
op_path = Path('src/core/operational_resume_refresh-1.0.0.js')
op = r'''/* KineSys — Operational Resume Refresh 1.3.0
 * Responsabilidade única: revalidar a Agenda quando o navegador retorna.
 * Não carrega, intercepta, observa ou normaliza o Meu Dia Clínico.
 */
(function instalarOperationalResumeRefresh(){
    'use strict';

    const VERSION='1.3.0-agenda-only';
    const MIN_AUSENCIA_MS=1500;
    const TELA_REVALIDAVEL='tela_agenda';
    const PROFESSIONAL_HOME_SCRIPT='src/home/home_profissional_dashboard-1.0.0.js';
    const PROFESSIONAL_HOME_STYLE='styles/home_profissional_dashboard-1.0.0.css';
    const PROFESSIONAL_HOME_POLISH='src/home/home_profissional_polish-1.0.0.js';
    const PROFESSIONAL_HOME_ASSET_VERSION='20260915-home-owner-r1';
    let ausenteDesde=0;
    let telaAoAusentar='';
    let refreshEmCurso=null;
    let destruido=false;

    function telaAtual(){
        try {
            return String(window.KineSysScreenLoader?.current?.() || document.querySelector('.tela.ativa')?.id || '');
        } catch (_) {
            return String(document.querySelector('.tela.ativa')?.id || '');
        }
    }

    function usuarioAtivo(){
        return typeof usuarioLogado!=='undefined' && !!usuarioLogado;
    }

    function carregarScriptUmaVez(base,globalName){
        if(globalName&&window[globalName])return;
        if(document.querySelector(`script[src^="${base}"]`))return;
        const script=document.createElement('script');
        script.src=`${base}?v=${PROFESSIONAL_HOME_ASSET_VERSION}`;
        script.async=false;
        document.body.appendChild(script);
    }

    function garantirHomeProfissionalFocada(){
        if(!document.querySelector(`link[href^="${PROFESSIONAL_HOME_STYLE}"]`)){
            const link=document.createElement('link');
            link.rel='stylesheet';
            link.href=`${PROFESSIONAL_HOME_STYLE}?v=${PROFESSIONAL_HOME_ASSET_VERSION}`;
            document.head.appendChild(link);
        }
        carregarScriptUmaVez(PROFESSIONAL_HOME_SCRIPT,'KineSysProfessionalHome');
        carregarScriptUmaVez(PROFESSIONAL_HOME_POLISH,'KineSysProfessionalHomePolish');
    }

    function marcarAusencia(){
        if(destruido)return;
        const tela=telaAtual();
        if(tela!==TELA_REVALIDAVEL)return;
        if(!ausenteDesde){
            ausenteDesde=Date.now();
            telaAoAusentar=tela;
        }
        window.KineSysAgendaLifecycle?.suspend?.();
    }

    async function revalidarAgenda(){
        window.KineSysAgendaLifecycle?.activate?.();
        if(typeof invalidarCacheAgendaSemana==='function')invalidarCacheAgendaSemana();
        if(typeof renderizarPainelAgenda==='function'){
            await renderizarPainelAgenda();
            return true;
        }
        if(typeof inicializarAgenda==='function'){
            await inicializarAgenda();
            return true;
        }
        return false;
    }

    function reativarAgendaSemReload(){
        if(telaAtual()===TELA_REVALIDAVEL)window.KineSysAgendaLifecycle?.activate?.();
    }

    async function processarRetorno(){
        if(destruido||document.visibilityState!=='visible'||!ausenteDesde)return false;
        const inicioAusencia=ausenteDesde;
        ausenteDesde=0;
        telaAoAusentar='';

        const duracao=Math.max(0,Date.now()-inicioAusencia);
        const tela=telaAtual();
        if(duracao<MIN_AUSENCIA_MS){
            reativarAgendaSemReload();
            return false;
        }
        if(!usuarioAtivo()||tela!==TELA_REVALIDAVEL){
            reativarAgendaSemReload();
            return false;
        }
        if(refreshEmCurso)return refreshEmCurso;

        refreshEmCurso=(async()=>{
            try {
                return await revalidarAgenda();
            } catch (erro) {
                console.warn('KineSys: falha ao revalidar a Agenda após retorno ao navegador.',erro);
                return false;
            } finally {
                refreshEmCurso=null;
            }
        })();
        return refreshEmCurso;
    }

    function aoVisibilityChange(){
        if(document.visibilityState==='hidden')marcarAusencia();
        else processarRetorno();
    }
    function aoBlur(){marcarAusencia();}
    function aoFocus(){processarRetorno();}
    function aoPageHide(){marcarAusencia();}
    function aoPageShow(event){if(event.persisted)processarRetorno();}

    function destroy(){
        if(destruido)return true;
        destruido=true;
        document.removeEventListener('visibilitychange',aoVisibilityChange);
        window.removeEventListener('blur',aoBlur);
        window.removeEventListener('focus',aoFocus);
        window.removeEventListener('pagehide',aoPageHide);
        window.removeEventListener('pageshow',aoPageShow);
        reativarAgendaSemReload();
        return true;
    }

    garantirHomeProfissionalFocada();
    document.addEventListener('visibilitychange',aoVisibilityChange);
    window.addEventListener('blur',aoBlur,{passive:true});
    window.addEventListener('focus',aoFocus,{passive:true});
    window.addEventListener('pagehide',aoPageHide,{passive:true});
    window.addEventListener('pageshow',aoPageShow,{passive:true});

    window.KineSysOperationalResumeRefresh=Object.freeze({
        version:VERSION,
        refresh:processarRetorno,
        destroy,
        status(){
            return Object.freeze({
                away:!!ausenteDesde,
                awayScreen:telaAoAusentar,
                refreshing:!!refreshEmCurso,
                currentScreen:telaAtual()
            });
        }
    });
})();
'''
op_path.write_text(op, encoding='utf-8')

# 4) Visual polish: remove Meu Dia dedupe workaround. Styling only.
polish_path = Path('src/home/home_profissional_polish-1.0.0.js')
polish = polish_path.read_text(encoding='utf-8')
polish = polish.replace(
    '/* KineSys — polish da Home profissional v1.0.1\n * Ajusta composição visual sem alterar contratos clínicos ou consultas.\n * Inclui guarda defensiva contra duplicação visual do Meu dia clínico.\n */',
    '/* KineSys — polish da Home profissional v1.1.0\n * Responsabilidade exclusiva: composição visual da Home profissional.\n * Não altera, deduplica ou observa os dados do Meu Dia Clínico.\n */',
    1,
)
dedupe_pattern = re.compile(
    r'\n    function chaveLinhaMeuDia\(linha\)\{.*?\n    function normalizarPendencias\(\)\{',
    re.S,
)
polish, count = dedupe_pattern.subn('\n    function normalizarPendencias(){', polish, count=1)
if count != 1:
    raise SystemExit(f'Expected visual dedupe block in polish, removed {count}')
polish = polish.replace('        removerDuplicatasMeuDia(home);\n', '', 1)
old_api = "window.KineSysProfessionalHomePolish=Object.freeze({refresh:aplicar,dedupe(){const home=document.getElementById('tela_home');return home?removerDuplicatasMeuDia(home):0;}});"
new_api = "window.KineSysProfessionalHomePolish=Object.freeze({version:'1.1.0-visual-only',refresh:aplicar});"
if old_api not in polish:
    raise SystemExit('Old polish API anchor not found')
polish = polish.replace(old_api, new_api, 1)
polish_path.write_text(polish, encoding='utf-8')

# 5) Force production to request the new root-fix assets.
index_path = Path('index.html')
index = index_path.read_text(encoding='utf-8')
replacements = {
    'src/core/script-1.18.0.js?v=20260910-hma-perf-r3&patient_self_service=20260910-r1&access_admin=20260910-r1&data_cache=20260911-r1&core_mod=20260911-phase4s-r1':
    'src/core/script-1.18.0.js?v=20260910-hma-perf-r3&patient_self_service=20260910-r1&access_admin=20260910-r1&data_cache=20260911-r1&core_mod=20260911-phase4s-r1&meu_dia_owner=20260915-r1',
    'src/home/home_fisioterapeuta_util-1.24.0.js?v=20260910-r3&fisio_home=20260910-r1&home4h=20260910-r1':
    'src/home/home_fisioterapeuta_util-1.24.0.js?v=20260910-r3&fisio_home=20260910-r1&home4h=20260910-r1&single_owner=20260915-r1',
    'src/core/operational_resume_refresh-1.0.0.js?v=20260912-home-mobile-r5':
    'src/core/operational_resume_refresh-1.0.0.js?v=20260912-home-mobile-r5&single_owner=20260915-r1',
}
for old,new in replacements.items():
    if old not in index:
        raise SystemExit(f'Index asset anchor not found: {old}')
    index = index.replace(old,new,1)
index_path.write_text(index, encoding='utf-8')

# 6) Regression contract: the core must never own Meu Dia again.
test_path = Path('tests/meu_dia_single_owner.contract.js')
test_path.write_text(r'''const fs=require('fs');
const assert=require('assert');
const core=fs.readFileSync('src/core/script-1.18.0.js','utf8');
const home=fs.readFileSync('src/home/home_fisioterapeuta_util-1.24.0.js','utf8');
const resume=fs.readFileSync('src/core/operational_resume_refresh-1.0.0.js','utf8');
const polish=fs.readFileSync('src/home/home_profissional_polish-1.0.0.js','utf8');
const index=fs.readFileSync('index.html','utf8');

assert(!core.includes('async function carregarPainelFisioterapeuta()'), 'core legacy still defines Meu Dia loader');
const homeNav=core.match(/if \(idTela === 'tela_home'\) \{[\s\S]*?\n    \}/)?.[0]||'';
assert(!homeNav.includes('carregarPainelFisioterapeuta'), 'navegarPara Home still triggers legacy Meu Dia load');
assert(home.includes("version:'1.24.1-single-owner'"), 'Meu Dia single-owner version missing');
assert(home.includes('lista.replaceChildren(fragmento)'), 'Meu Dia must publish one atomic snapshot');
assert(home.includes("if(id==='tela_agenda')"), 'Agenda must refresh Meu Dia snapshot');
assert(home.includes("if(id==='tela_home')"), 'Home must ensure initial snapshot');
assert(!resume.includes('instalarGuardaFonteUnicaMeuDia'), 'resume refresh must not intercept Home navigation');
assert(resume.includes("VERSION='1.3.0-agenda-only'"), 'resume refresh must be Agenda-only');
assert(!polish.includes('removerDuplicatasMeuDia'), 'visual polish must not dedupe Meu Dia data');
assert(index.includes('meu_dia_owner=20260915-r1'), 'core cache-buster missing');
assert(index.includes('single_owner=20260915-r1'), 'Home cache-buster missing');
console.log('Meu Dia single-owner contract: OK');
''', encoding='utf-8')
