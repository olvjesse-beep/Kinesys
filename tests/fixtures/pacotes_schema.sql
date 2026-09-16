create function public.kinesys_current_clinica_id() returns uuid language sql as $$ select nullif(current_setting('test.clinica',true),'')::uuid $$;
create role authenticated; create table public.clinicas(id uuid primary key);
create table public.agendamentos (id uuid default gen_random_uuid(),
paciente_id text,
profissional_id text,
procedimento_id uuid,
data date,
hora_inicio time without time zone,
hora_fim time without time zone,
status text default 'agendado'::text,
observacoes text,
criado_por text,
criado_em timestamp with time zone default now(),
lembrete_enviado_em timestamp with time zone,
token_confirmacao text default replace((gen_random_uuid())::text, '-'::text, ''::text),
confirmado_pelo_paciente boolean,
resposta_em timestamp with time zone,
plano_id uuid,
status_observacao text,
status_atualizado_em timestamp with time zone,
status_atualizado_por text,
chegada_em timestamp with time zone,
atendido_em timestamp with time zone,
horario_extraordinario boolean default false,
horario_extraordinario_confirmado_por text,
horario_extraordinario_confirmado_em timestamp with time zone,
status_atualizado_por_id text,
status_atualizado_por_tipo text,
clinica_id uuid default kinesys_current_clinica_id(),
origem text default 'interno'::text, primary key(id));
create table public.cobrancas_agendamento (id uuid default gen_random_uuid(),
clinica_id uuid,
agendamento_id uuid,
paciente_id text,
procedimento_id uuid,
profissional_id text,
plano_id uuid,
paciente_nome text,
procedimento_nome text,
profissional_nome text,
data_agendamento date,
valor_original numeric default 0,
desconto_tipo text default 'nenhum'::text,
desconto_valor numeric default 0,
valor_devido numeric generated always as (round((valor_original - desconto_valor), 2)) stored,
origem text default 'avulso'::text,
criado_por text,
criado_em timestamp with time zone default now(),
atualizado_em timestamp with time zone default now(),
baixa_tipo text,
baixa_motivo text,
baixada_em timestamp with time zone,
baixada_por text, primary key(id));
create table public.equipe (id text,
nome text,
cpf text,
registro text,
idade text,
endereco text,
email text,
senha text,
tipo text,
conselho text,
regional text,
numero_registro text,
ativo boolean default true,
desativado_em timestamp with time zone,
desativado_por text,
aparece_na_agenda boolean default false,
auth_user_id uuid,
clinica_id uuid default kinesys_current_clinica_id(),
agendamento_online_ativo boolean default false,
agendamento_online_ordem integer default 0, primary key(id));
create table public.pacientes (id text,
nome text,
cpf text,
nascimento text,
telefone text,
profissao text,
sexo text,
estado_civil text,
cep text,
endereco text,
data_cadastro text,
cadastrado_por text,
timestamp_cadastro bigint,
dependente boolean default false,
responsavel_nome text default ''::text,
responsavel_parentesco text default ''::text,
responsavel_telefone text default ''::text,
clinica_id uuid default kinesys_current_clinica_id(),
origem_cadastro text default 'interno'::text,
cadastro_validado boolean default true, primary key(id));
create table public.pagamentos (id uuid default gen_random_uuid(),
plano_id uuid,
paciente_id text,
valor numeric,
forma_pagamento text,
data_pagamento date default CURRENT_DATE,
observacoes text,
criado_por text,
criado_em timestamp with time zone default now(),
operacao_id text,
clinica_id uuid default kinesys_current_clinica_id(),
tipo text default 'recebimento'::text,
estorno_de uuid,
motivo_estorno text,
estornado_em timestamp with time zone,
estornado_por text,
composicao_formas jsonb default '[]'::jsonb,
agendamento_id uuid,
cobranca_agendamento_id uuid,
parcelas integer default 1, primary key(id));
create table public.planos_atendimento (id uuid default gen_random_uuid(),
paciente_id text,
procedimento_id uuid,
nome text,
sessoes_contratadas integer,
valor_tabela numeric default 0,
desconto_valor numeric default 0,
valor_final numeric default 0,
forma_pagamento_prevista text,
parcelas integer default 1,
observacoes text,
status text default 'ativo'::text,
criado_por text,
criado_em timestamp with time zone default now(),
encerrado_em timestamp with time zone,
operacao_id text,
encerramento_automatico boolean default false,
desconto_pacote numeric default 0,
desconto_cortesia numeric default 0,
clinica_id uuid default kinesys_current_clinica_id(), primary key(id));
create table public.procedimentos (id uuid default gen_random_uuid(),
nome text,
duracao_minutos integer,
valor numeric,
profissionais_ids text[] default '{}'::text[],
ativo boolean default true,
criado_em timestamp with time zone default now(),
clinica_id uuid default kinesys_current_clinica_id(),
agendamento_online_ativo boolean default false, primary key(id));
alter table public.cobrancas_agendamento add unique(clinica_id,agendamento_id);

