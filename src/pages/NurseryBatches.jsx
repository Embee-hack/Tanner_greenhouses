import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import PageHeader from "@/components/shared/PageHeader";
import DataTable from "@/components/shared/DataTable";
import Modal from "@/components/shared/Modal";
import FormField from "@/components/shared/FormField";
import EmptyState from "@/components/shared/EmptyState";
import DeleteConfirmDialog from "@/components/shared/DeleteConfirmDialog.jsx";
import ErrorBanner from "@/components/shared/ErrorBanner.jsx";
import StatusBadge from "@/components/shared/StatusBadge.jsx";
import StatCard from "@/components/dashboard/StatCard.jsx";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CalendarDays, Leaf, Package, Pencil, Plus, Sprout, Trash2 } from "lucide-react";
import { getErrorMessage } from "@/lib/errors.js";
import { createPageUrl } from "@/utils";

const ALL_HOUSES_VALUE = "__all_houses__";
const ALL_STATUS_VALUE = "__all_statuses__";

const BATCH_STATUS_OPTIONS = [
  { value: "active", label: "Active" },
  { value: "transplanted", label: "Transplanted" },
  { value: "discarded", label: "Discarded" },
];

const getToday = () => new Date().toISOString().slice(0, 10);

const createDefaultForm = () => ({
  greenhouse_id: "",
  seed_name: "",
  variety: "",
  seeds_planted: "",
  trays_used: "",
  date_planted: getToday(),
  date_transplanted: "",
  status: "active",
  notes: "",
});

const truncateText = (value, maxLength = 96) => {
  const text = String(value || "").trim();
  if (!text) return "";
  return text.length > maxLength ? `${text.slice(0, maxLength - 1)}…` : text;
};

const getBatchLabel = (batch) => {
  const seedName = String(batch?.seed_name || "").trim() || "Unnamed batch";
  const variety = String(batch?.variety || "").trim();
  return variety ? `${seedName} · ${variety}` : seedName;
};

