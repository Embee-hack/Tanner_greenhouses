import { useEffect, useMemo, useState } from "react";
import { PawPrint, Plus, Scale } from "lucide-react";
import RecordManagerPage from "@/modules/shared/RecordManagerPage.jsx";
import StatusBadge from "@/components/shared/StatusBadge.jsx";
import { goatsClient } from "@/modules/goats/services/goatService.js";
import { formatDateLabel, normalizeOptionalValue } from "@/modules/shared/formatters.js";

const initialValues = {
  tag_number: "",
  name: "",
  breed: "",
  sex: "female",
  date_of_birth: "",
  estimated_age: "",
  acquisition_date: "",
  source: "",
  pen_id: "__none__",
  status: "active",
  current_weight: "",
  notes: "",
};

export default function GoatRegistry() {
  const [pens, setPens] = useState([]);
  const [goats, setGoats] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    const [penRows, goatRows] = await Promise.all([goatsClient.pens.list(), goatsClient.registry.list()]);
    setPens(penRows);
    setGoats(goatRows);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const penOptions = [
    { value: "__none__", label: "No pen assigned" },
    ...pens.map((pen) => ({ value: pen.id, label: pen.name })),
  ];

  const summaryCards = useMemo(() => {
    const activeGoats = goats.filter((goat) => goat.status === "active").length;
    const femaleGoats = goats.filter((goat) => goat.sex === "female" && goat.status === "active").length;
    const maleGoats = goats.filter((goat) => goat.sex === "male" && goat.status === "active").length;
    const avgWeight =
      goats.filter((goat) => goat.current_weight).length > 0
        ? (
            goats.reduce((sum, goat) => sum + (goat.current_weight || 0), 0) /
            goats.filter((goat) => goat.current_weight).length
          ).toFixed(1)
        : "0.0";

    return [
      { title: "Registered Goats", value: goats.length, subtitle: "All goats in the registry", icon: PawPrint, color: "primary" },
      { title: "Active Herd", value: activeGoats, subtitle: "Goats currently on farm", icon: PawPrint, color: "success" },
      { title: "Female / Male", value: `${femaleGoats} / ${maleGoats}`, subtitle: "Active herd composition", icon: PawPrint, color: "accent" },
      { title: "Average Weight", value: `${avgWeight} kg`, subtitle: "Across goats with recorded weight", icon: Scale, color: "warning" },
    ];
  }, [goats]);

  return (
    <RecordManagerPage
      title="Goat Registry"
      subtitle={`${goats.length} goats tracked`}
      actionLabel="Add Goat"
      actionIcon={Plus}
      columns={[
        { key: "tag_number", label: "Tag Number" },
        { key: "name", label: "Name", render: (value) => value || "—" },
        { key: "breed", label: "Breed" },
        { key: "sex", label: "Sex", render: (value) => value || "—" },
        { key: "pen", label: "Pen", render: (_value, row) => row.pen?.name || "—" },
        { key: "status", label: "Status", render: (value) => <StatusBadge status={value} /> },
      ]}
      records={goats}
      loading={loading}
      summaryCards={summaryCards}
      emptyState={{
        icon: PawPrint,
        title: "No goats registered",
        description: "Add individual goats to manage breeding, health, and sales records.",
      }}
      initialValues={initialValues}
      fields={[
        { key: "tag_number", label: "Tag number", required: true, placeholder: "GT-001" },
        { key: "name", label: "Name", placeholder: "Optional goat name" },
        { key: "breed", label: "Breed", required: true, placeholder: "Boer" },
        {
          key: "sex",
          label: "Sex",
          type: "select",
          options: [
            { value: "female", label: "Female" },
            { value: "male", label: "Male" },
          ],
        },
        { key: "date_of_birth", label: "Date of birth", type: "date" },
        { key: "estimated_age", label: "Estimated age", placeholder: "18 months" },
        { key: "acquisition_date", label: "Acquisition date", type: "date" },
        { key: "source", label: "Source", placeholder: "Auction / breeder / farm" },
        { key: "pen_id", label: "Pen", type: "select", options: penOptions },
        {
          key: "status",
          label: "Status",
          type: "select",
          options: [
            { value: "active", label: "Active" },
            { value: "sold", label: "Sold" },
            { value: "dead", label: "Dead" },
            { value: "transferred", label: "Transferred" },
          ],
        },
        { key: "current_weight", label: "Current weight (kg)", type: "number", min: 0, step: "0.01" },
        { key: "notes", label: "Notes", type: "textarea", fullWidth: true, placeholder: "Additional goat notes" },
      ]}
      mapToForm={(row) => ({
        ...row,
        pen_id: row.pen_id || "__none__",
        date_of_birth: row.date_of_birth || "",
        acquisition_date: row.acquisition_date || "",
      })}
      buildPayload={(form) => ({
        ...form,
        pen_id: normalizeOptionalValue(form.pen_id),
      })}
      onCreate={async (payload) => {
        await goatsClient.registry.create(payload);
        await load();
      }}
      onUpdate={async (id, payload) => {
        await goatsClient.registry.update(id, payload);
        await load();
      }}
      onDelete={async (id) => {
        await goatsClient.registry.remove(id);
        await load();
      }}
      modalTitle={{
        create: "Add Goat",
        edit: "Edit Goat",
      }}
    />
  );
}
