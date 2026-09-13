import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || "";
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

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
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Vary": "Origin",
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
  };
}

function resposta(req: Request, body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: cors(req) });
}

function texto(valor: unknown, max = 500) {
  return String(valor ?? "").trim().slice(0, max);
}

function listaTexto(valor: unknown) {
  return Array.isArray(valor)
    ? valor.map((item) => texto(item, 80)).filter(Boolean).slice(0, 30)
    : [];
}

async function resolverClinica(slug: string) {
  const slugNormalizado = texto(slug, 80).toLowerCase();
  if (!/^[a-z0-9][a-z0-9-]{1,79}$/.test(slugNormalizado)) return null;

  const { data: cfgPorSlug, error: cfgSlugError } = await supabase
    .from("configuracoes_agendamento_online")
    .select("clinica_id,nome_publico,slug_publico,endereco_publico,telefone_publico,mensagem_confirmacao")
    .eq("slug_publico", slugNormalizado)
    .maybeSingle();
  if (cfgSlugError) throw cfgSlugError;

  if (cfgPorSlug?.clinica_id) {
    const { data: clinica, error } = await supabase
      .from("clinicas")
      .select("id,nome,slug,ativa")
      .eq("id", cfgPorSlug.clinica_id)
      .eq("ativa", true)
      .maybeSingle();
    if (error) throw error;
    if (clinica) return { clinica, configPublica: cfgPorSlug };
  }

  const { data: clinica, error: clinicaError } = await supabase
    .from("clinicas")
    .select("id,nome,slug,ativa")
    .eq("slug", slugNormalizado)
    .eq("ativa", true)
    .maybeSingle();
  if (clinicaError) throw clinicaError;
  if (!clinica) return null;

  const { data: configPublica, error: cfgError } = await supabase
    .from("configuracoes_agendamento_online")
    .select("clinica_id,nome_publico,slug_publico,endereco_publico,telefone_publico,mensagem_confirmacao")
    .eq("clinica_id", clinica.id)
    .maybeSingle();
  if (cfgError) throw cfgError;
  return { clinica, configPublica };
}

async function carregarPerfilPublico(slug: string) {
  const contexto = await resolverClinica(slug);
  if (!contexto) return null;
  const { clinica, configPublica } = contexto;

  const [profRes, perfilRes, dispRes] = await Promise.all([
    supabase
      .from("equipe")
      .select("id,nome,tipo,conselho,regional,numero_registro,agendamento_online_ordem")
      .eq("clinica_id", clinica.id)
      .eq("ativo", true)
      .eq("aparece_na_agenda", true)
      .eq("agendamento_online_ativo", true)
      .order("agendamento_online_ordem", { ascending: true })
      .order("nome", { ascending: true }),
    supabase
      .from("agendamento_online_profissionais_config")
      .select("profissional_id,titulo_publico,apresentacao,formacao,foto_url,atende_convenios,convenios,local_atendimento")
      .eq("clinica_id", clinica.id),
    supabase
      .from("disponibilidade_agendamento_online")
      .select("profissional_id")
      .eq("clinica_id", clinica.id)
      .eq("ativo", true),
  ]);
  for (const r of [profRes, perfilRes, dispRes]) if (r.error) throw r.error;

  const perfis = new Map((perfilRes.data || []).map((p) => [String(p.profissional_id), p]));
  const comHorario = new Set((dispRes.data || []).map((d) => String(d.profissional_id)));

  const profissionais = (profRes.data || [])
    .filter((p) => comHorario.has(String(p.id)))
    .map((p) => {
      const perfil = perfis.get(String(p.id)) || {};
      const registro = [texto(p.conselho, 30), texto(p.regional, 30), texto(p.numero_registro, 40)]
        .filter(Boolean)
        .join(" ");
      return {
        id: texto(p.id, 120),
        nome: texto(p.nome, 120),
        tipo: texto(p.tipo || "Profissional", 80).replaceAll("_", " "),
        titulo_publico: texto(perfil.titulo_publico || "", 120),
        apresentacao: texto(perfil.apresentacao || "", 1200),
        formacao: texto(perfil.formacao || "", 1600),
        foto_url: texto(perfil.foto_url || "", 600),
        registro,
        atende_convenios: !!perfil.atende_convenios,
        convenios: perfil.atende_convenios ? listaTexto(perfil.convenios) : [],
        local_atendimento: texto(perfil.local_atendimento || "", 500),
      };
    });

  return {
    encontrado: true,
    api_slug: texto(clinica.slug, 80),
    link_slug: texto(configPublica?.slug_publico || clinica.slug, 80),
    clinica: {
      nome: texto(configPublica?.nome_publico || clinica.nome, 120),
      endereco: texto(configPublica?.endereco_publico || "", 500),
      telefone: texto(configPublica?.telefone_publico || "", 80),
    },
    mensagem_confirmacao: texto(configPublica?.mensagem_confirmacao || "", 2000),
    profissionais,
  };
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: cors(req) });
  if (req.method !== "GET") return resposta(req, { erro: "Método não permitido." }, 405);
  try {
    const url = new URL(req.url);
    const slug = texto(url.searchParams.get("clinica"), 80).toLowerCase();
    const perfil = await carregarPerfilPublico(slug);
    if (!perfil) return resposta(req, { encontrado: false }, 404);
    return resposta(req, perfil);
  } catch (error) {
    console.error("KineSys agendamento-publico-perfil:", error);
    return resposta(req, { erro: "Não foi possível carregar o perfil público da clínica." }, 500);
  }
});
