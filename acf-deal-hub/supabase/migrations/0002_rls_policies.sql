-- =====================================================================
-- ACF DEAL HUB — ROW LEVEL SECURITY (RLS)
-- =====================================================================

create or replace function auth_profile_id()
returns uuid as $$
    select auth.uid();
$$ language sql stable;

create or replace function auth_organization_id()
returns uuid as $$
    select organization_id from profiles where id = auth.uid();
$$ language sql stable security definer;

create or replace function auth_role()
returns app_role as $$
    select role from profiles where id = auth.uid();
$$ language sql stable security definer;

create or replace function is_internal_staff()
returns boolean as $$
    select auth_role() in ('super_admin', 'partner', 'manager', 'analyst');
$$ language sql stable security definer;

create or replace function is_management()
returns boolean as $$
    select auth_role() in ('super_admin', 'partner', 'manager');
$$ language sql stable security definer;

alter table organizations enable row level security;
alter table profiles enable row level security;
alter table companies enable row level security;
alter table contacts enable row level security;
alter table investors enable row level security;
alter table mandates enable row level security;
alter table mandate_team_members enable row level security;
alter table deals enable row level security;
alter table deal_investors enable row level security;
alter table documents enable row level security;
alter table document_access_logs enable row level security;
alter table financial_analyses enable row level security;
alter table risk_assessments enable row level security;
alter table invoices enable row level security;
alter table activity_logs enable row level security;
alter table notes enable row level security;

create policy "org_select_own"
    on organizations for select
    using (id = auth_organization_id());

create policy "org_update_super_admin"
    on organizations for update
    using (id = auth_organization_id() and auth_role() = 'super_admin');

create policy "profiles_select_same_org"
    on profiles for select
    using (organization_id = auth_organization_id());

create policy "profiles_update_self"
    on profiles for update
    using (id = auth.uid());

create policy "profiles_update_admin"
    on profiles for update
    using (organization_id = auth_organization_id() and auth_role() = 'super_admin');

create policy "profiles_insert_admin"
    on profiles for insert
    with check (auth_role() = 'super_admin');

create policy "companies_select_staff"
    on companies for select
    using (organization_id = auth_organization_id() and is_internal_staff());

create policy "companies_select_client_own"
    on companies for select
    using (
        auth_role() = 'client'
        and id in (
            select company_id from contacts
            where email = (select email from profiles where id = auth.uid())
        )
    );

create policy "companies_insert_staff"
    on companies for insert
    with check (organization_id = auth_organization_id() and is_internal_staff());

create policy "companies_update_staff"
    on companies for update
    using (organization_id = auth_organization_id() and is_internal_staff());

create policy "companies_delete_management"
    on companies for delete
    using (organization_id = auth_organization_id() and is_management());

create policy "contacts_all_staff"
    on contacts for all
    using (organization_id = auth_organization_id() and is_internal_staff())
    with check (organization_id = auth_organization_id() and is_internal_staff());

create policy "investors_select_staff"
    on investors for select
    using (organization_id = auth_organization_id() and is_internal_staff());

create policy "investors_insert_staff"
    on investors for insert
    with check (organization_id = auth_organization_id() and is_internal_staff());

create policy "investors_update_staff"
    on investors for update
    using (organization_id = auth_organization_id() and is_internal_staff());

create policy "investors_delete_management"
    on investors for delete
    using (organization_id = auth_organization_id() and is_management());

create policy "mandates_select_staff"
    on mandates for select
    using (organization_id = auth_organization_id() and is_internal_staff());

create policy "mandates_select_client"
    on mandates for select
    using (
        auth_role() = 'client'
        and client_id in (
            select company_id from contacts where email = (select email from profiles where id = auth.uid())
        )
    );

create policy "mandates_insert_management"
    on mandates for insert
    with check (organization_id = auth_organization_id() and is_management());

create policy "mandates_update_staff"
    on mandates for update
    using (
        organization_id = auth_organization_id()
        and (
            is_management()
            or owner_id = auth.uid()
            or exists (
                select 1 from mandate_team_members
                where mandate_id = mandates.id and profile_id = auth.uid()
            )
        )
    );

create policy "mandates_delete_management"
    on mandates for delete
    using (organization_id = auth_organization_id() and auth_role() in ('super_admin','partner'));

