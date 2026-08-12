# ACF DEAL HUB

Plateforme intégrée de gestion des mandats financiers, du deal pipeline, des investisseurs et de la data room, développée pour **Advanced Capital & Finance (ACF)** — Dakar, Sénégal.

Stack : **React + TypeScript + Vite + Tailwind CSS + Supabase (PostgreSQL, Auth, Storage, RLS, Edge Functions)**

---

## Modules disponibles

- Authentification multi-rôles (super_admin, partner, manager, analyst, client, investor)
- CRM, Mandats, Deal Pipeline (Kanban drag & drop), Base Investisseurs, Data Room
- Facturation, Analyse Financière automatisée, Due Diligence, Notation des Risques
- Mémorandums d'investissement (génération IA réelle + repli local)
- Portail Client dédié + Portail Investisseur dédié
- Messagerie sécurisée temps réel, Centre de notifications
- Signature électronique (native + Yousign qualifiée eIDAS)
- Notifications email automatiques (Resend)
- Export PDF des mémorandums, Application Mobile (PWA)
- Tableau de bord consolidé multi-organisation (groupe)

---

## Déploiement — voir DEPLOYMENT.md

Toutes les étapes de déploiement (Supabase, GitHub Actions, Netlify) sont détaillées dans `DEPLOYMENT.md`.

## Structure du projet

```
acf-deal-hub/
├── .github/workflows/deploy-edge-functions.yml   (déploiement auto des Edge Functions)
├── supabase/
│   ├── migrations/        (0001 à 0007 — exécuter dans l'ordre dans Supabase SQL Editor)
│   └── functions/         (6 Edge Functions Deno)
├── public/icons/          (icônes PWA)
├── src/
│   ├── components/        (layout, ui, shared)
│   ├── contexts/          (AuthContext)
│   ├── hooks/              (useDashboardStats)
│   ├── lib/                (supabaseClient, pdfExport)
│   ├── pages/              (tous les modules métier)
│   └── types/database.ts
├── package.json
├── vite.config.ts          (config PWA incluse)
├── netlify.toml
└── .env.example
```

## Variables d'environnement (Netlify)

```
VITE_SUPABASE_URL=https://votre-projet.supabase.co
VITE_SUPABASE_ANON_KEY=votre-clé-anon
```

## Secrets Edge Functions (Supabase — optionnels selon les fonctionnalités souhaitées)

Voir `supabase/functions/.env.example` pour la liste complète (IA générative, Resend, Yousign).
