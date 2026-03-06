import { cn } from "@/lib/utils";
import { TrendingUp, TrendingDown, Minus, CheckCircle, AlertTriangle, XCircle } from "lucide-react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { useCurrency } from "@/components/shared/CurrencyProvider";

function getPerf(score) {
  if (score >= 75) return {
    border: "border-success",
    bg: "bg-success/5",
    label: "Healthy",
    labelClass: "bg-success/10 text-success border border-success/30",
    Icon: CheckCircle,
    bar: "bg-success",
    dot: "bg-success",
  };
  if (score >= 45) return {
    border: "border-warning",
    bg: "bg-warning/5",
    label: "Warning",
    labelClass: "bg-warning/10 text-warning border border-warning/30",
    Icon: AlertTriangle,
    bar: "bg-warning",
    dot: "bg-warning",
  };
  return {
    border: "border-danger",
    bg: "bg-danger/5",
    label: "Critical",
    labelClass: "bg-danger/10 text-danger border border-danger/30",
    Icon: XCircle,
    bar: "bg-danger",
    dot: "bg-danger",
  };
}

// Mini spark-bar from 0–8 fake trend bars based on score
function SparkBars({ score, color }) {
  const heights = [4, 5, 3, 6, 4, 7, 5, score / 14];
  return (
    <div className="flex items-end gap-0.5 h-6">
      {heights.map((h, i) => (
        <div
          key={i}
          className={cn("rounded-sm w-2 opacity-70", color)}
          style={{ height: `${Math.max(2, Math.min(h * 3, 22))}px` }}
        />
      ))}
    </div>
  );
}

export default function GreenhouseTile({ greenhouse, metrics }) {
  const { fmt } = useCurrency();
  const score = metrics?.performance_score ?? 0;
  const perf = getPerf(score);
  const { Icon } = perf;

  const TrendIcon = metrics?.trend > 0 ? TrendingUp : metrics?.trend < 0 ? TrendingDown : Minus;
  const trendColor = metrics?.trend > 0 ? "text-success" : metrics?.trend < 0 ? "text-danger" : "text-muted-foreground";

  return (
    <Link
      to={createPageUrl(`GreenhouseDetail?id=${greenhouse.id}`)}
      className={cn(
        "block bg-card rounded-2xl border-2 p-4 hover:shadow-xl transition-all duration-200 hover:-translate-y-1 cursor-pointer group",
        perf.border,
        perf.bg
      )}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="min-w-0 flex-1">
          <span className="font-bold text-base text-foreground leading-tight block">{greenhouse.code}</span>
          <span className="text-xs text-muted-foreground truncate block mt-0.5">{greenhouse.name || "No name"}</span>
        </div>
        <span className={cn("flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full whitespace-nowrap ml-2 flex-shrink-0", perf.labelClass)}>
          <Icon className="w-3 h-3" />
          {perf.label}
        </span>
      </div>

      {/* Metrics grid */}
      <div className="grid grid-cols-2 gap-2 mb-3">
        <div className="bg-background/60 rounded-lg p-2">
          <div className="text-[10px] text-muted-foreground mb-0.5">Profit/Plant</div>
          <div className={cn("font-bold text-sm", metrics?.profit_per_plant >= 0 ? "text-success" : "text-danger")}>
            {metrics?.profit_per_plant != null ? fmt(metrics.profit_per_plant, 0) : "—"}
          </div>
        </div>
        <div className="bg-background/60 rounded-lg p-2">
          <div className="text-[10px] text-muted-foreground mb-0.5">Yield/Plant</div>
          <div className="font-bold text-sm text-foreground">
            {metrics?.yield_per_plant != null ? `${metrics.yield_per_plant.toFixed(1)}kg` : "—"}
          </div>
        </div>
      </div>

      {/* Plants row */}
      <div className="flex items-center justify-between text-xs mb-3">
        <span className="text-muted-foreground">Active Plants</span>
        <span className="font-semibold text-foreground">{metrics?.active_plants?.toLocaleString() ?? "—"}</span>
      </div>

      {/* Spark + trend */}
      <div className="border-t border-border/40 pt-2 mt-1">
        <div className="text-[10px] text-muted-foreground mb-1 uppercase tracking-wide font-medium">8W Trend</div>
        <div className="flex items-end justify-between">
          <SparkBars score={score} color={perf.bar} />
          <TrendIcon className={cn("w-4 h-4", trendColor)} />
        </div>
      </div>
    </Link>
  );
}
