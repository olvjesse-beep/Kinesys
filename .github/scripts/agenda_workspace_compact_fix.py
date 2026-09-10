from pathlib import Path

MARKER = 'AGENDA WORKSPACE COMPACT R2'

# -----------------------------------------------------------------------------
# 1) Canonical visual layer: compact header + full-day viewport + short slots.
# -----------------------------------------------------------------------------
css_path = Path('design_agenda.css')
css = css_path.read_text(encoding='utf-8')
if MARKER not in css:
    css += r'''

/* ============================================================================
   AGENDA WORKSPACE COMPACT R2
   Agenda é uma tela de trabalho: controles compactos + expediente completo.
   A geometria temporal continua proporcional em unidades de 10 minutos.
   ========================================================================== */
@media (min-width:761px){
  #tela_agenda .agenda-grade-scroll{
    height:clamp(440px,calc(100dvh - 210px),760px)!important;
    max-height:none!important;
    margin-top:0!important;
    overflow-x:hidden!important;
    overflow-y:hidden!important;
  }
  #tela_agenda .agenda-semana-grade{
    height:100%!important;
    grid-template-rows:42px repeat(var(--kds-agenda-runtime-slot-count),minmax(2px,1fr))!important;
  }
  #tela_agenda .agenda-dia-cabecalho{min-height:42px!important;padding:3px 3px!important}
  #tela_agenda .agenda-hora-eixo{padding-top:0!important}
  #tela_agenda .agenda-compromisso{height:100%;min-height:0!important;overflow:hidden}
}

@media (min-width:1281px){
  #tela_agenda .agenda-card-semanal{padding:0!important}
  #tela_agenda .agenda-visoes{
    min-height:0!important;
    gap:6px!important;
    padding:6px 10px!important;
  }
  #tela_agenda .agenda-visoes button{
    min-height:34px!important;
    height:34px!important;
    padding:5px 12px!important;
  }
  #tela_agenda .agenda-toolbar-semanal{
    display:grid!important;
    grid-template-columns:minmax(440px,1fr) auto!important;
    align-items:center!important;
    gap:12px!important;
    padding:7px 10px!important;
    margin:0!important;
    border-bottom:1px solid var(--kds-line-soft)!important;
  }
  #tela_agenda .agenda-semana-nav{
    width:auto!important;
    min-width:0!important;
    gap:6px!important;
    flex-wrap:nowrap!important;
  }
  #tela_agenda .agenda-semana-nav>button{
    min-width:36px!important;
    width:auto;
    height:36px!important;
    min-height:36px!important;
  }
  #tela_agenda .agenda-semana-titulo{
    font-size:var(--kds-font-content)!important;
    line-height:var(--kds-leading-compact)!important;
  }
  #tela_agenda .agenda-periodo-segmentado{
    margin-left:8px!important;
    padding:2px!important;
  }
  #tela_agenda .agenda-periodo-segmentado button{
    min-height:32px!important;
    padding:5px 10px!important;
  }
  #tela_agenda .agenda-toolbar-filtros{
    display:grid!important;
    grid-template-columns:132px minmax(210px,270px) max-content max-content!important;
    align-items:end!important;
    justify-content:end!important;
    gap:8px!important;
    width:auto!important;
    padding:0!important;
    margin:0!important;
    border:0!important;
    background:transparent!important;
  }
  #tela_agenda .agenda-toolbar-filtros>.input-group{
    width:100%!important;
    min-width:0!important;
    margin:0!important;
  }
  #tela_agenda .agenda-toolbar-filtros label{
    margin-bottom:2px!important;
    font-size:var(--kds-font-metadata)!important;
  }
  #tela_agenda .agenda-toolbar-filtros :where(input:not([type="checkbox"]):not([type="radio"]),select){
    height:36px!important;
    min-height:36px!important;
    padding-top:6px!important;
    padding-bottom:6px!important;
  }
  #tela_agenda .agenda-escopo-acesso{display:none!important}
  #tela_agenda .agenda-toolbar-filtros>.agenda-audit-btn,
  #tela_agenda .agenda-toolbar-filtros>.ks-new-appointment{
    height:36px!important;
    min-height:36px!important;
    margin:20px 0 0!important;
    padding:6px 12px!important;
    align-self:end!important;
  }
  #tela_agenda .agenda-feedback:not(:empty){margin:4px 10px!important}
}

@media (min-width:901px) and (max-width:1280px){
  #tela_agenda .agenda-visoes{padding:6px 10px!important}
  #tela_agenda .agenda-toolbar-semanal{
    display:grid!important;
    grid-template-columns:1fr!important;
    gap:6px!important;
    padding:7px 10px!important;
    margin:0!important;
  }
  #tela_agenda .agenda-semana-nav{width:100%!important;min-width:0!important}
  #tela_agenda .agenda-toolbar-filtros{
    display:grid!important;
    grid-template-columns:132px minmax(210px,1fr) max-content max-content!important;
    gap:8px!important;
    padding:0!important;
    margin:0!important;
    border:0!important;
  }
  #tela_agenda .agenda-escopo-acesso{display:none!important}
  #tela_agenda .agenda-toolbar-filtros>.agenda-audit-btn,
  #tela_agenda .agenda-toolbar-filtros>.ks-new-appointment{margin:20px 0 0!important}
}

/* Na visão da clínica, cada profissional ocupa uma faixa horizontal do dia. */
#tela_agenda .agenda-geral-faixa{
  position:relative;
  min-width:0!important;
  overflow:hidden!important;
  padding:1px!important;
  box-sizing:border-box!important;
  background:transparent!important;
  border:0!important;
}
#tela_agenda .agenda-geral-faixa .agenda-compromisso{height:100%;margin:0!important}
#tela_agenda .agenda-duracao-curta .agenda-compromisso{padding:0 3px!important}
#tela_agenda .agenda-duracao-minima .agenda-compromisso{padding:0 2px!important;border-left-width:2px!important}
#tela_agenda .agenda-duracao-minima .agenda-paciente-nome{display:none!important}
'''
    css_path.write_text(css, encoding='utf-8')

