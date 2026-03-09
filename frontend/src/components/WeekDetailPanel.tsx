import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { getProjects, getProject, createAssignment, deleteAssignment, autoDistribute } from "../api/client";
import type { WeekLoad, WeekTask } from "../types";

const PROB_COLORS: Record<string, string> = {
  signe: "#16a34a",
  fort: "#2563eb",
  proposition: "#7c3aed",
  prospection: "#ea580c",
  identification: "#dc2626",
};

interface Props {
  collaboratorId: number;
  collaboratorName: string;
  collaboratorColor: string;
  week: WeekLoad;
  onClose: () => void;
  onMutated: () => void;
}

function TaskRow({ task, onMutated }: { task: WeekTask; onMutated: () => void }) {
  const [loading, setLoading] = useState(false);

  const handleAuto = async () => {
    setLoading(true);
    try {
      await autoDistribute(task.task_id);
      onMutated();
    } finally {
      setLoading(false);
    }
  };

  const handleRemove = async () => {
    if (!confirm("Retirer cette affectation ?")) return;
    setLoading(true);
    try {
      await deleteAssignment(task.assignment_id);
      onMutated();
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center gap-2 py-2 border-b border-gray-100 last:border-0">
      <span
        className="w-2 h-2 rounded-full shrink-0"
        style={{ backgroundColor: PROB_COLORS[task.probability_key] ?? "#6b7280" }}
      />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-900 truncate">{task.project_name}</p>
        <p className="text-xs text-gray-500 truncate">{task.task_name}</p>
      </div>
      <span className="text-xs font-semibold text-gray-700 shrink-0">{task.days_in_week.toFixed(1)}j</span>
      <span
        className="text-xs px-1.5 py-0.5 rounded shrink-0"
        style={{ backgroundColor: PROB_COLORS[task.probability_key] + "22", color: PROB_COLORS[task.probability_key] }}
      >
        {task.probability}%
      </span>
      <button
        type="button"
        onClick={handleAuto}
        disabled={loading}
        className="text-xs px-2 py-1 rounded bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-100 shrink-0"
      >
        ⚡ Auto
      </button>
      <button
        type="button"
        onClick={handleRemove}
        disabled={loading}
        className="text-xs px-2 py-1 rounded bg-red-50 text-red-600 border border-red-200 hover:bg-red-100 shrink-0"
      >
        Retirer
      </button>
    </div>
  );
}

function AddAssignmentForm({
  collaboratorId,
  week,
  onMutated,
  onCancel,
}: {
  collaboratorId: number;
  week: WeekLoad;
  onMutated: () => void;
  onCancel: () => void;
}) {
  const [projectId, setProjectId] = useState<number | "">("");
  const [taskId, setTaskId] = useState<number | "">("");
  const [days, setDays] = useState(1);
  const [submitting, setSubmitting] = useState(false);

  const { data: projects = [] } = useQuery({
    queryKey: ["projects"],
    queryFn: getProjects,
  });

  const { data: projectDetail } = useQuery({
    queryKey: ["project", projectId],
    queryFn: () => getProject(projectId as number),
    enabled: projectId !== "",
  });

  const eligibleTasks = projectDetail?.tasks.filter(
    (t) =>
      t.start_date != null &&
      t.end_date != null &&
      t.start_date <= week.week_end &&
      t.end_date >= week.week_start
  ) ?? [];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (taskId === "" || days <= 0) return;
    setSubmitting(true);
    try {
      await createAssignment(taskId as number, {
        collaborator_id: collaboratorId,
        days_assigned: days,
      });
      onMutated();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="mt-3 p-3 bg-gray-50 rounded-lg border border-gray-200 space-y-2">
      <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Nouvelle affectation</p>
      <div>
        <label className="text-xs text-gray-500">Projet</label>
        <select
          className="input text-sm py-1 mt-0.5"
          value={projectId}
          onChange={(e) => { setProjectId(e.target.value === "" ? "" : parseInt(e.target.value)); setTaskId(""); }}
        >
          <option value="">— Choisir —</option>
          {projects.map((p) => (
            <option key={p.id} value={p.id}>{p.name}</option>
          ))}
        </select>
      </div>
      {projectId !== "" && (
        <div>
          <label className="text-xs text-gray-500">Tâche</label>
          <select
            className="input text-sm py-1 mt-0.5"
            value={taskId}
            onChange={(e) => setTaskId(e.target.value === "" ? "" : parseInt(e.target.value))}
          >
            <option value="">— Choisir —</option>
            {eligibleTasks.map((t) => (
              <option key={t.id} value={t.id}>{t.name}</option>
            ))}
          </select>
          {eligibleTasks.length === 0 && (
            <p className="text-xs text-gray-400 mt-1">Aucune tâche dans cette semaine</p>
          )}
        </div>
      )}
      <div>
        <label className="text-xs text-gray-500">Jours</label>
        <input
          type="number"
          className="input text-sm py-1 mt-0.5"
          min="0.5"
          step="0.5"
          value={days}
          onChange={(e) => setDays(parseFloat(e.target.value) || 0)}
        />
      </div>
      <div className="flex justify-end gap-2">
        <button type="button" onClick={onCancel} className="btn-secondary text-xs py-1 px-3">Annuler</button>
        <button
          type="submit"
          disabled={submitting || taskId === ""}
          className="btn-primary text-xs py-1 px-3"
        >
          Ajouter
        </button>
      </div>
    </form>
  );
}

export default function WeekDetailPanel({
  collaboratorId,
  collaboratorName,
  collaboratorColor,
  week,
  onClose,
  onMutated,
}: Props) {
  const [showAddForm, setShowAddForm] = useState(false);

  const handleMutated = () => {
    setShowAddForm(false);
    onMutated();
  };

  const weekStart = format(new Date(week.week_start), "dd MMM", { locale: fr });
  const weekEnd = format(new Date(week.week_end), "dd MMM yyyy", { locale: fr });

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/20 z-30"
        onClick={onClose}
      />
      {/* Slide-over panel */}
      <div className="fixed top-0 right-0 h-full w-96 bg-white shadow-2xl z-40 flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
          <div className="flex items-center gap-2">
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0"
              style={{ backgroundColor: collaboratorColor }}
            >
              {collaboratorName.split(" ").map((n) => n[0]).slice(0, 2).join("")}
            </div>
            <div>
              <p className="font-semibold text-sm text-gray-900">{collaboratorName}</p>
              <p className="text-xs text-gray-400">{weekStart} — {weekEnd}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-lg leading-none px-1"
          >
            ✕
          </button>
        </div>

        {/* Summary */}
        <div className="px-4 py-2 bg-gray-50 border-b border-gray-200 text-xs text-gray-600 flex gap-4">
          <span>Affecté : <strong className="text-gray-900">{week.assigned_days.toFixed(1)}j</strong></span>
          <span>Disponible : <strong className="text-gray-900">{week.available_days}j</strong></span>
          {week.overloaded && <span className="text-red-600 font-semibold">⚠️ Surchargé</span>}
        </div>

        {/* Tasks list */}
        <div className="flex-1 overflow-y-auto px-4 py-3">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
            Tâches cette semaine ({week.tasks.length})
          </p>
          {week.tasks.length === 0 ? (
            <p className="text-sm text-gray-400 italic">Aucune tâche affectée cette semaine</p>
          ) : (
            <div>
              {week.tasks.map((t) => (
                <TaskRow key={t.assignment_id} task={t} onMutated={onMutated} />
              ))}
            </div>
          )}

          {/* Add form */}
          {showAddForm ? (
            <AddAssignmentForm
              collaboratorId={collaboratorId}
              week={week}
              onMutated={handleMutated}
              onCancel={() => setShowAddForm(false)}
            />
          ) : (
            <button
              type="button"
              onClick={() => setShowAddForm(true)}
              className="mt-4 w-full text-sm text-blue-600 border border-blue-200 rounded-lg py-2 hover:bg-blue-50 transition-colors"
            >
              + Ajouter une affectation
            </button>
          )}
        </div>
      </div>
    </>
  );
}
