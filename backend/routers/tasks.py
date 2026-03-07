from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from database import get_db
from holidays import count_working_days, working_days_in_range
import models, schemas
from datetime import date

router = APIRouter()


@router.post("/", response_model=schemas.TaskOut, status_code=201)
def create_task(data: schemas.TaskCreate, db: Session = Depends(get_db)):
    project = db.query(models.Project).filter(models.Project.id == data.project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Projet introuvable")
    obj = models.Task(**data.model_dump())
    db.add(obj)
    db.commit()
    db.refresh(obj)
    return obj


@router.get("/{id}", response_model=schemas.TaskOut)
def get_task(id: int, db: Session = Depends(get_db)):
    obj = db.query(models.Task).filter(models.Task.id == id).first()
    if not obj:
        raise HTTPException(status_code=404, detail="Tâche introuvable")
    return obj


@router.put("/{id}", response_model=schemas.TaskOut)
def update_task(id: int, data: schemas.TaskUpdate, db: Session = Depends(get_db)):
    obj = db.query(models.Task).filter(models.Task.id == id).first()
    if not obj:
        raise HTTPException(status_code=404, detail="Tâche introuvable")
    for k, v in data.model_dump().items():
        setattr(obj, k, v)
    db.commit()
    db.refresh(obj)
    return obj


@router.delete("/{id}", status_code=204)
def delete_task(id: int, db: Session = Depends(get_db)):
    obj = db.query(models.Task).filter(models.Task.id == id).first()
    if not obj:
        raise HTTPException(status_code=404, detail="Tâche introuvable")
    db.delete(obj)
    db.commit()


# ── Assignments ───────────────────────────────────────────────────────────────

@router.get("/{task_id}/assignments", response_model=list[schemas.TaskAssignmentOut])
def list_assignments(task_id: int, db: Session = Depends(get_db)):
    return db.query(models.TaskAssignment).filter(models.TaskAssignment.task_id == task_id).all()


@router.post("/{task_id}/assignments", response_model=schemas.TaskAssignmentOut, status_code=201)
def create_assignment(task_id: int, data: schemas.TaskAssignmentCreate, db: Session = Depends(get_db)):
    task = db.query(models.Task).filter(models.Task.id == task_id).first()
    if not task:
        raise HTTPException(status_code=404, detail="Tâche introuvable")
    obj = models.TaskAssignment(task_id=task_id, **{k: v for k, v in data.model_dump().items() if k != "task_id"})
    db.add(obj)
    db.commit()
    db.refresh(obj)
    return obj


@router.put("/assignments/{id}", response_model=schemas.TaskAssignmentOut)
def update_assignment(id: int, data: schemas.TaskAssignmentUpdate, db: Session = Depends(get_db)):
    obj = db.query(models.TaskAssignment).filter(models.TaskAssignment.id == id).first()
    if not obj:
        raise HTTPException(status_code=404, detail="Affectation introuvable")
    for k, v in data.model_dump().items():
        setattr(obj, k, v)
    db.commit()
    db.refresh(obj)
    return obj


@router.delete("/assignments/{id}", status_code=204)
def delete_assignment(id: int, db: Session = Depends(get_db)):
    obj = db.query(models.TaskAssignment).filter(models.TaskAssignment.id == id).first()
    if not obj:
        raise HTTPException(status_code=404, detail="Affectation introuvable")
    db.delete(obj)
    db.commit()


@router.post("/{task_id}/auto-distribute", response_model=list[schemas.TaskAssignmentOut])
def auto_distribute(task_id: int, db: Session = Depends(get_db)):
    """
    Distribute task's days_sold evenly across existing collaborator assignments.
    For assignments with profile only, total remaining days are noted.
    """
    task = db.query(models.Task).filter(models.Task.id == task_id).first()
    if not task:
        raise HTTPException(status_code=404, detail="Tâche introuvable")
    if not task.start_date or not task.end_date:
        raise HTTPException(status_code=400, detail="La tâche doit avoir des dates de début et fin")

    assignments = task.assignments
    if not assignments:
        raise HTTPException(status_code=400, detail="Aucune affectation à distribuer")

    # Distribute days_sold equally among assignments
    days_per_assignment = task.days_sold / len(assignments)
    for a in assignments:
        a.days_assigned = round(days_per_assignment, 2)

    db.commit()
    return assignments