# -----------------------------------------------------------------------------
# 2) Agenda: round limits to temporal unit and make clinic view proportional.
# -----------------------------------------------------------------------------
js_path = Path('agenda-1.20.0.js')
js = js_path.read_text(encoding='utf-8')

old_round = """    min = Math.floor(min / 30) * 30;
    max = Math.ceil(max / 30) * 30;"""
new_round = """    min = Math.floor(min / AGENDA_GRADE_PASSO_MIN) * AGENDA_GRADE_PASSO_MIN;
    max = Math.ceil(max / AGENDA_GRADE_PASSO_MIN) * AGENDA_GRADE_PASSO_MIN;"""
if old_round in js:
    js = js.replace(old_round, new_round, 1)

personal_anchor = """            overlay.className = 'agenda-celula agendado';
            overlay.style.gridColumn = String(diaIdx + 2);"""
personal_repl = """            overlay.className = 'agenda-celula agendado';
            const duracaoVisual = Math.max(passo, fimA - ini);
            overlay.dataset.duracaoMinutos = String(duracaoVisual);
            if (duracaoVisual <= 10) overlay.classList.add('agenda-duracao-minima');
            else if (duracaoVisual < 30) overlay.classList.add('agenda-duracao-curta');
            overlay.style.gridColumn = String(diaIdx + 2);"""
if personal_anchor in js and 'overlay.dataset.duracaoMinutos = String(duracaoVisual);' not in js:
    js = js.replace(personal_anchor, personal_repl, 1)

old_general_start = """    } else {
        // Visão geral: exibe os nomes no horário de início sem declarar disponibilidade individual."""
end_marker = """    }
    iniciarRelogioAgenda();"""
start = js.find(old_general_start)
if start >= 0:
    end = js.find(end_marker, start)
    if end < 0:
        raise AssertionError('fim da visão geral da Agenda não encontrado')
    new_general = r'''    } else {
        // Visão da clínica: duração real no eixo vertical e uma faixa horizontal
        // estável por profissional. Atendimentos simultâneos não se sobrepõem.
        dias.forEach((d, diaIdx) => {
            const atendimentosDia = agendaAgendamentosSemanaCache.filter(a => a.data === d.dataISO);
            const profissionaisDia = Array.from(new Set(atendimentosDia.map(a => String(a.profissional_id || 'sem-profissional'))));
            const totalFaixas = Math.max(1, profissionaisDia.length);
            const faixaPorProfissional = new Map(profissionaisDia.map((id, idx) => [id, idx]));

            atendimentosDia.forEach(a => {
                const ini = horaParaMinutos(horaCurta(a.hora_inicio));
                const fimA = horaParaMinutos(horaCurta(a.hora_fim));
                if (!Number.isFinite(ini) || !Number.isFinite(fimA) || fimA <= limites.inicio || ini >= limites.fim) return;
                const inicioVisivel = Math.max(ini, limites.inicio);
                const fimVisivel = Math.min(fimA, limites.fim);
                const rowInicio = Math.floor((inicioVisivel - limites.inicio) / passo) + 2;
                const span = Math.max(1, Math.ceil((fimVisivel - inicioVisivel) / passo));
                const duracaoVisual = Math.max(passo, fimA - ini);
                const faixa = faixaPorProfissional.get(String(a.profissional_id || 'sem-profissional')) || 0;

                const overlay = document.createElement('div');
                overlay.className = 'agenda-celula agendado agenda-geral-faixa';
                overlay.dataset.duracaoMinutos = String(duracaoVisual);
                if (duracaoVisual <= 10) overlay.classList.add('agenda-duracao-minima');
                else if (duracaoVisual < 30) overlay.classList.add('agenda-duracao-curta');
                overlay.style.gridColumn = String(diaIdx + 2);
                overlay.style.gridRow = `${rowInicio} / span ${span}`;
                overlay.style.zIndex = '3';
                overlay.style.width = `calc(100% / ${totalFaixas})`;
                overlay.style.justifySelf = 'start';
                overlay.style.transform = `translateX(${faixa * 100}%)`;
                overlay.addEventListener('click', e => { e.stopPropagation(); abrirDetalheAgendamento(a.id); });
                overlay.title = `${a.pacientes?.nome || 'Paciente'} · ${a.equipe?.nome || 'Profissional'} · ${horaCurta(a.hora_inicio)}–${horaCurta(a.hora_fim)}`;
                overlay.innerHTML = `<div class="agenda-compromisso status-${escapeHTML(classeStatusAgenda(a.status))}"><div class="paciente"><span class="agenda-paciente-nome">${escapeHTML(a.pacientes?.nome || 'Paciente')}</span>${iconePagamentoAgendaHTML(a)}${iconeHorarioExtraordinarioHTML(a)}</div></div>`;
                container.appendChild(overlay);
            });
        });
'''
    js = js[:start] + new_general + js[end:]

