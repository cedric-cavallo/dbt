from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from database import get_db
import models, schemas

router = APIRouter()


@router.get("/", response_model=list[schemas.CollaboratorOut])
def list_collaborators(db: Session = Depends(get_db)):
    return db.query(models.Collaborator).all()


@router.post("/", response_model=schemas.CollaboratorOut, status_code=201)
def create_collaborator(data: schemas.CollaboratorCreate, db: Session = Depends(get_db)):
    obj = models.Collaborator(**data.model_dump())
    db.add(obj)
    db.commit()
    db.refresh(obj)
    return obj


@router.get("/{id}", response_model=schemas.CollaboratorOut)
def get_collaborator(id: int, db: Session = Depends(get_db)):
    obj = db.query(models.Collaborator).filter(models.Collaborator.id == id).first()
    if not obj:
        raise HTTPException(status_code=404, detail="Collaborateur introuvable")
    return obj


@router.put("/{id}", response_model=schemas.CollaboratorOut)
def update_collaborator(id: int, data: schemas.CollaboratorUpdate, db: Session = Depends(get_db)):
    obj = db.query(models.Collaborator).filter(models.Collaborator.id == id).first()
    if not obj:
        raise HTTPException(status_code=404, detail="Collaborateur introuvable")
    for k, v in data.model_dump().items():
        setattr(obj, k, v)
    db.commit()
    db.refresh(obj)
    return obj


@router.delete("/{id}", status_code=204)
def delete_collaborator(id: int, db: Session = Depends(get_db)):
    obj = db.query(models.Collaborator).filter(models.Collaborator.id == id).first()
    if not obj:
        raise HTTPException(status_code=404, detail="Collaborateur introuvable")
    db.delete(obj)
    db.commit()
