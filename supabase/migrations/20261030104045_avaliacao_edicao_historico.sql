-- Correções explícitas de avaliações. Não altera a janela das evoluções.
begin;
alter table public.avaliacoes add column if not exists revisao bigint not null default 1;
alter table public.auditoria_registros_clinicos add column if not exists motivo text;

create or replace function public.kinesys_versionar_avaliacao() returns trigger
language plpgsql security definer set search_path=public,pg_temp as $$
declare
 v_agora timestamptz:=clock_timestamp();
 v_perfil jsonb:=public.kinesys_perfil_sessao();
 v_edicao jsonb:=coalesce(nullif(current_setting('kinesys.avaliacao_edicao',true),''),'{}')::jsonb;
 v_ignorar text[]:=array['ultima_edicao_em','ultima_edicao_por_id','ultima_edicao_por_nome','revisao'];
begin
 if tg_op='INSERT' then
   new.revisao:=1;new.salvo_em:=v_agora;
   new.realizado_em:=coalesce(new.realizado_em,public.kinesys_try_timestamptz(new.data_hora_iso),v_agora);
   if new.realizado_em>v_agora+interval '5 minutes' then raise exception 'A data de realização não pode estar no futuro.';end if;
   new.edicao_limite_em:=new.realizado_em+interval '24 hours';
   new.ultima_edicao_em:=null;new.ultima_edicao_por_id:=null;new.ultima_edicao_por_nome:=null;
   new.profissional_nome:=coalesce(nullif(btrim(new.profissional_nome),''),nullif(btrim(new.realizado_por),''),'Profissional não identificado');
   return new;
 end if;
 if new.id is distinct from old.id or new.paciente_id is distinct from old.paciente_id or new.clinica_id is distinct from old.clinica_id then
   raise exception 'Não é permitido transferir uma avaliação entre pacientes ou clínicas.';
 end if;
 new.salvo_em:=old.salvo_em;new.edicao_limite_em:=old.edicao_limite_em;
 new.profissional_id:=old.profissional_id;new.profissional_nome:=old.profissional_nome;new.profissional_registro:=old.profissional_registro;
 new.revisao:=old.revisao;
 if (to_jsonb(new)-v_ignorar) is not distinct from (to_jsonb(old)-v_ignorar) then
   new.ultima_edicao_em:=old.ultima_edicao_em;new.ultima_edicao_por_id:=old.ultima_edicao_por_id;new.ultima_edicao_por_nome:=old.ultima_edicao_por_nome;
   return new;
 end if;
 if (old.edicao_limite_em is null or v_agora>old.edicao_limite_em) and not (
   coalesce(v_edicao->>'id','')=old.id and length(btrim(coalesce(v_edicao->>'motivo','')))>=5
   and v_perfil->>'tipo' in ('MASTER','MASTER_FEM','FISIOTERAPEUTA','PROFISSIONAL')
   and (v_perfil->>'clinica_id')::uuid=old.clinica_id
 ) then raise exception 'A janela de 24 horas terminou. Use Editar avaliação e informe o motivo da correção.';end if;
 if new.realizado_em>v_agora+interval '5 minutes' then raise exception 'A data de realização não pode estar no futuro.';end if;
 new.revisao:=old.revisao+1;new.ultima_edicao_em:=v_agora;
 new.ultima_edicao_por_id:=coalesce(v_perfil->>'id',new.ultima_edicao_por_id);
 new.ultima_edicao_por_nome:=coalesce(v_perfil->>'nome',new.ultima_edicao_por_nome,'Usuário não identificado');
 insert into public.auditoria_registros_clinicos(tabela,registro_id,paciente_id,clinica_id,alterado_em,alterado_por_id,alterado_por_nome,antes,depois,motivo)
 values('avaliacoes',old.id,old.paciente_id,old.clinica_id,v_agora,new.ultima_edicao_por_id,new.ultima_edicao_por_nome,to_jsonb(old),to_jsonb(new),nullif(btrim(v_edicao->>'motivo'),''));
 return new;
end $$;
revoke all on function public.kinesys_versionar_avaliacao() from public,anon,authenticated;
drop trigger if exists trg_kinesys_avaliacoes_24h on public.avaliacoes;
create trigger trg_kinesys_avaliacoes_24h before insert or update on public.avaliacoes for each row execute function public.kinesys_versionar_avaliacao();

create or replace function public.kinesys_editar_avaliacao(p_id text,p_paciente_id text,p_revisao bigint,p_dados jsonb,p_motivo text)
returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare
 v_perfil jsonb:=public.kinesys_perfil_sessao();
 v_av public.avaliacoes%rowtype;
 v_nova public.avaliacoes%rowtype;
 v_config text:=current_setting('kinesys.avaliacao_edicao',true);
