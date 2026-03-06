import { useEffect, useMemo, useState } from "react";
import { base44 } from "@/api/base44Client";
import {
  Activity,
  AlertTriangle,
  BarChart2,
  CalendarDays,
  DollarSign,
  FlaskConical,
  Leaf,
  Package,
  Settings2,
  ShieldCheck,
  ShoppingCart,
  Sprout,
  Upload,
  User,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { format, isToday, isYesterday, parseISO } from "date-fns";

const ENTITY_CONFIG = {
  HarvestRecord: { icon: BarChart2, color: "bg-green-100 text-green-700", label: "Harvest" },
  Incident: { icon: AlertTriangle, color: "bg-red-100 text-red-700", label: "Incident" },
  ExpenseRecord: { icon: DollarSign, color: "bg-blue-100 text-blue-700", label: "Expense" },
  Treatment: { icon: FlaskConical, color: "bg-yellow-100 text-yellow-700", label: "Treatment" },
  SalesRecord: { icon: ShoppingCart, color: "bg-emerald-100 text-emerald-700", label: "Sale" },
  CropCycle: { icon: Leaf, color: "bg-lime-100 text-lime-700", label: "Crop Cycle" },
  PlantPopulationLog: { icon: Sprout, color: "bg-teal-100 text-teal-700", label: "Population" },
  InventoryItem: { icon: Package, color: "bg-purple-100 text-purple-700", label: "Inventory" },
  CalendarEvent: { icon: CalendarDays, color: "bg-indigo-100 text-indigo-700", label: "Calendar" },
  User: { icon: User, color: "bg-cyan-100 text-cyan-700", label: "User" },
  Auth: { icon: ShieldCheck, color: "bg-slate-100 text-slate-700", label: "Auth" },
  File: { icon: Upload, color: "bg-amber-100 text-amber-700", label: "Upload" },
  EventReminder: { icon: Settings2, color: "bg-violet-100 text-violet-700", label: "Reminder" },
  UserProfile: { icon: User, color: "bg-cyan-100 text-cyan-700", label: "Profile" },
};

const ACTION_BADGE = {
  create: "bg-green-100 text-green-700 border-green-200",
  update: "bg-blue-100 text-blue-700 border-blue-200",
  delete: "bg-red-100 text-red-700 border-red-200",
  login: "bg-cyan-100 text-cyan-700 border-cyan-200",
  logout: "bg-slate-100 text-slate-700 border-slate-200",
  invite: "bg-violet-100 text-violet-700 border-violet-200",
  setup: "bg-emerald-100 text-emerald-700 border-emerald-200",
  upload: "bg-amber-100 text-amber-700 border-amber-200",
  run: "bg-indigo-100 text-indigo-700 border-indigo-200",
  dry_run: "bg-indigo-100 text-indigo-700 border-indigo-200",
  test_email: "bg-pink-100 text-pink-700 border-pink-200",
};

const formatDayLabel = (isoDate) => {
  try {
    const parsed = parseISO(String(isoDate));
    if (isToday(parsed)) return "TODAY";
    if (isYesterday(parsed)) return "YESTERDAY";
    return format(parsed, "MMM d, yyyy").toUpperCase();
  } catch {
    return "UNKNOWN DATE";
  }
};

const formatTimeLabel = (isoDate) => {
  try {
    return format(parseISO(String(isoDate)), "hh:mm a");
  } catch {
    return String(isoDate || "");
  }
};

const normalizeAction = (action) =>
  String(action || "activity")
    .replace(/_/g, " ")
    .trim()
    .toUpperCase();

const sortByDateDesc = (rows) =>
  [...rows].sort((a, b) => String(b.created_date || "").localeCompare(String(a.created_date || "")));

export default function ActivityFeed() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pulse, setPulse] = useState(false);
  const [error, setError] = useState("");

  const load = async () => {
    try {
      const data = await base44.entities.ActivityLog.list("-created_date", 200);
      setLogs(sortByDateDesc(data));
      setError("");
      setPulse(true);
      setTimeout(() => setPulse(false), 700);
    } catch (err) {
      setError(err?.message || "Failed to load activity feed");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    const interval = setInterval(load, 30000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const unsubscribe = base44.entities.ActivityLog.subscribe((event) => {
      if (event.type === "create" && event.data?.id) {
        setLogs((prev) => {
          if (prev.some((item) => item.id === event.data.id)) return prev;
          return sortByDateDesc([event.data, ...prev]).slice(0, 200);
        });
        setPulse(true);
        setTimeout(() => setPulse(false), 700);
        return;
      }
      load();
    });

    return unsubscribe;
  }, []);

  const grouped = useMemo(() => {
    const groups = {};
    logs.forEach((log) => {
      const dayLabel = formatDayLabel(log.created_date || log.updated_date);
      if (!groups[dayLabel]) groups[dayLabel] = [];
      groups[dayLabel].push(log);
    });
    return groups;
  }, [logs]);

  return (
    <div className="bg-card rounded-2xl border border-border overflow-hidden">
      <div className="flex items-center justify-between px-5 py-4 border-b border-border">
        <div>
          <h3 className="font-bold text-base text-foreground flex items-center gap-2">
            <Activity className="w-4 h-4 text-primary" />
            Activity Feed
          </h3>
          <p className="text-xs text-muted-foreground mt-0.5">Real-time audit log of actions across the app.</p>
        </div>
        <div className="flex items-center gap-1.5">
          <div className={cn("w-2 h-2 rounded-full bg-success transition-all", pulse ? "scale-150" : "")} />
          <span className="text-xs text-muted-foreground">Live</span>
        </div>
      </div>

      <div className="divide-y divide-border/50 max-h-[520px] overflow-y-auto">
        {loading ? (
          <div className="p-6 space-y-4">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="flex gap-3 items-start">
                <div className="w-9 h-9 rounded-full bg-muted animate-pulse flex-shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="h-3 bg-muted animate-pulse rounded w-3/4" />
                  <div className="h-2.5 bg-muted animate-pulse rounded w-1/2" />
                </div>
              </div>
            ))}
          </div>
        ) : error ? (
          <div className="p-8 text-center text-muted-foreground text-sm">{error}</div>
        ) : logs.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground text-sm">No activity recorded yet.</div>
        ) : (
          Object.entries(grouped).map(([day, dayItems]) => (
            <div key={day}>
              <div className="px-5 py-2 bg-muted/40">
                <span className="text-[10px] font-bold text-muted-foreground tracking-widest">{day}</span>
              </div>
              {dayItems.map((log) => {
                const entityCfg = ENTITY_CONFIG[log.entity] || {
                  icon: Activity,
                  color: "bg-muted text-foreground",
                  label: log.entity || "Activity",
                };
                const actionBadge = ACTION_BADGE[log.action] || "bg-muted text-muted-foreground border-border";
                const Icon = entityCfg.icon;
                const actor = log.actor_name || log.actor_email || "System";
                return (
                  <div key={log.id} className="flex items-start gap-3 px-5 py-3 hover:bg-muted/30 transition-colors">
                    <div className={cn("w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5", entityCfg.color)}>
                      <Icon className="w-4 h-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground leading-snug">{log.summary || "Activity recorded"}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        By {actor}
                        {log.details ? ` • ${log.details}` : ""}
                      </p>
                    </div>
                    <div className="flex flex-col items-end gap-1 flex-shrink-0">
                      <span className={cn("text-[10px] font-semibold px-2 py-0.5 rounded-full border", actionBadge)}>
                        {normalizeAction(log.action)}
                      </span>
                      <span className="text-[10px] text-muted-foreground">{entityCfg.label}</span>
                      <span className="text-[10px] text-muted-foreground">{formatTimeLabel(log.created_date || log.updated_date)}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
