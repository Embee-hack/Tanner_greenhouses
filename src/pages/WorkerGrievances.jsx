import { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { useLocation, useNavigate } from "react-router-dom";
import PageHeader from "@/components/shared/PageHeader";
import DataTable from "@/components/shared/DataTable";
import Modal from "@/components/shared/Modal";
import FormField from "@/components/shared/FormField";
import EmptyState from "@/components/shared/EmptyState";
import DeleteConfirmDialog from "@/components/shared/DeleteConfirmDialog.jsx";
import ErrorBanner from "@/components/shared/ErrorBanner.jsx";
import StatusBadge from "@/components/shared/StatusBadge.jsx";
import RecordActions from "@/components/shared/RecordActions.jsx";
import StatCard from "@/components/dashboard/StatCard.jsx";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useCurrency } from "@/components/shared/CurrencyProvider.jsx";
import { getCreatedByText } from "@/lib/createdBy.js";
import { getErrorMessage } from "@/lib/errors.js";
import { createPageUrl } from "@/utils";
import {
  AlertTriangle,
  CheckCircle2,
  CircleDashed,
  Plus,
  Wallet,
} from "lucide-react";

const GRIEVANCE_CATEGORY_OPTIONS = [
  { value: "lateness", label: "Lateness" },
  { value: "absence", label: "Absence / no show" },
  { value: "misconduct", label: "Misconduct" },
  { value: "damage", label: "Damage / loss" },
  { value: "safety", label: "Safety violation" },
  { value: "performance", label: "Performance issue" },
  { value: "insubordination", label: "Insubordination" },
  { value: "other", label: "Other" },
];

const GRIEVANCE_STATUS_OPTIONS = [
  { value: "open", label: "Open" },
  { value: "investigating", label: "Investigating" },
  { value: "resolved", label: "Resolved" },
  { value: "waived", label: "Waived" },
];

const SEVERITY_OPTIONS = ["low", "medium", "high", "critical"];
const ALL_WORKERS_VALUE = "__all_workers__";
const ALL_STATUSES_VALUE = "__all_statuses__";
const ALL_CATEGORIES_VALUE = "__all_categories__";

const getToday = () => new Date().toISOString().slice(0, 10);

const createDefaultForm = () => ({
  worker_id: "",
  date: getToday(),
  category: "lateness",
  title: "",
  severity: "medium",
  surcharge_amount: "",
  status: "open",
  description: "",
  resolution_notes: "",
  resolved_date: "",
});

const humanizeText = (value) =>
  String(value || "")
    .replace(/_/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());

const getCategoryLabel = (value) =>
  GRIEVANCE_CATEGORY_OPTIONS.find((option) => option.value === value)?.label || humanizeText(value);

