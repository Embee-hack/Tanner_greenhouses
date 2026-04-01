import { useEffect, useMemo, useState } from "react";
import { Fence, PawPrint, Plus } from "lucide-react";
import RecordManagerPage from "@/modules/shared/RecordManagerPage.jsx";
import StatusBadge from "@/components/shared/StatusBadge.jsx";
import { goatsClient } from "@/modules/goats/services/goatService.js";

const initialValues = {
  name: "",
  type: "",
  capacity: "",
  status: "active",
  notes: "",
};

export default function GoatPens() {
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

  const summaryCards = useMemo(() => {
    const activePens = pens.filter((pen) => pen.status === "active").length;
    const assignedPens = new Set(goats.map((goat) => goat.pen_id).filter(Boolean)).size;
    const totalCapacity = pens.reduce((sum, pen) => sum + (pen.capacity || 0), 0);

    return [
      { title: "Total Pens", value: pens.length, subtitle: "Registered goat pens", icon: Fence, color: "primary" },
      { title: "Active Pens", value: activePens, subtitle: "Pens available for use", icon: Fence, color: "success" },
      { title: "Assigned Pens", value: assignedPens, subtitle: "Pens with goats assigned", icon: PawPrint, color: "accent" },
      { title: "Capacity", value: totalCapacity.toLocaleString(), subtitle: "Estimated goat spaces", icon: Fence, color: "warning" },
    ];
  }, [goats, pens]);

  return (
    <RecordManagerPage
      title="Pens"
      subtitle={`${pens.length} goat pens`}
      actionLabel="Add Pen"
      actionIcon={Plus}
      columns={[
        { key: "name", label: "Pen" },
        { key: "type", label: "Type", render: (value) => value || "—" },
        { key: "capacity", label: "Capacity", render: (value) => (value ? value.toLocaleString() : "—") },
        { key: "status", label: "Status", render: (value) => <StatusBadge status={value} /> },
        { key: "notes", label: "Notes", render: (value) => value || "—" },
      ]}
      records={pens}
      loading={loading}
      summaryCards={summaryCards}
      emptyState={{
        icon: Fence,
        title: "No goat pens yet",
        description: "Create pens before assigning goats to locations.",
      }}
      initialValues={initialValues}
      fields={[
        { key: "name", label: "Pen name/code", required: true, placeholder: "Pen A" },
        { key: "type", label: "Pen type", placeholder: "Breeding, Kids, Mixed..." },
        { key: "capacity", label: "Capacity", type: "number", min: 0, placeholder: "20" },
        {
          key: "status",
          label: "Status",
          type: "select",
          options: [
            { value: "active", label: "Active" },
            { value: "inactive", label: "Inactive" },
            { value: "maintenance", label: "Maintenance" },
          ],
        },
        { key: "notes", label: "Notes", type: "textarea", fullWidth: true, placeholder: "Optional pen notes" },
      ]}
      onCreate={async (payload) => {
        await goatsClient.pens.create(payload);
        await load();
      }}
      onUpdate={async (id, payload) => {
        await goatsClient.pens.update(id, payload);
        await load();
      }}
      onDelete={async (id) => {
        await goatsClient.pens.remove(id);
        await load();
      }}
      modalTitle={{
        create: "Add Goat Pen",
        edit: "Edit Goat Pen",
      }}
    />
  );
}
