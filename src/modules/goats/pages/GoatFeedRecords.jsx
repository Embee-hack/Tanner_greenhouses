import { useEffect, useMemo, useState } from "react";
import { Activity, Plus } from "lucide-react";
import RecordManagerPage from "@/modules/shared/RecordManagerPage.jsx";
import { goatsClient } from "@/modules/goats/services/goatService.js";
import { formatDateLabel } from "@/modules/shared/formatters.js";
import { useCurrency } from "@/components/shared/CurrencyProvider.jsx";

const initialValues = {
  pen_id: "",
  log_date: "",
  feed_type: "",
  quantity: "",
  unit: "kg",
  cost: "",
  notes: "",
};

export default function GoatFeedRecords() {
  const { fmt } = useCurrency();
  const [pens, setPens] = useState([]);
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    const [penRows, feedRows] = await Promise.all([goatsClient.pens.list(), goatsClient.feedLogs.list()]);
    setPens(penRows);
    setRecords(feedRows);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const penOptions = pens.map((pen) => ({ value: pen.id, label: pen.name }));

  const summaryCards = useMemo(() => {
    const totalFeed = records.reduce((sum, row) => sum + (row.quantity || 0), 0);
    const totalCost = records.reduce((sum, row) => sum + (row.cost || 0), 0);
    const penLogs = new Set(records.map((row) => row.pen_id).filter(Boolean)).size;

    return [
      { title: "Feed Logs", value: records.length, subtitle: "Pen-based feeding records", icon: Activity, color: "primary" },
      { title: "Quantity Logged", value: `${totalFeed.toLocaleString()} kg`, subtitle: "Total feed recorded", icon: Activity, color: "success" },
      { title: "Feed Spend", value: fmt(totalCost), subtitle: "Cost captured in feeding records", icon: Activity, color: "warning" },
      { title: "Pens Covered", value: penLogs, subtitle: "Pens with feeding activity", icon: Activity, color: "accent" },
    ];
  }, [fmt, records]);

  return (
    <RecordManagerPage
      title="Feed Records"
      subtitle={`${records.length} pen feeding entries`}
      actionLabel="Add Pen Feed Log"
      actionIcon={Plus}
      columns={[
        { key: "log_date", label: "Date", render: (value) => formatDateLabel(value) },
        { key: "pen", label: "Pen", render: (_value, row) => row.pen?.name || "—" },
        { key: "feed_type", label: "Feed Type" },
        { key: "quantity", label: "Quantity", render: (value, row) => `${value || 0} ${row.unit || ""}`.trim() },
        { key: "cost", label: "Cost", render: (value) => (value ? fmt(value) : "—") },
      ]}
      records={records}
      loading={loading}
      summaryCards={summaryCards}
      emptyState={{
        icon: Activity,
        title: "No goat feed records",
        description: "Record feeding activity by pen.",
      }}
      initialValues={initialValues}
      fields={[
        { key: "pen_id", label: "Pen", type: "select", required: true, options: penOptions },
        { key: "log_date", label: "Date", type: "date", required: true },
        { key: "feed_type", label: "Feed type", required: true, placeholder: "Hay" },
        { key: "quantity", label: "Quantity", type: "number", required: true, min: 0, step: "0.01" },
        { key: "unit", label: "Unit", required: true, placeholder: "kg" },
        { key: "cost", label: "Cost", type: "number", min: 0, step: "0.01" },
        { key: "notes", label: "Notes", type: "textarea", fullWidth: true, placeholder: "Optional feed notes" },
      ]}
      mapToForm={(row) => ({
        ...row,
        pen_id: row.pen_id || "",
        log_date: row.log_date || "",
      })}
      onCreate={async (payload) => {
        await goatsClient.feedLogs.create(payload);
        await load();
      }}
      onUpdate={async (id, payload) => {
        await goatsClient.feedLogs.update(id, payload);
        await load();
      }}
      onDelete={async (id) => {
        await goatsClient.feedLogs.remove(id);
        await load();
      }}
      modalTitle={{
        create: "Add Pen Feed Log",
        edit: "Edit Pen Feed Log",
      }}
    />
  );
}
