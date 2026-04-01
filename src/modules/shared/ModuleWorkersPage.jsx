import { useEffect, useMemo, useState } from "react";
import { BriefcaseBusiness, Plus, UserCheck, Users, Wallet } from "lucide-react";
import { base44 } from "@/api/base44Client";
import StatusBadge from "@/components/shared/StatusBadge.jsx";
import { useCurrency } from "@/components/shared/CurrencyProvider.jsx";
import RecordManagerPage from "@/modules/shared/RecordManagerPage.jsx";
import { formatDateLabel, normalizeOptionalValue } from "@/modules/shared/formatters.js";

const WORKER_STATUS_OPTIONS = [
  { value: "active", label: "Active" },
  { value: "inactive", label: "Inactive" },
  { value: "on_leave", label: "On leave" },
  { value: "terminated", label: "Terminated" },
];

export default function ModuleWorkersPage({
  entityName,
  moduleLabel,
  assignmentField,
  assignmentLabel,
  assignmentOptions,
  defaultRole,
  rolePlaceholder,
}) {
  const { fmt } = useCurrency();
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    const rows = await base44.entities[entityName].list("-hire_date", 200);
    setRecords(rows);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const assignmentMap = useMemo(
    () => Object.fromEntries(assignmentOptions.map((option) => [option.value, option.label])),
    [assignmentOptions]
  );

  const summaryCards = useMemo(() => {
    const activeWorkers = records.filter((record) => record.status === "active").length;
    const assignedWorkers = records.filter((record) => record[assignmentField]).length;
    const monthlyPayroll = records
      .filter((record) => record.status === "active")
      .reduce((sum, record) => sum + (record.salary || 0), 0);
    const onLeaveWorkers = records.filter((record) => record.status === "on_leave").length;

    return [
      { title: "Total Workers", value: records.length, subtitle: `${moduleLabel} team members`, icon: Users, color: "primary" },
      { title: "Active Workers", value: activeWorkers, subtitle: "Currently on duty", icon: UserCheck, color: "success" },
      { title: "Monthly Payroll", value: fmt(monthlyPayroll), subtitle: "Active worker salaries", icon: Wallet, color: "accent" },
      { title: "Assigned Workers", value: assignedWorkers, subtitle: `Assigned to a ${assignmentLabel.toLowerCase()}`, icon: BriefcaseBusiness, color: "warning" },
    ];
  }, [assignmentField, assignmentLabel, fmt, moduleLabel, records]);

  return (
    <RecordManagerPage
      title="Workers"
      subtitle={`${records.length} ${moduleLabel.toLowerCase()} worker records`}
      actionLabel="Add Worker"
      actionIcon={Plus}
      columns={[
        { key: "full_name", label: "Name" },
        { key: "role", label: "Role", render: (value) => value || "—" },
        {
          key: assignmentField,
          label: assignmentLabel,
          render: (value) => assignmentMap[value] || "—",
        },
        { key: "phone", label: "Phone", render: (value) => value || "—" },
        { key: "status", label: "Status", render: (value) => <StatusBadge status={value} /> },
        { key: "salary", label: "Salary", render: (value) => (value ? fmt(value) : "—") },
        { key: "hire_date", label: "Hire Date", render: (value) => formatDateLabel(value) },
      ]}
      records={records}
      loading={loading}
      summaryCards={summaryCards}
      emptyState={{
        icon: Users,
        title: `No ${moduleLabel.toLowerCase()} workers yet`,
        description: `Add workers and assign them to a ${assignmentLabel.toLowerCase()} when needed.`,
      }}
      initialValues={{
        full_name: "",
        role: defaultRole,
        phone: "",
        [assignmentField]: "__none__",
        status: "active",
        salary: "",
        hire_date: "",
        notes: "",
      }}
      fields={[
        { key: "full_name", label: "Full name", required: true, placeholder: "Enter worker name" },
        { key: "role", label: "Role", required: true, placeholder: rolePlaceholder },
        { key: "phone", label: "Phone", placeholder: "+234..." },
        {
          key: assignmentField,
          label: assignmentLabel,
          type: "select",
          options: [{ value: "__none__", label: `No ${assignmentLabel.toLowerCase()} assigned` }, ...assignmentOptions],
        },
        {
          key: "status",
          label: "Status",
          type: "select",
          options: WORKER_STATUS_OPTIONS,
        },
        { key: "salary", label: "Monthly salary", type: "number", min: 0, step: "0.01", placeholder: "0.00" },
        { key: "hire_date", label: "Hire date", type: "date" },
        { key: "notes", label: "Notes", type: "textarea", fullWidth: true, placeholder: "Optional worker notes" },
      ]}
      mapToForm={(row) => ({
        ...row,
        [assignmentField]: row[assignmentField] || "__none__",
        salary: row.salary != null ? String(row.salary) : "",
        hire_date: row.hire_date || "",
      })}
      buildPayload={(form) => ({
        ...form,
        [assignmentField]: normalizeOptionalValue(form[assignmentField]),
        salary: form.salary === "" || form.salary == null ? null : Number(form.salary),
      })}
      prepareDuplicateForm={(form) => ({
        ...form,
        full_name: form.full_name ? `${form.full_name} Copy` : "",
        phone: "",
      })}
      onCreate={async (payload) => {
        await base44.entities[entityName].create(payload);
        await load();
      }}
      onUpdate={async (id, payload) => {
        await base44.entities[entityName].update(id, payload);
        await load();
      }}
      onDelete={async (id) => {
        await base44.entities[entityName].delete(id);
        await load();
      }}
      modalTitle={{
        create: `Add ${moduleLabel} Worker`,
        edit: `Edit ${moduleLabel} Worker`,
        duplicate: `Duplicate ${moduleLabel} Worker`,
      }}
    />
  );
}