create function public.kinesys_perfil_sessao() returns jsonb language sql as $$ select jsonb_build_object('clinica_id',current_setting('test.clinica',true),'tipo',current_setting('test.papel',true),'nome','Teste') $$;
CREATE OR REPLACE FUNCTION public.kinesys_validar_pagamento_plano_paciente()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$

declare

    v_paciente_id text;

begin

    select paciente_id

      into v_paciente_id

      from public.planos_atendimento

     where id = new.plano_id;



    if v_paciente_id is null then

        raise exception 'KineSys Financeiro: plano % não encontrado.', new.plano_id;

    end if;



    if new.paciente_id is distinct from v_paciente_id then

        raise exception 'KineSys Financeiro: o pagamento não pertence ao mesmo paciente do plano.';

    end if;



    return new;

end;

$function$
;
CREATE OR REPLACE FUNCTION public.kinesys_validar_agendamento_plano()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$

declare

    v_paciente_id text;

    v_procedimento_id uuid;

    v_status text;

begin

    if new.plano_id is null then

        return new;

    end if;



    select paciente_id, procedimento_id, status

      into v_paciente_id, v_procedimento_id, v_status

      from public.planos_atendimento

     where id = new.plano_id;



    if v_paciente_id is null then

        raise exception 'KineSys Agenda: pacote % não encontrado.', new.plano_id;

    end if;



    if new.paciente_id is distinct from v_paciente_id then

        raise exception 'KineSys Agenda: o pacote selecionado pertence a outro paciente.';

    end if;



    if v_procedimento_id is not null

       and new.procedimento_id is distinct from v_procedimento_id then

        raise exception 'KineSys Agenda: o pacote selecionado é específico para outro procedimento.';

    end if;



    -- Só impede NOVO vínculo a um plano encerrado/cancelado. Atualizar o status

    -- de uma sessão antiga já vinculada continua permitido.

    if tg_op = 'INSERT' then

        if v_status <> 'ativo' then

            raise exception 'KineSys Agenda: o pacote selecionado não está ativo.';

        end if;

    elsif new.plano_id is distinct from old.plano_id then

        if v_status <> 'ativo' then

            raise exception 'KineSys Agenda: o pacote selecionado não está ativo.';

        end if;

    end if;



    return new;

end;

$function$
;
CREATE OR REPLACE FUNCTION public.kinesys_validar_credito_plano_paciente()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$

declare v_paciente text;

begin

    select paciente_id into v_paciente from public.planos_atendimento where id=new.plano_id;

    if v_paciente is null then raise exception 'KineSys Crédito: plano % não encontrado.',new.plano_id; end if;

    if new.paciente_id is distinct from v_paciente then raise exception 'KineSys Crédito: plano pertence a outro paciente.'; end if;

    return new;

end;

$function$
;
CREATE OR REPLACE FUNCTION public.kinesys_recalcular_encerramento_plano()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$

declare

    v_plano_ids text[] := array[]::text[];

    v_plano_id text;

    v_contratadas integer;

    v_consumidas integer;

    v_status text;

    v_auto boolean;

