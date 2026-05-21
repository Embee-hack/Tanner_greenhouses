import { useEffect, useMemo, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { useNavigate } from "react-router-dom";
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
import { createPageUrl } from "@/utils";

const ENTITY_CONFIG = {
  HarvestRecord: { icon: BarChart2, color: "bg-success/14 text-success", label: "Harvest" },
  Incident: { icon: AlertTriangle, color: "bg-danger/14 text-danger", label: "Incident" },
  ExpenseRecord: { icon: DollarSign, color: "bg-sky-400/14 text-sky-200", label: "Expense" },
  Treatment: { icon: FlaskConical, color: "bg-warning/14 text-warning", label: "Response" },
  NurseryBatch: { icon: Sprout, color: "bg-success/14 text-success", label: "Nursery Batch" },
  NurseryDailyLog: { icon: CalendarDays, color: "bg-teal-400/14 text-teal-200", label: "Nursery Log" },
  WorkerAttendance: { icon: CalendarDays, color: "bg-cyan-400/14 text-cyan-200", label: "Attendance" },
  WorkerGrievance: { icon: AlertTriangle, color: "bg-orange-400/14 text-orange-200", label: "Grievance" },
  SalesRecord: { icon: ShoppingCart, color: "bg-success/14 text-success", label: "Sale" },
  CropCycle: { icon: Leaf, color: "bg-lime-400/14 text-lime-200", label: "Crop Cycle" },
  PlantPopulationLog: { icon: Sprout, color: "bg-teal-400/14 text-teal-200", label: "Population" },
  InventoryItem: { icon: Package, color: "bg-purple-400/14 text-purple-200", label: "Inventory" },
  CalendarEvent: { icon: CalendarDays, color: "bg-indigo-400/14 text-indigo-200", label: "Calendar" },
  User: { icon: User, color: "bg-cyan-400/14 text-cyan-200", label: "User" },
  Auth: { icon: ShieldCheck, color: "bg-muted/70 text-muted-foreground", label: "Auth" },
  File: { icon: Upload, color: "bg-warning/14 text-warning", label: "Upload" },
  EventReminder: { icon: Settings2, color: "bg-violet-400/14 text-violet-200", label: "Reminder" },
  UserProfile: { icon: User, color: "bg-cyan-400/14 text-cyan-200", label: "Profile" },
};

const ACTION_BADGE = {
  create: "bg-success/14 text-success border-success/30",
  update: "bg-sky-400/14 text-sky-200 border-sky-300/30",
  delete: "bg-danger/14 text-danger border-danger/30",
  login: "bg-cyan-400/14 text-cyan-200 border-cyan-300/30",
  logout: "bg-muted/70 text-muted-foreground border-border",
  invite: "bg-violet-400/14 text-violet-200 border-violet-300/30",
  setup: "bg-success/14 text-success border-success/30",
  upload: "bg-warning/14 text-warning border-warning/30",
  run: "bg-indigo-400/14 text-indigo-200 border-indigo-300/30",
  dry_run: "bg-indigo-400/14 text-indigo-200 border-indigo-300/30",
  test_email: "bg-pink-400/14 text-pink-200 border-pink-300/30",
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

const formatActivityCount = (count) => `${count} activit${count === 1 ? "y" : "ies"}`;

const getActivitySource = (log) => {
  const action = String(log?.action || "").trim().toLowerCase();
  const entity = String(log?.entity || "").trim();
  const entityId = String(log?.entity_id || "").trim();
  const isDeleteAction = action === "delete" || action === "bulk_delete";

  if (isDeleteAction || !entityId) {
    return null;
  }

  switch (entity) {
    case "Incident":
      return { href: createPageUrl(`Incidents?incident=${encodeURIComponent(entityId)}`) };
    case "Treatment":
      return { href: createPageUrl(`Treatments?response=${encodeURIComponent(entityId)}`) };
    case "NurseryBatch":
      return { href: createPageUrl(`NurseryBatches?batch=${encodeURIComponent(entityId)}`) };
    case "NurseryDailyLog":
      return { href: createPageUrl(`NurseryDailyLogs?log=${encodeURIComponent(entityId)}`) };
    case "SalesRecord":
      return { href: createPageUrl(`Sales?sale=${encodeURIComponent(entityId)}`) };
    case "ExpenseRecord":
      return { href: createPageUrl(`Expenses?expense=${encodeURIComponent(entityId)}`) };
    case "WorkerGrievance":
      return { href: createPageUrl(`WorkerGrievances?grievance=${encodeURIComponent(entityId)}`) };
    case "WorkerAttendance":
      return { href: createPageUrl(`WorkerAttendance?attendance=${encodeURIComponent(entityId)}`) };
    case "HarvestRecord":
      return { href: createPageUrl(`Harvests?harvest=${encodeURIComponent(entityId)}`) };
    case "InventoryItem":
      return { href: createPageUrl(`Inventory?item=${encodeURIComponent(entityId)}`) };
    case "CropCycle":
      return { href: createPageUrl(`CropCycles?cycle=${encodeURIComponent(entityId)}`) };
    case "CalendarEvent":
      return { href: createPageUrl(`FarmCalendar?event=${encodeURIComponent(entityId)}`) };
    case "User":
      return { href: createPageUrl(`UserManagement?user=${encodeURIComponent(entityId)}`) };
    case "Greenhouse":
      return { href: createPageUrl(`GreenhouseDetail?id=${encodeURIComponent(entityId)}`) };
    default:
      return null;
  }
};

export default function ActivityFeed() {
  const navigate = useNavigate();
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pulse, setPulse] = useState(false);
  const [error, setError] = useState("");
  const [expandedDays, setExpandedDays] = useState([]);
  const [hasAutoExpanded, setHasAutoExpanded] = useState(false);

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
    const groups = new Map();
    logs.forEach((log) => {
      const timestamp = log.created_date || log.updated_date;
      const dateKey = String(timestamp || "").slice(0, 10) || `unknown-${log.id}`;

      if (!groups.has(dateKey)) {
        groups.set(dateKey, {
          dateKey,
          dayLabel: formatDayLabel(timestamp),
          items: [],
          entityLabels: new Set(),
        });
      }

      const group = groups.get(dateKey);
      group.items.push(log);
      if (log.entity) {
        const label = ENTITY_CONFIG[log.entity]?.label || log.entity;
        group.entityLabels.add(label);
      }
    });

    return Array.from(groups.values()).map((group) => {
      const entityPreview = Array.from(group.entityLabels).slice(0, 3);
      return {
        ...group,
        entityPreview,
        remainingEntityCount: Math.max(0, group.entityLabels.size - entityPreview.length),
      };
    });
  }, [logs]);

  useEffect(() => {
    setExpandedDays((current) => current.filter((value) => grouped.some((group) => group.dateKey === value)));
  }, [grouped]);

  useEffect(() => {
    if (!hasAutoExpanded && grouped.length > 0) {
      setExpandedDays([grouped[0].dateKey]);
      setHasAutoExpanded(true);
      return;
    }

    if (grouped.length === 0 && hasAutoExpanded) {
      setHasAutoExpanded(false);
    }
  }, [grouped, hasAutoExpanded]);

  return (
    <div className="console-glass bg-card/85 rounded-2xl border overflow-hidden">
      <div className="flex items-center justify-between px-5 py-4 border-b border-border/70">
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

      <div className="divide-y divide-border/50">
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
          <Accordion type="multiple" value={expandedDays} onValueChange={setExpandedDays}>
            {grouped.map((group) => (
              <AccordionItem key={group.dateKey} value={group.dateKey} className="border-b-0">
                <AccordionTrigger className="px-5 py-3 bg-muted/40 hover:no-underline">
                  <div className="flex flex-1 flex-col gap-2 text-left md:flex-row md:items-center md:justify-between pr-3">
                    <div>
                      <div className="text-[10px] font-bold text-muted-foreground tracking-widest">{group.dayLabel}</div>
                      <div className="text-sm font-medium text-foreground mt-1">{formatActivityCount(group.items.length)}</div>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {group.entityPreview.map((label) => (
                        <span key={label} className="text-[10px] font-semibold px-2 py-0.5 rounded-full border bg-card text-muted-foreground border-border">
                          {label}
                        </span>
                      ))}
                      {group.remainingEntityCount > 0 ? (
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full border bg-card text-muted-foreground border-border">
                          +{group.remainingEntityCount} more
                        </span>
                      ) : null}
                    </div>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="pb-0">
                  {group.items.map((log) => {
                    const entityCfg = ENTITY_CONFIG[log.entity] || {
                      icon: Activity,
                      color: "bg-muted text-foreground",
                      label: log.entity || "Activity",
                    };
                    const actionBadge = ACTION_BADGE[log.action] || "bg-muted text-muted-foreground border-border";
                    const Icon = entityCfg.icon;
                    const actor = log.actor_name || log.actor_email || "System";
                    const source = getActivitySource(log);
                    const rowClassName = cn(
                      "flex w-full items-start gap-3 px-5 py-3 text-left transition-colors",
                      source ? "cursor-pointer hover:bg-muted/30" : ""
                    );
                    const content = (
                      <>
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
                      </>
                    );

                    return source ? (
                      <button
                        key={log.id}
                        type="button"
                        onClick={() => navigate(source.href)}
                        className={rowClassName}
                      >
                        {content}
                      </button>
                    ) : (
                      <div key={log.id} className={rowClassName}>
                        {content}
                      </div>
                    );
                  })}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        )}
      </div>
    </div>
  );
}
