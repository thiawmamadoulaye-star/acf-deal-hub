-- =====================================================================
-- ACF DEAL HUB — SCHEMA INITIAL
-- Plateforme de gestion des mandats financiers, deals, investisseurs
-- Advanced Capital & Finance (ACF) — Dakar, Sénégal
-- =====================================================================

create extension if not exists "uuid-ossp";
create extension if not exists "pgcrypto";

-- =====================================================================
-- 1. ORGANIZATIONS
-- =====================================================================
create table organizations (
    id                  uuid primary key default gen_random_uuid(),
    name                text not null,
    legal_name          text,
    country             text default 'Sénégal',
    logo_url            text,
    is_active           boolean default true,
    created_at          timestamptz default now(),
    updated_at          timestamptz default now()
);

comment on table organizations is 'Organisations locataires (ACF + filiales éventuelles). Base du multi-tenant.';

-- =====================================================================
-- 2. RÔLES APPLICATIFS
-- =====================================================================
create type app_role as enum (
    'super_admin', 'partner', 'manager', 'analyst', 'client', 'investor'
);

-- =====================================================================
-- 3. PROFILS UTILISATEURS
-- =====================================================================
create table profiles (
    id                  uuid primary key references auth.users(id) on delete cascade,
    organization_id     uuid references organizations(id) on delete cascade,
    email               text not null,
    first_name          text,
    last_name           text,
    phone               text,
    role                app_role not null default 'analyst',
    avatar_url          text,
    is_active           boolean default true,
    last_login_at       timestamptz,
    created_at          timestamptz default now(),
    updated_at          timestamptz default now()
);

comment on table profiles is 'Profil étendu de chaque utilisateur, lié à auth.users. Porte le rôle applicatif.';

create index idx_profiles_org on profiles(organization_id);
create index idx_profiles_role on profiles(role);

-- =====================================================================
-- 4. COMPANIES
-- =====================================================================
create type company_type as enum ('client', 'target', 'partner', 'other');

create table companies (
    id                  uuid primary key default gen_random_uuid(),
    organization_id     uuid not null references organizations(id) on delete cascade,
    name                text not null,
    company_type        company_type default 'client',
    sector              text,
    country             text default 'Sénégal',
    city                text,
    address             text,
    website             text,
    phone               text,
    email               text,
    annual_revenue      numeric(18,2),
    currency            text default 'XOF',
    registration_number text,
    status              text default 'active',
    notes               text,
    created_by          uuid references profiles(id),
    created_at          timestamptz default now(),
    updated_at          timestamptz default now()
);

create index idx_companies_org on companies(organization_id);
create index idx_companies_sector on companies(sector);
create index idx_companies_status on companies(status);

-- =====================================================================
-- 5. CONTACTS
-- =====================================================================
create table contacts (
    id                  uuid primary key default gen_random_uuid(),
    organization_id     uuid not null references organizations(id) on delete cascade,
    company_id          uuid references companies(id) on delete cascade,
    first_name          text not null,
    last_name           text not null,
    position            text,
    email               text,
    phone               text,
    is_primary          boolean default false,
    notes               text,
    created_at          timestamptz default now(),
    updated_at          timestamptz default now()
);

create index idx_contacts_company on contacts(company_id);
create index idx_contacts_org on contacts(organization_id);

-- =====================================================================
-- 6. INVESTORS
-- =====================================================================
create type investor_type as enum (
    'bank', 'private_equity', 'dfi', 'family_office', 'insurer',
    'sovereign_fund', 'venture_capital', 'other'
);

create table investors (
    id                  uuid primary key default gen_random_uuid(),
    organization_id     uuid not null references organizations(id) on delete cascade,
    name                text not null,
    investor_type       investor_type not null default 'other',
    country             text,
    sector_focus        text[],
    ticket_min          numeric(18,2),
    ticket_max          numeric(18,2),
    currency            text default 'XOF',
    contact_name        text,
    contact_email       text,
    contact_phone       text,
    notes               text,
    is_active           boolean default true,
    created_by          uuid references profiles(id),
    created_at          timestamptz default now(),
    updated_at          timestamptz default now()
);

