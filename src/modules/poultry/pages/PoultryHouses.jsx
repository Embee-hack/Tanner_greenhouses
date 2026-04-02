import { useEffect, useMemo, useState } from "react";
import { Activity, Plus, Warehouse } from "lucide-react";
import RecordManagerPage from "@/modules/shared/RecordManagerPage.jsx";
import StatusBadge from "@/components/shared/StatusBadge.jsx";
import { getErrorMessage } from "@/lib/errors.js";
import { poultryClient } from "@/modules/poultry/services/poultryService.js";

const initialValues = {
  name: "",
  type: "",
  capacity: "",
  status: "active",
  notes: "",
};

export default function PoultryHouses() {
  const [houses, setHouses] = useState([]);
  const [flocks, setFlocks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  const load = async () => {
    try {
      setLoading(true);
      const [houseRows, flockRows] = await Promise.all([poultryClient.houses.list(), poultryClient.flocks.list()]);
      setHouses(houseRows);
      setFlocks(flockRows);
      setLoadError("");
    } catch (error) {
      setLoadError(getErrorMessage(error, "Failed to load poultry houses."));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const summaryCards = useMemo(() => {
    const activeHouses = houses.filter((house) => house.status === "active").length;
    const occupiedHouses = new Set(flocks.map((flock) => flock.poultry_house_id)).size;
    const totalCapacity = houses.reduce((sum, house) => sum + (house.capacity || 0), 0);

    return [
      { title: "Total Houses", value: houses.length, subtitle: "Registered poultry houses", icon: Warehouse, color: "primary" },
      { title: "Active Houses", value: activeHouses, subtitle: "Currently available for production", icon: Activity, color: "success" },
      { title: "Occupied Houses", value: occupiedHouses, subtitle: "Houses with at least one flock", icon: Warehouse, color: "accent" },
      { title: "Capacity", value: totalCapacity.toLocaleString(), subtitle: "Estimated bird spaces", icon: Activity, color: "warning" },
    ];
  }, [flocks, houses]);

  return (
    <RecordManagerPage
      title="Poultry Houses"
      subtitle={`${houses.length} total houses`}
      actionLabel="Add Poultry House"
      actionIcon={Plus}
      columns={[
        { key: "name", label: "House" },
        { key: "type", label: "Type", render: (value) => value || "—" },
        { key: "capacity", label: "Capacity", render: (value) => (value ? value.toLocaleString() : "—") },
        { key: "status", label: "Status", render: (value) => <StatusBadge status={value} /> },
        { key: "notes", label: "Notes", render: (value) => value || "—" },
      ]}
      records={houses}
      loading={loading}
      loadError={loadError}
      onRetry={load}
      summaryCards={summaryCards}
      emptyState={{
        icon: Warehouse,
        title: "No poultry houses yet",
        description: "Create poultry houses before assigning flocks.",
      }}
      initialValues={initialValues}
      fields={[
        { key: "name", label: "House name/code", required: true, placeholder: "House A" },
        { key: "type", label: "Type", placeholder: "Broiler, Layer, Turkey..." },
        { key: "capacity", label: "Capacity", type: "number", min: 0, placeholder: "500" },
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
        { key: "notes", label: "Notes", type: "textarea", fullWidth: true, placeholder: "Optional house notes" },
      ]}
      onCreate={async (payload) => {
        await poultryClient.houses.create(payload);
        await load();
      }}
      onUpdate={async (id, payload) => {
        await poultryClient.houses.update(id, payload);
        await load();
      }}
      onDelete={async (id) => {
        await poultryClient.houses.remove(id);
        await load();
      }}
      modalTitle={{
        create: "Add Poultry House",
        edit: "Edit Poultry House",
      }}
    />
  );
}
