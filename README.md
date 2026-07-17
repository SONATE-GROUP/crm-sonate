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
- `/contacts` : liste des contacts (recherche nom/email/téléphone/entreprise),
  chaque ligne renvoie vers la fiche entreprise correspondante.
- `/deals` + `/deals/[id]` : liste des deals (recherche + filtres statut,
  B2B/B2C, owner, score minimum, pagination) et fiche détail (deal, entreprise,
  contacts, autres deals de la même entreprise).

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
