import { useEffect, useState } from "react";
import { AlertTriangle, Baby, Fence, HeartPulse, PawPrint, Users } from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import StatCard from "@/components/dashboard/StatCard";
import AnalyticsPanel from "@/modules/shared/AnalyticsPanel.jsx";
import { goatsClient } from "@/modules/goats/services/goatService.js";
import { formatShortDate } from "@/modules/shared/formatters.js";
import { useCurrency } from "@/components/shared/CurrencyProvider.jsx";

export default function GoatDashboard() {
  const { fmt } = useCurrency();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setLoading(true);
      const result = await goatsClient.getDashboard();
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

  const summary = data?.summary || {};
  const charts = data?.charts || {};

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
        <StatCard title="Total Goats" value={summary.total_goats || 0} subtitle="Active goats in the herd" icon={PawPrint} color="primary" loading={loading} />
        <StatCard title="Male Goats" value={summary.male_goats || 0} subtitle="Active male goats" icon={Users} color="accent" loading={loading} />
        <StatCard title="Female Goats" value={summary.female_goats || 0} subtitle="Active female goats" icon={Users} color="success" loading={loading} />
        <StatCard title="Pregnant Goats" value={summary.pregnant_goats || 0} subtitle="Estimated from breeding logs" icon={HeartPulse} color="warning" loading={loading} />
        <StatCard title="Kids Born This Month" value={summary.kids_born_this_month || 0} subtitle="Kidding outcomes this month" icon={Baby} color="success" loading={loading} />
        <StatCard title="Active Pens" value={summary.active_pens || 0} subtitle="Pens currently in service" icon={Fence} color="primary" loading={loading} />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <AnalyticsPanel title="Herd Growth" subtitle="Cumulative herd registrations over recent months">
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={charts.herd_growth || []}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(150,12%,88%)" vertical={false} />
              <XAxis dataKey="period" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
              <Tooltip />
              <Line type="monotone" dataKey="goats" stroke="hsl(152,60%,32%)" strokeWidth={2.5} dot={{ r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
        </AnalyticsPanel>

        <AnalyticsPanel title="Births by Month" subtitle="Kids born from recorded kidding events">
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={charts.births_by_month || []}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(150,12%,88%)" vertical={false} />
              <XAxis dataKey="period" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
              <Tooltip />
              <Bar dataKey="births" fill="hsl(38,95%,52%)" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </AnalyticsPanel>

        <AnalyticsPanel title="Weight Trend" subtitle="Average logged weight over recent months">
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={charts.weight_trend || []}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(150,12%,88%)" vertical={false} />
              <XAxis dataKey="period" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
              <Tooltip formatter={(value) => [`${value} kg`, "Avg weight"]} />
              <Line type="monotone" dataKey="avg_weight" stroke="hsl(199,89%,48%)" strokeWidth={2.5} dot={{ r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
        </AnalyticsPanel>

        <AnalyticsPanel title="Sales and Expense Trend" subtitle="Monthly goat cashflow">
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={(charts.sales_trend || []).map((row, index) => ({ ...row, expense: charts.expense_trend?.[index]?.amount || 0 }))}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(150,12%,88%)" vertical={false} />
              <XAxis dataKey="period" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={(value) => fmt(value)} />
              <Tooltip formatter={(value) => fmt(value)} />
              <Bar dataKey="amount" name="Sales" fill="hsl(152,60%,32%)" radius={[6, 6, 0, 0]} />
              <Bar dataKey="expense" name="Expenses" fill="hsl(0,72%,51%)" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </AnalyticsPanel>
      </div>

      <AnalyticsPanel title="Recent Health Alerts" subtitle="Latest goat health records">
        <div className="space-y-3">
          {(summary.health_alerts || []).length === 0 ? (
            <div className="text-sm text-muted-foreground py-12 text-center">No recent goat health alerts</div>
          ) : (
            summary.health_alerts.map((alert) => (
              <div key={alert.id} className="rounded-2xl border border-border p-4">
                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-xl bg-danger/10 flex items-center justify-center">
                    <AlertTriangle className="w-4 h-4 text-danger" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-foreground">{alert.issue_type}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {alert.goat?.tag_number || "Unknown goat"} · {formatShortDate(alert.log_date)}
                    </p>
                    <p className="text-sm text-muted-foreground mt-2">
                      {alert.vet_notes || alert.treatment || alert.symptoms || "No additional notes"}
                    </p>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </AnalyticsPanel>
    </div>
  );
}
