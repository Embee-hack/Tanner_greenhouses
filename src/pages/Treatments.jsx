import { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { useLocation, useNavigate } from "react-router-dom";
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Plus, FlaskConical, Pencil, Trash2, MoreHorizontal, Eye } from "lucide-react";
import { getCreatedByText } from "@/lib/createdBy.js";
import { getErrorMessage } from "@/lib/errors.js";
import { getIncidentTitle } from "@/lib/incidents.js";
import { cn } from "@/lib/utils";
import { createPageUrl } from "@/utils";

const TYPES = ["chemical", "biological", "physical", "repair", "inspection", "preventive", "cultural", "other"];
const OUTCOMES = ["pending", "effective", "partial", "ineffective"];
const TARGET_MODES = [
  { value: "single", label: "One house", description: "Link the response to one greenhouse." },
  { value: "selected", label: "Selected houses", description: "Pick multiple houses from a checklist." },
  { value: "all_active", label: "All active houses", description: "Apply this routine response across active production houses." },
];
const EDIT_SCOPES = [
  { value: "single_house", label: "This house only", description: "Only update the selected greenhouse response record." },
  { value: "all_houses", label: "All affected houses", description: "Update the shared response details across the full house group." },
];
const NO_INCIDENT_VALUE = "__none__";

const createDefaultForm = () => ({
  greenhouse_id: "",
  incident_id: "",
  date: new Date().toISOString().slice(0, 10),
  treatment_type: "chemical",
  chemical_name: "",
  dose: "",
  applicator: "",
  notes: "",
  outcome: "pending",
});

const RESPONSE_TYPE_LABELS = {
  chemical: "Chemical",
  biological: "Biological",
  physical: "Physical",
  repair: "Repair",
  inspection: "Inspection",
  preventive: "Preventive",
  cultural: "Cultural",
  other: "Other",
};

const humanizeValue = (value) =>
  String(value || "")
    .trim()
    .replace(/_/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());

const getResponseTypeLabel = (value) => RESPONSE_TYPE_LABELS[String(value || "").trim().toLowerCase()] || humanizeValue(value) || "Response";

