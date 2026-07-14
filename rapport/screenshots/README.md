# Captures d'écran à réaliser

Déposer ici les **27 fichiers PNG** listés ci-dessous, en respectant **exactement** ces noms.

Le rapport les inclut automatiquement : la macro `\capture` teste l'existence du fichier.
Tant qu'il est absent, un cadre bleu « CAPTURE D'ÉCRAN À INSÉRER » s'affiche à sa place.
Dès qu'il est présent, il est inséré à la compilation suivante. **Aucune modification de
`report.tex` n'est nécessaire.**

## Avant de capturer

1. Terminer les chantiers 1 à 3 de `../../CHANGES-TO-IMPLEMENT.md`.
2. `docker compose up -d --build`
3. Ouvrir **http://localhost:8080** (et non `:9000` — la SPA doit passer par la passerelle).
4. Créer un jeu de données crédible : 2 utilisateurs, 2–3 catégories, une dizaine de
   tâches à des statuts variés, quelques commentaires, quelques échéances.

## Conseils

- Navigateur en **1280 × 800**, zoom 100 %.
- Masquer les données personnelles réelles (utiliser des comptes de démonstration).
- Capturer la **fenêtre du navigateur**, pas l'écran entier.
- Un tableau de bord vide ne prouve rien : remplir l'application avant de capturer.

---

## Liste des fichiers attendus

### Authentification
| Fichier | Écran |
|---|---|
| `01-login.png` | Page de connexion |
| `02-register.png` | Page d'inscription |
| `03-preparing-workspace.png` | Écran « Préparation de l'espace » (provisionnement asynchrone) |
| `04-forgot-password.png` | Réinitialisation du mot de passe |

### Tableau de bord et tâches
| Fichier | Écran |
|---|---|
| `05-home.png` | Accueil |
| `06-your-work.png` | « Votre travail » |
| `07-task-create.png` | Fenêtre de création d'une tâche |
| `08-task-details.png` | Détail d'une tâche |
| `09-task-comments.png` | Fil de commentaires d'une tâche |

### Catégories
| Fichier | Écran |
|---|---|
| `10-categories-list.png` | Liste des catégories |
| `11-category-new.png` | Création d'une catégorie |
| `12-category-board.png` | Vue kanban |
| `13-category-overview.png` | Synthèse d'une catégorie |
| `14-category-members.png` | Membres et invitations |

### Statistiques, recherche, notifications
| Fichier | Écran |
|---|---|
| `15-statistics.png` | Tableau de bord des statistiques |
| `16-search.png` | Recherche globale (menu déroulant de résultats) |
| `17-notifications.png` | Centre de notifications |
| `18-notification-realtime.png` | Badge de la cloche après une notification temps réel |

### Profil et sécurité
| Fichier | Écran |
|---|---|
| `19-profile.png` | Profil utilisateur |
| `20-security.png` | Changement de mot de passe / 2FA |
| `21-sessions.png` | Sessions actives |

### Espaces de travail
| Fichier | Écran |
|---|---|
| `22-workspaces.png` | Liste des espaces de travail |
| `23-workspace-settings.png` | Paramètres d'un espace (membres, rôles) |

### Infrastructure
| Fichier | Écran |
|---|---|
| `24-rabbitmq.png` | Console RabbitMQ — `localhost:15672` (exchange, files, DLQ) |
| `25-elasticsearch.png` | Index Elasticsearch — `localhost:9200/_cat/indices?v` |
| `26-welcome-email.png` | Email de bienvenue reçu |
| `27-docker-ps.png` | `docker compose ps` — les 19 conteneurs |

---

## Écrans à NE PAS capturer

Ces trois écrans sont encore factices (données codées en dur, aucun appel réseau). Ils ne
figurent volontairement **pas** dans le rapport — ne pas les ajouter :

- l'onglet **Files** d'une catégorie ;
- l'onglet **Settings** d'une catégorie (le formulaire n'est relié à rien) ;
- l'onglet **Timeline** (les dates de l'en-tête sont écrites en dur).
