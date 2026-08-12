-- =====================================================================
-- ACF DEAL HUB — PHASE 3 : Messagerie, Signature Électronique, IA
-- =====================================================================

create table mandate_messages (
    id                  uuid primary key default gen_random_uuid(),
    organization_id     uuid not null references organizations(id) on delete cascade,
    mandate_id          uuid not null references mandates(id) on delete cascade,
    sender_id           uuid not null references profiles(id),
    sender_role         app_role not null,
    content             text not null,
    is_read             boolean default false,
    created_at          timestamptz default now()
);

create index idx_mm_mandate on mandate_messages(mandate_id);
create index idx_mm_org on mandate_messages(organization_id);

alter table mandate_messages enable row level security;

create policy "messages_select_staff"
    on mandate_messages for select
    using (organization_id = auth_organization_id() and is_internal_staff());

create policy "messages_insert_staff"
    on mandate_messages for insert
    with check (organization_id = auth_organization_id() and is_internal_staff() and sender_id = auth.uid());

create policy "messages_select_client"
    on mandate_messages for select
    using (
        auth_role() = 'client'
        and mandate_id in (
            select id from mandates
            where client_id in (
                select company_id from contacts where email = (select email from profiles where id = auth.uid())
            )
        )
    );

create policy "messages_insert_client"
    on mandate_messages for insert
    with check (
        auth_role() = 'client'
        and sender_id = auth.uid()
        and mandate_id in (
            select id from mandates
            where client_id in (
                select company_id from contacts where email = (select email from profiles where id = auth.uid())
            )
        )
    );

create type signature_status as enum ('pending', 'signed', 'declined', 'expired', 'cancelled');

create table signature_requests (
    id                  uuid primary key default gen_random_uuid(),
    organization_id     uuid not null references organizations(id) on delete cascade,
    mandate_id          uuid references mandates(id) on delete cascade,
    document_id         uuid references documents(id) on delete set null,
    title               text not null,
    document_type       text default 'other',
    signatory_name       text not null,
    signatory_email      text not null,
    signatory_company    text,
    status               signature_status default 'pending',
    access_token         text unique not null default encode(gen_random_bytes(24), 'hex'),
    signature_data_url   text,
    signed_at            timestamptz,
    signer_ip            text,
    decline_reason       text,
    expires_at            timestamptz default (now() + interval '14 days'),
    created_by            uuid references profiles(id),
    created_at            timestamptz default now()
);

create index idx_sr_mandate on signature_requests(mandate_id);
create index idx_sr_org on signature_requests(organization_id);
create index idx_sr_token on signature_requests(access_token);
create index idx_sr_status on signature_requests(status);

alter table signature_requests enable row level security;

create policy "signature_requests_all_staff"
    on signature_requests for all
    using (organization_id = auth_organization_id() and is_internal_staff())
    with check (organization_id = auth_organization_id() and is_internal_staff());

create table ai_conversations (
    id                  uuid primary key default gen_random_uuid(),
    organization_id     uuid not null references organizations(id) on delete cascade,
    mandate_id          uuid references mandates(id) on delete cascade,
    profile_id          uuid not null references profiles(id),
    role                text not null,
    content             text not null,
    created_at          timestamptz default now()
);

create index idx_ai_conv_mandate on ai_conversations(mandate_id);
create index idx_ai_conv_profile on ai_conversations(profile_id);

alter table ai_conversations enable row level security;

create policy "ai_conv_own"
    on ai_conversations for all
    using (organization_id = auth_organization_id() and profile_id = auth.uid())
    with check (organization_id = auth_organization_id() and profile_id = auth.uid());

create or replace function expire_old_signature_requests()
returns void as $$
begin
    update signature_requests
    set status = 'expired'
    where status = 'pending' and expires_at < now();
end;
$$ language plpgsql security definer;
