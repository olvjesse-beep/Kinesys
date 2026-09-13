(() => {
  'use strict';

  const API_URL = 'https://yulkylvkofeisbjwnxhe.supabase.co/functions/v1/agendamento-publico';
  const state = {
    clinica: '',
    catalogo: null,
    procedimento: null,
    profissional: null,
    slots: [],
    data: '',
    horario: null,
    carregandoSlots: false,
  };

  const $ = (id) => document.getElementById(id);

  function escapar(valor = '') {
    return String(valor ?? '').replace(/[&<>'"]/g, (c) => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;'
    }[c]));
  }

  function mostrarSomente(id) {
    ['ks_public_loading', 'ks_public_closed', 'ks_public_error', 'ks_public_flow'].forEach((alvo) => {
      const el = $(alvo);
      if (el) el.hidden = alvo !== id;
    });
  }

  function slugDaPagina() {
    const params = new URLSearchParams(location.search);
    return String(params.get('clinica') || '').trim().toLowerCase();
  }

  function formatarValor(valor) {
    return Number(valor).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  }

  function dataUTC(iso) {
    const m = String(iso || '').match(/^(\d{4})-(\d{2})-(\d{2})$/);
    return m ? new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3]), 12)) : null;
  }

  function formatarData(iso, longo = false) {
    const d = dataUTC(iso);
    if (!d) return iso;
    return new Intl.DateTimeFormat('pt-BR', longo
      ? { timeZone: 'UTC', weekday: 'long', day: '2-digit', month: 'long' }
      : { timeZone: 'UTC', weekday: 'short', day: '2-digit', month: 'short' }
    ).format(d).replace('.', '');
  }

  function atualizarProgresso(etapa) {
    const ordem = ['procedimento', 'profissional', 'horario'];
    const atual = ordem.indexOf(etapa);
    document.querySelectorAll('[data-progress]').forEach((btn) => {
      const idx = ordem.indexOf(btn.dataset.progress);
      const corrente = idx === atual;
      btn.toggleAttribute('disabled', idx > atual);
      btn.dataset.complete = String(idx < atual);
      if (corrente) btn.setAttribute('aria-current', 'step');
      else btn.removeAttribute('aria-current');
    });
  }

  function abrirEtapa(etapa) {
    document.querySelectorAll('[data-step]').forEach((el) => {
      el.hidden = el.dataset.step !== etapa;
    });
    atualizarProgresso(etapa);
    const alvo = document.querySelector(`[data-step="${etapa}"]`);
    alvo?.scrollIntoView?.({ behavior: 'smooth', block: 'start' });
  }

  function renderizarProcedimentos() {
    const alvo = $('ks_public_procedimentos');
    const lista = state.catalogo?.procedimentos || [];
    alvo.innerHTML = lista.map((p) => {
      const valor = p.valor != null ? `<span class="ks-public-option-meta">${escapar(formatarValor(p.valor))}</span>` : '';
      return `<button type="button" class="ks-public-option" data-procedimento="${escapar(p.id)}" aria-pressed="false">
        <span class="ks-public-option-copy"><strong>${escapar(p.nome)}</strong><span>${Number(p.duracao_minutos) || 0} min</span></span>
        ${valor}
      </button>`;
    }).join('');
  }

  function profissionaisParaProcedimento() {
    const todos = state.catalogo?.profissionais || [];
    const ids = Array.isArray(state.procedimento?.profissionais_ids) ? state.procedimento.profissionais_ids.map(String) : [];
    return ids.length ? todos.filter((p) => ids.includes(String(p.id))) : todos;
  }

  function renderizarProfissionais() {
    const alvo = $('ks_public_profissionais');
    const lista = profissionaisParaProcedimento();
    if (!lista.length) {
      alvo.innerHTML = '<div class="ks-public-empty"><strong>Nenhum profissional disponível</strong><span>Escolha outro atendimento.</span></div>';
      return;
    }
    alvo.innerHTML = lista.map((p) => `<button type="button" class="ks-public-option" data-profissional="${escapar(p.id)}" aria-pressed="false">
      <span class="ks-public-option-copy"><strong>${escapar(p.nome)}</strong><span>${escapar(String(p.tipo || 'Profissional').toLowerCase())}</span></span>
    </button>`).join('');
  }

  function limparSelecaoHorario() {
    state.slots = [];
    state.data = '';
    state.horario = null;
    $('ks_public_datas').innerHTML = '';
    $('ks_public_horarios').innerHTML = '';
    $('ks_public_horarios_area').hidden = true;
    $('ks_public_selection').hidden = true;
  }

  async function consultarSlots() {
    limparSelecaoHorario();
    if (!state.procedimento || !state.profissional || state.carregandoSlots) return;
    state.carregandoSlots = true;
    $('ks_public_slots_loading').hidden = false;
    $('ks_public_sem_horarios').hidden = true;
    try {
      const resposta = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          acao: 'slots',
          clinica: state.clinica,
          profissional_id: state.profissional.id,
          procedimento_id: state.procedimento.id,
        }),
      });
      const dados = await resposta.json().catch(() => ({}));
      if (!resposta.ok) throw new Error(dados?.erro || 'Não foi possível consultar os horários.');
      state.slots = Array.isArray(dados.dias) ? dados.dias : [];
      renderizarDatas();
    } catch (erro) {
      console.error('KineSys agendamento público: falha ao consultar slots', erro);
      $('ks_public_sem_horarios').hidden = false;
      $('ks_public_sem_horarios').querySelector('strong').textContent = 'Não foi possível consultar os horários';
      $('ks_public_sem_horarios').querySelector('span').textContent = 'Tente novamente em alguns instantes.';
    } finally {
      state.carregandoSlots = false;
      $('ks_public_slots_loading').hidden = true;
    }
  }

  function renderizarDatas() {
    const alvo = $('ks_public_datas');
    if (!state.slots.length) {
      alvo.innerHTML = '';
      $('ks_public_sem_horarios').hidden = false;
      return;
    }
    $('ks_public_sem_horarios').hidden = true;
    alvo.innerHTML = state.slots.map((dia, indice) => `<button type="button" class="ks-public-date" data-data="${escapar(dia.data)}" aria-pressed="false" role="listitem">
      <strong>${escapar(formatarData(dia.data))}</strong>
      <span>${dia.horarios.length} horário${dia.horarios.length === 1 ? '' : 's'}</span>
    </button>`).join('');
    selecionarData(state.slots[0].data, false);
  }

  function selecionarData(data, rolar = true) {
    const dia = state.slots.find((item) => item.data === data);
    if (!dia) return;
    state.data = data;
    state.horario = null;
    $('ks_public_selection').hidden = true;
    document.querySelectorAll('[data-data]').forEach((btn) => btn.setAttribute('aria-pressed', String(btn.dataset.data === data)));
    $('ks_public_data_escolhida').textContent = formatarData(data, true);
    $('ks_public_horarios').innerHTML = dia.horarios.map((h) => `<button type="button" class="ks-public-time" data-horario="${escapar(h.inicio)}|${escapar(h.fim)}" aria-pressed="false">${escapar(h.inicio)}</button>`).join('');
    $('ks_public_horarios_area').hidden = false;
    if (rolar) $('ks_public_horarios_area').scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }

  function selecionarHorario(inicio, fim) {
    state.horario = { inicio, fim };
    document.querySelectorAll('[data-horario]').forEach((btn) => {
      btn.setAttribute('aria-pressed', String(btn.dataset.horario === `${inicio}|${fim}`));
    });
    const box = $('ks_public_selection');
    $('ks_public_selection_title').textContent = `${formatarData(state.data)} · ${inicio}–${fim}`;
    $('ks_public_selection_meta').textContent = `${state.procedimento?.nome || 'Atendimento'} · ${state.profissional?.nome || 'Profissional'}`;
    box.hidden = false;
  }

  function selecionarProcedimento(id) {
    const item = (state.catalogo?.procedimentos || []).find((p) => String(p.id) === String(id));
    if (!item) return;
    state.procedimento = item;
    state.profissional = null;
    limparSelecaoHorario();
    renderizarProfissionais();
    abrirEtapa('profissional');
  }

  function selecionarProfissional(id) {
    const item = profissionaisParaProcedimento().find((p) => String(p.id) === String(id));
    if (!item) return;
    state.profissional = item;
    abrirEtapa('horario');
    $('ks_public_slot_context').textContent = `${item.nome} · ${state.procedimento.nome} · ${state.procedimento.duracao_minutos} min`;
    consultarSlots();
  }

  async function carregarCatalogo() {
    mostrarSomente('ks_public_loading');
    state.clinica = slugDaPagina();
    if (!/^[a-z0-9][a-z0-9-]{1,79}$/.test(state.clinica)) {
      $('ks_public_error_message').textContent = 'O link de agendamento está incompleto ou inválido.';
      mostrarSomente('ks_public_error');
      return;
    }
    try {
      const resposta = await fetch(`${API_URL}?clinica=${encodeURIComponent(state.clinica)}`, { method: 'GET' });
      const dados = await resposta.json().catch(() => ({}));
      if (resposta.status === 404 || dados?.encontrado === false) {
        $('ks_public_error_message').textContent = 'Este link de agendamento não está disponível.';
        mostrarSomente('ks_public_error');
        return;
      }
      if (!resposta.ok) throw new Error(dados?.erro || 'Não foi possível abrir a agenda.');
      state.catalogo = dados;
      $('ks_public_clinica').textContent = dados?.clinica?.nome || '';
      document.title = `${dados?.clinica?.nome || 'Clínica'} — Agendamento online`;
      if (!dados.aberto) {
        $('ks_public_closed_title').textContent = dados.titulo || 'Agendamento online indisponível';
        $('ks_public_closed_message').textContent = dados.mensagem || 'Entre em contato com a clínica para agendar.';
        mostrarSomente('ks_public_closed');
        return;
      }
      $('ks_public_title').textContent = dados.titulo || 'Agende seu atendimento';
      $('ks_public_description').textContent = dados.descricao || 'Escolha o atendimento, o profissional e um horário disponível.';
      state.procedimento = null;
      state.profissional = null;
      limparSelecaoHorario();
      renderizarProcedimentos();
      mostrarSomente('ks_public_flow');
      abrirEtapa('procedimento');
    } catch (erro) {
      console.error('KineSys agendamento público: falha ao carregar catálogo', erro);
      $('ks_public_error_message').textContent = 'Verifique sua conexão e tente novamente.';
      mostrarSomente('ks_public_error');
    }
  }

  function ligarEventos() {
    $('ks_public_retry')?.addEventListener('click', carregarCatalogo);
    $('ks_public_procedimentos')?.addEventListener('click', (evento) => {
      const btn = evento.target.closest('[data-procedimento]');
      if (btn) selecionarProcedimento(btn.dataset.procedimento);
    });
    $('ks_public_profissionais')?.addEventListener('click', (evento) => {
      const btn = evento.target.closest('[data-profissional]');
      if (btn) selecionarProfissional(btn.dataset.profissional);
    });
    $('ks_public_datas')?.addEventListener('click', (evento) => {
      const btn = evento.target.closest('[data-data]');
      if (btn) selecionarData(btn.dataset.data);
    });
    $('ks_public_horarios')?.addEventListener('click', (evento) => {
      const btn = evento.target.closest('[data-horario]');
      if (!btn) return;
      const [inicio, fim] = String(btn.dataset.horario || '').split('|');
      if (inicio && fim) selecionarHorario(inicio, fim);
    });
    document.addEventListener('click', (evento) => {
      const voltar = evento.target.closest('[data-voltar]');
      if (voltar) abrirEtapa(voltar.dataset.voltar);
      const progresso = evento.target.closest('[data-progress]:not(:disabled)');
      if (progresso?.dataset.progress) abrirEtapa(progresso.dataset.progress);
    });
  }

  ligarEventos();
  carregarCatalogo();
})();
