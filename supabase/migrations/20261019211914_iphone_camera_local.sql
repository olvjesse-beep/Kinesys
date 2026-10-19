-- Only thumbnails and short-lived WebRTC signaling. Never original image bytes.
create table public.midias_camera_sessoes (
 id uuid primary key default gen_random_uuid(),
 clinica_id uuid not null references public.clinicas(id),
 paciente_id text not null references public.pacientes(id) on delete cascade,
 owner_id uuid not null default auth.uid(),
 perfil_id text not null,
 tipo text not null check (tipo in ('avaliacao','evolucao','postura','ferida','edema','exame','termo','identificacao','guia','documento','outro','outro_admin')),
 offer jsonb not null check (octet_length(offer::text)<=100000 and offer->>'type'='offer'),
 answer jsonb check (octet_length(answer::text)<=100000 and answer->>'type'='answer'),
 criado_em timestamptz not null default now(),
 expira_em timestamptz not null default (now()+interval '10 minutes'),
 concluida_em timestamptz,
 check (expira_em>criado_em and expira_em<=criado_em+interval '10 minutes')
);
create index midias_camera_owner_idx on public.midias_camera_sessoes(owner_id,expira_em);
alter table public.midias_camera_sessoes enable row level security;
revoke all on public.midias_camera_sessoes from public,anon,authenticated;
grant select,delete on public.midias_camera_sessoes to authenticated;
grant insert(id,clinica_id,paciente_id,perfil_id,tipo,offer) on public.midias_camera_sessoes to authenticated;
grant update(answer,concluida_em) on public.midias_camera_sessoes to authenticated;
create policy camera_own_read on public.midias_camera_sessoes for select to authenticated using (
 owner_id=(select auth.uid()) and clinica_id=(select public.kinesys_current_clinica_id())
 and perfil_id=(select public.kinesys_perfil_sessao()->>'id')
);
create policy camera_own_create on public.midias_camera_sessoes for insert to authenticated with check (
 owner_id=(select auth.uid()) and clinica_id=(select public.kinesys_current_clinica_id())
 and perfil_id=(select public.kinesys_perfil_sessao()->>'id')
 and exists(select 1 from public.pacientes p where p.id=paciente_id and p.clinica_id=midias_camera_sessoes.clinica_id)
 and ((select public.kinesys_perfil_sessao()->>'tipo') in ('MASTER','ADMIN','ADMINISTRADOR','FISIOTERAPEUTA')
 or ((select public.kinesys_perfil_sessao()->>'tipo')='SECRETARIA' and tipo in ('exame','termo','identificacao','guia','documento','outro_admin')))
);
create policy camera_own_answer on public.midias_camera_sessoes for update to authenticated using (
 owner_id=(select auth.uid()) and clinica_id=(select public.kinesys_current_clinica_id())
 and perfil_id=(select public.kinesys_perfil_sessao()->>'id') and expira_em>now() and concluida_em is null
) with check (owner_id=(select auth.uid()) and clinica_id=(select public.kinesys_current_clinica_id()) and perfil_id=(select public.kinesys_perfil_sessao()->>'id'));
create policy camera_own_cleanup on public.midias_camera_sessoes for delete to authenticated using (
 owner_id=(select auth.uid()) and clinica_id=(select public.kinesys_current_clinica_id())
 and perfil_id=(select public.kinesys_perfil_sessao()->>'id')
);

create table public.midias_miniaturas (
 id uuid primary key,
 clinica_id uuid not null references public.clinicas(id),
 paciente_id text not null references public.pacientes(id) on delete cascade,
 profissional_id text not null,
 profissional_nome text not null,
 tipo text not null check (tipo in ('avaliacao','evolucao','postura','ferida','edema','exame','termo','identificacao','guia','documento','outro','outro_admin')),
 data_hora timestamptz not null default now(),
 arquivo_nome text not null check(length(arquivo_nome)<=200),
 caminho_relativo text not null check(length(caminho_relativo)<=500 and caminho_relativo !~ '(^/|\.\.|:)'),
 tamanho_bytes integer not null check(tamanho_bytes between 1 and 26214400),
 mime_type text not null check(mime_type in ('image/jpeg','image/png','image/webp')),
 sha256 text not null check(sha256 ~ '^[a-f0-9]{64}$'),
 miniatura text not null check(length(miniatura)<=90000 and miniatura ~ '^data:image/jpeg;base64,[A-Za-z0-9+/=]+$'),
 largura integer not null check(largura between 1 and 480),
 altura integer not null check(altura between 1 and 480),
 estacao text not null check(length(estacao)<=200),
 criado_por uuid not null default auth.uid(),
 criado_em timestamptz not null default now()
);
create index midias_miniaturas_paciente_idx on public.midias_miniaturas(clinica_id,paciente_id,data_hora desc);
alter table public.midias_miniaturas enable row level security;
revoke all on public.midias_miniaturas from public,anon,authenticated;
grant select,insert on public.midias_miniaturas to authenticated;
create policy miniaturas_read on public.midias_miniaturas for select to authenticated using (
 clinica_id=(select public.kinesys_current_clinica_id()) and (
 (select public.kinesys_perfil_sessao()->>'tipo') in ('MASTER','ADMIN','ADMINISTRADOR','FISIOTERAPEUTA')
 or ((select public.kinesys_perfil_sessao()->>'tipo')='SECRETARIA' and tipo in ('exame','termo','identificacao','guia','documento','outro_admin')))
);
create policy miniaturas_create on public.midias_miniaturas for insert to authenticated with check (
 criado_por=(select auth.uid()) and clinica_id=(select public.kinesys_current_clinica_id())
 and profissional_id=(select public.kinesys_perfil_sessao()->>'id')
 and exists(select 1 from public.pacientes p where p.id=paciente_id and p.clinica_id=midias_miniaturas.clinica_id)
 and ((select public.kinesys_perfil_sessao()->>'tipo') in ('MASTER','ADMIN','ADMINISTRADOR','FISIOTERAPEUTA')
 or ((select public.kinesys_perfil_sessao()->>'tipo')='SECRETARIA' and tipo in ('exame','termo','identificacao','guia','documento','outro_admin')))
);
comment on table public.midias_miniaturas is 'Miniaturas JPEG até 480px. Originais somente na pasta autorizada no computador; nunca nesta tabela.';
comment on table public.midias_camera_sessoes is 'Sinalização autenticada WebRTC; validade máxima 10 minutos. Sem conteúdo de fotos.';
