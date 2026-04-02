import { useEffect, useMemo, useState } from "react";
import { Plus, Scale } from "lucide-react";
import RecordManagerPage from "@/modules/shared/RecordManagerPage.jsx";
import { getErrorMessage } from "@/lib/errors.js";
import { goatsClient } from "@/modules/goats/services/goatService.js";
import { formatDateLabel } from "@/modules/shared/formatters.js";

const initialValues = {
  goat_id: "",
  log_date: "",
  weight: "",
  notes: "",
};

export default function GoatWeightLogs() {
  const [goats, setGoats] = useState([]);
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  const load = async () => {
    try {
      setLoading(true);
      const [goatRows, weightRows] = await Promise.all([goatsClient.registry.list(), goatsClient.weightLogs.list()]);
      setGoats(goatRows);
      setRecords(weightRows);
      setLoadError("");
    } catch (error) {
      setLoadError(getErrorMessage(error, "Failed to load goat weight logs."));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const goatOptions = goats.map((goat) => ({
    value: goat.id,
    label: `${goat.tag_number}${goat.name ? ` · ${goat.name}` : ""}`,
  }));

  const summaryCards = useMemo(() => {
    const averageWeight =
      records.length > 0 ? (records.reduce((sum, row) => sum + (row.weight || 0), 0) / records.length).toFixed(1) : "0.0";
    const latestDate = records[0]?.log_date;
    const goatsMeasured = new Set(records.map((row) => row.goat_id)).size;

    return [
      { title: "Weight Logs", value: records.length, subtitle: "Weight checkpoints captured", icon: Scale, color: "primary" },
      { title: "Average Weight", value: `${averageWeight} kg`, subtitle: "Across all recorded weigh-ins", icon: Scale, color: "success" },
      { title: "Goats Measured", value: goatsMeasured, subtitle: "Distinct goats with weight logs", icon: Scale, color: "accent" },
      { title: "Latest Log", value: latestDate ? formatDateLabel(latestDate) : "—", subtitle: "Most recent weigh-in date", icon: Scale, color: "warning" },
    ];
  }, [records]);

  return (
    <RecordManagerPage
      title="Weight Logs"
      subtitle={`${records.length} goat weight entries`}
      actionLabel="Add Weight Log"
      actionIcon={Plus}
      columns={[
        { key: "log_date", label: "Date", render: (value) => formatDateLabel(value) },
        { key: "goat", label: "Goat", render: (_value, row) => row.goat?.tag_number || "—" },
        { key: "weight", label: "Weight", render: (value) => `${value || 0} kg` },
        { key: "notes", label: "Notes", render: (value) => value || "—" },
      ]}
      records={records}
      loading={loading}
      loadError={loadError}
      onRetry={load}
      summaryCards={summaryCards}
      emptyState={{
        icon: Scale,
        title: "No weight logs",
        description: "Track growth and monitor the condition of each goat over time.",
      }}
      initialValues={initialValues}
      fields={[
        { key: "goat_id", label: "Goat", type: "select", required: true, options: goatOptions },
        { key: "log_date", label: "Date", type: "date", required: true },
        { key: "weight", label: "Weight (kg)", type: "number", required: true, min: 0, step: "0.01" },
        { key: "notes", label: "Growth notes", type: "textarea", fullWidth: true, placeholder: "Optional growth notes" },
      ]}
      mapToForm={(row) => ({
        ...row,
        goat_id: row.goat_id || "",
        log_date: row.log_date || "",
      })}
      onCreate={async (payload) => {
        await goatsClient.weightLogs.create(payload);
        await load();
      }}
      onUpdate={async (id, payload) => {
        await goatsClient.weightLogs.update(id, payload);
        await load();
      }}
      onDelete={async (id) => {
        await goatsClient.weightLogs.remove(id);
        await load();
      }}
      modalTitle={{
        create: "Add Weight Log",
        edit: "Edit Weight Log",
      }}
    />
  );
}
