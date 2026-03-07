from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from database import get_db
import models, schemas

router = APIRouter()

PROBABILITY_VALUES = {
    "signe": 100,
    "fort": 75,
    "proposition": 50,
    "prospection": 25,
    "identification": 10,
}


def _summary(p: models.Project) -> schemas.ProjectSummary:
    days_sold = sum(t.days_sold for t in p.tasks)
    days_assigned = sum(
        a.days_assigned for t in p.tasks for a in t.assignments
    )
    revenue = sum(t.sale_price for t in p.tasks)
    return schemas.ProjectSummary(
        id=p.id,
        name=p.name,
        description=p.description,
        client=p.client,
        type=p.type,
        probability=p.probability,
        status=p.status,
        start_date=p.start_date,
        end_date=p.end_date,
        tasks_count=len(p.tasks),
        days_sold_total=days_sold,
        days_assigned_total=days_assigned,
        revenue_total=revenue,
    )


@router.get("/", response_model=list[schemas.ProjectSummary])
def list_projects(db: Session = Depends(get_db)):
    projects = db.query(models.Project).all()
    return [_summary(p) for p in projects]


@router.post("/", response_model=schemas.ProjectOut, status_code=201)
def create_project(data: schemas.ProjectCreate, db: Session = Depends(get_db)):
    obj = models.Project(**data.model_dump())
    db.add(obj)
    db.commit()
    db.refresh(obj)
    return obj


@router.get("/{id}", response_model=schemas.ProjectOut)
def get_project(id: int, db: Session = Depends(get_db)):
    obj = db.query(models.Project).filter(models.Project.id == id).first()
    if not obj:
        raise HTTPException(status_code=404, detail="Projet introuvable")
    return obj


@router.put("/{id}", response_model=schemas.ProjectOut)
def update_project(id: int, data: schemas.ProjectUpdate, db: Session = Depends(get_db)):
    obj = db.query(models.Project).filter(models.Project.id == id).first()
    if not obj:
        raise HTTPException(status_code=404, detail="Projet introuvable")
    for k, v in data.model_dump().items():
        setattr(obj, k, v)
    db.commit()
    db.refresh(obj)
    return obj


@router.delete("/{id}", status_code=204)
def delete_project(id: int, db: Session = Depends(get_db)):
    obj = db.query(models.Project).filter(models.Project.id == id).first()
    if not obj:
        raise HTTPException(status_code=404, detail="Projet introuvable")
    db.delete(obj)
    db.commit()
