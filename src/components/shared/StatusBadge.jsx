import { cn } from "@/lib/utils";

const colorMap = {
  active: "bg-success/14 text-success border-success/35",
  completed: "bg-sky-400/14 text-sky-200 border-sky-300/35",
  transplanted: "bg-sky-400/14 text-sky-200 border-sky-300/35",
  inactive: "bg-muted/70 text-muted-foreground border-border",
  on_leave: "bg-warning/14 text-warning border-warning/35",
  terminated: "bg-danger/14 text-danger border-danger/35",
  maintenance: "bg-warning/14 text-warning border-warning/35",
  abandoned: "bg-danger/14 text-danger border-danger/35",
  discarded: "bg-danger/14 text-danger border-danger/35",
  open: "bg-danger/14 text-danger border-danger/35",
  treated: "bg-violet-400/14 text-violet-200 border-violet-300/35",
  in_progress: "bg-violet-400/14 text-violet-200 border-violet-300/35",
  present: "bg-success/14 text-success border-success/35",
  late: "bg-warning/14 text-warning border-warning/35",
  absent: "bg-danger/14 text-danger border-danger/35",
  off_day: "bg-muted/70 text-muted-foreground border-border",
  leave: "bg-sky-400/14 text-sky-200 border-sky-300/35",
  excused: "bg-cyan-400/14 text-cyan-200 border-cyan-300/35",
  investigating: "bg-warning/14 text-warning border-warning/35",
  waived: "bg-muted/70 text-muted-foreground border-border",
  monitoring: "bg-sky-400/14 text-sky-200 border-sky-300/35",
  resolved: "bg-success/14 text-success border-success/35",
  pending: "bg-muted/70 text-muted-foreground border-border",
  effective: "bg-success/14 text-success border-success/35",
  partial: "bg-warning/14 text-warning border-warning/35",
  ineffective: "bg-danger/14 text-danger border-danger/35",
  low: "bg-teal-400/14 text-teal-200 border-teal-300/35",
  medium: "bg-warning/14 text-warning border-warning/35",
  high: "bg-orange-400/14 text-orange-200 border-orange-300/35",
  critical: "bg-red-400/14 text-red-200 border-red-300/35",
};

const labelMap = {
  treated: "In progress",
  in_progress: "In progress",
  off_day: "Off day",
  transplanted: "Transplanted",
  discarded: "Discarded",
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
