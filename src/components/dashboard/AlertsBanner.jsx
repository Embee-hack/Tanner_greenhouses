import { useState } from "react";
import { AlertCircle, Info, Bell, X, TrendingDown, Package, Bug, Zap } from "lucide-react";
import { cn } from "@/lib/utils";

function generateAlerts(harvests, incidents, expenses, inventoryItems = [], greenhouses = [], cycles = []) {
  const alerts = [];
  const now = Date.now();
  const days30 = 30 * 24 * 60 * 60 * 1000;
  const days7 = 7 * 24 * 60 * 60 * 1000;

  // ─── CRITICAL: open high/critical incidents ───────────────────────────────
  incidents
    .filter(i => i.status === "open" && (i.severity === "critical" || i.severity === "high"))
    .slice(0, 3)
    .forEach(inc => {
      alerts.push({
        id: `inc-crit-${inc.id}`,
        priority: "critical",
        category: "pest",
        message: `CRITICAL incident: ${inc.name || inc.incident_type} (${inc.severity}) — greenhouse requires immediate attention`,
        icon: AlertCircle,
      });
    });

  // ─── HIGH: open medium incidents ─────────────────────────────────────────
  incidents
    .filter(i => i.status === "open" && i.severity === "medium")
    .slice(0, 2)
    .forEach(inc => {
      alerts.push({
        id: `inc-med-${inc.id}`,
        priority: "high",
        category: "pest",
        message: `Active incident: ${inc.name || inc.incident_type} — not yet treated`,
        icon: Bug,
      });
    });

  // ─── CRITICAL: inventory below reorder level ──────────────────────────────
  inventoryItems
    .filter(item => item.reorder_level != null && item.quantity_in_stock <= item.reorder_level)
    .slice(0, 3)
    .forEach(item => {
      const criticallyLow = item.quantity_in_stock === 0 || item.quantity_in_stock <= item.reorder_level * 0.5;
      alerts.push({
        id: `inv-low-${item.id}`,
        priority: criticallyLow ? "critical" : "high",
        category: "inventory",
        message: `${criticallyLow ? "OUT / CRITICALLY LOW" : "Low stock"}: ${item.name} — ${item.quantity_in_stock} ${item.unit} remaining (reorder at ${item.reorder_level})`,
        icon: Package,
      });
    });

  // ─── HIGH: no harvest in last 7 days for active greenhouses ───────────────
  const activeGHIds = new Set(
    greenhouses.filter(g => g.status === "active").map(g => g.id)
  );
  const recentHarvestGH = new Set(
    harvests
      .filter(h => h.date && (now - new Date(h.date).getTime()) < days7)
      .map(h => h.greenhouse_id)
  );
  const noRecentHarvest = [...activeGHIds].filter(id => !recentHarvestGH.has(id));
  if (noRecentHarvest.length > 0) {
    const names = noRecentHarvest
      .slice(0, 3)
      .map(id => greenhouses.find(g => g.id === id)?.code || id)
      .join(", ");
    alerts.push({
      id: "no-harvest-7d",
      priority: "medium",
      category: "performance",
      message: `No harvest in last 7 days: ${names}${noRecentHarvest.length > 3 ? ` +${noRecentHarvest.length - 3} more` : ""}`,
      icon: TrendingDown,
    });
  }

  // ─── MEDIUM: active cycles with no harvest in 30 days ─────────────────────
  const recentHarvest30GH = new Set(
    harvests
      .filter(h => h.date && (now - new Date(h.date).getTime()) < days30)
      .map(h => h.greenhouse_id)
  );
  const activeCycleGHsNoHarvest = cycles
    .filter(c => c.status === "active" && !recentHarvest30GH.has(c.greenhouse_id))
    .slice(0, 2);
  if (activeCycleGHsNoHarvest.length > 0) {
    const names = activeCycleGHsNoHarvest
      .map(c => greenhouses.find(g => g.id === c.greenhouse_id)?.code || c.greenhouse_id)
      .join(", ");
    alerts.push({
      id: "cycle-no-harvest-30d",
      priority: "medium",
      category: "performance",
      message: `Active crop cycles with no harvest in 30 days: ${names}`,
      icon: TrendingDown,
    });
  }

  // ─── MEDIUM: surge in expenses this month ─────────────────────────────────
  const thisMonth = new Date().toISOString().slice(0, 7);
  const lastMonth = new Date(new Date().setMonth(new Date().getMonth() - 1)).toISOString().slice(0, 7);
  const thisMonthExp = expenses.filter(e => e.date?.startsWith(thisMonth)).reduce((s, e) => s + (e.amount || 0), 0);
  const lastMonthExp = expenses.filter(e => e.date?.startsWith(lastMonth)).reduce((s, e) => s + (e.amount || 0), 0);
  if (lastMonthExp > 0 && thisMonthExp > lastMonthExp * 1.3) {
    alerts.push({
      id: "expense-surge",
      priority: "medium",
      category: "finance",
      message: `Expense surge: This month's spending is ${Math.round((thisMonthExp / lastMonthExp - 1) * 100)}% higher than last month`,
      icon: Zap,
    });
  }

  // ─── INFO: all good ───────────────────────────────────────────────────────
  if (alerts.length === 0) {
    alerts.push({
      id: "all-good",
      priority: "info",
      category: "info",
      message: "All systems nominal — no active alerts. Farm operations running smoothly.",
      icon: Info,
    });
  }

  // Sort: critical > high > medium > info
  const order = { critical: 0, high: 1, medium: 2, info: 3 };
  return alerts.sort((a, b) => order[a.priority] - order[b.priority]).slice(0, 8);
}