begin

    if tg_op = 'DELETE' then

        if old.plano_id is not null then v_plano_ids := array_append(v_plano_ids, old.plano_id::text); end if;

    elsif tg_op = 'INSERT' then

        if new.plano_id is not null then v_plano_ids := array_append(v_plano_ids, new.plano_id::text); end if;

    else

        if old.plano_id is not null then v_plano_ids := array_append(v_plano_ids, old.plano_id::text); end if;

        if new.plano_id is not null and new.plano_id::text <> coalesce(old.plano_id::text, '') then

            v_plano_ids := array_append(v_plano_ids, new.plano_id::text);

        end if;

    end if;



    foreach v_plano_id in array v_plano_ids loop

        select p.sessoes_contratadas, p.status, coalesce(p.encerramento_automatico, false)

          into v_contratadas, v_status, v_auto

          from public.planos_atendimento p

         where p.id::text = v_plano_id

         limit 1;



        if not found then continue; end if;



        select count(*)

          into v_consumidas

          from public.agendamentos a

         where a.plano_id::text = v_plano_id

           and a.status in ('atendido','falta_nao_justificada','concluido');



        if v_consumidas >= coalesce(v_contratadas, 0) and v_status = 'ativo' then

            update public.planos_atendimento

               set status = 'concluido',

                   encerrado_em = coalesce(encerrado_em, now()),

                   encerramento_automatico = true

             where id::text = v_plano_id

               and status = 'ativo';

        elsif v_consumidas < coalesce(v_contratadas, 0) and v_status = 'concluido' and v_auto = true then

            update public.planos_atendimento

               set status = 'ativo',

                   encerrado_em = null,

                   encerramento_automatico = false

             where id::text = v_plano_id

               and status = 'concluido'

               and coalesce(encerramento_automatico, false) = true;

        end if;

    end loop;



    return null;

end;

