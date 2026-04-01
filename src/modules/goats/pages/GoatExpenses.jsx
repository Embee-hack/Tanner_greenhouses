import { useEffect, useMemo, useState } from "react";
import { DollarSign, Plus } from "lucide-react";
import RecordManagerPage from "@/modules/shared/RecordManagerPage.jsx";
import { goatsClient } from "@/modules/goats/services/goatService.js";
import { formatDateLabel, normalizeOptionalValue } from "@/modules/shared/formatters.js";
import { useCurrency } from "@/components/shared/CurrencyProvider.jsx";

const initialValues = {
  goat_id: "__none__",
  pen_id: "__none__",
  expense_date: "",
  category: "",
  amount: "",
  description: "",
};

export default function GoatExpenses() {
  const { fmt } = useCurrency();
  const [goats, setGoats] = useState([]);
  const [pens, setPens] = useState([]);
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    const [goatRows, penRows, expenseRows] = await Promise.all([
      goatsClient.registry.list(),
      goatsClient.pens.list(),
      goatsClient.expenses.list(),
    ]);
    setGoats(goatRows);
    setPens(penRows);
    setRecords(expenseRows);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const goatOptions = [
    { value: "__none__", label: "No individual goat" },
    ...goats.map((goat) => ({ value: goat.id, label: `${goat.tag_number}${goat.name ? ` · ${goat.name}` : ""}` })),
  ];

  const penOptions = [
    { value: "__none__", label: "No pen" },
    ...pens.map((pen) => ({ value: pen.id, label: pen.name })),
  ];

  const summaryCards = useMemo(() => {
    const totalSpend = records.reduce((sum, row) => sum + (row.amount || 0), 0);
    const categories = new Set(records.map((row) => row.category).filter(Boolean)).size;
    const linkedGoats = records.filter((row) => row.goat_id).length;

    return [
      { title: "Expense Records", value: records.length, subtitle: "Goat operation spend captured", icon: DollarSign, color: "primary" },
      { title: "Total Spend", value: fmt(totalSpend), subtitle: "All goat expenses", icon: DollarSign, color: "danger" },
      { title: "Categories", value: categories, subtitle: "Distinct expense categories", icon: DollarSign, color: "warning" },
      { title: "Goat-linked", value: linkedGoats, subtitle: "Expenses tied to a goat", icon: DollarSign, color: "accent" },
    ];
  }, [fmt, records]);

  return (
    <RecordManagerPage
      title="Expenses"
      subtitle={`${records.length} goat expense records`}
      actionLabel="Add Expense"
      actionIcon={Plus}
      columns={[
        { key: "expense_date", label: "Date", render: (value) => formatDateLabel(value) },
        { key: "category", label: "Category" },
        { key: "goat", label: "Goat", render: (_value, row) => row.goat?.tag_number || "—" },
        { key: "pen", label: "Pen", render: (_value, row) => row.pen?.name || "—" },
        { key: "amount", label: "Amount", render: (value) => fmt(value) },
      ]}
      records={records}
      loading={loading}
      summaryCards={summaryCards}
      emptyState={{
        icon: DollarSign,
        title: "No goat expenses yet",
        description: "Track medicine, feed, labor, and pen-related expenses.",
      }}
      initialValues={initialValues}
      fields={[
        { key: "goat_id", label: "Goat", type: "select", options: goatOptions },
        { key: "pen_id", label: "Pen", type: "select", options: penOptions },
        { key: "expense_date", label: "Expense date", type: "date", required: true },
        { key: "category", label: "Category", required: true, placeholder: "Veterinary" },
        { key: "amount", label: "Amount", type: "number", required: true, min: 0, step: "0.01" },
        { key: "description", label: "Description", type: "textarea", fullWidth: true, placeholder: "Expense details" },
      ]}
      mapToForm={(row) => ({
        ...row,
        goat_id: row.goat_id || "__none__",
        pen_id: row.pen_id || "__none__",
        expense_date: row.expense_date || "",
      })}
      buildPayload={(form) => ({
        ...form,
        goat_id: normalizeOptionalValue(form.goat_id),
        pen_id: normalizeOptionalValue(form.pen_id),
      })}
      onCreate={async (payload) => {
        await goatsClient.expenses.create(payload);
        await load();
      }}
      onUpdate={async (id, payload) => {
        await goatsClient.expenses.update(id, payload);
        await load();
      }}
      onDelete={async (id) => {
        await goatsClient.expenses.remove(id);
        await load();
      }}
      modalTitle={{
        create: "Add Goat Expense",
        edit: "Edit Goat Expense",
      }}
    />
  );
}
