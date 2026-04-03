import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import PageHeader from "@/components/shared/PageHeader";
import DataTable from "@/components/shared/DataTable";
import StatusBadge from "@/components/shared/StatusBadge";
import Modal from "@/components/shared/Modal";
import FormField from "@/components/shared/FormField";
import EmptyState from "@/components/shared/EmptyState";
import DeleteConfirmDialog from "@/components/shared/DeleteConfirmDialog.jsx";
import ErrorBanner from "@/components/shared/ErrorBanner.jsx";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, AlertTriangle, Pencil, Trash2 } from "lucide-react";
import { getErrorMessage } from "@/lib/errors.js";
import { formatIncidentAffectedPlants, getIncidentTitle, getIncidentTypeLabel, isIncidentActive, isIncidentInProgress } from "@/lib/incidents.js";

const TYPES = ["pest","disease","environmental","structural","other"];
const SEVERITIES = ["low","medium","high","critical"];
const AFFECTED_SCOPE_OPTIONS = [
  { value: "count", label: "Specific count" },
  { value: "all", label: "All plants" },
  { value: "none", label: "Not plant-related" },
];

const createDefaultForm = () => ({
  greenhouse_id: "",
  cycle_id: "",
  date: new Date().toISOString().slice(0, 10),
  incident_type: "pest",
  name: "",
  severity: "medium",
  affected_scope: "count",
  affected_plants: "",
  description: "",
  status: "open",
});

const getIssuePlaceholder = (incidentType) => ({
  pest: "e.g. Aphids on House A",
  disease: "e.g. Powdery mildew on tomatoes",
  environmental: "e.g. Heat stress after ventilation failure",
  structural: "e.g. Wind damage to greenhouse roof",
  other: "e.g. Irrigation line failure",
}[incidentType] || "Describe the issue");

const getAffectedPlantsHint = (affectedScope) => ({
  count: "Enter a rough count when only part of the crop is affected.",
  all: "Use this when the whole crop in the greenhouse was affected.",
  none: "Use this for house damage or other incidents that did not directly affect plants.",
}[affectedScope] || "");

