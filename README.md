# CRM Sonate

CRM interne : Next.js (App Router) + Drizzle ORM + Turso (libSQL).

**Étape 1 (ce dépôt)** : schéma, import des données Notion, application en
lecture seule (liste + recherche + filtres + fiche détail), auth basique.
Le kanban, l'historique, les tâches et le reporting arrivent à l'étape 2.

## Schéma

- `companies` : id, name, website, sector, b2b_b2c (`b2b`/`b2c`/`mixte`), linkedin_url, source_system (`deuxio`/`wedig`/`letsclic`), created_at
- `contacts` : id, company_id (FK), full_name, email, phone, role, created_at
- `deals` : id, company_id (FK), status (enum, cf. `db/schema.ts`), qualification, score, montant_devis, panier_moyen, ca_mensuel, depense_marketing_mensuelle, besoin_principal, kpi_cible, raison_de_refus, message, owner, source, created_at, updated_at

Voir `db/schema.ts` pour le détail des types et des valeurs d'enum.

## Turso — connexion

1. Créer une base :
   ```bash
   turso db create crm-sonate
   turso db show crm-sonate --url        # -> TURSO_DATABASE_URL
   turso db tokens create crm-sonate      # -> TURSO_AUTH_TOKEN
   ```
2. Renseigner dans `.env.local` (dev) et dans les variables d'environnement Vercel (prod) :
   ```
   TURSO_DATABASE_URL=libsql://crm-sonate-xxxx.turso.io
   TURSO_AUTH_TOKEN=eyJ...
   ```
3. Appliquer le schéma :
   ```bash
   npx drizzle-kit push
   ```

**En développement local**, si `TURSO_DATABASE_URL` n'est pas défini, l'app
utilise un fichier SQLite local (`file:./local.db`) — pratique pour tester
sans base Turso.

## Import des données

Le script est paramétrable (fichier CSV + source) et peut être exécuté
plusieurs fois (une fois par source) sans dupliquer les entreprises/contacts
déjà importés :

```bash
npx tsx scripts/import.ts --csv chemin/vers/export.csv --source deuxio
# --source accepte: deuxio | wedig | letsclic
```

À la fin de l'import, un rapport est affiché : lignes lues, lignes importées
(deals créés), lignes ignorées, doublons entreprise/contact détectés,
statuts non reconnus, valeurs de "Source" non catégorisées.

### Règles de mapping / normalisation appliquées

- **Colonnes inversées** : `Name` (nom entreprise) et `Contact` (nom de la
  personne) sont mappées correctement (`companies.name` / `contacts.full_name`).
- **Dédoublonnage** : entreprises dédupliquées sur le nom normalisé (minuscule,
  accents/espaces/ponctuation retirés entièrement — "Cap Bornes" et
  "Capbornes" tombent sur la même clé — `@` développé en "at", marqueur manuel
  "doublon" retiré) ; contacts dédupliqués sur l'email (lower/trim), au sein
  d'une même entreprise. **L'email est l'identifiant unique d'un lead/contact**
  : une même adresse ne doit correspondre qu'à un seul contact, jamais à deux
  fiches entreprise différentes (vérifié après import, cf. ci-dessous). Une
  entreprise/contact déjà connu est **réutilisé**, mais chaque ligne du CSV
  crée systématiquement un nouveau `deal` (une entreprise peut ainsi avoir
  plusieurs deals dans le temps). Exception : un contact sans email ne peut
  pas être dédupliqué (créé à chaque ré-exécution) — un seul cas dans le jeu
  de données fourni.
- **Colonnes ignorées** (quasi vides ou hors périmètre étape 1) : `1st Call`,
  `Closing`, `Date Devis`, `Date Relance` (+ variantes), `Date Relance 1/2`,
  `Persona`, `Formulaire`, `Relance faite`, `Remplissage form` (utilisée
  uniquement comme date de création, cf. ci-dessous), `👨‍💻 BDD - Contacts`,
  `Qualification 1` (quasi vide, cf. Qualification ci-dessous).
- **Status** : normalisé vers l'enum `deals.status` (12 valeurs, cf.
  `DEAL_STATUS_VALUES` dans `db/schema.ts`). Toute valeur non reconnue est
  mise à `NULL` et listée dans le rapport final.
- **Qualification** : 3 colonnes Notion redondantes (`Qualification`,
  `Qualification 1`, `Qualification 2`) ramenées à un seul champ — première
  valeur non vide dans cet ordre.
- **Source** (colonne polluée : casse incohérente, valeurs collées deux fois)
  : normalisée vers un jeu de valeurs canoniques (SEO, IA, Recommandation,
  Publicité, LinkedIn, Communauté, Newsletter, Notre Blog, Recherche
  internet/Google). Les valeurs non reconnues sont conservées telles quelles
  (pas de devinette) et listées dans le rapport pour revue manuelle.
