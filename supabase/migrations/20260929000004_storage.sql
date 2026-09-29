-- Private storage for study evidence (skipped where the storage schema is absent, e.g. the Docker-free dev backend).
do $$
begin
  if exists (select 1 from information_schema.schemata where schema_name = 'storage') then
    insert into storage.buckets (id, name, public, file_size_limit)
    values ('evidence', 'evidence', false, 10485760)
    on conflict (id) do nothing;
    -- Students can read their own files; uploads happen server-side with the service role.
    execute $p$create policy "evidence: owner reads" on storage.objects for select to authenticated
      using (bucket_id = 'evidence' and (storage.foldername(name))[1] = auth.uid()::text)$p$;
  end if;
end $$;
