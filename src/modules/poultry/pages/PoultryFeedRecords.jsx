import { useEffect, useMemo, useState } from "react";
import { Activity, Plus } from "lucide-react";
import RecordManagerPage from "@/modules/shared/RecordManagerPage.jsx";
import { getErrorMessage } from "@/lib/errors.js";
import { poultryClient } from "@/modules/poultry/services/poultryService.js";
import { formatDateLabel } from "@/modules/shared/formatters.js";
import { useCurrency } from "@/components/shared/CurrencyProvider.jsx";

const initialValues = {
  flock_id: "",
  log_date: "",
  feed_type: "",
  quantity: "",
  unit: "kg",
  cost: "",
  supplier: "",
  notes: "",
};

export default function PoultryFeedRecords() {
  const { fmt } = useCurrency();
  const [flocks, setFlocks] = useState([]);
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  const load = async () => {
    try {
      setLoading(true);
      const [flockRows, feedRows] = await Promise.all([poultryClient.flocks.list(), poultryClient.feedLogs.list()]);
      setFlocks(flockRows);
      setRecords(feedRows);
      setLoadError("");
    } catch (error) {
      setLoadError(getErrorMessage(error, "Failed to load poultry feed records."));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const flockOptions = flocks.map((flock) => ({ value: flock.id, label: flock.flock_code }));

  const summaryCards = useMemo(() => {
    const totalFeed = records.reduce((sum, row) => sum + (row.quantity || 0), 0);
    const totalCost = records.reduce((sum, row) => sum + (row.cost || 0), 0);
    const supplierCount = new Set(records.map((row) => row.supplier).filter(Boolean)).size;

    return [
      { title: "Feed Logs", value: records.length, subtitle: "Distribution and purchase entries", icon: Activity, color: "primary" },
      { title: "Quantity Logged", value: `${totalFeed.toLocaleString()} kg`, subtitle: "Feed volume recorded", icon: Activity, color: "success" },
      { title: "Feed Spend", value: fmt(totalCost), subtitle: "Optional cost captured in logs", icon: Activity, color: "warning" },
      { title: "Suppliers", value: supplierCount, subtitle: "Distinct feed suppliers", icon: Activity, color: "accent" },
    ];
  }, [fmt, records]);

  return (
    <RecordManagerPage
      title="Feed Records"
      subtitle={`${records.length} feed entries`}
      actionLabel="Add Feed Log"
      actionIcon={Plus}
      columns={[
        { key: "log_date", label: "Date", render: (value) => formatDateLabel(value) },
        { key: "flock", label: "Flock", render: (_value, row) => row.flock?.flock_code || "—" },
        { key: "feed_type", label: "Feed Type" },
        { key: "quantity", label: "Quantity", render: (value, row) => `${value || 0} ${row.unit || ""}`.trim() },
        { key: "cost", label: "Cost", render: (value) => (value ? fmt(value) : "—") },
        { key: "supplier", label: "Supplier", render: (value) => value || "—" },
      ]}
      records={records}
      loading={loading}
      loadError={loadError}
      onRetry={load}
      summaryCards={summaryCards}
      emptyState={{
        icon: Activity,
        title: "No feed records",
        description: "Log feed purchases or usage by flock.",
      }}
      initialValues={initialValues}
      fields={[
        { key: "flock_id", label: "Flock", type: "select", required: true, options: flockOptions },
        { key: "log_date", label: "Date", type: "date", required: true },
        { key: "feed_type", label: "Feed type", required: true, placeholder: "Starter mash" },
        { key: "quantity", label: "Quantity", type: "number", required: true, min: 0, step: "0.01" },
        { key: "unit", label: "Unit", required: true, placeholder: "kg" },
        { key: "cost", label: "Cost", type: "number", min: 0, step: "0.01" },
        { key: "supplier", label: "Supplier", placeholder: "Supplier name" },
        { key: "notes", label: "Notes", type: "textarea", fullWidth: true, placeholder: "Optional feed record notes" },
      ]}
      mapToForm={(row) => ({
        ...row,
        flock_id: row.flock_id || "",
        log_date: row.log_date || "",
      })}
      onCreate={async (payload) => {
        await poultryClient.feedLogs.create(payload);
        await load();
      }}
      onUpdate={async (id, payload) => {
        await poultryClient.feedLogs.update(id, payload);
        await load();
      }}
      onDelete={async (id) => {
        await poultryClient.feedLogs.remove(id);
        await load();
      }}
      modalTitle={{
        create: "Add Feed Log",
        edit: "Edit Feed Log",
      }}
    />
  );
}
