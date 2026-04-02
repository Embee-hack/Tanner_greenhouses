import { useEffect, useMemo, useState } from "react";
import { ClipboardList, Plus } from "lucide-react";
import RecordManagerPage from "@/modules/shared/RecordManagerPage.jsx";
import { getErrorMessage } from "@/lib/errors.js";
import { goatsClient } from "@/modules/goats/services/goatService.js";
import { formatDateLabel, normalizeOptionalValue } from "@/modules/shared/formatters.js";

const initialValues = {
  doe_goat_id: "",
  buck_goat_id: "__none__",
  mating_date: "",
  expected_kidding_date: "",
  actual_kidding_date: "",
  kids_born_count: "0",
  kids_alive_count: "0",
  notes: "",
};

export default function GoatBreeding() {
  const [goats, setGoats] = useState([]);
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  const load = async () => {
    try {
      setLoading(true);
      const [goatRows, breedingRows] = await Promise.all([goatsClient.registry.list(), goatsClient.breeding.list()]);
      setGoats(goatRows);
      setRecords(breedingRows);
      setLoadError("");
    } catch (error) {
      setLoadError(getErrorMessage(error, "Failed to load goat breeding records."));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const doeOptions = goats
    .filter((goat) => goat.sex === "female")
    .map((goat) => ({ value: goat.id, label: `${goat.tag_number}${goat.name ? ` · ${goat.name}` : ""}` }));
  const buckOptions = [
    { value: "__none__", label: "Buck not recorded" },
    ...goats
      .filter((goat) => goat.sex === "male")
      .map((goat) => ({ value: goat.id, label: `${goat.tag_number}${goat.name ? ` · ${goat.name}` : ""}` })),
  ];

  const summaryCards = useMemo(() => {
    const completed = records.filter((row) => row.actual_kidding_date).length;
    const totalKids = records.reduce((sum, row) => sum + (row.kids_born_count || 0), 0);
    const liveKids = records.reduce((sum, row) => sum + (row.kids_alive_count || 0), 0);

    return [
      { title: "Breeding Logs", value: records.length, subtitle: "Mating and kidding records", icon: ClipboardList, color: "primary" },
      { title: "Completed Kidding", value: completed, subtitle: "Logs with actual kidding date", icon: ClipboardList, color: "success" },
      { title: "Kids Born", value: totalKids, subtitle: "Total kids recorded", icon: ClipboardList, color: "accent" },
      { title: "Kids Alive", value: liveKids, subtitle: "Surviving kids recorded", icon: ClipboardList, color: "warning" },
    ];
  }, [records]);

  return (
    <RecordManagerPage
      title="Breeding"
      subtitle={`${records.length} breeding records`}
      actionLabel="Add Breeding Log"
      actionIcon={Plus}
      columns={[
        { key: "doe_goat", label: "Doe", render: (_value, row) => row.doe_goat?.tag_number || "—" },
        { key: "buck_goat", label: "Buck", render: (_value, row) => row.buck_goat?.tag_number || "—" },
        { key: "mating_date", label: "Mating Date", render: (value) => formatDateLabel(value) },
        { key: "expected_kidding_date", label: "Expected Kidding", render: (value) => (value ? formatDateLabel(value) : "—") },
        { key: "actual_kidding_date", label: "Actual Kidding", render: (value) => (value ? formatDateLabel(value) : "—") },
        { key: "kids_born_count", label: "Kids Born", render: (value) => value ?? 0 },
      ]}
      records={records}
      loading={loading}
      loadError={loadError}
      onRetry={load}
      summaryCards={summaryCards}
      emptyState={{
        icon: ClipboardList,
        title: "No breeding records",
        description: "Track mating dates, expected kidding dates, and kidding outcomes.",
      }}
      initialValues={initialValues}
      fields={[
        { key: "doe_goat_id", label: "Doe goat", type: "select", required: true, options: doeOptions },
        { key: "buck_goat_id", label: "Buck goat", type: "select", options: buckOptions },
        { key: "mating_date", label: "Mating date", type: "date", required: true },
        { key: "expected_kidding_date", label: "Expected kidding date", type: "date" },
        { key: "actual_kidding_date", label: "Actual kidding date", type: "date" },
        { key: "kids_born_count", label: "Kids born", type: "number", min: 0 },
        { key: "kids_alive_count", label: "Kids alive", type: "number", min: 0 },
        { key: "notes", label: "Notes", type: "textarea", fullWidth: true, placeholder: "Breeding notes" },
      ]}
      mapToForm={(row) => ({
        ...row,
        doe_goat_id: row.doe_goat_id || "",
        buck_goat_id: row.buck_goat_id || "__none__",
        mating_date: row.mating_date || "",
        expected_kidding_date: row.expected_kidding_date || "",
        actual_kidding_date: row.actual_kidding_date || "",
      })}
      buildPayload={(form) => ({
        ...form,
        buck_goat_id: normalizeOptionalValue(form.buck_goat_id),
      })}
      onCreate={async (payload) => {
        await goatsClient.breeding.create(payload);
        await load();
      }}
      onUpdate={async (id, payload) => {
        await goatsClient.breeding.update(id, payload);
        await load();
      }}
      onDelete={async (id) => {
        await goatsClient.breeding.remove(id);
        await load();
      }}
      modalTitle={{
        create: "Add Breeding Log",
        edit: "Edit Breeding Log",
      }}
    />
  );
}
