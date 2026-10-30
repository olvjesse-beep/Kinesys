// Banco isolado e pacientes sintéticos. Nenhuma conexão de produção.
import fs from 'node:fs';
import assert from 'node:assert/strict';
const {PGlite}=await import(process.env.PGLITE_MODULE||'@electric-sql/pglite');
const db=new PGlite();
try{
 await db.exec(`create role anon;create role authenticated;create schema auth;
 create function auth.uid() returns uuid language sql as $$select nullif(current_setting('test.uid',true),'')::uuid$$;
 create function kinesys_perfil_sessao() returns jsonb language sql as $$select jsonb_build_object('id','prof-teste','nome','Profissional sintético','tipo',current_setting('test.papel',true),'clinica_id',current_setting('test.clinica',true))$$;
 create function kinesys_pode_operar(text,text) returns boolean language sql as $$select current_setting('test.papel',true) in ('MASTER','FISIOTERAPEUTA')$$;
 create function kinesys_try_timestamptz(text) returns timestamptz language sql as $$select nullif($1,'')::timestamptz$$;
 create table avaliacoes(id text primary key,paciente_id text,clinica_id uuid,agendamento_id uuid,data_avaliacao text,data_hora_iso text,realizado_por text,profissional_id text,profissional_nome text,profissional_registro text,idade text,profissao text,esporte text,comorbidades jsonb,cirurgias jsonb,medicamentos jsonb,eva_inicial int,hma text,mapeamento jsonb,tipo text,realizado_em timestamptz,salvo_em timestamptz,edicao_limite_em timestamptz,ultima_edicao_em timestamptz,ultima_edicao_por_id text,ultima_edicao_por_nome text);
 create table auditoria_registros_clinicos(id bigserial primary key,tabela text,registro_id text,paciente_id text,clinica_id uuid,alterado_em timestamptz,alterado_por_id text,alterado_por_nome text,antes jsonb,depois jsonb);
 alter default privileges grant execute on functions to anon;
 set test.uid='11111111-1111-4111-8111-111111111111';set test.papel='FISIOTERAPEUTA';set test.clinica='22222222-2222-4222-8222-222222222222';`);
 const migration=fs.readdirSync('supabase/migrations').find(p=>p.endsWith('_avaliacao_edicao_historico.sql'));
 await db.exec(fs.readFileSync('supabase/migrations/'+migration,'utf8'));
 const priv=(await db.query("select has_function_privilege('anon','kinesys_editar_avaliacao(text,text,bigint,jsonb,text)','EXECUTE') e,has_function_privilege('anon','kinesys_historico_avaliacao(text,text,integer)','EXECUTE') h")).rows[0];assert.equal(priv.e,false);assert.equal(priv.h,false);
 await db.exec(`insert into avaliacoes(id,paciente_id,clinica_id,profissional_id,profissional_nome,profissional_registro,realizado_por,hma,realizado_em,data_avaliacao,data_hora_iso,mapeamento) values
 ('a1','p1','22222222-2222-4222-8222-222222222222','autor-original','Autora original','TESTE','Autora original','HMA original',now()-interval '10 days','2026-10-01','2026-10-01T10:00:00Z','{"status":"finalizada","clinicaEstruturada":{"desconhecido":{"preservar":true}}}'),
 ('a2','p1','22222222-2222-4222-8222-222222222222','autor-original','Autora original','TESTE','Autora original','Segunda avaliação',now()-interval '9 days','2026-10-02','2026-10-02T10:00:00Z','{}');`);
 const row=async id=>(await db.query('select to_jsonb(a) r from avaliacoes a where id=$1',[id])).rows[0].r;
 const original=await row('a1'),other=await row('a2');
 const edit=(dados={},versao=1,id='a1',pid='p1',motivo='Correção de diagnóstico')=>db.query('select kinesys_editar_avaliacao($1,$2,$3,$4,$5) r',[id,pid,versao,dados,motivo]);
 await assert.rejects(db.exec("update avaliacoes set hma='Direto' where id='a1'"),/24 horas/);
 await assert.rejects(edit({hma:'x'},1,'a1','outro'),/não encontrada/);
 await assert.rejects(edit({paciente_id:'outro'}),/inválidos/);
 await assert.rejects(edit({},1,'a1','p1',''),/motivo/);
 const updated=(await edit({hma:'História revisada',eva_inicial:6,mapeamento:{...original.mapeamento,clinicaEstruturada:{...original.mapeamento.clinicaEstruturada,diagnosticoProfissional:'Prótese total de quadril esquerdo'}}})).rows[0].r;
 assert.equal(updated.revisao,2);assert.equal(updated.profissional_id,original.profissional_id);assert.equal(updated.profissional_nome,original.profissional_nome);assert.equal(updated.salvo_em,original.salvo_em);assert.equal(updated.realizado_em,original.realizado_em);assert.equal(updated.data_avaliacao,original.data_avaliacao);assert.equal(updated.ultima_edicao_por_id,'prof-teste');assert.equal(updated.mapeamento.clinicaEstruturada.desconhecido.preservar,true);
 assert.deepEqual(await row('a2'),other,'a outra avaliação não é regravada');
 let history=(await db.query("select * from kinesys_historico_avaliacao('a1','p1',0)")).rows;
 assert.equal(history.length,1);assert.equal(history[0].antes.hma,original.hma);assert.equal(history[0].depois.hma,'História revisada');assert.equal(history[0].motivo,'Correção de diagnóstico');assert.equal(history[0].alterado_por_nome,'Profissional sintético');
 await assert.rejects(edit({hma:'Concorrente'},1),/outra pessoa/);assert.equal((await row('a1')).hma,'História revisada');
 await assert.rejects(edit({eva_inicial:11},2),/EVA/);assert.equal((await row('a1')).revisao,2);
 // Falha de auditoria precisa desfazer também a edição e a revisão.
 await db.exec("create function falha_auditoria() returns trigger language plpgsql as $$begin raise exception 'Falha simulada';end$$;create trigger falha_auditoria before insert on auditoria_registros_clinicos for each row execute function falha_auditoria();");
 await assert.rejects(edit({hma:'Não pode persistir'},2),/Falha simulada/);assert.equal((await row('a1')).hma,'História revisada');assert.equal((await row('a1')).revisao,2);await db.exec('drop trigger falha_auditoria on auditoria_registros_clinicos');
 for(const papel of ['SECRETARIA','']){await db.query("select set_config('test.papel',$1,false)",[papel]);await assert.rejects(edit({},2),/não autorizado/);await assert.rejects(db.query("select * from kinesys_historico_avaliacao('a1','p1',0)"),/não autorizado/);}
 await db.exec("set test.papel='FISIOTERAPEUTA';set test.clinica='33333333-3333-4333-8333-333333333333'");await assert.rejects(edit({},2),/não encontrada/);await assert.rejects(db.query("select * from kinesys_historico_avaliacao('a1','p1',0)"),/não encontrada/);
 await db.exec("set test.clinica='22222222-2222-4222-8222-222222222222';set test.uid=''");await assert.rejects(edit({},2),/não autorizado/);
 console.log('PASS edição SQL: autorização, clínica/paciente, versão, original, motivo, snapshots, rollback e concorrência.');
}finally{await db.close();}