create index idx_investors_org on investors(organization_id);
create index idx_investors_type on investors(investor_type);

-- =====================================================================
-- 7. MANDATES
-- =====================================================================
create type mandate_type as enum (
    'debt_raising', 'equity_raising', 'project_finance', 'restructuring',
    'ma_advisory', 'strategy_advisory', 'other'
);

create type mandate_status as enum (
    'draft', 'active', 'due_diligence', 'negotiation', 'closing',
    'closed_won', 'closed_lost', 'on_hold'
);

create table mandates (
    id                  uuid primary key default gen_random_uuid(),
    organization_id     uuid not null references organizations(id) on delete cascade,
    reference           text unique not null,
    title               text not null,
    client_id           uuid not null references companies(id),
    mandate_type        mandate_type not null,
    amount_requested    numeric(18,2),
    currency            text default 'XOF',
    success_fee_rate    numeric(5,2),
    retainer_fee        numeric(18,2),
    start_date          date default current_date,
    target_close_date   date,
    actual_close_date   date,
    status              mandate_status default 'draft',
    description         text,
    sector              text,
    country             text default 'Sénégal',
    owner_id            uuid references profiles(id),
    created_by          uuid references profiles(id),
    created_at          timestamptz default now(),
    updated_at          timestamptz default now()
);

create index idx_mandates_org on mandates(organization_id);
create index idx_mandates_client on mandates(client_id);
create index idx_mandates_status on mandates(status);
create index idx_mandates_owner on mandates(owner_id);
create index idx_mandates_type on mandates(mandate_type);

-- =====================================================================
-- 8. MANDATE TEAM
-- =====================================================================
create table mandate_team_members (
    id                  uuid primary key default gen_random_uuid(),
    mandate_id          uuid not null references mandates(id) on delete cascade,
    profile_id          uuid not null references profiles(id) on delete cascade,
    role_on_mandate     text,
    assigned_at         timestamptz default now(),
    unique(mandate_id, profile_id)
);

create index idx_mtm_mandate on mandate_team_members(mandate_id);

-- =====================================================================
-- 9. DEAL PIPELINE
-- =====================================================================
create type deal_stage as enum (
    'origination', 'qualification', 'mandate_signed', 'analysis',
    'structuring', 'due_diligence', 'negotiation', 'term_sheet',
    'closing', 'post_closing', 'lost'
);

create table deals (
    id                  uuid primary key default gen_random_uuid(),
    organization_id     uuid not null references organizations(id) on delete cascade,
    mandate_id          uuid not null references mandates(id) on delete cascade,
    deal_name           text not null,
    deal_value          numeric(18,2),
    currency            text default 'XOF',
    stage               deal_stage default 'origination',
    probability         int default 10 check (probability between 0 and 100),
    expected_close_date date,
    lost_reason         text,
    owner_id            uuid references profiles(id),
    position_in_stage   int default 0,
    created_at          timestamptz default now(),
    updated_at          timestamptz default now()
);

create index idx_deals_org on deals(organization_id);
create index idx_deals_mandate on deals(mandate_id);
create index idx_deals_stage on deals(stage);
create index idx_deals_owner on deals(owner_id);

-- =====================================================================
-- 10. DEAL INVESTORS
-- =====================================================================
create type solicitation_status as enum (
    'identified', 'contacted', 'nda_signed', 'interested',
    'declined', 'committed', 'funded'
);

create table deal_investors (
    id                  uuid primary key default gen_random_uuid(),
    deal_id             uuid not null references deals(id) on delete cascade,
    investor_id         uuid not null references investors(id) on delete cascade,
    status              solicitation_status default 'identified',
    amount_committed    numeric(18,2),
    currency            text default 'XOF',
    notes               text,
    updated_at          timestamptz default now(),
    unique(deal_id, investor_id)
);

