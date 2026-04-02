import { useEffect, useMemo, useState } from "react";
import { Activity, BarChart3, HeartPulse, ShoppingCart } from "lucide-react";
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
import ErrorBanner from "@/components/shared/ErrorBanner.jsx";
import { getErrorMessage } from "@/lib/errors.js";
import AnalyticsPanel from "@/modules/shared/AnalyticsPanel.jsx";
import { goatsClient } from "@/modules/goats/services/goatService.js";
import { useCurrency } from "@/components/shared/CurrencyProvider.jsx";

export default function GoatAnalytics() {
  const { fmt } = useCurrency();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        setLoading(true);
        const result = await goatsClient.getAnalytics();
        if (!cancelled) {
          setData(result);
          setLoadError("");
        }
      } catch (error) {
        if (!cancelled) {
          setLoadError(getErrorMessage(error, "Failed to load goat analytics."));
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

  const analytics = data?.analytics || {};
  const bestSalesMonth = useMemo(() => {
    const salesTrend = analytics.sales_trend || [];
    return salesTrend.reduce((best, row) => (!best || row.value > best.value ? row : best), null);
  }, [analytics.sales_trend]);

  const highestExpenseMonth = useMemo(() => {
    const expenseTrend = analytics.expense_summary || [];
    return expenseTrend.reduce((best, row) => (!best || row.value > best.value ? row : best), null);
  }, [analytics.expense_summary]);

  return (
    <div className="p-4 md:p-6 space-y-6">
      <ErrorBanner message={loadError} onRetry={() => {
        setData(null);
        setLoading(true);
        goatsClient.getAnalytics()
          .then((result) => {
            setData(result);
            setLoadError("");
          })
          .catch((error) => {
            setLoadError(getErrorMessage(error, "Failed to load goat analytics."));
          })
          .finally(() => setLoading(false));
      }} />

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard title="Breeding Success" value={`${analytics.breeding_success_rate || 0}%`} subtitle="Breeding logs with actual kidding date" icon={HeartPulse} color="success" loading={loading} />
        <StatCard title="Kidding Rate" value={`${analytics.kidding_rate || 0}%`} subtitle="Kids alive against kids born" icon={HeartPulse} color="warning" loading={loading} />
        <StatCard title="Best Sales Month" value={bestSalesMonth ? fmt(bestSalesMonth.value) : "—"} subtitle={bestSalesMonth?.period || "No sales trend yet"} icon={ShoppingCart} color="primary" loading={loading} />
        <StatCard title="Highest Expense Month" value={highestExpenseMonth ? fmt(highestExpenseMonth.value) : "—"} subtitle={highestExpenseMonth?.period || "No expense trend yet"} icon={Activity} color="danger" loading={loading} />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <AnalyticsPanel title="Herd Count by Sex" subtitle="Current herd split by sex">
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={analytics.herd_count_by_sex || []}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(150,12%,88%)" vertical={false} />
              <XAxis dataKey="name" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
              <Tooltip />
              <Bar dataKey="value" fill="hsl(199,89%,48%)" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </AnalyticsPanel>

        <AnalyticsPanel title="Herd Count by Status" subtitle="Registry distribution by lifecycle status">
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={analytics.herd_count_by_status || []}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(150,12%,88%)" vertical={false} />
              <XAxis dataKey="name" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
              <Tooltip />
              <Bar dataKey="value" fill="hsl(38,95%,52%)" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </AnalyticsPanel>

        <AnalyticsPanel title="Births by Month" subtitle="Kids born from breeding logs">
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={analytics.births_by_month || []}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(150,12%,88%)" vertical={false} />
              <XAxis dataKey="period" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
              <Tooltip />
              <Bar dataKey="value" fill="hsl(152,60%,32%)" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </AnalyticsPanel>

        <AnalyticsPanel title="Weight Trend" subtitle="Average weight trend by month">
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={analytics.weight_trend || []}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(150,12%,88%)" vertical={false} />
              <XAxis dataKey="period" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
              <Tooltip formatter={(value) => [`${value} kg`, "Avg weight"]} />
              <Bar dataKey="value" fill="hsl(199,89%,48%)" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </AnalyticsPanel>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <AnalyticsPanel title="Sales Trend" subtitle="Monthly goat sales revenue">
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={analytics.sales_trend || []}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(150,12%,88%)" vertical={false} />
              <XAxis dataKey="period" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={(value) => fmt(value)} />
              <Tooltip formatter={(value) => fmt(value)} />
              <Bar dataKey="value" fill="hsl(152,60%,32%)" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </AnalyticsPanel>

        <AnalyticsPanel title="Expense Summary" subtitle="Monthly goat expense trend">
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={analytics.expense_summary || []}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(150,12%,88%)" vertical={false} />
              <XAxis dataKey="period" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={(value) => fmt(value)} />
              <Tooltip formatter={(value) => fmt(value)} />
              <Bar dataKey="value" fill="hsl(0,72%,51%)" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </AnalyticsPanel>
      </div>
    </div>
  );
}
