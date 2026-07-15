# Changements à implémenter pour que le code corresponde au rapport

**Contexte.** Le rapport (`rapport/report.tex`) est rendu **le 15 juillet 2026**. Le code
a **deux semaines de plus**. Le rapport décrit donc l'architecture **cible**.

Ce document liste, précisément, **tout ce qui doit encore être codé** pour que chaque
affirmation du rapport devienne vraie. Tant que cette liste n'est pas terminée, le rapport
décrit un système que nous n'avons pas fini de livrer.

---

## État actuel (après le commit `6c7a40d` de Hamza)

Ce qui est **déjà fait** et n'a rien à changer :

| Élément | État |
|---|---|
| `auth-service`, `user-service`, `task-service` | Déjà conformes |
| `category-service` (renommage de `project-service`) | Déjà fait |
| `comment-service` (extrait de `task-service`) | Déjà fait |
| `statistics-service` | Déjà fait |
| Routes gateway `/api/categories/`, `/api/comments/`, `/api/statistics/` | Déjà faites |
| `email-service` : `HtmlEmailRenderer` (gabarits HTML) | Déjà fait |
| RabbitMQ, Elasticsearch, DLQ, idempotence, WebSocket | Déjà faits |

Il reste **4 chantiers**. Deux sont **obligatoires** (contraintes du cahier des charges),
un est le **bonus**, un est de la **cohérence**.

---

## 1. OBLIGATOIRE — Tout faire passer par la passerelle (SPA depuis `/` + fermeture des ports directs)

> **Contrainte du sujet :** « Frontend servi depuis la racine `/` » et « Via l'API Gateway
> uniquement ».

**Problème actuel.** Deux choses cassent la contrainte « via la passerelle uniquement » :
`server/api-gateway/nginx.conf` renvoie encore une chaîne de texte à la racine
(`return 200 "API Gateway up. Routes: ..."`) au lieu de servir la SPA, le conteneur
`frontend` publie son propre port `9000:9000`, **et** chaque microservice et chaque base
publie son port direct sur l'hôte (`8002:8000`, `5433:5432`, …). Résultat : on peut
contourner la passerelle de partout. Ce chantier a donc trois volets — 1a (nginx), 1b
(frontend), **1c (fermer tous les ports directs)**.

C'est le changement le **moins cher** de la liste et il vaut deux points de conformité.

### 1a. `server/api-gateway/nginx.conf`

Ajouter l'upstream du frontend, à côté des autres :

```nginx
upstream frontend_app { server frontend:9000; }
```

**Remplacer** le bloc actuel :

```nginx
# À SUPPRIMER
location = / {
    default_type text/plain;
    return 200 "API Gateway up. Routes: /api/auth/  /api/profiles/  ...";
}
```

par :

```nginx
# Tout ce qui n'est pas /api/ ni /ws/ part vers la SPA.
location / {
    proxy_pass http://frontend_app;
}

# La sonde de santé déménage sur son propre chemin.
location = /healthz {
    default_type text/plain;
    return 200 "gateway ok\n";
}
```

