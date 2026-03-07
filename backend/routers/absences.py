from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from database import get_db
import models, schemas

router = APIRouter()


@router.get("/", response_model=list[schemas.AbsenceOut])
def list_absences(collaborator_id: int | None = None, db: Session = Depends(get_db)):
    q = db.query(models.Absence)
    if collaborator_id:
        q = q.filter(models.Absence.collaborator_id == collaborator_id)
    return q.all()


@router.post("/", response_model=schemas.AbsenceOut, status_code=201)
def create_absence(data: schemas.AbsenceCreate, db: Session = Depends(get_db)):
    obj = models.Absence(**data.model_dump())
    db.add(obj)
    db.commit()
    db.refresh(obj)
    return obj


@router.put("/{id}", response_model=schemas.AbsenceOut)
def update_absence(id: int, data: schemas.AbsenceUpdate, db: Session = Depends(get_db)):
    obj = db.query(models.Absence).filter(models.Absence.id == id).first()
    if not obj:
        raise HTTPException(status_code=404, detail="Absence introuvable")
    for k, v in data.model_dump().items():
        setattr(obj, k, v)
    db.commit()
    db.refresh(obj)
    return obj


@router.delete("/{id}", status_code=204)
def delete_absence(id: int, db: Session = Depends(get_db)):
    obj = db.query(models.Absence).filter(models.Absence.id == id).first()
    if not obj:
        raise HTTPException(status_code=404, detail="Absence introuvable")
    db.delete(obj)
    db.commit()
