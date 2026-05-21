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
import { Activity, CalendarDays, Droplets, Plus, Sprout } from "lucide-react";
import { getErrorMessage } from "@/lib/errors.js";
import { createPageUrl } from "@/utils";

const getToday = () => new Date().toISOString().slice(0, 10);

const createDefaultForm = () => ({
  log_date: getToday(),
  pesticide_applied: "",
  fungicide_applied: "",
  nutrients_applied: "",
  fertigation_intervals: "",
  fertigation_minutes_per_interval: "",
  irrigation_intervals: "",
  irrigation_minutes_per_interval: "",
  activities: "",
});

const truncateText = (value, maxLength = 88) => {
  const text = String(value || "").trim();
  if (!text) return "";
  return text.length > maxLength ? `${text.slice(0, maxLength - 1)}…` : text;
};

const toNonNegativeInteger = (value) => {
  if (value === "" || value == null) return null;
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 0) return Number.NaN;
  return parsed;
};

const getApplicationsSummary = (record) => {
  const items = [
    record?.pesticide_applied ? `Pesticide: ${record.pesticide_applied}` : "",
    record?.fungicide_applied ? `Fungicide: ${record.fungicide_applied}` : "",
    record?.nutrients_applied ? `Nutrients: ${record.nutrients_applied}` : "",
  ].filter(Boolean);

  return items.length > 0 ? truncateText(items.join(" • ")) : "No products logged";
};

const getWateringSummary = (record) => {
  const pieces = [];
  const fertigationIntervals = Number(record?.fertigation_intervals || 0);
  const fertigationMinutes = Number(record?.fertigation_minutes_per_interval || 0);
  const irrigationIntervals = Number(record?.irrigation_intervals || 0);
  const irrigationMinutes = Number(record?.irrigation_minutes_per_interval || 0);

  if (fertigationIntervals > 0) {
    pieces.push(`Fertigation: ${fertigationIntervals} x ${fertigationMinutes || 0} min`);
  }
  if (irrigationIntervals > 0) {
    pieces.push(`Irrigation: ${irrigationIntervals} x ${irrigationMinutes || 0} min`);
  }

  return pieces.length > 0 ? pieces.join(" • ") : "No watering intervals logged";
};

