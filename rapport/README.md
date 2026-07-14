# Rapport — Mini-Projet Microservices (FlowForge)

Ce dossier contient le rapport LaTeX à rendre au professeur, en français, conforme à la
structure imposée par le sujet (`TP_microservices.pdf`).

```
rapport/
  report.tex              <- le rapport (document principal)
  diagrams/*.mmd          <- 13 diagrammes, écrits en Mermaid
  diagrams/*.pdf          <- les mêmes, pré-rendus en PDF vectoriel (déjà générés)
  annexes/docker-compose.yml   <- annexe A (version CIBLE, commentée)
  annexes/nginx.conf           <- annexe B (version CIBLE, commentée)
  screenshots/            <- vide : y déposer les 27 captures (voir son README)
  build-diagrams.sh / .ps1     <- régénère les PDF depuis les sources Mermaid
```

---

## 1. Remplir la page de garde (2 minutes)

Ouvrir `report.tex` et modifier **uniquement** ce bloc, en haut du fichier :

```latex
\newcommand{\membreUn}{NOM Prénom}
\newcommand{\membreDeux}{NOM Prénom}
\newcommand{\membreTrois}{NOM Prénom}
\newcommand{\membreQuatre}{NOM Prénom}   % supprimer cette ligne si vous êtes 3
\newcommand{\filiere}{Filière — à compléter}
\newcommand{\anneeUniv}{2025 -- 2026}
\newcommand{\groupe}{Groupe N}
\newcommand{\encadrant}{Pr. H. EL KHATEB}
\newcommand{\etablissement}{Établissement — à compléter}
```

Tout le reste (page de garde, en-têtes, pieds de page) se met à jour automatiquement.

> Si vous n'êtes que **trois**, supprimez la ligne `\membreQuatre` **et** la ligne
> `\membreQuatre\par` dans la page de garde.

---

## 2. Compiler

### Option A — Overleaf (recommandé, aucune installation)

1. Créer un projet vide sur [overleaf.com](https://overleaf.com).
2. **Téléverser tout le dossier `rapport/`** (glisser-déposer, ou envoyer un `.zip`).
3. Menu *Settings* → **Compiler : pdfLaTeX**, **Main document : `report.tex`**.
4. Cliquer sur **Recompile**.

Le préambule n'utilise que des paquets standards, présents sur Overleaf
(`babel`, `geometry`, `graphicx`, `xcolor`, `hyperref`, `booktabs`, `longtable`,
`tabularx`, `listings`, `fancyhdr`, `titlesec`, `tcolorbox`, `enumitem`, `caption`,
`float`). **Ni `minted`, ni `shell-escape`, ni compilation externe** — les diagrammes sont
déjà des PDF.

### Option B — En local

Nécessite une distribution TeX (MiKTeX ou TeX Live) :

```bash
cd rapport
pdflatex report.tex
pdflatex report.tex     # 2e passe : table des matières, table des figures, références
```

> Deux passes sont **nécessaires**. Après une seule, la table des matières est vide et les
> renvois affichent `??`.

---

## 3. Les captures d'écran

Le rapport prévoit **27 captures**. Tant qu'un fichier est absent, un cadre bleu
« CAPTURE D'ÉCRAN À INSÉRER » apparaît à sa place, avec le nom de fichier attendu — le
rapport compile donc **dès maintenant**, avant même d'avoir pris la moindre capture.

Pour insérer une capture : déposer le PNG dans `screenshots/` sous le nom exact indiqué, et
recompiler. **Aucune modification de `report.tex` n'est nécessaire.**

👉 La liste complète des 27 fichiers est dans **`screenshots/README.md`**.

---

## 4. Les diagrammes (Mermaid)

Les 13 diagrammes sont écrits en **Mermaid** (`diagrams/*.mmd`) puis pré-rendus en PDF
vectoriel. Le code source Mermaid de chaque figure est **reproduit dans l'annexe C** du
rapport, afin que le professeur voie qu'ils sont bien faits en Mermaid.

Les PDF sont **déjà générés** : il n'y a rien à faire pour compiler le rapport.

Pour les régénérer après modification d'un `.mmd` (nécessite Node.js ≥ 18) :

```bash
./build-diagrams.sh          # Linux / macOS / Git Bash
.\build-diagrams.ps1         # Windows PowerShell
```

| # | Fichier | Figure |
|---|---|---|
| 1 | `01-architecture-globale` | Architecture globale |
| 2 | `02-routage-nginx` | Routage de la passerelle |
| 3 | `03-topologie-docker` | Topologie Docker Compose |
| 4 | `04-sequence-inscription` | Inscription et provisionnement asynchrone |
| 5 | `05-sequence-tache` | Cycle de vie d'une tâche |
| 6 | `06-bus-evenements` | Bus d'événements RabbitMQ |
| 7 | `07-sequence-deadline` | Détection des échéances (bonus) |
| 8 | `08-modele-auth-user` | Modèle de données Auth & User |
| 9 | `09-modele-task` | Modèle de données Task |
| 10 | `10-modele-category-comment` | Modèle Category & Comment |
| 11 | `11-modele-workspace-notification` | Modèle Workspace / Notification / Attachment / Email |
| 12 | `12-recherche-elasticsearch` | Indexation et recherche Elasticsearch |
| 13 | `13-flux-statistiques` | Flux d'agrégation des statistiques |

---

## 5. ⚠️ À lire avant de rendre

Le rapport décrit l'architecture **cible**. Certaines de ses affirmations ne sont pas encore
vraies dans le code :

- la SPA n'est pas encore servie depuis `/` par la passerelle ;
- `notification-service` et `email-service` sont encore sur PostgreSQL, pas MySQL ;
- l'ordonnanceur qui publie `task.deadline_approaching` n'existe pas encore.

Ces trois points — et le reste — sont détaillés, avec le code à écrire, dans
**`../CHANGES-TO-IMPLEMENT.md`**. Le code a deux semaines de plus que le rapport : il faut
que cette liste soit terminée avant la remise du code, sans quoi le rapport décrira un
système qui n'existe pas.

Les captures d'écran doivent être des captures **réelles** de l'application qui tourne.

---

## Structure du rapport (conforme au sujet)

| Section du sujet | Chapitre du rapport |
|---|---|
| 1. Page de garde | Page de titre |
| 2. Introduction | Chapitre 1 — contexte, objectifs, périmètre, architecture |
| 3. Schéma de l'architecture globale | Chapitre 2 — 6 diagrammes |
| 4. Code source des backends | Chapitre 3 — 7 services documentés |
| 5. Captures d'écran du frontend | Chapitre 5 — 27 captures commentées |
| 6. Annexes (`docker-compose.yml`, `nginx.conf`) | Annexes A et B, commentées |
| — | Chapitre 4 — *hors périmètre* : RabbitMQ, Elasticsearch, email, WebSocket |