const PRIORITY_CONFIG = {
  critical: {
    container: "bg-red-50 border-red-200",
    badge: "bg-red-100 text-red-700 border border-red-200",
    icon: "text-red-600",
    dot: "bg-red-500",
    label: "CRITICAL",
  },
  high: {
    container: "bg-orange-50 border-orange-200",
    badge: "bg-orange-100 text-orange-700 border border-orange-200",
    icon: "text-orange-500",
    dot: "bg-orange-500",
    label: "HIGH",
  },
  medium: {
    container: "bg-yellow-50 border-yellow-200",
    badge: "bg-yellow-100 text-yellow-700 border border-yellow-200",
    icon: "text-yellow-600",
    dot: "bg-yellow-500",
    label: "MEDIUM",
  },
  info: {
    container: "bg-blue-50 border-blue-200",
    badge: "bg-blue-50 text-blue-700 border border-blue-200",
    icon: "text-blue-500",
    dot: "bg-blue-400",
    label: "INFO",
  },
};

export default function AlertsBanner({ harvests = [], incidents = [], expenses = [], inventoryItems = [], greenhouses = [], cycles = [] }) {
  const [dismissed, setDismissed] = useState(new Set());
  const allAlerts = generateAlerts(harvests, incidents, expenses, inventoryItems, greenhouses, cycles);
  const alerts = allAlerts.filter(a => !dismissed.has(a.id));

  const criticalCount = alerts.filter(a => a.priority === "critical").length;
  const highCount = alerts.filter(a => a.priority === "high").length;

  if (alerts.length === 0) return null;

  return (
    <div className="bg-card border border-border rounded-2xl overflow-hidden">
      {/* Banner header */}
      <div className="flex items-center gap-3 px-5 py-3 border-b border-border bg-muted/20">
        <Bell className="w-4 h-4 text-muted-foreground" />
        <span className="text-xs font-bold text-muted-foreground uppercase tracking-wide flex-1">Smart Alerts</span>
        {criticalCount > 0 && (
          <span className="text-[10px] font-bold bg-red-500 text-white px-2 py-0.5 rounded-full">{criticalCount} CRITICAL</span>
        )}
        {highCount > 0 && (
          <span className="text-[10px] font-bold bg-orange-400 text-white px-2 py-0.5 rounded-full">{highCount} HIGH</span>
        )}
        <span className="text-xs text-muted-foreground">{alerts.length} active</span>
      </div>

      {/* Alert list */}
      <div className="divide-y divide-border/50">
        {alerts.map(alert => {
          const cfg = PRIORITY_CONFIG[alert.priority] || PRIORITY_CONFIG.info;
          const Icon = alert.icon;
          return (
            <div
              key={alert.id}
              className={cn("flex items-start gap-3 px-5 py-3 border-l-4 transition-colors hover:brightness-[0.97]", cfg.container, `border-l-[${cfg.dot.replace("bg-", "")}]`)}
              style={{
                borderLeftColor: {
                  critical: "#ef4444",
                  high: "#f97316",
                  medium: "#eab308",
                  info: "#60a5fa",
                }[alert.priority]
              }}
            >
              <div className={cn("mt-0.5 flex-shrink-0", cfg.icon)}>
                <Icon className="w-4 h-4" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className={cn("text-[10px] font-bold px-1.5 py-0.5 rounded", cfg.badge)}>
                    {cfg.label}
                  </span>
                  <span className="text-[10px] text-muted-foreground uppercase tracking-wide">{alert.category}</span>
                </div>
                <p className="text-xs text-foreground font-medium mt-0.5 leading-snug">{alert.message}</p>
              </div>
              <button
                onClick={() => setDismissed(d => new Set([...d, alert.id]))}
                className="text-muted-foreground hover:text-foreground transition-colors flex-shrink-0 mt-0.5"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}