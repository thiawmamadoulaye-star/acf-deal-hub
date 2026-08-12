-- =====================================================================
-- ACF DEAL HUB — POLICIES DE STOCKAGE (bucket "dataroom")
-- ⚠️ OBLIGATOIRE : sans ces policies, Supabase Storage refuse tout accès.
-- =====================================================================

create policy "dataroom_select_staff"
    on storage.objects for select
    using (
        bucket_id = 'dataroom'
        and public.is_internal_staff()
    );

create policy "dataroom_insert_staff"
    on storage.objects for insert
    with check (
        bucket_id = 'dataroom'
        and public.is_internal_staff()
    );

create policy "dataroom_update_staff"
    on storage.objects for update
    using (
        bucket_id = 'dataroom'
        and public.is_internal_staff()
    );

create policy "dataroom_delete_management"
    on storage.objects for delete
    using (
        bucket_id = 'dataroom'
        and public.is_management()
    );

-- Convention de chemin : mandates/{mandate_id}/{fichier}
create policy "dataroom_select_client"
    on storage.objects for select
    using (
        bucket_id = 'dataroom'
        and public.auth_role() = 'client'
        and (storage.foldername(name))[1] = 'mandates'
        and ((storage.foldername(name))[2])::uuid in (
            select id from mandates
            where client_id in (
                select company_id from contacts
                where email = (select email from profiles where id = auth.uid())
            )
        )
        and coalesce(
            (select category::text from documents where file_path = name limit 1),
            'other'
        ) != 'due_diligence'
    );
