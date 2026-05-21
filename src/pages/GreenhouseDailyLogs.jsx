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
import RecordActions from "@/components/shared/RecordActions.jsx";
import StatCard from "@/components/dashboard/StatCard.jsx";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Activity, CalendarDays, Droplets, Plus, Sprout, Bug, FlaskConical } from "lucide-react";
import { getErrorMessage } from "@/lib/errors.js";
import { createPageUrl } from "@/utils";

const ALL_HOUSES_VALUE = "__all__";
const getToday = () => new Date().toISOString().slice(0, 10);

const createDefaultForm = () => ({
  greenhouse_id: "",
  log_date: getToday(),
  // Irrigation
  irrigation_intervals: "",
  irrigation_minutes_per_interval: "",
  // Fertigation
  fertigation_intervals: "",
  fertigation_minutes_per_interval: "",
  fertigation_times: "",
  // Pesticide
  pesticide_name: "",
  pesticide_rate_ml: "",
  pesticide_knapsacks: "",
  // Fungicide
  fungicide_name: "",
  fungicide_rate_ml: "",
  fungicide_knapsacks: "",
  // Notes
  additional_notes: "",
});

const toNonNegativeNumber = (value) => {
  if (value === "" || value == null) return null;
  const parsed = Number(value);
  if (isNaN(parsed) || parsed < 0) return NaN;
  return parsed;
};

const toNonNegativeInteger = (value) => {
  if (value === "" || value == null) return null;
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 0) return NaN;
  return parsed;
};

const getIrrigationSummary = (record) => {
  const intervals = Number(record?.irrigation_intervals || 0);
  const mins = Number(record?.irrigation_minutes_per_interval || 0);
  if (intervals > 0) return `${intervals} × ${mins} min`;
  return "—";
};

const getFertigationSummary = (record) => {
  const intervals = Number(record?.fertigation_intervals || 0);
  const mins = Number(record?.fertigation_minutes_per_interval || 0);
  const times = String(record?.fertigation_times || "").trim();
  if (intervals > 0) {
    const base = `${intervals} × ${mins} min`;
    return times ? `${base} (${times})` : base;
  }
  return "—";
};

const getPesticideSummary = (record) => {
  const name = String(record?.pesticide_name || "").trim();
  if (!name) return "—";
  const rate = record?.pesticide_rate_ml ? `${record.pesticide_rate_ml} ml` : "";
  const knapsacks = record?.pesticide_knapsacks ? `${record.pesticide_knapsacks} knapsack${record.pesticide_knapsacks > 1 ? "s" : ""}` : "";
  return [name, rate, knapsacks].filter(Boolean).join(" · ");
};

const getFungicideSummary = (record) => {
  const name = String(record?.fungicide_name || "").trim();
  if (!name) return "—";
  const rate = record?.fungicide_rate_ml ? `${record.fungicide_rate_ml} ml` : "";
  const knapsacks = record?.fungicide_knapsacks ? `${record.fungicide_knapsacks} knapsack${record.fungicide_knapsacks > 1 ? "s" : ""}` : "";
  return [name, rate, knapsacks].filter(Boolean).join(" · ");
};

const truncate = (value, max = 80) => {
  const text = String(value || "").trim();
  return text.length > max ? `${text.slice(0, max - 1)}…` : text;
};