export default function Incidents() {
  const [records, setRecords] = useState([]);
  const [greenhouses, setGreenhouses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [form, setForm] = useState(createDefaultForm);
  const [saving, setSaving] = useState(false);
  const [deleteItem, setDeleteItem] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [error, setError] = useState("");

  const load = async () => {
    try {
      setLoading(true);
      const [inc, gh] = await Promise.all([
        base44.entities.Incident.list("-date", 200),
        base44.entities.Greenhouse.list("code"),
      ]);
      setRecords(inc);
      setGreenhouses(gh);
      setLoadError("");
    } catch (err) {
      setLoadError(getErrorMessage(err, "Failed to load incidents."));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const ghMap = Object.fromEntries(greenhouses.map(g => [g.id, g]));
  const activeIncidentsCount = records.filter((record) => isIncidentActive(record.status)).length;

  const openCreateModal = () => {
    setEditItem(null);
    setForm(createDefaultForm());
    setError("");
    setShowModal(true);
  };

  const openEditModal = (incident) => {
    setEditItem(incident);
    setForm({
      ...createDefaultForm(),
      ...incident,
      cycle_id: incident.cycle_id || "",
      affected_scope: incident.affected_scope || (Number(incident.affected_plants) > 0 ? "count" : "none"),
      affected_plants: incident.affected_plants != null ? String(incident.affected_plants) : "",
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

  const handleSave = async () => {
    setSaving(true);
    setError("");
    try {
      const affectedPlantsCount = Number.parseInt(form.affected_plants, 10);
      const payload = {
        ...form,
        affected_scope: form.affected_scope,
        affected_plants:
          form.affected_scope === "count" && Number.isFinite(affectedPlantsCount) && affectedPlantsCount > 0
            ? affectedPlantsCount
            : null,
        cycle_id: form.cycle_id || null,
      };

      if (editItem) {
        await base44.entities.Incident.update(editItem.id, payload);
      } else {
        await base44.entities.Incident.create(payload);
      }

      closeModal();
      await load();
    } catch (err) {
      setError(getErrorMessage(err, "Failed to save incident."));
    } finally {
      setSaving(false);
    }
  };

  const updateStatus = async (incident, status) => {
    try {
      await base44.entities.Incident.update(incident.id, { status });
      load();
    } catch (err) {
      setLoadError(getErrorMessage(err, "Failed to update incident status."));
    }
  };

  const handleDelete = async () => {
    if (!deleteItem) return;
    setDeleting(true);
    try {
      await base44.entities.Incident.delete(deleteItem.id);
      setDeleteItem(null);
      if (editItem?.id === deleteItem.id) {
        closeModal();
      }
      await load();
    } catch (err) {
      setLoadError(getErrorMessage(err, "Failed to delete incident."));
    } finally {
      setDeleting(false);
    }
  };

  const columns = [
    { key: "date", label: "Date" },
    { key: "greenhouse_id", label: "Greenhouse", render: v => ghMap[v]?.code ?? "—" },
    { key: "incident_type", label: "Type", render: v => getIncidentTypeLabel(v) },
    { key: "name", label: "Issue", render: (_, row) => getIncidentTitle(row) },
    { key: "severity", label: "Severity", render: v => <StatusBadge status={v} /> },
    { key: "affected_plants", label: "Affected", render: (_, row) => formatIncidentAffectedPlants(row) || "—" },
    { key: "status", label: "Status", render: v => <StatusBadge status={v} /> },
    {
      key: "id", label: "Actions",
      render: (_, row) => (
        <div className="flex flex-wrap gap-1.5">
          <button onClick={() => openEditModal(row)} className="inline-flex items-center gap-1 text-xs text-foreground hover:underline">
            <Pencil className="w-3 h-3" /> Edit
          </button>
          <button onClick={() => setDeleteItem(row)} className="inline-flex items-center gap-1 text-xs text-danger hover:underline">
            <Trash2 className="w-3 h-3" /> Delete
          </button>
          {row.status !== "resolved" && !isIncidentInProgress(row.status) ? (
            <button onClick={() => updateStatus(row, "in_progress")} className="text-xs text-warning hover:underline">Start response</button>
          ) : null}
          {row.status !== "resolved" && row.status !== "monitoring" ? (
            <button onClick={() => updateStatus(row, "monitoring")} className="text-xs text-primary hover:underline">Monitoring</button>
          ) : null}
          {row.status !== "resolved" ? (
            <button onClick={() => updateStatus(row, "resolved")} className="text-xs text-success hover:underline">Resolve</button>
          ) : null}
        </div>
      )
    },
  ];

  return (
    <div className="p-4 md:p-6">
      <PageHeader
        title="Incident Log"
        subtitle={`${activeIncidentsCount} active incidents`}
        actions={
          <Button size="sm" onClick={openCreateModal} className="gap-1.5">
            <Plus className="w-4 h-4" /> Log Incident
          </Button>
        }
      />

      <ErrorBanner message={loadError} onRetry={load} />

      {!loading && records.length === 0 ? (
        <EmptyState
          icon={AlertTriangle}
          title="No incidents logged"
          description="Log pest issues, disease outbreaks, structural damage, or other greenhouse incidents."
          action={<Button onClick={openCreateModal}><Plus className="w-4 h-4 mr-1" />Log Incident</Button>}
        />
      ) : (
        <DataTable columns={columns} data={records} loading={loading} />
      )}

      <Modal open={showModal} onClose={closeModal} title={editItem ? "Edit Incident" : "Log Incident"}>
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField label="Greenhouse" required>
              <Select value={form.greenhouse_id} onValueChange={v => setForm(f => ({ ...f, greenhouse_id: v, cycle_id: "" }))}>
                <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent>{greenhouses.map(g => <SelectItem key={g.id} value={g.id}>{g.code}</SelectItem>)}</SelectContent>
              </Select>
            </FormField>
            <FormField label="Date" required>
              <Input type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} />
            </FormField>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField label="Incident Type" required>
              <Select value={form.incident_type} onValueChange={v => setForm(f => ({ ...f, incident_type: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{TYPES.map(t => <SelectItem key={t} value={t}>{getIncidentTypeLabel(t)}</SelectItem>)}</SelectContent>
              </Select>
            </FormField>
            <FormField label="Severity" required>
              <Select value={form.severity} onValueChange={v => setForm(f => ({ ...f, severity: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{SEVERITIES.map(s => <SelectItem key={s} value={s} className="capitalize">{s}</SelectItem>)}</SelectContent>
              </Select>
            </FormField>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField label="Issue Name">
              <Input
                value={form.name}
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                placeholder={getIssuePlaceholder(form.incident_type)}
              />
            </FormField>
            <FormField label="Affected Plants">
              <div className="space-y-2">
                <Select value={form.affected_scope} onValueChange={v => setForm(f => ({ ...f, affected_scope: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {AFFECTED_SCOPE_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {form.affected_scope === "count" ? (
                  <Input
                    type="number"
                    min="1"
                    step="1"
                    value={form.affected_plants}
                    onChange={e => setForm(f => ({ ...f, affected_plants: e.target.value }))}
                    placeholder="Enter affected plant count"
                  />
                ) : null}
                <p className="text-xs text-muted-foreground">{getAffectedPlantsHint(form.affected_scope)}</p>
              </div>
            </FormField>
          </div>
          <FormField label="Description">
            <Textarea
              value={form.description}
              onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
              placeholder="Describe what happened, what was damaged, and any follow-up needed."
              className="h-20 resize-none"
            />
          </FormField>
          {error ? <div className="bg-danger/10 text-danger text-sm rounded-lg px-4 py-2">{error}</div> : null}
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={closeModal}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving || !form.greenhouse_id || !form.incident_type}>
              {saving ? "Saving…" : editItem ? "Save Changes" : "Log Incident"}
            </Button>
          </div>
        </div>
      </Modal>

      <DeleteConfirmDialog
        open={!!deleteItem}
        onOpenChange={(open) => {
          if (!open) setDeleteItem(null);
        }}
        title="Delete this incident?"
        description="This incident record will be removed from the log. This action cannot be undone."
        confirmLabel="Delete Incident"
        loading={deleting}
        onConfirm={handleDelete}
      />
    </div>
  );
}
