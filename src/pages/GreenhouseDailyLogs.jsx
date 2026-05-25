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
import { Activity, CalendarDays, Droplets, Plus, Sprout, FlaskConical, Leaf, Trash2 } from "lucide-react";
import { getErrorMessage } from "@/lib/errors.js";
import { createPageUrl } from "@/utils";

const ALL_HOUSES_VALUE = "__all__";
const getToday = () => new Date().toISOString().slice(0, 10);

const createSprayProduct = () => ({
  product_name: "",
  category: "pesticide",
  dosage: "",
  unit: "ml",
  notes: "",
});

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
  // Fertilizer
  fertilizer_name: "",
  fertilizer_quantity: "",
  fertilizer_unit: "kg",
  fertilizer_method: "",
  // Spraying activity
  spray_crop: "",
  spray_purpose: "",
  spray_method: "",
  spray_water_volume: "",
  spray_water_unit: "L",
  spray_notes: "",
  spray_products: [createSprayProduct()],
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

const getFertilizerSummary = (record) => {
  const name = String(record?.fertilizer_name || "").trim();
  if (!name) return "—";
  const quantity = record?.fertilizer_quantity ? `${record.fertilizer_quantity} ${record.fertilizer_unit || "kg"}` : "";
  const method = String(record?.fertilizer_method || "").trim();
  return [name, quantity, method].filter(Boolean).join(" · ");
};

const normalizeSprayProducts = (products) => {
  if (!Array.isArray(products)) return [];
  return products
    .map((product) => ({
      product_name: String(product?.product_name || product?.name || "").trim(),
      category: String(product?.category || "pesticide").trim().toLowerCase(),
      dosage: product?.dosage != null && product?.dosage !== "" ? String(product.dosage) : "",
      unit: String(product?.unit || "ml").trim(),
      notes: String(product?.notes || "").trim(),
    }))
    .filter((product) => product.product_name || product.dosage || product.notes);
};

const getLegacySprayProducts = (record) => {
  const products = [];
  if (record?.pesticide_name) {
    products.push({
      product_name: record.pesticide_name,
      category: "pesticide",
      dosage: record.pesticide_rate_ml != null ? String(record.pesticide_rate_ml) : "",
      unit: "ml",
      notes: record.pesticide_knapsacks ? `${record.pesticide_knapsacks} knapsack${record.pesticide_knapsacks > 1 ? "s" : ""}` : "",
    });
  }
  if (record?.fungicide_name) {
    products.push({
      product_name: record.fungicide_name,
      category: "fungicide",
      dosage: record.fungicide_rate_ml != null ? String(record.fungicide_rate_ml) : "",
      unit: "ml",
      notes: record.fungicide_knapsacks ? `${record.fungicide_knapsacks} knapsack${record.fungicide_knapsacks > 1 ? "s" : ""}` : "",
    });
  }
  return products;
};

const getSprayProducts = (record) => {
  const products = normalizeSprayProducts(record?.spray_products);
  return products.length > 0 ? products : getLegacySprayProducts(record);
};

