(() => {
  'use strict';

  const API_URL = 'https://yulkylvkofeisbjwnxhe.supabase.co/functions/v1/agendamento-publico';
  const ETAPAS = ['procedimento', 'profissional', 'horario', 'dados'];
  const ROTULOS_ETAPAS = ['Atendimento', 'Profissional', 'Horário', 'Seus dados'];

  const state = {
    clinica: '',
    catalogo: null,
    procedimento: null,
    profissional: null,
    slots: [],
    data: '',
    horario: null,
    requestId: '',
    carregandoSlots: false,
    reservando: false,
  };

  const $ = (id) => document.getElementById(id);

  function escapar(valor = '') {
    return String(valor ?? '').replace(/[&<>'"]/g, (c) => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;'
    }[c]));
  }

  function digitos(valor = '') {
    return String(valor ?? '').replace(/\D/g, '');
  }

  function mostrarSomente(id) {
    ['ks_public_loading', 'ks_public_closed', 'ks_public_error', 'ks_public_success', 'ks_public_flow'].forEach((alvo) => {
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
      ? { timeZone: 'UTC', weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' }
      : { timeZone: 'UTC', weekday: 'short', day: '2-digit', month: 'short' }
    ).format(d).replace('.', '');
  }

  function uuidSolicitacao() {
    if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID();
    const bytes = new Uint8Array(16);
    globalThis.crypto?.getRandomValues?.(bytes);
    bytes[6] = (bytes[6] & 0x0f) | 0x40;
    bytes[8] = (bytes[8] & 0x3f) | 0x80;
    const h = [...bytes].map((b) => b.toString(16).padStart(2, '0')).join('');
    return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`;
  }

  function atualizarProgresso(etapa) {
    const atual = Math.max(0, ETAPAS.indexOf(etapa));
    $('ks_public_progress_count').textContent = `Etapa ${atual + 1} de ${ETAPAS.length}`;
    $('ks_public_progress_label').textContent = ROTULOS_ETAPAS[atual];
    document.querySelectorAll('[data-progress-segment]').forEach((segmento) => {
      const idx = Number(segmento.dataset.progressSegment);
      segmento.classList.toggle('ativo', idx === atual);
      segmento.classList.toggle('concluido', idx < atual);
    });
  }

  function abrirEtapa(etapa) {
    document.querySelectorAll('[data-step]').forEach((el) => {
      el.hidden = el.dataset.step !== etapa;
    });
    atualizarProgresso(etapa);
    const selection = $('ks_public_selection');
    if (selection) selection.hidden = !(etapa === 'horario' && state.horario);
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
    state.requestId = '';
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
    alvo.innerHTML = state.slots.map((dia) => `<button type="button" class="ks-public-date" data-data="${escapar(dia.data)}" aria-pressed="false" role="listitem">
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
    state.requestId = '';
    $('ks_public_selection').hidden = true;
    document.querySelectorAll('[data-data]').forEach((btn) => btn.setAttribute('aria-pressed', String(btn.dataset.data === data)));
    $('ks_public_data_escolhida').textContent = formatarData(data, true);
    $('ks_public_horarios').innerHTML = dia.horarios.map((h) => `<button type="button" class="ks-public-time" data-horario="${escapar(h.inicio)}|${escapar(h.fim)}" aria-pressed="false">${escapar(h.inicio)}</button>`).join('');
    $('ks_public_horarios_area').hidden = false;
    if (rolar) $('ks_public_horarios_area').scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }

  function selecionarHorario(inicio, fim) {
    state.horario = { inicio, fim };
    state.requestId = '';
    document.querySelectorAll('[data-horario]').forEach((btn) => {
      btn.setAttribute('aria-pressed', String(btn.dataset.horario === `${inicio}|${fim}`));
    });
    $('ks_public_selection_title').textContent = `${formatarData(state.data)} · ${inicio}–${fim}`;
    $('ks_public_selection_meta').textContent = `${state.procedimento?.nome || 'Atendimento'} · ${state.profissional?.nome || 'Profissional'}`;
    $('ks_public_selection').hidden = false;
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

  function prepararDados() {
    if (!state.horario || !state.data || !state.procedimento || !state.profissional) return;
    $('ks_public_form_summary_date').textContent = `${formatarData(state.data, true)} · ${state.horario.inicio}–${state.horario.fim}`;
    $('ks_public_form_summary_service').textContent = `${state.procedimento.nome} · ${state.procedimento.duracao_minutos} min`;
    $('ks_public_form_summary_professional').textContent = state.profissional.nome;
    limparFeedbackFormulario();
    abrirEtapa('dados');
    setTimeout(() => $('ks_public_nome')?.focus(), 80);
  }

  function cpfValido(cpf) {
    const v = digitos(cpf);
    if (!v) return true;
    if (v.length !== 11 || /^(\d)\1{10}$/.test(v)) return false;
    const calcular = (tamanho) => {
      let soma = 0;
      for (let i = 0; i < tamanho; i++) soma += Number(v[i]) * (tamanho + 1 - i);
      const resto = soma % 11;
      return resto < 2 ? 0 : 11 - resto;
    };
    return calcular(9) === Number(v[9]) && calcular(10) === Number(v[10]);
  }

  function telefoneValido(valor) {
    const n = digitos(valor);
    return n.length === 10 || n.length === 11;
  }

  function marcarCampo(id, invalido) {
    const el = $(id);
    if (!el) return;
    if (invalido) el.setAttribute('aria-invalid', 'true');
    else el.removeAttribute('aria-invalid');
  }

  function feedbackFormulario(mensagem) {
    const el = $('ks_public_form_feedback');
    el.textContent = mensagem || '';
    el.hidden = !mensagem;
  }

  function limparFeedbackFormulario() {
    feedbackFormulario('');
    ['ks_public_nome', 'ks_public_nascimento', 'ks_public_telefone', 'ks_public_cpf', 'ks_public_responsavel_nome', 'ks_public_responsavel_parentesco', 'ks_public_responsavel_telefone'].forEach((id) => marcarCampo(id, false));
  }

  function validarFormulario() {
    limparFeedbackFormulario();
    const nome = String($('ks_public_nome').value || '').trim().replace(/\s+/g, ' ');
    const nascimento = $('ks_public_nascimento').value;
    const telefone = $('ks_public_telefone').value;
    const cpf = $('ks_public_cpf').value;
    const dependente = $('ks_public_dependente').checked;
    const responsavelNome = String($('ks_public_responsavel_nome').value || '').trim();
    const responsavelParentesco = $('ks_public_responsavel_parentesco').value;
    const responsavelTelefone = $('ks_public_responsavel_telefone').value;

    const erros = [];
    if (nome.length < 3) { erros.push(['ks_public_nome', 'Informe o nome completo do paciente.']); }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(nascimento)) { erros.push(['ks_public_nascimento', 'Informe a data de nascimento.']); }
    if (!telefoneValido(telefone)) { erros.push(['ks_public_telefone', 'Informe um celular com DDD.']); }
    if (!cpfValido(cpf)) { erros.push(['ks_public_cpf', 'O CPF informado não é válido.']); }
    if (dependente) {
      if (responsavelNome.length < 3) erros.push(['ks_public_responsavel_nome', 'Informe o nome do responsável.']);
      if (!responsavelParentesco) erros.push(['ks_public_responsavel_parentesco', 'Informe o parentesco do responsável.']);
      if (!telefoneValido(responsavelTelefone)) erros.push(['ks_public_responsavel_telefone', 'Informe o celular do responsável com DDD.']);
    }
    if (!$('ks_public_consentimento').checked) erros.push(['ks_public_consentimento', 'Confirme os dados antes de agendar.']);

    if (erros.length) {
      erros.forEach(([id]) => marcarCampo(id, true));
      feedbackFormulario(erros[0][1]);
      const primeiro = $(erros[0][0]);
      primeiro?.focus?.();
      return null;
    }

    return {
      nome,
      nascimento,
      telefone: digitos(telefone),
      cpf: digitos(cpf),
      dependente,
      responsavel_nome: dependente ? responsavelNome : '',
      responsavel_parentesco: dependente ? responsavelParentesco : '',
      responsavel_telefone: dependente ? digitos(responsavelTelefone) : '',
    };
  }

  function setReservando(valor) {
    state.reservando = !!valor;
    const btn = $('ks_public_confirmar');
    if (!btn) return;
    btn.disabled = state.reservando;
    btn.textContent = state.reservando ? 'Confirmando…' : 'Confirmar agendamento';
  }

  async function confirmarAgendamento(evento) {
    evento.preventDefault();
    if (state.reservando || !state.horario || !state.data || !state.procedimento || !state.profissional) return;
    const paciente = validarFormulario();
    if (!paciente) return;
    if (!state.requestId) state.requestId = uuidSolicitacao();

    setReservando(true);
    feedbackFormulario('');
    try {
      const resposta = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          acao: 'reservar',
          clinica: state.clinica,
          request_id: state.requestId,
          profissional_id: state.profissional.id,
          procedimento_id: state.procedimento.id,
          data: state.data,
          hora_inicio: state.horario.inicio,
          paciente,
        }),
      });
      const dados = await resposta.json().catch(() => ({}));

      if (resposta.status === 409 && dados?.codigo === 'HORARIO_INDISPONIVEL') {
        state.requestId = '';
        feedbackFormulario('Esse horário acabou de ser ocupado. Escolha outro horário disponível.');
        await consultarSlots();
        abrirEtapa('horario');
        return;
      }
      if (!resposta.ok || !dados?.ok) {
        throw new Error(dados?.erro || 'Não foi possível confirmar o agendamento.');
      }

      $('ks_public_success_summary').textContent = 'A reserva foi registrada na agenda da clínica.';
      $('ks_public_success_date').textContent = `${formatarData(state.data, true)} · ${state.horario.inicio}–${state.horario.fim}`;
      $('ks_public_success_service').textContent = `${state.procedimento.nome} · ${state.procedimento.duracao_minutos} min`;
      $('ks_public_success_professional').textContent = state.profissional.nome;
      $('ks_public_selection').hidden = true;
      mostrarSomente('ks_public_success');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (erro) {
      console.error('KineSys agendamento público: falha ao confirmar reserva', erro);
      feedbackFormulario(erro?.message || 'Não foi possível confirmar. Verifique sua conexão e tente novamente.');
    } finally {
      setReservando(false);
    }
  }

  function alternarDependente() {
    const ativo = $('ks_public_dependente').checked;
    const area = $('ks_public_responsavel');
    area.hidden = !ativo;
    ['ks_public_responsavel_nome', 'ks_public_responsavel_parentesco', 'ks_public_responsavel_telefone'].forEach((id) => {
      const el = $(id);
      if (el) el.required = ativo;
    });
  }

  function formatarTelefoneInput(evento) {
    const el = evento.currentTarget;
    const n = digitos(el.value).slice(0, 11);
    if (n.length <= 2) el.value = n;
    else if (n.length <= 6) el.value = `(${n.slice(0, 2)}) ${n.slice(2)}`;
    else if (n.length <= 10) el.value = `(${n.slice(0, 2)}) ${n.slice(2, 6)}-${n.slice(6)}`;
    else el.value = `(${n.slice(0, 2)}) ${n.slice(2, 7)}-${n.slice(7)}`;
  }

  function formatarCPFInput(evento) {
    const el = evento.currentTarget;
    const n = digitos(el.value).slice(0, 11);
    el.value = n
      .replace(/^(\d{3})(\d)/, '$1.$2')
      .replace(/^(\d{3})\.(\d{3})(\d)/, '$1.$2.$3')
      .replace(/(\d{3})(\d{1,2})$/, '$1-$2');
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
      state.requestId = '';
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
    $('ks_public_new_booking')?.addEventListener('click', () => location.reload());
    $('ks_public_continue')?.addEventListener('click', prepararDados);
    $('ks_public_form')?.addEventListener('submit', confirmarAgendamento);
    $('ks_public_dependente')?.addEventListener('change', alternarDependente);
    $('ks_public_telefone')?.addEventListener('input', formatarTelefoneInput);
    $('ks_public_responsavel_telefone')?.addEventListener('input', formatarTelefoneInput);
    $('ks_public_cpf')?.addEventListener('input', formatarCPFInput);

    const nascimento = $('ks_public_nascimento');
    if (nascimento) {
      const hoje = new Date();
      const local = new Date(hoje.getTime() - hoje.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
      nascimento.max = local;
      nascimento.min = '1900-01-01';
    }

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
    });
  }

  ligarEventos();
  carregarCatalogo();
})();
