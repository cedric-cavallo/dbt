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
    collab_data = data.model_dump(exclude={"profiles"})
    obj = models.Collaborator(**collab_data)
    db.add(obj)
    db.flush()
    for p in data.profiles:
        db.add(models.CollaboratorProfile(collaborator_id=obj.id, profile=p))
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
    collab_data = data.model_dump(exclude={"profiles"})
    for k, v in collab_data.items():
        setattr(obj, k, v)
    # Replace profiles atomically
    db.query(models.CollaboratorProfile).filter(
        models.CollaboratorProfile.collaborator_id == id
    ).delete()
    for p in data.profiles:
        db.add(models.CollaboratorProfile(collaborator_id=obj.id, profile=p))
    # Retrocompatibility: sync profile field with first profile
    if data.profiles:
        obj.profile = data.profiles[0]
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