const generateResponseGroupId = () =>
  globalThis.crypto?.randomUUID?.() || `response-group-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;

const sortByGreenhouseCode = (rows, ghMap) =>
  [...rows].sort((a, b) => String(ghMap[a.greenhouse_id]?.code || "").localeCompare(String(ghMap[b.greenhouse_id]?.code || "")));

const truncateText = (value, maxLength = 110) => {
  const text = String(value || "").trim();
  if (!text) return "";
  return text.length > maxLength ? `${text.slice(0, maxLength - 1)}…` : text;
};

const getResponseTitle = (response) => {
  const materialOrAction = String(response?.chemical_name || "").trim();
  if (materialOrAction) return materialOrAction;
  return `${getResponseTypeLabel(response?.treatment_type)} response`;
};

const getResponsePreview = (response, incidentMap) => {
  const pieces = [];
  const incident = incidentMap[response?.incident_id];
  const incidentTitle = incident ? getIncidentTitle(incident) : "";
  const rateOrAmount = String(response?.dose || "").trim();
  const handledBy = String(response?.applicator || "").trim();

  if (incidentTitle) pieces.push(`Incident: ${incidentTitle}`);
  if (rateOrAmount) pieces.push(rateOrAmount);
  if (handledBy) pieces.push(handledBy);
  if (pieces.length > 0) return pieces.join(" • ");

  return truncateText(response?.notes);
};

const SORT_MODES = [
  { value: "response_date", label: "Response date: newest first" },
  { value: "logged_date", label: "Date logged: newest first" },
];

const getResponseSortValue = (record, sortMode) => {
  if (sortMode === "logged_date") {
    return String(record?.created_date || record?.updated_date || record?.date || "");
  }

  return String(record?.date || record?.created_date || record?.updated_date || "");
};

export default function Treatments() {
  const location = useLocation();
  const navigate = useNavigate();
  const [records, setRecords] = useState([]);
  const [greenhouses, setGreenhouses] = useState([]);
  const [incidents, setIncidents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [detailItem, setDetailItem] = useState(null);
  const [editItem, setEditItem] = useState(null);
  const [form, setForm] = useState(createDefaultForm);
  const [sortMode, setSortMode] = useState("response_date");
  const [targetMode, setTargetMode] = useState("single");
  const [selectedGreenhouseIds, setSelectedGreenhouseIds] = useState([]);
  const [editScope, setEditScope] = useState("single_house");
  const [saving, setSaving] = useState(false);
  const [deleteItem, setDeleteItem] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState("");
  const [loadError, setLoadError] = useState("");
  const [linkedIncidentPreset, setLinkedIncidentPreset] = useState(null);

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

  useEffect(() => {
    load();
  }, []);

  const ghMap = Object.fromEntries(greenhouses.map((greenhouse) => [greenhouse.id, greenhouse]));
  const incidentMap = Object.fromEntries(incidents.map((incident) => [incident.id, incident]));
  const activeGreenhouses = greenhouses.filter((greenhouse) => greenhouse.status === "active");
  const sortedRecords = [...records].sort((a, b) => getResponseSortValue(b, sortMode).localeCompare(getResponseSortValue(a, sortMode)));
  const groupedPresetGreenhouseIds = linkedIncidentPreset?.mode === "group" ? linkedIncidentPreset.greenhouseIds || [] : [];
  const selectableGreenhouses = linkedIncidentPreset?.mode === "group"
    ? greenhouses.filter((greenhouse) => groupedPresetGreenhouseIds.includes(greenhouse.id))
    : greenhouses;
  const targetGreenhouseIds = editItem
    ? (form.greenhouse_id ? [form.greenhouse_id] : [])
    : targetMode === "single"
      ? (form.greenhouse_id ? [form.greenhouse_id] : [])
      : targetMode === "selected"
        ? selectedGreenhouseIds
        : activeGreenhouses.map((greenhouse) => greenhouse.id);
  const selectableGreenhouseIds = selectableGreenhouses.map((greenhouse) => greenhouse.id);
  const allSelectableChecked = selectableGreenhouseIds.length > 0 && selectedGreenhouseIds.length === selectableGreenhouseIds.length;
  const hasSomeSelectableChecked = selectedGreenhouseIds.length > 0 && selectedGreenhouseIds.length < selectableGreenhouseIds.length;
  const openIncidents = targetGreenhouseIds.length === 1
    ? incidents.filter((incident) => incident.greenhouse_id === targetGreenhouseIds[0] && incident.status !== "resolved")
    : [];
  const groupedResponses = detailItem?.shared_response_id
    ? sortByGreenhouseCode(records.filter((record) => record.shared_response_id === detailItem.shared_response_id), ghMap)
    : detailItem ? [detailItem] : [];
  const editableResponseGroup = editItem?.shared_response_id
    ? sortByGreenhouseCode(records.filter((record) => record.shared_response_id === editItem.shared_response_id), ghMap)
    : editItem ? [editItem] : [];
  const isSharedEdit = !!editItem && editableResponseGroup.length > 1;
  const detailIncident = detailItem?.incident_id ? incidentMap[detailItem.incident_id] : null;
  const saveLabel = editItem
    ? isSharedEdit && editScope === "all_houses"
      ? `Save to ${editableResponseGroup.length} Houses`
      : "Save Changes"
    : targetGreenhouseIds.length <= 1
      ? "Log Response"
      : `Log for ${targetGreenhouseIds.length} Houses`;

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const incidentGroupId = params.get("incidentGroup");
    const incidentId = params.get("incident");
    const responseId = params.get("response");

    if (responseId && !editItem && records.length > 0) {
      const response = records.find((item) => item.id === responseId);
      if (response) {
        setDetailItem(response);
        navigate(createPageUrl("Treatments"), { replace: true });
      }
      return;
    }

    if (editItem || incidents.length === 0 || (!incidentGroupId && !incidentId)) return;

    if (incidentGroupId) {
      const groupedIncidentRecords = sortByGreenhouseCode(
        incidents.filter((incident) => incident.shared_incident_id === incidentGroupId),
        ghMap
      );

      if (groupedIncidentRecords.length > 0) {
        const greenhouseIds = groupedIncidentRecords.map((incident) => incident.greenhouse_id).filter(Boolean);
        const incidentIdsByGreenhouse = Object.fromEntries(
          groupedIncidentRecords
            .filter((incident) => incident.greenhouse_id)
            .map((incident) => [incident.greenhouse_id, incident.id])
        );

        setLinkedIncidentPreset({
          mode: "group",
          sharedIncidentId: incidentGroupId,
          title: getIncidentTitle(groupedIncidentRecords[0]),
          greenhouseIds,
          incidentIdsByGreenhouse,
        });
        setForm({
          ...createDefaultForm(),
          date: new Date().toISOString().slice(0, 10),
          greenhouse_id: greenhouseIds[0] || "",
        });
        setTargetMode("selected");
        setSelectedGreenhouseIds(greenhouseIds);
        setEditScope("single_house");
        setError("");
        setShowModal(true);
        navigate(createPageUrl("Treatments"), { replace: true });
        return;
      }
    }

    if (incidentId) {
      const incident = incidents.find((item) => item.id === incidentId);
      if (incident) {
        setLinkedIncidentPreset({
          mode: "single",
          incidentId: incident.id,
          title: getIncidentTitle(incident),
        });
        setForm({
          ...createDefaultForm(),
          date: new Date().toISOString().slice(0, 10),
          greenhouse_id: incident.greenhouse_id || "",
          incident_id: incident.id,
        });
        setTargetMode("single");
        setSelectedGreenhouseIds([]);
        setEditScope("single_house");
        setError("");
        setShowModal(true);
        navigate(createPageUrl("Treatments"), { replace: true });
      }
    }
  }, [editItem, ghMap, incidents, location.search, navigate, records]);

  const openCreateModal = () => {
    setDetailItem(null);
    setEditItem(null);
    setLinkedIncidentPreset(null);
    setForm(createDefaultForm());
    setTargetMode("single");
    setSelectedGreenhouseIds([]);
    setEditScope("single_house");
    setError("");
    setShowModal(true);
  };

  const openEditModal = (record, scope = "single_house") => {
    setDetailItem(null);
    setEditItem(record);
    setLinkedIncidentPreset(null);
    setForm({
      ...createDefaultForm(),
      ...record,
      greenhouse_id: record.greenhouse_id || "",
      incident_id: record.incident_id || "",
      outcome: record.outcome || "pending",
    });
    setTargetMode("single");
    setSelectedGreenhouseIds([]);
    setEditScope(scope);
    setError("");
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditItem(null);
    setLinkedIncidentPreset(null);
    setForm(createDefaultForm());
    setTargetMode("single");
    setSelectedGreenhouseIds([]);
    setEditScope("single_house");
    setError("");
  };

  const updateTargetMode = (mode) => {
    if (linkedIncidentPreset?.mode === "group" && mode === targetMode) {
      return;
    }

    if (linkedIncidentPreset?.mode === "group" && mode !== "selected") {
      setLinkedIncidentPreset(null);
    }

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
    setSelectedGreenhouseIds(checked ? selectableGreenhouseIds : []);
    setForm((current) => ({
      ...current,
      incident_id: "",
    }));
  };

  const selectActiveGreenhouses = () => {
    setSelectedGreenhouseIds(
      linkedIncidentPreset?.mode === "group"
        ? groupedPresetGreenhouseIds
        : activeGreenhouses.map((greenhouse) => greenhouse.id)
    );
    setForm((current) => ({
      ...current,
      incident_id: "",
    }));
  };

  const buildResponsePayload = ({ greenhouseId, incidentId, outcome = form.outcome }) => ({
    ...form,
    greenhouse_id: greenhouseId,
    incident_id: incidentId || null,
    outcome,
  });

  const handleSave = async () => {
    setSaving(true);
    setError("");
    try {
      if (editItem) {
        if (isSharedEdit && editScope === "all_houses") {
          await Promise.all(
            editableResponseGroup.map((record) =>
              base44.entities.Treatment.update(record.id, {
                ...buildResponsePayload({
                  greenhouseId: record.greenhouse_id,
                  incidentId: record.incident_id || null,
                  outcome: record.outcome || "pending",
                }),
                shared_response_id: record.shared_response_id || editItem.shared_response_id || null,
                application_scope: record.application_scope || "selected",
              })
            )
          );
        } else {
          await base44.entities.Treatment.update(editItem.id, {
            ...buildResponsePayload({
              greenhouseId: form.greenhouse_id,
              incidentId: form.incident_id || null,
            }),
            shared_response_id: editItem.shared_response_id || null,
            application_scope: editItem.application_scope || "single",
          });
        }
      } else {
        if (targetGreenhouseIds.length === 0) {
          setError(targetMode === "all_active" ? "There are no active houses to apply this response to." : "Select at least one greenhouse.");
          setSaving(false);
          return;
        }

        const sharedResponseId = targetGreenhouseIds.length > 1 ? generateResponseGroupId() : null;
        await Promise.all(
          targetGreenhouseIds.map((greenhouseId) =>
            base44.entities.Treatment.create({
              ...buildResponsePayload({
                greenhouseId,
                incidentId:
                  linkedIncidentPreset?.mode === "group"
                    ? linkedIncidentPreset.incidentIdsByGreenhouse?.[greenhouseId] || null
                    : targetGreenhouseIds.length === 1
                      ? form.incident_id || null
                      : null,
              }),
              shared_response_id: sharedResponseId,
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
      if (detailItem?.id === deleteItem.id) {
        setDetailItem(null);
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
    { key: "greenhouse_id", label: "Greenhouse", render: (value) => ghMap[value]?.code ?? "—" },
    { key: "treatment_type", label: "Response Type", render: (value) => getResponseTypeLabel(value) },
    {
      key: "chemical_name",
      label: "Action",
      render: (_, row) => {
        const sharedCount = row.shared_response_id
          ? records.filter((record) => record.shared_response_id === row.shared_response_id).length
          : 0;

        return (
          <div className="min-w-0 max-w-[340px] whitespace-normal">
            <div className="font-medium text-foreground">{getResponseTitle(row)}</div>
            {getResponsePreview(row, incidentMap) ? (
              <div className="text-xs text-muted-foreground mt-0.5">{getResponsePreview(row, incidentMap)}</div>
            ) : null}
            <div className="text-xs text-muted-foreground mt-1">{getCreatedByText(row)}</div>
            {sharedCount > 1 ? (
              <div className="text-xs text-primary mt-1">Shared across {sharedCount} houses</div>
            ) : null}
          </div>
        );
      },
    },
    { key: "applicator", label: "Handled By", render: (value) => value || "—" },
    { key: "outcome", label: "Result", render: (value) => <StatusBadge status={value} /> },
    {
      key: "id",
      label: "Actions",
      render: (_, row) => {
        const sharedCount = row.shared_response_id
          ? records.filter((record) => record.shared_response_id === row.shared_response_id).length
          : 0;

        return (
          <div className="flex justify-end" onClick={(event) => event.stopPropagation()}>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  onClick={(event) => event.stopPropagation()}
                  className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-border text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                  aria-label="Open response actions"
                >
                  <MoreHorizontal className="w-4 h-4" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => setDetailItem(row)}>
                  <Eye className="w-4 h-4" /> View details
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => openEditModal(row)}>
                  <Pencil className="w-4 h-4" /> Edit response
                </DropdownMenuItem>
                {sharedCount > 1 ? (
                  <DropdownMenuItem onClick={() => openEditModal(row, "all_houses")}>
                    <Pencil className="w-4 h-4" /> Edit all affected houses
                  </DropdownMenuItem>
                ) : null}
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => setDeleteItem(row)} className="text-danger focus:text-danger">
                  <Trash2 className="w-4 h-4" /> Delete response
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        );
      },
    },
  ];

  return (
    <div className="p-4 md:p-6">
      <PageHeader
        title="Response Log"
        subtitle={`${records.length} responses logged`}
        actions={
          <>
            <div className="min-w-[230px]">
              <Select value={sortMode} onValueChange={setSortMode}>
                <SelectTrigger aria-label="Sort response log">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SORT_MODES.map((mode) => (
                    <SelectItem key={mode.value} value={mode.value}>{mode.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button size="sm" onClick={openCreateModal} className="gap-1.5">
              <Plus className="w-4 h-4" /> Log Response
            </Button>
          </>
        }
      />

      <ErrorBanner message={loadError} onRetry={load} />

      {!loading && records.length === 0 ? (
        <EmptyState
          icon={FlaskConical}
          title="No responses logged"
          description="Log corrective, preventive, inspection, or repair responses for one or more greenhouses."
          action={<Button onClick={openCreateModal}><Plus className="w-4 h-4 mr-1" />Log Response</Button>}
        />
      ) : (
        <DataTable columns={columns} data={sortedRecords} loading={loading} onRowClick={setDetailItem} />
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

          {isSharedEdit ? (
            <FormField label="Update Scope" required>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {EDIT_SCOPES.map((scope) => (
                  <button
                    key={scope.value}
                    type="button"
                    onClick={() => setEditScope(scope.value)}
                    className={cn(
                      "rounded-xl border px-3 py-3 text-left transition-colors",
                      editScope === scope.value
                        ? "border-primary bg-primary/5 ring-1 ring-primary/20"
                        : "border-border bg-card hover:bg-muted/40"
                    )}
                  >
                    <div className="text-sm font-semibold text-foreground">{scope.label}</div>
                    <div className="text-xs text-muted-foreground mt-1">{scope.description}</div>
                  </button>
                ))}
              </div>
              {editScope === "all_houses" ? (
                <p className="text-xs text-muted-foreground mt-2">
                  Shared response details will be updated for {editableResponseGroup.map((record) => ghMap[record.greenhouse_id]?.code).filter(Boolean).join(", ")}.
                </p>
              ) : null}
            </FormField>
          ) : null}

          {editItem || targetMode === "single" ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField label={editItem && editScope === "all_houses" ? "Reference House" : "Greenhouse"} required>
                <Select
                  value={form.greenhouse_id}
                  onValueChange={(value) => setForm((current) => ({ ...current, greenhouse_id: value, incident_id: "" }))}
                  disabled={!!editItem && editScope === "all_houses"}
                >
                  <SelectTrigger><SelectValue placeholder="Select greenhouse" /></SelectTrigger>
                  <SelectContent>{greenhouses.map((greenhouse) => <SelectItem key={greenhouse.id} value={greenhouse.id}>{greenhouse.code}</SelectItem>)}</SelectContent>
                </Select>
              </FormField>
              <FormField label="Date" required>
                <Input type="date" value={form.date} onChange={(event) => setForm((current) => ({ ...current, date: event.target.value }))} />
              </FormField>
            </div>
          ) : (
            <FormField label="Date" required>
              <Input type="date" value={form.date} onChange={(event) => setForm((current) => ({ ...current, date: event.target.value }))} />
            </FormField>
          )}

          {!editItem && targetMode === "selected" ? (
            <FormField label="Select Houses" required>
              <div className="rounded-xl border border-border">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border px-3 py-2">
                  <label className="flex items-center gap-2 text-sm font-medium text-foreground">
                    <Checkbox
                      checked={allSelectableChecked ? true : hasSomeSelectableChecked ? "indeterminate" : false}
                      onCheckedChange={(checked) => toggleSelectAllGreenhouses(checked === true)}
                      aria-label="Select all greenhouses"
                    />
                    {linkedIncidentPreset?.mode === "group" ? "All affected houses" : "All houses"}
                  </label>
                  <div className="flex items-center gap-2">
                    {linkedIncidentPreset?.mode === "group" ? (
                      <Button type="button" variant="outline" size="sm" onClick={() => toggleSelectAllGreenhouses(true)}>
                        All affected houses
                      </Button>
                    ) : (
                      <Button type="button" variant="outline" size="sm" onClick={selectActiveGreenhouses}>
                        Active only
                      </Button>
                    )}
                    <Button type="button" variant="ghost" size="sm" onClick={() => toggleSelectAllGreenhouses(false)}>
                      Clear
                    </Button>
                  </div>
                </div>
                {selectableGreenhouses.length === 0 ? (
                  <div className="px-3 py-6 text-sm text-muted-foreground text-center">No greenhouses available yet.</div>
                ) : (
                  <div className="max-h-56 overflow-y-auto divide-y divide-border/60">
                    {selectableGreenhouses.map((greenhouse) => (
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

          {!editItem && targetMode === "all_active" ? (
            <div className="rounded-xl border border-primary/20 bg-primary/5 px-4 py-3">
              <p className="text-sm font-medium text-foreground">
                This will create a linked response record for {activeGreenhouses.length} active {activeGreenhouses.length === 1 ? "house" : "houses"}.
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Each affected house will still keep its own result so the team can track effectiveness per greenhouse.
              </p>
            </div>
          ) : null}

          {!editItem && linkedIncidentPreset?.mode === "group" ? (
            <FormField label="Related Incident Group">
              <div className="rounded-xl border border-primary/20 bg-primary/5 px-4 py-3">
                <p className="text-sm font-medium text-foreground">
                  This response will be linked to the grouped incident: {linkedIncidentPreset.title}.
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Each selected house will be connected to its matching incident record automatically.
                </p>
              </div>
            </FormField>
          ) : null}

          {editItem && editScope === "all_houses" ? (
            <FormField label="Related Incident">
              <div className="rounded-xl border border-border bg-muted/20 px-4 py-3 text-sm text-muted-foreground">
                Related incident links stay house-specific during a shared update. Edit one house at a time if you need to change the linked incident.
              </div>
            </FormField>
          ) : !linkedIncidentPreset || linkedIncidentPreset.mode !== "group" ? (
            <FormField label="Related Incident (optional)">
              <Select
                value={form.incident_id || NO_INCIDENT_VALUE}
                onValueChange={(value) => setForm((current) => ({ ...current, incident_id: value === NO_INCIDENT_VALUE ? "" : value }))}
                disabled={targetGreenhouseIds.length !== 1}
              >
                <SelectTrigger><SelectValue placeholder={targetGreenhouseIds.length === 1 ? "None" : "Available for single-house responses only"} /></SelectTrigger>
                <SelectContent>
                  <SelectItem value={NO_INCIDENT_VALUE}>None</SelectItem>
                  {openIncidents.map((incident) => (
                    <SelectItem key={incident.id} value={incident.id}>
                      {getIncidentTitle(incident)} ({incident.date})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground mt-1">
                {targetGreenhouseIds.length === 1
                  ? "Incident linking is available when one house is targeted."
                  : "Related incident is only available for a single-house response log."}
              </p>
            </FormField>
          ) : null}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField label="Response Type" required>
              <Select value={form.treatment_type} onValueChange={(value) => setForm((current) => ({ ...current, treatment_type: value }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{TYPES.map((type) => <SelectItem key={type} value={type}>{getResponseTypeLabel(type)}</SelectItem>)}</SelectContent>
              </Select>
            </FormField>
            {editItem && editScope === "all_houses" ? (
              <FormField label="Current Result">
                <div className="rounded-xl border border-border bg-muted/20 px-4 py-3 text-sm text-muted-foreground">
                  Result stays house-specific during shared updates. Edit an individual house record to change whether it was effective, partial, or still pending.
                </div>
              </FormField>
            ) : (
              <FormField label="Current Result">
                <Select value={form.outcome} onValueChange={(value) => setForm((current) => ({ ...current, outcome: value }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{OUTCOMES.map((outcome) => <SelectItem key={outcome} value={outcome} className="capitalize">{outcome}</SelectItem>)}</SelectContent>
                </Select>
              </FormField>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField label="Material / Action">
              <Input
                value={form.chemical_name}
                onChange={(event) => setForm((current) => ({ ...current, chemical_name: event.target.value }))}
                placeholder="e.g. Neem spray, roof repair, drainage cleanup"
              />
            </FormField>
            <FormField label="Rate / Amount">
              <Input
                value={form.dose}
                onChange={(event) => setForm((current) => ({ ...current, dose: event.target.value }))}
                placeholder="e.g. 2ml/L or 4 panels replaced"
              />
            </FormField>
          </div>

          <FormField label="Handled By">
            <Input
              value={form.applicator}
              onChange={(event) => setForm((current) => ({ ...current, applicator: event.target.value }))}
              placeholder="Person or team handling the response"
            />
          </FormField>

          <FormField label="Notes">
            <Textarea
              value={form.notes}
              onChange={(event) => setForm((current) => ({ ...current, notes: event.target.value }))}
              className="h-20 resize-none"
              placeholder="What was done, what was found, and any next-step notes."
            />
          </FormField>

          <div className="rounded-xl border border-border bg-muted/20 px-4 py-3">
            <p className="text-sm font-medium text-foreground">
              {editItem
                ? isSharedEdit && editScope === "all_houses"
                  ? `${editableResponseGroup.length} houses will be updated with these shared response details.`
                  : "This response record will be updated for one house."
                : targetGreenhouseIds.length === 0
                  ? linkedIncidentPreset?.mode === "group"
                    ? "No affected houses selected yet."
                    : "No target houses selected yet."
                  : `${targetGreenhouseIds.length} ${targetGreenhouseIds.length === 1 ? "house" : "houses"} will receive this response log.`}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              {editItem
                ? isSharedEdit && editScope === "all_houses"
                  ? "Result and incident link stay house-specific while the shared action details are updated across the group."
                  : "Shared multi-house responses can also be edited per house when outcomes start to differ."
                : "A separate response record will be created for each selected house so reporting stays greenhouse-specific."}
            </p>
          </div>

          {error ? <div className="bg-danger/10 text-danger text-sm rounded-lg px-4 py-2">{error}</div> : null}

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={closeModal}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving || targetGreenhouseIds.length === 0 || !form.treatment_type}>
              {saving ? "Saving…" : saveLabel}
            </Button>
          </div>
        </div>
      </Modal>

      <Modal open={!!detailItem} onClose={() => setDetailItem(null)} title="Response Details" size="lg">
        {detailItem ? (
          <div className="space-y-5">
            <div className="rounded-2xl border border-border bg-muted/20 p-4">
              <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                <div>
                  <div className="text-lg font-semibold text-foreground">{getResponseTitle(detailItem)}</div>
                  {getResponsePreview(detailItem, incidentMap) ? (
                    <div className="text-sm text-muted-foreground mt-1">{getResponsePreview(detailItem, incidentMap)}</div>
                  ) : null}
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <div className="inline-flex rounded-full border border-border px-3 py-1 text-sm font-medium text-foreground">
                    {getResponseTypeLabel(detailItem.treatment_type)}
                  </div>
                  <StatusBadge status={detailItem.outcome || "pending"} />
                </div>
              </div>
            </div>

            {groupedResponses.length > 1 ? (
              <div className="rounded-xl border border-primary/20 bg-primary/5 p-4">
                <div className="text-sm font-semibold text-foreground">
                  Shared response affecting {groupedResponses.length} houses
                </div>
                <div className="text-xs text-muted-foreground mt-1">
                  This same response was logged against multiple greenhouses. Each house keeps its own result so follow-up can reflect actual conditions on the ground.
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mt-4">
                  {groupedResponses.map((record) => (
                    <div key={record.id} className="rounded-lg border border-border bg-card px-3 py-3 flex items-center justify-between gap-3">
                      <div>
                        <div className="text-sm font-medium text-foreground">
                          {ghMap[record.greenhouse_id]?.code || "Unknown house"}
                          {record.id === detailItem.id ? " (current)" : ""}
                        </div>
                        <div className="text-xs text-muted-foreground mt-0.5">
                          {truncateText(record.dose || record.notes, 70) || "No extra note"}
                        </div>
                      </div>
                      <StatusBadge status={record.outcome || "pending"} />
                    </div>
                  ))}
                </div>
              </div>
            ) : null}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="rounded-xl border border-border p-4">
                <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Greenhouse</div>
                <div className="mt-1 text-sm font-medium text-foreground">{ghMap[detailItem.greenhouse_id]?.code ?? "—"}</div>
              </div>
              <div className="rounded-xl border border-border p-4">
                <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Response Date</div>
                <div className="mt-1 text-sm font-medium text-foreground">{detailItem.date || "—"}</div>
              </div>
              <div className="rounded-xl border border-border p-4">
                <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Response Type</div>
                <div className="mt-1 text-sm font-medium text-foreground">{getResponseTypeLabel(detailItem.treatment_type)}</div>
              </div>
              <div className="rounded-xl border border-border p-4">
                <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Logged On</div>
                <div className="mt-1 text-sm font-medium text-foreground">
                  {detailItem.created_date ? new Date(detailItem.created_date).toLocaleString() : "—"}
                </div>
              </div>
              <div className="rounded-xl border border-border p-4">
                <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Current Result</div>
                <div className="mt-1"><StatusBadge status={detailItem.outcome || "pending"} size="md" /></div>
              </div>
              <div className="rounded-xl border border-border p-4">
                <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Material / Action</div>
                <div className="mt-1 text-sm font-medium text-foreground">{detailItem.chemical_name || "—"}</div>
              </div>
              <div className="rounded-xl border border-border p-4">
                <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Rate / Amount</div>
                <div className="mt-1 text-sm font-medium text-foreground">{detailItem.dose || "—"}</div>
              </div>
              <div className="rounded-xl border border-border p-4">
                <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Handled By</div>
                <div className="mt-1 text-sm font-medium text-foreground">{detailItem.applicator || "—"}</div>
              </div>
              <div className="rounded-xl border border-border p-4">
                <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Related Incident</div>
                <div className="mt-1 text-sm font-medium text-foreground">
                  {detailIncident ? `${getIncidentTitle(detailIncident)}${detailIncident.date ? ` (${detailIncident.date})` : ""}` : "No linked incident"}
                </div>
              </div>
            </div>

            <div className="rounded-xl border border-border p-4">
              <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Notes</div>
              <div className="mt-2 text-sm text-foreground whitespace-pre-wrap">
                {detailItem.notes || "No notes recorded for this response yet."}
              </div>
            </div>

            <div className="flex flex-wrap justify-end gap-2 pt-1">
              <Button
                variant="outline"
                onClick={() => {
                  const current = detailItem;
                  setDetailItem(null);
                  openEditModal(current);
                }}
              >
                Edit Response
              </Button>
              {groupedResponses.length > 1 ? (
                <Button
                  variant="outline"
                  onClick={() => {
                    const current = detailItem;
                    setDetailItem(null);
                    openEditModal(current, "all_houses");
                  }}
                >
                  Edit All Affected Houses
                </Button>
              ) : null}
            </div>
          </div>
        ) : null}
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
