import axios from "axios";
import type {
  Collaborator, Absence, Task, TaskAssignment, Project, ProjectSummary,
  CollaboratorPlanning, TeamSummary, Referential,
} from "../types";

const api = axios.create({ baseURL: "/api" });

// Referentials
export const getReferentials = () =>
  api.get<Referential>("/referentials").then((r) => r.data);

// Collaborators
export const getCollaborators = () =>
  api.get<Collaborator[]>("/collaborators").then((r) => r.data);
export const createCollaborator = (data: Omit<Collaborator, "id">) =>
  api.post<Collaborator>("/collaborators", data).then((r) => r.data);
export const updateCollaborator = (id: number, data: Omit<Collaborator, "id">) =>
  api.put<Collaborator>(`/collaborators/${id}`, data).then((r) => r.data);
export const deleteCollaborator = (id: number) =>
  api.delete(`/collaborators/${id}`);

// Absences
export const getAbsences = (collaborator_id?: number) =>
  api.get<Absence[]>("/absences", { params: { collaborator_id } }).then((r) => r.data);
export const createAbsence = (data: Omit<Absence, "id">) =>
  api.post<Absence>("/absences", data).then((r) => r.data);
export const updateAbsence = (id: number, data: Omit<Absence, "id">) =>
  api.put<Absence>(`/absences/${id}`, data).then((r) => r.data);
export const deleteAbsence = (id: number) => api.delete(`/absences/${id}`);

// Projects
export const getProjects = () =>
  api.get<ProjectSummary[]>("/projects").then((r) => r.data);
export const getProject = (id: number) =>
  api.get<Project>(`/projects/${id}`).then((r) => r.data);
export const createProject = (data: Omit<Project, "id" | "tasks">) =>
  api.post<Project>("/projects", data).then((r) => r.data);
export const updateProject = (id: number, data: Omit<Project, "id" | "tasks">) =>
  api.put<Project>(`/projects/${id}`, data).then((r) => r.data);
export const deleteProject = (id: number) => api.delete(`/projects/${id}`);

// Tasks
export const createTask = (data: Omit<Task, "id" | "assignments">) =>
  api.post<Task>("/tasks", data).then((r) => r.data);
export const updateTask = (id: number, data: Omit<Task, "id" | "assignments">) =>
  api.put<Task>(`/tasks/${id}`, data).then((r) => r.data);
export const deleteTask = (id: number) => api.delete(`/tasks/${id}`);
export const autoDistribute = (taskId: number) =>
  api.post<TaskAssignment[]>(`/tasks/${taskId}/auto-distribute`).then((r) => r.data);

// Assignments
export const getAssignments = (taskId: number) =>
  api.get<TaskAssignment[]>(`/tasks/${taskId}/assignments`).then((r) => r.data);
export const createAssignment = (
  taskId: number,
  data: { collaborator_id?: number; profile?: string; days_assigned: number }
) =>
  api.post<TaskAssignment>(`/tasks/${taskId}/assignments`, { task_id: taskId, ...data }).then((r) => r.data);
export const updateAssignment = (id: number, data: Omit<TaskAssignment, "id" | "task_id" | "collaborator">) =>
  api.put<TaskAssignment>(`/tasks/assignments/${id}`, data).then((r) => r.data);
export const deleteAssignment = (id: number) =>
  api.delete(`/tasks/assignments/${id}`);

// Planning
export const getPlanning = (params: {
  start_date: string;
  end_date: string;
  min_probability?: number;
  collaborator_ids?: string;
}) =>
  api.get<CollaboratorPlanning[]>("/planning", { params }).then((r) => r.data);

export const getUnassigned = (params: {
  start_date: string;
  end_date: string;
  min_probability?: number;
}) =>
  api.get<any[]>("/planning/unassigned", { params }).then((r) => r.data);

export const getTeamSummary = (params: {
  start_date: string;
  end_date: string;
  min_probability?: number;
}) =>
  api.get<TeamSummary>("/planning/team-summary", { params }).then((r) => r.data);

export const getHolidays = (year: number) =>
  api.get<string[]>("/planning/holidays", { params: { year } }).then((r) => r.data);