begin
 if auth.uid() is null or v_perfil->>'tipo' is null or v_perfil->>'tipo' not in ('MASTER','MASTER_FEM','FISIOTERAPEUTA','PROFISSIONAL') or not public.kinesys_pode_operar('avaliacoes','UPDATE') then raise exception 'Acesso clínico não autorizado.';end if;
 select * into v_av from public.avaliacoes where id=p_id and paciente_id=p_paciente_id and clinica_id=(v_perfil->>'clinica_id')::uuid for update;
 if not found then raise exception 'Avaliação não encontrada nesta clínica e paciente.';end if;
 if p_revisao is null or p_revisao<>v_av.revisao then raise exception 'Esta avaliação foi alterada por outra pessoa. Reabra a avaliação antes de salvar; seu formulário permanece disponível.';end if;
 if length(btrim(coalesce(p_motivo,'')))<5 or length(p_motivo)>1000 then raise exception 'Informe o motivo da edição (5 a 1000 caracteres).';end if;
 if jsonb_typeof(p_dados) is distinct from 'object' or exists(select 1 from jsonb_object_keys(p_dados) k where k not in ('idade','profissao','esporte','comorbidades','cirurgias','medicamentos','eva_inicial','hma','mapeamento')) then raise exception 'Campos de edição inválidos.';end if;
 v_nova:=jsonb_populate_record(v_av,p_dados);
 if v_nova.eva_inicial is not null and v_nova.eva_inicial not between 0 and 10 then raise exception 'EVA deve estar entre 0 e 10.';end if;
 if jsonb_typeof(v_nova.mapeamento) is distinct from 'object' then raise exception 'Exame inválido.';end if;
 if length(coalesce(v_nova.mapeamento#>>'{clinicaEstruturada,diagnosticoProfissional}',''))>2000 then raise exception 'O diagnóstico deve ter até 2000 caracteres.';end if;
 -- IDs, autoria, agendamento e carimbos de realização são imutáveis nesta operação.
 perform set_config('kinesys.avaliacao_edicao',jsonb_build_object('id',p_id,'motivo',btrim(p_motivo))::text,true);
 update public.avaliacoes set idade=v_nova.idade,profissao=v_nova.profissao,esporte=v_nova.esporte,comorbidades=v_nova.comorbidades,cirurgias=v_nova.cirurgias,medicamentos=v_nova.medicamentos,eva_inicial=v_nova.eva_inicial,hma=v_nova.hma,mapeamento=v_nova.mapeamento where id=v_av.id returning * into v_nova;
 perform set_config('kinesys.avaliacao_edicao',coalesce(v_config,''),true);
 return to_jsonb(v_nova);
end $$;
revoke all on function public.kinesys_editar_avaliacao(text,text,bigint,jsonb,text) from public,anon,authenticated;
grant execute on function public.kinesys_editar_avaliacao(text,text,bigint,jsonb,text) to authenticated;

create or replace function public.kinesys_historico_avaliacao(p_id text,p_paciente_id text,p_pagina integer default 0)
returns setof public.auditoria_registros_clinicos language plpgsql stable security definer set search_path=public,pg_temp as $$
declare v_perfil jsonb:=public.kinesys_perfil_sessao();
begin
 if auth.uid() is null or v_perfil->>'tipo' is null or v_perfil->>'tipo' not in ('MASTER','MASTER_FEM','FISIOTERAPEUTA','PROFISSIONAL') or not public.kinesys_pode_operar('avaliacoes','SELECT') then raise exception 'Acesso clínico não autorizado.';end if;
 if p_pagina is null or p_pagina<0 or p_pagina>100000 then raise exception 'Página inválida.';end if;
 if not exists(select 1 from public.avaliacoes where id=p_id and paciente_id=p_paciente_id and clinica_id=(v_perfil->>'clinica_id')::uuid) then raise exception 'Avaliação não encontrada nesta clínica e paciente.';end if;
 return query select a.* from public.auditoria_registros_clinicos a where a.tabela='avaliacoes' and a.registro_id=p_id and a.paciente_id=p_paciente_id and a.clinica_id=(v_perfil->>'clinica_id')::uuid order by a.alterado_em desc,a.id desc limit 21 offset p_pagina*20;
end $$;
revoke all on function public.kinesys_historico_avaliacao(text,text,integer) from public,anon,authenticated;
grant execute on function public.kinesys_historico_avaliacao(text,text,integer) to authenticated;
create index if not exists idx_auditoria_avaliacao_historico on public.auditoria_registros_clinicos(clinica_id,registro_id,alterado_em desc,id desc) where tabela='avaliacoes';
commit;
