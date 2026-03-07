export interface Collaborator {
  id: number;
  name: string;
  email?: string;
  profile: string;
  daily_cost: number;
  color: string;
  is_active: boolean;
}

export interface Absence {
  id: number;
  collaborator_id: number;
  start_date: string;
  end_date: string;
  type: string;
  description?: string;
}

export interface TaskAssignment {
  id: number;
  task_id: number;
  collaborator_id?: number;
  profile?: string;
  days_assigned: number;
  collaborator?: Collaborator;
}

export interface Task {
  id: number;
  project_id: number;
  name: string;
  description?: string;
  start_date?: string;
  end_date?: string;
  days_sold: number;
  sale_price: number;
  assignments: TaskAssignment[];
}

export interface Project {
  id: number;
  name: string;
  description?: string;
  client?: string;
  type: string;
  probability: string;
  status: string;
  start_date?: string;
  end_date?: string;
  tasks: Task[];
}

export interface ProjectSummary {
  id: number;
  name: string;
  description?: string;
  client?: string;
  type: string;
  probability: string;
  status: string;
  start_date?: string;
  end_date?: string;
  tasks_count: number;
  days_sold_total: number;
  days_assigned_total: number;
  revenue_total: number;
}

export interface WeekLoad {
  week_start: string;
  week_end: string;
  available_days: number;
  assigned_days: number;
  overloaded: boolean;
  tasks: WeekTask[];
}

export interface WeekTask {
  task_id: number;
  task_name: string;
  project_id: number;
  project_name: string;
  project_type: string;
  probability: number;
  probability_key: string;
  days_in_week: number;
  assignment_id: number;
  days_assigned: number;
}

export interface CollaboratorPlanning {
  collaborator: {
    id: number;
    name: string;
    profile: string;
    color: string;
    daily_cost: number;
  };
  weeks: WeekLoad[];
}

export interface TeamSummary {
  period_start: string;
  period_end: string;
  total_capacity_days: number;
  total_assigned_days: number;
  occupancy_rate: number;
  overloaded_collaborators: { id: number; name: string; assigned: number; capacity: number }[];
}

export interface Referential {
  project_types: { value: string; label: string }[];
  probabilities: { value: string; label: string; percent: number; color: string }[];
  statuses: { value: string; label: string }[];
  profiles: { value: string; label: string }[];
  absence_types: { value: string; label: string }[];
}
