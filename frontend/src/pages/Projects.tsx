import { useState } from "react";
import { Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getProjects, createProject, deleteProject, getReferentials } from "../api/client";
import Modal from "../components/Modal";
import type { ProjectSummary } from "../types";

const PROB_COLORS: Record<string, string> = {
  signe: "#16a34a",
  fort: "#2563eb",
  proposition: "#7c3aed",
  prospection: "#ea580c",
  identification: "#dc2626",
};

function ProjectForm({
  initial,
  onSubmit,
  onClose,
}: {
  initial?: Partial<ProjectSummary>;
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
    <form
      className="p-6 space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit(form);
      }}
    >
      <div className="grid grid-cols-2 gap-4">
        <div className="col-span-2">
          <label className="label">Nom du projet *</label>
          <input className="input" required value={form.name} onChange={set("name")} placeholder="Nom du projet" />
        </div>
        <div>
          <label className="label">Client</label>
          <input className="input" value={form.client} onChange={set("client")} placeholder="Client" />
        </div>
        <div>
          <label className="label">Type *</label>
          <select className="input" value={form.type} onChange={set("type")}>
            {refs?.project_types.map((t) => (
              <option key={t.value} value={t.value}>{t.label}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="label">Probabilité *</label>
          <select className="input" value={form.probability} onChange={set("probability")}>
            {refs?.probabilities.map((p) => (
              <option key={p.value} value={p.value}>{p.label} ({p.percent}%)</option>
            ))}
          </select>
        </div>
        <div>
          <label className="label">Statut *</label>
          <select className="input" value={form.status} onChange={set("status")}>
            {refs?.statuses.map((s) => (
              <option key={s.value} value={s.value}>{s.label}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="label">Date de début</label>
          <input type="date" className="input" value={form.start_date} onChange={set("start_date")} />
        </div>
        <div>
          <label className="label">Date de fin</label>
          <input type="date" className="input" value={form.end_date} onChange={set("end_date")} />
        </div>
        <div className="col-span-2">
          <label className="label">Description</label>
          <textarea className="input h-20 resize-none" value={form.description} onChange={set("description")} placeholder="Description..." />
        </div>
      </div>
      <div className="flex justify-end gap-2 pt-2">
        <button type="button" onClick={onClose} className="btn-secondary">Annuler</button>
        <button type="submit" className="btn-primary">Enregistrer</button>
      </div>
    </form>
  );
}

export default function Projects() {
  const qc = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);
  const [search, setSearch] = useState("");
  const [filterProb, setFilterProb] = useState("");
  const [filterType, setFilterType] = useState("");

  const { data: projects = [], isLoading } = useQuery({
    queryKey: ["projects"],
    queryFn: getProjects,
  });
  const { data: refs } = useQuery({ queryKey: ["refs"], queryFn: getReferentials });

  const createMut = useMutation({
    mutationFn: createProject,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["projects"] });
      setShowCreate(false);
    },
  });

  const deleteMut = useMutation({
    mutationFn: deleteProject,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["projects"] }),
  });

  const filtered = projects.filter((p) => {
    if (search && !p.name.toLowerCase().includes(search.toLowerCase()) && !p.client?.toLowerCase().includes(search.toLowerCase())) return false;
    if (filterProb && p.probability !== filterProb) return false;
    if (filterType && p.type !== filterType) return false;
    return true;
  });

  const probLabel = (key: string) => refs?.probabilities.find((p) => p.value === key)?.label ?? key;
  const typeLabel = (key: string) => refs?.project_types.find((t) => t.value === key)?.label ?? key;

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Projets</h1>
          <p className="text-sm text-gray-500 mt-0.5">{projects.length} projet(s)</p>
        </div>
        <button className="btn-primary" onClick={() => setShowCreate(true)}>
          + Nouveau projet
        </button>
      </div>

      {/* Filters */}
      <div className="flex gap-3 mb-5">
        <input
          className="input w-64"
          placeholder="Rechercher..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <select className="input w-44" value={filterProb} onChange={(e) => setFilterProb(e.target.value)}>
          <option value="">Toutes probabilités</option>
          {refs?.probabilities.map((p) => (
            <option key={p.value} value={p.value}>{p.label}</option>
          ))}
        </select>
        <select className="input w-36" value={filterType} onChange={(e) => setFilterType(e.target.value)}>
          <option value="">Tous types</option>
          {refs?.project_types.map((t) => (
            <option key={t.value} value={t.value}>{t.label}</option>
          ))}
        </select>
      </div>

      {isLoading ? (
        <p className="text-gray-500">Chargement...</p>
      ) : (
        <div className="space-y-2">
          {filtered.map((p) => {
            const unaffected = p.days_sold_total - p.days_assigned_total;
            return (
              <div key={p.id} className="bg-white rounded-xl shadow-sm border border-gray-100 hover:border-blue-200 transition-colors">
                <div className="p-4 flex items-center gap-4">
                  {/* Probability dot */}
                  <div
                    className="w-3 h-3 rounded-full shrink-0"
                    style={{ backgroundColor: PROB_COLORS[p.probability] }}
                    title={probLabel(p.probability)}
                  />

                  {/* Main info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <Link
                        to={`/projects/${p.id}`}
                        className="font-semibold text-gray-900 hover:text-blue-600 truncate"
                      >
                        {p.name}
                      </Link>
                      <span
                        className="shrink-0 text-xs px-1.5 py-0.5 rounded"
                        style={{ backgroundColor: PROB_COLORS[p.probability] + "22", color: PROB_COLORS[p.probability] }}
                      >
                        {probLabel(p.probability)}
                      </span>
                      <span className="shrink-0 text-xs bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded">
                        {typeLabel(p.type)}
                      </span>
                    </div>
                    <div className="text-sm text-gray-500 mt-0.5">{p.client || "—"}</div>
                  </div>

                  {/* Stats */}
                  <div className="flex gap-6 text-sm text-right">
                    <div>
                      <p className="text-gray-400 text-xs">Tâches</p>
                      <p className="font-medium">{p.tasks_count}</p>
                    </div>
                    <div>
                      <p className="text-gray-400 text-xs">Jours vendus</p>
                      <p className="font-medium">{p.days_sold_total.toFixed(1)} j</p>
                    </div>
                    <div>
                      <p className="text-gray-400 text-xs">Non affectés</p>
                      <p className={`font-medium ${unaffected > 0.01 ? "text-amber-600" : "text-green-600"}`}>
                        {unaffected.toFixed(1)} j
                      </p>
                    </div>
                    <div>
                      <p className="text-gray-400 text-xs">CA</p>
                      <p className="font-medium">{(p.revenue_total / 1000).toFixed(0)}k€</p>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2 shrink-0">
                    <Link
                      to={`/projects/${p.id}`}
                      className="text-sm text-blue-600 hover:text-blue-800 font-medium"
                    >
                      Voir
                    </Link>
                    <button
                      onClick={() => {
                        if (confirm(`Supprimer "${p.name}" ?`)) deleteMut.mutate(p.id);
                      }}
                      className="text-sm text-red-400 hover:text-red-600"
                    >
                      Supprimer
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
          {filtered.length === 0 && (
            <div className="text-center py-16 text-gray-400">
              <p className="text-4xl mb-2">📁</p>
              <p>Aucun projet trouvé</p>
            </div>
          )}
        </div>
      )}

      {showCreate && (
        <Modal title="Nouveau projet" onClose={() => setShowCreate(false)} size="lg">
          <ProjectForm
            onSubmit={(data) => createMut.mutate(data)}
            onClose={() => setShowCreate(false)}
          />
        </Modal>
      )}
    </div>
  );
}