export default function NurseryDailyLogs() {
  const location = useLocation();
  const navigate = useNavigate();
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [deleteItem, setDeleteItem] = useState(null);
  const [form, setForm] = useState(createDefaultForm());
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");

  const load = async () => {
    try {
      setLoading(true);
      const logRows = await base44.entities.NurseryDailyLog.list("-log_date", 1000);
      setRecords(logRows);
      setLoadError("");
    } catch (err) {
      setLoadError(getErrorMessage(err, "Failed to load nursery daily logs."));
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

    const logRecord = records.find((item) => item.id === logId);
    if (!logRecord) return;

    setEditItem(logRecord);
    setForm({
      log_date: logRecord.log_date || getToday(),
      pesticide_applied: logRecord.pesticide_applied || "",
      fungicide_applied: logRecord.fungicide_applied || "",
      nutrients_applied: logRecord.nutrients_applied || "",
      fertigation_intervals: logRecord.fertigation_intervals != null ? String(logRecord.fertigation_intervals) : "",
      fertigation_minutes_per_interval:
        logRecord.fertigation_minutes_per_interval != null ? String(logRecord.fertigation_minutes_per_interval) : "",
      irrigation_intervals: logRecord.irrigation_intervals != null ? String(logRecord.irrigation_intervals) : "",
      irrigation_minutes_per_interval:
        logRecord.irrigation_minutes_per_interval != null ? String(logRecord.irrigation_minutes_per_interval) : "",
      activities: logRecord.activities || "",
    });
    setError("");
    setShowModal(true);
    navigate(createPageUrl("NurseryDailyLogs"), { replace: true });
  }, [location.search, navigate, records, showModal]);

  const filteredRecords = records.filter((record) => {
    if (fromDate && String(record.log_date || "") < fromDate) return false;
    if (toDate && String(record.log_date || "") > toDate) return false;
    return true;
  });

  const today = getToday();
  const todayRecord = records.find((record) => record.log_date === today);
  const todayFertigationIntervals = Number(todayRecord?.fertigation_intervals || 0);
  const todayIrrigationIntervals = Number(todayRecord?.irrigation_intervals || 0);

  const openCreateModal = () => {
    setEditItem(null);
    setForm(createDefaultForm());
    setError("");
    setShowModal(true);
  };

  const openEditModal = (record) => {
    setEditItem(record);
    setForm({
      log_date: record.log_date || getToday(),
      pesticide_applied: record.pesticide_applied || "",
      fungicide_applied: record.fungicide_applied || "",
      nutrients_applied: record.nutrients_applied || "",
      fertigation_intervals: record.fertigation_intervals != null ? String(record.fertigation_intervals) : "",
      fertigation_minutes_per_interval:
        record.fertigation_minutes_per_interval != null ? String(record.fertigation_minutes_per_interval) : "",
      irrigation_intervals: record.irrigation_intervals != null ? String(record.irrigation_intervals) : "",
      irrigation_minutes_per_interval:
        record.irrigation_minutes_per_interval != null ? String(record.irrigation_minutes_per_interval) : "",
      activities: record.activities || "",
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
    const fertigationIntervals = toNonNegativeInteger(form.fertigation_intervals);
    const fertigationMinutes = toNonNegativeInteger(form.fertigation_minutes_per_interval);
    const irrigationIntervals = toNonNegativeInteger(form.irrigation_intervals);
    const irrigationMinutes = toNonNegativeInteger(form.irrigation_minutes_per_interval);
    const pesticideApplied = String(form.pesticide_applied || "").trim();
    const fungicideApplied = String(form.fungicide_applied || "").trim();
    const nutrientsApplied = String(form.nutrients_applied || "").trim();
    const activities = String(form.activities || "").trim();

    if (!form.log_date) {
      return { error: "Select the log date." };
    }
    if (records.some((record) => record.id !== editItem?.id && record.log_date === form.log_date)) {
      return { error: "A nursery daily log already exists for this date." };
    }
    if ([fertigationIntervals, fertigationMinutes, irrigationIntervals, irrigationMinutes].some(Number.isNaN)) {
      return { error: "Intervals and minutes must be whole numbers of zero or more." };
    }
    if ((fertigationIntervals || 0) > 0 && !(fertigationMinutes > 0)) {
      return { error: "Enter minutes per fertigation interval." };
    }
    if ((fertigationMinutes || 0) > 0 && !(fertigationIntervals > 0)) {
      return { error: "Enter the number of fertigation intervals carried out." };
    }
    if ((irrigationIntervals || 0) > 0 && !(irrigationMinutes > 0)) {
      return { error: "Enter minutes per irrigation interval." };
    }
    if ((irrigationMinutes || 0) > 0 && !(irrigationIntervals > 0)) {
      return { error: "Enter the number of irrigation intervals carried out." };
    }

    return {
      payload: {
        log_date: form.log_date,
        pesticide_applied: pesticideApplied || null,
        fungicide_applied: fungicideApplied || null,
        nutrients_applied: nutrientsApplied || null,
        fertigation_intervals: fertigationIntervals,
        fertigation_minutes_per_interval: fertigationMinutes,
        irrigation_intervals: irrigationIntervals,
        irrigation_minutes_per_interval: irrigationMinutes,
        activities: activities || null,
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
        await base44.entities.NurseryDailyLog.update(editItem.id, payload);
      } else {
        await base44.entities.NurseryDailyLog.create(payload);
      }
      closeModal();
      await load();
    } catch (err) {
      setError(getErrorMessage(err, `Failed to ${editItem ? "update" : "create"} nursery daily log.`));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteItem) return;

    setDeleting(true);
    try {
      await base44.entities.NurseryDailyLog.delete(deleteItem.id);
      setDeleteItem(null);
      await load();
    } catch (err) {
      setLoadError(getErrorMessage(err, "Failed to delete nursery daily log."));
    } finally {
      setDeleting(false);
    }
  };

  const columns = [
    { key: "log_date", label: "Date", noWrap: true },
    {
      key: "applications",
      label: "Applications",
      render: (_value, row) => <span className="max-w-sm block">{getApplicationsSummary(row)}</span>,
    },
    {
      key: "watering",
      label: "Watering",
      render: (_value, row) => getWateringSummary(row),
    },
    {
      key: "activities",
      label: "Activities",
      render: (value) => truncateText(value || "No activity notes"),
    },
    {
      key: "actions",
      label: "", noWrap: true, align: "right",
      render: (_value, row) => (
        <RecordActions
          onEdit={() => openEditModal(row)}
          onDelete={() => setDeleteItem(row)}
          ariaLabel={`Actions for nursery log on ${row.log_date}`}
        />
      ),
    },
  ];


  return (
    <div className="p-4 md:p-6 space-y-6">
      <PageHeader
        title="Nursery Daily Logs"
        subtitle={`${records.length} log${records.length === 1 ? "" : "s"} captured for nursery operations`}
        actions={
          <Button size="sm" onClick={openCreateModal} className="gap-1.5">
            <Plus className="w-4 h-4" />
            Add Daily Log
          </Button>
        }
      />

      <ErrorBanner message={loadError} onRetry={load} />

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard
          title="Total Logs"
          value={records.length.toLocaleString()}
          subtitle={`${filteredRecords.length.toLocaleString()} in current view`}
          icon={Activity}
          color="primary"
          loading={loading}
        />
        <StatCard
          title="Today's Log"
          value={todayRecord ? "Recorded" : "Not yet"}
          subtitle={todayRecord ? `Logged on ${today}` : "No entry for today"}
          icon={CalendarDays}
          color="success"
          loading={loading}
        />
        <StatCard
          title="Fertigation Today"
          value={todayFertigationIntervals.toLocaleString()}
          subtitle="Total fertigation intervals logged"
          icon={Droplets}
          color="warning"
          loading={loading}
        />
        <StatCard
          title="Irrigation Today"
          value={todayIrrigationIntervals.toLocaleString()}
          subtitle="Total irrigation intervals logged"
          icon={Sprout}
          color="accent"
          loading={loading}
        />
      </div>

      <div className="bg-card rounded-xl border border-border p-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <FormField label="From Date">
            <Input type="date" value={fromDate} onChange={(event) => setFromDate(event.target.value)} />
          </FormField>

          <FormField label="To Date">
            <Input type="date" value={toDate} onChange={(event) => setToDate(event.target.value)} />
          </FormField>
        </div>
      </div>

      {!loading && filteredRecords.length === 0 ? (
        <EmptyState
          icon={CalendarDays}
          title="No nursery daily logs found"
          description="Capture pesticide, fungicide, nutrient, irrigation, fertigation, and activity notes for each house."
          action={<Button onClick={openCreateModal}>Add Daily Log</Button>}
        />
      ) : (
        <DataTable columns={columns} data={filteredRecords} loading={loading} onRowClick={openEditModal} />
      )}

      <Modal
        open={showModal}
        onClose={closeModal}
        title={editItem ? "Edit Nursery Daily Log" : "Add Nursery Daily Log"}
        size="lg"
      >
        <div className="space-y-4">
          <FormField label="Log Date" required>
            <Input
              type="date"
              value={form.log_date}
              onChange={(event) => setForm((prev) => ({ ...prev, log_date: event.target.value }))}
            />
          </FormField>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <FormField label="Pesticide Applied">
              <Input
                value={form.pesticide_applied}
                onChange={(event) => setForm((prev) => ({ ...prev, pesticide_applied: event.target.value }))}
                placeholder="Product or mix used"
              />
            </FormField>

            <FormField label="Fungicide Applied">
              <Input
                value={form.fungicide_applied}
                onChange={(event) => setForm((prev) => ({ ...prev, fungicide_applied: event.target.value }))}
                placeholder="Product or mix used"
              />
            </FormField>

            <FormField label="Nutrients Applied">
              <Input
                value={form.nutrients_applied}
                onChange={(event) => setForm((prev) => ({ ...prev, nutrients_applied: event.target.value }))}
                placeholder="Nutrients or feed used"
              />
            </FormField>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="rounded-xl border border-border p-4 space-y-4">
              <div>
                <h4 className="text-sm font-semibold text-foreground">Fertigation</h4>
                <p className="text-xs text-muted-foreground">Record how many intervals were carried out and minutes per interval.</p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <FormField label="Intervals">
                  <Input
                    type="number"
                    min="0"
                    step="1"
                    value={form.fertigation_intervals}
                    onChange={(event) => setForm((prev) => ({ ...prev, fertigation_intervals: event.target.value }))}
                    placeholder="0"
                  />
                </FormField>
                <FormField label="Minutes per Interval">
                  <Input
                    type="number"
                    min="0"
                    step="1"
                    value={form.fertigation_minutes_per_interval}
                    onChange={(event) =>
                      setForm((prev) => ({ ...prev, fertigation_minutes_per_interval: event.target.value }))
                    }
                    placeholder="0"
                  />
                </FormField>
              </div>
            </div>

            <div className="rounded-xl border border-border p-4 space-y-4">
              <div>
                <h4 className="text-sm font-semibold text-foreground">Irrigation</h4>
                <p className="text-xs text-muted-foreground">Record irrigation intervals and minutes for the house.</p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <FormField label="Intervals">
                  <Input
                    type="number"
                    min="0"
                    step="1"
                    value={form.irrigation_intervals}
                    onChange={(event) => setForm((prev) => ({ ...prev, irrigation_intervals: event.target.value }))}
                    placeholder="0"
                  />
                </FormField>
                <FormField label="Minutes per Interval">
                  <Input
                    type="number"
                    min="0"
                    step="1"
                    value={form.irrigation_minutes_per_interval}
                    onChange={(event) =>
                      setForm((prev) => ({ ...prev, irrigation_minutes_per_interval: event.target.value }))
                    }
                    placeholder="0"
                  />
                </FormField>
              </div>
            </div>
          </div>

          <FormField label="Daily Activity Log">
            <Textarea
              value={form.activities}
              onChange={(event) => setForm((prev) => ({ ...prev, activities: event.target.value }))}
              placeholder="Record nursery work carried out, spraying notes, observations, and any other activities."
              rows={5}
            />
          </FormField>

          {error ? <div className="rounded-lg bg-danger/10 px-4 py-2 text-sm text-danger">{error}</div> : null}

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={closeModal} disabled={saving}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? "Saving..." : editItem ? "Save Changes" : "Create Daily Log"}
            </Button>
          </div>
        </div>
      </Modal>

      <DeleteConfirmDialog
        open={!!deleteItem}
        onOpenChange={(open) => {
          if (!open) setDeleteItem(null);
        }}
        title="Delete this daily nursery log?"
        description="This will remove the selected nursery daily log for the house and date."
        loading={deleting}
        onConfirm={handleDelete}
      />
    </div>
  );
}
