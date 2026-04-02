import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import StatCard from "@/components/dashboard/StatCard";
import GreenhouseTile from "@/components/dashboard/GreenhouseTile";
import AlertsBanner from "@/components/dashboard/AlertsBanner";
import ErrorBanner from "@/components/shared/ErrorBanner.jsx";
import { useAuth } from "@/lib/AuthContext";
import { isAdminUser } from "@/lib/roles.js";
import { useCurrency } from "@/components/shared/CurrencyProvider.jsx";
import { getErrorMessage } from "@/lib/errors.js";
import { createPageUrl } from "@/utils";
import {
  ArrowRight, CalendarDays, CheckCircle2, CircleDashed, DollarSign, TrendingUp, Package, Sprout, BarChart2, ShoppingCart, AlertTriangle, Warehouse, Users
} from "lucide-react";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Legend
} from "recharts";
import { Link } from "react-router-dom";

const getLast12MonthKeys = () => {
  const keys = [];
  const anchor = new Date();
  for (let i = 11; i >= 0; i -= 1) {
    const monthDate = new Date(anchor.getFullYear(), anchor.getMonth() - i, 1);
    const year = monthDate.getFullYear();
    const month = String(monthDate.getMonth() + 1).padStart(2, "0");
    keys.push(`${year}-${month}`);
  }
  return keys;
};

const formatMonthTick = (monthKey) => {
  if (!monthKey || !/^\d{4}-\d{2}$/.test(monthKey)) return monthKey || "";
  const [year, month] = monthKey.split("-").map(Number);
  const date = new Date(year, month - 1, 1);
  if (Number.isNaN(date.getTime())) return monthKey;
  return new Intl.DateTimeFormat("en-US", { month: "short" }).format(date);
};

const formatMonthLabel = (monthKey) => {
  if (!monthKey || !/^\d{4}-\d{2}$/.test(monthKey)) return monthKey || "";
  const [year, month] = monthKey.split("-").map(Number);
  const date = new Date(year, month - 1, 1);
  if (Number.isNaN(date.getTime())) return monthKey;
  return new Intl.DateTimeFormat("en-US", { month: "short", year: "numeric" }).format(date);
};

