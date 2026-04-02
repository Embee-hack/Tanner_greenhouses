import { useEffect, useState } from "react";
import { Activity, AlertTriangle, DollarSign, Egg, Skull, Warehouse } from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useAuth } from "@/lib/AuthContext";
import { isAdminUser } from "@/lib/roles.js";
import StatCard from "@/components/dashboard/StatCard";
import ErrorBanner from "@/components/shared/ErrorBanner.jsx";
import AnalyticsPanel from "@/modules/shared/AnalyticsPanel.jsx";
import { poultryClient } from "@/modules/poultry/services/poultryService.js";
import { formatShortDate } from "@/modules/shared/formatters.js";
import { useCurrency } from "@/components/shared/CurrencyProvider.jsx";
import { getErrorMessage } from "@/lib/errors.js";

export default function PoultryDashboard() {
  const { fmt } = useCurrency();
  const { user } = useAuth();
  const isAdmin = isAdminUser(user);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        setLoading(true);
        const result = await poultryClient.getDashboard();
        if (!cancelled) {
          setData(result);
          setLoadError("");
        }
      } catch (error) {
        if (!cancelled) {
          setLoadError(getErrorMessage(error, "Failed to load the poultry dashboard."));
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();

    return () => {
      cancelled = true;
    };
  }, []);

  const summary = data?.summary || {};
  const charts = data?.charts || {};
  const performanceRows = data?.analytics?.flock_performance || [];

  return (
    <div className="p-4 md:p-6 space-y-6">
      <ErrorBanner message={loadError} onRetry={() => {
        setData(null);
        setLoading(true);
        poultryClient.getDashboard()
          .then((result) => {
            setData(result);
            setLoadError("");
          })
          .catch((error) => {
            setLoadError(getErrorMessage(error, "Failed to load the poultry dashboard."));
          })
          .finally(() => setLoading(false));
      }} />

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
        <StatCard title="Active Houses" value={summary.active_houses || 0} subtitle="Houses in service" icon={Warehouse} color="primary" loading={loading} />
        <StatCard title="Active Flocks" value={summary.active_flocks || 0} subtitle="Current production batches" icon={Warehouse} color="primary" loading={loading} />
        <StatCard title="Live Birds" value={(summary.total_live_birds || 0).toLocaleString()} subtitle="Estimated birds on hand" icon={Egg} color="success" loading={loading} />
        <StatCard title="Eggs Today" value={(summary.eggs_today || 0).toLocaleString()} subtitle="Collected from daily logs" icon={Egg} color="accent" loading={loading} />
        <StatCard title="Mortality Today" value={(summary.mortality_today || 0).toLocaleString()} subtitle="Bird losses logged today" icon={Skull} color="danger" loading={loading} />
        <StatCard
          title={isAdmin ? "Revenue This Week" : "Feed Today"}
          value={isAdmin ? fmt(summary.revenue_this_week || 0) : `${(summary.feed_consumed_today || 0).toLocaleString()} kg`}
          subtitle={isAdmin ? "Poultry sales in the current week" : "Feed consumed from production logs"}
          icon={isAdmin ? DollarSign : Activity}
          color={isAdmin ? "success" : "warning"}
          loading={loading}
        />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <AnalyticsPanel title="Egg Production Trend" subtitle="Eggs collected over the last 14 days">
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={charts.eggs_trend || []}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(150,12%,88%)" vertical={false} />
              <XAxis dataKey="date" tickFormatter={formatShortDate} tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
              <Tooltip labelFormatter={(value) => formatShortDate(value)} />
              <Line type="monotone" dataKey="eggs" name="Eggs" stroke="hsl(38,95%,52%)" strokeWidth={2.5} dot={{ r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
        </AnalyticsPanel>

        <AnalyticsPanel title="Mortality Trend" subtitle="Mortality count logged over the last 14 days">
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={charts.mortality_trend || []}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(150,12%,88%)" vertical={false} />
              <XAxis dataKey="date" tickFormatter={formatShortDate} tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
              <Tooltip labelFormatter={(value) => formatShortDate(value)} />
              <Line type="monotone" dataKey="mortality" name="Mortality" stroke="hsl(0,72%,51%)" strokeWidth={2.5} dot={{ r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
        </AnalyticsPanel>

        <AnalyticsPanel title="Feed Consumption Trend" subtitle="Feed consumed from daily production logs">
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={charts.feed_trend || []}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(150,12%,88%)" vertical={false} />
              <XAxis dataKey="date" tickFormatter={formatShortDate} tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
              <Tooltip labelFormatter={(value) => formatShortDate(value)} formatter={(value) => [`${value} kg`, "Feed"]} />
              <Bar dataKey="feed" fill="hsl(199,89%,48%)" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </AnalyticsPanel>

        {isAdmin && (
          <AnalyticsPanel title="Revenue vs Expenses" subtitle="Weekly poultry cashflow snapshot">
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={charts.revenue_vs_expense || []}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(150,12%,88%)" vertical={false} />
                <XAxis dataKey="period" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={(value) => fmt(value)} />
                <Tooltip formatter={(value) => fmt(value)} />
                <Legend />
                <Bar dataKey="revenue" fill="hsl(152,60%,32%)" radius={[6, 6, 0, 0]} />
                <Bar dataKey="expense" fill="hsl(0,72%,51%)" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </AnalyticsPanel>
        )}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[1.3fr_0.7fr] gap-4">
        <AnalyticsPanel title="Egg Output by Flock" subtitle="Which flocks are producing the most eggs">
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={(charts.egg_output_by_flock || []).slice(0, 8)} layout="vertical" margin={{ left: 12 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(150,12%,88%)" horizontal={false} />
              <XAxis type="number" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
              <YAxis dataKey="name" type="category" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} width={90} />
              <Tooltip formatter={(value) => [`${value} eggs`, "Eggs"]} />
              <Bar dataKey="eggs" fill="hsl(38,95%,52%)" radius={[0, 8, 8, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </AnalyticsPanel>

        <AnalyticsPanel title="Recent Health Alerts" subtitle="Latest poultry health records">
          <div className="space-y-3">
            {(summary.recent_health_alerts || []).length === 0 ? (
              <div className="text-sm text-muted-foreground py-12 text-center">No recent health alerts</div>
            ) : (
              summary.recent_health_alerts.map((alert) => (
                <div key={alert.id} className="rounded-2xl border border-border p-4">
                  <div className="flex items-start gap-3">
                    <div className="w-9 h-9 rounded-xl bg-danger/10 flex items-center justify-center">
                      <AlertTriangle className="w-4 h-4 text-danger" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-foreground">{alert.issue_type}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {alert.flock?.flock_code || "Unknown flock"} · {formatShortDate(alert.log_date)}
                      </p>
                      <p className="text-sm text-muted-foreground mt-2">{alert.notes || alert.symptoms || "No extra notes"}</p>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </AnalyticsPanel>
      </div>

      <AnalyticsPanel
        title={isAdmin ? "Flock Performance Snapshot" : "Flock Operations Snapshot"}
        subtitle={isAdmin ? "Revenue, expenses, and profit estimate by flock" : "Live birds, egg output, and mortality by flock"}
      >
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted-foreground">
                <th className="py-3 pr-4">Flock</th>
                <th className="py-3 pr-4">Live Birds</th>
                <th className="py-3 pr-4">Eggs</th>
                <th className="py-3 pr-4">Mortality</th>
                {isAdmin && (
                  <>
                    <th className="py-3 pr-4">Revenue</th>
                    <th className="py-3 pr-4">Expenses</th>
                    <th className="py-3">Profit</th>
                  </>
                )}
              </tr>
            </thead>
            <tbody>
              {performanceRows.length === 0 ? (
                <tr>
                  <td colSpan={isAdmin ? 7 : 4} className="py-8 text-center text-muted-foreground">
                    No flock performance data yet
                  </td>
                </tr>
              ) : (
                performanceRows.map((row) => (
                  <tr key={row.flock_id} className="border-b border-border/50">
                    <td className="py-3 pr-4 font-medium text-foreground">{row.flock_code}</td>
                    <td className="py-3 pr-4">{row.current_live_birds.toLocaleString()}</td>
                    <td className="py-3 pr-4">{row.eggs.toLocaleString()}</td>
                    <td className="py-3 pr-4">{row.mortality.toLocaleString()}</td>
                    {isAdmin && (
                      <>
                        <td className="py-3 pr-4">{fmt(row.revenue)}</td>
                        <td className="py-3 pr-4">{fmt(row.expense)}</td>
                        <td className="py-3 font-semibold text-foreground">{fmt(row.profit)}</td>
                      </>
                    )}
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
