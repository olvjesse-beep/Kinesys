import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), {
  status,
  headers: { ...corsHeaders, 'Content-Type': 'application/json' },
});

const strongPassword = (password: string, minimum = 8) =>
  password.length >= minimum && /[a-z]/.test(password) && /[A-Z]/.test(password) && /\d/.test(password);

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (request.method !== 'POST') return json({ error: 'Método não permitido.' }, 405);

  try {
    const url = Deno.env.get('SUPABASE_URL');
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const authorization = request.headers.get('Authorization') || '';
    if (!url || !serviceKey || !authorization) return json({ error: 'Configuração de autenticação incompleta.' }, 401);

    const admin = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
    const token = authorization.replace(/^Bearer\s+/i, '');
    const { data: identity, error: identityError } = await admin.auth.getUser(token);
    if (identityError || !identity.user) return json({ error: 'Sessão inválida ou expirada.' }, 401);

    const body = await request.json();
    const solicitantePerfilId = String(body?.solicitante_perfil_id || '');
    const { data: caller, error: callerError } = await admin.from('equipe')
      .select('id,clinica_id,tipo,ativo,auth_user_id')
      .eq('id', solicitantePerfilId)
      .eq('auth_user_id', identity.user.id)
      .eq('ativo', true)
      .in('tipo', ['MASTER', 'MASTER_FEM'])
      .limit(1)
      .maybeSingle();
    if (callerError || !caller?.clinica_id) return json({ error: 'Somente administradores ativos podem gerenciar a equipe.' }, 403);

    const action = String(body?.action || 'create_profile');

    if (action === 'reset_password') {
      const targetProfileId = String(body?.target_profile_id || '');
      const newPassword = String(body?.new_password || '');
      if (!targetProfileId) return json({ error: 'Funcionário inválido.' }, 400);
      if (!strongPassword(newPassword, 12)) {
        return json({ error: 'A nova senha deve ter ao menos 12 caracteres, com letra maiúscula, minúscula e número.' }, 400);
      }

      const { data: target, error: targetError } = await admin.from('equipe')
        .select('id,nome,email,clinica_id,auth_user_id,ativo')
        .eq('id', targetProfileId)
        .eq('clinica_id', caller.clinica_id)
        .limit(1)
        .maybeSingle();
      if (targetError) throw targetError;
      if (!target) return json({ error: 'Funcionário não encontrado nesta clínica.' }, 404);
      if (target.ativo === false) return json({ error: 'Reative o funcionário antes de definir uma nova senha.' }, 409);
      if (!target.auth_user_id) return json({ error: 'Este funcionário ainda não possui uma conta de acesso vinculada.' }, 409);
      if (String(target.auth_user_id) === String(identity.user.id)) {
        return json({ error: 'Use a recuperação de conta para alterar a senha do administrador atualmente conectado.' }, 409);
      }

      const { data: memberships, error: membershipsError } = await admin.from('membros_clinicas')
        .select('clinica_id')
        .eq('auth_user_id', target.auth_user_id)
        .eq('ativo', true);
      if (membershipsError) throw membershipsError;
      const activeClinics = new Set((memberships || []).map((item) => String(item.clinica_id || '')).filter(Boolean));
      if (!activeClinics.has(String(caller.clinica_id))) return json({ error: 'A conta não possui vínculo ativo com esta clínica.' }, 403);
      if (activeClinics.size > 1) {
        return json({ error: 'Esta conta está vinculada a mais de uma clínica. Por segurança, utilize a recuperação individual por e-mail.' }, 409);
      }

      const { error: passwordError } = await admin.auth.admin.updateUserById(String(target.auth_user_id), { password: newPassword });
      if (passwordError) throw passwordError;

      const { error: sessionProfileError } = await admin.from('kinesys_sessoes_perfil')
        .delete()
        .eq('auth_user_id', target.auth_user_id);
      if (sessionProfileError) throw sessionProfileError;

      // A coluna senha é legado da versão pré-Supabase Auth e nunca deve receber a nova credencial.
      const { error: legacyPasswordError } = await admin.from('equipe')
        .update({ senha: null })
        .eq('auth_user_id', target.auth_user_id);
      if (legacyPasswordError) throw legacyPasswordError;

      console.info('cadastrar-equipe reset_password', { caller_profile_id: caller.id, target_profile_id: target.id });
      return json({ ok: true, perfil: { id: target.id, nome: target.nome, email: target.email } });
    }

    if (action !== 'create_profile') return json({ error: 'Ação não suportada.' }, 400);

    const email = String(body?.email || '').trim().toLowerCase();
    const nome = String(body?.nome || '').trim();
    const senha = String(body?.senha || '');
    const tipo = String(body?.tipo || '').trim().toUpperCase();
    if (!nome || !/^\S+@\S+\.\S+$/.test(email)) return json({ error: 'Nome e e-mail válidos são obrigatórios.' }, 400);
    if (!strongPassword(senha, 8)) {
      return json({ error: 'A senha deve ter ao menos 8 caracteres, com letra maiúscula, minúscula e número.' }, 400);
    }
    if (!['MASTER', 'SECRETARIA', 'FISIOTERAPEUTA', 'MEDICO', 'EDUCADOR_FISICO'].includes(tipo)) return json({ error: 'Nível de acesso inválido.' }, 400);

    const { data: duplicate, error: duplicateError } = await admin.from('equipe')
      .select('id').eq('clinica_id', caller.clinica_id).eq('email', email).eq('tipo', tipo).eq('ativo', true).limit(1);
    if (duplicateError) throw duplicateError;
    if (duplicate?.length) return json({ error: 'Já existe um perfil ativo com este e-mail e esta função.' }, 409);

    let authUserId = '';
    for (let page = 1; page <= 10 && !authUserId; page += 1) {
      const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 100 });
      if (error) throw error;
      authUserId = data.users.find((user) => String(user.email || '').toLowerCase() === email)?.id || '';
      if (data.users.length < 100) break;
    }
    let contaCriada = false;
    if (!authUserId) {
      const { data, error } = await admin.auth.admin.createUser({ email, password: senha, email_confirm: true, user_metadata: { nome } });
      if (error || !data.user) throw error || new Error('Não foi possível criar a conta de acesso.');
      authUserId = data.user.id;
      contaCriada = true;
    }

    const perfil = {
      id: crypto.randomUUID(), clinica_id: caller.clinica_id, auth_user_id: authUserId,
      nome, email, cpf: body.cpf || null, tipo, conselho: body.conselho || null,
      regional: body.regional || null, numero_registro: body.numero_registro || null,
      registro: body.registro || null, aparece_na_agenda: !!body.aparece_na_agenda,
      idade: body.idade || null, endereco: body.endereco || null, ativo: true,
    };
    const { data: inserted, error: insertError } = await admin.from('equipe').insert(perfil).select('id,nome,email,tipo').single();
    if (insertError) {
      if (contaCriada) await admin.auth.admin.deleteUser(authUserId);
      throw insertError;
    }

    const { data: membership, error: membershipReadError } = await admin.from('membros_clinicas')
      .select('clinica_id,auth_user_id,ativo')
      .eq('clinica_id', caller.clinica_id)
      .eq('auth_user_id', authUserId)
      .maybeSingle();
    if (membershipReadError) {
      await admin.from('equipe').delete().eq('id', perfil.id);
      if (contaCriada) await admin.auth.admin.deleteUser(authUserId);
      throw membershipReadError;
    }

    const membershipResult = membership
      ? await admin.from('membros_clinicas')
          .update({ ativo: true })
          .eq('clinica_id', caller.clinica_id)
          .eq('auth_user_id', authUserId)
      : await admin.from('membros_clinicas').insert({
          clinica_id: caller.clinica_id,
          auth_user_id: authUserId,
          equipe_id: perfil.id,
          papel: tipo,
          ativo: true,
        });
    if (membershipResult.error) {
      await admin.from('equipe').delete().eq('id', perfil.id);
      if (contaCriada) await admin.auth.admin.deleteUser(authUserId);
      throw membershipResult.error;
    }

    return json({ perfil: inserted, conta_criada: contaCriada });
  } catch (error) {
    console.error('cadastrar-equipe', error);
    return json({ error: error instanceof Error ? error.message : 'Não foi possível gerenciar o usuário.' }, 400);
  }
});
