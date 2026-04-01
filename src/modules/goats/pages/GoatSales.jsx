import { useEffect, useMemo, useState } from "react";
import { Plus, ShoppingCart } from "lucide-react";
import RecordManagerPage from "@/modules/shared/RecordManagerPage.jsx";
import StatusBadge from "@/components/shared/StatusBadge.jsx";
import { goatsClient } from "@/modules/goats/services/goatService.js";
import { formatDateLabel } from "@/modules/shared/formatters.js";
import { useCurrency } from "@/components/shared/CurrencyProvider.jsx";

const initialValues = {
  goat_id: "",
  sale_date: "",
  sale_type: "",
  amount: "",
  buyer: "",
  payment_status: "paid",
  notes: "",
};

export default function GoatSales() {
  const { fmt } = useCurrency();
  const [goats, setGoats] = useState([]);
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    const [goatRows, saleRows] = await Promise.all([goatsClient.registry.list(), goatsClient.sales.list()]);
    setGoats(goatRows);
    setRecords(saleRows);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const goatOptions = goats.map((goat) => ({
    value: goat.id,
    label: `${goat.tag_number}${goat.name ? ` · ${goat.name}` : ""}`,
  }));

  const summaryCards = useMemo(() => {
    const totalSales = records.reduce((sum, row) => sum + (row.amount || 0), 0);
    const paidSales = records.filter((row) => row.payment_status === "paid").length;
    const buyers = new Set(records.map((row) => row.buyer).filter(Boolean)).size;

    return [
      { title: "Sales Records", value: records.length, subtitle: "Goat sales logged", icon: ShoppingCart, color: "primary" },
      { title: "Sales Revenue", value: fmt(totalSales), subtitle: "Recorded goat sales", icon: ShoppingCart, color: "success" },
      { title: "Paid Sales", value: paidSales, subtitle: "Settled goat sales", icon: ShoppingCart, color: "accent" },
      { title: "Buyers", value: buyers, subtitle: "Distinct buyers", icon: ShoppingCart, color: "warning" },
    ];
  }, [fmt, records]);

  return (
    <RecordManagerPage
      title="Sales"
      subtitle={`${records.length} goat sales records`}
      actionLabel="Add Sale"
      actionIcon={Plus}
      columns={[
        { key: "sale_date", label: "Date", render: (value) => formatDateLabel(value) },
        { key: "goat", label: "Goat", render: (_value, row) => row.goat?.tag_number || "—" },
        { key: "sale_type", label: "Sale Type", render: (value) => value || "—" },
        { key: "amount", label: "Amount", render: (value) => fmt(value) },
        { key: "buyer", label: "Buyer", render: (value) => value || "—" },
        { key: "payment_status", label: "Payment", render: (value) => <StatusBadge status={value} /> },
      ]}
      records={records}
      loading={loading}
      summaryCards={summaryCards}
      emptyState={{
        icon: ShoppingCart,
        title: "No goat sales recorded",
        description: "Track live sales and other goat-related revenue.",
      }}
      initialValues={initialValues}
      fields={[
        { key: "goat_id", label: "Goat", type: "select", required: true, options: goatOptions },
        { key: "sale_date", label: "Sale date", type: "date", required: true },
        { key: "sale_type", label: "Sale type", placeholder: "Live sale" },
        { key: "amount", label: "Amount", type: "number", required: true, min: 0, step: "0.01" },
        { key: "buyer", label: "Buyer", placeholder: "Buyer name" },
        {
          key: "payment_status",
          label: "Payment status",
          type: "select",
          options: [
            { value: "paid", label: "Paid" },
            { value: "pending", label: "Pending" },
            { value: "partial", label: "Partial" },
          ],
        },
        { key: "notes", label: "Notes", type: "textarea", fullWidth: true, placeholder: "Optional sale notes" },
      ]}
      mapToForm={(row) => ({
        ...row,
        goat_id: row.goat_id || "",
        sale_date: row.sale_date || "",
      })}
      onCreate={async (payload) => {
        await goatsClient.sales.create(payload);
        await load();
      }}
      onUpdate={async (id, payload) => {
        await goatsClient.sales.update(id, payload);
        await load();
      }}
      onDelete={async (id) => {
        await goatsClient.sales.remove(id);
        await load();
      }}
      modalTitle={{
        create: "Add Goat Sale",
        edit: "Edit Goat Sale",
      }}
    />
  );
}
