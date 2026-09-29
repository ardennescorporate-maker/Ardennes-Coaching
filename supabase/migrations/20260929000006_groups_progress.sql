-- Accuracy tracking for the progress page, and realtime for group pages.
alter table public.profiles add column questions_correct int not null default 0;

do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    alter publication supabase_realtime add table public.group_announcements, public.group_members;
  end if;
end $$;
