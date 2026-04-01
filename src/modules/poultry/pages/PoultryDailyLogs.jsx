import { useEffect, useMemo, useState } from "react";
import { ClipboardList, Plus, TrendingUp } from "lucide-react";
import RecordManagerPage from "@/modules/shared/RecordManagerPage.jsx";
import { poultryClient } from "@/modules/poultry/services/poultryService.js";
import { formatDateLabel } from "@/modules/shared/formatters.js";

const initialValues = {
  flock_id: "",
  log_date: "",
  eggs_collected: "0",
  bad_eggs: "0",
  mortality_count: "0",
  culled_count: "0",
  feed_consumed: "",
  water_consumed: "",
  avg_weight: "",
  temperature: "",
  notes: "",
};

export default function PoultryDailyLogs() {
  const [flocks, setFlocks] = useState([]);
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    const [flockRows, logRows] = await Promise.all([poultryClient.flocks.list(), poultryClient.dailyLogs.list()]);
    setFlocks(flockRows);
    setRecords(logRows);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const flockOptions = flocks.map((flock) => ({
    value: flock.id,
    label: flock.flock_code,
  }));

  const summaryCards = useMemo(() => {
    const eggs = records.reduce((sum, row) => sum + (row.eggs_collected || 0), 0);
    const mortality = records.reduce((sum, row) => sum + (row.mortality_count || 0), 0);
    const feed = records.reduce((sum, row) => sum + (row.feed_consumed || 0), 0);

    return [
      { title: "Daily Logs", value: records.length, subtitle: "Logged flock production days", icon: ClipboardList, color: "primary" },
      { title: "Eggs Collected", value: eggs.toLocaleString(), subtitle: "Total recorded eggs", icon: TrendingUp, color: "success" },
      { title: "Mortality", value: mortality.toLocaleString(), subtitle: "Recorded losses", icon: ClipboardList, color: "danger" },
      { title: "Feed Consumed", value: `${feed.toLocaleString()} kg`, subtitle: "Tracked from daily logs", icon: TrendingUp, color: "warning" },
    ];
  }, [records]);

  return (
    <RecordManagerPage
      title="Daily Logs"
      subtitle={`${records.length} production records`}
      actionLabel="Add Daily Log"
      actionIcon={Plus}
      columns={[
        { key: "log_date", label: "Date", render: (value) => formatDateLabel(value) },
        { key: "flock", label: "Flock", render: (_value, row) => row.flock?.flock_code || "—" },
        { key: "eggs_collected", label: "Eggs", render: (value) => value ?? 0 },
        { key: "mortality_count", label: "Mortality", render: (value) => value ?? 0 },
        { key: "feed_consumed", label: "Feed", render: (value) => (value ? `${value} kg` : "—") },
        { key: "temperature", label: "Temp", render: (value) => (value ? `${value}°C` : "—") },
      ]}
      records={records}
      loading={loading}
      summaryCards={summaryCards}
      emptyState={{
        icon: ClipboardList,
        title: "No daily production logs",
        description: "Log flock production, mortality, and feed usage each day.",
      }}
      initialValues={initialValues}
      fields={[
        { key: "flock_id", label: "Flock", type: "select", required: true, options: flockOptions },
        { key: "log_date", label: "Date", type: "date", required: true },
        { key: "eggs_collected", label: "Eggs collected", type: "number", required: true, min: 0 },
        { key: "bad_eggs", label: "Cracked / bad eggs", type: "number", required: true, min: 0 },
        { key: "mortality_count", label: "Mortality count", type: "number", required: true, min: 0 },
        { key: "culled_count", label: "Culled count", type: "number", required: true, min: 0 },
        { key: "feed_consumed", label: "Feed consumed (kg)", type: "number", min: 0, step: "0.01" },
        { key: "water_consumed", label: "Water consumed (L)", type: "number", min: 0, step: "0.01" },
        { key: "avg_weight", label: "Average weight (kg)", type: "number", min: 0, step: "0.01" },
        { key: "temperature", label: "Temperature (°C)", type: "number", step: "0.1" },
        { key: "notes", label: "Notes", type: "textarea", fullWidth: true, placeholder: "Daily observations" },
      ]}
      mapToForm={(row) => ({
        ...row,
        flock_id: row.flock_id || "",
        log_date: row.log_date || "",
      })}
      onCreate={async (payload) => {
        await poultryClient.dailyLogs.create(payload);
        await load();
      }}
      onUpdate={async (id, payload) => {
        await poultryClient.dailyLogs.update(id, payload);
        await load();
      }}
      onDelete={async (id) => {
        await poultryClient.dailyLogs.remove(id);
        await load();
      }}
      modalTitle={{
        create: "Add Daily Production Log",
        edit: "Edit Daily Production Log",
      }}
    />
  );
}