export default function NurseryBatches() {
  const location = useLocation();
  const navigate = useNavigate();
  const [records, setRecords] = useState([]);
  const [greenhouses, setGreenhouses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [deleteItem, setDeleteItem] = useState(null);
  const [form, setForm] = useState(createDefaultForm());
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState("");
  const [greenhouseFilter, setGreenhouseFilter] = useState(ALL_HOUSES_VALUE);
  const [statusFilter, setStatusFilter] = useState(ALL_STATUS_VALUE);

  const load = async () => {
    try {
      setLoading(true);
      const [batchRows, greenhouseRows] = await Promise.all([
        base44.entities.NurseryBatch.list("-date_planted", 600),
        base44.entities.Greenhouse.list("code"),
      ]);
      setRecords(batchRows);
      setGreenhouses(greenhouseRows);
      setLoadError("");
    } catch (err) {
      setLoadError(getErrorMessage(err, "Failed to load nursery batches."));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    const batchId = new URLSearchParams(location.search).get("batch");
    if (!batchId || records.length === 0 || showModal) return;

    const batch = records.find((item) => item.id === batchId);
    if (!batch) return;

    setEditItem(batch);
    setForm({
      greenhouse_id: batch.greenhouse_id || "",
      seed_name: batch.seed_name || "",
      variety: batch.variety || "",
      seeds_planted: batch.seeds_planted != null ? String(batch.seeds_planted) : "",
      trays_used: batch.trays_used != null ? String(batch.trays_used) : "",
      date_planted: batch.date_planted || getToday(),
      date_transplanted: batch.date_transplanted || "",
      status: batch.status || "active",
      notes: batch.notes || "",
    });
    setError("");
    setShowModal(true);
    navigate(createPageUrl("NurseryBatches"), { replace: true });
  }, [location.search, navigate, records, showModal]);

  const greenhouseMap = Object.fromEntries(greenhouses.map((greenhouse) => [greenhouse.id, greenhouse]));

  const filteredRecords = records.filter((record) => {
    if (greenhouseFilter !== ALL_HOUSES_VALUE && record.greenhouse_id !== greenhouseFilter) return false;
    if (statusFilter !== ALL_STATUS_VALUE && String(record.status || "active") !== statusFilter) return false;
    return true;
  });

  const totalBatches = records.length;
  const activeBatches = records.filter((record) => String(record.status || "active") === "active");
  const activeSeedCount = activeBatches.reduce((sum, record) => sum + Number(record.seeds_planted || 0), 0);
  const activeTrayCount = activeBatches.reduce((sum, record) => sum + Number(record.trays_used || 0), 0);
  const transplantedCount = records.filter(
    (record) => String(record.status || "").trim().toLowerCase() === "transplanted" || record.date_transplanted
  ).length;

  const openCreateModal = () => {
    setEditItem(null);
    setForm(createDefaultForm());
    setError("");
    setShowModal(true);
  };

  const openEditModal = (record) => {
    setEditItem(record);
    setForm({
      greenhouse_id: record.greenhouse_id || "",
      seed_name: record.seed_name || "",
      variety: record.variety || "",
      seeds_planted: record.seeds_planted != null ? String(record.seeds_planted) : "",
      trays_used: record.trays_used != null ? String(record.trays_used) : "",
      date_planted: record.date_planted || getToday(),
      date_transplanted: record.date_transplanted || "",
      status: record.status || "active",
      notes: record.notes || "",
    });
    setError("");
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditItem(null);
    setForm(createDefaultForm());
    setError("");
  };

  const buildPayload = () => {
    const greenhouse = greenhouseMap[form.greenhouse_id];
    const seedName = String(form.seed_name || "").trim();
    const variety = String(form.variety || "").trim();
    const notes = String(form.notes || "").trim();
    const seedsPlanted = Number(form.seeds_planted);
    const traysUsed = Number(form.trays_used);

    if (!form.greenhouse_id) {
      return { error: "Select the house this nursery batch is meant for." };
    }
    if (!seedName) {
      return { error: "Enter the seed planted." };
    }
    if (!Number.isInteger(seedsPlanted) || seedsPlanted <= 0) {
      return { error: "Number of seeds planted must be a whole number greater than zero." };
    }
    if (!Number.isInteger(traysUsed) || traysUsed <= 0) {
      return { error: "Number of trays used must be a whole number greater than zero." };
    }
    if (!form.date_planted) {
      return { error: "Select the planting date." };
    }
    if (form.date_transplanted && form.date_transplanted < form.date_planted) {
      return { error: "Date transplanted cannot be earlier than date planted." };
    }

    let status = form.status || "active";
    if (form.date_transplanted && status === "active") {
      status = "transplanted";
    }
    if (status === "transplanted" && !form.date_transplanted) {
      return { error: "Add the transplant date before marking a batch as transplanted." };
    }

    return {
      payload: {
        greenhouse_id: form.greenhouse_id,
        greenhouse_code: greenhouse?.code || "",
        greenhouse_name: greenhouse?.name || greenhouse?.code || "",
        seed_name: seedName,
        variety: variety || null,
        seeds_planted: seedsPlanted,
        trays_used: traysUsed,
        date_planted: form.date_planted,
        date_transplanted: form.date_transplanted || null,
        status,
        notes: notes || null,
      },
    };
  };

  const handleSave = async () => {
    const { error: validationError, payload } = buildPayload();
    if (validationError) {
      setError(validationError);
      return;
    }

    setSaving(true);
    setError("");
    try {
      if (editItem) {
        await base44.entities.NurseryBatch.update(editItem.id, payload);
      } else {
        await base44.entities.NurseryBatch.create(payload);
      }
      closeModal();
      await load();
    } catch (err) {
      setError(getErrorMessage(err, `Failed to ${editItem ? "update" : "create"} nursery batch.`));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteItem) return;

    setDeleting(true);
    try {
      await base44.entities.NurseryBatch.delete(deleteItem.id);
      setDeleteItem(null);
      await load();
    } catch (err) {
      setLoadError(getErrorMessage(err, "Failed to delete nursery batch."));
    } finally {
      setDeleting(false);
    }
  };

  const columns = [
    {
      key: "seed_name",
      label: "Batch",
      render: (_value, row) => (
        <div className="max-w-xs">
          <div className="font-medium">{getBatchLabel(row)}</div>
          <div className="text-xs text-muted-foreground">{truncateText(row.notes || "No notes added")}</div>
        </div>
      ),
    },
    {
      key: "greenhouse_id",
      label: "House",
      render: (value, row) => greenhouseMap[value]?.code || row.greenhouse_code || "—",
    },
    {
      key: "seeds_planted",
      label: "Seeds Planted",
      render: (value) => Number(value || 0).toLocaleString(),
      align: "right",
    },
    {
      key: "trays_used",
      label: "Trays Used",
      render: (value) => Number(value || 0).toLocaleString(),
      align: "right",
    },
    { key: "date_planted", label: "Date Planted" },
    {
      key: "date_transplanted",
      label: "Date Transplanted",
      render: (value) => value || "—",
    },
    {
      key: "status",
      label: "Status",
      render: (value) => <StatusBadge status={value || "active"} />,
    },
    {
      key: "actions",
      label: "",
      render: (_value, row) => (
        <div className="flex justify-end gap-1">
          <Button
            variant="ghost"
            size="icon"
            onClick={(event) => {
              event.stopPropagation();
              openEditModal(row);
            }}
            aria-label={`Edit ${getBatchLabel(row)}`}
          >
            <Pencil className="w-4 h-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={(event) => {
              event.stopPropagation();
              setDeleteItem(row);
            }}
            aria-label={`Delete ${getBatchLabel(row)}`}
          >
            <Trash2 className="w-4 h-4 text-danger" />
          </Button>
        </div>
      ),
    },
  ];

  if (!loading && greenhouses.length === 0 && records.length === 0) {
    return (
      <div className="p-4 md:p-6">
        <PageHeader title="Nursery Batches" subtitle="Track seeds planted, tray usage, and transplant readiness by house." />
        <EmptyState
          icon={Sprout}
          title="Add a greenhouse first"
          description="Nursery batches need a destination house before they can be logged."
          action={<Button onClick={() => navigate(createPageUrl("Greenhouses"))}>Open Greenhouses</Button>}
        />
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 space-y-6">
      <PageHeader
        title="Nursery Batches"
        subtitle={`${totalBatches} batch${totalBatches === 1 ? "" : "es"} recorded across nursery operations`}
        actions={
          <Button size="sm" onClick={openCreateModal} className="gap-1.5">
            <Plus className="w-4 h-4" />
            Add Batch
          </Button>
        }
      />

      <ErrorBanner message={loadError} onRetry={load} />

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard
          title="Total Batches"
          value={totalBatches.toLocaleString()}
          subtitle={`${filteredRecords.length.toLocaleString()} in current view`}
          icon={Sprout}
          color="primary"
          loading={loading}
        />
        <StatCard
          title="Active Batches"
          value={activeBatches.length.toLocaleString()}
          subtitle={`${activeSeedCount.toLocaleString()} seeds still in nursery`}
          icon={Leaf}
          color="success"
          loading={loading}
        />
        <StatCard
          title="Trays In Use"
          value={activeTrayCount.toLocaleString()}
          subtitle="Across active nursery batches"
          icon={Package}
          color="warning"
          loading={loading}
        />
        <StatCard
          title="Transplanted"
          value={transplantedCount.toLocaleString()}
          subtitle="Batches already moved to houses"
          icon={CalendarDays}
          color="accent"
          loading={loading}
        />
      </div>

      <div className="bg-card rounded-xl border border-border p-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <FormField label="Filter by House">
            <Select value={greenhouseFilter} onValueChange={setGreenhouseFilter}>
              <SelectTrigger>
                <SelectValue placeholder="All houses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL_HOUSES_VALUE}>All houses</SelectItem>
                {greenhouses.map((greenhouse) => (
                  <SelectItem key={greenhouse.id} value={greenhouse.id}>
                    {greenhouse.code} {greenhouse.name ? `· ${greenhouse.name}` : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FormField>

          <FormField label="Filter by Status">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger>
                <SelectValue placeholder="All statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL_STATUS_VALUE}>All statuses</SelectItem>
                {BATCH_STATUS_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FormField>
        </div>
      </div>

      {!loading && filteredRecords.length === 0 ? (
        <EmptyState
          icon={Sprout}
          title="No nursery batches found"
          description="Log seed planting batches, tray usage, and transplant dates here."
          action={<Button onClick={openCreateModal}>Add Batch</Button>}
        />
      ) : (
        <DataTable columns={columns} data={filteredRecords} loading={loading} onRowClick={openEditModal} />
      )}

      <Modal
        open={showModal}
        onClose={closeModal}
        title={editItem ? "Edit Nursery Batch" : "Add Nursery Batch"}
        size="lg"
      >
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField label="House" required>
              <Select
                value={form.greenhouse_id}
                onValueChange={(value) => setForm((prev) => ({ ...prev, greenhouse_id: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select house" />
                </SelectTrigger>
                <SelectContent>
                  {greenhouses.map((greenhouse) => (
                    <SelectItem key={greenhouse.id} value={greenhouse.id}>
                      {greenhouse.code} {greenhouse.name ? `· ${greenhouse.name}` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FormField>

            <FormField label="Status">
              <Select value={form.status} onValueChange={(value) => setForm((prev) => ({ ...prev, status: value }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  {BATCH_STATUS_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FormField>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField label="Seed Planted" required>
              <Input
                value={form.seed_name}
                onChange={(event) => setForm((prev) => ({ ...prev, seed_name: event.target.value }))}
                placeholder="e.g. Sweet pepper"
              />
            </FormField>

            <FormField label="Variety">
              <Input
                value={form.variety}
                onChange={(event) => setForm((prev) => ({ ...prev, variety: event.target.value }))}
                placeholder="e.g. California Wonder"
              />
            </FormField>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField label="Number of Seeds Planted" required>
              <Input
                type="number"
                min="1"
                step="1"
                value={form.seeds_planted}
                onChange={(event) => setForm((prev) => ({ ...prev, seeds_planted: event.target.value }))}
                placeholder="0"
              />
            </FormField>

            <FormField label="Number of Trays Used" required>
              <Input
                type="number"
                min="1"
                step="1"
                value={form.trays_used}
                onChange={(event) => setForm((prev) => ({ ...prev, trays_used: event.target.value }))}
                placeholder="0"
              />
            </FormField>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField label="Date Planted" required>
              <Input
                type="date"
                value={form.date_planted}
                onChange={(event) => setForm((prev) => ({ ...prev, date_planted: event.target.value }))}
              />
            </FormField>

            <FormField label="Date Transplanted">
              <Input
                type="date"
                value={form.date_transplanted}
                onChange={(event) => setForm((prev) => ({ ...prev, date_transplanted: event.target.value }))}
              />
            </FormField>
          </div>

          <FormField label="Notes">
            <Textarea
              value={form.notes}
              onChange={(event) => setForm((prev) => ({ ...prev, notes: event.target.value }))}
              placeholder="Add any batch notes, observations, or transplant remarks."
              rows={4}
            />
          </FormField>

          {error ? <div className="rounded-lg bg-danger/10 px-4 py-2 text-sm text-danger">{error}</div> : null}

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={closeModal} disabled={saving}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? "Saving..." : editItem ? "Save Changes" : "Create Batch"}
            </Button>
          </div>
        </div>
      </Modal>

      <DeleteConfirmDialog
        open={!!deleteItem}
        onOpenChange={(open) => {
          if (!open) setDeleteItem(null);
        }}
        title="Delete this nursery batch?"
        description="This will remove the nursery batch record and its planting details."
        loading={deleting}
        onConfirm={handleDelete}
      />
    </div>
  );
}
