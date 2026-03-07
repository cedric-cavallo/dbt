import { useQuery } from "@tanstack/react-query";
import { format, startOfMonth, endOfMonth, startOfYear, endOfYear } from "date-fns";
import { fr } from "date-fns/locale";
import { getProjects, getTeamSummary, getUnassigned } from "../api/client";

const now = new Date();
const periodStart = format(startOfMonth(now), "yyyy-MM-dd");
const periodEnd = format(endOfMonth(now), "yyyy-MM-dd");

function StatCard({ label, value, sub, color }: { label: string; value: string | number; sub?: string; color: string }) {
  return (
    <div className={`bg-white rounded-xl p-5 border-l-4 shadow-sm`} style={{ borderLeftColor: color }}>
      <p className="text-sm text-gray-500">{label}</p>
      <p className="text-3xl font-bold mt-1 text-gray-900">{value}</p>
      {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
    </div>
  );
}

export default function Dashboard() {
  const { data: projects = [] } = useQuery({ queryKey: ["projects"], queryFn: getProjects });
  const { data: summary } = useQuery({
    queryKey: ["team-summary", periodStart, periodEnd],
    queryFn: () => getTeamSummary({ start_date: periodStart, end_date: periodEnd, min_probability: 0 }),
  });
  const { data: unassigned = [] } = useQuery({
    queryKey: ["unassigned", periodStart, periodEnd],
    queryFn: () => getUnassigned({ start_date: periodStart, end_date: periodEnd, min_probability: 0 }),
  });

  const activeProjects = projects.filter((p) => p.status === "active");
  const signedProjects = projects.filter((p) => p.probability === "signe");
  const totalRevenue = projects.reduce((sum, p) => sum + p.revenue_total, 0);
  const unassignedDays = unassigned.reduce((sum: number, u: any) => sum + u.days_assigned, 0);

  const probabilityGroups = [
    { key: "signe", label: "Signé", color: "#16a34a" },
    { key: "fort", label: "Fort potentiel", color: "#2563eb" },
    { key: "proposition", label: "En proposition", color: "#7c3aed" },
    { key: "prospection", label: "En prospection", color: "#ea580c" },
    { key: "identification", label: "Identification", color: "#dc2626" },
  ];

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Tableau de bord</h1>
        <p className="text-gray-500 text-sm mt-1">
          Mois en cours : {format(now, "MMMM yyyy", { locale: fr })}
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Projets actifs" value={activeProjects.length} color="#3b82f6" />
        <StatCard label="Projets signés" value={signedProjects.length} color="#16a34a" />
        <StatCard
          label="CA prévisionnel"
          value={`${(totalRevenue / 1000).toFixed(0)}k€`}
          sub="Tous projets"
          color="#8b5cf6"
        />
        <StatCard
          label="Jours non affectés"
          value={unassignedDays.toFixed(1)}
          sub="À profil seulement"
          color="#f59e0b"
        />
      </div>

      {/* Capacity this month */}
      {summary && (
        <div className="bg-white rounded-xl shadow-sm p-5">
          <h2 className="text-lg font-semibold mb-4">Capacité équipe — {format(now, "MMMM yyyy", { locale: fr })}</h2>
          <div className="grid grid-cols-3 gap-6 mb-4">
            <div>
              <p className="text-sm text-gray-500">Capacité totale</p>
              <p className="text-2xl font-bold">{summary.total_capacity_days} j</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Jours affectés</p>
              <p className="text-2xl font-bold">{summary.total_assigned_days} j</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Taux d'occupation</p>
              <p
                className="text-2xl font-bold"
                style={{ color: summary.occupancy_rate > 100 ? "#dc2626" : summary.occupancy_rate > 80 ? "#ea580c" : "#16a34a" }}
              >
                {summary.occupancy_rate}%
              </p>
            </div>
          </div>

          {/* Progress bar */}
          <div className="w-full bg-gray-100 rounded-full h-3">
            <div
              className="h-3 rounded-full transition-all"
              style={{
                width: `${Math.min(summary.occupancy_rate, 100)}%`,
                backgroundColor: summary.occupancy_rate > 100 ? "#dc2626" : summary.occupancy_rate > 80 ? "#ea580c" : "#3b82f6",
              }}
            />
          </div>

          {summary.overloaded_collaborators.length > 0 && (
            <div className="mt-4">
              <p className="text-sm font-medium text-red-600 mb-2">
                ⚠️ {summary.overloaded_collaborators.length} collaborateur(s) surchargé(s)
              </p>
              <div className="flex flex-wrap gap-2">
                {summary.overloaded_collaborators.map((c) => (
                  <span key={c.id} className="bg-red-50 text-red-700 text-xs px-2 py-1 rounded">
                    {c.name} ({c.assigned}j / {c.capacity}j)
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Projects by probability */}
      <div className="bg-white rounded-xl shadow-sm p-5">
        <h2 className="text-lg font-semibold mb-4">Projets par probabilité</h2>
        <div className="space-y-3">
          {probabilityGroups.map((g) => {
            const count = projects.filter((p) => p.probability === g.key);
            const total_days = count.reduce((s, p) => s + p.days_sold_total, 0);
            return (
              <div key={g.key} className="flex items-center gap-3">
                <span
                  className="w-3 h-3 rounded-full shrink-0"
                  style={{ backgroundColor: g.color }}
                />
                <span className="text-sm w-36 text-gray-700">{g.label}</span>
                <span className="text-sm font-medium w-8 text-gray-900">{count.length}</span>
                <div className="flex-1 bg-gray-100 rounded-full h-2">
                  <div
                    className="h-2 rounded-full"
                    style={{
                      width: `${projects.length ? (count.length / projects.length) * 100 : 0}%`,
                      backgroundColor: g.color,
                    }}
                  />
                </div>
                <span className="text-xs text-gray-400 w-20 text-right">{total_days.toFixed(0)} j vendus</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Unassigned profile tasks */}
      {unassigned.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-5">
          <h2 className="text-lg font-semibold text-amber-900 mb-3">
            ⚠️ Tâches non affectées à un collaborateur ({unassigned.length})
          </h2>
          <div className="space-y-2">
            {unassigned.slice(0, 5).map((u: any) => (
              <div key={u.assignment_id} className="flex items-center justify-between text-sm bg-white rounded p-2">
                <span className="font-medium">{u.project_name}</span>
                <span className="text-gray-600">{u.task_name}</span>
                <span className="text-gray-500">{u.profile}</span>
                <span className="font-medium text-amber-700">{u.days_assigned} j</span>
              </div>
            ))}
            {unassigned.length > 5 && (
              <p className="text-xs text-amber-700">+{unassigned.length - 5} autres...</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