create index idx_di_deal on deal_investors(deal_id);
create index idx_di_investor on deal_investors(investor_id);

-- =====================================================================
-- 11. DATA ROOM — DOCUMENTS
-- =====================================================================
create type document_category as enum (
    'financial_statements', 'business_plan', 'contracts', 'legal',
    'tax', 'esg', 'due_diligence', 'term_sheet', 'nda', 'other'
);

create table documents (
    id                  uuid primary key default gen_random_uuid(),
    organization_id     uuid not null references organizations(id) on delete cascade,
    mandate_id          uuid references mandates(id) on delete cascade,
    deal_id             uuid references deals(id) on delete cascade,
    category            document_category default 'other',
    filename            text not null,
    file_path           text not null,
    file_size_kb        numeric(12,2),
    mime_type           text,
    version             int default 1,
    is_confidential     boolean default true,
    uploaded_by         uuid references profiles(id),
    uploaded_at         timestamptz default now()
);

create index idx_documents_mandate on documents(mandate_id);
create index idx_documents_deal on documents(deal_id);
create index idx_documents_org on documents(organization_id);

-- =====================================================================
-- 12. DOCUMENT ACCESS LOG
-- =====================================================================
create table document_access_logs (
    id                  uuid primary key default gen_random_uuid(),
    document_id         uuid not null references documents(id) on delete cascade,
    accessed_by         uuid references profiles(id),
    action              text not null,
    ip_address          text,
    accessed_at         timestamptz default now()
);

create index idx_dal_document on document_access_logs(document_id);

-- =====================================================================
-- 13. FINANCIAL ANALYSIS
-- =====================================================================
create table financial_analyses (
    id                  uuid primary key default gen_random_uuid(),
    mandate_id          uuid not null references mandates(id) on delete cascade,
    company_id          uuid references companies(id),
    fiscal_year         int not null,
    revenue             numeric(18,2),
    ebitda              numeric(18,2),
    net_income          numeric(18,2),
    total_debt          numeric(18,2),
    total_equity         numeric(18,2),
    cash_flow_operations numeric(18,2),
    dscr                numeric(6,2),
    leverage_ratio       numeric(6,2),
    roe                 numeric(6,2),
    roa                 numeric(6,2),
    analyzed_by         uuid references profiles(id),
    created_at          timestamptz default now()
);

create index idx_fa_mandate on financial_analyses(mandate_id);

-- =====================================================================
-- 14. RISK ASSESSMENTS
-- =====================================================================
create table risk_assessments (
    id                  uuid primary key default gen_random_uuid(),
    mandate_id          uuid not null references mandates(id) on delete cascade,
    credit_risk_score   int check (credit_risk_score between 0 and 100),
    operational_risk_score int check (operational_risk_score between 0 and 100),
    regulatory_risk_score  int check (regulatory_risk_score between 0 and 100),
    country_risk_score     int check (country_risk_score between 0 and 100),
    overall_risk_level  text,
    comments             text,
    assessed_by          uuid references profiles(id),
    assessed_at          timestamptz default now()
);

create index idx_risk_mandate on risk_assessments(mandate_id);

-- =====================================================================
-- 15. INVOICES
-- =====================================================================
create type invoice_status as enum ('draft', 'sent', 'paid', 'overdue', 'cancelled');
create type invoice_type as enum ('retainer', 'success_fee', 'expense', 'other');

create table invoices (
    id                  uuid primary key default gen_random_uuid(),
    organization_id     uuid not null references organizations(id) on delete cascade,
    mandate_id          uuid not null references mandates(id) on delete cascade,
    invoice_number      text unique not null,
    invoice_type        invoice_type default 'success_fee',
    amount              numeric(18,2) not null,
    currency            text default 'XOF',
    status              invoice_status default 'draft',
    issue_date          date default current_date,
    due_date            date,
    paid_date           date,
    notes               text,
    created_by          uuid references profiles(id),
    created_at          timestamptz default now()
);

