from pydantic import BaseModel
from datetime import date
from typing import Optional


# ── Collaborator ──────────────────────────────────────────────────────────────

class CollaboratorBase(BaseModel):
    name: str
    email: Optional[str] = None
    profile: str
    daily_cost: float = 0.0
    color: str = "#3B82F6"
    is_active: bool = True


class CollaboratorCreate(CollaboratorBase):
    pass


class CollaboratorUpdate(CollaboratorBase):
    pass


class CollaboratorOut(CollaboratorBase):
    id: int

    model_config = {"from_attributes": True}


# ── Absence ───────────────────────────────────────────────────────────────────

class AbsenceBase(BaseModel):
    collaborator_id: int
    start_date: date
    end_date: date
    type: str
    description: Optional[str] = None


class AbsenceCreate(AbsenceBase):
    pass


class AbsenceUpdate(AbsenceBase):
    pass


class AbsenceOut(AbsenceBase):
    id: int

    model_config = {"from_attributes": True}


# ── Task Assignment ───────────────────────────────────────────────────────────

class TaskAssignmentBase(BaseModel):
    task_id: int
    collaborator_id: Optional[int] = None
    profile: Optional[str] = None
    days_assigned: float = 0.0


class TaskAssignmentCreate(TaskAssignmentBase):
    pass


class TaskAssignmentUpdate(BaseModel):
    collaborator_id: Optional[int] = None
    profile: Optional[str] = None
    days_assigned: float = 0.0


class TaskAssignmentOut(TaskAssignmentBase):
    id: int
    collaborator: Optional[CollaboratorOut] = None

    model_config = {"from_attributes": True}


# ── Task ──────────────────────────────────────────────────────────────────────

class TaskBase(BaseModel):
    project_id: int
    name: str
    description: Optional[str] = None
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    days_sold: float = 0.0
    sale_price: float = 0.0


class TaskCreate(TaskBase):
    pass


class TaskUpdate(TaskBase):
    pass


class TaskOut(TaskBase):
    id: int
    assignments: list[TaskAssignmentOut] = []

    model_config = {"from_attributes": True}


# ── Project ───────────────────────────────────────────────────────────────────

class ProjectBase(BaseModel):
    name: str
    description: Optional[str] = None
    client: Optional[str] = None
    type: str
    probability: str
    status: str = "active"
    start_date: Optional[date] = None
    end_date: Optional[date] = None


class ProjectCreate(ProjectBase):
    pass


class ProjectUpdate(ProjectBase):
    pass


class ProjectOut(ProjectBase):
    id: int
    tasks: list[TaskOut] = []

    model_config = {"from_attributes": True}


class ProjectSummary(ProjectBase):
    id: int
    tasks_count: int = 0
    days_sold_total: float = 0.0
    days_assigned_total: float = 0.0
    revenue_total: float = 0.0

    model_config = {"from_attributes": True}


# ── Planning ──────────────────────────────────────────────────────────────────

class WeekLoad(BaseModel):
    week_start: date
    week_end: date
    available_days: float
    assigned_days: float
    overloaded: bool
    tasks: list[dict]


class CollaboratorPlanning(BaseModel):
    collaborator: CollaboratorOut
    weeks: list[WeekLoad]


class PlanningRequest(BaseModel):
    start_date: date
    end_date: date
    min_probability: int = 0   # 0 means show all
    collaborator_ids: Optional[list[int]] = None
