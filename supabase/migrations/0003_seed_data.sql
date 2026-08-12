-- =====================================================================
-- ACF DEAL HUB — DONNÉES DE DÉMONSTRATION (optionnel)
-- =====================================================================

insert into organizations (id, name, legal_name, country)
values ('00000000-0000-0000-0000-000000000001', 'ACF', 'Advanced Capital & Finance SAS', 'Sénégal')
on conflict (id) do nothing;

insert into companies (id, organization_id, name, company_type, sector, country, city, annual_revenue, status)
values
('10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', 'SICAP SA', 'client', 'Immobilier', 'Sénégal', 'Dakar', 15000000000, 'active'),
('10000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000001', 'Sénégal Solaire SA', 'client', 'Énergie', 'Sénégal', 'Dakar', 8000000000, 'active'),
('10000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000001', 'Agro Industries Sahel', 'client', 'Agro-industrie', 'Sénégal', 'Thiès', 5000000000, 'prospect')
on conflict (id) do nothing;

insert into contacts (organization_id, company_id, first_name, last_name, position, email, phone, is_primary)
values
('00000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', 'Moussa', 'Diop', 'Directeur Financier', 'm.diop@sicap.sn', '+221771234567', true),
('00000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000002', 'Aissatou', 'Ndiaye', 'CEO', 'a.ndiaye@senegalsolaire.sn', '+221771234568', true),
('00000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000003', 'Ibrahima', 'Fall', 'Président', 'i.fall@agrosahel.sn', '+221771234569', true);

insert into investors (organization_id, name, investor_type, country, sector_focus, ticket_min, ticket_max, contact_name, contact_email)
values
('00000000-0000-0000-0000-000000000001', 'China Construction Bank', 'bank', 'Chine', array['Infrastructure','Energie'], 5000000000, 100000000000, 'Li Wei', 'contact@ccb.com'),
('00000000-0000-0000-0000-000000000001', 'Coris Bank International Sénégal', 'bank', 'Sénégal', array['Immobilier','Industrie'], 500000000, 20000000000, 'Fatou Sall', 'contact@corisbank.sn'),
('00000000-0000-0000-0000-000000000001', 'Sinosure', 'dfi', 'Chine', array['Infrastructure'], 1000000000, 50000000000, 'Zhang Ming', 'contact@sinosure.com'),
('00000000-0000-0000-0000-000000000001', 'AFD - Agence Française de Développement', 'dfi', 'France', array['Energie','Social'], 1000000000, 30000000000, 'Marie Dubois', 'contact@afd.fr'),
('00000000-0000-0000-0000-000000000001', 'Teranga Capital', 'private_equity', 'Sénégal', array['PME','Agro-industrie'], 100000000, 3000000000, 'Cheikh Ba', 'contact@terangacapital.sn');

insert into mandates (organization_id, title, client_id, mandate_type, amount_requested, success_fee_rate, target_close_date, status, description, sector)
values
('00000000-0000-0000-0000-000000000001', 'Financement logements sociaux SICAP', '10000000-0000-0000-0000-000000000001', 'project_finance', 45000000000, 1.5, '2026-12-31', 'negotiation', 'Financement EPC+F pour projet de logements sociaux avec partenaire chinois', 'Immobilier'),
('00000000-0000-0000-0000-000000000001', 'Levée de dette centrale solaire', '10000000-0000-0000-0000-000000000002', 'project_finance', 10000000000, 2.0, '2026-10-15', 'due_diligence', 'Financement projet solaire 30MW', 'Énergie'),
('00000000-0000-0000-0000-000000000001', 'Levée de fonds Agro Sahel', '10000000-0000-0000-0000-000000000003', 'equity_raising', 3000000000, 3.0, '2027-02-28', 'active', 'Levée de série A pour extension unité agro-industrielle', 'Agro-industrie')
on conflict do nothing;

do $$
declare
    m1 uuid;
    m2 uuid;
    m3 uuid;
begin
    select id into m1 from mandates where title = 'Financement logements sociaux SICAP' limit 1;
    select id into m2 from mandates where title = 'Levée de dette centrale solaire' limit 1;
    select id into m3 from mandates where title = 'Levée de fonds Agro Sahel' limit 1;

    insert into deals (organization_id, mandate_id, deal_name, deal_value, stage, probability, expected_close_date)
    values
    ('00000000-0000-0000-0000-000000000001', m1, 'Financement EPC+F Jiangsu Zhenhuai', 45000000000, 'negotiation', 70, '2026-12-31'),
    ('00000000-0000-0000-0000-000000000001', m2, 'Financement centrale solaire 30MW', 10000000000, 'due_diligence', 55, '2026-10-15'),
    ('00000000-0000-0000-0000-000000000001', m3, 'Série A Agro Sahel', 3000000000, 'qualification', 25, '2027-02-28');
end $$;
