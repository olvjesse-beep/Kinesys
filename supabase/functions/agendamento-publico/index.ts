import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || "";
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const OCUPA_HORARIO = new Set(["pre_agendado", "agendado", "confirmado", "em_recepcao"]);
const MAX_HORIZONTE_DIAS = 90;
const MAX_SLOTS_RESPOSTA = 500;
const MAX_BODY_CHARS = 12000;

function cors(req: Request) {
  const origem = req.headers.get("origin") || "";
  const permitidas = new Set([
    "https://app.fisiofixfisioterapia.com",
    "https://fisiofixfisioterapia.com",
    "https://www.fisiofixfisioterapia.com",
  ]);
  const allowOrigin = permitidas.has(origem) ? origem : "https://app.fisiofixfisioterapia.com";
  return {
    "Access-Control-Allow-Origin": allowOrigin,
    "Access-Control-Allow-Headers": "content-type, x-client-info",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Vary": "Origin",
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
  };
}

function resposta(req: Request, body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: cors(req) });
}

function texto(valor: unknown, max = 160) {
  return String(valor ?? "").trim().slice(0, max);
}

function digitos(valor: unknown, max = 20) {
  return texto(valor, max * 2).replace(/\D/g, "").slice(0, max);
}

function horaCurta(valor: unknown) {
  return texto(valor, 8).slice(0, 5);
}

function uuidValido(valor: unknown) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(texto(valor, 40));
}

function dataValida(valor: unknown) {
  return /^\d{4}-\d{2}-\d{2}$/.test(texto(valor, 10));
}

function horaValida(valor: unknown) {
  return /^(?:[01]\d|2[0-3]):[0-5]\d$/.test(horaCurta(valor));
}

function horaParaMinutos(hora: string) {
  const m = hora.match(/^(\d{2}):(\d{2})$/);
  if (!m) return Number.NaN;
  return Number(m[1]) * 60 + Number(m[2]);
}

