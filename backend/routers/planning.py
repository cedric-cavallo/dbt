"""
Planning endpoint: returns weekly workload per collaborator.
"""
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from datetime import date, timedelta
from database import get_db
from holidays import get_french_holidays, working_days_in_range, count_working_days
import models

router = APIRouter()

PROBABILITY_MAP = {
    "signe": 100,
    "fort": 75,
    "proposition": 50,
    "prospection": 25,
    "identification": 10,
}


def _get_week_start(d: date) -> date:
    return d - timedelta(days=d.weekday())


def _get_weeks(start: date, end: date) -> list[tuple[date, date]]:
    weeks = []
    ws = _get_week_start(start)
    while ws <= end:
        we = ws + timedelta(days=4)  # Friday
        weeks.append((ws, we))
        ws += timedelta(days=7)
    return weeks


def _collaborator_absences(collaborator: models.Collaborator, start: date, end: date) -> set[date]:
    off: set[date] = set()
    for absence in collaborator.absences:
        ab_start = max(absence.start_date, start)
        ab_end = min(absence.end_date, end)
        if ab_start <= ab_end:
            current = ab_start
            while current <= ab_end:
                off.add(current)
                current += timedelta(days=1)
    return off


@router.get("/")
def get_planning(
    start_date: date = Query(...),
    end_date: date = Query(...),
    min_probability: int = Query(0, ge=0, le=100),
    collaborator_ids: str | None = Query(None),
    db: Session = Depends(get_db),
):
    """
    Returns weekly planning for each collaborator.
    min_probability: only include projects with probability >= this value (0 = all).
    collaborator_ids: comma-separated list of collaborator IDs to filter.
    """
    coll_filter = None
    if collaborator_ids:
        coll_filter = {int(x) for x in collaborator_ids.split(",") if x.strip()}

    collaborators = db.query(models.Collaborator).filter(models.Collaborator.is_active == True).all()
    if coll_filter:
        collaborators = [c for c in collaborators if c.id in coll_filter]

    # Fetch all tasks with assignments that fall in range and meet probability
    all_tasks = (
        db.query(models.Task)
        .join(models.Project)
        .filter(
            models.Task.start_date != None,
            models.Task.end_date != None,
            models.Task.start_date <= end_date,
            models.Task.end_date >= start_date,
        )
        .all()
    )

    # Filter by project probability
    filtered_tasks = []
    for task in all_tasks:
        prob = PROBABILITY_MAP.get(task.project.probability, 0)
        if prob >= min_probability:
            filtered_tasks.append(task)

    weeks = _get_weeks(start_date, end_date)

    # Build holidays set for the range
    holidays: set[date] = set()
    for year in range(start_date.year, end_date.year + 1):
        holidays |= get_french_holidays(year)

    result = []
    for collab in collaborators:
        absences_set = _collaborator_absences(collab, start_date, end_date)
        off_days = holidays | absences_set

        week_loads = []
        for ws, we in weeks:
            effective_ws = max(ws, start_date)
            effective_we = min(we, end_date)

            # Available working days for this collaborator this week
            available = count_working_days(effective_ws, effective_we, off_days)

            # Assigned days for this collaborator this week
            assigned_total = 0.0
            tasks_in_week = []

            for task in filtered_tasks:
                # Find assignments for this collaborator
                for assignment in task.assignments:
                    if assignment.collaborator_id != collab.id:
                        continue
                    if assignment.days_assigned == 0:
                        continue

                    # Overlap between task period and week
                    t_start = max(task.start_date, effective_ws)
                    t_end = min(task.end_date, effective_we)
                    if t_start > t_end:
                        continue

                    # Total working days in task period (excluding collab absences)
                    total_task_days = count_working_days(task.start_date, task.end_date, off_days)
                    if total_task_days == 0:
                        continue

                    # Working days in the overlapping week slice
                    overlap_days = count_working_days(t_start, t_end, off_days)

                    # Proportional load for this week
                    week_load = assignment.days_assigned * (overlap_days / total_task_days)
                    assigned_total += week_load

                    prob = PROBABILITY_MAP.get(task.project.probability, 0)
                    tasks_in_week.append({
                        "task_id": task.id,
                        "task_name": task.name,
                        "project_id": task.project_id,
                        "project_name": task.project.name,
                        "project_type": task.project.type,
                        "probability": prob,
                        "probability_key": task.project.probability,
                        "days_in_week": round(week_load, 2),
                        "assignment_id": assignment.id,
                        "days_assigned": assignment.days_assigned,
                    })

            week_loads.append({
                "week_start": ws.isoformat(),
                "week_end": we.isoformat(),
                "available_days": available,
                "assigned_days": round(assigned_total, 2),
                "overloaded": assigned_total > available,
                "tasks": tasks_in_week,
            })

        result.append({
            "collaborator": {
                "id": collab.id,
                "name": collab.name,
                "profile": collab.profile,
                "profiles": [p.profile for p in collab.profiles],
                "color": collab.color,
                "daily_cost": collab.daily_cost,
            },
            "weeks": week_loads,
        })

    return result