export default function GreenhouseDailyLogs() {
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
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");

  const load = async () => {
    try {
      setLoading(true);
      const [logRows, ghRows] = await Promise.all([
        base44.entities.GreenhouseDailyLog.list("-log_date", 1000),
        base44.entities.Greenhouse.list("code"),
      ]);
      setRecords(logRows);
      setGreenhouses(ghRows);
      setLoadError("");
    } catch (err) {
      setLoadError(getErrorMessage(err, "Failed to load greenhouse daily logs."));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    const logId = new URLSearchParams(location.search).get("log");
    if (!logId || records.length === 0 || showModal) return;
    const found = records.find((r) => r.id === logId);
    if (!found) return;
    openEditModal(found);
    navigate(createPageUrl("GreenhouseDailyLogs"), { replace: true });
  }, [location.search, records, showModal]);

  const greenhouseMap = Object.fromEntries(greenhouses.map((g) => [g.id, g]));

  const filteredRecords = records.filter((r) => {
    if (greenhouseFilter !== ALL_HOUSES_VALUE && r.greenhouse_id !== greenhouseFilter) return false;
    if (fromDate && String(r.log_date || "") < fromDate) return false;
    if (toDate && String(r.log_date || "") > toDate) return false;
    return true;
  });

  const today = getToday();
  const todayRecords = records.filter((r) => r.log_date === today);
  const housesLoggedToday = new Set(todayRecords.map((r) => r.greenhouse_id).filter(Boolean)).size;

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
      log_date: record.log_date || getToday(),
      irrigation_intervals: record.irrigation_intervals != null ? String(record.irrigation_intervals) : "",
      irrigation_minutes_per_interval: record.irrigation_minutes_per_interval != null ? String(record.irrigation_minutes_per_interval) : "",
      fertigation_intervals: record.fertigation_intervals != null ? String(record.fertigation_intervals) : "",
      fertigation_minutes_per_interval: record.fertigation_minutes_per_interval != null ? String(record.fertigation_minutes_per_interval) : "",
      fertigation_times: record.fertigation_times || "",
      pesticide_name: record.pesticide_name || "",
      pesticide_rate_ml: record.pesticide_rate_ml != null ? String(record.pesticide_rate_ml) : "",
      pesticide_knapsacks: record.pesticide_knapsacks != null ? String(record.pesticide_knapsacks) : "",
      fungicide_name: record.fungicide_name || "",
      fungicide_rate_ml: record.fungicide_rate_ml != null ? String(record.fungicide_rate_ml) : "",
      fungicide_knapsacks: record.fungicide_knapsacks != null ? String(record.fungicide_knapsacks) : "",
      additional_notes: record.additional_notes || "",
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
    if (!form.greenhouse_id) return { error: "Select the greenhouse for this daily log." };
    if (!form.log_date) return { error: "Select the log date." };

    const gh = greenhouseMap[form.greenhouse_id];

    if (records.some((r) => r.id !== editItem?.id && r.greenhouse_id === form.greenhouse_id && r.log_date === form.log_date)) {
      const ghLabel = gh ? (gh.code || gh.name) : "This greenhouse";
      return { error: `${ghLabel} already has a daily log for ${form.log_date}.` };
    }

    const irrigationIntervals = toNonNegativeInteger(form.irrigation_intervals);
    const irrigationMins = toNonNegativeInteger(form.irrigation_minutes_per_interval);
    const fertigationIntervals = toNonNegativeInteger(form.fertigation_intervals);
    const fertigationMins = toNonNegativeInteger(form.fertigation_minutes_per_interval);
    const pesticideRateMl = toNonNegativeNumber(form.pesticide_rate_ml);
    const pesticideKnapsacks = toNonNegativeNumber(form.pesticide_knapsacks);
    const fungicideRateMl = toNonNegativeNumber(form.fungicide_rate_ml);
    const fungicideKnapsacks = toNonNegativeNumber(form.fungicide_knapsacks);

    if ([irrigationIntervals, irrigationMins, fertigationIntervals, fertigationMins].some(isNaN)) {
      return { error: "Intervals and minutes must be whole numbers of zero or more." };
    }
    if ([pesticideRateMl, pesticideKnapsacks, fungicideRateMl, fungicideKnapsacks].some(isNaN)) {
      return { error: "Rates and knapsack counts must be positive numbers." };
    }
    if ((irrigationIntervals || 0) > 0 && !(irrigationMins > 0)) {
      return { error: "Enter minutes per irrigation interval." };
    }
    if ((fertigationIntervals || 0) > 0 && !(fertigationMins > 0)) {
      return { error: "Enter minutes per fertigation interval." };
    }
    if (form.pesticide_name.trim() && !pesticideRateMl) {
      return { error: "Enter the pesticide application rate (ml)." };
    }
    if (form.fungicide_name.trim() && !fungicideRateMl) {
      return { error: "Enter the fungicide application rate (ml)." };
    }

    return {
      payload: {
        greenhouse_id: form.greenhouse_id,
        greenhouse_code: gh?.code || "",
        greenhouse_name: gh?.name || gh?.code || "",
        log_date: form.log_date,
        irrigation_intervals: irrigationIntervals,
        irrigation_minutes_per_interval: irrigationMins,
        fertigation_intervals: fertigationIntervals,
        fertigation_minutes_per_interval: fertigationMins,
        fertigation_times: form.fertigation_times.trim() || null,
        pesticide_name: form.pesticide_name.trim() || null,
        pesticide_rate_ml: pesticideRateMl,
        pesticide_knapsacks: pesticideKnapsacks,
        fungicide_name: form.fungicide_name.trim() || null,
        fungicide_rate_ml: fungicideRateMl,
        fungicide_knapsacks: fungicideKnapsacks,
        additional_notes: form.additional_notes.trim() || null,
      },
    };
  };

  const handleSave = async () => {
    const { error: validationError, payload } = buildPayload();
    if (validationError) { setError(validationError); return; }
    setSaving(true);
    setError("");
    try {
      if (editItem) {
        await base44.entities.GreenhouseDailyLog.update(editItem.id, payload);
      } else {
        await base44.entities.GreenhouseDailyLog.create(payload);
      }
      closeModal();
      await load();
    } catch (err) {
      setError(getErrorMessage(err, `Failed to ${editItem ? "update" : "create"} greenhouse daily log.`));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteItem) return;
    setDeleting(true);
    try {
      await base44.entities.GreenhouseDailyLog.delete(deleteItem.id);
      setDeleteItem(null);
      await load();
    } catch (err) {
      setLoadError(getErrorMessage(err, "Failed to delete greenhouse daily log."));
    } finally {
      setDeleting(false);
    }
  };

  const set = (field) => (e) => setForm((prev) => ({ ...prev, [field]: e.target.value }));

  const columns = [
    { key: "log_date", label: "Date", noWrap: true },
    {
      key: "greenhouse_id",
      label: "House", noWrap: true,
      render: (value, row) => greenhouseMap[value]?.code || row.greenhouse_code || "—",
    },
    {
      key: "irrigation",
      label: "Irrigation",
      render: (_, row) => getIrrigationSummary(row),
    },
    {
      key: "fertigation",
      label: "Fertigation",
      render: (_, row) => getFertigationSummary(row),
    },
    {
      key: "pesticide",
      label: "Pesticide",
      render: (_, row) => <span className="max-w-[180px] block truncate">{getPesticideSummary(row)}</span>,
    },
    {
      key: "fungicide",
      label: "Fungicide",
      render: (_, row) => <span className="max-w-[180px] block truncate">{getFungicideSummary(row)}</span>,
    },
    {
      key: "additional_notes",
      label: "Notes",
      render: (value) => truncate(value || ""),
    },
    {
      key: "actions",
      label: "", noWrap: true, align: "right",
      render: (_, row) => (
        <RecordActions
          onEdit={() => openEditModal(row)}
          onDelete={() => setDeleteItem(row)}
          ariaLabel={`Actions for greenhouse log on ${row.log_date}`}
        />
      ),
    },
  ];

  if (!loading && greenhouses.length === 0 && records.length === 0) {
    return (
      <div className="p-4 md:p-6">
        <PageHeader title="Greenhouse Daily Logs" subtitle="Track daily operations for each greenhouse." />
        <EmptyState
          icon={CalendarDays}
          title="Add a greenhouse first"
          description="Daily logs are recorded against a greenhouse."
          action={<Button onClick={() => navigate(createPageUrl("Greenhouses"))}>Open Greenhouses</Button>}
        />
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 space-y-6">
      <PageHeader
        title="Greenhouse Daily Logs"
        subtitle={`${records.length} log${records.length === 1 ? "" : "s"} recorded`}
        actions={
          <Button size="sm" onClick={openCreateModal} className="gap-1.5">
            <Plus className="w-4 h-4" />
            Add Daily Log
          </Button>
        }
      />

      <ErrorBanner message={loadError} onRetry={load} />

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard title="Total Logs" value={records.length.toLocaleString()} subtitle={`${filteredRecords.length.toLocaleString()} in current view`} icon={Activity} color="primary" loading={loading} />
        <StatCard title="Today's Logs" value={todayRecords.length.toLocaleString()} subtitle={`${housesLoggedToday} house${housesLoggedToday === 1 ? "" : "s"} covered`} icon={CalendarDays} color="success" loading={loading} />
        <StatCard title="Pesticide Applied Today" value={todayRecords.filter((r) => r.pesticide_name).length} subtitle="Houses with pesticide logged" icon={Bug} color="warning" loading={loading} />
        <StatCard title="Fungicide Applied Today" value={todayRecords.filter((r) => r.fungicide_name).length} subtitle="Houses with fungicide logged" icon={FlaskConical} color="accent" loading={loading} />
      </div>

      <div className="bg-card rounded-xl border border-border p-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <FormField label="Filter by House">
            <Select value={greenhouseFilter} onValueChange={setGreenhouseFilter}>
              <SelectTrigger><SelectValue placeholder="All houses" /></SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL_HOUSES_VALUE}>All houses</SelectItem>
                {greenhouses.map((g) => (
                  <SelectItem key={g.id} value={g.id}>{g.code}{g.name ? ` · ${g.name}` : ""}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FormField>
          <FormField label="From Date">
            <Input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} />
          </FormField>
          <FormField label="To Date">
            <Input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} />
          </FormField>
        </div>
      </div>

      {!loading && filteredRecords.length === 0 ? (
        <EmptyState
          icon={CalendarDays}
          title="No greenhouse daily logs found"
          description="Record irrigation, fertigation, pesticide/fungicide applications and other daily operations."
          action={<Button onClick={openCreateModal}>Add Daily Log</Button>}
        />
      ) : (
        <DataTable columns={columns} data={filteredRecords} loading={loading} onRowClick={openEditModal} />
      )}

      <Modal
        open={showModal}
        onClose={closeModal}
        title={editItem ? "Edit Greenhouse Daily Log" : "Add Greenhouse Daily Log"}
        size="lg"
      >
        <div className="space-y-5">
          {/* House + Date */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField label="Greenhouse" required>
              <Select value={form.greenhouse_id} onValueChange={(v) => setForm((p) => ({ ...p, greenhouse_id: v }))}>
                <SelectTrigger><SelectValue placeholder="Select greenhouse" /></SelectTrigger>
                <SelectContent>
                  {greenhouses.map((g) => (
                    <SelectItem key={g.id} value={g.id}>{g.code}{g.name ? ` · ${g.name}` : ""}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FormField>
            <FormField label="Log Date" required>
              <Input type="date" value={form.log_date} onChange={set("log_date")} />
            </FormField>
          </div>

          {/* Irrigation */}
          <div className="rounded-xl border border-border p-4 space-y-3">
            <div>
              <h4 className="text-sm font-semibold flex items-center gap-2"><Droplets className="w-4 h-4 text-blue-500" />Irrigation</h4>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <FormField label="Number of Intervals">
                <Input type="number" min="0" step="1" placeholder="0" value={form.irrigation_intervals} onChange={set("irrigation_intervals")} />
              </FormField>
              <FormField label="Minutes per Interval">
                <Input type="number" min="0" step="1" placeholder="0" value={form.irrigation_minutes_per_interval} onChange={set("irrigation_minutes_per_interval")} />
              </FormField>
            </div>
          </div>

          {/* Fertigation */}
          <div className="rounded-xl border border-border p-4 space-y-3">
            <div>
              <h4 className="text-sm font-semibold flex items-center gap-2"><Sprout className="w-4 h-4 text-emerald-600" />Fertigation</h4>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <FormField label="Number of Times / Day">
                <Input type="number" min="0" step="1" placeholder="0" value={form.fertigation_intervals} onChange={set("fertigation_intervals")} />
              </FormField>
              <FormField label="Minutes per Fertigation">
                <Input type="number" min="0" step="1" placeholder="0" value={form.fertigation_minutes_per_interval} onChange={set("fertigation_minutes_per_interval")} />
              </FormField>
              <FormField label="Times Carried Out (e.g. 07:00, 13:00)">
                <Input placeholder="e.g. 07:00, 13:00, 17:00" value={form.fertigation_times} onChange={set("fertigation_times")} />
              </FormField>
            </div>
          </div>

          {/* Pesticide */}
          <div className="rounded-xl border border-border p-4 space-y-3">
            <div>
              <h4 className="text-sm font-semibold flex items-center gap-2"><Bug className="w-4 h-4 text-amber-600" />Pesticide Application</h4>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <FormField label="Pesticide Name">
                <Input placeholder="Product name" value={form.pesticide_name} onChange={set("pesticide_name")} />
              </FormField>
              <FormField label="Rate (ml)">
                <Input type="number" min="0" step="0.1" placeholder="0" value={form.pesticide_rate_ml} onChange={set("pesticide_rate_ml")} />
              </FormField>
              <FormField label="No. of Knapsacks">
                <Input type="number" min="0" step="0.5" placeholder="0" value={form.pesticide_knapsacks} onChange={set("pesticide_knapsacks")} />
              </FormField>
            </div>
          </div>

          {/* Fungicide */}
          <div className="rounded-xl border border-border p-4 space-y-3">
            <div>
              <h4 className="text-sm font-semibold flex items-center gap-2"><FlaskConical className="w-4 h-4 text-violet-600" />Fungicide Application</h4>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <FormField label="Fungicide Name">
                <Input placeholder="Product name" value={form.fungicide_name} onChange={set("fungicide_name")} />
              </FormField>
              <FormField label="Rate (ml)">
                <Input type="number" min="0" step="0.1" placeholder="0" value={form.fungicide_rate_ml} onChange={set("fungicide_rate_ml")} />
              </FormField>
              <FormField label="No. of Knapsacks">
                <Input type="number" min="0" step="0.5" placeholder="0" value={form.fungicide_knapsacks} onChange={set("fungicide_knapsacks")} />
              </FormField>
            </div>
          </div>

          {/* Other Operations / Notes */}
          <FormField label="Other Operations & Notes">
            <Textarea
              value={form.additional_notes}
              onChange={set("additional_notes")}
              placeholder="e.g. Pruning carried out, weeding of house, nutrients applied (name + kg used), any other observations or activities."
              rows={4}
            />
          </FormField>

          {error ? <div className="rounded-lg bg-danger/10 px-4 py-2 text-sm text-danger">{error}</div> : null}

          <div className="flex justify-end gap-2 pt-1">
            <Button variant="outline" onClick={closeModal} disabled={saving}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? "Saving…" : editItem ? "Save Changes" : "Create Daily Log"}
            </Button>
          </div>
        </div>
      </Modal>

      <DeleteConfirmDialog
        open={!!deleteItem}
        onOpenChange={(open) => { if (!open) setDeleteItem(null); }}
        title="Delete this greenhouse daily log?"
        description="This will permanently remove the selected daily log."
        loading={deleting}
        onConfirm={handleDelete}
      />
    </div>
  );
}
