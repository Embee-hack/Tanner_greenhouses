import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import StatCard from "@/components/dashboard/StatCard";
import GreenhouseTile from "@/components/dashboard/GreenhouseTile";
import AlertsBanner from "@/components/dashboard/AlertsBanner";
import ActivityFeed from "@/components/dashboard/ActivityFeed";
import { useCurrency } from "@/components/shared/CurrencyProvider.jsx";
import {
  DollarSign, TrendingUp, Package, Sprout, BarChart2, ShoppingCart
} from "lucide-react";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Legend
} from "recharts";

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

export default function Dashboard() {
  const { fmt } = useCurrency();
  const [greenhouses, setGreenhouses] = useState([]);
  const [cycles, setCycles] = useState([]);
  const [harvests, setHarvests] = useState([]);
  const [sales, setSales] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [popLogs, setPopLogs] = useState([]);
  const [incidents, setIncidents] = useState([]);
  const [inventoryItems, setInventoryItems] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      base44.entities.Greenhouse.list("code"),
      base44.entities.CropCycle.list(),
      base44.entities.HarvestRecord.list("-date", 500),
      base44.entities.SalesRecord.list("-date", 500),
      base44.entities.ExpenseRecord.list("-date", 500),
      base44.entities.PlantPopulationLog.list("-date", 500),
      base44.entities.Incident.list("-date", 100),
      base44.entities.InventoryItem.list("-updated_date", 200),
    ]).then(([gh, cy, ha, sa, ex, po, inc, inv]) => {
      setGreenhouses(gh);
      setCycles(cy);
      setHarvests(ha);
      setSales(sa);
      setExpenses(ex);
      setPopLogs(po);
      setIncidents(inc);
      setInventoryItems(inv);
      setLoading(false);
    });
  }, []);

  const totalRevenue = sales.reduce((s, r) => s + (r.revenue || r.kg_sold * r.price_per_kg || 0), 0);
  const totalExpenses = expenses.reduce((s, e) => s + (e.amount || 0), 0);
  const totalProfit = totalRevenue - totalExpenses;
  const totalKg = harvests.reduce((s, h) => s + (h.kg_harvested || 0), 0);
  const costPerKg = totalKg > 0 ? totalExpenses / totalKg : 0;

  const latestPop = {};
  popLogs.forEach(log => {
    if (!latestPop[log.greenhouse_id] || log.date > latestPop[log.greenhouse_id].date) {
      latestPop[log.greenhouse_id] = log;
    }
  });
  const totalActivePlants = Object.values(latestPop).reduce((s, l) => s + (l.active_plants || 0), 0);

  const monthlyRevMap = {};
  const monthlyExpMap = {};
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
  const last12Months = getLast12MonthKeys();
  const revenueChart = last12Months.map(month => ({
    month,
    monthLabel: formatMonthLabel(month),
    revenue: parseFloat((monthlyRevMap[month] || 0).toFixed(2)),
    profit: parseFloat(((monthlyRevMap[month] || 0) - (monthlyExpMap[month] || 0)).toFixed(2)),
  }));

  const ghMetrics = greenhouses.map(gh => {
    const ghCycles = cycles.filter(c => c.greenhouse_id === gh.id);
    const activeCycle = ghCycles.find(c => c.status === "active");
    const ghHarvests = harvests.filter(h => h.greenhouse_id === gh.id);
    const ghSales = sales.filter(s => s.greenhouse_id === gh.id);
    const ghExpenses = expenses.filter(e => e.greenhouse_id === gh.id);
    const ghKg = ghHarvests.reduce((s, h) => s + (h.kg_harvested || 0), 0);
    const ghRevenue = ghSales.reduce((s, r) => s + (r.revenue || r.kg_sold * r.price_per_kg || 0), 0);
    const ghCost = ghExpenses.reduce((s, e) => s + (e.amount || 0), 0);
    const ghProfit = ghRevenue - ghCost;
    const activePlants = latestPop[gh.id]?.active_plants || activeCycle?.plants_planted || 0;
    const yield_per_plant = activePlants > 0 ? ghKg / activePlants : null;
    const profit_per_plant = activePlants > 0 ? ghProfit / activePlants : null;
    const score = Math.min(100, Math.max(0,
      (yield_per_plant != null ? Math.min(yield_per_plant * 20, 50) : 25) +
      (profit_per_plant != null ? Math.min(profit_per_plant * 5 + 25, 50) : 25)
    ));
    return {
      greenhouse_id: gh.id,
      active_plants: activePlants,
      yield_per_plant,
      profit_per_plant,
      performance_score: score,
      trend: ghRevenue > 0 ? (ghProfit / ghRevenue) * 100 : 0,
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

  return (
    <div className="p-3 sm:p-4 md:p-6 space-y-5">
      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <StatCard title="Total Revenue" value={fmt(totalRevenue)} icon={DollarSign} color="success" loading={loading} subtitle="All-time sales" />
        <StatCard title="Net Profit" value={fmt(totalProfit)} icon={TrendingUp} color={totalProfit >= 0 ? "primary" : "danger"} loading={loading} subtitle="Revenue minus expenses" />
        <StatCard title="Total Expenses" value={fmt(totalExpenses)} icon={Package} color="warning" loading={loading} subtitle={`Across all greenhouses`} />
        <StatCard title="Active Plants" value={totalActivePlants.toLocaleString()} icon={Sprout} color="accent" loading={loading} subtitle={`Across ${greenhouses.filter(g => g.status === "active").length} active greenhouses`} />
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
        />
      )}

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-card rounded-2xl border border-border p-4 sm:p-5">
          <div className="flex items-center gap-2 mb-1">
            <BarChart2 className="w-4 h-4 text-primary" />
            <h3 className="font-semibold text-sm text-foreground">Monthly Revenue & Profit</h3>
          </div>
          <p className="text-xs text-muted-foreground mb-2">Amount (₦) · last 12 months</p>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={revenueChart} margin={{ top: 8, right: 12, left: 8, bottom: 8 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(150,12%,88%)" vertical={false} />
              <XAxis
                dataKey="month"
                tick={{ fontSize: 10 }}
                axisLine={false}
                tickLine={false}
                tickFormatter={formatMonthTick}
              />
              <YAxis tick={{ fontSize: 10 }} width={80} axisLine={false} tickLine={false} tickFormatter={v => fmt(v, 0)} />
              <Tooltip
                formatter={(v, name) => [fmt(v), name]}
                labelFormatter={(_, payload) => payload?.[0]?.payload?.monthLabel || ""}
              />
              <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11 }} />
              <Line type="monotone" dataKey="revenue" name="Revenue" stroke="hsl(152,60%,40%)" strokeWidth={2.5} dot={{ r: 3 }} activeDot={{ r: 5 }} />
              <Line type="monotone" dataKey="profit" name="Profit" stroke="hsl(199,89%,48%)" strokeWidth={2.5} dot={{ r: 3 }} activeDot={{ r: 5 }} />
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
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
            {greenhouses.filter(gh => gh.status === "active" && cycles.some(c => c.greenhouse_id === gh.id && c.status === "active")).map(gh => (
              <GreenhouseTile
                key={gh.id}
                greenhouse={gh}
                metrics={metricsMap[gh.id]}
              />
            ))}
          </div>
        )}
      </div>

      {/* Activity Feed */}
      <ActivityFeed />
    </div>
  );
}