- **Montant Devis** : parsé en nombre (`"1 234,50 €"` -> `1234.5`).
  **CA mensuel / Panier moyen / Dépense marketing mensuelle** : ce sont des
  tranches (`"Entre 100 000 et 500 000€/mois"`, `"1.000 - 5.000€"`), donc
  stockées telles quelles en texte, pas converties en nombre.
  **Score** : entier (peut être négatif, ex. `-1`).
- **created_at** (companies/contacts/deals) : dérivé de la colonne
  `Remplissage form` (date de remplissage du formulaire), l'export Notion
  n'ayant pas de colonne de date de création dédiée.
- **LinkedIn** : mappée sur `companies.linkedin_url` conformément au schéma
  demandé, bien que dans le fichier fourni ce soit en réalité l'URL du profil
  LinkedIn *personnel* du contact (donnée quasi vide : 3 lignes/594).

## Application (lecture seule)

Sidebar de navigation (3 onglets) façon dashboard interne Sonate, cartes de
stats en haut de chaque liste, badges de statut colorés :

- `/companies` + `/companies/[id]` : liste des entreprises (recherche nom/site/secteur,
  filtres B2B/B2C et source système) et fiche détail (infos entreprise, tous
  ses contacts, tous ses deals).
- `/contacts` + `/contacts/[id]` : liste des contacts (recherche nom/email/
  téléphone/entreprise). Cliquer sur un contact ouvre un **volet latéral**
  (infos contact, entreprise associée, deals) par-dessus la liste, sans
  changer de page — implémenté avec les Intercepting + Parallel Routes de
  Next.js (`app/contacts/@modal/(.)[id]`) : l'URL `/contacts/[id]` reste
  partageable/rechargeable et affiche alors la fiche en page complète.
- `/deals` + `/deals/[id]` : liste des deals (recherche + filtres statut,
  B2B/B2C, owner, score minimum, pagination) et fiche détail (deal, entreprise,
  contacts, autres deals de la même entreprise).

## Base vivante — ingestion live des leads (`POST /api/leads`)

En plus de l'import batch (CSV), la base peut recevoir de nouveaux leads en
continu via un webhook HTTP — pensé pour être branché sur **Make ou n8n**,
quelle que soit la source (formulaire, autre CRM, scraping, etc.).

### Authentification

Header `x-api-key` (ou `Authorization: Bearer <clé>`), comparé à la variable
d'environnement `LEADS_API_KEY` :

```
LEADS_API_KEY=une-longue-clé-secrète-générée-aléatoirement
```

- Header absent ou clé incorrecte → `401`.
- `LEADS_API_KEY` non configurée côté serveur → `500` (l'endpoint refuse de
  tourner sans clé plutôt que d'accepter n'importe quelle requête).

Cette route n'est **pas** protégée par l'auth basique humaine (`proxy.ts`
exclut explicitement `/api/*`) : c'est un point d'entrée machine-à-machine
avec son propre contrôle d'accès.

### Payload

```json
{
  "company": {
    "name": "Acme SAS",
    "website": "https://acme.fr",
    "sector": "SaaS",
    "b2bB2c": "b2b",
    "linkedinUrl": "https://linkedin.com/company/acme",
    "sourceSystem": "api"
  },
  "contact": {
    "fullName": "Jeanne Dupont",
    "email": "jeanne@acme.fr",
    "phone": "0600000000",
    "role": "CEO"
  },
  "deal": {
    "status": "nouveau",
    "qualification": "chaud",
    "score": 80,
    "montantDevis": 1500,
    "panierMoyen": "100-500€",
    "caMensuel": "10 000-50 000€",
    "depenseMarketingMensuelle": "1 000-5 000€",
    "besoinPrincipal": "Acquisition",
    "kpiCible": "CA",
    "message": "Lead entrant via formulaire site",
    "owner": "Alice",
    "source": "LinkedIn"
  }
}
```

Seul `company.name` est requis. `contact` et `deal` sont optionnels. Les
champs non reconnus dans le payload sont simplement ignorés (pas de mapping
dynamique en v1 — cf. `LeadPayload` dans `lib/ingest.ts` pour la liste
exhaustive des champs supportés).

### Logique de dédoublonnage

Contrairement à l'import batch (qui réutilise silencieusement une entreprise/
contact déjà connu), l'ingestion live **ne fusionne jamais automatiquement** :