function minutosParaHora(total: number) {
  return `${String(Math.floor(total / 60)).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
}

function dataISO(data: Date) {
  return `${data.getUTCFullYear()}-${String(data.getUTCMonth() + 1).padStart(2, "0")}-${String(data.getUTCDate()).padStart(2, "0")}`;
}

function dataUTC(iso: string) {
  const m = iso.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  return m ? new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3]))) : null;
}

function somarDias(iso: string, dias: number) {
  const d = dataUTC(iso);
  if (!d) return "";
  d.setUTCDate(d.getUTCDate() + dias);
  return dataISO(d);
}

function instanteSaoPaulo(data = new Date()) {
  const partes = Object.fromEntries(
    new Intl.DateTimeFormat("en-CA", {
      timeZone: "America/Sao_Paulo",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
    }).formatToParts(data).map((p) => [p.type, p.value]),
  );
  return {
    data: `${partes.year}-${partes.month}-${partes.day}`,
    hora: `${partes.hour}:${partes.minute}`,
  };
}

function calcularPascoa(ano: number) {
  const a = ano % 19;
  const b = Math.floor(ano / 100);
  const c = ano % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const mes = Math.floor((h + l - 7 * m + 114) / 31);
  const dia = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(Date.UTC(ano, mes - 1, dia));
}

function feriadoAgenda(iso: string) {
  const d = dataUTC(iso);
  if (!d) return null;
  const ano = d.getUTCFullYear();
  const fixos = new Map([
    [`${ano}-01-01`, "Confraternização Universal"],
    [`${ano}-04-21`, "Tiradentes"],
    [`${ano}-05-01`, "Dia do Trabalho"],
    [`${ano}-07-03`, "Aniversário de Montes Claros"],
    [`${ano}-09-07`, "Independência do Brasil"],
    [`${ano}-10-12`, "Nossa Senhora Aparecida"],
    [`${ano}-11-02`, "Finados"],
    [`${ano}-11-15`, "Proclamação da República"],
    [`${ano}-11-20`, "Dia Nacional de Zumbi e da Consciência Negra"],
    [`${ano}-12-25`, "Natal"],
  ]);
  if (fixos.has(iso)) return fixos.get(iso) || "Feriado";
  const pascoa = calcularPascoa(ano);
  const sexta = new Date(pascoa.getTime()); sexta.setUTCDate(sexta.getUTCDate() - 2);
  const corpus = new Date(pascoa.getTime()); corpus.setUTCDate(corpus.getUTCDate() + 60);
  if (dataISO(sexta) === iso) return "Sexta-feira Santa";
  if (dataISO(corpus) === iso) return "Corpus Christi";
  return null;
}

type Janela = { hora_inicio: string; hora_fim: string; dia_semana?: number; profissional_id?: string | null };

function intersectar(a: Janela[], b: Janela[]) {
  const resultado: Janela[] = [];
  for (const x of a) {
    const xi = horaParaMinutos(horaCurta(x.hora_inicio));
    const xf = horaParaMinutos(horaCurta(x.hora_fim));
    for (const y of b) {
      const yi = horaParaMinutos(horaCurta(y.hora_inicio));
      const yf = horaParaMinutos(horaCurta(y.hora_fim));
      const inicio = Math.max(xi, yi);
      const fim = Math.min(xf, yf);
      if (Number.isFinite(inicio) && Number.isFinite(fim) && inicio < fim) {
        resultado.push({ hora_inicio: minutosParaHora(inicio), hora_fim: minutosParaHora(fim) });
      }
    }
  }
  const unicas = new Map(resultado.map((j) => [`${j.hora_inicio}|${j.hora_fim}`, j]));
  return [...unicas.values()].sort((x, y) => x.hora_inicio.localeCompare(y.hora_inicio));
}

async function obterContextoClinica(slug: string) {
  const { data: clinica, error: clinicaError } = await supabase
    .from("clinicas").select("id,nome,slug,ativa").eq("slug", slug).eq("ativa", true).maybeSingle();
  if (clinicaError) throw clinicaError;
  if (!clinica) return null;

  const { data: config, error: configError } = await supabase
    .from("configuracoes_agendamento_online")
    .select("ativo,antecedencia_minima_minutos,horizonte_dias,titulo_publico,descricao_publica,mensagem_fechado,mostrar_valores")
    .eq("clinica_id", clinica.id).maybeSingle();
  if (configError) throw configError;

  return { clinica, config };
}

async function catalogoPublico(slug: string) {
  const contexto = await obterContextoClinica(slug);
  if (!contexto) return { encontrado: false };
  const { clinica, config } = contexto;
  const fechado = {
    encontrado: true,
    aberto: false,
    clinica: { nome: texto(clinica.nome, 100), slug: texto(clinica.slug, 80) },
    titulo: texto(config?.titulo_publico || "Agendamento online", 100),
    mensagem: texto(config?.mensagem_fechado || "O agendamento online está temporariamente indisponível.", 320),
  };
  if (!config?.ativo) return fechado;

  const [profRes, procRes, dispRes] = await Promise.all([
    supabase.from("equipe")
      .select("id,nome,tipo,agendamento_online_ordem")
      .eq("clinica_id", clinica.id).eq("ativo", true).eq("aparece_na_agenda", true).eq("agendamento_online_ativo", true)
      .order("agendamento_online_ordem", { ascending: true }).order("nome", { ascending: true }),
    supabase.from("procedimentos")
      .select("id,nome,duracao_minutos,valor,profissionais_ids")
      .eq("clinica_id", clinica.id).eq("ativo", true).eq("agendamento_online_ativo", true).order("nome"),
    supabase.from("disponibilidade_agendamento_online")
      .select("profissional_id")
      .eq("clinica_id", clinica.id).eq("ativo", true).limit(1),
  ]);
  for (const r of [profRes, procRes, dispRes]) if (r.error) throw r.error;

  const profissionais = (profRes.data || []).map((p) => ({
    id: texto(p.id, 120),
    nome: texto(p.nome, 120),
    tipo: texto(p.tipo || "Profissional", 80).replaceAll("_", " "),
  }));
  const idsProf = new Set(profissionais.map((p) => p.id));
  const procedimentos = (procRes.data || []).map((p) => ({
    id: texto(p.id, 80),
    nome: texto(p.nome, 120),
    duracao_minutos: Math.max(5, Math.min(480, Number(p.duracao_minutos) || 30)),
    valor: config.mostrar_valores && p.valor != null ? Number(p.valor) : null,
    profissionais_ids: Array.isArray(p.profissionais_ids)
      ? p.profissionais_ids.map(String).filter((id: string) => idsProf.has(id))
      : [],
  }));

  if (!profissionais.length || !procedimentos.length || !(dispRes.data || []).length) return fechado;
  return {
    encontrado: true,
    aberto: true,
    clinica: { nome: texto(clinica.nome, 100), slug: texto(clinica.slug, 80) },
    titulo: texto(config.titulo_publico, 100),
    descricao: texto(config.descricao_publica, 320),
    mostrar_valores: !!config.mostrar_valores,
    antecedencia_minima_minutos: Math.max(0, Number(config.antecedencia_minima_minutos) || 0),
    horizonte_dias: Math.max(1, Math.min(MAX_HORIZONTE_DIAS, Number(config.horizonte_dias) || 30)),
    profissionais,
    procedimentos,
  };
}

async function slotsPublicos(slug: string, profissionalId: string, procedimentoId: string) {
  const contexto = await obterContextoClinica(slug);
  if (!contexto?.config?.ativo) return { aberto: false, dias: [] };
  const { clinica, config } = contexto;

  const [profRes, procRes, horariosRes, pubRes] = await Promise.all([
    supabase.from("equipe").select("id,nome")
      .eq("clinica_id", clinica.id).eq("id", profissionalId).eq("ativo", true)
      .eq("aparece_na_agenda", true).eq("agendamento_online_ativo", true).maybeSingle(),
    supabase.from("procedimentos").select("id,nome,duracao_minutos,profissionais_ids")
      .eq("clinica_id", clinica.id).eq("id", procedimentoId).eq("ativo", true)
      .eq("agendamento_online_ativo", true).maybeSingle(),
    supabase.from("horarios_atendimento").select("profissional_id,dia_semana,hora_inicio,hora_fim")
      .eq("clinica_id", clinica.id),
    supabase.from("disponibilidade_agendamento_online").select("profissional_id,dia_semana,hora_inicio,hora_fim")
      .eq("clinica_id", clinica.id).eq("profissional_id", profissionalId).eq("ativo", true),
  ]);
  for (const r of [profRes, procRes, horariosRes, pubRes]) if (r.error) throw r.error;
  if (!profRes.data || !procRes.data) return { aberto: true, dias: [] };

  const profissionaisPermitidos = Array.isArray(procRes.data.profissionais_ids) ? procRes.data.profissionais_ids.map(String) : [];
  if (profissionaisPermitidos.length && !profissionaisPermitidos.includes(String(profissionalId))) {
    return { aberto: true, dias: [] };
  }

  const duracao = Math.max(5, Math.min(480, Number(procRes.data.duracao_minutos) || 30));
  const horizonte = Math.max(1, Math.min(MAX_HORIZONTE_DIAS, Number(config.horizonte_dias) || 30));
  const agora = instanteSaoPaulo();
  const limite = instanteSaoPaulo(new Date(Date.now() + Math.max(0, Number(config.antecedencia_minima_minutos) || 0) * 60000));
  const inicio = agora.data;
  const fim = somarDias(inicio, horizonte - 1);

  const [bloqRes, agRes] = await Promise.all([
    supabase.from("bloqueios_agenda").select("profissional_id,data,hora_inicio,hora_fim")
      .eq("clinica_id", clinica.id).gte("data", inicio).lte("data", fim),
    supabase.from("agendamentos").select("profissional_id,data,hora_inicio,hora_fim,status")
      .eq("clinica_id", clinica.id).eq("profissional_id", profissionalId)
      .gte("data", inicio).lte("data", fim).neq("status", "cancelado"),
  ]);
  for (const r of [bloqRes, agRes]) if (r.error) throw r.error;

  const horarios = horariosRes.data || [];
  const publicados = pubRes.data || [];
  const gradeProfCompleta = horarios.filter((h) => String(h.profissional_id || "") === String(profissionalId));
  const dias: Array<{ data: string; horarios: Array<{ inicio: string; fim: string }> }> = [];
  let total = 0;

  for (let offset = 0; offset < horizonte && total < MAX_SLOTS_RESPOSTA; offset++) {
    const diaISO = somarDias(inicio, offset);
    const d = dataUTC(diaISO);
    if (!d || feriadoAgenda(diaISO)) continue;
    const diaSemana = d.getUTCDay();
    const gerais = horarios.filter((h) => h.profissional_id == null && Number(h.dia_semana) === diaSemana);
    let reais: Janela[] = gerais;
    if (gradeProfCompleta.length) {
      const especificas = gradeProfCompleta.filter((h) => Number(h.dia_semana) === diaSemana);
      reais = especificas.length ? intersectar(gerais as Janela[], especificas as Janela[]) : [];
    }
    const online = publicados.filter((h) => Number(h.dia_semana) === diaSemana);
    const janelas = intersectar(reais as Janela[], online as Janela[]);
    if (!janelas.length) continue;

    const ocupados: Array<[number, number]> = (agRes.data || [])
      .filter((a) => a.data === diaISO && OCUPA_HORARIO.has(String(a.status)))
      .map((a) => [horaParaMinutos(horaCurta(a.hora_inicio)), horaParaMinutos(horaCurta(a.hora_fim))]);
    for (const b of (bloqRes.data || []).filter((x) => x.data === diaISO && (!x.profissional_id || String(x.profissional_id) === String(profissionalId)))) {
      if (b.hora_inicio && b.hora_fim) ocupados.push([horaParaMinutos(horaCurta(b.hora_inicio)), horaParaMinutos(horaCurta(b.hora_fim))]);
      else ocupados.push([0, 1440]);
    }

    const livres: Array<{ inicio: string; fim: string }> = [];
    for (const janela of janelas) {
      const inicioJanela = horaParaMinutos(horaCurta(janela.hora_inicio));
      const fimJanela = horaParaMinutos(horaCurta(janela.hora_fim));
      for (let ini = inicioJanela; ini + duracao <= fimJanela && total < MAX_SLOTS_RESPOSTA; ini += duracao) {
        const fimSlot = ini + duracao;
        const horario = minutosParaHora(ini);
        if (diaISO < limite.data || (diaISO === limite.data && horario < limite.hora)) continue;
        const conflita = ocupados.some(([oi, of]) => ini < of && fimSlot > oi);
        if (!conflita) {
          livres.push({ inicio: horario, fim: minutosParaHora(fimSlot) });
          total++;
        }
      }
    }
    const unicos = new Map(livres.map((s) => [`${s.inicio}|${s.fim}`, s]));
    if (unicos.size) dias.push({ data: diaISO, horarios: [...unicos.values()] });
  }

  return {
    aberto: true,
    profissional: { id: texto(profRes.data.id, 120), nome: texto(profRes.data.nome, 120) },
    procedimento: { id: texto(procRes.data.id, 80), nome: texto(procRes.data.nome, 120), duracao_minutos: duracao },
    dias,
  };
}

function payloadReservaValido(body: Record<string, unknown>) {
  const paciente = (body.paciente && typeof body.paciente === "object") ? body.paciente as Record<string, unknown> : {};
  const dependente = paciente.dependente === true;
  const telefone = digitos(paciente.telefone, 11);
  const cpf = digitos(paciente.cpf, 11);
  const respTelefone = digitos(paciente.responsavel_telefone, 11);

  if (!uuidValido(body.request_id) || !uuidValido(body.procedimento_id)) return null;
  if (!texto(body.profissional_id, 120) || !dataValida(body.data) || !horaValida(body.hora_inicio)) return null;
  if (texto(paciente.nome, 120).length < 3 || !dataValida(paciente.nascimento)) return null;
  if (telefone.length < 10 || telefone.length > 11) return null;
  if (cpf && cpf.length !== 11) return null;
  if (dependente) {
    if (texto(paciente.responsavel_nome, 120).length < 3 || texto(paciente.responsavel_parentesco, 60).length < 2 || respTelefone.length < 10) return null;
  }

  return {
    requestId: texto(body.request_id, 40),
    profissionalId: texto(body.profissional_id, 120),
    procedimentoId: texto(body.procedimento_id, 40),
    data: texto(body.data, 10),
    horaInicio: horaCurta(body.hora_inicio),
    nome: texto(paciente.nome, 120).replace(/\s+/g, " "),
    cpf,
    nascimento: texto(paciente.nascimento, 10),
    telefone,
    dependente,
    responsavelNome: dependente ? texto(paciente.responsavel_nome, 120).replace(/\s+/g, " ") : "",
    responsavelParentesco: dependente ? texto(paciente.responsavel_parentesco, 60) : "",
    responsavelTelefone: dependente ? respTelefone : "",
  };
}

async function reservarOnline(slug: string, body: Record<string, unknown>) {
  const reserva = payloadReservaValido(body);
  if (!reserva) return { status: 400, body: { erro: "Revise os dados do agendamento e tente novamente.", codigo: "DADOS_INVALIDOS" } };

  const { data, error } = await supabase.rpc("kinesys_criar_agendamento_online", {
    p_clinica_slug: slug,
    p_request_id: reserva.requestId,
    p_profissional_id: reserva.profissionalId,
    p_procedimento_id: reserva.procedimentoId,
    p_data: reserva.data,
    p_hora_inicio: reserva.horaInicio,
    p_nome: reserva.nome,
    p_cpf: reserva.cpf,
    p_nascimento: reserva.nascimento,
    p_telefone: reserva.telefone,
    p_dependente: reserva.dependente,
    p_responsavel_nome: reserva.responsavelNome || null,
    p_responsavel_parentesco: reserva.responsavelParentesco || null,
    p_responsavel_telefone: reserva.responsavelTelefone || null,
  });

  if (!error && data?.ok) {
    return {
      status: 200,
      body: {
        ok: true,
        agendamento_id: data.agendamento_id,
        data: data.data,
        hora_inicio: data.hora_inicio,
        hora_fim: data.hora_fim,
      },
    };
  }

  const codigo = texto(error?.code, 16);
  if (codigo === "23P01") {
    return { status: 409, body: { erro: "Esse horário não está mais disponível.", codigo: "HORARIO_INDISPONIVEL" } };
  }
  if (codigo === "22023") {
    return { status: 400, body: { erro: texto(error?.message, 240) || "Revise os dados informados.", codigo: "DADOS_INVALIDOS" } };
  }
  if (codigo === "P0001") {
    return { status: 409, body: { erro: "A disponibilidade da agenda mudou. Atualize os horários e tente novamente.", codigo: "AGENDA_ATUALIZADA" } };
  }

  console.error("agendamento-publico reservar", error);
  return { status: 500, body: { erro: "Não foi possível confirmar o agendamento agora.", codigo: "ERRO_INTERNO" } };
}

async function lerBody(req: Request) {
  const raw = await req.text();
  if (raw.length > MAX_BODY_CHARS) throw new Error("BODY_TOO_LARGE");
  try {
    const body = JSON.parse(raw || "{}");
    return body && typeof body === "object" && !Array.isArray(body) ? body as Record<string, unknown> : {};
  } catch {
    return {};
  }
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: cors(req) });
  if (!SUPABASE_URL || !SERVICE_ROLE_KEY) return resposta(req, { erro: "Serviço temporariamente indisponível." }, 503);
  try {
    const url = new URL(req.url);
    if (req.method === "GET") {
      const slug = texto(url.searchParams.get("clinica"), 80).toLowerCase();
      if (!/^[a-z0-9][a-z0-9-]{1,79}$/.test(slug)) return resposta(req, { erro: "Clínica inválida." }, 400);
      const dados = await catalogoPublico(slug);
      return resposta(req, dados.encontrado ? dados : { encontrado: false, aberto: false }, dados.encontrado ? 200 : 404);
    }
    if (req.method === "POST") {
      const body = await lerBody(req);
      const slug = texto(body.clinica, 80).toLowerCase();
      if (!/^[a-z0-9][a-z0-9-]{1,79}$/.test(slug)) return resposta(req, { erro: "Parâmetros inválidos." }, 400);

      if (body.acao === "slots") {
        const profissionalId = texto(body.profissional_id, 120);
        const procedimentoId = texto(body.procedimento_id, 80);
        if (!profissionalId || !uuidValido(procedimentoId)) return resposta(req, { erro: "Parâmetros inválidos." }, 400);
        return resposta(req, await slotsPublicos(slug, profissionalId, procedimentoId));
      }

      if (body.acao === "reservar") {
        const resultado = await reservarOnline(slug, body);
        return resposta(req, resultado.body, resultado.status);
      }

      return resposta(req, { erro: "Ação não suportada." }, 400);
    }
    return resposta(req, { erro: "Método não permitido." }, 405);
  } catch (erro) {
    if (erro instanceof Error && erro.message === "BODY_TOO_LARGE") return resposta(req, { erro: "Solicitação muito grande." }, 413);
    console.error("agendamento-publico", erro);
    return resposta(req, { erro: "Não foi possível consultar a agenda agora." }, 500);
  }
});
