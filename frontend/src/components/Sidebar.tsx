import { NavLink } from "react-router-dom";

const links = [
  { to: "/dashboard", label: "Tableau de bord", icon: "📊" },
  { to: "/projects", label: "Projets", icon: "📁" },
  { to: "/planning", label: "Planning", icon: "📅" },
  { to: "/team", label: "Équipe", icon: "👥" },
];

export default function Sidebar() {
  return (
    <aside className="w-60 bg-gray-900 text-white flex flex-col shrink-0">
      <div className="p-5 border-b border-gray-700">
        <h1 className="text-lg font-bold text-white">Charge Équipe</h1>
        <p className="text-xs text-gray-400 mt-0.5">Suivi prévisonnel</p>
      </div>
      <nav className="flex-1 p-4 space-y-1">
        {links.map((l) => (
          <NavLink
            key={l.to}
            to={l.to}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                isActive
                  ? "bg-blue-600 text-white"
                  : "text-gray-400 hover:bg-gray-800 hover:text-white"
              }`
            }
          >
            <span className="text-base">{l.icon}</span>
            {l.label}
          </NavLink>
        ))}
      </nav>
      <div className="p-4 border-t border-gray-700">
        <p className="text-xs text-gray-500">v1.0.0</p>
      </div>
    </aside>
  );
}
