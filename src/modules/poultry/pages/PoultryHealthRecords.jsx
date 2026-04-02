import { useEffect, useMemo, useState } from "react";
import { HeartPulse, Plus } from "lucide-react";
import RecordManagerPage from "@/modules/shared/RecordManagerPage.jsx";
import { getErrorMessage } from "@/lib/errors.js";
import { poultryClient } from "@/modules/poultry/services/poultryService.js";
import { formatDateLabel } from "@/modules/shared/formatters.js";

const initialValues = {
  flock_id: "",
  log_date: "",
  issue_type: "",
  symptoms: "",
  affected_count: "",
  treatment: "",
  medication: "",
  vaccination: "",
  notes: "",
};

export default function PoultryHealthRecords() {
  const [flocks, setFlocks] = useState([]);
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  const load = async () => {
    try {
      setLoading(true);
      const [flockRows, healthRows] = await Promise.all([poultryClient.flocks.list(), poultryClient.healthLogs.list()]);
      setFlocks(flockRows);
      setRecords(healthRows);
      setLoadError("");
    } catch (error) {
      setLoadError(getErrorMessage(error, "Failed to load poultry health records."));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const flockOptions = flocks.map((flock) => ({ value: flock.id, label: flock.flock_code }));

  const summaryCards = useMemo(() => {
    const affectedBirds = records.reduce((sum, row) => sum + (row.affected_count || 0), 0);
    const vaccinationEvents = records.filter((row) => row.vaccination).length;
    const medicationEvents = records.filter((row) => row.medication).length;

    return [
      { title: "Health Logs", value: records.length, subtitle: "Issues, vaccines, and treatment entries", icon: HeartPulse, color: "primary" },
      { title: "Affected Birds", value: affectedBirds.toLocaleString(), subtitle: "Count captured in health reports", icon: HeartPulse, color: "danger" },
      { title: "Vaccination Events", value: vaccinationEvents, subtitle: "Records with vaccine details", icon: HeartPulse, color: "success" },
      { title: "Medication Events", value: medicationEvents, subtitle: "Treatment entries with medication", icon: HeartPulse, color: "warning" },
    ];
  }, [records]);

  return (
    <RecordManagerPage
      title="Health Records"
      subtitle={`${records.length} flock health records`}
      actionLabel="Add Health Record"
      actionIcon={Plus}
      columns={[
        { key: "log_date", label: "Date", render: (value) => formatDateLabel(value) },
        { key: "flock", label: "Flock", render: (_value, row) => row.flock?.flock_code || "—" },
        { key: "issue_type", label: "Issue Type" },
        { key: "affected_count", label: "Affected", render: (value) => value ?? "—" },
        { key: "medication", label: "Medication", render: (value) => value || "—" },
        { key: "vaccination", label: "Vaccination", render: (value) => value || "—" },
      ]}
      records={records}
      loading={loading}
      loadError={loadError}
      onRetry={load}
      summaryCards={summaryCards}
      emptyState={{
        icon: HeartPulse,
        title: "No health records",
        description: "Capture disease, treatment, and vaccination events by flock.",
      }}
      initialValues={initialValues}
      fields={[
        { key: "flock_id", label: "Flock", type: "select", required: true, options: flockOptions },
        { key: "log_date", label: "Date", type: "date", required: true },
        { key: "issue_type", label: "Issue type", required: true, placeholder: "Respiratory signs" },
        { key: "affected_count", label: "Affected count", type: "number", min: 0 },
        { key: "symptoms", label: "Symptoms", type: "textarea", fullWidth: true, placeholder: "Observed symptoms" },
        { key: "treatment", label: "Treatment given", placeholder: "Supportive care" },
        { key: "medication", label: "Medication", placeholder: "Medication name" },
        { key: "vaccination", label: "Vaccination / Deworming", placeholder: "Lasota" },
        { key: "notes", label: "Notes", type: "textarea", fullWidth: true, placeholder: "Additional health notes" },
      ]}
      mapToForm={(row) => ({
        ...row,
        flock_id: row.flock_id || "",
        log_date: row.log_date || "",
      })}
      onCreate={async (payload) => {
        await poultryClient.healthLogs.create(payload);
        await load();
      }}
      onUpdate={async (id, payload) => {
        await poultryClient.healthLogs.update(id, payload);
        await load();
      }}
      onDelete={async (id) => {
        await poultryClient.healthLogs.remove(id);
        await load();
      }}
      modalTitle={{
        create: "Add Health Record",
        edit: "Edit Health Record",
      }}
    />
  );
}
