-- Pipeline stage history — guaranteed DB-side writer (Charlie, 2026-10-27).
-- pipeline_stage_history was written only app-side (push-contracting-stage
-- edge fn in FYM-App), so stage changes made by any other path (direct SQL,
-- future tools) left no trail. This trigger records EVERY agent_pipeline
-- stage change at the database layer, making the log complete going forward.
--
-- Companion change (FYM-App PR): push-contracting-stage stops inserting its
-- own history rows (the trigger now writes them) and instead annotates the
-- trigger-written row with history_note / changed_by_user_id when provided.
-- DEPLOY ORDER: this migration FIRST, then the FYM-App edge fn — otherwise
-- stage moves in the gap write no history.
--
-- Attribution comes from the columns the updating paths already set on the
-- row itself (last_updated_by_display / last_updated_by / updated_by_source).
-- Consumers that need "first RTS entry" must still dedupe on earliest row
-- per agent and ignore rts→rts no-ops (historical app-side rows contain
-- sync noise; the trigger itself never writes no-ops).

create or replace function public.log_agent_pipeline_stage_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    insert into public.pipeline_stage_history
      (pipeline_id, agent_name, from_stage, to_stage, changed_by_name, source, created_at)
    values
      (new.id,
       coalesce(new.agent_name, nullif(trim(coalesce(new.first_name,'') || ' ' || coalesce(new.last_name,'')), '')),
       null,
       new.stage,
       coalesce(new.last_updated_by_display, new.last_updated_by),
       coalesce(new.updated_by_source, 'db_trigger'),
       now());
  elsif new.stage is distinct from old.stage then
    insert into public.pipeline_stage_history
      (pipeline_id, agent_name, from_stage, to_stage, changed_by_name, source, created_at)
    values
      (new.id,
       coalesce(new.agent_name, nullif(trim(coalesce(new.first_name,'') || ' ' || coalesce(new.last_name,'')), '')),
       old.stage,
       new.stage,
       coalesce(new.last_updated_by_display, new.last_updated_by),
       coalesce(new.updated_by_source, 'db_trigger'),
       now());
  end if;
  return new;
end;
$$;

drop trigger if exists trg_agent_pipeline_stage_history_ins on public.agent_pipeline;
create trigger trg_agent_pipeline_stage_history_ins
  after insert on public.agent_pipeline
  for each row execute function public.log_agent_pipeline_stage_change();

drop trigger if exists trg_agent_pipeline_stage_history_upd on public.agent_pipeline;
create trigger trg_agent_pipeline_stage_history_upd
  after update of stage on public.agent_pipeline
  for each row execute function public.log_agent_pipeline_stage_change();
