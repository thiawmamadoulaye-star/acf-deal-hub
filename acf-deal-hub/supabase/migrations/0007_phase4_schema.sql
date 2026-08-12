-- =====================================================================
-- ACF DEAL HUB — PHASE 4 : Portail Investisseur, Notifications, Yousign, Groupe
-- =====================================================================

create type notification_type as enum (
    'new_message', 'signature_request', 'signature_signed', 'signature_declined',
    'invoice_overdue', 'dd_deadline', 'deal_stage_change', 'mandate_update', 'other'
);

create table notifications (
    id                  uuid primary key default gen_random_uuid(),
    organization_id     uuid not null references organizations(id) on delete cascade,
    profile_id          uuid not null references profiles(id) on delete cascade,
    type                notification_type not null default 'other',
    title               text not null,
    body                text,
    link                text,
    is_read             boolean default false,
    created_at          timestamptz default now()
);

create index idx_notifications_profile on notifications(profile_id, is_read);
create index idx_notifications_org on notifications(organization_id);

alter table notifications enable row level security;

create policy "notifications_select_own"
    on notifications for select
    using (profile_id = auth.uid());

create policy "notifications_update_own"
    on notifications for update
    using (profile_id = auth.uid());

create policy "notifications_insert_service"
    on notifications for insert
    with check (false);

create or replace function create_notification(
    p_organization_id uuid,
    p_profile_id uuid,
    p_type notification_type,
    p_title text,
    p_body text default null,
    p_link text default null
) returns uuid as $$
declare
    v_id uuid;
begin
    insert into notifications (organization_id, profile_id, type, title, body, link)
    values (p_organization_id, p_profile_id, p_type, p_title, p_body, p_link)
    returning id into v_id;
    return v_id;
end;
$$ language plpgsql security definer;

create type email_status as enum ('sent', 'failed', 'skipped_no_provider');

create table email_logs (
    id                  uuid primary key default gen_random_uuid(),
    organization_id     uuid references organizations(id) on delete cascade,
    to_email            text not null,
    subject             text not null,
    template            text not null,
    status              email_status not null,
    provider_response   jsonb,
    created_at          timestamptz default now()
);

create index idx_email_logs_org on email_logs(organization_id);

alter table email_logs enable row level security;

create policy "email_logs_select_management"
    on email_logs for select
    using (organization_id = auth_organization_id() and is_management());

alter table profiles add column if not exists investor_id uuid references investors(id) on delete set null;
create index if not exists idx_profiles_investor on profiles(investor_id);

alter table documents add column if not exists is_investor_visible boolean default false;

create policy "deals_select_investor"
    on deals for select
    using (
        auth_role() = 'investor'
        and id in (
            select deal_id from deal_investors
            where investor_id = (select investor_id from profiles where id = auth.uid())
        )
    );

create policy "mandates_select_investor"
    on mandates for select
    using (
        auth_role() = 'investor'
        and id in (
            select mandate_id from deals
            where id in (
                select deal_id from deal_investors
                where investor_id = (select investor_id from profiles where id = auth.uid())
            )
        )
    );

create policy "documents_select_investor"
    on documents for select
    using (
        auth_role() = 'investor'
        and is_investor_visible = true
        and mandate_id in (
            select mandate_id from deals
            where id in (
                select deal_id from deal_investors
                where investor_id = (select investor_id from profiles where id = auth.uid())
            )
        )
    );

create policy "deal_investors_select_own"
    on deal_investors for select
    using (
        auth_role() = 'investor'
        and investor_id = (select investor_id from profiles where id = auth.uid())
    );

alter table signature_requests add column if not exists provider text not null default 'native';
alter table signature_requests add column if not exists provider_request_id text;
alter table signature_requests add column if not exists provider_metadata jsonb;

create table esignature_webhook_events (
    id                  uuid primary key default gen_random_uuid(),
    provider            text not null,
    event_type          text not null,
    signature_request_id uuid references signature_requests(id) on delete set null,
    payload             jsonb not null,
    processed           boolean default false,
    received_at         timestamptz default now()
);

create index idx_esig_events_sr on esignature_webhook_events(signature_request_id);

alter table esignature_webhook_events enable row level security;

create policy "esig_events_select_management"
    on esignature_webhook_events for select
    using (
        exists (
            select 1 from signature_requests sr
            where sr.id = esignature_webhook_events.signature_request_id
            and sr.organization_id = auth_organization_id()
            and is_management()
        )
    );

create table organization_groups (
    id                  uuid primary key default gen_random_uuid(),
    name                text not null,
    created_at          timestamptz default now()
);

alter table organizations add column if not exists group_id uuid references organization_groups(id) on delete set null;
alter table profiles add column if not exists is_group_admin boolean default false;

alter table organization_groups enable row level security;

create policy "org_groups_select_members"
    on organization_groups for select
    using (
        id in (select group_id from organizations where id = auth_organization_id())
    );

create or replace function get_consolidated_group_stats(p_group_id uuid)
returns table (
    organization_id uuid,
    organization_name text,
    active_mandates bigint,
    total_pipeline_value numeric,
    total_invoiced numeric,
    total_collected numeric
) as $$
begin
    if not exists (
        select 1 from profiles
        where id = auth.uid()
        and is_group_admin = true
        and organization_id in (select id from organizations where group_id = p_group_id)
    ) then
        raise exception 'Accès non autorisé au tableau de bord consolidé.';
    end if;

    return query
    select
        o.id,
        o.name,
        (select count(*) from mandates m where m.organization_id = o.id and m.status not in ('closed_won','closed_lost')),
        coalesce((select sum(d.deal_value) from deals d where d.organization_id = o.id), 0),
        coalesce((select sum(i.amount) from invoices i where i.organization_id = o.id), 0),
        coalesce((select sum(i.amount) from invoices i where i.organization_id = o.id and i.status = 'paid'), 0)
    from organizations o
    where o.group_id = p_group_id;
end;
$$ language plpgsql security definer;
