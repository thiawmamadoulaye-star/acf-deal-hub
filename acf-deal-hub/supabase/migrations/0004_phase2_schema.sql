-- =====================================================================
-- ACF DEAL HUB — PHASE 2 : Due Diligence + Mémorandums IA
-- =====================================================================

create type dd_category as enum ('financial', 'legal', 'tax', 'esg', 'operational');
create type dd_item_status as enum ('pending', 'in_progress', 'completed', 'flagged', 'not_applicable');

create table due_diligence_checklists (
    id                  uuid primary key default gen_random_uuid(),
    organization_id     uuid not null references organizations(id) on delete cascade,
    mandate_id          uuid not null references mandates(id) on delete cascade,
    name                text not null default 'Due Diligence',
    created_by          uuid references profiles(id),
    created_at          timestamptz default now()
);

create index idx_ddc_mandate on due_diligence_checklists(mandate_id);

create table due_diligence_items (
    id                  uuid primary key default gen_random_uuid(),
    checklist_id        uuid not null references due_diligence_checklists(id) on delete cascade,
    category            dd_category not null,
    label               text not null,
    status              dd_item_status default 'pending',
    risk_flag           boolean default false,
    comments            text,
    document_id         uuid references documents(id),
    assigned_to         uuid references profiles(id),
    updated_at          timestamptz default now(),
    updated_by          uuid references profiles(id)
);

create index idx_ddi_checklist on due_diligence_items(checklist_id);
create index idx_ddi_category on due_diligence_items(category);

create or replace function set_dd_item_updated_at()
returns trigger as $$
begin
    new.updated_at = now();
    return new;
end;
$$ language plpgsql;

create trigger trg_ddi_updated_at before update on due_diligence_items
    for each row execute function set_dd_item_updated_at();

create or replace function generate_standard_dd_checklist(p_mandate_id uuid, p_org_id uuid, p_created_by uuid)
returns uuid as $$
declare
    v_checklist_id uuid;
begin
    insert into due_diligence_checklists (organization_id, mandate_id, created_by)
    values (p_org_id, p_mandate_id, p_created_by)
    returning id into v_checklist_id;

    insert into due_diligence_items (checklist_id, category, label) values
    (v_checklist_id, 'financial', 'États financiers audités (3 derniers exercices)'),
    (v_checklist_id, 'financial', 'Business plan et projections financières'),
    (v_checklist_id, 'financial', 'Situation de trésorerie et dette existante'),
    (v_checklist_id, 'financial', 'Structure actionnariale et cap table'),
    (v_checklist_id, 'financial', 'Rapports de commissaires aux comptes'),
    (v_checklist_id, 'legal', 'Statuts et pactes d''actionnaires'),
    (v_checklist_id, 'legal', 'Contrats commerciaux significatifs'),
    (v_checklist_id, 'legal', 'Contentieux en cours ou passés'),
    (v_checklist_id, 'legal', 'Titres de propriété / garanties existantes'),
    (v_checklist_id, 'tax', 'Attestations de situation fiscale'),
    (v_checklist_id, 'tax', 'Historique de contrôles fiscaux'),
    (v_checklist_id, 'tax', 'Dettes fiscales et sociales'),
    (v_checklist_id, 'esg', 'Politique environnementale'),
    (v_checklist_id, 'esg', 'Conformité sociale et droit du travail'),
    (v_checklist_id, 'esg', 'Gouvernance et conflits d''intérêts'),
    (v_checklist_id, 'operational', 'Organigramme et équipe dirigeante'),
    (v_checklist_id, 'operational', 'Systèmes d''information et cybersécurité'),
    (v_checklist_id, 'operational', 'Assurances en vigueur');

    return v_checklist_id;
end;
$$ language plpgsql security definer;

create table investment_memos (
    id                  uuid primary key default gen_random_uuid(),
    organization_id     uuid not null references organizations(id) on delete cascade,
    mandate_id          uuid not null references mandates(id) on delete cascade,
    title               text not null,
    executive_summary   text,
    content             jsonb,
    status              text default 'draft',
    generated_by_ai     boolean default false,
    created_by          uuid references profiles(id),
    created_at          timestamptz default now(),
    updated_at          timestamptz default now()
);

create index idx_memo_mandate on investment_memos(mandate_id);

create trigger trg_memo_updated_at before update on investment_memos
    for each row execute function set_updated_at();

alter table due_diligence_checklists enable row level security;
alter table due_diligence_items enable row level security;
alter table investment_memos enable row level security;

create policy "ddc_all_staff"
    on due_diligence_checklists for all
    using (organization_id = auth_organization_id() and is_internal_staff())
    with check (organization_id = auth_organization_id() and is_internal_staff());

create policy "ddi_all_staff"
    on due_diligence_items for all
    using (
        exists (
            select 1 from due_diligence_checklists c
            where c.id = due_diligence_items.checklist_id
            and c.organization_id = auth_organization_id()
            and is_internal_staff()
        )
    );

create policy "memo_all_staff"
    on investment_memos for all
    using (organization_id = auth_organization_id() and is_internal_staff())
    with check (organization_id = auth_organization_id() and is_internal_staff());