create index idx_invoices_mandate on invoices(mandate_id);
create index idx_invoices_org on invoices(organization_id);
create index idx_invoices_status on invoices(status);

-- =====================================================================
-- 16. ACTIVITY LOG
-- =====================================================================
create table activity_logs (
    id                  uuid primary key default gen_random_uuid(),
    organization_id     uuid references organizations(id) on delete cascade,
    profile_id          uuid references profiles(id),
    entity_type         text not null,
    entity_id           uuid,
    action              text not null,
    details             jsonb,
    created_at          timestamptz default now()
);

create index idx_activity_org on activity_logs(organization_id);
create index idx_activity_entity on activity_logs(entity_type, entity_id);

-- =====================================================================
-- 17. NOTES
-- =====================================================================
create table notes (
    id                  uuid primary key default gen_random_uuid(),
    organization_id     uuid not null references organizations(id) on delete cascade,
    mandate_id          uuid references mandates(id) on delete cascade,
    deal_id             uuid references deals(id) on delete cascade,
    company_id          uuid references companies(id) on delete cascade,
    author_id           uuid references profiles(id),
    content             text not null,
    created_at          timestamptz default now()
);

create index idx_notes_mandate on notes(mandate_id);
create index idx_notes_deal on notes(deal_id);

-- =====================================================================
-- TRIGGERS — updated_at
-- =====================================================================
create or replace function set_updated_at()
returns trigger as $$
begin
    new.updated_at = now();
    return new;
end;
$$ language plpgsql;

create trigger trg_organizations_updated_at before update on organizations
    for each row execute function set_updated_at();
create trigger trg_profiles_updated_at before update on profiles
    for each row execute function set_updated_at();
create trigger trg_companies_updated_at before update on companies
    for each row execute function set_updated_at();
create trigger trg_contacts_updated_at before update on contacts
    for each row execute function set_updated_at();
create trigger trg_investors_updated_at before update on investors
    for each row execute function set_updated_at();
create trigger trg_mandates_updated_at before update on mandates
    for each row execute function set_updated_at();
create trigger trg_deals_updated_at before update on deals
    for each row execute function set_updated_at();

-- =====================================================================
-- TRIGGER — création automatique du profil (défensif, ne bloque jamais
-- la création du compte auth même en cas d'erreur d'insertion du profil)
-- =====================================================================
create or replace function handle_new_user()
returns trigger as $$
begin
    insert into public.profiles (id, email, first_name, last_name, role)
    values (
        new.id,
        new.email,
        coalesce(new.raw_user_meta_data->>'first_name', ''),
        coalesce(new.raw_user_meta_data->>'last_name', ''),
        coalesce((new.raw_user_meta_data->>'role')::app_role, 'analyst')
    )
    on conflict (id) do nothing;
    return new;
exception
    when others then
        raise warning 'handle_new_user() a échoué pour % : % (SQLSTATE %)', new.email, sqlerrm, sqlstate;
        return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
    after insert on auth.users
    for each row execute function handle_new_user();

-- =====================================================================
-- FONCTION — Génération automatique de référence de mandat
-- =====================================================================
create or replace function generate_mandate_reference()
returns trigger as $$
declare
    next_number int;
    year_prefix text;
begin
    year_prefix := to_char(current_date, 'YYYY');
    select coalesce(max(substring(reference from '\d+$')::int), 0) + 1
    into next_number
    from mandates
    where reference like 'ACF-' || year_prefix || '-%';

    if new.reference is null then
        new.reference := 'ACF-' || year_prefix || '-' || lpad(next_number::text, 3, '0');
    end if;
    return new;
end;
$$ language plpgsql;

create trigger trg_generate_mandate_reference
    before insert on mandates
    for each row execute function generate_mandate_reference();
