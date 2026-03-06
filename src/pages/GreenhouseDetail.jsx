import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useCurrency } from "@/components/shared/CurrencyProvider.jsx";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import {
  ArrowLeft, Sprout, TrendingUp, DollarSign, Package,
  Bug, Leaf, BarChart2, AlertTriangle
} from "lucide-react";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, LineChart, Line } from "recharts";
import { cn } from "@/lib/utils";

const severityConfig = {
  low: { bg: "bg-blue-50", text: "text-blue-700", border: "border-blue-200" },
  medium: { bg: "bg-amber-50", text: "text-amber-700", border: "border-amber-200" },
  high: { bg: "bg-orange-50", text: "text-orange-700", border: "border-orange-200" },
  critical: { bg: "bg-red-50", text: "text-red-700", border: "border-red-200" },
};

const statusDot = {
  open: "bg-red-500", treated: "bg-amber-500", resolved: "bg-emerald-500"
};

function StatBox({ label, value, icon: Icon, color }) {
  return (
    <div className="bg-card rounded-xl border border-border p-4">
      <div className="flex items-center gap-2 mb-1">
        {Icon && <Icon className={cn("w-4 h-4", color || "text-muted-foreground")} />}
        <span className="text-xs text-muted-foreground">{label}</span>
      </div>
      <div className="text-xl font-bold text-foreground">{value ?? "—"}</div>
    </div>
  );
}

