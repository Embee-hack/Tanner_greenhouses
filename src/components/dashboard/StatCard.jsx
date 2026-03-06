import { cn } from "@/lib/utils";
import { TrendingUp, TrendingDown } from "lucide-react";

export default function StatCard({ title, value, subtitle, trend, trendLabel, icon: Icon, color = "primary", loading }) {
  const colorMap = {
    primary: "from-primary/10 to-primary/5 border-primary/20 text-primary",
    success: "from-success/10 to-success/5 border-success/20 text-success",
    warning: "from-warning/10 to-warning/5 border-warning/20 text-warning",
    danger: "from-danger/10 to-danger/5 border-danger/20 text-danger",
    accent: "from-accent/10 to-accent/5 border-accent/20 text-accent",
  };

  return (
    <div className={cn(
      "relative bg-card rounded-xl border p-5 overflow-hidden transition-all duration-200 hover:shadow-md hover:-translate-y-0.5",
      `bg-gradient-to-br ${colorMap[color]}`
    )}>
      <div className="flex items-start justify-between mb-3">
        <p className="text-sm font-medium text-muted-foreground">{title}</p>
        {Icon && (
          <div className={cn("p-2 rounded-lg bg-background/60", colorMap[color])}>
            <Icon className="w-4 h-4" />
          </div>
        )}
      </div>
      {loading ? (
        <div className="space-y-2">
          <div className="h-8 w-24 bg-muted animate-pulse rounded" />
          <div className="h-3 w-16 bg-muted animate-pulse rounded" />
        </div>
      ) : (
        <>
          <div className="text-2xl font-bold text-foreground tracking-tight">{value}</div>
          {subtitle && <div className="text-xs text-muted-foreground mt-1">{subtitle}</div>}
          {trend !== undefined && (
            <div className={cn(
              "flex items-center gap-1 mt-2 text-xs font-medium",
              trend >= 0 ? "text-success" : "text-danger"
            )}>
              {trend >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
              <span>{Math.abs(trend).toFixed(1)}%</span>
              {trendLabel && <span className="text-muted-foreground font-normal">{trendLabel}</span>}
            </div>
          )}
        </>
      )}
    </div>
  );
}