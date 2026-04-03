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
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, FlaskConical, Pencil, Trash2 } from "lucide-react";
import { getErrorMessage } from "@/lib/errors.js";
import { getIncidentTitle } from "@/lib/incidents.js";
import { cn } from "@/lib/utils";

const TYPES = ["chemical","biological","physical","repair","inspection","preventive","cultural","other"];
const OUTCOMES = ["pending","effective","partial","ineffective"];
const TARGET_MODES = [
  { value: "single", label: "One house", description: "Link the response to one greenhouse." },
  { value: "selected", label: "Selected houses", description: "Pick multiple houses from a checklist." },
  { value: "all_active", label: "All active houses", description: "Apply this routine response across active production houses." },
];
const createDefaultForm = () => ({ greenhouse_id: "", incident_id: "", date: new Date().toISOString().slice(0, 10), treatment_type: "chemical", chemical_name: "", dose: "", applicator: "", notes: "", outcome: "pending" });
const NO_INCIDENT_VALUE = "__none__";

export default function Treatments() {
  const [records, setRecords] = useState([]);
  const [greenhouses, setGreenhouses] = useState([]);
  const [incidents, setIncidents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [form, setForm] = useState(createDefaultForm);
  const [targetMode, setTargetMode] = useState("single");
  const [selectedGreenhouseIds, setSelectedGreenhouseIds] = useState([]);
  const [saving, setSaving] = useState(false);
  const [deleteItem, setDeleteItem] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState("");
  const [loadError, setLoadError] = useState("");

  const load = async () => {
    try {
      setLoading(true);
      const [tr, gh, inc] = await Promise.all([
        base44.entities.Treatment.list("-date", 200),
        base44.entities.Greenhouse.list("code"),
        base44.entities.Incident.list("-date", 200),
      ]);
      setRecords(tr);
      setGreenhouses(gh);
      setIncidents(inc);
      setLoadError("");
    } catch (err) {
      setLoadError(getErrorMessage(err, "Failed to load response records."));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const ghMap = Object.fromEntries(greenhouses.map(g => [g.id, g]));
  const activeGreenhouses = greenhouses.filter((greenhouse) => greenhouse.status === "active");
  const targetGreenhouseIds = targetMode === "single"
    ? (form.greenhouse_id ? [form.greenhouse_id] : [])
    : targetMode === "selected"
      ? selectedGreenhouseIds
      : activeGreenhouses.map((greenhouse) => greenhouse.id);
  const incidentGreenhouseId = targetGreenhouseIds.length === 1 ? targetGreenhouseIds[0] : "";
  const openIncidents = incidents.filter((incident) => incident.greenhouse_id === incidentGreenhouseId && incident.status !== "resolved");
  const allSelectableChecked = greenhouses.length > 0 && selectedGreenhouseIds.length === greenhouses.length;
  const hasSomeSelectableChecked = selectedGreenhouseIds.length > 0 && selectedGreenhouseIds.length < greenhouses.length;
  const targetCount = targetGreenhouseIds.length;
  const saveLabel = editItem ? "Save Changes" : targetCount <= 1 ? "Log Response" : `Log for ${targetCount} Houses`;

  const openCreateModal = () => {
    setEditItem(null);
    setForm(createDefaultForm());
    setTargetMode("single");
    setSelectedGreenhouseIds([]);
    setError("");
    setShowModal(true);
  };

  const openEditModal = (record) => {
    setEditItem(record);
    setForm({
      ...createDefaultForm(),
      ...record,
      greenhouse_id: record.greenhouse_id || "",
      incident_id: record.incident_id || "",
    });
    setTargetMode("single");
    setSelectedGreenhouseIds([]);
    setError("");
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditItem(null);
    setForm(createDefaultForm());
    setTargetMode("single");
    setSelectedGreenhouseIds([]);
    setError("");
  };

  const updateTargetMode = (mode) => {
    setTargetMode(mode);
    setForm((current) => ({
      ...current,
      incident_id: "",
    }));
  };

  const toggleGreenhouse = (greenhouseId, checked) => {
    setSelectedGreenhouseIds((current) => {
      if (checked) {
        return current.includes(greenhouseId) ? current : [...current, greenhouseId];
      }
      return current.filter((id) => id !== greenhouseId);
    });
    setForm((current) => ({
      ...current,
      incident_id: "",
    }));
  };

  const toggleSelectAllGreenhouses = (checked) => {
    setSelectedGreenhouseIds(checked ? greenhouses.map((greenhouse) => greenhouse.id) : []);
    setForm((current) => ({
      ...current,
      incident_id: "",
    }));
  };

  const selectActiveGreenhouses = () => {
    setSelectedGreenhouseIds(activeGreenhouses.map((greenhouse) => greenhouse.id));
    setForm((current) => ({
      ...current,
      incident_id: "",
    }));
  };

  const handleSave = async () => {
    setSaving(true);
    setError("");
    try {
      if (targetGreenhouseIds.length === 0) {
        setError(targetMode === "all_active" ? "There are no active houses to apply this response to." : "Select at least one greenhouse.");
        setSaving(false);
        return;
      }

      if (editItem) {
        await base44.entities.Treatment.update(editItem.id, {
          ...form,
          greenhouse_id: form.greenhouse_id,
          incident_id: form.incident_id || null,
          application_scope: editItem.application_scope || "single",
        });
      } else {
        await Promise.all(
          targetGreenhouseIds.map((greenhouseId) =>
            base44.entities.Treatment.create({
              ...form,
              greenhouse_id: greenhouseId,
              incident_id: targetGreenhouseIds.length === 1 ? form.incident_id || null : null,
              application_scope: targetMode,
            })
          )
        );
      }

      closeModal();
      await load();
    } catch (err) {
      setError(getErrorMessage(err, "Failed to save response."));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteItem) return;
    setDeleting(true);
    try {
      await base44.entities.Treatment.delete(deleteItem.id);
      setDeleteItem(null);
      if (editItem?.id === deleteItem.id) {
        closeModal();
      }
      await load();
    } catch (err) {
      setLoadError(getErrorMessage(err, "Failed to delete response."));
    } finally {
      setDeleting(false);
    }
  };

  const columns = [
    { key: "date", label: "Date" },
    { key: "greenhouse_id", label: "Greenhouse", render: v => ghMap[v]?.code ?? "—" },
    { key: "treatment_type", label: "Response Type", render: v => <span className="capitalize">{v}</span> },
    { key: "chemical_name", label: "Material / Action", render: v => v || "—" },
    { key: "dose", label: "Rate / Amount", render: v => v || "—" },
    { key: "applicator", label: "Handled By", render: v => v || "—" },
    { key: "outcome", label: "Result", render: v => <StatusBadge status={v} /> },
    {
      key: "id",
      label: "Actions",
      render: (_, row) => (
        <div className="flex flex-wrap gap-1.5">
          <button onClick={() => openEditModal(row)} className="inline-flex items-center gap-1 text-xs text-foreground hover:underline">
            <Pencil className="w-3 h-3" /> Edit
          </button>
          <button onClick={() => setDeleteItem(row)} className="inline-flex items-center gap-1 text-xs text-danger hover:underline">
            <Trash2 className="w-3 h-3" /> Delete
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="p-4 md:p-6">
      <PageHeader
        title="Response Log"
        subtitle={`${records.length} responses logged`}
        actions={
          <Button size="sm" onClick={openCreateModal} className="gap-1.5">
            <Plus className="w-4 h-4" /> Log Response
          </Button>
        }
      />

      <ErrorBanner message={loadError} onRetry={load} />

      {!loading && records.length === 0 ? (
        <EmptyState icon={FlaskConical} title="No responses logged" description="Log corrective, preventive, or repair responses for one or more greenhouses." action={<Button onClick={openCreateModal}><Plus className="w-4 h-4 mr-1" />Log Response</Button>} />
      ) : (
        <DataTable columns={columns} data={records} loading={loading} />
      )}

      <Modal open={showModal} onClose={closeModal} title={editItem ? "Edit Response" : "Log Response"} size="lg">
        <div className="space-y-4">
          {!editItem ? (
            <FormField label="Applies To" required>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {TARGET_MODES.map((mode) => (
                  <button
                    key={mode.value}
                    type="button"
                    onClick={() => updateTargetMode(mode.value)}
                    className={cn(
                      "rounded-xl border px-3 py-3 text-left transition-colors",
                      targetMode === mode.value
                        ? "border-primary bg-primary/5 ring-1 ring-primary/20"
                        : "border-border bg-card hover:bg-muted/40"
                    )}
                  >
                    <div className="text-sm font-semibold text-foreground">{mode.label}</div>
                    <div className="text-xs text-muted-foreground mt-1">{mode.description}</div>
                  </button>
                ))}
              </div>
            </FormField>
          ) : null}

          {targetMode === "single" ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField label="Greenhouse" required>
                <Select value={form.greenhouse_id} onValueChange={v => setForm(f => ({ ...f, greenhouse_id: v, incident_id: "" }))}>
                  <SelectTrigger><SelectValue placeholder="Select greenhouse" /></SelectTrigger>
                  <SelectContent>{greenhouses.map(g => <SelectItem key={g.id} value={g.id}>{g.code}</SelectItem>)}</SelectContent>
                </Select>
              </FormField>
              <FormField label="Date" required>
                <Input type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} />
              </FormField>
            </div>
          ) : (
            <FormField label="Date" required>
              <Input type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} />
            </FormField>
          )}

          {targetMode === "selected" ? (
            <FormField label="Select Houses" required>
              <div className="rounded-xl border border-border">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border px-3 py-2">
                  <label className="flex items-center gap-2 text-sm font-medium text-foreground">
                    <Checkbox
                      checked={allSelectableChecked ? true : hasSomeSelectableChecked ? "indeterminate" : false}
                      onCheckedChange={(checked) => toggleSelectAllGreenhouses(checked === true)}
                      aria-label="Select all greenhouses"
                    />
                    All houses
                  </label>
                  <div className="flex items-center gap-2">
                    <Button type="button" variant="outline" size="sm" onClick={selectActiveGreenhouses}>
                      Active only
                    </Button>
                    <Button type="button" variant="ghost" size="sm" onClick={() => toggleSelectAllGreenhouses(false)}>
                      Clear
                    </Button>
                  </div>
                </div>
                {greenhouses.length === 0 ? (
                  <div className="px-3 py-6 text-sm text-muted-foreground text-center">No greenhouses available yet.</div>
                ) : (
                  <div className="max-h-56 overflow-y-auto divide-y divide-border/60">
                    {greenhouses.map((greenhouse) => (
                      <label key={greenhouse.id} className="flex items-center justify-between gap-3 px-3 py-2.5 cursor-pointer hover:bg-muted/40">
                        <div className="flex items-center gap-3 min-w-0">
                          <Checkbox
                            checked={selectedGreenhouseIds.includes(greenhouse.id)}
                            onCheckedChange={(checked) => toggleGreenhouse(greenhouse.id, checked === true)}
                            aria-label={`Select ${greenhouse.code}`}
                          />
                          <div className="min-w-0">
                            <div className="text-sm font-medium text-foreground">{greenhouse.code}</div>
                            <div className="text-xs text-muted-foreground capitalize">{greenhouse.status || "active"}</div>
                          </div>
                        </div>
                      </label>
                    ))}
                  </div>
                )}
              </div>
            </FormField>
          ) : null}

          {targetMode === "all_active" ? (
            <div className="rounded-xl border border-primary/20 bg-primary/5 px-4 py-3">
              <p className="text-sm font-medium text-foreground">
                This will create a response log for {activeGreenhouses.length} active {activeGreenhouses.length === 1 ? "house" : "houses"}.
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Use the checklist mode if you need a custom subset instead of every active house.
              </p>
            </div>
          ) : null}

          <FormField label="Related Incident (optional)">
            <Select
              value={form.incident_id || NO_INCIDENT_VALUE}
              onValueChange={(value) => setForm((f) => ({ ...f, incident_id: value === NO_INCIDENT_VALUE ? "" : value }))}
              disabled={targetGreenhouseIds.length !== 1}
            >
              <SelectTrigger><SelectValue placeholder={targetGreenhouseIds.length === 1 ? "None" : "Available for single-house responses only"} /></SelectTrigger>
              <SelectContent>
                <SelectItem value={NO_INCIDENT_VALUE}>None</SelectItem>
                {openIncidents.map(i => <SelectItem key={i.id} value={i.id}>{getIncidentTitle(i)} ({i.date})</SelectItem>)}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground mt-1">
              {targetGreenhouseIds.length === 1
                ? "Incident linking is available when one house is targeted."
                : "Related incident is only available for a single-house response log."}
            </p>
          </FormField>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField label="Response Type" required>
              <Select value={form.treatment_type} onValueChange={v => setForm(f => ({ ...f, treatment_type: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{TYPES.map(t => <SelectItem key={t} value={t} className="capitalize">{t}</SelectItem>)}</SelectContent>
              </Select>
            </FormField>
            <FormField label="Current Result">
              <Select value={form.outcome} onValueChange={v => setForm(f => ({ ...f, outcome: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{OUTCOMES.map(o => <SelectItem key={o} value={o} className="capitalize">{o}</SelectItem>)}</SelectContent>
              </Select>
            </FormField>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField label="Material / Action">
              <Input value={form.chemical_name} onChange={e => setForm(f => ({ ...f, chemical_name: e.target.value }))} placeholder="e.g. Neem spray, roof repair, drainage cleanup" />
            </FormField>
            <FormField label="Rate / Amount">
              <Input value={form.dose} onChange={e => setForm(f => ({ ...f, dose: e.target.value }))} placeholder="e.g. 2ml/L or 4 panels replaced" />
            </FormField>
          </div>
          <FormField label="Handled By">
            <Input value={form.applicator} onChange={e => setForm(f => ({ ...f, applicator: e.target.value }))} placeholder="Person or team handling the response" />
          </FormField>
          <FormField label="Notes">
            <Textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} className="h-16 resize-none" />
          </FormField>
          <div className="rounded-xl border border-border bg-muted/20 px-4 py-3">
            <p className="text-sm font-medium text-foreground">
              {editItem
                ? "This response record will be updated for one house."
                : targetCount === 0
                ? "No target houses selected yet."
                : `${targetCount} ${targetCount === 1 ? "house" : "houses"} will receive this response log.`}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              {editItem
                ? "Batch responses can be edited one record at a time so each greenhouse stays accurate."
                : "A separate response record will be created for each selected house so reporting stays greenhouse-specific."}
            </p>
          </div>
          {error ? <div className="bg-danger/10 text-danger text-sm rounded-lg px-4 py-2">{error}</div> : null}
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={closeModal}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving || targetCount === 0 || !form.treatment_type}>
              {saving ? "Saving…" : saveLabel}
            </Button>
          </div>
        </div>
      </Modal>

      <DeleteConfirmDialog
        open={!!deleteItem}
        onOpenChange={(open) => {
          if (!open) setDeleteItem(null);
        }}
        title="Delete this response?"
        description="This response log will be removed. This action cannot be undone."
        confirmLabel="Delete Response"
        loading={deleting}
        onConfirm={handleDelete}
      />
    </div>
  );
}
