import { useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getProject, updateProject, deleteProject, getReferentials, getCollaborators,
  createTask, updateTask, deleteTask,
  createAssignment, updateAssignment, deleteAssignment, autoDistribute,
} from "../api/client";
import Modal from "../components/Modal";
import type { Task, TaskAssignment } from "../types";

const PROB_COLORS: Record<string, string> = {
  signe: "#16a34a", fort: "#2563eb", proposition: "#7c3aed",
  prospection: "#ea580c", identification: "#dc2626",
};

function TaskForm({
  projectId, initial, onSubmit, onClose,
}: {
  projectId: number;
  initial?: Partial<Task>;
  onSubmit: (data: any) => void;
  onClose: () => void;
}) {
  const [form, setForm] = useState({
    project_id: projectId,
    name: initial?.name ?? "",
    description: initial?.description ?? "",
    start_date: initial?.start_date ?? "",
    end_date: initial?.end_date ?? "",
    days_sold: initial?.days_sold ?? 0,
    sale_price: initial?.sale_price ?? 0,
  });
  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.type === "number" ? parseFloat(e.target.value) || 0 : e.target.value }));

  return (
    <form className="p-6 space-y-4" onSubmit={(e) => { e.preventDefault(); onSubmit(form); }}>
      <div>
        <label className="label">Nom de la tâche *</label>
        <input className="input" required value={form.name} onChange={set("name")} />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="label">Date de début</label>
          <input type="date" className="input" value={form.start_date} onChange={set("start_date")} />
        </div>
        <div>
          <label className="label">Date de fin</label>
          <input type="date" className="input" value={form.end_date} onChange={set("end_date")} />
        </div>
        <div>
          <label className="label">Jours vendus</label>
          <input type="number" step="0.5" min="0" className="input" value={form.days_sold} onChange={set("days_sold")} />
        </div>
        <div>
          <label className="label">Prix de vente (€)</label>
          <input type="number" step="100" min="0" className="input" value={form.sale_price} onChange={set("sale_price")} />
        </div>
      </div>
      <div>
        <label className="label">Description</label>
        <textarea className="input h-20 resize-none" value={form.description} onChange={set("description")} />
      </div>
      <div className="flex justify-end gap-2">
        <button type="button" onClick={onClose} className="btn-secondary">Annuler</button>
        <button type="submit" className="btn-primary">Enregistrer</button>
      </div>
    </form>
  );
}

