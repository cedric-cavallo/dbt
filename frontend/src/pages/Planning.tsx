import { useState, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { format, startOfWeek, addWeeks, addMonths, startOfMonth, addDays, eachDayOfInterval, isWeekend } from "date-fns";
import { fr } from "date-fns/locale";
import { getPlanning, getTeamSummary, getUnassigned, getCollaborators, getReferentials } from "../api/client";
import type { CollaboratorPlanning, WeekLoad, WeekTask } from "../types";
import WeekDetailPanel from "../components/WeekDetailPanel";

// ── Helpers ────────────────────────────────────────────────────────────────────

function toIso(d: Date) {
  return format(d, "yyyy-MM-dd");
}

function loadColor(ratio: number): string {
  if (ratio === 0) return "#f9fafb";
  if (ratio <= 0.5) return "#dcfce7";
  if (ratio <= 0.8) return "#bbf7d0";
  if (ratio <= 1.0) return "#86efac";
  if (ratio <= 1.3) return "#fde68a";
  return "#fca5a5";
}

function loadTextColor(ratio: number): string {
  if (ratio > 1.0) return "#b91c1c";
  if (ratio > 0.8) return "#92400e";
  return "#166534";
}

const PROB_COLORS: Record<string, string> = {
  signe: "#16a34a",
  fort: "#2563eb",
  proposition: "#7c3aed",
  prospection: "#ea580c",
  identification: "#dc2626",
};

// ── Helpers vue journalière ─────────────────────────────────────────────────

type MonthGroup = { monthLabel: string; days: Date[] };

function buildWorkDays(start: Date, numWeeks: number): Date[] {
  const ws = startOfWeek(start, { weekStartsOn: 1 });
  const end = addDays(ws, numWeeks * 7 - 1);
  return eachDayOfInterval({ start: ws, end }).filter((d) => !isWeekend(d));
}

function groupDaysByMonth(days: Date[]): MonthGroup[] {
  const groups: MonthGroup[] = [];
  for (const day of days) {
    const label = format(day, "MMMM yyyy", { locale: fr });
    const last = groups[groups.length - 1];
    if (last && last.monthLabel === label) last.days.push(day);
    else groups.push({ monthLabel: label, days: [day] });
  }
  return groups;
}

function findWeekForDay(weeks: WeekLoad[], day: Date): WeekLoad | undefined {
  const iso = toIso(day);
  return weeks.find((w) => w.week_start <= iso && w.week_end >= iso);
}

// ── Tooltip ────────────────────────────────────────────────────────────────────

function Tooltip({ tasks, week }: { tasks: WeekTask[]; week: WeekLoad }) {
  return (
    <div className="absolute z-20 left-1/2 -translate-x-1/2 bottom-full mb-1 w-72 bg-gray-900 text-white rounded-lg p-3 shadow-xl text-xs pointer-events-none">
      <p className="font-semibold mb-1">
        Sem. {format(new Date(week.week_start), "dd/MM")} — {format(new Date(week.week_end), "dd/MM")}
      </p>
      <p className="text-gray-300 mb-2">
        {week.assigned_days.toFixed(1)} j / {week.available_days} j disponibles
        {week.overloaded && " ⚠️ SURCHARGE"}
      </p>
      {tasks.length === 0 ? (
        <p className="text-gray-400 italic">Aucune tâche</p>
      ) : (
        <div className="space-y-1">
          {tasks.map((t) => (
            <div key={t.assignment_id} className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: PROB_COLORS[t.probability_key] }} />
              <span className="flex-1 truncate">{t.project_name} — {t.task_name}</span>
              <span className="shrink-0 font-medium">{t.days_in_week.toFixed(1)}j</span>
              <span className="shrink-0 text-gray-400">({t.probability}%)</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Week cell ──────────────────────────────────────────────────────────────────

function WeekCell({ week, onClick }: { week: WeekLoad; onClick: () => void }) {
  const [hover, setHover] = useState(false);
  const ratio = week.available_days > 0 ? week.assigned_days / week.available_days : 0;
  const bg = loadColor(ratio);
  const textCol = loadTextColor(ratio);

  return (
    <td
      className="relative text-center border border-gray-100 p-0 cursor-pointer"
      style={{ minWidth: 96, height: 48 }}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      onClick={onClick}
    >
      <div
        className="h-full w-full flex items-center justify-center text-xs font-medium"
        style={{ backgroundColor: bg, color: textCol }}
      >
        {week.assigned_days > 0 ? (
          <span>
            {week.assigned_days.toFixed(1)}j / {week.available_days}j
            {week.overloaded && " ⚠️"}
          </span>
        ) : (
          <span className="text-gray-300">—</span>
        )}
      </div>
      {hover && week.tasks.length > 0 && (
        <Tooltip tasks={week.tasks} week={week} />
      )}
    </td>
  );
}

// ── Day cell ───────────────────────────────────────────────────────────────────

function DayCell({ week, onClick }: { week: WeekLoad | undefined; onClick: () => void }) {
  const [hover, setHover] = useState(false);

  if (!week) {
    return (
      <td
        className="border border-gray-100 p-0"
        style={{ minWidth: 52, height: 48, backgroundColor: "#f3f4f6" }}
      />
    );
  }

  const dailyAssigned = week.assigned_days / 5;
  const dailyAvailable = week.available_days / 5;
  const ratio = dailyAvailable > 0 ? dailyAssigned / dailyAvailable : 0;
  const bg = loadColor(ratio);
  const textCol = loadTextColor(ratio);

  return (
    <td
      className="relative text-center border border-gray-100 p-0 cursor-pointer"
      style={{ minWidth: 52, height: 48 }}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      onClick={onClick}
    >
      <div
        className="h-full w-full flex items-center justify-center text-[10px] font-medium"
        style={{ backgroundColor: bg, color: textCol }}
      >
        {dailyAssigned > 0.04 ? (
          <span>{dailyAssigned.toFixed(1)}</span>
        ) : (
          <span className="text-gray-300">—</span>
        )}
      </div>
      {hover && week.tasks.length > 0 && (
        <Tooltip tasks={week.tasks} week={week} />
      )}
    </td>
  );
}

// ── Gantt row (weekly) ─────────────────────────────────────────────────────────

function CollaboratorRow({
  data,
  weeks,
  profileLabel,
  onCellClick,
}: {
  data: CollaboratorPlanning;
  weeks: Date[];
  profileLabel: (key: string) => string;
  onCellClick: (week: WeekLoad) => void;
}) {
  const { collaborator } = data;
  const profilesDisplay = collaborator.profiles && collaborator.profiles.length > 0
    ? collaborator.profiles.map((p) => profileLabel(p)).join(" · ")
    : profileLabel(collaborator.profile);

  return (
    <tr className="hover:bg-blue-50/30 transition-colors">
      <td className="sticky left-0 bg-white z-10 border-r border-gray-200 px-3 py-2 min-w-[180px]">
        <div className="flex items-center gap-2">
          <div
            className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0"
            style={{ backgroundColor: collaborator.color }}
          >
            {collaborator.name.split(" ").map((n) => n[0]).slice(0, 2).join("")}
          </div>
          <div>
            <p className="font-medium text-sm text-gray-900 leading-tight">{collaborator.name}</p>
            <p className="text-xs text-gray-400">{profilesDisplay}</p>
          </div>
        </div>
      </td>
      {data.weeks.map((week) => (
        <WeekCell key={week.week_start} week={week} onClick={() => onCellClick(week)} />
      ))}
      <td className="sticky right-0 bg-white z-10 border-l border-gray-200 px-3 py-2 text-sm text-right">
        <span className="font-semibold text-gray-900">
          {data.weeks.reduce((s, w) => s + w.assigned_days, 0).toFixed(1)} j
        </span>
      </td>
    </tr>
  );
}

// ── Gantt row (daily) ──────────────────────────────────────────────────────────

function DayCollaboratorRow({
  data,
  days,
  profileLabel,
  onCellClick,
}: {
  data: CollaboratorPlanning;
  days: Date[];
  profileLabel: (key: string) => string;
  onCellClick: (week: WeekLoad) => void;
}) {
  const { collaborator } = data;
  const profilesDisplay = collaborator.profiles && collaborator.profiles.length > 0
    ? collaborator.profiles.map((p) => profileLabel(p)).join(" · ")
    : profileLabel(collaborator.profile);

  return (
    <tr className="hover:bg-blue-50/30 transition-colors">
      <td className="sticky left-0 bg-white z-10 border-r border-gray-200 px-3 py-2 min-w-[180px]">
        <div className="flex items-center gap-2">
          <div
            className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0"
            style={{ backgroundColor: collaborator.color }}
          >
            {collaborator.name.split(" ").map((n) => n[0]).slice(0, 2).join("")}
          </div>
          <div>
            <p className="font-medium text-sm text-gray-900 leading-tight">{collaborator.name}</p>
            <p className="text-xs text-gray-400">{profilesDisplay}</p>
          </div>
        </div>
      </td>
      {days.map((day) => {
        const week = findWeekForDay(data.weeks, day);
        return (
          <DayCell
            key={toIso(day)}
            week={week}
            onClick={() => week && onCellClick(week)}
          />
        );
      })}
      <td className="sticky right-0 bg-white z-10 border-l border-gray-200 px-3 py-2 text-sm text-right">
        <span className="font-semibold text-gray-900">
          {data.weeks.reduce((s, w) => s + w.assigned_days, 0).toFixed(1)} j
        </span>
      </td>
    </tr>
  );
}

// ── Main ───────────────────────────────────────────────────────────────────────

const DAY_INITIALS = ["D", "L", "M", "Me", "J", "V", "S"];

export default function Planning() {
  const today = new Date();
  const qc = useQueryClient();
  const [viewMode, setViewMode] = useState<"week" | "day">("week");
  const [startDate, setStartDate] = useState<Date>(startOfMonth(today));
  const [numWeeks, setNumWeeks] = useState(12);
  const [minProb, setMinProb] = useState(0);
  const [selectedCollabs, setSelectedCollabs] = useState<number[]>([]);
  const [selectedCell, setSelectedCell] = useState<{
    collaboratorId: number;
    collaboratorName: string;
    collaboratorColor: string;
    week: WeekLoad;
  } | null>(null);

  const handleViewModeToggle = (mode: "week" | "day") => {
    setViewMode(mode);
    if (mode === "day" && numWeeks > 6) setNumWeeks(4);
    if (mode === "week" && numWeeks < 4) setNumWeeks(4);
  };

  const endDate = addWeeks(startDate, numWeeks);
  const startIso = toIso(startDate);
  const endIso = toIso(endDate);

  const { data: refs } = useQuery({ queryKey: ["refs"], queryFn: getReferentials });
  const { data: collaborators = [] } = useQuery({ queryKey: ["collaborators"], queryFn: getCollaborators });

  const planningParams = {
    start_date: startIso,
    end_date: endIso,
    min_probability: minProb,
    collaborator_ids: selectedCollabs.length > 0 ? selectedCollabs.join(",") : undefined,
  };

  const { data: planning = [], isLoading, isFetching } = useQuery({
    queryKey: ["planning", planningParams],
    queryFn: () => getPlanning(planningParams),
  });

  const { data: summary } = useQuery({
    queryKey: ["team-summary-planning", startIso, endIso, minProb],
    queryFn: () => getTeamSummary({ start_date: startIso, end_date: endIso, min_probability: minProb }),
  });

  const { data: unassigned = [] } = useQuery({
    queryKey: ["unassigned-planning", startIso, endIso, minProb],
    queryFn: () => getUnassigned({ start_date: startIso, end_date: endIso, min_probability: minProb }),
  });

  // Weekly headers
  const weekHeaders = useMemo(() => {
    const headers: Date[] = [];
    let ws = startOfWeek(startDate, { weekStartsOn: 1 });
    for (let i = 0; i < numWeeks; i++) {
      headers.push(ws);
      ws = addWeeks(ws, 1);
    }
    return headers;
  }, [startDate, numWeeks]);

  // Daily headers
  const workDays = useMemo(
    () => (viewMode === "day" ? buildWorkDays(startDate, numWeeks) : []),
    [viewMode, startDate, numWeeks]
  );
  const monthGroups = useMemo(
    () => (viewMode === "day" ? groupDaysByMonth(workDays) : []),
    [viewMode, workDays]
  );

  const profileLabel = (key: string) => refs?.profiles.find((p) => p.value === key)?.label ?? key;

  const toggleCollab = (id: number) => {
    setSelectedCollabs((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const PROB_OPTIONS = [
    { value: 0, label: "Tous les projets" },
    { value: 10, label: "≥ Identification (10%)" },
    { value: 25, label: "≥ Prospection (25%)" },
    { value: 50, label: "≥ En proposition (50%)" },
    { value: 75, label: "≥ Fort potentiel (75%)" },
    { value: 100, label: "Signés uniquement (100%)" },
  ];

  const handleCellClick = (collaboratorId: number, collaboratorName: string, collaboratorColor: string, week: WeekLoad) => {
    setSelectedCell({ collaboratorId, collaboratorName, collaboratorColor, week });
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Planning</h1>
            <p className="text-sm text-gray-500">Charge prévisionnelle de l'équipe</p>
          </div>
          {isFetching && <span className="text-xs text-blue-500 animate-pulse">Mise à jour...</span>}
        </div>

        {/* Controls */}
        <div className="flex flex-wrap gap-3 mt-4">
          {/* Period */}
          <div className="flex items-center gap-2">
            <label className="text-xs text-gray-500 font-medium">Début</label>
            <input
              type="date"
              className="input py-1 text-sm"
              value={toIso(startDate)}
              onChange={(e) => e.target.value && setStartDate(new Date(e.target.value))}
            />
          </div>
          <div className="flex items-center gap-2">
            <label className="text-xs text-gray-500 font-medium">Semaines</label>
            <select
              className="input py-1 text-sm w-24"
              value={numWeeks}
              onChange={(e) => setNumWeeks(parseInt(e.target.value))}
            >
              {(viewMode === "day" ? [1, 2, 4, 6] : [4, 8, 12, 16, 20, 26, 52]).map((n) => (
                <option key={n} value={n}>{n} sem.</option>
              ))}
            </select>
          </div>

          {/* View toggle */}
          <div className="flex items-center border border-gray-200 rounded overflow-hidden">
            {(["week", "day"] as const).map((m) => (
              <button
                key={m}
                className={`text-xs py-1 px-3 transition-colors ${viewMode === m ? "bg-blue-600 text-white" : "bg-white text-gray-600 hover:bg-gray-50"}`}
                onClick={() => handleViewModeToggle(m)}
              >
                {m === "week" ? "Semaine" : "Jour"}
              </button>
            ))}
          </div>

          {/* Hypothesis (probability filter) */}
          <div className="flex items-center gap-2">
            <label className="text-xs text-gray-500 font-medium">Hypothèse</label>
            <select
              className="input py-1 text-sm"
              value={minProb}
              onChange={(e) => setMinProb(parseInt(e.target.value))}
            >
              {PROB_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>

          {/* Navigate */}
          <div className="flex gap-1 ml-auto">
            <button
              className="btn-secondary text-xs py-1 px-2"
              onClick={() => setStartDate(startOfMonth(today))}
            >Ce mois</button>
            <button
              className="btn-secondary text-xs py-1 px-2"
              onClick={() => setStartDate((d) => addMonths(d, -1))}
            >← Préc.</button>
            <button
              className="btn-secondary text-xs py-1 px-2"
              onClick={() => setStartDate((d) => addMonths(d, 1))}
            >Suiv. →</button>
          </div>
        </div>

        {/* Collaborator filter */}
        {collaborators.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-3">
            <span className="text-xs text-gray-400 self-center">Filtrer :</span>
            {collaborators.map((c) => (
              <button
                key={c.id}
                onClick={() => toggleCollab(c.id)}
                className="flex items-center gap-1.5 text-xs px-2 py-1 rounded-full border transition-colors"
                style={
                  selectedCollabs.includes(c.id)
                    ? { backgroundColor: c.color, borderColor: c.color, color: "#fff" }
                    : { borderColor: "#e5e7eb", color: "#6b7280" }
                }
              >
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: c.color }} />
                {c.name}
              </button>
            ))}
            {selectedCollabs.length > 0 && (
              <button onClick={() => setSelectedCollabs([])} className="text-xs text-blue-500 hover:text-blue-700">
                Réinitialiser
              </button>
            )}
          </div>
        )}
      </div>

      {/* Summary bar */}
      {summary && (
        <div className="bg-gray-50 border-b border-gray-200 px-6 py-2 flex items-center gap-6 text-sm">
          <span className="text-gray-500">Période : <strong className="text-gray-900">{summary.total_capacity_days} j</strong> disponibles</span>
          <span className="text-gray-500">Affectés : <strong className="text-gray-900">{summary.total_assigned_days} j</strong></span>
          <span className="text-gray-500">
            Taux :{" "}
            <strong style={{ color: summary.occupancy_rate > 100 ? "#dc2626" : summary.occupancy_rate > 80 ? "#ea580c" : "#16a34a" }}>
              {summary.occupancy_rate}%
            </strong>
          </span>
          {summary.overloaded_collaborators.length > 0 && (
            <span className="text-red-600 font-medium">
              ⚠️ {summary.overloaded_collaborators.length} personne(s) surchargée(s)
            </span>
          )}
          {unassigned.length > 0 && (
            <span className="text-amber-600 font-medium">
              ⚡ {unassigned.length} affectation(s) à profil non staffée(s)
            </span>
          )}
        </div>
      )}

      {/* Legend */}
      <div className="px-6 py-1.5 bg-gray-50 border-b border-gray-200 flex items-center gap-4 text-xs text-gray-500">
        <span>Charge :</span>
        {[
          { bg: "#dcfce7", label: "0–50%" },
          { bg: "#86efac", label: "50–100%" },
          { bg: "#fde68a", label: "100–130% (surchargé)" },
          { bg: "#fca5a5", label: "> 130%" },
        ].map((l) => (
          <div key={l.label} className="flex items-center gap-1">
            <span className="w-4 h-4 rounded inline-block border border-gray-200" style={{ backgroundColor: l.bg }} />
            <span>{l.label}</span>
          </div>
        ))}
        <span className="ml-2">Probabilités :</span>
        {refs?.probabilities.map((p) => (
          <div key={p.value} className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full inline-block" style={{ backgroundColor: p.color }} />
            <span>{p.label}</span>
          </div>
        ))}
      </div>

      {/* Planning table */}
      <div className="flex-1 overflow-auto scrollbar-thin">
        {isLoading ? (
          <div className="flex items-center justify-center h-32 text-gray-400">Chargement...</div>
        ) : planning.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-32 text-gray-400">
            <p className="text-3xl mb-2">📅</p>
            <p>Aucune donnée de planning disponible</p>
          </div>
        ) : (
          <table className="border-collapse w-full text-sm bg-white">
            <thead className="sticky top-0 z-10 bg-white shadow-sm">
              {viewMode === "week" ? (
                <tr>
                  <th className="sticky left-0 bg-white z-20 border-r border-b border-gray-200 px-3 py-2 text-left text-xs font-medium text-gray-500 min-w-[180px]">
                    Collaborateur
                  </th>
                  {weekHeaders.map((ws) => {
                    const isCurrentWeek =
                      toIso(ws) <= toIso(today) && toIso(addWeeks(ws, 1)) > toIso(today);
                    return (
                      <th
                        key={toIso(ws)}
                        className={`border-b border-gray-200 px-1 py-2 text-center min-w-[96px] ${isCurrentWeek ? "bg-blue-50" : ""}`}
                      >
                        <p className={`text-xs font-medium ${isCurrentWeek ? "text-blue-700" : "text-gray-600"}`}>
                          {format(ws, "dd/MM", { locale: fr })}
                        </p>
                        <p className={`text-[10px] ${isCurrentWeek ? "text-blue-400" : "text-gray-400"}`}>
                          S{format(ws, "ww")}
                        </p>
                      </th>
                    );
                  })}
                  <th className="sticky right-0 bg-white z-20 border-l border-b border-gray-200 px-3 py-2 text-right text-xs font-medium text-gray-500 min-w-[80px]">
                    Total
                  </th>
                </tr>
              ) : (
                <>
                  {/* Daily header row 1: month groups */}
                  <tr>
                    <th
                      rowSpan={2}
                      className="sticky left-0 bg-white z-20 border-r border-b border-gray-200 px-3 py-2 text-left text-xs font-medium text-gray-500 min-w-[180px]"
                    >
                      Collaborateur
                    </th>
                    {monthGroups.map((group) => (
                      <th
                        key={group.monthLabel}
                        colSpan={group.days.length}
                        className="border-b border-r border-gray-200 px-2 py-1 text-center text-xs font-semibold text-gray-600 capitalize bg-gray-50"
                      >
                        {group.monthLabel}
                      </th>
                    ))}
                    <th
                      rowSpan={2}
                      className="sticky right-0 bg-white z-20 border-l border-b border-gray-200 px-3 py-2 text-right text-xs font-medium text-gray-500 min-w-[80px]"
                    >
                      Total
                    </th>
                  </tr>
                  {/* Daily header row 2: individual days */}
                  <tr>
                    {workDays.map((day) => {
                      const isToday = toIso(day) === toIso(today);
                      return (
                        <th
                          key={toIso(day)}
                          className={`border-b border-gray-200 px-0.5 py-1 text-center ${isToday ? "bg-blue-50" : ""}`}
                          style={{ minWidth: 52 }}
                        >
                          <p className={`text-[10px] font-medium ${isToday ? "text-blue-700" : "text-gray-600"}`}>
                            {format(day, "dd")}
                          </p>
                          <p className={`text-[9px] ${isToday ? "text-blue-400" : "text-gray-400"}`}>
                            {DAY_INITIALS[day.getDay()]}
                          </p>
                        </th>
                      );
                    })}
                  </tr>
                </>
              )}
            </thead>
            <tbody>
              {planning.map((data) =>
                viewMode === "week" ? (
                  <CollaboratorRow
                    key={data.collaborator.id}
                    data={data}
                    weeks={weekHeaders}
                    profileLabel={profileLabel}
                    onCellClick={(week) =>
                      handleCellClick(data.collaborator.id, data.collaborator.name, data.collaborator.color, week)
                    }
                  />
                ) : (
                  <DayCollaboratorRow
                    key={data.collaborator.id}
                    data={data}
                    days={workDays}
                    profileLabel={profileLabel}
                    onCellClick={(week) =>
                      handleCellClick(data.collaborator.id, data.collaborator.name, data.collaborator.color, week)
                    }
                  />
                )
              )}
            </tbody>
          </table>
        )}
      </div>

      {/* Unassigned section */}
      {unassigned.length > 0 && (
        <div className="border-t border-gray-200 bg-amber-50 px-6 py-4">
          <h3 className="text-sm font-semibold text-amber-900 mb-2">
            Affectations à profil (non staffées) — {unassigned.length}
          </h3>
          <div className="flex flex-wrap gap-2">
            {unassigned.map((u: any) => (
              <div key={u.assignment_id} className="bg-white border border-amber-200 rounded px-3 py-1.5 text-xs">
                <span className="font-medium text-gray-900">{u.project_name}</span>
                <span className="text-gray-500 mx-1">·</span>
                <span className="text-gray-700">{u.task_name}</span>
                <span className="text-gray-500 mx-1">·</span>
                <span className="text-amber-700">{u.profile}</span>
                <span className="text-gray-500 mx-1">·</span>
                <span className="font-semibold text-amber-800">{u.days_assigned} j</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Week detail panel */}
      {selectedCell && (
        <WeekDetailPanel
          collaboratorId={selectedCell.collaboratorId}
          collaboratorName={selectedCell.collaboratorName}
          collaboratorColor={selectedCell.collaboratorColor}
          week={selectedCell.week}
          onClose={() => setSelectedCell(null)}
          onMutated={() => {
            setSelectedCell(null);
            qc.invalidateQueries({ queryKey: ["planning", planningParams] });
          }}
        />
      )}
    </div>
  );
}
