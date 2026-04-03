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
import StatCard from "@/components/dashboard/StatCard.jsx";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useCurrency } from "@/components/shared/CurrencyProvider.jsx";
import { getErrorMessage } from "@/lib/errors.js";
import { createPageUrl } from "@/utils";
import {
  CalendarDays,
  CheckCircle2,
  CircleDashed,
  AlertTriangle,
  Plus,
  Pencil,
  Trash2,
  Users,
} from "lucide-react";

const ATTENDANCE_STATUS_OPTIONS = [
  { value: "present", label: "Present" },
  { value: "late", label: "Late" },
  { value: "absent", label: "Absent" },
  { value: "off_day", label: "Off day" },
  { value: "leave", label: "Leave" },
  { value: "excused", label: "Excused" },
];

const ALL_WORKERS_VALUE = "__all_workers__";
const ALL_STATUSES_VALUE = "__all_statuses__";
const NO_GREENHOUSE_VALUE = "__none__";
const UNMARKED_STATUS = "__unmarked__";

const getToday = () => new Date().toISOString().slice(0, 10);

const createDefaultForm = () => ({
  worker_id: "",
  greenhouse_id: NO_GREENHOUSE_VALUE,
  date: getToday(),
  status: "present",
  check_in_time: "",
  check_out_time: "",
  notes: "",
});

const humanizeText = (value) =>
  String(value || "")
    .replace(/_/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());

const supportsTimeTracking = (status) => status === "present" || status === "late";
const isOnDutyStatus = (status) => status === "present" || status === "late";
const isOffStatus = (status) => status === "off_day" || status === "leave" || status === "excused";
const issueKey = (workerId, date) => `${workerId || ""}::${date || ""}`;

