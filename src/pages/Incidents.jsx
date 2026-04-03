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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Plus, AlertTriangle, Pencil, Trash2, MoreHorizontal, Eye } from "lucide-react";
import { getErrorMessage } from "@/lib/errors.js";
import { formatIncidentAffectedPlants, getIncidentTitle, getIncidentTypeLabel, isIncidentActive, isIncidentInProgress } from "@/lib/incidents.js";
import { cn } from "@/lib/utils";

const TYPES = ["pest","disease","environmental","structural","other"];
const SEVERITIES = ["low","medium","high","critical"];
const TARGET_MODES = [
  { value: "single", label: "One house", description: "Log this incident against one greenhouse." },
  { value: "selected", label: "Selected houses", description: "Apply the same incident details to a custom group of houses." },
  { value: "all_active", label: "All active houses", description: "Use this when one event affected the whole active greenhouse estate." },
];
const EDIT_SCOPES = [
  { value: "single_house", label: "This house only", description: "Only update the selected greenhouse record." },
  { value: "all_houses", label: "All affected houses", description: "Update the shared incident details across the full affected-house group." },
];
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
  trigger: "",
  affected_area: "",
  severity: "medium",
  affected_scope: "count",
  affected_plants: "",
  description: "",
  impact_summary: "",
  status: "open",
});

const getIssuePlaceholder = (incidentType) => ({
  pest: "e.g. White flies on cucumber crop",
  disease: "e.g. Powdery mildew outbreak",
  environmental: "e.g. Heat stress after fan failure",
  structural: "e.g. Roof panels torn off by storm",
  other: "e.g. Irrigation line burst in house",
}[incidentType] || "Describe the issue");

const getTriggerPlaceholder = (incidentType) => ({
  pest: "e.g. White flies / aphids",
  disease: "e.g. Powdery mildew",
  environmental: "e.g. Heat wave after ventilation failure",
  structural: "e.g. Wind storm / heavy rainfall",
  other: "e.g. Theft / electrical fault / pump failure",
}[incidentType] || "What specifically caused or triggered it?");

const getAffectedAreaPlaceholder = (incidentType) => ({
  pest: "e.g. Tomato rows 3-6",
  disease: "e.g. Nursery section near east wall",
  environmental: "e.g. South side near blocked vents",
  structural: "e.g. Roof, side net, door frame",
  other: "e.g. Pump room / drip line zone",
}[incidentType] || "What exact area or component was affected?");

const getAffectedPlantsHint = (affectedScope) => ({
  count: "Enter a rough count when only part of the crop is affected.",
  all: "Use this when the whole crop in the greenhouse was affected.",
  none: "Use this for house damage or other incidents that did not directly affect plants.",
}[affectedScope] || "");

