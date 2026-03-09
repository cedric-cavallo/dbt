import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getCollaborators, createCollaborator, updateCollaborator, deleteCollaborator,
  getAbsences, createAbsence, updateAbsence, deleteAbsence, getReferentials,
} from "../api/client";
import Modal from "../components/Modal";
import type { Collaborator, Absence } from "../types";

const COLORS = ["#3B82F6","#10B981","#8B5CF6","#F59E0B","#EF4444","#06B6D4","#84CC16","#F97316","#EC4899","#6366F1"];

function CollaboratorForm({
  initial, onSubmit, onClose,
}: { initial?: Partial<Collaborator>; onSubmit: (d: any) => void; onClose: () => void }) {
  const { data: refs } = useQuery({ queryKey: ["refs"], queryFn: getReferentials });
  const defaultProfiles = initial?.profiles && initial.profiles.length > 0
    ? initial.profiles
    : initial?.profile ? [initial.profile] : ["consultant"];
  const [profiles, setProfiles] = useState<string[]>(defaultProfiles);
  const [form, setForm] = useState({
    name: initial?.name ?? "",
    email: initial?.email ?? "",
    daily_cost: initial?.daily_cost ?? 0,
    color: initial?.color ?? COLORS[Math.floor(Math.random() * COLORS.length)],
    is_active: initial?.is_active ?? true,
  });
  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.type === "number" ? parseFloat(e.target.value) || 0 : e.target.value }));

  const toggleProfile = (value: string) => {
    setProfiles((prev) =>
      prev.includes(value)
        ? prev.length > 1 ? prev.filter((p) => p !== value) : prev
        : [...prev, value]
    );
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({ ...form, profile: profiles[0], profiles });
  };

  return (
    <form className="p-6 space-y-4" onSubmit={handleSubmit}>
      <div className="grid grid-cols-2 gap-4">
        <div className="col-span-2">
          <label className="label">Nom *</label>
          <input className="input" required value={form.name} onChange={set("name")} placeholder="Prénom Nom" />
        </div>
        <div>
          <label className="label">Email</label>
          <input type="email" className="input" value={form.email} onChange={set("email")} />
        </div>
        <div className="col-span-2">
          <label className="label">Profil(s) * <span className="text-gray-400 font-normal">(au moins 1)</span></label>
          <div className="flex flex-wrap gap-2 mt-1">
            {refs?.profiles.map((p) => (
              <button
                key={p.value}
                type="button"
                onClick={() => toggleProfile(p.value)}
                className="px-3 py-1 rounded-full text-sm border transition-colors"
                style={
                  profiles.includes(p.value)
                    ? { backgroundColor: "#2563eb", borderColor: "#2563eb", color: "#fff" }
                    : { backgroundColor: "#f9fafb", borderColor: "#e5e7eb", color: "#374151" }
                }
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>
        <div>
          <label className="label">Coût journalier (€)</label>
          <input type="number" step="10" min="0" className="input" value={form.daily_cost} onChange={set("daily_cost")} />
        </div>
        <div>
          <label className="label">Couleur</label>
          <div className="flex gap-2 flex-wrap mt-1">
            {COLORS.map((c) => (
              <button
                key={c} type="button"
                onClick={() => setForm((f) => ({ ...f, color: c }))}
                className="w-7 h-7 rounded-full border-2 transition-transform hover:scale-110"
                style={{ backgroundColor: c, borderColor: form.color === c ? "#1d4ed8" : "transparent" }}
              />
            ))}
          </div>
        </div>
      </div>
      <div className="flex justify-end gap-2">
        <button type="button" onClick={onClose} className="btn-secondary">Annuler</button>
        <button type="submit" className="btn-primary">Enregistrer</button>
      </div>
    </form>
  );
}

function AbsenceForm({
  collaboratorId, initial, onSubmit, onClose,
}: { collaboratorId: number; initial?: Partial<Absence>; onSubmit: (d: any) => void; onClose: () => void }) {
  const { data: refs } = useQuery({ queryKey: ["refs"], queryFn: getReferentials });
  const [form, setForm] = useState({
    collaborator_id: collaboratorId,
    start_date: initial?.start_date ?? "",
    end_date: initial?.end_date ?? "",
    type: initial?.type ?? "conges",
    description: initial?.description ?? "",
  });
  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  return (
    <form className="p-6 space-y-4" onSubmit={(e) => { e.preventDefault(); onSubmit(form); }}>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="label">Début *</label>
          <input type="date" className="input" required value={form.start_date} onChange={set("start_date")} />
        </div>
        <div>
          <label className="label">Fin *</label>
          <input type="date" className="input" required value={form.end_date} onChange={set("end_date")} />
        </div>
        <div className="col-span-2">
          <label className="label">Type *</label>
          <select className="input" value={form.type} onChange={set("type")}>
            {refs?.absence_types.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
          </select>
        </div>
        <div className="col-span-2">
          <label className="label">Commentaire</label>
          <input className="input" value={form.description} onChange={set("description")} placeholder="Optionnel" />
        </div>
      </div>
      <div className="flex justify-end gap-2">
        <button type="button" onClick={onClose} className="btn-secondary">Annuler</button>
        <button type="submit" className="btn-primary">Enregistrer</button>
      </div>
    </form>
  );
}

function CollaboratorCard({ collab }: { collab: Collaborator }) {
  const qc = useQueryClient();
  const { data: refs } = useQuery({ queryKey: ["refs"], queryFn: getReferentials });
  const { data: absences = [] } = useQuery({
    queryKey: ["absences", collab.id],
    queryFn: () => getAbsences(collab.id),
  });

  const [showEdit, setShowEdit] = useState(false);
  const [showAbsence, setShowAbsence] = useState(false);
  const [editAbsence, setEditAbsence] = useState<Absence | null>(null);

  const updateMut = useMutation({
    mutationFn: (d: any) => updateCollaborator(collab.id, d),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["collaborators"] }); setShowEdit(false); },
  });
  const deleteMut = useMutation({
    mutationFn: () => deleteCollaborator(collab.id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["collaborators"] }),
  });
  const createAbsMut = useMutation({
    mutationFn: createAbsence,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["absences", collab.id] }); setShowAbsence(false); },
  });
  const updateAbsMut = useMutation({
    mutationFn: ({ id, data }: any) => updateAbsence(id, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["absences", collab.id] }); setEditAbsence(null); },
  });
  const deleteAbsMut = useMutation({
    mutationFn: deleteAbsence,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["absences", collab.id] }),
  });

  const profileLabels = (collab.profiles && collab.profiles.length > 0 ? collab.profiles : [collab.profile])
    .map((p) => refs?.profiles.find((r) => r.value === p)?.label ?? p);

  const upcomingAbsences = absences
    .filter((a) => a.end_date >= new Date().toISOString().split("T")[0])
    .sort((a, b) => a.start_date.localeCompare(b.start_date));

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
      <div className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm"
              style={{ backgroundColor: collab.color }}
            >
              {collab.name.split(" ").map((n) => n[0]).slice(0, 2).join("")}
            </div>
            <div>
              <h3 className="font-semibold text-gray-900">{collab.name}</h3>
              <div className="flex flex-wrap gap-1 mt-0.5">
                {profileLabels.map((label) => (
                  <span key={label} className="text-xs px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-100">
                    {label}
                  </span>
                ))}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-4">
            {collab.daily_cost > 0 && (
              <span className="text-sm text-gray-500">{collab.daily_cost} €/j</span>
            )}
            {collab.email && (
              <a href={`mailto:${collab.email}`} className="text-sm text-blue-500 hover:text-blue-700">{collab.email}</a>
            )}
            <button onClick={() => setShowEdit(true)} className="text-sm text-blue-600 hover:text-blue-800">Modifier</button>
            <button onClick={() => { if (confirm("Supprimer ce collaborateur ?")) deleteMut.mutate(); }} className="text-sm text-red-400 hover:text-red-600">Supprimer</button>
          </div>
        </div>

        {/* Absences */}
        <div className="mt-4 border-t border-gray-100 pt-3">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">
              Absences à venir ({upcomingAbsences.length})
            </span>
            <button onClick={() => setShowAbsence(true)} className="text-xs text-blue-600 hover:text-blue-800">+ Ajouter</button>
          </div>
          {upcomingAbsences.length === 0 ? (
            <p className="text-xs text-gray-400 italic">Aucune absence planifiée</p>
          ) : (
            <div className="space-y-1">
              {upcomingAbsences.map((a) => {
                const typeLabel = refs?.absence_types.find((t) => t.value === a.type)?.label ?? a.type;
                return (
                  <div key={a.id} className="flex items-center justify-between bg-gray-50 rounded px-3 py-1.5 text-xs">
                    <span className="font-medium text-gray-700">{typeLabel}</span>
                    <span className="text-gray-500">{a.start_date} → {a.end_date}</span>
                    {a.description && <span className="text-gray-400">{a.description}</span>}
                    <div className="flex gap-2">
                      <button onClick={() => setEditAbsence(a)} className="text-blue-500 hover:text-blue-700">✏️</button>
                      <button onClick={() => { if (confirm("Supprimer cette absence ?")) deleteAbsMut.mutate(a.id); }} className="text-red-400 hover:text-red-600">✕</button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {showEdit && (
        <Modal title="Modifier le collaborateur" onClose={() => setShowEdit(false)}>
          <CollaboratorForm initial={collab} onSubmit={(d) => updateMut.mutate(d)} onClose={() => setShowEdit(false)} />
        </Modal>
      )}
      {showAbsence && (
        <Modal title="Nouvelle absence" onClose={() => setShowAbsence(false)}>
          <AbsenceForm collaboratorId={collab.id} onSubmit={(d) => createAbsMut.mutate(d)} onClose={() => setShowAbsence(false)} />
        </Modal>
      )}
      {editAbsence && (
        <Modal title="Modifier l'absence" onClose={() => setEditAbsence(null)}>
          <AbsenceForm
            collaboratorId={collab.id}
            initial={editAbsence}
            onSubmit={(d) => updateAbsMut.mutate({ id: editAbsence.id, data: d })}
            onClose={() => setEditAbsence(null)}
          />
        </Modal>
      )}
    </div>
  );
}

export default function Team() {
  const qc = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);
  const { data: collaborators = [], isLoading } = useQuery({
    queryKey: ["collaborators"],
    queryFn: getCollaborators,
  });
  const createMut = useMutation({
    mutationFn: createCollaborator,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["collaborators"] }); setShowCreate(false); },
  });

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Équipe</h1>
          <p className="text-sm text-gray-500 mt-0.5">{collaborators.length} collaborateur(s)</p>
        </div>
        <button className="btn-primary" onClick={() => setShowCreate(true)}>+ Nouveau collaborateur</button>
      </div>

      {isLoading ? (
        <p className="text-gray-500">Chargement...</p>
      ) : collaborators.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <p className="text-4xl mb-2">👥</p>
          <p>Aucun collaborateur. Commencez par en ajouter un.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {collaborators.map((c) => (
            <CollaboratorCard key={c.id} collab={c} />
          ))}
        </div>
      )}

      {showCreate && (
        <Modal title="Nouveau collaborateur" onClose={() => setShowCreate(false)}>
          <CollaboratorForm onSubmit={(d) => createMut.mutate(d)} onClose={() => setShowCreate(false)} />
        </Modal>
      )}
    </div>
  );
}
