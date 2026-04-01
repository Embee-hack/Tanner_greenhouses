import { useEffect, useMemo, useState } from "react";
import { HeartPulse, Plus } from "lucide-react";
import RecordManagerPage from "@/modules/shared/RecordManagerPage.jsx";
import { goatsClient } from "@/modules/goats/services/goatService.js";
import { formatDateLabel } from "@/modules/shared/formatters.js";

const initialValues = {
  goat_id: "",
  log_date: "",
  issue_type: "",
  symptoms: "",
  treatment: "",
  medication: "",
  vaccination: "",
  deworming: "",
  vet_notes: "",
};

export default function GoatHealthRecords() {
  const [goats, setGoats] = useState([]);
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    const [goatRows, healthRows] = await Promise.all([goatsClient.registry.list(), goatsClient.healthLogs.list()]);
    setGoats(goatRows);
    setRecords(healthRows);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const goatOptions = goats.map((goat) => ({
    value: goat.id,
    label: `${goat.tag_number}${goat.name ? ` · ${goat.name}` : ""}`,
  }));

  const summaryCards = useMemo(() => {
    const vaccinations = records.filter((row) => row.vaccination).length;
    const deworming = records.filter((row) => row.deworming).length;
    const treatments = records.filter((row) => row.treatment).length;

    return [
      { title: "Health Logs", value: records.length, subtitle: "Individual goat health entries", icon: HeartPulse, color: "primary" },
      { title: "Vaccinations", value: vaccinations, subtitle: "Logs with vaccination notes", icon: HeartPulse, color: "success" },
      { title: "Deworming", value: deworming, subtitle: "Logs with deworming notes", icon: HeartPulse, color: "warning" },
      { title: "Treatments", value: treatments, subtitle: "Logs with treatment notes", icon: HeartPulse, color: "accent" },
    ];
  }, [records]);

  return (
    <RecordManagerPage
      title="Health Records"
      subtitle={`${records.length} goat health entries`}
      actionLabel="Add Health Log"
      actionIcon={Plus}
      columns={[
        { key: "log_date", label: "Date", render: (value) => formatDateLabel(value) },
        { key: "goat", label: "Goat", render: (_value, row) => row.goat?.tag_number || "—" },
        { key: "issue_type", label: "Issue Type" },
        { key: "medication", label: "Medication", render: (value) => value || "—" },
        { key: "vaccination", label: "Vaccination", render: (value) => value || "—" },
        { key: "deworming", label: "Deworming", render: (value) => value || "—" },
      ]}
      records={records}
      loading={loading}
      summaryCards={summaryCards}
      emptyState={{
        icon: HeartPulse,
        title: "No goat health logs",
        description: "Capture disease, treatment, vaccination, and deworming records by goat.",
      }}
      initialValues={initialValues}
      fields={[
        { key: "goat_id", label: "Goat", type: "select", required: true, options: goatOptions },
        { key: "log_date", label: "Date", type: "date", required: true },
        { key: "issue_type", label: "Issue type", required: true, placeholder: "Foot rot" },
        { key: "symptoms", label: "Symptoms", type: "textarea", fullWidth: true, placeholder: "Symptoms observed" },
        { key: "treatment", label: "Treatment", placeholder: "Treatment given" },
        { key: "medication", label: "Medication", placeholder: "Medication used" },
        { key: "vaccination", label: "Vaccination", placeholder: "Vaccination details" },
        { key: "deworming", label: "Deworming", placeholder: "Deworming details" },
        { key: "vet_notes", label: "Vet notes", type: "textarea", fullWidth: true, placeholder: "Veterinary notes" },
      ]}
      mapToForm={(row) => ({
        ...row,
        goat_id: row.goat_id || "",
        log_date: row.log_date || "",
      })}
      onCreate={async (payload) => {
        await goatsClient.healthLogs.create(payload);
        await load();
      }}
      onUpdate={async (id, payload) => {
        await goatsClient.healthLogs.update(id, payload);
        await load();
      }}
      onDelete={async (id) => {
        await goatsClient.healthLogs.remove(id);
        await load();
      }}
      modalTitle={{
        create: "Add Goat Health Log",
        edit: "Edit Goat Health Log",
      }}
    />
  );
}
