import { cn } from "@/lib/utils";

const colorMap = {
  active: "bg-emerald-100 text-emerald-800 border-emerald-300",
  completed: "bg-blue-100 text-blue-800 border-blue-300",
  inactive: "bg-slate-100 text-slate-700 border-slate-300",
  on_leave: "bg-amber-100 text-amber-800 border-amber-300",
  terminated: "bg-rose-100 text-rose-800 border-rose-300",
  maintenance: "bg-amber-100 text-amber-800 border-amber-300",
  abandoned: "bg-rose-100 text-rose-800 border-rose-300",
  open: "bg-rose-100 text-rose-800 border-rose-300",
  treated: "bg-violet-100 text-violet-800 border-violet-300",
  in_progress: "bg-violet-100 text-violet-800 border-violet-300",
  present: "bg-emerald-100 text-emerald-800 border-emerald-300",
  late: "bg-amber-100 text-amber-800 border-amber-300",
  absent: "bg-rose-100 text-rose-800 border-rose-300",
  off_day: "bg-slate-100 text-slate-700 border-slate-300",
  leave: "bg-blue-100 text-blue-800 border-blue-300",
  excused: "bg-cyan-100 text-cyan-800 border-cyan-300",
  investigating: "bg-amber-100 text-amber-800 border-amber-300",
  waived: "bg-slate-100 text-slate-700 border-slate-300",
  monitoring: "bg-blue-100 text-blue-800 border-blue-300",
  resolved: "bg-emerald-100 text-emerald-800 border-emerald-300",
  pending: "bg-slate-100 text-slate-700 border-slate-300",
  effective: "bg-emerald-100 text-emerald-800 border-emerald-300",
  partial: "bg-amber-100 text-amber-800 border-amber-300",
  ineffective: "bg-rose-100 text-rose-800 border-rose-300",
  low: "bg-teal-100 text-teal-800 border-teal-300",
  medium: "bg-amber-100 text-amber-800 border-amber-300",
  high: "bg-orange-100 text-orange-800 border-orange-300",
  critical: "bg-red-100 text-red-800 border-red-300",
};

const labelMap = {
  treated: "In progress",
  in_progress: "In progress",
  off_day: "Off day",
};

export default function StatusBadge({ status, size = "sm" }) {
  return (
    <span className={cn(
      "inline-flex items-center border rounded-full font-medium capitalize",
      size === "sm" ? "text-xs px-2 py-0.5" : "text-sm px-3 py-1",
      colorMap[status] ?? "bg-muted text-muted-foreground border-border"
    )}>
      {(labelMap[status] || status)?.replace(/_/g, " ")}
    </span>
  );
}