js_path.write_text(js, encoding='utf-8')

# -----------------------------------------------------------------------------
# 3) Cache busting: browsers must not retain the old overriding stylesheet.
# -----------------------------------------------------------------------------
loader_path = Path('screen_loader-1.25.0.js')
loader = loader_path.read_text(encoding='utf-8')
loader = loader.replace('agenda_referencia-1.20.0.css?v=20260901-r1', 'agenda_referencia-1.20.0.css?v=20260910-layout-shim-r1')
loader = loader.replace('agenda-1.20.0.js?v=20260910-agenda-edit-r1&compact_time=20260910-r1', 'agenda-1.20.0.js?v=20260910-agenda-edit-r1&compact_time=20260910-r2')
loader_path.write_text(loader, encoding='utf-8')

index_path = Path('index.html')
html = index_path.read_text(encoding='utf-8')
html = html.replace('design_agenda.css?v=20260910-compact-r1', 'design_agenda.css?v=20260910-compact-r2')
html = html.replace('screen_loader-1.25.0.js?v=20260910-phase4d-r1&agenda_edit=20260910-r1&agenda_compact=20260910-r1', 'screen_loader-1.25.0.js?v=20260910-phase4d-r1&agenda_edit=20260910-r1&agenda_compact=20260910-r2')
index_path.write_text(html, encoding='utf-8')

# -----------------------------------------------------------------------------
# 4) Permanent contract: prevent a second stylesheet from breaking the layout.
# -----------------------------------------------------------------------------
test_path = Path('tests/access_agenda_home4h.contract.js')
t = test_path.read_text(encoding='utf-8')
if "const agendaRefCss=fs.readFileSync('agenda_referencia-1.20.0.css','utf8');" not in t:
    t = t.replace("const agendaCss=fs.readFileSync('design_agenda.css','utf8');", "const agendaCss=fs.readFileSync('design_agenda.css','utf8');\nconst agendaRefCss=fs.readFileSync('agenda_referencia-1.20.0.css','utf8');", 1)
t = t.replace("assert.match(agendaCss,/height:clamp\\(340px,calc\\(100dvh - 280px\\),620px\\)/,'Grade desktop deve se adaptar à altura disponível');",
              "assert.match(agendaCss,/AGENDA WORKSPACE COMPACT R2/,'Layout final compacto da Agenda deve existir');\nassert.match(agendaCss,/height:clamp\\(440px,calc\\(100dvh - 210px\\),760px\\)!important/,'Grade deve usar o restante do viewport');\nassert.doesNotMatch(agendaRefCss,/agenda-toolbar-semanal\\s*\\{[^}]*display\\s*:\\s*grid/i,'Folha de referência lazy não pode voltar a controlar a geometria da Agenda');")
t = t.replace("assert.match(loader,/agenda-1\\.20\\.0\\.js\\?v=20260910-agenda-edit-r1&compact_time=20260910-r1/,'Agenda lazy deve invalidar cache');",
              "assert.match(loader,/agenda-1\\.20\\.0\\.js\\?v=20260910-agenda-edit-r1&compact_time=20260910-r2/,'Agenda lazy deve invalidar cache');\nassert.match(loader,/agenda_referencia-1\\.20\\.0\\.css\\?v=20260910-layout-shim-r1/,'Shim lazy deve invalidar o CSS legado em cache');\nassert.match(agenda,/agenda-geral-faixa/,'Visão da clínica deve preservar duração e separar profissionais simultâneos');")
t = t.replace("screen_loader-1\\.25\\.0\\.js\\?v=20260910-phase4d-r1&agenda_edit=20260910-r1&agenda_compact=20260910-r1",
              "screen_loader-1\\.25\\.0\\.js\\?v=20260910-phase4d-r1&agenda_edit=20260910-r1&agenda_compact=20260910-r2")
test_path.write_text(t, encoding='utf-8')

print('Agenda workspace compact R2 preparada.')
