import { Link } from "react-router-dom";
import { ArrowRight, CheckCircle2, CircleDashed } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export default function LaunchChecklist({ items, title = "Launch Checklist", mode = "pending" }) {
  const completedCount = items.filter((item) => item.done).length;
  const totalCount = items.length;
  const readyPercent = Math.round((completedCount / Math.max(totalCount, 1)) * 100);

  return (
    <div className="bg-card rounded-2xl border border-border p-4 sm:p-5">
      <div className="flex items-center justify-between gap-3 mb-4">
        <div>
          <h3 className="font-semibold text-sm text-foreground">{title}</h3>
          <p className="text-xs text-muted-foreground mt-1">
            {mode === "pending"
              ? `${items.length} setup step${items.length === 1 ? "" : "s"} remaining`
              : `${completedCount} of ${totalCount} setup steps completed`}
          </p>
        </div>
        <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
          {readyPercent}% ready
        </span>
      </div>

      <div className="space-y-2">
        {items.map((item) => (
          <div key={item.key} className="flex items-center justify-between gap-3 rounded-xl border border-border px-3 py-3">
            <div className="flex min-w-0 items-start gap-3">
              <div className={cn("mt-0.5", item.done ? "text-success" : "text-muted-foreground")}>
                {item.done ? <CheckCircle2 className="h-4 w-4" /> : <CircleDashed className="h-4 w-4" />}
              </div>
              <div className="min-w-0">
                <p className="text-sm font-medium text-foreground">{item.label}</p>
                <p className="text-xs text-muted-foreground">{mode === "pending" ? item.description : item.done ? "Completed" : item.description}</p>
              </div>
            </div>
            <Button asChild size="sm" variant="ghost" className="h-8 px-2.5 text-xs font-semibold flex-shrink-0">
              <Link to={item.href}>
                {item.action}
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
}