function AssignmentForm({
  taskId, initial, onSubmit, onClose,
}: {
  taskId: number;
  initial?: Partial<TaskAssignment>;
  onSubmit: (data: any) => void;
  onClose: () => void;
}) {
  const { data: collaborators = [] } = useQuery({ queryKey: ["collaborators"], queryFn: getCollaborators });
  const { data: refs } = useQuery({ queryKey: ["refs"], queryFn: getReferentials });

  const [mode, setMode] = useState<"collaborator" | "profile">(
    initial?.profile ? "profile" : "collaborator"
  );
  const [form, setForm] = useState({
    collaborator_id: initial?.collaborator_id ?? "",
    profile: initial?.profile ?? "",
    days_assigned: initial?.days_assigned ?? 0,
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const data: any = { days_assigned: form.days_assigned };
    if (mode === "collaborator") {
      data.collaborator_id = parseInt(form.collaborator_id as any);
    } else {
      data.profile = form.profile;
    }
    onSubmit(data);
  };

  return (
    <form className="p-6 space-y-4" onSubmit={handleSubmit}>
      <div className="flex gap-2 mb-2">
        <button type="button"
          className={`flex-1 py-2 rounded text-sm font-medium border transition-colors ${mode === "collaborator" ? "bg-blue-50 border-blue-500 text-blue-700" : "border-gray-200 text-gray-500 hover:bg-gray-50"}`}
          onClick={() => setMode("collaborator")}
        >Collaborateur</button>
        <button type="button"
          className={`flex-1 py-2 rounded text-sm font-medium border transition-colors ${mode === "profile" ? "bg-blue-50 border-blue-500 text-blue-700" : "border-gray-200 text-gray-500 hover:bg-gray-50"}`}
          onClick={() => setMode("profile")}
        >Profil (à affecter)</button>
      </div>

      {mode === "collaborator" ? (
        <div>
          <label className="label">Collaborateur *</label>
          <select className="input" required value={form.collaborator_id} onChange={(e) => setForm((f) => ({ ...f, collaborator_id: e.target.value }))}>
            <option value="">Sélectionner...</option>
            {collaborators.map((c) => (
              <option key={c.id} value={c.id}>{c.name} — {c.profile}</option>
            ))}
          </select>
        </div>
      ) : (
        <div>
          <label className="label">Profil requis *</label>
          <select className="input" required value={form.profile} onChange={(e) => setForm((f) => ({ ...f, profile: e.target.value }))}>
            <option value="">Sélectionner...</option>
            {refs?.profiles.map((p) => (
              <option key={p.value} value={p.value}>{p.label}</option>
            ))}
          </select>
        </div>
      )}

      <div>
        <label className="label">Jours affectés</label>
        <input
          type="number" step="0.5" min="0" className="input"
          value={form.days_assigned}
          onChange={(e) => setForm((f) => ({ ...f, days_assigned: parseFloat(e.target.value) || 0 }))}
        />
      </div>

      <div className="flex justify-end gap-2">
        <button type="button" onClick={onClose} className="btn-secondary">Annuler</button>
        <button type="submit" className="btn-primary">Enregistrer</button>
      </div>
    </form>
  );
}

function TaskCard({ task, projectId, refs }: { task: Task; projectId: number; refs: any }) {
  const qc = useQueryClient();
  const [showEdit, setShowEdit] = useState(false);
  const [showAssign, setShowAssign] = useState(false);
  const [editAssignment, setEditAssignment] = useState<TaskAssignment | null>(null);

  const deleteMut = useMutation({ mutationFn: deleteTask, onSuccess: () => qc.invalidateQueries({ queryKey: ["project", projectId] }) });
  const updateMut = useMutation({ mutationFn: ({ id, data }: any) => updateTask(id, data), onSuccess: () => { qc.invalidateQueries({ queryKey: ["project", projectId] }); setShowEdit(false); } });
  const createAssignMut = useMutation({ mutationFn: ({ data }: any) => createAssignment(task.id, data), onSuccess: () => { qc.invalidateQueries({ queryKey: ["project", projectId] }); setShowAssign(false); } });
  const updateAssignMut = useMutation({ mutationFn: ({ id, data }: any) => updateAssignment(id, data), onSuccess: () => { qc.invalidateQueries({ queryKey: ["project", projectId] }); setEditAssignment(null); } });
  const deleteAssignMut = useMutation({ mutationFn: deleteAssignment, onSuccess: () => qc.invalidateQueries({ queryKey: ["project", projectId] }) });
  const distributeMut = useMutation({ mutationFn: () => autoDistribute(task.id), onSuccess: () => qc.invalidateQueries({ queryKey: ["project", projectId] }) });

  const totalAssigned = task.assignments.reduce((s, a) => s + a.days_assigned, 0);
  const unaffected = task.days_sold - totalAssigned;
  const dailyRate = task.days_sold > 0 ? task.sale_price / task.days_sold : 0;

  const profileLabel = (key: string) => refs?.profiles?.find((p: any) => p.value === key)?.label ?? key;

  return (
    <div className="bg-gray-50 rounded-lg border border-gray-200 overflow-hidden">
      <div className="p-4">
        <div className="flex items-start justify-between">
          <div>
            <h4 className="font-semibold text-gray-900">{task.name}</h4>
            {task.description && <p className="text-sm text-gray-500 mt-0.5">{task.description}</p>}
            <div className="flex gap-4 mt-2 text-xs text-gray-500">
              {task.start_date && <span>Du {task.start_date}</span>}
              {task.end_date && <span>au {task.end_date}</span>}
              <span className="font-medium text-gray-700">{task.days_sold} j vendus</span>
              {task.sale_price > 0 && <span>{task.sale_price.toLocaleString("fr")} € ({dailyRate.toFixed(0)} €/j)</span>}
            </div>
          </div>
          <div className="flex gap-2 text-sm">
            <button onClick={() => distributeMut.mutate()} className="text-purple-600 hover:text-purple-800" title="Répartir automatiquement">⚡ Auto</button>
            <button onClick={() => setShowEdit(true)} className="text-blue-600 hover:text-blue-800">Modifier</button>
            <button onClick={() => { if (confirm("Supprimer cette tâche ?")) deleteMut.mutate(task.id); }} className="text-red-400 hover:text-red-600">Supprimer</button>
          </div>
        </div>

        {/* Assignments */}
        <div className="mt-3">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">Affectations</span>
            <div className="flex items-center gap-3">
              <span className={`text-xs font-medium ${unaffected > 0.01 ? "text-amber-600" : "text-green-600"}`}>
                {unaffected > 0.01 ? `${unaffected.toFixed(1)} j non affectés` : "Entièrement affecté ✓"}
              </span>
              <button onClick={() => setShowAssign(true)} className="text-xs text-blue-600 hover:text-blue-800">+ Ajouter</button>
            </div>
          </div>

          {task.assignments.length === 0 ? (
            <p className="text-xs text-gray-400 italic">Aucune affectation</p>
          ) : (
            <div className="space-y-1">
              {task.assignments.map((a) => (
                <div key={a.id} className="flex items-center justify-between bg-white rounded px-3 py-1.5 text-sm">
                  <div className="flex items-center gap-2">
                    {a.collaborator ? (
                      <>
                        <span
                          className="w-2 h-2 rounded-full"
                          style={{ backgroundColor: a.collaborator.color }}
                        />
                        <span className="font-medium">{a.collaborator.name}</span>
                        <span className="text-gray-400 text-xs">{a.collaborator.profile}</span>
                      </>
                    ) : (
                      <>
                        <span className="w-2 h-2 rounded-full bg-amber-400" />
                        <span className="text-amber-700 font-medium">Profil: {profileLabel(a.profile ?? "")}</span>
                      </>
                    )}
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-medium">{a.days_assigned} j</span>
                    {a.collaborator && a.collaborator.daily_cost > 0 && (
                      <span className="text-green-600 text-xs">
                        marge: {(task.days_sold > 0 ? ((task.sale_price / task.days_sold) - a.collaborator.daily_cost) * a.days_assigned : 0).toFixed(0)} €
                      </span>
                    )}
                    <button onClick={() => setEditAssignment(a)} className="text-xs text-blue-500 hover:text-blue-700">✏️</button>
                    <button onClick={() => { if (confirm("Supprimer cette affectation ?")) deleteAssignMut.mutate(a.id); }} className="text-xs text-red-400 hover:text-red-600">✕</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {showEdit && (
        <Modal title="Modifier la tâche" onClose={() => setShowEdit(false)}>
          <TaskForm
            projectId={projectId}
            initial={task}
            onSubmit={(data) => updateMut.mutate({ id: task.id, data })}
            onClose={() => setShowEdit(false)}
          />
        </Modal>
      )}

      {showAssign && (
        <Modal title="Ajouter une affectation" onClose={() => setShowAssign(false)}>
          <AssignmentForm
            taskId={task.id}
            onSubmit={(data) => createAssignMut.mutate({ data })}
            onClose={() => setShowAssign(false)}
          />
        </Modal>
      )}

      {editAssignment && (
        <Modal title="Modifier l'affectation" onClose={() => setEditAssignment(null)}>
          <AssignmentForm
            taskId={task.id}
            initial={editAssignment}
            onSubmit={(data) => updateAssignMut.mutate({ id: editAssignment.id, data })}
            onClose={() => setEditAssignment(null)}
          />
        </Modal>
      )}
    </div>
  );
}

export default function ProjectDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const projectId = parseInt(id!);
  const [showEditProject, setShowEditProject] = useState(false);
  const [showAddTask, setShowAddTask] = useState(false);

  const { data: project, isLoading } = useQuery({
    queryKey: ["project", projectId],
    queryFn: () => getProject(projectId),
  });
  const { data: refs } = useQuery({ queryKey: ["refs"], queryFn: getReferentials });

  const updateMut = useMutation({
    mutationFn: (data: any) => updateProject(projectId, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["project", projectId] }); qc.invalidateQueries({ queryKey: ["projects"] }); setShowEditProject(false); },
  });
  const deleteMut = useMutation({
    mutationFn: () => deleteProject(projectId),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["projects"] }); navigate("/projects"); },
  });
  const addTaskMut = useMutation({
    mutationFn: createTask,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["project", projectId] }); setShowAddTask(false); },
  });

  if (isLoading) return <div className="p-6 text-gray-500">Chargement...</div>;
  if (!project) return <div className="p-6 text-red-500">Projet introuvable</div>;

  const probInfo = refs?.probabilities.find((p) => p.value === project.probability);
  const typeLabel = refs?.project_types.find((t) => t.value === project.type)?.label ?? project.type;
  const statusLabel = refs?.statuses.find((s) => s.value === project.status)?.label ?? project.status;
  const totalSold = project.tasks.reduce((s, t) => s + t.days_sold, 0);
  const totalAssigned = project.tasks.reduce((s, t) => s + t.assignments.reduce((sa, a) => sa + a.days_assigned, 0), 0);
  const totalRevenue = project.tasks.reduce((s, t) => s + t.sale_price, 0);

  return (
    <div className="p-6 max-w-5xl mx-auto">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-gray-500 mb-4">
        <Link to="/projects" className="hover:text-blue-600">Projets</Link>
        <span>/</span>
        <span className="text-gray-900 font-medium">{project.name}</span>
      </div>

      {/* Project header */}
      <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <h1 className="text-2xl font-bold text-gray-900">{project.name}</h1>
              <span
                className="text-sm px-2 py-0.5 rounded font-medium"
                style={{ backgroundColor: (probInfo?.color ?? "#888") + "22", color: probInfo?.color }}
              >
                {probInfo?.label} ({probInfo?.percent}%)
              </span>
              <span className="text-sm bg-gray-100 text-gray-600 px-2 py-0.5 rounded">{typeLabel}</span>
              <span className="text-sm bg-gray-100 text-gray-600 px-2 py-0.5 rounded">{statusLabel}</span>
            </div>
            {project.client && <p className="text-gray-500">Client : {project.client}</p>}
            {project.description && <p className="text-gray-600 mt-2">{project.description}</p>}
            {(project.start_date || project.end_date) && (
              <p className="text-sm text-gray-400 mt-1">
                {project.start_date} → {project.end_date}
              </p>
            )}
          </div>
          <div className="flex gap-2">
            <button onClick={() => setShowEditProject(true)} className="btn-secondary">Modifier</button>
            <button onClick={() => { if (confirm("Supprimer ce projet ?")) deleteMut.mutate(); }} className="btn-danger">Supprimer</button>
          </div>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-4 gap-4 mt-5 pt-5 border-t border-gray-100">
          <div>
            <p className="text-xs text-gray-400">Jours vendus</p>
            <p className="text-xl font-bold text-gray-900">{totalSold.toFixed(1)} j</p>
          </div>
          <div>
            <p className="text-xs text-gray-400">Jours affectés</p>
            <p className={`text-xl font-bold ${totalAssigned < totalSold ? "text-amber-600" : "text-green-600"}`}>{totalAssigned.toFixed(1)} j</p>
          </div>
          <div>
            <p className="text-xs text-gray-400">Non affectés</p>
            <p className={`text-xl font-bold ${totalSold - totalAssigned > 0.01 ? "text-amber-600" : "text-green-600"}`}>{(totalSold - totalAssigned).toFixed(1)} j</p>
          </div>
          <div>
            <p className="text-xs text-gray-400">CA prévisionnel</p>
            <p className="text-xl font-bold text-gray-900">{totalRevenue.toLocaleString("fr")} €</p>
          </div>
        </div>
      </div>

      {/* Tasks */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">Tâches ({project.tasks.length})</h2>
          <button onClick={() => setShowAddTask(true)} className="btn-primary">+ Ajouter une tâche</button>
        </div>

        {project.tasks.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-xl text-gray-400">
            <p className="text-3xl mb-2">📋</p>
            <p>Aucune tâche. Commencez par en ajouter une.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {project.tasks.map((task) => (
              <TaskCard key={task.id} task={task} projectId={projectId} refs={refs} />
            ))}
          </div>
        )}
      </div>

      {showEditProject && (
        <Modal title="Modifier le projet" onClose={() => setShowEditProject(false)} size="lg">
          <ProjectForm
            initial={project}
            onSubmit={(data) => updateMut.mutate(data)}
            onClose={() => setShowEditProject(false)}
          />
        </Modal>
      )}

      {showAddTask && (
        <Modal title="Nouvelle tâche" onClose={() => setShowAddTask(false)}>
          <TaskForm
            projectId={projectId}
            onSubmit={(data) => addTaskMut.mutate(data)}
            onClose={() => setShowAddTask(false)}
          />
        </Modal>
      )}
    </div>
  );
}