const parseCalendarDate = (value) => {
  if (!value) return null;
  const parsed = new Date(`${value}T00:00:00`);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const getCalendarRange = (event) => {
  const start = parseCalendarDate(event?.date);
  const end = parseCalendarDate(event?.end_date || event?.date);
  if (!start || !end) return null;
  return start.getTime() <= end.getTime() ? { start, end } : { start: end, end: start };
};

const formatCalendarRange = (event) => {
  const range = getCalendarRange(event);
  if (!range) return "Date not set";

  const sameDay = range.start.toDateString() === range.end.toDateString();
  if (sameDay) {
    return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" }).format(range.start);
  }

  const sameYear = range.start.getFullYear() === range.end.getFullYear();
  const startLabel = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" }).format(range.start);
  const endLabel = new Intl.DateTimeFormat("en-US", sameYear ? { month: "short", day: "numeric" } : { month: "short", day: "numeric", year: "numeric" }).format(range.end);
  return `${startLabel} - ${endLabel}`;
};

const severityRank = {
  critical: 0,
  high: 1,
  medium: 2,
  low: 3,
};

export default function Dashboard() {
  const { fmt } = useCurrency();
  const { user } = useAuth();
  const isAdmin = isAdminUser(user);
  const [greenhouses, setGreenhouses] = useState([]);
  const [cycles, setCycles] = useState([]);
  const [harvests, setHarvests] = useState([]);
  const [sales, setSales] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [popLogs, setPopLogs] = useState([]);
  const [incidents, setIncidents] = useState([]);
  const [inventoryItems, setInventoryItems] = useState([]);
  const [workers, setWorkers] = useState([]);
  const [calendarEvents, setCalendarEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  const load = async () => {
    try {
      setLoading(true);
      const [gh, cy, ha, sa, ex, po, inc, inv, workerRows, eventRows] = await Promise.all([
        base44.entities.Greenhouse.list("code"),
        base44.entities.CropCycle.list(),
        base44.entities.HarvestRecord.list("-date", 500),
        isAdmin ? base44.entities.SalesRecord.list("-date", 500) : Promise.resolve([]),
        isAdmin ? base44.entities.ExpenseRecord.list("-date", 500) : Promise.resolve([]),
        base44.entities.PlantPopulationLog.list("-date", 500),
        base44.entities.Incident.list("-date", 100),
        base44.entities.InventoryItem.list("-updated_date", 200),
        base44.entities.Worker.list(),
        base44.entities.CalendarEvent.list("date", 120),
      ]);
      setGreenhouses(gh);
      setCycles(cy);
      setHarvests(ha);
      setSales(sa);
      setExpenses(ex);
      setPopLogs(po);
      setIncidents(inc);
      setInventoryItems(inv);
      setWorkers(workerRows);
      setCalendarEvents(eventRows);
      setLoadError("");
    } catch (err) {
      setLoadError(getErrorMessage(err, "Failed to load dashboard data."));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [isAdmin]);

  const totalRevenue = sales.reduce((s, r) => s + (r.revenue || r.kg_sold * r.price_per_kg || 0), 0);
  const totalExpenses = expenses.reduce((s, e) => s + (e.amount || 0), 0);
  const totalProfit = totalRevenue - totalExpenses;
  const totalKg = harvests.reduce((s, h) => s + (h.kg_harvested || 0), 0);
  const activeGreenhouses = greenhouses.filter((g) => g.status === "active").length;
  const openIncidents = incidents.filter((incident) => incident.status === "open" || incident.status === "treated").length;
  const activeCycles = cycles.filter((cycle) => cycle.status === "active").length;

  const latestPop = {};
  popLogs.forEach(log => {
    if (!latestPop[log.greenhouse_id] || log.date > latestPop[log.greenhouse_id].date) {
      latestPop[log.greenhouse_id] = log;
    }
  });
  const totalActivePlants = Object.values(latestPop).reduce((s, l) => s + (l.active_plants || 0), 0);

  const monthlyRevMap = {};
  const monthlyExpMap = {};
  const monthlyHarvestMap = {};
  sales.forEach(s => {
    const key = s.date ? s.date.slice(0, 7) : null;
    if (!key) return;
    monthlyRevMap[key] = (monthlyRevMap[key] || 0) + (s.revenue || s.kg_sold * s.price_per_kg || 0);
  });
  expenses.forEach(e => {
    const key = e.date ? e.date.slice(0, 7) : null;
    if (!key) return;
    monthlyExpMap[key] = (monthlyExpMap[key] || 0) + (e.amount || 0);
  });
  harvests.forEach((harvest) => {
    const key = harvest.date ? harvest.date.slice(0, 7) : null;
    if (!key) return;
    monthlyHarvestMap[key] = (monthlyHarvestMap[key] || 0) + (harvest.kg_harvested || 0);
  });
  const last12Months = getLast12MonthKeys();
  const revenueChart = last12Months.map(month => ({
    month,
    monthLabel: formatMonthLabel(month),
    revenue: parseFloat((monthlyRevMap[month] || 0).toFixed(2)),
    profit: parseFloat(((monthlyRevMap[month] || 0) - (monthlyExpMap[month] || 0)).toFixed(2)),
  }));
  const harvestChart = last12Months.map((month) => ({
    month,
    monthLabel: formatMonthLabel(month),
    harvest: parseFloat((monthlyHarvestMap[month] || 0).toFixed(2)),
  }));

  const ghMetrics = greenhouses.map(gh => {
    const ghCycles = cycles.filter(c => c.greenhouse_id === gh.id);
    const activeCycle = ghCycles.find(c => c.status === "active");
    const ghHarvests = harvests.filter(h => h.greenhouse_id === gh.id);
    const ghKg = ghHarvests.reduce((s, h) => s + (h.kg_harvested || 0), 0);
    const activePlants = latestPop[gh.id]?.active_plants || activeCycle?.plants_planted || 0;
    const yield_per_plant = activePlants > 0 ? ghKg / activePlants : null;
    const ghSales = isAdmin ? sales.filter(s => s.greenhouse_id === gh.id) : [];
    const ghExpenses = isAdmin ? expenses.filter(e => e.greenhouse_id === gh.id) : [];
    const ghRevenue = ghSales.reduce((sum, row) => sum + (row.revenue || row.kg_sold * row.price_per_kg || 0), 0);
    const ghCost = ghExpenses.reduce((sum, row) => sum + (row.amount || 0), 0);
    const ghProfit = ghRevenue - ghCost;
    const profit_per_plant = isAdmin && activePlants > 0 ? ghProfit / activePlants : null;
    const score = Math.min(
      100,
      Math.max(
        0,
        isAdmin
          ? (yield_per_plant != null ? Math.min(yield_per_plant * 20, 50) : 25) +
            (profit_per_plant != null ? Math.min(profit_per_plant * 5 + 25, 50) : 25)
          : yield_per_plant != null
            ? Math.min(yield_per_plant * 35, 100)
            : 20
      )
    );
    return {
      greenhouse_id: gh.id,
      active_plants: activePlants,
      yield_per_plant,
      profit_per_plant,
      performance_score: score,
      trend: isAdmin && ghRevenue > 0 ? (ghProfit / ghRevenue) * 100 : null,
    };
  });

  const metricsMap = Object.fromEntries(ghMetrics.map(m => [m.greenhouse_id, m]));

  const topYield = [...ghMetrics]
    .filter(m => m.yield_per_plant != null)
    .sort((a, b) => b.yield_per_plant - a.yield_per_plant)
    .slice(0, 5)
    .map(m => ({
      name: greenhouses.find(g => g.id === m.greenhouse_id)?.code || m.greenhouse_id,
      yield: parseFloat(m.yield_per_plant.toFixed(2)),
    }));

  const today = new Date();
  const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const weekEnd = new Date(todayStart);
  weekEnd.setDate(weekEnd.getDate() + 7);

  const checklistItems = [
    { key: "greenhouses", label: "Register at least one greenhouse", done: greenhouses.length > 0, href: createPageUrl("Greenhouses"), action: greenhouses.length > 0 ? "Review setup" : "Add greenhouse" },
    { key: "cycles", label: "Start an active crop cycle", done: activeCycles > 0, href: createPageUrl("CropCycles"), action: activeCycles > 0 ? "Manage cycles" : "Start cycle" },
    { key: "inventory", label: "Stock your inventory", done: inventoryItems.length > 0, href: createPageUrl("Inventory"), action: inventoryItems.length > 0 ? "Review stock" : "Add stock" },
    { key: "workers", label: "Add and assign workers", done: workers.length > 0, href: createPageUrl("Workers"), action: workers.length > 0 ? "Manage team" : "Add workers" },
    { key: "calendar", label: "Schedule upcoming work", done: calendarEvents.length > 0, href: createPageUrl("FarmCalendar"), action: calendarEvents.length > 0 ? "Open calendar" : "Add event" },
    { key: "harvests", label: "Log the first harvest", done: harvests.length > 0, href: createPageUrl("Harvests"), action: harvests.length > 0 ? "Review harvests" : "Log harvest" },
    ...(isAdmin
      ? [
          { key: "sales", label: "Record the first sale", done: sales.length > 0, href: createPageUrl("Sales"), action: sales.length > 0 ? "Open sales" : "Record sale" },
          { key: "expenses", label: "Record the first expense", done: expenses.length > 0, href: createPageUrl("Expenses"), action: expenses.length > 0 ? "Open expenses" : "Record expense" },
        ]
      : []),
  ];

  const completedChecklistCount = checklistItems.filter((item) => item.done).length;
  const urgentIncidents = incidents
    .filter((incident) => incident.status === "open" || incident.status === "treated")
    .sort((a, b) => {
      const severityDiff = (severityRank[a.severity] ?? 99) - (severityRank[b.severity] ?? 99);
      if (severityDiff !== 0) return severityDiff;
      return String(a.date || "").localeCompare(String(b.date || ""));
    })
    .slice(0, 4);
  const upcomingEvents = calendarEvents
    .filter((event) => {
      const range = getCalendarRange(event);
      if (!range) return false;
      return range.end >= todayStart && range.start <= weekEnd;
    })
    .sort((a, b) => {
      const aStart = getCalendarRange(a)?.start?.getTime() || 0;
      const bStart = getCalendarRange(b)?.start?.getTime() || 0;
      return aStart - bStart;
    })
    .slice(0, 5);
  const performanceGreenhouses = greenhouses.filter(
    (gh) => gh.status === "active" && cycles.some((cycle) => cycle.greenhouse_id === gh.id && cycle.status === "active")
  );

  return (
    <div className="p-3 sm:p-4 md:p-6 space-y-5">
      <ErrorBanner message={loadError} onRetry={load} />

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {isAdmin ? (
          <>
            <StatCard title="Total Revenue" value={fmt(totalRevenue)} icon={DollarSign} color="success" loading={loading} subtitle="All-time sales" />
            <StatCard title="Net Profit" value={fmt(totalProfit)} icon={TrendingUp} color={totalProfit >= 0 ? "primary" : "danger"} loading={loading} subtitle="Revenue minus expenses" />
            <StatCard title="Total Expenses" value={fmt(totalExpenses)} icon={Package} color="warning" loading={loading} subtitle="Across all greenhouses" />
            <StatCard title="Active Plants" value={totalActivePlants.toLocaleString()} icon={Sprout} color="accent" loading={loading} subtitle={`Across ${activeGreenhouses} active greenhouses`} />
          </>
        ) : (
          <>
            <StatCard title="Active Greenhouses" value={activeGreenhouses} icon={Warehouse} color="primary" loading={loading} subtitle={`${activeCycles} crop cycle${activeCycles === 1 ? "" : "s"} running`} />
            <StatCard title="Active Plants" value={totalActivePlants.toLocaleString()} icon={Sprout} color="accent" loading={loading} subtitle="Current live plant count" />
            <StatCard title="Harvest Volume" value={`${totalKg.toLocaleString()} kg`} icon={BarChart2} color="success" loading={loading} subtitle="Recorded harvest output" />
            <StatCard title="Open Incidents" value={openIncidents} icon={AlertTriangle} color={openIncidents > 0 ? "warning" : "primary"} loading={loading} subtitle="Issues needing follow-up" />
          </>
        )}
      </div>

      {/* Alerts Banner */}
      {!loading && (
        <AlertsBanner
          harvests={harvests}
          incidents={incidents}
          expenses={expenses}
          inventoryItems={inventoryItems}
          greenhouses={greenhouses}
          cycles={cycles}
          includeFinanceAlerts={isAdmin}
        />
      )}

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <div className="bg-card rounded-2xl border border-border p-4 sm:p-5">
          <div className="flex items-center justify-between gap-3 mb-4">
            <div>
              <h3 className="font-semibold text-sm text-foreground">Launch Checklist</h3>
              <p className="text-xs text-muted-foreground mt-1">{completedChecklistCount} of {checklistItems.length} setup steps completed</p>
            </div>
            <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
              {Math.round((completedChecklistCount / Math.max(checklistItems.length, 1)) * 100)}% ready
            </span>
          </div>

          <div className="space-y-2">
            {checklistItems.map((item) => (
              <div key={item.key} className="flex items-center justify-between gap-3 rounded-xl border border-border px-3 py-3">
                <div className="flex min-w-0 items-start gap-3">
                  <div className={item.done ? "text-success" : "text-muted-foreground"}>
                    {item.done ? <CheckCircle2 className="h-4 w-4 mt-0.5" /> : <CircleDashed className="h-4 w-4 mt-0.5" />}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-foreground">{item.label}</p>
                    <p className="text-xs text-muted-foreground">{item.done ? "Completed" : "Still needed before launch"}</p>
                  </div>
                </div>
                <Link to={item.href} className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:text-primary/80">
                  {item.action}
                  <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-card rounded-2xl border border-border p-4 sm:p-5">
          <div className="flex items-center justify-between gap-3 mb-4">
            <div>
              <h3 className="font-semibold text-sm text-foreground">Upcoming This Week</h3>
              <p className="text-xs text-muted-foreground mt-1">Open incidents and scheduled work over the next 7 days</p>
            </div>
            <Link to={createPageUrl("FarmCalendar")} className="text-xs font-semibold text-primary hover:text-primary/80">
              Open Calendar
            </Link>
          </div>

          {urgentIncidents.length === 0 && upcomingEvents.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border px-4 py-8 text-center">
              <CalendarDays className="h-5 w-5 text-muted-foreground mx-auto mb-2" />
              <p className="text-sm font-medium text-foreground">Nothing is scheduled yet</p>
              <p className="text-xs text-muted-foreground mt-1">Add calendar events so the team has a clear work plan for the week.</p>
            </div>
          ) : (
            <div className="space-y-4">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <AlertTriangle className="h-4 w-4 text-warning" />
                  <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Urgent Incidents</h4>
                </div>
                <div className="space-y-2">
                  {urgentIncidents.length === 0 ? (
                    <div className="rounded-xl border border-border px-3 py-3 text-xs text-muted-foreground">No urgent incidents needing follow-up.</div>
                  ) : (
                    urgentIncidents.map((incident) => (
                      <div key={incident.id} className="rounded-xl border border-border px-3 py-3">
                        <div className="flex items-center justify-between gap-3">
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-foreground">{incident.name || incident.incident_type}</p>
                            <p className="text-xs text-muted-foreground mt-1">
                              {(greenhouses.find((gh) => gh.id === incident.greenhouse_id)?.code || "Unassigned greenhouse")} · {incident.date || "No date"}
                            </p>
                          </div>
                          <span className="rounded-full bg-warning/10 px-2.5 py-1 text-[11px] font-semibold capitalize text-warning">
                            {incident.severity || incident.status}
                          </span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              <div>
                <div className="flex items-center gap-2 mb-2">
                  <CalendarDays className="h-4 w-4 text-primary" />
                  <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Scheduled Work</h4>
                </div>
                <div className="space-y-2">
                  {upcomingEvents.length === 0 ? (
                    <div className="rounded-xl border border-border px-3 py-3 text-xs text-muted-foreground">No calendar events in the next 7 days.</div>
                  ) : (
                    upcomingEvents.map((event) => (
                      <div key={event.id} className="rounded-xl border border-border px-3 py-3">
                        <div className="flex items-center justify-between gap-3">
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-foreground">{event.title}</p>
                            <p className="text-xs text-muted-foreground mt-1">
                              {formatCalendarRange(event)}
                              {event.greenhouse_id ? ` · ${greenhouses.find((gh) => gh.id === event.greenhouse_id)?.code || "General"}` : " · General"}
                            </p>
                          </div>
                          <span className="rounded-full bg-primary/10 px-2.5 py-1 text-[11px] font-semibold capitalize text-primary">
                            {String(event.event_type || "other").replace(/_/g, " ")}
                          </span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-card rounded-2xl border border-border p-4 sm:p-5">
          <div className="flex items-center gap-2 mb-1">
            <BarChart2 className="w-4 h-4 text-primary" />
            <h3 className="font-semibold text-sm text-foreground">
              {isAdmin ? "Monthly Revenue & Profit" : "Monthly Harvest Output"}
            </h3>
          </div>
          <p className="text-xs text-muted-foreground mb-2">
            {isAdmin ? "Amount (₦) · last 12 months" : "Kg harvested · last 12 months"}
          </p>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={isAdmin ? revenueChart : harvestChart} margin={{ top: 8, right: 12, left: 8, bottom: 8 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(150,12%,88%)" vertical={false} />
              <XAxis
                dataKey="month"
                tick={{ fontSize: 10 }}
                axisLine={false}
                tickLine={false}
                tickFormatter={formatMonthTick}
              />
              <YAxis
                tick={{ fontSize: 10 }}
                width={80}
                axisLine={false}
                tickLine={false}
                tickFormatter={(value) => (isAdmin ? fmt(value, 0) : `${value} kg`)}
              />
              <Tooltip
                formatter={(value, name) => [isAdmin ? fmt(value) : `${value} kg`, name]}
                labelFormatter={(_, payload) => payload?.[0]?.payload?.monthLabel || ""}
              />
              <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11 }} />
              {isAdmin ? (
                <>
                  <Line type="monotone" dataKey="revenue" name="Revenue" stroke="hsl(152,60%,40%)" strokeWidth={2.5} dot={{ r: 3 }} activeDot={{ r: 5 }} />
                  <Line type="monotone" dataKey="profit" name="Profit" stroke="hsl(199,89%,48%)" strokeWidth={2.5} dot={{ r: 3 }} activeDot={{ r: 5 }} />
                </>
              ) : (
                <Line type="monotone" dataKey="harvest" name="Harvest" stroke="hsl(152,60%,40%)" strokeWidth={2.5} dot={{ r: 3 }} activeDot={{ r: 5 }} />
              )}
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-card rounded-2xl border border-border p-4 sm:p-5">
          <div className="flex items-center gap-2 mb-4">
            <ShoppingCart className="w-4 h-4 text-accent" />
            <h3 className="font-semibold text-sm text-foreground">Top 5 — Yield/Plant</h3>
          </div>
          {topYield.length > 0 ? (
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={topYield} barCategoryGap="35%">
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(150,12%,88%)" vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10 }} axisLine={false} tickLine={false} label={{ value: "kg / plant", angle: -90, position: "insideLeft", offset: 10, style: { fontSize: 10, fill: "hsl(150,10%,45%)" } }} />
                <Tooltip formatter={(v) => [`${v} kg`, "Yield/Plant"]} />
                <Bar dataKey="yield" fill="hsl(152,60%,40%)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[180px] flex items-center justify-center text-muted-foreground text-sm">No harvest data yet</div>
          )}
        </div>
      </div>

      {/* Greenhouse Performance Tiles */}
      <div>
        <h3 className="font-bold text-base text-foreground mb-3">Greenhouse Performance</h3>
        {loading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
            {Array.from({ length: 22 }).map((_, i) => (
              <div key={i} className="h-48 bg-muted animate-pulse rounded-2xl" />
            ))}
          </div>
        ) : performanceGreenhouses.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border bg-card px-5 py-8 text-center">
            <Users className="h-5 w-5 text-muted-foreground mx-auto mb-2" />
            <p className="text-sm font-medium text-foreground">No active greenhouse performance data yet</p>
            <p className="text-xs text-muted-foreground mt-1">Start an active crop cycle and log plant or harvest activity to unlock these performance tiles.</p>
            <div className="mt-4 flex items-center justify-center gap-3">
              <Link to={createPageUrl("Greenhouses")} className="text-xs font-semibold text-primary hover:text-primary/80">
                Manage Greenhouses
              </Link>
              <Link to={createPageUrl("CropCycles")} className="text-xs font-semibold text-primary hover:text-primary/80">
                Start Crop Cycle
              </Link>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
            {performanceGreenhouses.map(gh => (
              <GreenhouseTile
                key={gh.id}
                greenhouse={gh}
                metrics={metricsMap[gh.id]}
                showFinancialMetrics={isAdmin}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