const getSpraySummary = (record) => {
  const products = getSprayProducts(record);
  if (products.length === 0) return "—";
  const names = products.map((product) => product.product_name).filter(Boolean);
  const water = record?.spray_water_volume ? `${record.spray_water_volume} ${record.spray_water_unit || "L"} water` : "";
  const prefix = names.length > 0 ? `${names.length} product${names.length === 1 ? "" : "s"}: ${names.join(", ")}` : `${products.length} product${products.length === 1 ? "" : "s"}`;
  return [prefix, water].filter(Boolean).join(" · ");
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
      fertilizer_name: record.fertilizer_name || "",
      fertilizer_quantity: record.fertilizer_quantity != null ? String(record.fertilizer_quantity) : "",
      fertilizer_unit: record.fertilizer_unit || "kg",
      fertilizer_method: record.fertilizer_method || "",
      spray_crop: record.spray_crop || "",
      spray_purpose: record.spray_purpose || "",
      spray_method: record.spray_method || "",
      spray_water_volume: record.spray_water_volume != null ? String(record.spray_water_volume) : "",
      spray_water_unit: record.spray_water_unit || "L",
      spray_notes: record.spray_notes || "",
      spray_products: (() => {
        const products = getSprayProducts(record);
        return products.length > 0 ? products : [createSprayProduct()];
      })(),
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
    const fertilizerQuantity = toNonNegativeNumber(form.fertilizer_quantity);
    const sprayWaterVolume = toNonNegativeNumber(form.spray_water_volume);
    const sprayProducts = (form.spray_products || []).map((product) => ({
      product_name: String(product.product_name || "").trim(),
      category: String(product.category || "pesticide").trim().toLowerCase(),
      dosage: toNonNegativeNumber(product.dosage),
      unit: String(product.unit || "ml").trim(),
      notes: String(product.notes || "").trim(),
    }));
    const completedSprayProducts = sprayProducts.filter(
      (product) => product.product_name || product.dosage != null || product.notes
    );

    if ([irrigationIntervals, irrigationMins, fertigationIntervals, fertigationMins].some(isNaN)) {
      return { error: "Intervals and minutes must be whole numbers of zero or more." };
    }
    if ([fertilizerQuantity, sprayWaterVolume].some(isNaN) || completedSprayProducts.some((product) => isNaN(product.dosage))) {
      return { error: "Product quantities, spray water volume, and dosages must be positive numbers." };
    }
    if ((irrigationIntervals || 0) > 0 && !(irrigationMins > 0)) {
      return { error: "Enter minutes per irrigation interval." };
    }
    if ((fertigationIntervals || 0) > 0 && !(fertigationMins > 0)) {
      return { error: "Enter minutes per fertigation interval." };
    }
    if (form.fertilizer_name.trim() && !(fertilizerQuantity > 0)) {
      return { error: "Enter the fertilizer quantity used." };
    }
    if ((fertilizerQuantity || 0) > 0 && !form.fertilizer_name.trim()) {
      return { error: "Enter the fertilizer name." };
    }
    if (completedSprayProducts.some((product) => !product.product_name)) {
      return { error: "Enter a product name for each spraying product row." };
    }
    if (completedSprayProducts.some((product) => !(product.dosage > 0))) {
      return { error: "Enter the measurement/dosage for each spraying product." };
    }

    const firstPesticide = completedSprayProducts.find((product) => product.category === "pesticide");
    const firstFungicide = completedSprayProducts.find((product) => product.category === "fungicide");

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
        fertilizer_name: form.fertilizer_name.trim() || null,
        fertilizer_quantity: fertilizerQuantity,
        fertilizer_unit: form.fertilizer_name.trim() || fertilizerQuantity ? form.fertilizer_unit || "kg" : null,
        fertilizer_method: form.fertilizer_method.trim() || null,
        spray_crop: form.spray_crop.trim() || null,
        spray_purpose: form.spray_purpose.trim() || null,
        spray_method: form.spray_method.trim() || null,
        spray_water_volume: sprayWaterVolume,
        spray_water_unit: form.spray_water_volume ? form.spray_water_unit || "L" : null,
        spray_notes: form.spray_notes.trim() || null,
        spray_products: completedSprayProducts,
        pesticide_name: firstPesticide?.product_name || null,
        pesticide_rate_ml: firstPesticide?.unit === "ml" ? firstPesticide.dosage : null,
        pesticide_knapsacks: null,
        fungicide_name: firstFungicide?.product_name || null,
        fungicide_rate_ml: firstFungicide?.unit === "ml" ? firstFungicide.dosage : null,
        fungicide_knapsacks: null,
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

  const updateSprayProduct = (index, field, value) => {
    setForm((prev) => ({
      ...prev,
      spray_products: prev.spray_products.map((product, productIndex) =>
        productIndex === index ? { ...product, [field]: value } : product
      ),
    }));
  };

  const addSprayProduct = () => {
    setForm((prev) => ({
      ...prev,
      spray_products: [...prev.spray_products, createSprayProduct()],
    }));
  };

  const removeSprayProduct = (index) => {
    setForm((prev) => ({
      ...prev,
      spray_products:
        prev.spray_products.length === 1
          ? [createSprayProduct()]
          : prev.spray_products.filter((_, productIndex) => productIndex !== index),
    }));
  };

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
      key: "fertilizer",
      label: "Fertilizer",
      render: (_, row) => <span className="max-w-[180px] block truncate">{getFertilizerSummary(row)}</span>,
    },
    {
      key: "spraying",
      label: "Spraying",
      render: (_, row) => <span className="max-w-[260px] block truncate">{getSpraySummary(row)}</span>,
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

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-4">
        <StatCard title="Total Logs" value={records.length.toLocaleString()} subtitle={`${filteredRecords.length.toLocaleString()} in current view`} icon={Activity} color="primary" loading={loading} />
        <StatCard title="Today's Logs" value={todayRecords.length.toLocaleString()} subtitle={`${housesLoggedToday} house${housesLoggedToday === 1 ? "" : "s"} covered`} icon={CalendarDays} color="success" loading={loading} />
        <StatCard title="Fertilizer Applied Today" value={todayRecords.filter((r) => r.fertilizer_name).length} subtitle="Houses with fertilizer logged" icon={Leaf} color="success" loading={loading} />
        <StatCard title="Sprays Logged Today" value={todayRecords.filter((r) => getSprayProducts(r).length > 0).length} subtitle="Combined spray activities" icon={FlaskConical} color="warning" loading={loading} />
        <StatCard title="Spray Products Today" value={todayRecords.reduce((sum, row) => sum + getSprayProducts(row).length, 0)} subtitle="Products mixed across sprays" icon={Sprout} color="accent" loading={loading} />
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
          description="Record irrigation, fertigation, fertilizer, combined spray mixtures, and other daily operations."
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

          {/* Fertilizer */}
          <div className="rounded-xl border border-border p-4 space-y-3">
            <div>
              <h4 className="text-sm font-semibold flex items-center gap-2"><Leaf className="w-4 h-4 text-lime-500" />Fertilizer Application</h4>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
              <FormField label="Fertilizer Name">
                <Input placeholder="e.g. NPK 15-15-15" value={form.fertilizer_name} onChange={set("fertilizer_name")} />
              </FormField>
              <FormField label="Quantity Used">
                <Input type="number" min="0" step="0.1" placeholder="0" value={form.fertilizer_quantity} onChange={set("fertilizer_quantity")} />
              </FormField>
              <FormField label="Unit">
                <Select value={form.fertilizer_unit || "kg"} onValueChange={(value) => setForm((prev) => ({ ...prev, fertilizer_unit: value }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="kg">kg</SelectItem>
                    <SelectItem value="g">g</SelectItem>
                    <SelectItem value="L">L</SelectItem>
                    <SelectItem value="ml">ml</SelectItem>
                    <SelectItem value="bags">bags</SelectItem>
                  </SelectContent>
                </Select>
              </FormField>
              <FormField label="Application Method">
                <Input placeholder="Broadcast, drip, foliar..." value={form.fertilizer_method} onChange={set("fertilizer_method")} />
              </FormField>
            </div>
          </div>

          {/* Spraying Activity */}
          <div className="rounded-xl border border-border p-4 space-y-3">
            <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <h4 className="text-sm font-semibold flex items-center gap-2"><FlaskConical className="w-4 h-4 text-amber-500" />Spraying Activity</h4>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <FormField label="Crop">
                <Input placeholder="e.g. Cucumber, Tomato" value={form.spray_crop} onChange={set("spray_crop")} />
              </FormField>
              <FormField label="Purpose of Spraying">
                <Input placeholder="e.g. Pest control, disease prevention" value={form.spray_purpose} onChange={set("spray_purpose")} />
              </FormField>
              <FormField label="Spray Method / Type">
                <Input placeholder="Knapsack, boom sprayer, foliar..." value={form.spray_method} onChange={set("spray_method")} />
              </FormField>
              <div className="grid grid-cols-[minmax(0,1fr)_7rem] gap-3">
                <FormField label="Total Water Volume">
                  <Input type="number" min="0" step="0.1" placeholder="0" value={form.spray_water_volume} onChange={set("spray_water_volume")} />
                </FormField>
                <FormField label="Unit">
                  <Select value={form.spray_water_unit || "L"} onValueChange={(value) => setForm((prev) => ({ ...prev, spray_water_unit: value }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="L">L</SelectItem>
                      <SelectItem value="ml">ml</SelectItem>
                    </SelectContent>
                  </Select>
                </FormField>
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between gap-3">
                <h5 className="text-sm font-semibold text-foreground">Products Used</h5>
                <Button type="button" variant="outline" size="sm" onClick={addSprayProduct} className="gap-1.5">
                  <Plus className="w-4 h-4" />
                  Add another product
                </Button>
              </div>
              {form.spray_products.map((product, index) => (
                <div key={index} className="rounded-xl border border-border/80 bg-muted/20 p-3 space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <div className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">Product {index + 1}</div>
                    <Button type="button" variant="ghost" size="sm" onClick={() => removeSprayProduct(index)} className="h-8 gap-1 text-muted-foreground hover:text-danger">
                      <Trash2 className="w-4 h-4" />
                      Remove
                    </Button>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <FormField label="Product Name">
                      <Input placeholder="Product name" value={product.product_name} onChange={(event) => updateSprayProduct(index, "product_name", event.target.value)} />
                    </FormField>
                    <FormField label="Product Category">
                      <Select value={product.category || "pesticide"} onValueChange={(value) => updateSprayProduct(index, "category", value)}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="pesticide">Pesticide</SelectItem>
                          <SelectItem value="fungicide">Fungicide</SelectItem>
                          <SelectItem value="insecticide">Insecticide</SelectItem>
                          <SelectItem value="herbicide">Herbicide</SelectItem>
                          <SelectItem value="acaricide">Acaricide</SelectItem>
                          <SelectItem value="nutrient">Nutrient</SelectItem>
                          <SelectItem value="other">Other</SelectItem>
                        </SelectContent>
                      </Select>
                    </FormField>
                    <FormField label="Measurement / Dosage">
                      <Input type="number" min="0" step="0.01" placeholder="0" value={product.dosage} onChange={(event) => updateSprayProduct(index, "dosage", event.target.value)} />
                    </FormField>
                    <FormField label="Unit">
                      <Select value={product.unit || "ml"} onValueChange={(value) => updateSprayProduct(index, "unit", value)}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="ml">ml</SelectItem>
                          <SelectItem value="L">L</SelectItem>
                          <SelectItem value="g">g</SelectItem>
                          <SelectItem value="kg">kg</SelectItem>
                          <SelectItem value="sachets">sachets</SelectItem>
                          <SelectItem value="tablets">tablets</SelectItem>
                        </SelectContent>
                      </Select>
                    </FormField>
                    <FormField label="Product Notes" className="sm:col-span-2">
                      <Input placeholder="Optional product-specific notes" value={product.notes} onChange={(event) => updateSprayProduct(index, "notes", event.target.value)} />
                    </FormField>
                  </div>
                </div>
              ))}
            </div>

            <FormField label="Spraying Notes">
              <Textarea
                value={form.spray_notes}
                onChange={set("spray_notes")}
                placeholder="Optional notes about the mixture, timing, weather, or application."
                rows={3}
              />
            </FormField>
          </div>

          {/* Other Operations / Notes */}
          <FormField label="Other Operations & Notes">
            <Textarea
              value={form.additional_notes}
              onChange={set("additional_notes")}
              placeholder="e.g. Pruning carried out, weeding of house, crop observations, maintenance notes, or other activities."
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