// Inline ProjectForm for the edit modal
function ProjectForm({
  initial, onSubmit, onClose,
}: {
  initial?: any;
  onSubmit: (data: any) => void;
  onClose: () => void;
}) {
  const { data: refs } = useQuery({ queryKey: ["refs"], queryFn: getReferentials });
  const [form, setForm] = useState({
    name: initial?.name ?? "",
    client: initial?.client ?? "",
    description: initial?.description ?? "",
    type: initial?.type ?? "forfait",
    probability: initial?.probability ?? "proposition",
    status: initial?.status ?? "active",
    start_date: initial?.start_date ?? "",
    end_date: initial?.end_date ?? "",
  });
  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  return (
    <form className="p-6 space-y-4" onSubmit={(e) => { e.preventDefault(); onSubmit(form); }}>
      <div className="grid grid-cols-2 gap-4">
        <div className="col-span-2">
          <label className="label">Nom du projet *</label>
          <input className="input" required value={form.name} onChange={set("name")} />
        </div>
        <div><label className="label">Client</label><input className="input" value={form.client} onChange={set("client")} /></div>
        <div>
          <label className="label">Type *</label>
          <select className="input" value={form.type} onChange={set("type")}>
            {refs?.project_types.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
          </select>
        </div>
        <div>
          <label className="label">Probabilité *</label>
          <select className="input" value={form.probability} onChange={set("probability")}>
            {refs?.probabilities.map((p) => <option key={p.value} value={p.value}>{p.label} ({p.percent}%)</option>)}
          </select>
        </div>
        <div>
          <label className="label">Statut *</label>
          <select className="input" value={form.status} onChange={set("status")}>
            {refs?.statuses.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
          </select>
        </div>
        <div><label className="label">Date de début</label><input type="date" className="input" value={form.start_date} onChange={set("start_date")} /></div>
        <div><label className="label">Date de fin</label><input type="date" className="input" value={form.end_date} onChange={set("end_date")} /></div>
        <div className="col-span-2">
          <label className="label">Description</label>
          <textarea className="input h-20 resize-none" value={form.description} onChange={set("description")} />
        </div>
      </div>
      <div className="flex justify-end gap-2">
        <button type="button" onClick={onClose} className="btn-secondary">Annuler</button>
        <button type="submit" className="btn-primary">Enregistrer</button>
      </div>
    </form>
  );
}
