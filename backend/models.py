from sqlalchemy import Column, Integer, String, Float, Boolean, Date, Text, ForeignKey
from sqlalchemy.orm import relationship
from database import Base


class Collaborator(Base):
    __tablename__ = "collaborators"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    email = Column(String)
    profile = Column(String, nullable=False)
    daily_cost = Column(Float, default=0.0)
    color = Column(String, default="#3B82F6")
    is_active = Column(Boolean, default=True)

    absences = relationship("Absence", back_populates="collaborator", cascade="all, delete-orphan")
    task_assignments = relationship("TaskAssignment", back_populates="collaborator")
    profiles = relationship("CollaboratorProfile", cascade="all, delete-orphan")


class CollaboratorProfile(Base):
    __tablename__ = "collaborator_profiles"

    id = Column(Integer, primary_key=True, index=True)
    collaborator_id = Column(Integer, ForeignKey("collaborators.id"), nullable=False)
    profile = Column(String, nullable=False)


class Project(Base):
    __tablename__ = "projects"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    description = Column(Text)
    client = Column(String)
    type = Column(String, nullable=False)        # tma | regie | forfait
    probability = Column(String, nullable=False) # signe | fort | proposition | prospection | identification
    status = Column(String, default="active")    # active | pause | termine | annule
    start_date = Column(Date)
    end_date = Column(Date)

    tasks = relationship("Task", back_populates="project", cascade="all, delete-orphan")


class Task(Base):
    __tablename__ = "tasks"

    id = Column(Integer, primary_key=True, index=True)
    project_id = Column(Integer, ForeignKey("projects.id"), nullable=False)
    name = Column(String, nullable=False)
    description = Column(Text)
    start_date = Column(Date)
    end_date = Column(Date)
    days_sold = Column(Float, default=0.0)
    sale_price = Column(Float, default=0.0)

    project = relationship("Project", back_populates="tasks")
    assignments = relationship("TaskAssignment", back_populates="task", cascade="all, delete-orphan")


class TaskAssignment(Base):
    __tablename__ = "task_assignments"

    id = Column(Integer, primary_key=True, index=True)
    task_id = Column(Integer, ForeignKey("tasks.id"), nullable=False)
    collaborator_id = Column(Integer, ForeignKey("collaborators.id"), nullable=True)
    profile = Column(String, nullable=True)   # used when no specific collaborator
    days_assigned = Column(Float, default=0.0)

    task = relationship("Task", back_populates="assignments")
    collaborator = relationship("Collaborator", back_populates="task_assignments")


class Absence(Base):
    __tablename__ = "absences"

    id = Column(Integer, primary_key=True, index=True)
    collaborator_id = Column(Integer, ForeignKey("collaborators.id"), nullable=False)
    start_date = Column(Date, nullable=False)
    end_date = Column(Date, nullable=False)
    type = Column(String, nullable=False)  # conges | rtt | maladie | autre
    description = Column(String)

    collaborator = relationship("Collaborator", back_populates="absences")
