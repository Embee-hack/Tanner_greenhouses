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

export default function StatusBadge({ status, size = "sm" }) {
  return (
    <span className={cn(
      "inline-flex items-center border rounded-full font-medium capitalize",
      size === "sm" ? "text-xs px-2 py-0.5" : "text-sm px-3 py-1",
      colorMap[status] ?? "bg-muted text-muted-foreground border-border"
    )}>
      {status?.replace(/_/g, " ")}
    </span>
  );
}
