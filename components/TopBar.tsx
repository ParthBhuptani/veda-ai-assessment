import { ArrowLeft, HelpCircle, Bell, Plus } from "lucide-react";

export function TopBar({ crumb = "Exams" }: { crumb?: string }) {
  return (
    <div className="flex items-center justify-between px-4 sm:px-6 py-3 border-b border-slate-200 bg-white">
      <div className="flex items-center gap-2 text-sm text-slate-500 min-w-0">
        <ArrowLeft size={16} className="cursor-pointer text-slate-400 shrink-0" />
        <span className="truncate">{crumb}</span>
      </div>
      <div className="flex items-center gap-3 sm:gap-4 shrink-0">
        <HelpCircle size={18} className="hidden sm:block text-slate-400" />
        <div className="relative hidden sm:block">
          <Bell size={18} className="text-slate-400" />
          <span className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 rounded-full bg-orange-500" />
        </div>
        <Plus size={18} className="hidden sm:block text-slate-400" />
        <div className="flex items-center gap-2 sm:pl-3 sm:border-l border-slate-200">
          <div className="w-7 h-7 rounded-full bg-gradient-to-br from-orange-300 to-pink-300 shrink-0" />
          <span className="hidden md:inline text-sm font-medium text-slate-700">
            Parth Bhuptani
          </span>
        </div>
      </div>
    </div>
  );
}
