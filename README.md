# Team Workload — Gestion de charge d'équipe

Application web de gestion prévisionnelle de la charge d'une équipe de consultants / développeurs.
Elle permet de gérer les projets, les tâches, les affectations par collaborateur et de visualiser la charge hebdomadaire ou journalière.

---

## Fonctionnalités

### Tableau de bord
- KPIs du mois en cours : projets actifs, projets signés, CA prévisionnel, jours non affectés
- Taux d'occupation de l'équipe avec barre de progression
- Répartition des projets par probabilité (signé, fort potentiel, en proposition…)
- Alerte sur les tâches non encore staffées

### Projets
- Création et gestion de projets (type : TMA / Régie / Forfait)
- Probabilité de réalisation par projet (Signé → Identification)
- Statuts : Actif, En pause, Terminé, Annulé
- Détail projet : liste des tâches avec dates, jours vendus, prix de vente

### Tâches & Affectations
- Création de tâches rattachées à un projet (date début/fin, jours vendus)
- Affectation d'un collaborateur à une tâche (en jours, pas de 0,5j)
- Affectation à un profil sans collaborateur nommé (pool non staffé)
- Distribution automatique (`⚡ Auto`) sur la plage de dates de la tâche

### Planning
- **Vue hebdomadaire** : grille collaborateurs × semaines, charge colorisée (vert → rouge)
- **Vue journalière** : grille collaborateurs × jours ouvrés (Lun–Ven), à la demi-journée
- Filtres : plage de dates, nombre de semaines (1 à 52), filtre par probabilité, filtre par collaborateur
- Cellule cliquable → panneau latéral avec les tâches de la semaine + ajout/retrait d'affectation
- Indicateur de surcharge (> 100% de capacité)
- Section "Affectations à profil non staffées" en bas de page

### Équipe
- Gestion des collaborateurs (nom, email, profil(s), coût journalier, couleur)
- **Multi-profils** : un collaborateur peut avoir plusieurs compétences (Data Engineer + Architecte…)
- Gestion des absences par collaborateur (congés, RTT, maladie, formation)
- Les absences et jours fériés français sont déduits de la capacité dans le planning

---

## Architecture

```
csv_forecasting/
├── backend/          # API REST — Python / FastAPI / SQLAlchemy
│   ├── main.py       # Point d'entrée FastAPI + migration au démarrage
│   ├── models.py     # Modèles SQLAlchemy (SQLite)
│   ├── schemas.py    # Schémas Pydantic (validation / sérialisation)
│   ├── database.py   # Connexion SQLite (workload.db)
│   ├── holidays.py   # Calcul des jours fériés français
│   ├── routers/
│   │   ├── collaborators.py
│   │   ├── projects.py
│   │   ├── tasks.py
│   │   ├── absences.py
│   │   └── planning.py
│   ├── requirements.txt
│   └── workload.db   # Base de données SQLite (créée au premier démarrage)
│
└── frontend/         # Interface — React / TypeScript / TailwindCSS
    ├── src/
    │   ├── pages/
    │   │   ├── Dashboard.tsx
    │   │   ├── Projects.tsx
    │   │   ├── ProjectDetail.tsx
    │   │   ├── Planning.tsx
    │   │   └── Team.tsx
    │   ├── components/
    │   │   ├── WeekDetailPanel.tsx  # Panneau latéral du planning
    │   │   ├── Layout.tsx
    │   │   ├── Sidebar.tsx
    │   │   └── Modal.tsx
    │   ├── api/client.ts            # Appels API (axios)
    │   └── types/index.ts           # Types TypeScript
    ├── package.json
    └── vite.config.ts               # Proxy /api → localhost:8000
```

**Stack technique**

| Côté | Technologies |
|---|---|
| Backend | Python 3.11+, FastAPI 0.115, SQLAlchemy 2.0, Pydantic 2.10, Uvicorn |
| Frontend | React 18, TypeScript, Vite 6, TailwindCSS 3, React Query 5, date-fns 4 |
| Base de données | SQLite (fichier `backend/workload.db`) |

---

## Prérequis

- **Python 3.11+**
- **Node.js 18+** (avec npm)

---

## Installation

### 1. Backend

```bash
cd backend

# Créer l'environnement virtuel
python -m venv .venv

# Activer l'environnement (Windows)
.venv\Scripts\activate

# Installer les dépendances
pip install -r requirements.txt
```

### 2. Frontend

```bash
cd frontend
npm install
```

---

## Lancement

Ouvrir **deux terminaux** séparés.

### Terminal 1 — Backend

```bash
cd backend
.venv\Scripts\activate
python -m uvicorn main:app --host 127.0.0.1 --port 8000 --reload
```

Au premier démarrage, le backend :
1. Crée automatiquement les tables SQLite dans `workload.db`
2. Exécute une migration idempotente (profils collaborateurs)

Logs attendus :
```
[migration] CollaboratorProfile déjà à jour
INFO: Uvicorn running on http://127.0.0.1:8000
```

### Terminal 2 — Frontend

```bash
cd frontend
npm run dev
```

L'application est accessible sur **http://localhost:5173**

> Le frontend proxifie automatiquement les appels `/api/*` vers `http://localhost:8000`.

---

## Utilisation — Guide de démarrage rapide

### Étape 1 : Créer les collaborateurs (`/team`)
- Cliquer sur **+ Nouveau collaborateur**
- Renseigner le nom, sélectionner un ou plusieurs profils (chips), choisir une couleur
- Ajouter des absences si nécessaire

### Étape 2 : Créer les projets (`/projects`)
- Cliquer sur **+ Nouveau projet**
- Renseigner le nom, client, type (TMA / Régie / Forfait), probabilité, dates

### Étape 3 : Ajouter les tâches
- Cliquer sur un projet → **+ Nouvelle tâche**
- Renseigner le nom, dates début/fin, jours vendus
- Ajouter des affectations : sélectionner un collaborateur et un nombre de jours

### Étape 4 : Visualiser le planning (`/planning`)
- **Vue Semaine** : aperçu global sur plusieurs mois
- **Vue Jour** : détail journalier à la demi-journée (4 semaines par défaut)
- Cliquer sur une cellule pour voir le détail et ajuster les affectations

---

## Données persistantes

Toutes les données sont stockées dans le fichier SQLite `backend/workload.db`.
Ce fichier est créé automatiquement et survit aux redémarrages.

**Sauvegarde** : copier simplement le fichier `workload.db`.
**Remise à zéro** : supprimer `workload.db` (il sera recréé vide au prochain démarrage).

---

## API REST

La documentation interactive est disponible à l'adresse :
**http://localhost:8000/docs** (Swagger UI)

Principaux endpoints :

| Méthode | URL | Description |
|---|---|---|
| GET | `/api/collaborators` | Liste des collaborateurs |
| POST | `/api/collaborators` | Créer un collaborateur |
| GET | `/api/projects` | Liste des projets (résumé) |
| GET | `/api/projects/{id}` | Détail projet + tâches + affectations |
| POST | `/api/tasks/{id}/assignments` | Ajouter une affectation |
| POST | `/api/tasks/{id}/auto-distribute` | Distribution automatique |
| GET | `/api/planning` | Charge hebdomadaire par collaborateur |
| GET | `/api/planning/holidays?year=2026` | Jours fériés français |
| GET | `/api/referentials` | Référentiels (profils, probabilités…) |

---

## Codes couleur du planning

| Couleur | Signification |
|---|---|
| Blanc / vert clair | 0 – 50% de capacité |
| Vert | 50 – 100% |
| Jaune | 100 – 130% (léger dépassement) |
| Rouge | > 130% (surcharge) |