create policy "mtm_select_staff"
    on mandate_team_members for select
    using (
        exists (
            select 1 from mandates m
            where m.id = mandate_team_members.mandate_id
            and m.organization_id = auth_organization_id()
            and is_internal_staff()
        )
    );

create policy "mtm_manage_management"
    on mandate_team_members for all
    using (
        exists (
            select 1 from mandates m
            where m.id = mandate_team_members.mandate_id
            and m.organization_id = auth_organization_id()
            and is_management()
        )
    );

create policy "deals_select_staff"
    on deals for select
    using (organization_id = auth_organization_id() and is_internal_staff());

create policy "deals_insert_staff"
    on deals for insert
    with check (organization_id = auth_organization_id() and is_internal_staff());

create policy "deals_update_staff"
    on deals for update
    using (
        organization_id = auth_organization_id()
        and (is_management() or owner_id = auth.uid())
    );

create policy "deals_delete_management"
    on deals for delete
    using (organization_id = auth_organization_id() and is_management());

create policy "deal_investors_select_staff"
    on deal_investors for select
    using (
        exists (
            select 1 from deals d
            where d.id = deal_investors.deal_id
            and d.organization_id = auth_organization_id()
            and is_internal_staff()
        )
    );

create policy "deal_investors_manage_staff"
    on deal_investors for all
    using (
        exists (
            select 1 from deals d
            where d.id = deal_investors.deal_id
            and d.organization_id = auth_organization_id()
            and is_internal_staff()
        )
    );

create policy "documents_select_staff"
    on documents for select
    using (organization_id = auth_organization_id() and is_internal_staff());

create policy "documents_select_client_own_mandate"
    on documents for select
    using (
        auth_role() = 'client'
        and mandate_id in (
            select id from mandates
            where client_id in (
                select company_id from contacts where email = (select email from profiles where id = auth.uid())
            )
        )
        and category != 'due_diligence'
    );

create policy "documents_insert_staff"
    on documents for insert
    with check (organization_id = auth_organization_id() and is_internal_staff());

create policy "documents_delete_management"
    on documents for delete
    using (organization_id = auth_organization_id() and is_management());

create policy "dal_select_management"
    on document_access_logs for select
    using (
        exists (
            select 1 from documents d
            where d.id = document_access_logs.document_id
            and d.organization_id = auth_organization_id()
            and is_management()
        )
    );

create policy "dal_insert_all_authenticated"
    on document_access_logs for insert
    with check (auth.uid() is not null);

create policy "fa_all_staff"
    on financial_analyses for all
    using (
        exists (
            select 1 from mandates m
            where m.id = financial_analyses.mandate_id
            and m.organization_id = auth_organization_id()
            and is_internal_staff()
        )
    );

create policy "risk_select_staff"
    on risk_assessments for select
    using (
        exists (
            select 1 from mandates m
            where m.id = risk_assessments.mandate_id
            and m.organization_id = auth_organization_id()
            and is_internal_staff()
        )
    );

create policy "risk_manage_staff"
    on risk_assessments for insert
    with check (
        exists (
            select 1 from mandates m
            where m.id = risk_assessments.mandate_id
            and m.organization_id = auth_organization_id()
            and is_internal_staff()
        )
    );

create policy "invoices_select_management"
    on invoices for select
    using (organization_id = auth_organization_id() and is_management());

create policy "invoices_manage_management"
    on invoices for insert
    with check (organization_id = auth_organization_id() and is_management());

create policy "invoices_update_management"
    on invoices for update
    using (organization_id = auth_organization_id() and is_management());

create policy "activity_select_management"
    on activity_logs for select
    using (organization_id = auth_organization_id() and is_management());

create policy "activity_insert_all"
    on activity_logs for insert
    with check (organization_id = auth_organization_id());

create policy "notes_select_staff"
    on notes for select
    using (organization_id = auth_organization_id() and is_internal_staff());

create policy "notes_insert_staff"
    on notes for insert
    with check (organization_id = auth_organization_id() and is_internal_staff() and author_id = auth.uid());

create policy "notes_delete_own_or_management"
    on notes for delete
    using (
        organization_id = auth_organization_id()
        and (author_id = auth.uid() or is_management())
    );
