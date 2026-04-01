import { useEffect, useState } from "react";
import { Activity, BarChart3, DollarSign, Skull } from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import StatCard from "@/components/dashboard/StatCard";
import AnalyticsPanel from "@/modules/shared/AnalyticsPanel.jsx";
import { poultryClient } from "@/modules/poultry/services/poultryService.js";
import { useCurrency } from "@/components/shared/CurrencyProvider.jsx";

export default function PoultryAnalytics() {
  const { fmt } = useCurrency();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setLoading(true);
      const result = await poultryClient.getAnalytics();
      if (!cancelled) {
        setData(result);
        setLoading(false);
      }
    };

    load();

    return () => {
      cancelled = true;
    };
  }, []);

  const analytics = data?.analytics || {};
  const flockPerformance = analytics.flock_performance || [];
  const topProfit =
    flockPerformance.length > 0 ? flockPerformance.reduce((best, row) => (row.profit > best.profit ? row : best), flockPerformance[0]) : null;

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard title="Mortality Rate" value={`${analytics.mortality_rate || 0}%`} subtitle="Bird losses against initial stock" icon={Skull} color="danger" loading={loading} />
        <StatCard title="Eggs per Bird" value={analytics.eggs_per_bird || 0} subtitle="Egg volume per live bird estimate" icon={BarChart3} color="accent" loading={loading} />
        <StatCard title="Feed per Bird" value={`${analytics.feed_per_bird || 0} kg`} subtitle="Feed consumed per live bird estimate" icon={Activity} color="warning" loading={loading} />
        <StatCard title="Top Flock Profit" value={topProfit ? fmt(topProfit.profit) : "—"} subtitle={topProfit ? topProfit.flock_code : "No flock profits yet"} icon={DollarSign} color="success" loading={loading} />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <AnalyticsPanel title="Revenue by Flock" subtitle="Which flocks are driving poultry income">
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={analytics.revenue_by_flock || []}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(150,12%,88%)" vertical={false} />
              <XAxis dataKey="flock_code" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={(value) => fmt(value)} />
              <Tooltip formatter={(value) => fmt(value)} />
              <Bar dataKey="value" fill="hsl(152,60%,32%)" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </AnalyticsPanel>

        <AnalyticsPanel title="Expenses by Flock" subtitle="Where poultry spend is accumulating">
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={analytics.expenses_by_flock || []}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(150,12%,88%)" vertical={false} />
              <XAxis dataKey="flock_code" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={(value) => fmt(value)} />
              <Tooltip formatter={(value) => fmt(value)} />
              <Bar dataKey="value" fill="hsl(0,72%,51%)" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </AnalyticsPanel>

        <AnalyticsPanel title="Profit Estimate by Flock" subtitle="Revenue less recorded flock expenses">
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={analytics.profit_estimate_by_flock || []}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(150,12%,88%)" vertical={false} />
              <XAxis dataKey="flock_code" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={(value) => fmt(value)} />
              <Tooltip formatter={(value) => fmt(value)} />
              <Bar dataKey="value" fill="hsl(199,89%,48%)" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </AnalyticsPanel>
      </div>

      <AnalyticsPanel title="Flock Analytics Table" subtitle="Side-by-side flock performance metrics">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted-foreground">
                <th className="py-3 pr-4">Flock</th>
                <th className="py-3 pr-4">Live Birds</th>
                <th className="py-3 pr-4">Eggs</th>
                <th className="py-3 pr-4">Mortality</th>
                <th className="py-3 pr-4">Revenue</th>
                <th className="py-3 pr-4">Expense</th>
                <th className="py-3">Profit</th>
              </tr>
            </thead>
            <tbody>
              {flockPerformance.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-muted-foreground">
                    No flock analytics data available
                  </td>
                </tr>
              ) : (
                flockPerformance.map((row) => (
                  <tr key={row.flock_id} className="border-b border-border/50">
                    <td className="py-3 pr-4 font-medium text-foreground">{row.flock_code}</td>
                    <td className="py-3 pr-4">{row.current_live_birds.toLocaleString()}</td>
                    <td className="py-3 pr-4">{row.eggs.toLocaleString()}</td>
                    <td className="py-3 pr-4">{row.mortality.toLocaleString()}</td>
                    <td className="py-3 pr-4">{fmt(row.revenue)}</td>
                    <td className="py-3 pr-4">{fmt(row.expense)}</td>
                    <td className="py-3 font-semibold text-foreground">{fmt(row.profit)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </AnalyticsPanel>
    </div>
  );
}
