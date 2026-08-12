# Checklist de déploiement — ACF DEAL HUB

## ☑ Étape 1 — Projet Supabase créé
Project URL et clé anon récupérées.

## ☑ Étape 2 — Migrations SQL exécutées (dans l'ordre)
0001, 0002, 0003, 0004, 0005, 0006, 0007 — via SQL Editor.

## ☑ Étape 3 — Bucket "dataroom" créé
Storage → New bucket → Public : Non.

## ☑ Étape 4 — Premier compte Super Admin créé
Authentication → Users → Add user, puis :
```sql
update profiles set role = 'super_admin', organization_id = '00000000-0000-0000-0000-000000000001'
where email = 'votre.email@exemple.com';
```

## ☑ Étape 5 — Déploiement des Edge Functions (100% en ligne via GitHub Actions)

### 5.1 Secrets GitHub configurés (Settings → Secrets and variables → Actions)
- `SUPABASE_ACCESS_TOKEN` (généré depuis supabase.com/dashboard/account/tokens)
- `SUPABASE_PROJECT_REF` (ex: xipkyogxzbuanwzcgbyw)
- `SUPABASE_DB_PASSWORD`

### 5.2 Upload du code sur GitHub
Créer un dépôt privé sur github.com/new, puis glisser-déposer tous les fichiers de ce projet
(via "uploading an existing file" dans l'interface web GitHub — aucune installation locale requise).

Dès que le dossier `supabase/functions/` est présent sur la branche `main`, le workflow
`.github/workflows/deploy-edge-functions.yml` se déclenche automatiquement et déploie les 6
Edge Functions. Suivre la progression dans l'onglet **Actions** du dépôt GitHub.

## ☐ Étape 6 — Déploiement Netlify
1. https://app.netlify.com → **Add new site → Import an existing project**
2. Connecter le dépôt GitHub
3. Build command : `npm run build` / Publish directory : `dist` (déjà dans `netlify.toml`)
4. Variables d'environnement à ajouter (Site settings → Environment variables) :
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
5. Déployer

## ☐ Étape 7 — Secrets optionnels des Edge Functions
Voir `supabase/functions/.env.example`. Sans eux, l'application reste fonctionnelle
(replis automatiques : IA locale, emails journalisés sans envoi, signature native uniquement).

```bash
# Via Supabase CLI (si vous préférez le faire depuis un terminal) :
supabase secrets set OPENAI_API_KEY=sk-xxxxx
supabase secrets set RESEND_API_KEY=re_xxxxx
supabase secrets set YOUSIGN_API_KEY=xxxxx
```

## ☐ Étape 8 — Tests de bout en bout
- Connexion Super Admin
- Création entreprise / mandat / deal
- Upload document Data Room
- Génération mémorandum
- Compte client de test (rattaché via contacts.email)