@router.get("/unassigned")
def get_unassigned(
    start_date: date = Query(...),
    end_date: date = Query(...),
    min_probability: int = Query(0, ge=0, le=100),
    db: Session = Depends(get_db),
):
    """Return tasks/assignments not yet assigned to a specific collaborator."""
    all_tasks = (
        db.query(models.Task)
        .join(models.Project)
        .filter(
            models.Task.start_date != None,
            models.Task.end_date != None,
            models.Task.start_date <= end_date,
            models.Task.end_date >= start_date,
        )
        .all()
    )

    unassigned = []
    for task in all_tasks:
        prob = PROBABILITY_MAP.get(task.project.probability, 0)
        if prob < min_probability:
            continue
        for assignment in task.assignments:
            if assignment.collaborator_id is None:
                unassigned.append({
                    "assignment_id": assignment.id,
                    "task_id": task.id,
                    "task_name": task.name,
                    "project_id": task.project_id,
                    "project_name": task.project.name,
                    "profile": assignment.profile,
                    "days_assigned": assignment.days_assigned,
                    "start_date": task.start_date.isoformat() if task.start_date else None,
                    "end_date": task.end_date.isoformat() if task.end_date else None,
                    "probability": prob,
                    "probability_key": task.project.probability,
                })

    return unassigned


@router.get("/team-summary")
def get_team_summary(
    start_date: date = Query(...),
    end_date: date = Query(...),
    min_probability: int = Query(0, ge=0, le=100),
    db: Session = Depends(get_db),
):
    """High-level team capacity summary for the period."""
    collaborators = db.query(models.Collaborator).filter(models.Collaborator.is_active == True).all()

    holidays: set[date] = set()
    for year in range(start_date.year, end_date.year + 1):
        holidays |= get_french_holidays(year)

    total_capacity = 0.0
    total_assigned = 0.0
    overloaded_collab = []

    all_tasks = (
        db.query(models.Task)
        .join(models.Project)
        .filter(
            models.Task.start_date != None,
            models.Task.end_date != None,
            models.Task.start_date <= end_date,
            models.Task.end_date >= start_date,
        )
        .all()
    )

    filtered_tasks = [
        t for t in all_tasks
        if PROBABILITY_MAP.get(t.project.probability, 0) >= min_probability
    ]

    for collab in collaborators:
        absences_set = _collaborator_absences(collab, start_date, end_date)
        off_days = holidays | absences_set
        capacity = count_working_days(start_date, end_date, off_days)
        total_capacity += capacity

        assigned = 0.0
        for task in filtered_tasks:
            for assignment in task.assignments:
                if assignment.collaborator_id != collab.id:
                    continue
                task_days = count_working_days(task.start_date, task.end_date, off_days)
                if task_days == 0:
                    continue
                overlap_start = max(task.start_date, start_date)
                overlap_end = min(task.end_date, end_date)
                if overlap_start > overlap_end:
                    continue
                overlap = count_working_days(overlap_start, overlap_end, off_days)
                assigned += assignment.days_assigned * (overlap / task_days)

        total_assigned += assigned
        if assigned > capacity:
            overloaded_collab.append({"id": collab.id, "name": collab.name, "assigned": round(assigned, 2), "capacity": capacity})

    return {
        "period_start": start_date.isoformat(),
        "period_end": end_date.isoformat(),
        "total_capacity_days": round(total_capacity, 2),
        "total_assigned_days": round(total_assigned, 2),
        "occupancy_rate": round(total_assigned / total_capacity * 100, 1) if total_capacity else 0,
        "overloaded_collaborators": overloaded_collab,
    }


@router.get("/holidays")
def get_holidays(year: int = Query(...)):
    holidays = get_french_holidays(year)
    return sorted([d.isoformat() for d in holidays])