const generateIncidentGroupId = () =>
  globalThis.crypto?.randomUUID?.() || `incident-group-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;

const sortByGreenhouseCode = (rows, ghMap) =>
  [...rows].sort((a, b) => String(ghMap[a.greenhouse_id]?.code || "").localeCompare(String(ghMap[b.greenhouse_id]?.code || "")));

const truncateText = (value, maxLength = 100) => {
  const text = String(value || "").trim();
  if (!text) return "";
  return text.length > maxLength ? `${text.slice(0, maxLength - 1)}…` : text;
};

const getIncidentPreview = (incident) => {
  const pieces = [];
  const trigger = String(incident?.trigger || "").trim();
  const area = String(incident?.affected_area || "").trim();
  const title = String(getIncidentTitle(incident) || "").trim().toLowerCase();

  if (trigger && trigger.toLowerCase() !== title) pieces.push(trigger);
  if (area) pieces.push(area);
  if (pieces.length > 0) return pieces.join(" • ");

  return truncateText(incident?.description || incident?.impact_summary, 110);
};

const SORT_MODES = [
  { value: "incident_date", label: "Incident date: newest first" },
  { value: "logged_date", label: "Date logged: newest first" },
];
const ALL_YEARS_VALUE = "__all_years__";
const ALL_MONTHS_VALUE = "__all_months__";
const MONTH_OPTIONS = [
  { value: "01", label: "January" },
  { value: "02", label: "February" },
  { value: "03", label: "March" },
  { value: "04", label: "April" },
  { value: "05", label: "May" },
  { value: "06", label: "June" },
  { value: "07", label: "July" },
  { value: "08", label: "August" },
  { value: "09", label: "September" },
  { value: "10", label: "October" },
  { value: "11", label: "November" },
  { value: "12", label: "December" },
];

const getIncidentSortValue = (record, sortMode) => {
  if (sortMode === "logged_date") {
    return String(record?.created_date || record?.updated_date || record?.date || "");
  }

  return String(record?.date || record?.created_date || record?.updated_date || "");
};

export default function Incidents() {
  const [records, setRecords] = useState([]);
  const [greenhouses, setGreenhouses] = useState([]);
  const [responses, setResponses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [detailItem, setDetailItem] = useState(null);
  const [editItem, setEditItem] = useState(null);
  const [form, setForm] = useState(createDefaultForm);
  const [sortMode, setSortMode] = useState("incident_date");
  const [yearFilter, setYearFilter] = useState(ALL_YEARS_VALUE);
  const [monthFilter, setMonthFilter] = useState(ALL_MONTHS_VALUE);
  const [targetMode, setTargetMode] = useState("single");
  const [selectedGreenhouseIds, setSelectedGreenhouseIds] = useState([]);
  const [editScope, setEditScope] = useState("single_house");
  const [saving, setSaving] = useState(false);
  const [deleteItem, setDeleteItem] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [error, setError] = useState("");

  const load = async () => {
    try {
      setLoading(true);
      const [inc, gh, tr] = await Promise.all([
        base44.entities.Incident.list("-date", 200),
        base44.entities.Greenhouse.list("code"),
        base44.entities.Treatment.list("-date", 300),
      ]);
      setRecords(inc);
      setGreenhouses(gh);
      setResponses(tr);
      setLoadError("");
    } catch (err) {
      setLoadError(getErrorMessage(err, "Failed to load incidents."));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const ghMap = Object.fromEntries(greenhouses.map(g => [g.id, g]));
  const activeGreenhouses = greenhouses.filter((greenhouse) => greenhouse.status === "active");
  const activeIncidentsCount = records.filter((record) => isIncidentActive(record.status)).length;
  const availableYears = [...new Set(
    records
      .map((record) => String(record?.date || record?.created_date || "").slice(0, 4))
      .filter((value) => /^\d{4}$/.test(value))
  )].sort((a, b) => b.localeCompare(a));
  const filteredRecords = records.filter((record) => {
    const sourceDate = String(record?.date || record?.created_date || "");
    const recordYear = sourceDate.slice(0, 4);
    const recordMonth = sourceDate.slice(5, 7);

    if (yearFilter !== ALL_YEARS_VALUE && recordYear !== yearFilter) return false;
    if (monthFilter !== ALL_MONTHS_VALUE && recordMonth !== monthFilter) return false;
    return true;
  });
  const sortedRecords = [...filteredRecords].sort((a, b) => getIncidentSortValue(b, sortMode).localeCompare(getIncidentSortValue(a, sortMode)));
  const targetGreenhouseIds = editItem
    ? (form.greenhouse_id ? [form.greenhouse_id] : [])
    : targetMode === "single"
      ? (form.greenhouse_id ? [form.greenhouse_id] : [])
      : targetMode === "selected"
        ? selectedGreenhouseIds
        : activeGreenhouses.map((greenhouse) => greenhouse.id);
  const allSelectableChecked = greenhouses.length > 0 && selectedGreenhouseIds.length === greenhouses.length;
  const hasSomeSelectableChecked = selectedGreenhouseIds.length > 0 && selectedGreenhouseIds.length < greenhouses.length;
  const groupedIncidents = detailItem?.shared_incident_id
    ? sortByGreenhouseCode(records.filter((record) => record.shared_incident_id === detailItem.shared_incident_id), ghMap)
    : detailItem ? [detailItem] : [];
  const editableIncidentGroup = editItem?.shared_incident_id
    ? sortByGreenhouseCode(records.filter((record) => record.shared_incident_id === editItem.shared_incident_id), ghMap)
    : editItem ? [editItem] : [];
  const isSharedEdit = editItem && editableIncidentGroup.length > 1;
  const detailResponses = detailItem
    ? responses
        .filter((response) => response.incident_id === detailItem.id)
        .sort((a, b) => String(b.date || "").localeCompare(String(a.date || "")))
    : [];
  const saveLabel = editItem
    ? isSharedEdit && editScope === "all_houses"
      ? `Save to ${editableIncidentGroup.length} Houses`
      : "Save Changes"
    : targetGreenhouseIds.length <= 1
      ? "Log Incident"
      : `Log for ${targetGreenhouseIds.length} Houses`;

  const openCreateModal = () => {
    setEditItem(null);
    setForm(createDefaultForm());
    setTargetMode("single");
    setSelectedGreenhouseIds([]);
    setEditScope("single_house");
    setError("");
    setShowModal(true);
  };

  const openEditModal = (incident, scope = "single_house") => {
    setDetailItem(null);
    setEditItem(incident);
    setForm({
      ...createDefaultForm(),
      ...incident,
      cycle_id: incident.cycle_id || "",
      affected_scope: incident.affected_scope || (Number(incident.affected_plants) > 0 ? "count" : "none"),
      affected_plants: incident.affected_plants != null ? String(incident.affected_plants) : "",
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
    setForm(createDefaultForm());
    setTargetMode("single");
    setSelectedGreenhouseIds([]);
    setEditScope("single_house");
    setError("");
  };

  const toggleGreenhouse = (greenhouseId, checked) => {
    setSelectedGreenhouseIds((current) => {
      if (checked) {
        return current.includes(greenhouseId) ? current : [...current, greenhouseId];
      }
      return current.filter((id) => id !== greenhouseId);
    });
  };

  const toggleSelectAllGreenhouses = (checked) => {
    setSelectedGreenhouseIds(checked ? greenhouses.map((greenhouse) => greenhouse.id) : []);
  };

  const selectActiveGreenhouses = () => {
    setSelectedGreenhouseIds(activeGreenhouses.map((greenhouse) => greenhouse.id));
  };

  const buildIncidentPayload = (greenhouseId) => {
    const affectedPlantsCount = Number.parseInt(form.affected_plants, 10);
    return {
      ...form,
      greenhouse_id: greenhouseId,
      affected_scope: form.affected_scope,
      affected_plants:
        form.affected_scope === "count" && Number.isFinite(affectedPlantsCount) && affectedPlantsCount > 0
          ? affectedPlantsCount
          : null,
      cycle_id: form.cycle_id || null,
    };
  };

  const handleSave = async () => {
    setSaving(true);
    setError("");
    try {
      if (editItem) {
        if (isSharedEdit && editScope === "all_houses") {
          await Promise.all(
            editableIncidentGroup.map((incident) =>
              base44.entities.Incident.update(incident.id, {
                ...buildIncidentPayload(incident.greenhouse_id),
                shared_incident_id: incident.shared_incident_id || editItem.shared_incident_id || null,
                application_scope: incident.application_scope || "selected",
              })
            )
          );
        } else {
          await base44.entities.Incident.update(editItem.id, {
            ...buildIncidentPayload(form.greenhouse_id),
            shared_incident_id: editItem.shared_incident_id || null,
            application_scope: editItem.application_scope || "single",
          });
        }
      } else {
        if (targetGreenhouseIds.length === 0) {
          setError(targetMode === "all_active" ? "There are no active houses to apply this incident to." : "Select at least one greenhouse.");
          setSaving(false);
          return;
        }

        const sharedIncidentId = targetGreenhouseIds.length > 1 ? generateIncidentGroupId() : null;
        await Promise.all(
          targetGreenhouseIds.map((greenhouseId) =>
            base44.entities.Incident.create({
              ...buildIncidentPayload(greenhouseId),
              shared_incident_id: sharedIncidentId,
              application_scope: targetMode,
            })
          )
        );
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
      const updated = await base44.entities.Incident.update(incident.id, { status });
      if (detailItem?.id === incident.id) {
        setDetailItem(updated);
      }
      await load();
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
      if (detailItem?.id === deleteItem.id) {
        setDetailItem(null);
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
    {
      key: "name",
      label: "Issue",
      render: (_, row) => {
        const sharedCount = row.shared_incident_id
          ? records.filter((incident) => incident.shared_incident_id === row.shared_incident_id).length
          : 0;
        return (
        <div className="min-w-0 max-w-[320px] whitespace-normal">
          <div className="font-medium text-foreground">{getIncidentTitle(row)}</div>
          {getIncidentPreview(row) ? (
            <div className="text-xs text-muted-foreground mt-0.5">{getIncidentPreview(row)}</div>
          ) : null}
          {sharedCount > 1 ? (
            <div className="text-xs text-primary mt-1">Shared across {sharedCount} houses</div>
          ) : null}
        </div>
      )},
    },
    { key: "severity", label: "Severity", render: v => <StatusBadge status={v} /> },
    { key: "affected_plants", label: "Affected", render: (_, row) => formatIncidentAffectedPlants(row) || "—" },
    { key: "status", label: "Status", render: v => <StatusBadge status={v} /> },
    {
      key: "id", label: "Actions",
      render: (_, row) => (
        <div className="flex justify-end" onClick={(event) => event.stopPropagation()}>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                onClick={(event) => event.stopPropagation()}
                className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-border text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                aria-label="Open incident actions"
              >
                <MoreHorizontal className="w-4 h-4" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => setDetailItem(row)}>
                <Eye className="w-4 h-4" /> View details
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => openEditModal(row)}>
                <Pencil className="w-4 h-4" /> Edit incident
              </DropdownMenuItem>
              {row.status !== "resolved" ? <DropdownMenuSeparator /> : null}
              {row.status !== "resolved" && !isIncidentInProgress(row.status) ? (
                <DropdownMenuItem onClick={() => updateStatus(row, "in_progress")}>
                  Start response
                </DropdownMenuItem>
              ) : null}
              {row.status !== "resolved" && row.status !== "monitoring" ? (
                <DropdownMenuItem onClick={() => updateStatus(row, "monitoring")}>
                  Mark monitoring
                </DropdownMenuItem>
              ) : null}
              {row.status !== "resolved" ? (
                <DropdownMenuItem onClick={() => updateStatus(row, "resolved")}>
                  Resolve incident
                </DropdownMenuItem>
              ) : null}
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => setDeleteItem(row)} className="text-danger focus:text-danger">
                <Trash2 className="w-4 h-4" /> Delete incident
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
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

      <div className="bg-card border border-border rounded-2xl p-4 md:p-5 space-y-4 mb-6">
        <div className="grid md:grid-cols-[1fr_1fr_1fr_auto] gap-3 items-end">
          <FormField label="Year">
            <Select value={yearFilter} onValueChange={setYearFilter}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL_YEARS_VALUE}>All years</SelectItem>
                {availableYears.map((year) => (
                  <SelectItem key={year} value={year}>
                    {year}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FormField>
          <FormField label="Month">
            <Select value={monthFilter} onValueChange={setMonthFilter}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL_MONTHS_VALUE}>All months</SelectItem>
                {MONTH_OPTIONS.map((month) => (
                  <SelectItem key={month.value} value={month.value}>
                    {month.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FormField>
          <FormField label="Sort by">
            <Select value={sortMode} onValueChange={setSortMode}>
              <SelectTrigger aria-label="Sort incident log">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {SORT_MODES.map((mode) => (
                  <SelectItem key={mode.value} value={mode.value}>{mode.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FormField>
          <Button
            variant="outline"
            onClick={() => {
              setYearFilter(ALL_YEARS_VALUE);
              setMonthFilter(ALL_MONTHS_VALUE);
              setSortMode("incident_date");
            }}
            disabled={yearFilter === ALL_YEARS_VALUE && monthFilter === ALL_MONTHS_VALUE && sortMode === "incident_date"}
          >
            Reset
          </Button>
        </div>
      </div>

      {!loading && records.length === 0 ? (
        <EmptyState
          icon={AlertTriangle}
          title="No incidents logged"
          description="Log pest issues, disease outbreaks, structural damage, or other greenhouse incidents."
          action={<Button onClick={openCreateModal}><Plus className="w-4 h-4 mr-1" />Log Incident</Button>}
        />
      ) : (
        <DataTable columns={columns} data={sortedRecords} loading={loading} onRowClick={setDetailItem} />
      )}

      <Modal open={showModal} onClose={closeModal} title={editItem ? "Edit Incident" : "Log Incident"}>
        <div className="space-y-4">
          {!editItem ? (
            <FormField label="Applies To" required>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {TARGET_MODES.map((mode) => (
                  <button
                    key={mode.value}
                    type="button"
                    onClick={() => setTargetMode(mode.value)}
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
                  Shared incident details will be updated for {editableIncidentGroup.map((incident) => ghMap[incident.greenhouse_id]?.code).filter(Boolean).join(", ")}.
                </p>
              ) : null}
            </FormField>
          ) : null}

          {editItem || targetMode === "single" ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField label={editItem && editScope === "all_houses" ? "Reference House" : "Greenhouse"} required>
                <Select
                  value={form.greenhouse_id}
                  onValueChange={v => setForm(f => ({ ...f, greenhouse_id: v, cycle_id: "" }))}
                  disabled={editItem && editScope === "all_houses"}
                >
                  <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
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

          {!editItem && targetMode === "all_active" ? (
            <div className="rounded-xl border border-primary/20 bg-primary/5 px-4 py-3">
              <p className="text-sm font-medium text-foreground">
                This will create a linked incident record for {activeGreenhouses.length} active {activeGreenhouses.length === 1 ? "house" : "houses"}.
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Each affected house will still keep its own status so repairs and follow-up can be tracked separately.
              </p>
            </div>
          ) : null}
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
            <FormField label="Incident Headline">
              <Input
                value={form.name}
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                placeholder={getIssuePlaceholder(form.incident_type)}
              />
            </FormField>
            <FormField label="Cause / Trigger">
              <Input
                value={form.trigger || ""}
                onChange={e => setForm(f => ({ ...f, trigger: e.target.value }))}
                placeholder={getTriggerPlaceholder(form.incident_type)}
              />
            </FormField>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField label="Affected Area / Component">
              <Input
                value={form.affected_area || ""}
                onChange={e => setForm(f => ({ ...f, affected_area: e.target.value }))}
                placeholder={getAffectedAreaPlaceholder(form.incident_type)}
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
          <FormField label="What Happened">
            <Textarea
              value={form.description}
              onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
              placeholder="Describe exactly what happened and the sequence of events."
              className="h-20 resize-none"
            />
          </FormField>
          <FormField label="Damage / Symptoms Observed">
            <Textarea
              value={form.impact_summary || ""}
              onChange={e => setForm(f => ({ ...f, impact_summary: e.target.value }))}
              placeholder="Describe the visible damage, affected components, or crop symptoms."
              className="h-20 resize-none"
            />
          </FormField>
          {!editItem ? (
            <div className="rounded-xl border border-border bg-muted/20 px-4 py-3">
              <p className="text-sm font-medium text-foreground">
                {targetGreenhouseIds.length === 0
                  ? "No target houses selected yet."
                  : `${targetGreenhouseIds.length} ${targetGreenhouseIds.length === 1 ? "house" : "houses"} will receive this incident record.`}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                A separate incident record will be created for each selected house so greenhouse detail pages and house-level follow-up remain accurate.
              </p>
            </div>
          ) : null}
          {error ? <div className="bg-danger/10 text-danger text-sm rounded-lg px-4 py-2">{error}</div> : null}
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={closeModal}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving || targetGreenhouseIds.length === 0 || !form.incident_type}>
              {saving ? "Saving…" : saveLabel}
            </Button>
          </div>
        </div>
      </Modal>

      <Modal open={!!detailItem} onClose={() => setDetailItem(null)} title="Incident Details" size="lg">
        {detailItem ? (
          <div className="space-y-5">
            <div className="rounded-2xl border border-border bg-muted/20 p-4">
              <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                <div>
                  <div className="text-lg font-semibold text-foreground">{getIncidentTitle(detailItem)}</div>
                  {getIncidentPreview(detailItem) ? (
                    <div className="text-sm text-muted-foreground mt-1">{getIncidentPreview(detailItem)}</div>
                  ) : null}
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <StatusBadge status={detailItem.severity} />
                  <StatusBadge status={detailItem.status} />
                </div>
              </div>
            </div>

            {groupedIncidents.length > 1 ? (
              <div className="rounded-xl border border-primary/20 bg-primary/5 p-4">
                <div className="text-sm font-semibold text-foreground">
                  Shared incident affecting {groupedIncidents.length} houses
                </div>
                <div className="text-xs text-muted-foreground mt-1">
                  This same event was recorded against multiple greenhouses. Each house keeps its own status so follow-up can still move at the right pace per house.
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mt-4">
                  {groupedIncidents.map((incident) => (
                    <div key={incident.id} className="rounded-lg border border-border bg-card px-3 py-3 flex items-center justify-between gap-3">
                      <div>
                        <div className="text-sm font-medium text-foreground">
                          {ghMap[incident.greenhouse_id]?.code || "Unknown house"}
                          {incident.id === detailItem.id ? " (current)" : ""}
                        </div>
                        <div className="text-xs text-muted-foreground mt-0.5">
                          {truncateText(incident.affected_area || incident.impact_summary || incident.description, 70) || "No extra note"}
                        </div>
                      </div>
                      <StatusBadge status={incident.status} />
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
                <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Incident Date</div>
                <div className="mt-1 text-sm font-medium text-foreground">{detailItem.date || "—"}</div>
              </div>
              <div className="rounded-xl border border-border p-4">
                <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Incident Type</div>
                <div className="mt-1 text-sm font-medium text-foreground">{getIncidentTypeLabel(detailItem.incident_type)}</div>
              </div>
              <div className="rounded-xl border border-border p-4">
                <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Logged On</div>
                <div className="mt-1 text-sm font-medium text-foreground">
                  {detailItem.created_date ? new Date(detailItem.created_date).toLocaleString() : "—"}
                </div>
              </div>
              <div className="rounded-xl border border-border p-4">
                <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Affected Plants</div>
                <div className="mt-1 text-sm font-medium text-foreground">{formatIncidentAffectedPlants(detailItem) || "—"}</div>
              </div>
              <div className="rounded-xl border border-border p-4">
                <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Cause / Trigger</div>
                <div className="mt-1 text-sm font-medium text-foreground">{detailItem.trigger || "—"}</div>
              </div>
              <div className="rounded-xl border border-border p-4">
                <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Affected Area / Component</div>
                <div className="mt-1 text-sm font-medium text-foreground">{detailItem.affected_area || "—"}</div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="rounded-xl border border-border p-4">
                <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">What Happened</div>
                <div className="mt-2 text-sm text-foreground whitespace-pre-wrap">
                  {detailItem.description || "No detailed narrative recorded yet."}
                </div>
              </div>
              <div className="rounded-xl border border-border p-4">
                <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Damage / Symptoms Observed</div>
                <div className="mt-2 text-sm text-foreground whitespace-pre-wrap">
                  {detailItem.impact_summary || "No damage or symptom notes recorded yet."}
                </div>
              </div>
            </div>

            <div className="rounded-xl border border-border p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Linked Responses</div>
                  <div className="text-sm text-muted-foreground mt-1">
                    {detailResponses.length > 0
                      ? `${detailResponses.length} response${detailResponses.length === 1 ? "" : "s"} logged against this incident`
                      : "No response has been linked to this incident yet."}
                  </div>
                </div>
              </div>
              {detailResponses.length > 0 ? (
                <div className="mt-4 space-y-3">
                  {detailResponses.slice(0, 4).map((response) => (
                    <div key={response.id} className="rounded-lg border border-border bg-muted/20 px-3 py-3">
                      <div className="flex flex-wrap items-center gap-2">
                        <div className="text-sm font-medium text-foreground capitalize">{response.treatment_type || "Response"}</div>
                        <StatusBadge status={response.outcome || "pending"} />
                        <div className="text-xs text-muted-foreground">{response.date || "—"}</div>
                      </div>
                      <div className="mt-1 text-sm text-muted-foreground">
                        {[response.chemical_name, response.dose, response.applicator].filter(Boolean).join(" • ") || "No response detail captured."}
                      </div>
                      {response.notes ? <div className="mt-2 text-sm text-foreground whitespace-pre-wrap">{response.notes}</div> : null}
                    </div>
                  ))}
                </div>
              ) : null}
            </div>

            <div className="flex flex-wrap justify-end gap-2 pt-1">
              {detailItem.status !== "resolved" && !isIncidentInProgress(detailItem.status) ? (
                <Button variant="outline" onClick={() => updateStatus(detailItem, "in_progress")}>Start response</Button>
              ) : null}
              {detailItem.status !== "resolved" && detailItem.status !== "monitoring" ? (
                <Button variant="outline" onClick={() => updateStatus(detailItem, "monitoring")}>Mark monitoring</Button>
              ) : null}
              {detailItem.status !== "resolved" ? (
                <Button variant="outline" onClick={() => updateStatus(detailItem, "resolved")}>Resolve</Button>
              ) : null}
              <Button
                variant="outline"
                onClick={() => {
                  const current = detailItem;
                  setDetailItem(null);
                  openEditModal(current);
                }}
              >
                Edit Incident
              </Button>
              {groupedIncidents.length > 1 ? (
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
        title="Delete this incident?"
        description="This incident record will be removed from the log. This action cannot be undone."
        confirmLabel="Delete Incident"
        loading={deleting}
        onConfirm={handleDelete}
      />
    </div>
  );
}