$function$
;
CREATE OR REPLACE FUNCTION public.kinesys_baixar_cobranca_agendamento(p_agendamento_id uuid, p_tipo text, p_motivo text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare
  perfil jsonb:=public.kinesys_perfil_sessao(); cid uuid:=(perfil->>'clinica_id')::uuid; papel text:=perfil->>'tipo';
  c public.cobrancas_agendamento%rowtype; pl public.planos_atendimento%rowtype;
  qtd_pagamentos integer:=0; tipo text:=lower(btrim(coalesce(p_tipo,''))); motivo text:=nullif(btrim(coalesce(p_motivo,'')),'');
  desconto_tipo_novo text;
begin
  if cid is null or papel not in ('MASTER','MASTER_FEM') then raise exception 'Somente administradores podem remover pendências financeiras' using errcode='42501'; end if;
  if tipo not in ('cortesia','migracao_pacote','lancamento_incorreto','outro') then raise exception 'Tipo de baixa inválido'; end if;
  if motivo is null or length(motivo)<3 then raise exception 'Informe o motivo da baixa'; end if;

  -- A cobrança é o registro financeiro histórico e deve ser a fonte de verdade da baixa.
  -- Não exigimos que o agendamento ainda exista ou mantenha o mesmo estado/plano.
  select * into c
    from public.cobrancas_agendamento
   where clinica_id=cid and agendamento_id=p_agendamento_id
   for update;

  -- Compatibilidade: se a cobrança ainda não foi materializada, só então tentamos
  -- prepará-la a partir de um agendamento atualmente válido.
  if not found then
    perform public.kinesys_preparar_cobranca_agendamento(p_agendamento_id);
    select * into c
      from public.cobrancas_agendamento
     where clinica_id=cid and agendamento_id=p_agendamento_id
     for update;
  end if;

  if not found then raise exception 'Cobrança não encontrada nesta clínica'; end if;
  if c.baixada_em is not null then
    return jsonb_build_object('ok',true,'repetido',true,'agendamento_id',p_agendamento_id,'cobranca_id',c.id,'baixada_em',c.baixada_em);
  end if;
  if c.origem='plano' then raise exception 'Pendências de pacote devem ser ajustadas no próprio plano; esta ação é exclusiva para cobrança unitária'; end if;

  -- Verifica pagamentos pela cobrança histórica, sem depender da existência do agendamento.
  select count(*) into qtd_pagamentos
    from public.pagamentos
   where clinica_id=cid
     and (cobranca_agendamento_id=c.id or (cobranca_agendamento_id is null and agendamento_id=p_agendamento_id));
  if qtd_pagamentos>0 then raise exception 'Há pagamento lançado neste atendimento. Estorne o recebimento antes de remover a pendência'; end if;

  desconto_tipo_novo:=case when tipo='migracao_pacote' then 'pacote' else 'cortesia' end;
  update public.cobrancas_agendamento
     set desconto_valor=valor_original,
         desconto_tipo=desconto_tipo_novo,
         baixa_tipo=tipo,
         baixa_motivo=motivo,
         baixada_em=now(),
         baixada_por=coalesce(perfil->>'nome','Administrador'),
         atualizado_em=now()
   where id=c.id
   returning * into c;

  -- Só encerra o plano unitário automático originalmente criado para esta cobrança.
  -- Um pacote atual do paciente nunca é alterado por esta baixa histórica.
  if c.plano_id is not null then
    select * into pl from public.planos_atendimento where id=c.plano_id and clinica_id=cid for update;
    if found and coalesce(pl.sessoes_contratadas,1)=1 and pl.operacao_id='unitario-agenda-'||p_agendamento_id::text then
      update public.planos_atendimento
         set desconto_valor=valor_tabela,
             desconto_pacote=case when tipo='migracao_pacote' then valor_tabela else 0 end,
             desconto_cortesia=case when tipo='cortesia' then valor_tabela else 0 end,
             valor_final=0,
             status='concluido',
             encerrado_em=coalesce(encerrado_em,now()),
             observacoes=concat_ws(E'\n',nullif(observacoes,''),'Baixa financeira ['||tipo||']: '||motivo)
       where id=pl.id;
    end if;
  end if;

  return jsonb_build_object('ok',true,'agendamento_id',p_agendamento_id,'cobranca_id',c.id,'baixa_tipo',tipo,'baixa_motivo',motivo,'valor_pendente',0);
end $function$
;
CREATE OR REPLACE FUNCTION public.kinesys_preparar_cobranca_agendamento(p_agendamento_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare
  perfil jsonb:=public.kinesys_perfil_sessao(); cid uuid:=(perfil->>'clinica_id')::uuid; papel text:=perfil->>'tipo';
  a public.agendamentos%rowtype; p public.procedimentos%rowtype; pl public.planos_atendimento%rowtype;
  c public.cobrancas_agendamento%rowtype; v_original numeric(12,2):=0; v_desconto numeric(12,2):=0; v_origem text:='avulso';
  v_plano_id uuid; v_operacao text;
begin
  if cid is null or papel not in ('MASTER','MASTER_FEM') then raise exception 'Somente administradores podem preparar cobranças' using errcode='42501'; end if;
  select * into a from public.agendamentos where id=p_agendamento_id and clinica_id=cid for update;
  if not found or a.status='cancelado' then raise exception 'Agendamento não encontrado ou cancelado'; end if;

  select * into c from public.cobrancas_agendamento where clinica_id=cid and agendamento_id=a.id;
  if found and c.baixada_em is not null then
    return to_jsonb(c);
  end if;

  select * into p from public.procedimentos where id=a.procedimento_id and clinica_id=cid;
  if not found then raise exception 'Serviço do agendamento não encontrado'; end if;
  v_plano_id:=a.plano_id;
  if v_plano_id is not null then
    select * into pl from public.planos_atendimento where id=v_plano_id and clinica_id=cid;
    if found then
      v_origem:=case when coalesce(pl.sessoes_contratadas,1)=1 then 'unitario' else 'plano' end;
      v_original:=round(coalesce(pl.valor_tabela,0)/greatest(coalesce(pl.sessoes_contratadas,1),1),2);
      v_desconto:=round(coalesce(pl.desconto_valor,0)/greatest(coalesce(pl.sessoes_contratadas,1),1),2);
    end if;
  end if;
  if v_plano_id is null then
    v_original:=round(coalesce(p.valor,0),2); v_desconto:=0; v_origem:='unitario';
    v_operacao:='unitario-agenda-'||a.id::text;
    select id into v_plano_id from public.planos_atendimento where clinica_id=cid and operacao_id=v_operacao limit 1;
    if v_plano_id is null then
      insert into public.planos_atendimento(id,paciente_id,procedimento_id,nome,sessoes_contratadas,valor_tabela,desconto_valor,valor_final,
        forma_pagamento_prevista,parcelas,observacoes,status,criado_por,criado_em,operacao_id,desconto_pacote,desconto_cortesia,clinica_id)
      values(gen_random_uuid(),a.paciente_id::text,a.procedimento_id,'Atendimento unitário — '||p.nome,1,v_original,0,v_original,
        'PIX',1,'Criado automaticamente pelo agendamento '||a.id::text,'ativo',coalesce(perfil->>'nome','Administrador'),now(),v_operacao,0,0,cid)
      returning id into v_plano_id;
    end if;
    update public.agendamentos set plano_id=v_plano_id where id=a.id and plano_id is null;
  end if;
  insert into public.cobrancas_agendamento(clinica_id,agendamento_id,paciente_id,procedimento_id,profissional_id,plano_id,
    paciente_nome,procedimento_nome,profissional_nome,data_agendamento,valor_original,desconto_tipo,desconto_valor,origem,criado_por)
  select cid,a.id,a.paciente_id::text,a.procedimento_id,a.profissional_id::text,v_plano_id,
    pac.nome,p.nome,e.nome,a.data,v_original,case when v_desconto>0 then case when v_origem='plano' then 'pacote' else 'cortesia' end else 'nenhum' end,
    v_desconto,v_origem,coalesce(perfil->>'nome','Administrador')
  from public.pacientes pac left join public.equipe e on e.id::text=a.profissional_id::text and e.clinica_id=cid
  where pac.id::text=a.paciente_id::text and pac.clinica_id=cid
  on conflict (clinica_id,agendamento_id) do nothing;
  select * into c from public.cobrancas_agendamento where clinica_id=cid and agendamento_id=a.id;
  return to_jsonb(c);
end $function$
;
create trigger trg_kinesys_agendamento_plano before insert or update on public.agendamentos for each row execute function public.kinesys_validar_agendamento_plano();
create trigger trg_kinesys_encerrar_plano_agendamento after insert or delete or update of status,plano_id on public.agendamentos for each row execute function public.kinesys_recalcular_encerramento_plano();
CREATE OR REPLACE FUNCTION public.kinesys_estornar_pagamento(p_pagamento_id uuid, p_motivo text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$

DECLARE perfil jsonb:=public.kinesys_perfil_sessao(); cid uuid:=(perfil->>'clinica_id')::uuid; papel text:=perfil->>'tipo'; original public.pagamentos%ROWTYPE; novo_id uuid:=gen_random_uuid(); motivo text:=nullif(btrim(coalesce(p_motivo,'')),'');

BEGIN

  IF cid IS NULL OR papel NOT IN ('MASTER','MASTER_FEM') THEN RAISE EXCEPTION 'Somente administradores podem estornar recebimentos' USING ERRCODE='42501'; END IF;

  IF motivo IS NULL OR length(motivo)<3 THEN RAISE EXCEPTION 'Informe o motivo do estorno'; END IF;

  SELECT * INTO original FROM public.pagamentos WHERE id=p_pagamento_id AND clinica_id=cid AND tipo='recebimento' FOR UPDATE;

  IF NOT FOUND THEN RAISE EXCEPTION 'Recebimento não encontrado nesta clínica'; END IF;

  IF original.estornado_em IS NOT NULL OR EXISTS(SELECT 1 FROM public.pagamentos WHERE estorno_de=original.id) THEN RAISE EXCEPTION 'Este recebimento já foi estornado'; END IF;

  UPDATE public.pagamentos SET estornado_em=now(),estornado_por=coalesce(perfil->>'nome','Administrador'),motivo_estorno=motivo WHERE id=original.id;

  INSERT INTO public.pagamentos(id,plano_id,paciente_id,valor,forma_pagamento,data_pagamento,observacoes,criado_por,criado_em,operacao_id,clinica_id,tipo,estorno_de,motivo_estorno,estornado_em,estornado_por,composicao_formas,agendamento_id,cobranca_agendamento_id,parcelas)

  VALUES(novo_id,original.plano_id,original.paciente_id,-original.valor,'Estorno',current_date,'Estorno: '||motivo,coalesce(perfil->>'nome','Administrador'),now(),'estorno-'||original.id::text,cid,'estorno',original.id,motivo,now(),coalesce(perfil->>'nome','Administrador'),'[]'::jsonb,original.agendamento_id,original.cobranca_agendamento_id,original.parcelas);

  RETURN jsonb_build_object('ok',true,'pagamento_id',original.id,'estorno_id',novo_id,'valor',original.valor);

END $function$
;
