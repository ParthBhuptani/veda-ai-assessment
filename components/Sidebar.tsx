import { Home, LayoutGrid, FileText, ClipboardList, Clock, Settings } from "lucide-react";

const NAV_ITEMS = [
  { label: "Home", icon: Home },
  { label: "My Classroom", icon: LayoutGrid },
  { label: "Assignments", icon: FileText },
  { label: "Exams", icon: ClipboardList, active: true },
  { label: "My Library", icon: Clock },
];

export function Sidebar() {
  return (
    <aside className="hidden md:flex w-60 shrink-0 flex-col border-r border-slate-200 bg-white h-screen">
      <div className="flex items-center gap-2 px-5 py-5">
        <div className="w-8 h-8 rounded-lg bg-slate-900 flex items-center justify-center text-white font-bold text-sm">
          V
        </div>
        <span className="font-semibold text-slate-900">VedaAI</span>
      </div>

      <div className="px-4 mb-4">
        <button className="w-full flex items-center justify-center gap-2 rounded-full bg-slate-900 text-white text-sm font-medium py-2.5 px-4 hover:bg-slate-800 transition-colors">
          <span className="text-orange-400">✦</span> AI Teacher&apos;s Toolkit
        </button>
      </div>

      <nav className="flex-1 px-3 space-y-1">
        {NAV_ITEMS.map(({ label, icon: Icon, active }) => (
          <div
            key={label}
            className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm cursor-pointer transition-colors ${
              active
                ? "bg-slate-100 text-slate-900 font-medium"
                : "text-slate-500 hover:bg-slate-50"
            }`}
          >
            <Icon size={17} strokeWidth={2} />
            {label}
          </div>
        ))}
      </nav>

      <div className="px-3 pb-3">
        <div className="flex items-center gap-2 px-3 py-2.5 text-slate-500 text-sm">
          <Settings size={17} />
          Settings
        </div>
        <div className="flex items-center gap-2.5 rounded-xl bg-emerald-50 border border-emerald-100 px-3 py-2.5 mt-1">
          <div className="w-7 h-7 rounded-full bg-emerald-500 flex items-center justify-center text-white text-xs font-bold">
            D
          </div>
          <div className="text-xs leading-tight">
            <div className="font-medium text-slate-800">Delhi Public School</div>
            <div className="text-slate-400">Rohini, East City</div>
          </div>
        </div>
      </div>
    </aside>
  );
}
