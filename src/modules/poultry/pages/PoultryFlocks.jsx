import { useEffect, useMemo, useState } from "react";
import { Egg, Plus, Warehouse } from "lucide-react";
import RecordManagerPage from "@/modules/shared/RecordManagerPage.jsx";
import StatusBadge from "@/components/shared/StatusBadge.jsx";
import { poultryClient } from "@/modules/poultry/services/poultryService.js";
import { normalizeOptionalValue } from "@/modules/shared/formatters.js";

const initialValues = {
  poultry_house_id: "",
  flock_code: "",
  bird_type: "",
  breed: "",
  start_date: "",
  initial_bird_count: "",
  source: "",
  purpose: "__none__",
  status: "active",
  notes: "",
};

export default function PoultryFlocks() {
  const [houses, setHouses] = useState([]);
  const [flocks, setFlocks] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    const [houseRows, flockRows] = await Promise.all([poultryClient.houses.list(), poultryClient.flocks.list()]);
    setHouses(houseRows);
    setFlocks(flockRows);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const houseOptions = houses.map((house) => ({
    value: house.id,
    label: house.name,
  }));

  const summaryCards = useMemo(() => {
    const activeFlocks = flocks.filter((flock) => flock.status === "active").length;
    const totalBirds = flocks.reduce((sum, flock) => sum + (flock.initial_bird_count || 0), 0);
    const purposeMix = new Set(flocks.map((flock) => flock.purpose).filter(Boolean)).size;

    return [
      { title: "Total Flocks", value: flocks.length, subtitle: "All flocks and batches", icon: Egg, color: "primary" },
      { title: "Active Flocks", value: activeFlocks, subtitle: "Currently in production", icon: Egg, color: "success" },
      { title: "Bird Capacity", value: totalBirds.toLocaleString(), subtitle: "Initial birds received", icon: Warehouse, color: "accent" },
      { title: "Purpose Mix", value: purposeMix || 0, subtitle: "Egg, meat, or breeding lines", icon: Warehouse, color: "warning" },
    ];
  }, [flocks]);

  return (
    <RecordManagerPage
      title="Flocks"
      subtitle={`${flocks.length} batches tracked across ${houses.length} houses`}
      actionLabel="Add Flock"
      actionIcon={Plus}
      columns={[
        { key: "flock_code", label: "Flock Code" },
        { key: "poultry_house", label: "House", render: (_value, row) => row.poultry_house?.name || "—" },
        { key: "bird_type", label: "Bird Type" },
        { key: "breed", label: "Breed" },
        { key: "initial_bird_count", label: "Birds", render: (value) => (value ? value.toLocaleString() : "0") },
        { key: "status", label: "Status", render: (value) => <StatusBadge status={value} /> },
      ]}
      records={flocks}
      loading={loading}
      summaryCards={summaryCards}
      emptyState={{
        icon: Egg,
        title: "No flocks recorded",
        description: "Add flock batches to start production tracking.",
      }}
      initialValues={initialValues}
      fields={[
        { key: "poultry_house_id", label: "Poultry house", type: "select", required: true, options: houseOptions },
        { key: "flock_code", label: "Flock code", required: true, placeholder: "FLK-2026-01" },
        { key: "bird_type", label: "Bird type", required: true, placeholder: "Layer" },
        { key: "breed", label: "Breed", required: true, placeholder: "Isa Brown" },
        { key: "start_date", label: "Arrival/start date", type: "date", required: true },
        { key: "initial_bird_count", label: "Initial bird count", type: "number", required: true, min: 0, placeholder: "1000" },
        { key: "source", label: "Source / Supplier", placeholder: "Supplier name" },
        {
          key: "purpose",
          label: "Purpose",
          type: "select",
          options: [
            { value: "__none__", label: "Not set" },
            { value: "egg", label: "Egg production" },
            { value: "meat", label: "Meat production" },
            { value: "breeding", label: "Breeding" },
          ],
        },
        {
          key: "status",
          label: "Status",
          type: "select",
          options: [
            { value: "active", label: "Active" },
            { value: "completed", label: "Completed" },
            { value: "inactive", label: "Inactive" },
          ],
        },
        { key: "notes", label: "Notes", type: "textarea", fullWidth: true, placeholder: "Optional flock notes" },
      ]}
      mapToForm={(row) => ({
        ...row,
        poultry_house_id: row.poultry_house_id || "",
        start_date: row.start_date || "",
        purpose: row.purpose || "__none__",
      })}
      buildPayload={(form) => ({
        ...form,
        purpose: normalizeOptionalValue(form.purpose),
      })}
      onCreate={async (payload) => {
        await poultryClient.flocks.create(payload);
        await load();
      }}
      onUpdate={async (id, payload) => {
        await poultryClient.flocks.update(id, payload);
        await load();
      }}
      onDelete={async (id) => {
        await poultryClient.flocks.remove(id);
        await load();
      }}
      modalTitle={{
        create: "Add Flock",
        edit: "Edit Flock",
      }}
    />
  );
}
