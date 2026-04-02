import { useEffect, useMemo, useState } from "react";
import { Plus, ShoppingCart } from "lucide-react";
import { useAuth } from "@/lib/AuthContext";
import { isAdminUser } from "@/lib/roles.js";
import RecordManagerPage from "@/modules/shared/RecordManagerPage.jsx";
import StatusBadge from "@/components/shared/StatusBadge.jsx";
import { getErrorMessage } from "@/lib/errors.js";
import { poultryClient } from "@/modules/poultry/services/poultryService.js";
import { formatDateLabel, normalizeOptionalValue } from "@/modules/shared/formatters.js";
import { useCurrency } from "@/components/shared/CurrencyProvider.jsx";

const initialValues = {
  flock_id: "__none__",
  sale_date: "",
  sale_type: "eggs",
  quantity: "",
  unit_price: "",
  total_amount: "",
  buyer: "",
  payment_status: "paid",
  notes: "",
};

export default function PoultrySales() {
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
      const [flockRows, saleRows] = await Promise.all([poultryClient.flocks.list(), poultryClient.sales.list()]);
      setFlocks(flockRows);
      setRecords(saleRows);
      setLoadError("");
    } catch (error) {
      setLoadError(getErrorMessage(error, "Failed to load poultry sales."));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const flockOptions = [
    { value: "__none__", label: "No flock linked" },
    ...flocks.map((flock) => ({ value: flock.id, label: flock.flock_code })),
  ];

  const summaryCards = useMemo(() => {
    const revenue = records.reduce((sum, row) => sum + (row.total_amount || 0), 0);
    const paidSales = records.filter((row) => row.payment_status === "paid").length;
    const buyers = new Set(records.map((row) => row.buyer).filter(Boolean)).size;

    return [
      { title: "Sales Records", value: records.length, subtitle: "Egg, bird, and manure sales", icon: ShoppingCart, color: "primary" },
      { title: "Total Revenue", value: fmt(revenue), subtitle: "Recorded poultry sales", icon: ShoppingCart, color: "success" },
      { title: "Paid Sales", value: paidSales, subtitle: "Settled transactions", icon: ShoppingCart, color: "accent" },
      { title: "Buyers", value: buyers, subtitle: "Distinct customers", icon: ShoppingCart, color: "warning" },
    ];
  }, [fmt, records]);

  return (
    <RecordManagerPage
      title="Sales"
      subtitle={`${records.length} poultry sales entries`}
      actionLabel="Add Sale"
      actionIcon={Plus}
      columns={[
        { key: "sale_date", label: "Date", render: (value) => formatDateLabel(value) },
        { key: "sale_type", label: "Sale Type", render: (value) => value?.replace(/_/g, " ") || "—" },
        { key: "flock", label: "Flock", render: (_value, row) => row.flock?.flock_code || "—" },
        { key: "total_amount", label: "Total", render: (value) => fmt(value) },
        { key: "buyer", label: "Buyer", render: (value) => value || "—" },
        { key: "payment_status", label: "Payment", render: (value) => <StatusBadge status={value} /> },
      ]}
      records={records}
      loading={loading}
      loadError={loadError}
      onRetry={load}
      summaryCards={isAdmin ? summaryCards : []}
      emptyState={{
        icon: ShoppingCart,
        title: "No poultry sales yet",
        description: "Record egg, live bird, dressed bird, or manure sales.",
      }}
      initialValues={initialValues}
      fields={[
        { key: "flock_id", label: "Flock", type: "select", options: flockOptions },
        { key: "sale_date", label: "Sale date", type: "date", required: true },
        {
          key: "sale_type",
          label: "Sale type",
          type: "select",
          options: [
            { value: "eggs", label: "Eggs" },
            { value: "live_birds", label: "Live birds" },
            { value: "dressed_birds", label: "Dressed birds" },
            { value: "manure", label: "Manure" },
          ],
        },
        { key: "quantity", label: "Quantity", type: "number", required: true, min: 0, step: "0.01" },
        { key: "unit_price", label: "Unit price", type: "number", required: true, min: 0, step: "0.01" },
        { key: "total_amount", label: "Total amount", type: "number", min: 0, step: "0.01" },
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
        flock_id: row.flock_id || "__none__",
        sale_date: row.sale_date || "",
      })}
      buildPayload={(form) => {
        const quantity = Number(form.quantity || 0);
        const unitPrice = Number(form.unit_price || 0);
        const totalAmount = Number(form.total_amount || quantity * unitPrice);

        return {
          ...form,
          flock_id: normalizeOptionalValue(form.flock_id),
          total_amount: totalAmount,
        };
      }}
      onCreate={async (payload) => {
        await poultryClient.sales.create(payload);
        await load();
      }}
      onUpdate={async (id, payload) => {
        await poultryClient.sales.update(id, payload);
        await load();
      }}
      onDelete={async (id) => {
        await poultryClient.sales.remove(id);
        await load();
      }}
      modalTitle={{
        create: "Add Poultry Sale",
        edit: "Edit Poultry Sale",
      }}
    />
  );
}