- **Aucune correspondance** (ni sur l'email du contact, ni sur le nom
  d'entreprise normalisé) → création directe de l'entreprise (+ contact + deal
  si fournis), puis déclenchement de l'enrichissement (voir plus bas).
  Réponse `201`.
- **Correspondance trouvée** (email de contact déjà connu, OU nom d'entreprise
  qui normalise vers une entreprise existante) → rien n'est créé/modifié : le
  lead atterrit dans une file d'attente (`pending_leads`) et une **alerte**
  apparaît directement sur la ligne de l'entreprise/du contact concerné
  (pastille orange "N en attente" dans les listes `/companies` et `/contacts`,
  section détaillée en haut de la fiche entreprise). Réponse `200`.
  - Depuis la fiche entreprise, deux actions : **Fusionner** (les nouvelles
    données s'additionnent — nouveau contact si l'email n'était pas déjà
    rattaché, et surtout un **nouveau deal**, jamais d'écrasement de champs
    existants) ou **Ignorer** (le lead reste tracé en base mais n'est plus
    proposé).

⚠️ Le matching sur le nom d'entreprise charge actuellement toutes les
entreprises en mémoire pour comparer la clé normalisée (la normalisation
n'est pas exprimable en SQL) — acceptable jusqu'à quelques milliers
d'entreprises ; à revoir (colonne `normalized_key` indexée) si le volume
grossit significativement.

### Enrichissement automatique (Derrick App)

Chaque entreprise créée directement (sans correspondance) passe en
`enrichmentStatus: "pending"` et l'enrichissement est déclenché en tâche de
fond via `after()` (`next/server`) — la requête webhook répond immédiatement
(`201`) sans attendre l'appel à l'API Derrick App. `lib/enrichment.ts`
contient le point d'intégration ; **l'appel réel à l'API Derrick App n'est pas
encore branché** (stub qui laisse `enrichmentStatus` à `"pending"`) — en
attente de la documentation de l'API.

⚠️ `after()` doit continuer à s'exécuter après l'envoi de la réponse HTTP
même sur Netlify (Next Runtime) — à vérifier en conditions réelles après
déploiement ; si l'enrichissement ne se déclenche jamais en prod alors qu'il
fonctionne en local, c'est le premier suspect.

### Invalidation du cache

Les pages étant mises en cache (`unstable_cache`, cf. section Performance),
`POST /api/leads` et les actions de fusion/rejet invalident le tag
`crm-data` : `revalidateTag("crm-data", { expire: 0 })` côté route API
(quasi-immédiat, hors Server Action), `updateTag("crm-data")` côté Server
Actions (`lib/actions.ts`, immédiat — c'est la seule API garantissant une
lecture cohérente juste après l'écriture dans ce contexte).

### Variables d'environnement à ajouter

En plus de `TURSO_DATABASE_URL` / `TURSO_AUTH_TOKEN` / `AUTH_USERS` déjà
documentées : `LEADS_API_KEY` (dev : `.env.local`, prod : dashboard Netlify —
générer une vraie clé aléatoire, ne pas réutiliser une valeur de test).

### Migration de schéma à appliquer

Cette fonctionnalité ajoute la table `pending_leads` et deux colonnes sur
`companies` (`enrichment_status`, `enrichment_data`), ainsi qu'une nouvelle
valeur `"api"` pour `source_system`. Sur la base Turso de prod, appliquer :

```bash
npx drizzle-kit push   # avec TURSO_DATABASE_URL/TURSO_AUTH_TOKEN de prod
```

## Performance

Les pages de liste/détail sont mises en cache côté serveur (`unstable_cache`,
30s) et les requêtes de comptage sont parallélisées avec la requête
principale — l'app étant en lecture seule, une fraîcheur à 30s près est
largement suffisante (les données ne changent que via une ré-exécution de
`scripts/import.ts`). Si l'app reste lente malgré ça, vérifier que la région
de la base Turso correspond à la région d'exécution des fonctions Netlify —
un aller-retour transatlantique par requête est le suspect n°1.

## Auth basique

Quelques comptes définis via la variable d'environnement `AUTH_USERS`
(HTTP Basic Auth, vérifiée dans `proxy.ts` sur toutes les routes) :

```
AUTH_USERS=alice:$2b$10$hash...,bob:$2b$10$hash...
```

Générer un hash :

```bash
npx tsx scripts/hash-password.ts "mot-de-passe"
```

⚠️ **Dans un fichier `.env*` local**, Next.js interprète `$xxx` comme une
interpolation de variable et casse les hash bcrypt. Échapper chaque `$` en
`\$` dans `.env.local` :

```
AUTH_USERS=alice:\$2b\$10\$hash...
```

Sur Vercel, les variables d'environnement sont injectées directement (pas de
parsing `.env`) : coller le hash **sans** échappement dans le dashboard.

## Développement local

```bash
npm install
npx drizzle-kit push                                  # applique le schéma (local.db par défaut)
npx tsx scripts/import.ts --csv <csv> --source deuxio  # importe les données
npm run dev
```

## Déploiement (Vercel)

1. Importer le repo sur Vercel.
2. Variables d'environnement à définir : `TURSO_DATABASE_URL`,
   `TURSO_AUTH_TOKEN`, `AUTH_USERS` (voir ci-dessus, pas d'échappement `$`
   nécessaire dans le dashboard Vercel).
3. Build command par défaut (`next build`) — aucune config supplémentaire.
4. Lancer l'import (`npx tsx scripts/import.ts ...`) une fois en local avec
   `TURSO_DATABASE_URL`/`TURSO_AUTH_TOKEN` de prod pointés vers la base Turso
   distante, avant ou après le premier déploiement.