export default function GreenhouseDetail() {
  const { fmt } = useCurrency();
  const params = new URLSearchParams(window.location.search);
  const id = params.get("id");

  const [gh, setGh] = useState(null);
  const [cycles, setCycles] = useState([]);
  const [harvests, setHarvests] = useState([]);
  const [sales, setSales] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [incidents, setIncidents] = useState([]);
  const [treatments, setTreatments] = useState([]);
  const [popLogs, setPopLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    Promise.all([
      base44.entities.Greenhouse.filter({ id }),
      base44.entities.CropCycle.filter({ greenhouse_id: id }),
      base44.entities.HarvestRecord.filter({ greenhouse_id: id }),
      base44.entities.SalesRecord.filter({ greenhouse_id: id }),
      base44.entities.ExpenseRecord.filter({ greenhouse_id: id }),
      base44.entities.Incident.filter({ greenhouse_id: id }),
      base44.entities.Treatment.filter({ greenhouse_id: id }),
      base44.entities.PlantPopulationLog.filter({ greenhouse_id: id }),
    ]).then(([ghRes, cy, ha, sa, ex, inc, tr, po]) => {
      setGh(ghRes[0]);
      setCycles(cy);
      setHarvests(ha);
      setSales(sa);
      setExpenses(ex);
      setIncidents(inc);
      setTreatments(tr);
      setPopLogs(po);
      setLoading(false);
    });
  }, [id]);

  if (loading) return (
    <div className="p-6 space-y-4">
      {Array.from({ length: 6 }).map((_, i) => <div key={i} className="h-16 bg-muted animate-pulse rounded-xl" />)}
    </div>
  );

  if (!gh) return (
    <div className="p-6 text-center text-muted-foreground">Greenhouse not found.</div>
  );

  const greenhouseName = gh.name || gh.code || "Unnamed Greenhouse";

  const totalRevenue = sales.reduce((s, r) => s + (r.revenue || r.kg_sold * r.price_per_kg || 0), 0);
  const totalExpense = expenses.reduce((s, e) => s + (e.amount || 0), 0);
  const totalProfit = totalRevenue - totalExpense;
  const totalKg = harvests.reduce((s, h) => s + (h.kg_harvested || 0), 0);
  const activeCycle = cycles.find(c => c.status === "active");
  const latestPop = popLogs.sort((a, b) => b.date?.localeCompare(a.date))[0];
  const activePlants = latestPop?.active_plants || activeCycle?.plants_planted || 0;
  const yieldPerPlant = activePlants > 0 ? (totalKg / activePlants).toFixed(2) : null;
  const openIncidents = incidents.filter(i => i.status === "open" || i.status === "treated");

  // Monthly harvest chart
  const harvestByMonth = {};
  harvests.forEach(h => {
    const key = h.date?.slice(0, 7);
    if (key) harvestByMonth[key] = (harvestByMonth[key] || 0) + (h.kg_harvested || 0);
  });
  const harvestChart = Object.entries(harvestByMonth).sort().slice(-8).map(([m, kg]) => ({ month: m.slice(5), kg: parseFloat(kg.toFixed(1)) }));

  // Monthly revenue chart
  const revByMonth = {};
  sales.forEach(s => {
    const key = s.date?.slice(0, 7);
    if (key) revByMonth[key] = (revByMonth[key] || 0) + (s.revenue || s.kg_sold * s.price_per_kg || 0);
  });
  const revenueChart = Object.entries(revByMonth).sort().slice(-8).map(([m, v]) => ({ month: m.slice(5), revenue: parseFloat(v.toFixed(0)) }));

  const statusConfig = {
    active: { label: "Active", cls: "bg-emerald-50 text-emerald-700 border-emerald-200" },
    inactive: { label: "Inactive", cls: "bg-slate-100 text-slate-500 border-slate-200" },
    maintenance: { label: "Maintenance", cls: "bg-amber-50 text-amber-700 border-amber-200" },
  };
  const sc = statusConfig[gh.status] || statusConfig.active;

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link to={createPageUrl("Greenhouses")} className="p-2 rounded-lg border border-border hover:bg-muted transition-colors">
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-bold text-foreground">{greenhouseName}</h1>
            <span className="text-sm text-muted-foreground font-mono">{gh.code}</span>
            <span className={cn("px-2.5 py-0.5 rounded-full text-xs font-semibold border", sc.cls)}>{sc.label}</span>
          </div>
          {gh.notes && <p className="text-sm text-muted-foreground mt-0.5">{gh.notes}</p>}
        </div>
      </div>

      {/* KPI Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <StatBox label="Total Revenue" value={fmt(totalRevenue)} icon={DollarSign} color="text-emerald-600" />
        <StatBox label="Total Expenses" value={fmt(totalExpense)} icon={TrendingUp} color="text-amber-600" />
        <StatBox label="Net Profit" value={fmt(totalProfit)} icon={TrendingUp} color={totalProfit >= 0 ? "text-emerald-600" : "text-red-600"} />
        <StatBox label="Total Harvest" value={`${totalKg.toLocaleString()} kg`} icon={Package} color="text-primary" />
        <StatBox label="Active Plants" value={activePlants > 0 ? activePlants.toLocaleString() : "—"} icon={Sprout} color="text-green-600" />
        <StatBox label="Yield/Plant" value={yieldPerPlant ? `${yieldPerPlant} kg` : "—"} icon={BarChart2} color="text-blue-600" />
      </div>

      {/* Open incidents alert */}
      {openIncidents.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3">
          <AlertTriangle className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" />
          <div>
            <div className="text-sm font-semibold text-amber-800">{openIncidents.length} open incident{openIncidents.length > 1 ? "s" : ""}</div>
            <div className="text-xs text-amber-700 mt-0.5">{openIncidents.map(i => i.name || i.incident_type).join(" · ")}</div>
          </div>
        </div>
      )}

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-card rounded-xl border border-border p-5">
          <h3 className="font-semibold text-sm mb-4">Monthly Harvest (kg)</h3>
          {harvestChart.length > 0 ? (
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={harvestChart} margin={{ top: 4, right: 8, left: 20, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(150,12%,88%)" />
                <XAxis dataKey="month" tick={{ fontSize: 10 }} label={{ value: "Month", position: "insideBottom", offset: -10, style: { fontSize: 10, fill: "hsl(150,10%,45%)" } }} />
                <YAxis tick={{ fontSize: 10 }} width={50} label={{ value: "kg harvested", angle: -90, position: "insideLeft", offset: 10, dx: -8, style: { fontSize: 10, fill: "hsl(150,10%,45%)" } }} />
                <Tooltip formatter={v => [`${v} kg`, "Harvest"]} />
                <Bar dataKey="kg" fill="hsl(152,60%,32%)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : <div className="h-[180px] flex items-center justify-center text-muted-foreground text-sm">No harvest data</div>}
        </div>

        <div className="bg-card rounded-xl border border-border p-5">
          <h3 className="font-semibold text-sm mb-4">Monthly Revenue</h3>
          {revenueChart.length > 0 ? (
            <ResponsiveContainer width="100%" height={180}>
              <LineChart data={revenueChart} margin={{ top: 4, right: 8, left: 20, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(150,12%,88%)" vertical={false} />
                <XAxis dataKey="month" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} label={{ value: "Month", position: "insideBottom", offset: -10, style: { fontSize: 10, fill: "hsl(150,10%,45%)" } }} />
                <YAxis tick={{ fontSize: 10 }} width={70} axisLine={false} tickLine={false} tickFormatter={v => fmt(v, 0)} label={{ value: "Revenue (₦)", angle: -90, position: "insideLeft", offset: 10, dx: -10, style: { fontSize: 10, fill: "hsl(150,10%,45%)" } }} />
                <Tooltip formatter={v => [fmt(v), "Revenue"]} />
                <Line type="monotone" dataKey="revenue" stroke="hsl(38,95%,52%)" strokeWidth={2.5} dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          ) : <div className="h-[180px] flex items-center justify-center text-muted-foreground text-sm">No sales data</div>}
        </div>
      </div>

      {/* Crop Cycles + Incidents side by side */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Crop Cycles */}
        <div className="bg-card rounded-xl border border-border overflow-hidden">
          <div className="px-5 py-3 border-b border-border flex items-center gap-2">
            <Leaf className="w-4 h-4 text-primary" />
            <h3 className="font-semibold text-sm">Crop Cycles</h3>
          </div>
          {cycles.length === 0 ? (
            <div className="p-6 text-center text-sm text-muted-foreground">No crop cycles recorded</div>
          ) : (
            <div className="divide-y divide-border">
              {cycles.slice().sort((a, b) => b.planting_date?.localeCompare(a.planting_date)).map(c => (
                <div key={c.id} className="px-5 py-3 flex items-center justify-between">
                  <div>
                    <div className="text-sm font-semibold">{c.crop_type || "Pepper"} {c.variety ? `· ${c.variety}` : ""}</div>
                    <div className="text-xs text-muted-foreground">{c.planting_date} → {c.end_date || "ongoing"} · {c.plants_planted?.toLocaleString()} plants</div>
                  </div>
                  <span className={cn("px-2 py-0.5 rounded-full text-xs font-medium border", {
                    active: "bg-emerald-50 text-emerald-700 border-emerald-200",
                    completed: "bg-blue-50 text-blue-700 border-blue-200",
                    abandoned: "bg-slate-100 text-slate-500 border-slate-200",
                  }[c.status])}>{c.status}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Incidents */}
        <div className="bg-card rounded-xl border border-border overflow-hidden">
          <div className="px-5 py-3 border-b border-border flex items-center gap-2">
            <Bug className="w-4 h-4 text-danger" />
            <h3 className="font-semibold text-sm">Incident History</h3>
            <span className="ml-auto text-xs text-muted-foreground">{incidents.length} total</span>
          </div>
          {incidents.length === 0 ? (
            <div className="p-6 text-center text-sm text-muted-foreground">No incidents recorded</div>
          ) : (
            <div className="divide-y divide-border max-h-72 overflow-y-auto">
              {incidents.slice().sort((a, b) => b.date?.localeCompare(a.date)).map(inc => {
                const sev = severityConfig[inc.severity] || severityConfig.low;
                return (
                  <div key={inc.id} className="px-5 py-3">
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2">
                        <span className={cn("w-2 h-2 rounded-full", statusDot[inc.status] || "bg-gray-400")} />
                        <span className="text-sm font-semibold">{inc.name || inc.incident_type}</span>
                      </div>
                      <span className={cn("px-2 py-0.5 rounded text-xs font-medium border", sev.bg, sev.text, sev.border)}>{inc.severity}</span>
                    </div>
                    <div className="text-xs text-muted-foreground">{inc.date} · {inc.incident_type} · {inc.affected_plants ? `${inc.affected_plants} plants` : ""}</div>
                    {inc.description && <div className="text-xs text-muted-foreground mt-0.5 truncate">{inc.description}</div>}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Recent Sales & Expenses */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-card rounded-xl border border-border overflow-hidden">
          <div className="px-5 py-3 border-b border-border"><h3 className="font-semibold text-sm">Recent Sales</h3></div>
          {sales.length === 0 ? <div className="p-6 text-center text-sm text-muted-foreground">No sales recorded</div> : (
            <div className="divide-y divide-border">
              {sales.slice().sort((a, b) => b.date?.localeCompare(a.date)).slice(0, 8).map(s => (
                <div key={s.id} className="px-5 py-2.5 flex items-center justify-between">
                  <div>
                    <div className="text-sm font-medium">{s.buyer}</div>
                    <div className="text-xs text-muted-foreground">{s.date} · {s.kg_sold} kg</div>
                  </div>
                  <span className="text-sm font-semibold text-emerald-600">{fmt(s.revenue || s.kg_sold * s.price_per_kg)}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-card rounded-xl border border-border overflow-hidden">
          <div className="px-5 py-3 border-b border-border"><h3 className="font-semibold text-sm">Recent Expenses</h3></div>
          {expenses.length === 0 ? <div className="p-6 text-center text-sm text-muted-foreground">No expenses recorded</div> : (
            <div className="divide-y divide-border">
              {expenses.slice().sort((a, b) => b.date?.localeCompare(a.date)).slice(0, 8).map(e => (
                <div key={e.id} className="px-5 py-2.5 flex items-center justify-between">
                  <div>
                    <div className="text-sm font-medium capitalize">{e.category?.replace(/_/g, " ")}</div>
                    <div className="text-xs text-muted-foreground">{e.date} {e.description ? `· ${e.description}` : ""}</div>
                  </div>
                  <span className="text-sm font-semibold text-amber-600">{fmt(e.amount)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Greenhouse Info */}
      <div className="bg-card rounded-xl border border-border p-5">
        <h3 className="font-semibold text-sm mb-3">Greenhouse Info</h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
          <div><span className="text-muted-foreground block text-xs">Area</span><span className="font-semibold">{gh.area ? `${gh.area.toLocaleString()} m²` : "—"}</span></div>
          <div><span className="text-muted-foreground block text-xs">Plant Capacity</span><span className="font-semibold">{gh.capacity_plants ? gh.capacity_plants.toLocaleString() : "—"}</span></div>
          <div><span className="text-muted-foreground block text-xs">Cycles</span><span className="font-semibold">{cycles.length}</span></div>
          <div><span className="text-muted-foreground block text-xs">Treatments</span><span className="font-semibold">{treatments.length}</span></div>
        </div>
      </div>
    </div>
  );
}