Ajouter aussi, dans le bloc `http {}` (le défaut NGINX est 1 Mo, or `attachment-service`
accepte des fichiers de 10 Mo — sans cela, un téléversement de 8 Mo échoue en 413 **avant
même** d'atteindre le service) :

```nginx
client_max_body_size 10m;
```

> ✅ Le fichier **complet et déjà commenté** est prêt : `rapport/annexes/nginx.conf`.
> Il peut être copié tel quel par-dessus `server/api-gateway/nginx.conf`.

### 1b. `docker-compose.yml`

Sur le service `frontend`, **supprimer** la publication de port :

```yaml
  frontend:
    build:
      context: ./ui
      args:
        VITE_GATEWAY_URL: http://localhost:8080
        VITE_USE_MOCKS: "false"
    container_name: frontend
    ports:              # <-- SUPPRIMER CES DEUX LIGNES
      - "9000:9000"     # <-- la SPA ne doit plus être joignable en direct
    networks: [flowforge-platform-network]
```

Et ajouter `frontend` aux dépendances de la passerelle :

```yaml
  api-gateway:
    depends_on:
      - frontend        # <-- AJOUTER
      - auth-service
      # ...
```

### 1c. `docker-compose.yml` — fermer TOUS les ports directs des services et des bases

C'est le point le plus important, et le plus facile à oublier. Le rapport affirme
(chapitre 2) : *« Aucun service backend n'est joignable directement depuis l'extérieur du
réseau Docker »*, et le schéma de topologie ne publie que **3 ports**. Or le
`docker-compose.yml` **actuel** publie un port pour **chaque** service (`8002:8000`,
`8001:8000`, …) et **chaque** base (`5433:5432`, …). Tant que ces lignes sont là,
l'affirmation est **fausse** : `curl http://localhost:8003/api/tasks/` atteint le
task-service **sans passer par NGINX**.

**Correctif : supprimer la section `ports:` de TOUS les microservices backend (11) et de
TOUTES les bases (9).** Elles restent joignables par NGINX et entre elles via le réseau
interne Docker — la communication entre conteneurs n'a **jamais** eu besoin d'un port
publié sur l'hôte ; seul `ports:` expose vers l'hôte.

Exemple, sur `auth-service` :

```yaml
  auth-service:
    build: ./server/auth-service
    # ...
    ports:              # <-- SUPPRIMER CES DEUX LIGNES
      - "8002:8000"     # <-- le service ne doit etre joignable QUE via la passerelle
    depends_on:
      # ...
```

À répéter pour : `user-service`, `task-service`, `category-service`, `comment-service`,
`statistics-service`, `notification-service`, `workspace-service`, `attachment-service`,
`email-service`, `search-service`, **et** les 9 conteneurs `*-db`.

**Ne garder que 3 ports publiés au total :**

| Conteneur | Port | Pourquoi on le garde |
|---|---|---|
| `api-gateway` | `8080:80` | Unique porte d'entrée applicative |
| `rabbitmq` | `15672:15672` | Console d'admin (exploitation + capture d'écran) |
| `elasticsearch` | `9200:9200` | Inspection des index (exploitation + capture d'écran) |

Sur `rabbitmq`, **retirer** la ligne `- "5672:5672"` (les services utilisent
`rabbitmq:5672` en interne ; l'hôte n'a pas besoin du port AMQP).

> ✅ Le `docker-compose.yml` **cible, déjà corrigé**, est prêt :
> `rapport/annexes/docker-compose.yml`. Pour déboguer une base sans rouvrir de port :
> `docker compose exec tasks-db psql -U todo -d tasks`.

### Vérification

```bash
docker compose up -d --build
curl -I http://localhost:8080/          # SPA servie par la passerelle (200)
curl    http://localhost:8080/healthz   # "gateway ok"
curl -I http://localhost:8080/api/tasks/  # atteint task-service VIA la passerelle (401/200)

# Les acces DIRECTS doivent tous ECHOUER (connexion refusee) = objectif atteint :
curl -I http://localhost:9000/          # frontend  -> refuse
curl -I http://localhost:8003/          # task-service -> refuse
curl -I http://localhost:5435/          # tasks-db  -> refuse

# Seuls les 3 ports d'infra repondent encore :
curl -I http://localhost:8080/          # passerelle -> OK
curl -sI http://localhost:15672/ | head -1   # console RabbitMQ -> OK
curl -s  http://localhost:9200/_cat/indices  # Elasticsearch -> OK
```

---

## 2. OBLIGATOIRE — MySQL pour `notification-service` et `email-service`

> **Contrainte du sujet :** « Minimum **2 SGBD différents** ».

**Problème actuel.** Les 9 bases sont **toutes** PostgreSQL. Elasticsearch pourrait passer
pour un second magasin, mais un correcteur strict ne le considérera pas comme un *SGBD*.

**Pourquoi ces deux services précisément.** Ce sont des **journaux** : notifications reçues,
emails envoyés. Écriture-ajout, lecture par clé, aucune jointure complexe, aucun type
avancé de PostgreSQL. Ce sont les deux seuls services où le choix de MySQL se **défend
techniquement** — ce n'est pas un choix arbitraire pour cocher une case, et il faudra
pouvoir le dire à l'oral.

### 2a. `docker-compose.yml` — remplacer les deux conteneurs de base

```yaml
  notifications-db:
    image: mysql:8                       # <-- au lieu de postgres:16-alpine
    container_name: notifications-db
    command: --default-authentication-plugin=caching_sha2_password
    environment:
      - MYSQL_ROOT_PASSWORD=root
      - MYSQL_DATABASE=notifications
      - MYSQL_USER=todo
      - MYSQL_PASSWORD=todo
    volumes:
      - notifications_mysqldata:/var/lib/mysql   # <-- NOUVEAU volume
    ports:
      - "3307:3306"                              # <-- au lieu de 5438:5432
    healthcheck:
      test: ["CMD-SHELL", "mysqladmin ping -h 127.0.0.1 -u todo -ptodo --silent"]
      interval: 5s
      timeout: 5s
      retries: 20
      start_period: 30s                          # MySQL démarre plus lentement que PG
    networks: [flowforge-platform-network]
```

Idem pour `emails-db` (`MYSQL_DATABASE=emails`, volume `emails_mysqldata`, port `3308:3306`).

Déclarer les nouveaux volumes et **supprimer** `notifications_pgdata` / `emails_pgdata` :

```yaml
volumes:
  # ...
  notifications_mysqldata:
  emails_mysqldata:
```

Puis, sur les **services** `notification-service` et `email-service`, remplacer les variables
`POSTGRES_*` par `MYSQL_*` (`MYSQL_HOST=notifications-db`, `MYSQL_PORT=3306`, etc.).

> ✅ Le `docker-compose.yml` **complet et commenté** est prêt :
> `rapport/annexes/docker-compose.yml`.

### 2b. `pom.xml` (les deux services)

```xml
<!-- SUPPRIMER -->
<dependency>
    <groupId>org.postgresql</groupId>
    <artifactId>postgresql</artifactId>
</dependency>
<dependency>
    <groupId>org.flywaydb</groupId>
    <artifactId>flyway-database-postgresql</artifactId>
</dependency>

<!-- AJOUTER -->
<dependency>
    <groupId>com.mysql</groupId>
    <artifactId>mysql-connector-j</artifactId>
    <scope>runtime</scope>
</dependency>
<dependency>
    <groupId>org.flywaydb</groupId>
    <artifactId>flyway-mysql</artifactId>
</dependency>
```

### 2c. `application.yml` (les deux services)

```yaml
spring:
  datasource:
    url: jdbc:mysql://${MYSQL_HOST:localhost}:${MYSQL_PORT:3306}/${MYSQL_DB:notifications}?useUnicode=true&characterEncoding=utf8&serverTimezone=UTC
    username: ${MYSQL_USER:todo}
    password: ${MYSQL_PASSWORD:todo}
  jpa:
    hibernate:
      ddl-auto: validate
    properties:
      hibernate:
        dialect: org.hibernate.dialect.MySQLDialect
        jdbc:
          time_zone: UTC
```

### 2d. ⚠️ Migrations Flyway — le vrai travail

C'est **ici** que se cache la difficulté. Les migrations actuelles sont en dialecte
PostgreSQL. Table de conversion :

| PostgreSQL | MySQL 8 |
|---|---|
| `BIGSERIAL PRIMARY KEY` | `BIGINT AUTO_INCREMENT PRIMARY KEY` |
| `TIMESTAMPTZ` | `DATETIME(6)` (stocker en UTC — `TIMESTAMP` est borné à 2038) |
| `BOOLEAN` | `TINYINT(1)` |
| `TEXT NOT NULL DEFAULT ''` | MySQL **interdit** un DEFAULT sur TEXT → utiliser `VARCHAR(n)` |
| `now()` | `CURRENT_TIMESTAMP(6)` |
| `CREATE INDEX ... (col DESC)` | MySQL 8 accepte `DESC` dans les index |

**Le piège principal — les index partiels.** `notification-service`
(`V2__notification_event_idempotency.sql`) utilise :

```sql
CREATE UNIQUE INDEX uq_notifications_source_event_recipient_type
    ON notifications(source_event_id, recipient_user_id, type)
    WHERE source_event_id IS NOT NULL;     -- <<< MySQL NE SAIT PAS FAIRE ÇA
```

MySQL n'a **pas** d'index partiel. Or cet index est ce qui rend les notifications
idempotentes — on ne peut pas simplement le supprimer.

**Solution** : rendre la colonne NOT NULL avec une sentinelle, puis poser un index unique
classique.

```sql
-- Migration MySQL équivalente
ALTER TABLE notifications
    ADD COLUMN source_event_id VARCHAR(96) NOT NULL DEFAULT '';

CREATE UNIQUE INDEX uq_notifications_source_event_recipient_type
    ON notifications (source_event_id, recipient_user_id, type);
```

⚠️ **Conséquence côté code** : dans `NotificationService.java`, le test
`if (sourceEventId != null && !sourceEventId.isBlank())` doit devenir une comparaison à la
chaîne vide, et les insertions sans événement source doivent écrire `""` et non `NULL`.
**Sans cette adaptation, l'idempotence casse silencieusement** — et c'est exactement ce que
le rapport met en avant. À tester explicitement.

`attachment-service` a un autre piège du même genre (`VARCHAR(1024) UNIQUE` dépasse la
limite d'index InnoDB de 3072 octets en utf8mb4), mais **il reste sur PostgreSQL**, donc
rien à faire.

### Vérification

```bash
docker compose down -v && docker compose up -d --build
docker compose logs notification-service | grep -i flyway   # migrations OK
docker compose logs email-service        | grep -i flyway

# Test d'idempotence : republier DEUX FOIS le même événement et vérifier
# qu'UNE SEULE notification est créée.
```

---

## 3. BONUS — L'ordonnanceur de détection des échéances

> **Le sujet valorise explicitement ce service en bonus.**

**Problème actuel.** Toute la moitié « consommation » existe déjà : la clé de routage
`task.deadline_approaching` est liée à la file, `DomainNotificationEventMapper` la traite,
le type `TASK_DEADLINE_APPROACHING` existe en base, la trame WebSocket et le badge de
l'interface fonctionnent.

**Il manque uniquement le producteur.** Aucun `@Cron`, aucun `@Scheduled` n'existe dans tout
le dépôt : **rien n'émet jamais cet événement**. La chaîne est branchée mais personne
n'appuie sur l'interrupteur.

C'est le meilleur rapport valeur/effort de toute la liste : **~60 lignes** pour allumer une
fonctionnalité bonus complète de bout en bout.

### 3a. `server/task-service/package.json`

```bash
npm install @nestjs/schedule
```

### 3b. `server/task-service/src/app.module.ts`

```ts
import { ScheduleModule } from '@nestjs/schedule';

@Module({
  imports: [
    ScheduleModule.forRoot(),   // <-- AJOUTER
    // ...
  ],
})
```

### 3c. Nouveau fichier `server/task-service/src/tasks/deadline-scanner.service.ts`

```ts
import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Between, IsNull, Repository } from 'typeorm';
import { Task } from './entities/task.entity';
import { DomainEventPublisher } from '../events/domain-event.publisher';

@Injectable()
export class DeadlineScannerService {
  private readonly logger = new Logger(DeadlineScannerService.name);
  private readonly windowHours = Number(process.env.DEADLINE_WINDOW_HOURS ?? 24);

  constructor(
    @InjectRepository(Task) private readonly tasksRepo: Repository<Task>,
    private readonly events: DomainEventPublisher,
  ) {}

  @Cron(process.env.DEADLINE_SCAN_CRON ?? CronExpression.EVERY_HOUR)
  async scanApproachingDeadlines(): Promise<void> {
    const now = new Date();
    const horizon = new Date(now.getTime() + this.windowHours * 3600 * 1000);

    const dueSoon = await this.tasksRepo.find({
      where: {
        due_at: Between(now, horizon),
        completed_at: IsNull(),
        deleted_at: IsNull(),
      },
      relations: ['assignments'],
    });

    this.logger.log(`Deadline scan: ${dueSoon.length} task(s) due within ${this.windowHours}h`);

    for (const task of dueSoon) {
      const viewerUserIds = (task.assignments ?? []).map((a) => a.assignee_user_id);
      if (viewerUserIds.length === 0) continue;   // personne à prévenir

      await this.events.publish({
        eventType: 'task.deadline_approaching',
        actorUserId: null,                        // déclenché par le système
        resource: { type: 'task', id: task.id },
        data: {
          taskId: task.id,
          title: task.title,
          dueAt: task.due_at,
          workspaceId: task.workspace_id,
          viewerUserIds,
        },
      });
    }
  }
}
```

### 3d. `server/task-service/src/tasks/tasks.module.ts`

Ajouter `DeadlineScannerService` aux `providers`.

### 3e. `docker-compose.yml` — service `task-service`

```yaml
      - DEADLINE_SCAN_CRON=0 0 * * * *     # toutes les heures
      - DEADLINE_WINDOW_HOURS=24
```

### ⚠️ Idempotence : à vérifier absolument

Le cron s'exécute **toutes les heures**, mais une tâche due dans 24 h reste dans la fenêtre
pendant… 24 balayages. Sans protection, l'utilisateur recevrait **24 notifications** pour la
même tâche.

Heureusement, `notification-service` déduplique sur `(source_event_id, recipient, type)` —
**mais** `source_event_id` est un `randomUUID()` **différent à chaque publication**. La
déduplication ne se déclenchera donc **pas**.

**Deux options :**

- **(a) — la plus simple.** Rendre l'`eventId` déterministe pour cet événement :
  `deadline-${task.id}-${task.due_at.toISOString()}`. Deux balayages successifs produisent
  alors le **même** `eventId`, et la contrainte d'unicité de `notification-service` fait le
  reste. Aucune autre modification.
- **(b)** Ajouter une colonne `deadline_notified_at` sur `tasks` et filtrer dessus.

**→ Prendre l'option (a).** Elle réutilise le mécanisme d'idempotence existant, qui est
précisément ce que le rapport met en avant.

### Vérification

```bash
# Créer une tâche avec une échéance dans ~2h, l'assigner à un autre utilisateur
# Forcer un balayage immédiat :
docker compose exec task-service sh -c "DEADLINE_SCAN_CRON='*/10 * * * * *' node dist/main"

docker compose logs -f notification-service   # doit créer 1 notification, PAS N
# L'interface doit afficher le badge sans rechargement (WebSocket).
```

---

## 4. COHÉRENCE — Contrat frontend ↔ backend

Le rapport affirme que l'application fonctionne de bout en bout. Ces points doivent donc
être vérifiés **en exécutant réellement les écrans**, pas seulement en lisant le code.

### 4a. Création de tâche — DTO

Le frontend envoie `category_id` et un `status` sous forme de chaîne. Le
`task-service` tourne avec `forbidNonWhitelisted: true` : **toute propriété non déclarée
dans le DTO provoque un 400**. Après le renommage `project` → `category`, il faut vérifier
que `CreateTaskDto` accepte bien `category_id` (et non `project_id`) et un `status` chaîne
(et non `status_id`, supprimé lors de la dénormalisation).

**À tester :** créer une tâche depuis l'interface. Si l'on reçoit un 400, c'est ici.

### 4b. Écrans encore factices

Ces écrans sont codés en dur et **ne doivent pas être capturés** pour le rapport, ou bien
doivent être terminés :

- `CategoryFiles.vue` — deux fausses lignes de fichiers, boutons inopérants.
- `CategorySettings.vue` — le formulaire n'a **aucun** gestionnaire de soumission.
- `CategoryTimeline.vue` — les dates de l'en-tête sont écrites en dur (Jul 12–20).

> ⚠️ La liste des captures du rapport **n'inclut aucun de ces trois écrans** — c'est
> volontaire. Ne pas les ajouter.

### 4c. Documentation périmée

- `README.md` et plusieurs `SERVICE.md` mentionnent encore le réseau `todonet`. Le vrai nom
  est **`flowforge-platform-network`**.
- `legacy-frondent/` (sic) et `server/legacy-todo-service/` sont morts : les **supprimer**,
  ou au minimum écrire en tête de leur README qu'ils sont abandonnés. Un correcteur qui
  ouvre le dépôt et tombe sur deux frontends ne saura pas lequel est le vrai.

---

## Ordre de traitement conseillé

| # | Chantier | Effort | Gain |
|---|---|---|---|
| 1 | SPA depuis `/` | ~15 min | **Obligatoire** — 2 contraintes du sujet |
| 4c | Nettoyage doc + dossiers morts | ~15 min | Crédibilité |
| 3 | Cron des échéances | ~2 h | **Bonus** noté |
| 2 | MySQL (notif + email) | ~4 h | **Obligatoire** — contrainte 2 SGBD |
| 4a/4b | Contrat frontend | ~2 h | Les captures doivent être réelles |

Commencer par le n°1 : quinze minutes, et deux contraintes obligatoires validées.

---

## Rappel important

Les captures d'écran du rapport (`rapport/screenshots/`) doivent être des captures
**réelles** de l'application qui tourne. Ne pas les fabriquer, ne pas les emprunter
ailleurs : le rapport affirme que ce sont nos écrans.

Une fois les chantiers 1 à 3 terminés, lancer `docker compose up -d --build`, faire
tourner l'application, et capturer les 27 écrans listés dans
`rapport/screenshots/README.md`.
