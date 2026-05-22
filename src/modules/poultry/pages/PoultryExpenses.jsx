import { useEffect, useMemo, useState } from "react";
import { DollarSign, Plus } from "lucide-react";
import { useAuth } from "@/lib/AuthContext";
import { isAdminUser } from "@/lib/roles.js";
import RecordManagerPage from "@/modules/shared/RecordManagerPage.jsx";
import { getErrorMessage } from "@/lib/errors.js";
import { poultryClient } from "@/modules/poultry/services/poultryService.js";
import { formatDateLabel, normalizeOptionalValue } from "@/modules/shared/formatters.js";
import { useCurrency } from "@/components/shared/CurrencyProvider.jsx";

const initialValues = {
  flock_id: "__none__",
  expense_date: "",
  category: "",
  amount: "",
  payment_method: "cash",
  description: "",
};

const paymentMethodOptions = [
  { value: "cash", label: "Cash" },
  { value: "bank", label: "Bank" },
];

const formatPaymentMethod = (value) =>
  paymentMethodOptions.find((method) => method.value === value)?.label || "Cash";

export default function PoultryExpenses() {
  const { fmt } = useCurrency();
  const { user } = useAuth();
  const isAdmin = isAdminUser(user);
  const [flocks, setFlocks] = useState([]);
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  const load = async () => {
    try {
      setLoading(true);
      const [flockRows, expenseRows] = await Promise.all([poultryClient.flocks.list(), poultryClient.expenses.list()]);
      setFlocks(flockRows);
      setRecords(expenseRows);
      setLoadError("");
    } catch (error) {
      setLoadError(getErrorMessage(error, "Failed to load poultry expenses."));
    } finally {
      setLoading(false);
    }
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
        { key: "payment_method", label: "Payment", render: (value) => formatPaymentMethod(value) },
        { key: "description", label: "Description", render: (value) => value || "—" },
      ]}
      records={records}
      loading={loading}
      loadError={loadError}
      onRetry={load}
      summaryCards={isAdmin ? summaryCards : []}
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
        { key: "payment_method", label: "Payment method", type: "select", required: true, options: paymentMethodOptions },
        { key: "description", label: "Description", type: "textarea", fullWidth: true, placeholder: "Expense details" },
      ]}
      mapToForm={(row) => ({
        ...row,
        flock_id: row.flock_id || "__none__",
        expense_date: row.expense_date || "",
        payment_method: row.payment_method || "cash",
      })}
      buildPayload={(form) => ({
        ...form,
        flock_id: normalizeOptionalValue(form.flock_id),
        payment_method: form.payment_method || "cash",
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