export default function WorkerAttendance() {
  const { fmt } = useCurrency();
  const location = useLocation();
  const navigate = useNavigate();
  const [records, setRecords] = useState([]);
  const [workers, setWorkers] = useState([]);
  const [greenhouses, setGreenhouses] = useState([]);
  const [grievances, setGrievances] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [showSheetModal, setShowSheetModal] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [deleteItem, setDeleteItem] = useState(null);
  const [form, setForm] = useState(createDefaultForm());
  const [sheetDate, setSheetDate] = useState(getToday());
  const [sheetRows, setSheetRows] = useState([]);
  const [saving, setSaving] = useState(false);
  const [sheetSaving, setSheetSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState("");
  const [workerFilter, setWorkerFilter] = useState(ALL_WORKERS_VALUE);
  const [statusFilter, setStatusFilter] = useState(ALL_STATUSES_VALUE);
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");

  const load = async () => {
    try {
      setLoading(true);
      const [attendanceRows, workerRows, greenhouseRows, grievanceRows] = await Promise.all([
        base44.entities.WorkerAttendance.list("-date", 1200),
        base44.entities.Worker.list(),
        base44.entities.Greenhouse.list("code"),
        base44.entities.WorkerGrievance.list("-date", 800),
      ]);
      setRecords(attendanceRows);
      setWorkers(workerRows);
      setGreenhouses(greenhouseRows);
      setGrievances(grievanceRows);
      setLoadError("");
    } catch (err) {
      setLoadError(getErrorMessage(err, "Failed to load worker attendance."));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    const attendanceId = new URLSearchParams(location.search).get("attendance");
    if (!attendanceId || records.length === 0 || showModal) return;

    const record = records.find((item) => item.id === attendanceId);
    if (!record) return;

    setEditItem(record);
    setForm({
      worker_id: record.worker_id || "",
      greenhouse_id: record.greenhouse_id || NO_GREENHOUSE_VALUE,
      date: record.date || getToday(),
      status: record.status || "present",
      check_in_time: record.check_in_time || "",
      check_out_time: record.check_out_time || "",
      notes: record.notes || "",
    });
    setError("");
    setShowModal(true);
    navigate(createPageUrl("WorkerAttendance"), { replace: true });
  }, [location.search, navigate, records, showModal]);

  const workerMap = Object.fromEntries(workers.map((worker) => [worker.id, worker]));
  const greenhouseMap = Object.fromEntries(greenhouses.map((greenhouse) => [greenhouse.id, greenhouse]));
  const attendanceWorkers = [...workers]
    .filter((worker) => worker.status !== "terminated")
    .sort((a, b) => String(a.full_name || "").localeCompare(String(b.full_name || "")));

  const issueSummaryByDay = grievances.reduce((accumulator, grievance) => {
    const key = issueKey(grievance.worker_id, grievance.date);
    if (!accumulator[key]) {
      accumulator[key] = { count: 0, surcharge: 0, unresolved: 0 };
    }
    accumulator[key].count += 1;
    accumulator[key].surcharge += Number(grievance.surcharge_amount || 0);
    if (!["resolved", "waived"].includes(String(grievance.status || "").trim().toLowerCase())) {
      accumulator[key].unresolved += 1;
    }
    return accumulator;
  }, {});

  const filteredRecords = records.filter((record) => {
    if (workerFilter !== ALL_WORKERS_VALUE && record.worker_id !== workerFilter) return false;
    if (statusFilter !== ALL_STATUSES_VALUE && record.status !== statusFilter) return false;
    if (fromDate && String(record.date || "") < fromDate) return false;
    if (toDate && String(record.date || "") > toDate) return false;
    return true;
  });

  const today = getToday();
  const todayRecords = records.filter((record) => record.date === today);
  const todayOnDuty = todayRecords.filter((record) => isOnDutyStatus(record.status)).length;
  const todayLate = todayRecords.filter((record) => record.status === "late").length;
  const todayOff = todayRecords.filter((record) => isOffStatus(record.status)).length;
  const todayIssues = grievances.filter((grievance) => grievance.date === today).length;

  const buildSheetRows = (date) =>
    attendanceWorkers.map((worker) => {
      const matches = records
        .filter((record) => record.worker_id === worker.id && record.date === date)
        .sort((a, b) => String(b.updated_date || "").localeCompare(String(a.updated_date || "")));
      const existing = matches[0];
      return {
        worker_id: worker.id,
        worker_name: worker.full_name || "Unnamed worker",
        role: worker.role || "",
        greenhouse_id: existing?.greenhouse_id || worker.greenhouse_id || "",
        status: existing?.status || (worker.status === "on_leave" ? "leave" : UNMARKED_STATUS),
        check_in_time: existing?.check_in_time || "",
        check_out_time: existing?.check_out_time || "",
        notes: existing?.notes || "",
        existing_ids: matches.map((record) => record.id),
      };
    });

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
      greenhouse_id: record.greenhouse_id || NO_GREENHOUSE_VALUE,
      date: record.date || getToday(),
      status: record.status || "present",
      check_in_time: record.check_in_time || "",
      check_out_time: record.check_out_time || "",
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

  const openSheetModal = () => {
    const initialDate = getToday();
    setSheetDate(initialDate);
    setSheetRows(buildSheetRows(initialDate));
    setError("");
    setShowSheetModal(true);
  };

  const closeSheetModal = () => {
    setShowSheetModal(false);
    setSheetRows([]);
    setError("");
  };

  const buildPayload = (values) => {
    const worker = workerMap[values.worker_id];
    const resolvedGreenhouseId =
      values.greenhouse_id && values.greenhouse_id !== NO_GREENHOUSE_VALUE
        ? values.greenhouse_id
        : worker?.greenhouse_id || null;
    const greenhouse = greenhouseMap[resolvedGreenhouseId];
    const status = values.status;

    return {
      worker_id: values.worker_id,
      worker_name: worker?.full_name || values.worker_name || "",
      name: worker?.full_name || values.worker_name || "",
      greenhouse_id: resolvedGreenhouseId,
      greenhouse_code: greenhouse?.code || "",
      date: values.date,
      status,
      check_in_time: supportsTimeTracking(status) ? values.check_in_time || null : null,
      check_out_time: supportsTimeTracking(status) ? values.check_out_time || null : null,
      notes: String(values.notes || "").trim() || null,
    };
  };

  const handleSave = async () => {
    if (!form.worker_id || !form.date || !form.status) return;

    setSaving(true);
    setError("");
    try {
      const payload = buildPayload(form);
      const duplicates = records
        .filter((record) => record.worker_id === form.worker_id && record.date === form.date && record.id !== editItem?.id)
        .sort((a, b) => String(b.updated_date || "").localeCompare(String(a.updated_date || "")));

      if (editItem) {
        await base44.entities.WorkerAttendance.update(editItem.id, payload);
        if (duplicates.length > 0) {
          await base44.entities.WorkerAttendance.delete(duplicates.map((record) => record.id));
        }
      } else if (duplicates.length > 0) {
        await base44.entities.WorkerAttendance.update(duplicates[0].id, payload);
        if (duplicates.length > 1) {
          await base44.entities.WorkerAttendance.delete(duplicates.slice(1).map((record) => record.id));
        }
      } else {
        await base44.entities.WorkerAttendance.create(payload);
      }

      closeModal();
      await load();
    } catch (err) {
      setError(getErrorMessage(err, "Failed to save attendance record."));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteItem) return;
    setDeleting(true);
    try {
      await base44.entities.WorkerAttendance.delete(deleteItem.id);
      setDeleteItem(null);
      if (editItem?.id === deleteItem.id) {
        closeModal();
      }
      await load();
    } catch (err) {
      setLoadError(getErrorMessage(err, "Failed to delete attendance record."));
    } finally {
      setDeleting(false);
    }
  };

  const updateSheetRow = (workerId, patch) => {
    setSheetRows((current) =>
      current.map((row) => {
        if (row.worker_id !== workerId) return row;
        const next = { ...row, ...patch };
        if (!supportsTimeTracking(next.status)) {
          next.check_in_time = "";
          next.check_out_time = "";
        }
        return next;
      })
    );
  };

  const applySheetStatus = (status) => {
    setSheetRows((current) =>
      current.map((row) => ({
        ...row,
        status,
        check_in_time: supportsTimeTracking(status) ? row.check_in_time : "",
        check_out_time: supportsTimeTracking(status) ? row.check_out_time : "",
      }))
    );
  };

  const handleSheetSave = async () => {
    setSheetSaving(true);
    setError("");
    try {
      const operations = [];

      sheetRows.forEach((row) => {
        const existingIds = row.existing_ids || [];
        if (row.status === UNMARKED_STATUS) {
          if (existingIds.length > 0) {
            operations.push(base44.entities.WorkerAttendance.delete(existingIds));
          }
          return;
        }

        const payload = buildPayload({ ...row, date: sheetDate });
        if (existingIds.length > 0) {
          operations.push(base44.entities.WorkerAttendance.update(existingIds[0], payload));
          if (existingIds.length > 1) {
            operations.push(base44.entities.WorkerAttendance.delete(existingIds.slice(1)));
          }
        } else {
          operations.push(base44.entities.WorkerAttendance.create(payload));
        }
      });

      if (operations.length === 0) {
        setError("Mark at least one worker before saving the attendance sheet.");
        setSheetSaving(false);
        return;
      }

      await Promise.all(operations);
      closeSheetModal();
      await load();
    } catch (err) {
      setError(getErrorMessage(err, "Failed to save the daily attendance sheet."));
    } finally {
      setSheetSaving(false);
    }
  };

  const columns = [
    { key: "date", label: "Date" },
    {
      key: "worker_id",
      label: "Worker",
      render: (_, row) => workerMap[row.worker_id]?.full_name || row.worker_name || "—",
    },
    {
      key: "greenhouse_id",
      label: "House",
      render: (_, row) => greenhouseMap[row.greenhouse_id]?.code || row.greenhouse_code || "—",
    },
    { key: "status", label: "Status", render: (value) => <StatusBadge status={value} /> },
    { key: "check_in_time", label: "Check In", render: (value) => value || "—" },
    { key: "check_out_time", label: "Check Out", render: (value) => value || "—" },
    {
      key: "issues",
      label: "Issues",
      render: (_, row) => {
        const summary = issueSummaryByDay[issueKey(row.worker_id, row.date)];
        if (!summary) return "—";
        return `${summary.count} issue${summary.count === 1 ? "" : "s"} · ${fmt(summary.surcharge)}`;
      },
    },
    { key: "notes", label: "Notes", render: (value) => value || "—" },
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
    <div className="p-4 md:p-6 space-y-6">
      <PageHeader
        title="Attendance Sheet"
        subtitle={`${records.length} attendance entries recorded`}
        actions={
          <>
            <Button size="sm" variant="outline" onClick={openSheetModal} className="gap-1.5">
              <CalendarDays className="w-4 h-4" /> Mark Daily Sheet
            </Button>
            <Button size="sm" onClick={openCreateModal} className="gap-1.5">
              <Plus className="w-4 h-4" /> Add Attendance
            </Button>
          </>
        }
      />

      <ErrorBanner message={loadError} onRetry={load} />

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard title="Marked Today" value={todayRecords.length} subtitle="Workers recorded today" icon={Users} color="primary" loading={loading} />
        <StatCard title="On Duty Today" value={todayOnDuty} subtitle={todayLate > 0 ? `${todayLate} late arrival${todayLate === 1 ? "" : "s"}` : "Present and late combined"} icon={CheckCircle2} color="success" loading={loading} />
        <StatCard title="Off Today" value={todayOff} subtitle="Off days, leave, and excused" icon={CircleDashed} color="accent" loading={loading} />
        <StatCard title="Issues Logged Today" value={todayIssues} subtitle="Attendance-linked worker issues" icon={AlertTriangle} color="warning" loading={loading} />
      </div>

      <div className="bg-card border border-border rounded-2xl p-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <FormField label="Worker">
            <Select value={workerFilter} onValueChange={setWorkerFilter}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL_WORKERS_VALUE}>All workers</SelectItem>
                {attendanceWorkers.map((worker) => (
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
                {ATTENDANCE_STATUS_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FormField>
          <FormField label="From">
            <Input type="date" value={fromDate} onChange={(event) => setFromDate(event.target.value)} />
          </FormField>
          <FormField label="To">
            <Input type="date" value={toDate} onChange={(event) => setToDate(event.target.value)} />
          </FormField>
        </div>
      </div>

      {!loading && filteredRecords.length === 0 ? (
        <EmptyState
          icon={CalendarDays}
          title="No attendance records yet"
          description="Use the daily sheet to mark workers present, absent, off, or on leave."
          action={<Button onClick={openSheetModal}><CalendarDays className="w-4 h-4 mr-1" />Mark Daily Sheet</Button>}
        />
      ) : (
        <DataTable columns={columns} data={filteredRecords} loading={loading} />
      )}

      <Modal open={showModal} onClose={closeModal} title={editItem ? "Edit Attendance" : "Add Attendance"}>
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField label="Worker" required>
              <Select
                value={form.worker_id}
                onValueChange={(value) => {
                  const worker = workerMap[value];
                  setForm((current) => ({
                    ...current,
                    worker_id: value,
                    greenhouse_id: worker?.greenhouse_id || NO_GREENHOUSE_VALUE,
                  }));
                }}
              >
                <SelectTrigger><SelectValue placeholder="Select worker" /></SelectTrigger>
                <SelectContent>
                  {attendanceWorkers.map((worker) => (
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
            <FormField label="Status" required>
              <Select
                value={form.status}
                onValueChange={(value) =>
                  setForm((current) => ({
                    ...current,
                    status: value,
                    check_in_time: supportsTimeTracking(value) ? current.check_in_time : "",
                    check_out_time: supportsTimeTracking(value) ? current.check_out_time : "",
                  }))
                }
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {ATTENDANCE_STATUS_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FormField>
            <FormField label="House">
              <Select value={form.greenhouse_id || NO_GREENHOUSE_VALUE} onValueChange={(value) => setForm((current) => ({ ...current, greenhouse_id: value }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value={NO_GREENHOUSE_VALUE}>Use assigned house</SelectItem>
                  {greenhouses.map((greenhouse) => (
                    <SelectItem key={greenhouse.id} value={greenhouse.id}>{greenhouse.code}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FormField>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField label="Check In">
              <Input
                type="time"
                value={form.check_in_time}
                onChange={(event) => setForm((current) => ({ ...current, check_in_time: event.target.value }))}
                disabled={!supportsTimeTracking(form.status)}
              />
            </FormField>
            <FormField label="Check Out">
              <Input
                type="time"
                value={form.check_out_time}
                onChange={(event) => setForm((current) => ({ ...current, check_out_time: event.target.value }))}
                disabled={!supportsTimeTracking(form.status)}
              />
            </FormField>
          </div>

          <FormField label="Notes">
            <Textarea
              value={form.notes}
              onChange={(event) => setForm((current) => ({ ...current, notes: event.target.value }))}
              className="h-20 resize-none"
              placeholder="Optional attendance note"
            />
          </FormField>

          {error ? <div className="bg-danger/10 text-danger text-sm rounded-lg px-4 py-2">{error}</div> : null}

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={closeModal}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving || !form.worker_id || !form.date || !form.status}>
              {saving ? "Saving..." : editItem ? "Save Changes" : "Add Attendance"}
            </Button>
          </div>
        </div>
      </Modal>

      <Modal open={showSheetModal} onClose={closeSheetModal} title="Daily Attendance Sheet" size="xl">
        <div className="space-y-4">
          <div className="flex flex-col lg:flex-row lg:items-end gap-3">
            <FormField label="Attendance Date" required className="lg:min-w-[220px]">
              <Input
                type="date"
                value={sheetDate}
                onChange={(event) => {
                  const nextDate = event.target.value;
                  setSheetDate(nextDate);
                  setSheetRows(buildSheetRows(nextDate));
                }}
              />
            </FormField>
            <div className="flex flex-wrap gap-2">
              <Button type="button" variant="outline" onClick={() => applySheetStatus("present")}>Mark all present</Button>
              <Button type="button" variant="outline" onClick={() => applySheetStatus("off_day")}>Mark all off</Button>
              <Button type="button" variant="ghost" onClick={() => applySheetStatus(UNMARKED_STATUS)}>Clear all</Button>
            </div>
          </div>

          <div className="rounded-xl border border-border bg-muted/20 px-4 py-3">
            <p className="text-sm font-medium text-foreground">
              {sheetRows.filter((row) => row.status !== UNMARKED_STATUS).length} worker{sheetRows.filter((row) => row.status !== UNMARKED_STATUS).length === 1 ? "" : "s"} marked for {sheetDate}.
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Use "Mark all present" as a starting point, then change absent, leave, or off-day workers before saving.
            </p>
          </div>

          <div className="space-y-3 max-h-[55vh] overflow-y-auto pr-1">
            {sheetRows.length === 0 ? (
              <div className="rounded-xl border border-border px-4 py-6 text-sm text-muted-foreground text-center">
                No workers available for attendance yet.
              </div>
            ) : (
              sheetRows.map((row) => {
                const worker = workerMap[row.worker_id];
                const summary = issueSummaryByDay[issueKey(row.worker_id, sheetDate)];
                return (
                  <div key={row.worker_id} className="rounded-xl border border-border p-4 space-y-3">
                    <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-2">
                      <div>
                        <div className="font-semibold text-foreground">{row.worker_name}</div>
                        <div className="text-xs text-muted-foreground">
                          {humanizeText(row.role || worker?.role || "worker")}
                          {greenhouseMap[row.greenhouse_id]?.code || worker?.greenhouse_id
                            ? ` • ${greenhouseMap[row.greenhouse_id]?.code || greenhouseMap[worker?.greenhouse_id]?.code || "Assigned house"}`
                            : ""}
                        </div>
                      </div>
                      {summary ? (
                        <div className="text-xs text-warning font-medium">
                          {summary.count} issue{summary.count === 1 ? "" : "s"} on this date
                        </div>
                      ) : null}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                      <FormField label="Status" required>
                        <Select value={row.status} onValueChange={(value) => updateSheetRow(row.worker_id, { status: value })}>
                          <SelectTrigger><SelectValue placeholder="Not marked" /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value={UNMARKED_STATUS}>Not marked</SelectItem>
                            {ATTENDANCE_STATUS_OPTIONS.map((option) => (
                              <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </FormField>
                      <FormField label="Check In">
                        <Input
                          type="time"
                          value={row.check_in_time}
                          onChange={(event) => updateSheetRow(row.worker_id, { check_in_time: event.target.value })}
                          disabled={!supportsTimeTracking(row.status)}
                        />
                      </FormField>
                      <FormField label="Check Out">
                        <Input
                          type="time"
                          value={row.check_out_time}
                          onChange={(event) => updateSheetRow(row.worker_id, { check_out_time: event.target.value })}
                          disabled={!supportsTimeTracking(row.status)}
                        />
                      </FormField>
                      <FormField label="House">
                        <Select value={row.greenhouse_id || NO_GREENHOUSE_VALUE} onValueChange={(value) => updateSheetRow(row.worker_id, { greenhouse_id: value === NO_GREENHOUSE_VALUE ? "" : value })}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value={NO_GREENHOUSE_VALUE}>Use assigned house</SelectItem>
                            {greenhouses.map((greenhouse) => (
                              <SelectItem key={greenhouse.id} value={greenhouse.id}>{greenhouse.code}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </FormField>
                    </div>

                    <FormField label="Notes">
                      <Input
                        value={row.notes}
                        onChange={(event) => updateSheetRow(row.worker_id, { notes: event.target.value })}
                        placeholder="Optional note for this worker"
                      />
                    </FormField>
                  </div>
                );
              })
            )}
          </div>

          {error ? <div className="bg-danger/10 text-danger text-sm rounded-lg px-4 py-2">{error}</div> : null}

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={closeSheetModal}>Cancel</Button>
            <Button onClick={handleSheetSave} disabled={sheetSaving || sheetRows.length === 0}>
              {sheetSaving ? "Saving..." : "Save Attendance Sheet"}
            </Button>
          </div>
        </div>
      </Modal>

      <DeleteConfirmDialog
        open={!!deleteItem}
        onOpenChange={(open) => {
          if (!open) setDeleteItem(null);
        }}
        title="Delete this attendance record?"
        description="This attendance entry will be removed from the sheet."
        confirmLabel="Delete Attendance"
        loading={deleting}
        onConfirm={handleDelete}
      />
    </div>
  );
}