export default function WorkerGrievances() {
  const { fmt } = useCurrency();
  const location = useLocation();
  const navigate = useNavigate();
  const [records, setRecords] = useState([]);
  const [workers, setWorkers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [deleteItem, setDeleteItem] = useState(null);
  const [form, setForm] = useState(createDefaultForm());
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState("");
  const [workerFilter, setWorkerFilter] = useState(ALL_WORKERS_VALUE);
  const [statusFilter, setStatusFilter] = useState(ALL_STATUSES_VALUE);
  const [categoryFilter, setCategoryFilter] = useState(ALL_CATEGORIES_VALUE);

  const load = async () => {
    try {
      setLoading(true);
      const [grievanceRows, workerRows] = await Promise.all([
        base44.entities.WorkerGrievance.list("-date", 1000),
        base44.entities.Worker.list(),
      ]);
      setRecords(grievanceRows);
      setWorkers(workerRows);
      setLoadError("");
    } catch (err) {
      setLoadError(getErrorMessage(err, "Failed to load worker grievances."));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    const grievanceId = new URLSearchParams(location.search).get("grievance");
    if (!grievanceId || records.length === 0 || showModal) return;

    const record = records.find((item) => item.id === grievanceId);
    if (!record) return;

    setEditItem(record);
    setForm({
      worker_id: record.worker_id || "",
      date: record.date || getToday(),
      category: record.category || "lateness",
      title: record.title || "",
      severity: record.severity || "medium",
      surcharge_amount: record.surcharge_amount != null ? String(record.surcharge_amount) : "",
      status: record.status || "open",
      description: record.description || "",
      resolution_notes: record.resolution_notes || "",
      resolved_date: record.resolved_date || "",
    });
    setError("");
    setShowModal(true);
    navigate(createPageUrl("WorkerGrievances"), { replace: true });
  }, [location.search, navigate, records, showModal]);

  const workerMap = Object.fromEntries(workers.map((worker) => [worker.id, worker]));
  const activeWorkers = [...workers]
    .filter((worker) => worker.status !== "terminated")
    .sort((a, b) => String(a.full_name || "").localeCompare(String(b.full_name || "")));

  const filteredRecords = records.filter((record) => {
    if (workerFilter !== ALL_WORKERS_VALUE && record.worker_id !== workerFilter) return false;
    if (statusFilter !== ALL_STATUSES_VALUE && record.status !== statusFilter) return false;
    if (categoryFilter !== ALL_CATEGORIES_VALUE && record.category !== categoryFilter) return false;
    return true;
  });

  const openCount = records.filter((record) => ["open", "investigating"].includes(record.status)).length;
  const resolvedCount = records.filter((record) => record.status === "resolved").length;
  const waivedCount = records.filter((record) => record.status === "waived").length;
  const totalSurcharge = records.reduce((sum, record) => sum + Number(record.surcharge_amount || 0), 0);

  const openCreateModal = () => {
    setEditItem(null);
    setForm(createDefaultForm());
    setError("");
    setShowModal(true);
  };

  const openEditModal = (record) => {
    setEditItem(record);
    setForm({
      worker_id: record.worker_id || "",
      date: record.date || getToday(),
      category: record.category || "lateness",
      title: record.title || "",
      severity: record.severity || "medium",
      surcharge_amount: record.surcharge_amount != null ? String(record.surcharge_amount) : "",
      status: record.status || "open",
      description: record.description || "",
      resolution_notes: record.resolution_notes || "",
      resolved_date: record.resolved_date || "",
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
    const worker = workerMap[form.worker_id];
    const resolvedDate =
      form.status === "resolved" || form.status === "waived"
        ? form.resolved_date || getToday()
        : null;

    return {
      worker_id: form.worker_id,
      worker_name: worker?.full_name || "",
      category: form.category,
      title: String(form.title || "").trim(),
      severity: form.severity,
      surcharge_amount: form.surcharge_amount === "" ? null : Number(form.surcharge_amount),
      status: form.status,
      date: form.date,
      description: String(form.description || "").trim() || null,
      resolution_notes: String(form.resolution_notes || "").trim() || null,
      resolved_date: resolvedDate,
    };
  };

  const handleSave = async () => {
    if (!form.worker_id || !form.date || !form.title) return;

    setSaving(true);
    setError("");
    try {
      const payload = buildPayload();
      if (payload.surcharge_amount != null && Number.isNaN(payload.surcharge_amount)) {
        setError("Enter a valid surcharge amount.");
        setSaving(false);
        return;
      }

      if (editItem) {
        await base44.entities.WorkerGrievance.update(editItem.id, payload);
      } else {
        await base44.entities.WorkerGrievance.create(payload);
      }

      closeModal();
      await load();
    } catch (err) {
      setError(getErrorMessage(err, "Failed to save worker grievance."));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteItem) return;
    setDeleting(true);
    try {
      await base44.entities.WorkerGrievance.delete(deleteItem.id);
      setDeleteItem(null);
      if (editItem?.id === deleteItem.id) {
        closeModal();
      }
      await load();
    } catch (err) {
      setLoadError(getErrorMessage(err, "Failed to delete worker grievance."));
    } finally {
      setDeleting(false);
    }
  };

  const columns = [
    { key: "date", label: "Date" },
    {
      key: "worker_id",
      label: "Worker",
      render: (_, row) => workerMap[row.worker_id]?.full_name || row.worker_name || "—",
    },
    { key: "category", label: "Category", render: (value) => getCategoryLabel(value) },
    {
      key: "title",
      label: "Issue",
      render: (value, row) => (
        <div className="min-w-0 max-w-[280px] whitespace-normal">
          <div className="font-medium text-foreground">{value || "—"}</div>
          <div className="text-xs text-muted-foreground mt-1">{getCreatedByText(row)}</div>
        </div>
      ),
    },
    { key: "severity", label: "Severity", render: (value) => <StatusBadge status={value} /> },
    { key: "surcharge_amount", label: "Surcharge", align: "right", render: (value) => (value ? fmt(value) : "—") },
    { key: "status", label: "Status", render: (value) => <StatusBadge status={value} /> },
    {
      key: "resolution_notes",
      label: "Resolution",
      render: (_, row) => row.resolution_notes || (row.resolved_date ? `Closed ${row.resolved_date}` : "—"),
    },
    {
      key: "id",
      label: "Actions",
      render: (_, row) => (
        <RecordActions
          onEdit={() => openEditModal(row)}
          onDelete={() => setDeleteItem(row)}
          ariaLabel={`Actions for grievance on ${row.date}`}
        />
      ),
    },
  ];

  return (
    <div className="p-4 md:p-6 space-y-6">
      <PageHeader
        title="Grievance Log"
        subtitle={`${records.length} worker issue${records.length === 1 ? "" : "s"} recorded`}
        actions={
          <Button size="sm" onClick={openCreateModal} className="gap-1.5">
            <Plus className="w-4 h-4" /> Log Grievance
          </Button>
        }
      />

      <ErrorBanner message={loadError} onRetry={load} />

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard title="Open Issues" value={openCount} subtitle="Open and investigating cases" icon={AlertTriangle} color="warning" loading={loading} />
        <StatCard title="Resolved" value={resolvedCount} subtitle={waivedCount > 0 ? `${waivedCount} waived` : "Closed with action"} icon={CheckCircle2} color="success" loading={loading} />
        <StatCard title="Waived" value={waivedCount} subtitle="Resolved without surcharge" icon={CircleDashed} color="accent" loading={loading} />
        <StatCard title="Surcharge Total" value={fmt(totalSurcharge)} subtitle="Recorded worker penalties" icon={Wallet} color="danger" loading={loading} />
      </div>

      <div className="bg-card border border-border rounded-2xl p-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <FormField label="Worker">
            <Select value={workerFilter} onValueChange={setWorkerFilter}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL_WORKERS_VALUE}>All workers</SelectItem>
                {activeWorkers.map((worker) => (
                  <SelectItem key={worker.id} value={worker.id}>{worker.full_name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FormField>
          <FormField label="Status">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL_STATUSES_VALUE}>All statuses</SelectItem>
                {GRIEVANCE_STATUS_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FormField>
          <FormField label="Category">
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL_CATEGORIES_VALUE}>All categories</SelectItem>
                {GRIEVANCE_CATEGORY_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FormField>
        </div>
      </div>

      {!loading && filteredRecords.length === 0 ? (
        <EmptyState
          icon={AlertTriangle}
          title="No grievances logged"
          description="Track lateness, misconduct, surcharges, and how each worker issue was resolved."
          action={<Button onClick={openCreateModal}><Plus className="w-4 h-4 mr-1" />Log Grievance</Button>}
        />
      ) : (
        <DataTable columns={columns} data={filteredRecords} loading={loading} />
      )}

      <Modal open={showModal} onClose={closeModal} title={editItem ? "Edit Grievance" : "Log Grievance"}>
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField label="Worker" required>
              <Select value={form.worker_id} onValueChange={(value) => setForm((current) => ({ ...current, worker_id: value }))}>
                <SelectTrigger><SelectValue placeholder="Select worker" /></SelectTrigger>
                <SelectContent>
                  {activeWorkers.map((worker) => (
                    <SelectItem key={worker.id} value={worker.id}>{worker.full_name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FormField>
            <FormField label="Date" required>
              <Input type="date" value={form.date} onChange={(event) => setForm((current) => ({ ...current, date: event.target.value }))} />
            </FormField>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField label="Category" required>
              <Select value={form.category} onValueChange={(value) => setForm((current) => ({ ...current, category: value }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {GRIEVANCE_CATEGORY_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FormField>
            <FormField label="Severity" required>
              <Select value={form.severity} onValueChange={(value) => setForm((current) => ({ ...current, severity: value }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {SEVERITY_OPTIONS.map((value) => (
                    <SelectItem key={value} value={value} className="capitalize">{value}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FormField>
          </div>

          <FormField label="Issue / grievance" required>
            <Input
              value={form.title}
              onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))}
              placeholder="e.g. Missed morning check-in"
            />
          </FormField>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField label="Surcharge Amount">
              <Input
                type="number"
                min="0"
                step="0.01"
                value={form.surcharge_amount}
                onChange={(event) => setForm((current) => ({ ...current, surcharge_amount: event.target.value }))}
                placeholder="0.00"
              />
            </FormField>
            <FormField label="Status" required>
              <Select
                value={form.status}
                onValueChange={(value) =>
                  setForm((current) => ({
                    ...current,
                    status: value,
                    resolved_date: value === "resolved" || value === "waived" ? current.resolved_date || getToday() : "",
                  }))
                }
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {GRIEVANCE_STATUS_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FormField>
          </div>

          <FormField label="Description">
            <Textarea
              value={form.description}
              onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))}
              className="h-20 resize-none"
              placeholder="Describe what happened and why the grievance was recorded."
            />
          </FormField>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField label="Resolution Notes">
              <Textarea
                value={form.resolution_notes}
                onChange={(event) => setForm((current) => ({ ...current, resolution_notes: event.target.value }))}
                className="h-20 resize-none"
                placeholder="How the issue was handled or resolved."
              />
            </FormField>
            <FormField label="Resolved Date">
              <Input
                type="date"
                value={form.resolved_date}
                onChange={(event) => setForm((current) => ({ ...current, resolved_date: event.target.value }))}
                disabled={form.status !== "resolved" && form.status !== "waived"}
              />
            </FormField>
          </div>

          {error ? <div className="bg-danger/10 text-danger text-sm rounded-lg px-4 py-2">{error}</div> : null}

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={closeModal}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving || !form.worker_id || !form.date || !form.title}>
              {saving ? "Saving..." : editItem ? "Save Changes" : "Log Grievance"}
            </Button>
          </div>
        </div>
      </Modal>

      <DeleteConfirmDialog
        open={!!deleteItem}
        onOpenChange={(open) => {
          if (!open) setDeleteItem(null);
        }}
        title="Delete this grievance?"
        description="This worker grievance record will be removed from the log."
        confirmLabel="Delete Grievance"
        loading={deleting}
        onConfirm={handleDelete}
      />
    </div>
  );
}
