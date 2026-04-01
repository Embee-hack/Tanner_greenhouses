import { useEffect, useMemo, useState } from "react";
import { DollarSign, Plus } from "lucide-react";
import RecordManagerPage from "@/modules/shared/RecordManagerPage.jsx";
import { poultryClient } from "@/modules/poultry/services/poultryService.js";
import { formatDateLabel, normalizeOptionalValue } from "@/modules/shared/formatters.js";
import { useCurrency } from "@/components/shared/CurrencyProvider.jsx";

const initialValues = {
  flock_id: "__none__",
  expense_date: "",
  category: "",
  amount: "",
  description: "",
};

export default function PoultryExpenses() {
  const { fmt } = useCurrency();
  const [flocks, setFlocks] = useState([]);
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    const [flockRows, expenseRows] = await Promise.all([poultryClient.flocks.list(), poultryClient.expenses.list()]);
    setFlocks(flockRows);
    setRecords(expenseRows);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const flockOptions = [
    { value: "__none__", label: "General poultry expense" },
    ...flocks.map((flock) => ({ value: flock.id, label: flock.flock_code })),
  ];

  const summaryCards = useMemo(() => {
    const spend = records.reduce((sum, row) => sum + (row.amount || 0), 0);
    const categories = new Set(records.map((row) => row.category).filter(Boolean)).size;
    const flockLinked = records.filter((row) => row.flock_id).length;

    return [
      { title: "Expense Records", value: records.length, subtitle: "Captured poultry spend", icon: DollarSign, color: "primary" },
      { title: "Total Spend", value: fmt(spend), subtitle: "All poultry expenses", icon: DollarSign, color: "danger" },
      { title: "Categories", value: categories, subtitle: "Distinct spend categories", icon: DollarSign, color: "warning" },
      { title: "Flock-linked", value: flockLinked, subtitle: "Expenses tied to a flock", icon: DollarSign, color: "accent" },
    ];
  }, [fmt, records]);

  return (
    <RecordManagerPage
      title="Expenses"
      subtitle={`${records.length} poultry expense records`}
      actionLabel="Add Expense"
      actionIcon={Plus}
      columns={[
        { key: "expense_date", label: "Date", render: (value) => formatDateLabel(value) },
        { key: "category", label: "Category" },
        { key: "flock", label: "Flock", render: (_value, row) => row.flock?.flock_code || "—" },
        { key: "amount", label: "Amount", render: (value) => fmt(value) },
        { key: "description", label: "Description", render: (value) => value || "—" },
      ]}
      records={records}
      loading={loading}
      summaryCards={summaryCards}
      emptyState={{
        icon: DollarSign,
        title: "No poultry expenses yet",
        description: "Capture feed, medication, transport, and operating expenses.",
      }}
      initialValues={initialValues}
      fields={[
        { key: "flock_id", label: "Flock", type: "select", options: flockOptions },
        { key: "expense_date", label: "Expense date", type: "date", required: true },
        { key: "category", label: "Category", required: true, placeholder: "Medication" },
        { key: "amount", label: "Amount", type: "number", required: true, min: 0, step: "0.01" },
        { key: "description", label: "Description", type: "textarea", fullWidth: true, placeholder: "Expense details" },
      ]}
      mapToForm={(row) => ({
        ...row,
        flock_id: row.flock_id || "__none__",
        expense_date: row.expense_date || "",
      })}
      buildPayload={(form) => ({
        ...form,
        flock_id: normalizeOptionalValue(form.flock_id),
      })}
      onCreate={async (payload) => {
        await poultryClient.expenses.create(payload);
        await load();
      }}
      onUpdate={async (id, payload) => {
        await poultryClient.expenses.update(id, payload);
        await load();
      }}
      onDelete={async (id) => {
        await poultryClient.expenses.remove(id);
        await load();
      }}
      modalTitle={{
        create: "Add Poultry Expense",
        edit: "Edit Poultry Expense",
      }}
    />
  );
}
