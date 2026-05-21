import { cn } from "@/lib/utils";
import { TrendingUp, TrendingDown } from "lucide-react";

export default function StatCard({ title, value, subtitle, trend, trendLabel, icon: Icon, color = "primary", loading }) {
  const colorMap = {
    primary: "from-primary/20 to-primary/5 border-primary/25 text-primary",
    success: "from-success/18 to-success/5 border-success/25 text-success",
    warning: "from-warning/18 to-warning/5 border-warning/25 text-warning",
    danger: "from-danger/18 to-danger/5 border-danger/25 text-danger",
    accent: "from-accent/25 to-accent/5 border-accent/25 text-accent-foreground",
  };

  return (
    <div className={cn(
      "console-glass relative bg-card/85 rounded-2xl border p-5 overflow-hidden transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/35",
      `bg-gradient-to-br ${colorMap[color]}`
    )}>
      <div className="flex items-start justify-between mb-3">
        <p className="text-sm font-medium text-muted-foreground">{title}</p>
        {Icon && (
          <div className={cn("p-2 rounded-xl bg-background/35 ring-1 ring-border/65", colorMap[color])}>
            <Icon className="w-4 h-4" />
          </div>
        )}
      </div>
      {loading ? (
        <div className="space-y-2">
          <div className="h-8 w-24 bg-muted/80 animate-pulse rounded-full" />
          <div className="h-3 w-16 bg-muted/80 animate-pulse rounded-full" />
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
