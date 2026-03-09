from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from database import engine, Base, SessionLocal
import models
from routers import collaborators, projects, tasks, absences, planning

Base.metadata.create_all(bind=engine)


def _migrate_profiles():
    """Idempotent migration: copy existing profile -> CollaboratorProfile for collaborators without entries."""
    db = SessionLocal()
    try:
        collabs = db.query(models.Collaborator).all()
        count = 0
        for c in collabs:
            if not c.profiles and c.profile:
                db.add(models.CollaboratorProfile(collaborator_id=c.id, profile=c.profile))
                count += 1
        if count:
            db.commit()
            print(f"[migration] {count} collaborateur(s) migrés vers CollaboratorProfile")
        else:
            print("[migration] CollaboratorProfile déjà à jour")
    finally:
        db.close()


_migrate_profiles()

app = FastAPI(title="Team Workload API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(collaborators.router, prefix="/api/collaborators", tags=["collaborators"])
app.include_router(projects.router, prefix="/api/projects", tags=["projects"])
app.include_router(tasks.router, prefix="/api/tasks", tags=["tasks"])
app.include_router(absences.router, prefix="/api/absences", tags=["absences"])
app.include_router(planning.router, prefix="/api/planning", tags=["planning"])


@app.get("/api/health")
def health():
    return {"status": "ok"}


@app.get("/api/referentials")
def referentials():
    return {
        "project_types": [
            {"value": "tma", "label": "TMA"},
            {"value": "regie", "label": "Régie"},
            {"value": "forfait", "label": "Forfait"},
        ],
        "probabilities": [
            {"value": "signe", "label": "Signé", "percent": 100, "color": "#16a34a"},
            {"value": "fort", "label": "Fort potentiel", "percent": 75, "color": "#2563eb"},
            {"value": "proposition", "label": "En proposition", "percent": 50, "color": "#7c3aed"},
            {"value": "prospection", "label": "En prospection", "percent": 25, "color": "#ea580c"},
            {"value": "identification", "label": "Identification", "percent": 10, "color": "#dc2626"},
        ],
        "statuses": [
            {"value": "active", "label": "Actif"},
            {"value": "pause", "label": "En pause"},
            {"value": "termine", "label": "Terminé"},
            {"value": "annule", "label": "Annulé"},
        ],
        "profiles": [
            {"value": "data_engineer", "label": "Data Engineer"},
            {"value": "dev_talent", "label": "Développeur Talent"},
            {"value": "dev_powerbi", "label": "Développeur Power BI"},
            {"value": "chef_projet", "label": "Chef de projet"},
            {"value": "architecte", "label": "Architecte"},
            {"value": "consultant", "label": "Consultant"},
            {"value": "autre", "label": "Autre"},
        ],
        "absence_types": [
            {"value": "conges", "label": "Congés payés"},
            {"value": "rtt", "label": "RTT"},
            {"value": "maladie", "label": "Maladie"},
            {"value": "formation", "label": "Formation"},
            {"value": "autre", "label": "Autre"},
        ],
    }
