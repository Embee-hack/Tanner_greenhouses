import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import PageHeader from "@/components/shared/PageHeader";
import { cn } from "@/lib/utils";
import { useCurrency } from "@/components/shared/CurrencyProvider.jsx";
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
} from "recharts";

export default function Compare() {
  const { fmt } = useCurrency();
  const [greenhouses, setGreenhouses] = useState([]);
  const [selected, setSelected] = useState([]);
  const [harvests, setHarvests] = useState([]);
  const [sales, setSales] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [popLogs, setPopLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      base44.entities.Greenhouse.list("code"),
      base44.entities.HarvestRecord.list("-date", 500),
      base44.entities.SalesRecord.list("-date", 500),
      base44.entities.ExpenseRecord.list("-date", 500),
      base44.entities.PlantPopulationLog.list("-date", 500),
    ]).then(([gh, ha, sa, ex, po]) => {
      setGreenhouses(gh);
      setHarvests(ha);
      setSales(sa);
      setExpenses(ex);
      setPopLogs(po);
      setLoading(false);
    });
  }, []);

  const toggleGh = (id) => {
    setSelected(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : prev.length < 8 ? [...prev, id] : prev
    );
  };

  const latestPop = {};
  popLogs.forEach(log => {
    if (!latestPop[log.greenhouse_id] || log.date > latestPop[log.greenhouse_id].date) {
      latestPop[log.greenhouse_id] = log;
    }
  });

  const metrics = greenhouses.map(gh => {
    const ghHarvests = harvests.filter(h => h.greenhouse_id === gh.id);
    const ghSales = sales.filter(s => s.greenhouse_id === gh.id);
    const ghExpenses = expenses.filter(e => e.greenhouse_id === gh.id);
    const ghKg = ghHarvests.reduce((s, h) => s + (h.kg_harvested || 0), 0);
    const ghRevenue = ghSales.reduce((s, r) => s + (r.revenue || r.kg_sold * r.price_per_kg || 0), 0);
    const ghCost = ghExpenses.reduce((s, e) => s + (e.amount || 0), 0);
    const plants = latestPop[gh.id]?.active_plants || 0;
    return {
      id: gh.id,
      code: gh.code,
      name: gh.name,
      yield_per_plant: plants > 0 ? parseFloat((ghKg / plants).toFixed(2)) : 0,
      cost_per_kg: ghKg > 0 ? parseFloat((ghCost / ghKg).toFixed(2)) : 0,
      profit: parseFloat((ghRevenue - ghCost).toFixed(2)),
      total_kg: parseFloat(ghKg.toFixed(1)),
      revenue: parseFloat(ghRevenue.toFixed(2)),
      plants,
    };
  });

  const displayMetrics = selected.length > 0 ? metrics.filter(m => selected.includes(m.id)) : metrics;

  const combinedChart = displayMetrics.map(m => ({
    name: m.code,
    yield: m.yield_per_plant,
    cost: m.cost_per_kg,
  }));
  const ranked = [...displayMetrics].sort((a, b) => b.yield_per_plant - a.yield_per_plant);

  return (
    <div className="p-4 md:p-6 space-y-6">
      <PageHeader
        title="Greenhouse Comparison"
        subtitle="Select up to 8 greenhouses to compare, or view all"
      />

      {/* Greenhouse selector */}
      <div className="bg-card rounded-xl border border-border p-4">
        <div className="text-xs font-semibold text-muted-foreground mb-3 uppercase tracking-wide">Filter Greenhouses</div>
        <div className="flex flex-wrap gap-2">
          {greenhouses.map(gh => (
            <button
              key={gh.id}
              onClick={() => toggleGh(gh.id)}
              className={cn(
                "px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all",
                selected.includes(gh.id)
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-muted text-muted-foreground border-border hover:border-primary/50"
              )}
            >
              {gh.code}
            </button>
          ))}
          {selected.length > 0 && (
            <button
              onClick={() => setSelected([])}
              className="px-3 py-1.5 rounded-lg text-xs text-danger border border-danger/30 hover:bg-danger/10 transition-all"
            >
              Clear
            </button>
          )}
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Combined Yield vs Cost bar chart — matching the screenshot style */}
        <div className="bg-card rounded-xl border border-border p-5">
          <h3 className="font-semibold text-sm mb-4">Yield vs Cost Comparison</h3>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={combinedChart} barCategoryGap="30%" barGap={3}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(150,12%,90%)" vertical={false} />
              <XAxis dataKey="name" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis yAxisId="left" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} label={{ value: "Yield (kg/plant)", angle: -90, position: "insideLeft", offset: 10, style: { fontSize: 10, fill: "#22c55e" } }} />
              <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} label={{ value: "Cost/kg (₦)", angle: 90, position: "insideRight", offset: 10, style: { fontSize: 10, fill: "#ef4444" } }} />
              <Tooltip formatter={(v, name) => [name === "yield" ? `${v} kg` : fmt(v), name === "yield" ? "Yield (kg)" : "Cost (₦)"]} />
              <Legend iconType="circle" iconSize={9} wrapperStyle={{ fontSize: 12 }} formatter={n => n === "yield" ? "Yield (kg)" : "Cost (₦)"} />
              <Bar yAxisId="left" dataKey="yield" name="yield" fill="#22c55e" radius={[4, 4, 0, 0]} />
              <Bar yAxisId="right" dataKey="cost" name="cost" fill="#ef4444" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Performance Ranking table styled as per screenshot */}
        <div className="bg-card rounded-xl border border-border overflow-hidden">
          <div className="px-5 py-4 border-b border-border">
            <h3 className="font-semibold text-sm">Performance Ranking</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs border-b border-border">
                  <th className="px-5 py-2.5 text-left font-semibold text-muted-foreground">GH</th>
                  <th className="px-4 py-2.5 text-right font-semibold text-muted-foreground">Yield/Plant</th>
                  <th className="px-4 py-2.5 text-right font-semibold text-muted-foreground">Cost/kg</th>
                  <th className="px-5 py-2.5 text-right font-semibold text-muted-foreground">Profit</th>
                </tr>
              </thead>
              <tbody>
                {loading ? Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="border-t border-border/50">
                    {Array.from({ length: 4 }).map((_, j) => <td key={j} className="px-4 py-3"><div className="h-4 bg-muted animate-pulse rounded" /></td>)}
                  </tr>
                )) : ranked.map((m, i) => {
                  const top = i === 0;
                  const bottom = i === ranked.length - 1 && ranked.length > 1;
                  return (
                    <tr key={m.id} className="border-t border-border/50 hover:bg-muted/30 transition-colors">
                      <td className="px-5 py-3 font-bold text-foreground">{m.code}</td>
                      <td className={cn("px-4 py-3 text-right font-semibold", top ? "text-emerald-600" : bottom ? "text-red-500" : "text-foreground")}>
                        {m.yield_per_plant > 0 ? `${m.yield_per_plant}kg` : "—"}
                      </td>
                      <td className={cn("px-4 py-3 text-right", bottom ? "text-red-500 font-semibold" : "text-foreground")}>
                        {m.cost_per_kg > 0 ? fmt(m.cost_per_kg, 0) : "—"}
                      </td>
                      <td className="px-5 py-3 text-right">
                        {m.profit !== 0 || m.revenue > 0 ? (
                          <span className={cn("px-2.5 py-1 rounded-lg text-xs font-bold", m.profit > 0 ? "bg-emerald-50 text-emerald-700" : m.profit < 0 ? "bg-red-50 text-red-600" : "bg-amber-50 text-amber-700")}>
                            {fmt(m.profit)}
                          </span>
                        ) : "—"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>


    </div>
  );
}