import { useState, useEffect, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useLocation, useNavigate } from "react-router-dom";
import PageHeader from "@/components/shared/PageHeader";
import DataTable from "@/components/shared/DataTable";
import Modal from "@/components/shared/Modal";
import FormField from "@/components/shared/FormField";
import EmptyState from "@/components/shared/EmptyState";
import DeleteConfirmDialog from "@/components/shared/DeleteConfirmDialog.jsx";
import ErrorBanner from "@/components/shared/ErrorBanner.jsx";
import RecordActions from "@/components/shared/RecordActions.jsx";
import { useCurrency } from "@/components/shared/CurrencyProvider.jsx";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, BarChart3 } from "lucide-react";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip } from "recharts";
import { getErrorMessage } from "@/lib/errors.js";
import { createPageUrl } from "@/utils";

const GRADES = [
  { key: "a", label: "Grade A", harvested: "grade_a_kg", sold: "grade_a_sold_kg", price: "grade_a_price_per_kg" },
  { key: "b", label: "Grade B", harvested: "grade_b_kg", sold: "grade_b_sold_kg", price: "grade_b_price_per_kg" },
  { key: "c", label: "Grade C", harvested: "grade_c_kg", sold: "grade_c_sold_kg", price: "grade_c_price_per_kg" },
];

const defaultForm = {
  greenhouse_id: "",
  cycle_id: "",
  date: new Date().toISOString().slice(0, 10),
  crop_type_id: "",
  variety_id: "",
  crop_type: "",
  variety: "",
  buyer: "",
  kg_harvested: "",
  grade_a_kg: "",
  grade_b_kg: "",
  grade_c_kg: "",
  grade_a_sold_kg: "",
  grade_b_sold_kg: "",
  grade_c_sold_kg: "",
  grade_a_price_per_kg: "",
  grade_b_price_per_kg: "",
  grade_c_price_per_kg: "",
  notes: "",
};

const toNumber = (value) => parseFloat(value) || 0;

const getGradeTotals = (source) => {
  let harvested = 0;
  let sold = 0;
  let revenue = 0;

  GRADES.forEach((grade) => {
    const harvestedKg = toNumber(source[grade.harvested]);
    const soldKg = toNumber(source[grade.sold]);
    const price = toNumber(source[grade.price]);
    harvested += harvestedKg;
    sold += soldKg;
    revenue += soldKg * price;
  });

  return {
    harvested: parseFloat(harvested.toFixed(2)),
    sold: parseFloat(sold.toFixed(2)),
    revenue: parseFloat(revenue.toFixed(2)),
  };
};

const formatCropLabel = (row) => {
  if (!row?.crop_type) return "—";
  return row.variety ? `${row.crop_type} · ${row.variety}` : row.crop_type;
};

export default function Harvests() {
  const { fmt, symbol } = useCurrency();
  const location = useLocation();
  const navigate = useNavigate();
  const [records, setRecords] = useState([]);
  const [salesRecords, setSalesRecords] = useState([]);
  const [greenhouses, setGreenhouses] = useState([]);
  const [cycles, setCycles] = useState([]);
  const [cropTypes, setCropTypes] = useState([]);
  const [varieties, setVarieties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [form, setForm] = useState(defaultForm);
  const [saving, setSaving] = useState(false);
  const [deleteItem, setDeleteItem] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [error, setError] = useState("");

  const load = async () => {
    try {
      setLoading(true);
      const [ha, gh, cy, ct, cv, sa] = await Promise.all([
        base44.entities.HarvestRecord.list("-date", 200),
        base44.entities.Greenhouse.list("code"),
        base44.entities.CropCycle.list("-planting_date"),
        base44.entities.CropType.list("name"),
        base44.entities.CropVariety.list("name"),
        base44.entities.SalesRecord.list("-date", 1000),
      ]);
      setRecords(ha);
      setGreenhouses(gh);
      setCycles(cy);
      setCropTypes(ct);
      setVarieties(cv);
      setSalesRecords(sa);
      setLoadError("");
    } catch (err) {
      setLoadError(getErrorMessage(err, "Failed to load harvest records."));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  useEffect(() => {
    const harvestId = new URLSearchParams(location.search).get("harvest");
    if (!harvestId || records.length === 0 || showModal) return;

    const record = records.find((item) => item.id === harvestId);
    if (!record) return;

    setEditItem(record);
    setForm(getFormFromRecord(record));
    setError("");
    setShowModal(true);
    navigate(createPageUrl("Harvests"), { replace: true });
  }, [location.search, navigate, records, showModal]);

  const ghMap = Object.fromEntries(greenhouses.map(g => [g.id, g]));
  const cropTypeMap = Object.fromEntries(cropTypes.map((c) => [c.id, c]));
  const varietiesByCropType = varieties.reduce((acc, item) => {
    const key = item.crop_type_id || "__none__";
    if (!acc[key]) acc[key] = [];
    acc[key].push(item);
    return acc;
  }, {});
  const availableVarieties = form.crop_type_id ? (varietiesByCropType[form.crop_type_id] || []) : [];
  const availableCycles = cycles.filter(
    (cycle) => cycle.greenhouse_id === form.greenhouse_id && (cycle.status === "active" || cycle.id === form.cycle_id)
  );
  const formTotals = getGradeTotals(form);
  const formUnsoldKg = Math.max(0, formTotals.harvested - formTotals.sold);

  const salesByHarvestId = useMemo(() => {
    const map = new Map();
    salesRecords.forEach((sale) => {
      if (!sale.harvest_record_id) return;
      if (!map.has(sale.harvest_record_id)) map.set(sale.harvest_record_id, []);
      map.get(sale.harvest_record_id).push(sale);
    });
    return map;
  }, [salesRecords]);

  const getCropTypeIdByName = (name) =>
    cropTypes.find((item) => String(item.name || "").toLowerCase() === String(name || "").toLowerCase())?.id || "";

  const getVarietyIdByName = (cropTypeId, name) =>
    varieties.find(
      (item) =>
        item.crop_type_id === cropTypeId &&
        String(item.name || "").toLowerCase() === String(name || "").toLowerCase()
    )?.id || "";

  const getFormFromRecord = (record) => {
    const linkedSales = salesByHarvestId.get(record.id) || [];
    const gradeSaleValues = {};

    GRADES.forEach((grade) => {
      const linkedSale = linkedSales.find((sale) => sale.sale_grade === grade.label);
      gradeSaleValues[grade.sold] = record[grade.sold] != null
        ? String(record[grade.sold])
        : linkedSale?.kg_sold != null
        ? String(linkedSale.kg_sold)
        : "";
      gradeSaleValues[grade.price] = record[grade.price] != null
        ? String(record[grade.price])
        : linkedSale?.price_per_kg != null
        ? String(linkedSale.price_per_kg)
        : "";
    });

    const derivedCropTypeId = record.crop_type_id || getCropTypeIdByName(record.crop_type);
    const derivedVarietyId = record.variety_id || getVarietyIdByName(derivedCropTypeId, record.variety);

    return {
      ...defaultForm,
      ...record,
      ...gradeSaleValues,
      cycle_id: record.cycle_id || "",
      crop_type_id: derivedCropTypeId || "",
      variety_id: derivedVarietyId || "",
      crop_type: record.crop_type || "",
      variety: record.variety || "",
      buyer: record.buyer || linkedSales.find((sale) => sale.buyer)?.buyer || "",
      kg_harvested: record.kg_harvested != null ? String(record.kg_harvested) : "",
      grade_a_kg: record.grade_a_kg != null ? String(record.grade_a_kg) : "",
      grade_b_kg: record.grade_b_kg != null ? String(record.grade_b_kg) : "",
      grade_c_kg: record.grade_c_kg != null ? String(record.grade_c_kg) : "",
      notes: record.notes || "",
    };
  };

  const openCreateModal = () => {
    setEditItem(null);
    setForm(defaultForm);
    setError("");
    setShowModal(true);
  };

  const openEditModal = (record) => {
    setEditItem(record);
    setForm(getFormFromRecord(record));
    setError("");
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditItem(null);
    setForm(defaultForm);
    setError("");
  };

  const buildHarvestPayload = () => {
    const totals = getGradeTotals(form);
    const selectedCropType = cropTypeMap[form.crop_type_id];
    const selectedVariety = varieties.find((v) => v.id === form.variety_id);

    return {
      ...form,
      greenhouse_id: form.greenhouse_id,
      cycle_id: form.cycle_id || null,
      crop_type_id: form.crop_type_id || null,
      variety_id: form.variety_id || null,
      crop_type: selectedCropType?.name || form.crop_type || "",
      variety: selectedVariety?.name || form.variety || "",
      buyer: String(form.buyer || "").trim(),
      kg_harvested: totals.harvested || toNumber(form.kg_harvested),
      grade_a_kg: toNumber(form.grade_a_kg),
      grade_b_kg: toNumber(form.grade_b_kg),
      grade_c_kg: toNumber(form.grade_c_kg),
      grade_a_sold_kg: toNumber(form.grade_a_sold_kg),
      grade_b_sold_kg: toNumber(form.grade_b_sold_kg),
      grade_c_sold_kg: toNumber(form.grade_c_sold_kg),
      grade_a_price_per_kg: toNumber(form.grade_a_price_per_kg),
      grade_b_price_per_kg: toNumber(form.grade_b_price_per_kg),
      grade_c_price_per_kg: toNumber(form.grade_c_price_per_kg),
      kg_sold: totals.sold,
      revenue: totals.revenue,
      unsold_kg: Math.max(0, totals.harvested - totals.sold),
      notes: String(form.notes || "").trim() || null,
    };
  };

  const syncLinkedSales = async (harvestId, harvestPayload) => {
    const existingSales = salesRecords.filter((sale) => sale.harvest_record_id === harvestId);
    const existingByGrade = new Map(existingSales.map((sale) => [sale.sale_grade, sale]));
    const desiredGrades = GRADES.filter((grade) => toNumber(harvestPayload[grade.sold]) > 0);

    await Promise.all(desiredGrades.map(async (grade) => {
      const soldKg = toNumber(harvestPayload[grade.sold]);
      const price = toNumber(harvestPayload[grade.price]);
      const payload = {
        date: harvestPayload.date,
        buyer: harvestPayload.buyer || "",
        greenhouse_id: harvestPayload.greenhouse_id || null,
        crop_type_id: harvestPayload.crop_type_id || null,
        variety_id: harvestPayload.variety_id || null,
        crop_type: harvestPayload.crop_type || "",
        variety: harvestPayload.variety || "",
        kg_sold: soldKg,
        price_per_kg: price,
        revenue: parseFloat((soldKg * price).toFixed(2)),
        notes: harvestPayload.notes,
        harvest_record_id: harvestId,
        sale_grade: grade.label,
      };
      const existing = existingByGrade.get(grade.label);
      if (existing?.id) {
        await base44.entities.SalesRecord.update(existing.id, payload);
      } else {
        await base44.entities.SalesRecord.create(payload);
      }
    }));

    const desiredGradeLabels = new Set(desiredGrades.map((grade) => grade.label));
    const salesToDelete = existingSales.filter((sale) => !desiredGradeLabels.has(sale.sale_grade));
    await Promise.all(salesToDelete.map((sale) => base44.entities.SalesRecord.delete(sale.id)));
  };

  const handleSave = async () => {
    setSaving(true);
    setError("");
    try {
      const payload = buildHarvestPayload();
      let harvestId = editItem?.id;
      if (editItem) {
        await base44.entities.HarvestRecord.update(editItem.id, payload);
      } else {
        const created = await base44.entities.HarvestRecord.create(payload);
        harvestId = created?.id;
      }
      if (harvestId) {
        await syncLinkedSales(harvestId, payload);
      }
      closeModal();
      await load();
    } catch (err) {
      setError(getErrorMessage(err, "Failed to save harvest record."));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteItem) return;
    setDeleting(true);
    try {
      const linkedSales = salesRecords.filter((sale) => sale.harvest_record_id === deleteItem.id);
      await Promise.all(linkedSales.map((sale) => base44.entities.SalesRecord.delete(sale.id)));
      await base44.entities.HarvestRecord.delete(deleteItem.id);
      setDeleteItem(null);
      if (editItem?.id === deleteItem.id) {
        closeModal();
      }
      await load();
    } catch (err) {
      setLoadError(getErrorMessage(err, "Failed to delete harvest record."));
    } finally {
      setDeleting(false);
    }
  };

  // Chart: weekly totals
  const weeklyMap = {};
  records.forEach(r => {
    if (!r.date) return;
    const week = r.date.slice(0, 7);
    weeklyMap[week] = (weeklyMap[week] || 0) + (r.kg_harvested || 0);
  });
  const chartData = Object.entries(weeklyMap).sort(([a], [b]) => a.localeCompare(b)).slice(-8).map(([month, kg]) => ({ month, kg: parseFloat(kg.toFixed(1)) }));

  const columns = [
    { key: "date", label: "Date", noWrap: true },
    { key: "greenhouse_id", label: "House", noWrap: true, render: v => ghMap[v]?.code ?? "—" },
    { key: "crop_type", label: "Crop", noWrap: true, render: (_, row) => formatCropLabel(row) },
    { key: "kg_harvested", label: "Total (kg)", align: "right", noWrap: true, render: v => v?.toFixed(1) },
    { key: "kg_sold", label: "Sold (kg)", align: "right", noWrap: true, render: (_, row) => (row.kg_sold ?? getGradeTotals(row).sold)?.toFixed?.(1) ?? "—" },
    { key: "revenue", label: "Revenue", align: "right", noWrap: true, render: (_, row) => fmt(row.revenue ?? getGradeTotals(row).revenue, 2) },
    { key: "notes", label: "Notes", render: v => v || "—" },
    {
      key: "id",
      label: "Actions", noWrap: true, align: "right",
      render: (_, row) => (
        <RecordActions
          onEdit={() => openEditModal(row)}
          onDelete={() => setDeleteItem(row)}
          ariaLabel={`Actions for harvest on ${row.date}`}
        />
      ),
    },
  ];

  const totalKg = records.reduce((s, r) => s + (r.kg_harvested || 0), 0);

  return (
    <div className="p-4 md:p-6 space-y-6">
      <PageHeader
        title="Harvest & Sales Records"
        subtitle={`${totalKg.toLocaleString(undefined, { maximumFractionDigits: 0 })} kg total harvested`}
        actions={
          <Button size="sm" onClick={openCreateModal} className="gap-1.5">
            <Plus className="w-4 h-4" /> Log Harvest & Sale
          </Button>
        }
      />

      <ErrorBanner message={loadError} onRetry={load} />

      {chartData.length > 0 && (
        <div className="bg-card rounded-xl border border-border p-5">
          <div className="flex items-center gap-2 mb-4">
            <BarChart3 className="w-4 h-4 text-primary" />
            <h3 className="font-semibold text-sm">Monthly Harvest Volume (kg)</h3>
          </div>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(150,12%,88%)" />
              <XAxis dataKey="month" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} label={{ value: "kg harvested", angle: -90, position: "insideLeft", offset: 10, style: { fontSize: 10, fill: "hsl(150,10%,45%)" } }} />
              <Tooltip formatter={v => [`${v} kg`, "Harvested"]} />
              <Bar dataKey="kg" fill="hsl(152,60%,32%)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {!loading && records.length === 0 ? (
        <EmptyState icon={BarChart3} title="No harvest records" description="Log your first harvest and grade sales to start tracking yield and revenue." action={<Button onClick={openCreateModal}><Plus className="w-4 h-4 mr-1" />Log Harvest & Sale</Button>} />
      ) : (
        <DataTable columns={columns} data={records} loading={loading} />
      )}

      <Modal open={showModal} onClose={closeModal} title={editItem ? "Edit Harvest & Sale" : "Log Harvest & Sale"}>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <FormField label="Greenhouse" required>
              <Select value={form.greenhouse_id} onValueChange={v => setForm(f => ({ ...f, greenhouse_id: v, cycle_id: "" }))}>
                <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent>{greenhouses.map(g => <SelectItem key={g.id} value={g.id}>{g.code}</SelectItem>)}</SelectContent>
              </Select>
            </FormField>
            <FormField label="Cycle">
              <Select
                value={form.cycle_id}
                onValueChange={(v) => {
                  const selectedCycle = cycles.find((cycle) => cycle.id === v);
                  setForm((f) => ({
                    ...f,
                    cycle_id: v,
                    crop_type_id: selectedCycle?.crop_type_id || f.crop_type_id,
                    variety_id: selectedCycle?.variety_id || f.variety_id,
                    crop_type: selectedCycle?.crop_type || f.crop_type,
                    variety: selectedCycle?.variety || f.variety,
                  }));
                }}
              >
                <SelectTrigger><SelectValue placeholder="Active cycle" /></SelectTrigger>
                <SelectContent>{availableCycles.map(c => <SelectItem key={c.id} value={c.id}>{c.variety || c.crop_type} ({c.planting_date})</SelectItem>)}</SelectContent>
              </Select>
            </FormField>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <FormField label="Date" required>
              <Input type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} />
            </FormField>
            <FormField label="Buyer">
              <Input value={form.buyer} onChange={e => setForm(f => ({ ...f, buyer: e.target.value }))} placeholder="Buyer name" />
            </FormField>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <FormField label="Crop Type" required>
              <Select
                value={form.crop_type_id}
                onValueChange={(v) => {
                  const selectedCropType = cropTypeMap[v];
                  setForm((f) => ({
                    ...f,
                    crop_type_id: v,
                    crop_type: selectedCropType?.name || "",
                    variety_id: "",
                    variety: "",
                  }));
                }}
              >
                <SelectTrigger><SelectValue placeholder={cropTypes.length ? "Select crop type" : "No crop types yet"} /></SelectTrigger>
                <SelectContent>
                  {cropTypes.map((cropType) => (
                    <SelectItem key={cropType.id} value={cropType.id}>{cropType.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FormField>
            <FormField label="Variety">
              <Select
                value={form.variety_id || "__none__"}
                onValueChange={(v) => {
                  if (v === "__none__") {
                    setForm((f) => ({ ...f, variety_id: "", variety: "" }));
                    return;
                  }
                  const selectedVariety = varieties.find((item) => item.id === v);
                  setForm((f) => ({
                    ...f,
                    variety_id: v,
                    variety: selectedVariety?.name || "",
                  }));
                }}
                disabled={!form.crop_type_id || availableVarieties.length === 0}
              >
                <SelectTrigger>
                  <SelectValue placeholder={!form.crop_type_id ? "Select crop type first" : "Select variety"} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">No variety</SelectItem>
                  {availableVarieties.map((item) => (
                    <SelectItem key={item.id} value={item.id}>{item.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FormField>
          </div>
          <div className="rounded-xl border border-border overflow-hidden">
            <div className="grid grid-cols-[1.1fr_1fr_1fr_1fr_1fr] gap-2 bg-muted/40 px-3 py-2 text-xs font-semibold uppercase text-muted-foreground">
              <div>Grade</div>
              <div className="text-right">Harvested kg</div>
              <div className="text-right">Sold kg</div>
              <div className="text-right">{symbol}/kg</div>
              <div className="text-right">Revenue</div>
            </div>
            {GRADES.map((grade) => {
              const soldKg = toNumber(form[grade.sold]);
              const price = toNumber(form[grade.price]);
              const revenue = soldKg * price;
              return (
                <div key={grade.key} className="grid grid-cols-[1.1fr_1fr_1fr_1fr_1fr] gap-2 border-t border-border px-3 py-2 items-center">
                  <div className="text-sm font-semibold">{grade.label}</div>
                  <Input
                    className="text-right"
                    type="number"
                    value={form[grade.harvested]}
                    onChange={(e) => {
                      const value = e.target.value;
                      setForm((f) => ({
                        ...f,
                        [grade.harvested]: value,
                        [grade.sold]: f[grade.sold] === "" ? value : f[grade.sold],
                      }));
                    }}
                    placeholder="0"
                    step="0.1"
                  />
                  <Input
                    className="text-right"
                    type="number"
                    value={form[grade.sold]}
                    onChange={(e) => setForm((f) => ({ ...f, [grade.sold]: e.target.value }))}
                    placeholder="0"
                    step="0.1"
                  />
                  <Input
                    className="text-right"
                    type="number"
                    value={form[grade.price]}
                    onChange={(e) => setForm((f) => ({ ...f, [grade.price]: e.target.value }))}
                    placeholder="0.00"
                    step="0.01"
                  />
                  <div className="text-right text-sm font-semibold">{fmt(revenue, 2)}</div>
                </div>
              );
            })}
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div className="rounded-xl bg-muted/40 border border-border px-3 py-2.5">
              <div className="text-xs text-muted-foreground">Total Harvested</div>
              <div className="text-lg font-semibold">{formTotals.harvested.toFixed(1)} kg</div>
            </div>
            <div className="rounded-xl bg-muted/40 border border-border px-3 py-2.5">
              <div className="text-xs text-muted-foreground">Total Sold</div>
              <div className="text-lg font-semibold">{formTotals.sold.toFixed(1)} kg</div>
            </div>
            <div className="rounded-xl bg-muted/40 border border-border px-3 py-2.5">
              <div className="text-xs text-muted-foreground">Total Revenue</div>
              <div className="text-lg font-semibold">{fmt(formTotals.revenue, 2)}</div>
              {formUnsoldKg > 0 ? <div className="text-xs text-muted-foreground">{formUnsoldKg.toFixed(1)} kg unsold</div> : null}
            </div>
          </div>
          <FormField label="Notes">
            <Input value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
          </FormField>
          {error ? <div className="bg-danger/10 text-danger text-sm rounded-lg px-4 py-2">{error}</div> : null}
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={closeModal}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving || !form.greenhouse_id || !(form.crop_type_id || form.crop_type) || formTotals.harvested <= 0 || !form.date}>
              {saving ? "Saving…" : editItem ? "Save Changes" : "Log Harvest & Sale"}
            </Button>
          </div>
        </div>
      </Modal>

      <DeleteConfirmDialog
        open={!!deleteItem}
        onOpenChange={(open) => {
          if (!open) setDeleteItem(null);
        }}
        title="Delete this harvest record?"
        description="This harvest entry will be removed from the log. This action cannot be undone."
        confirmLabel="Delete Harvest"
        loading={deleting}
        onConfirm={handleDelete}
      />
    </div>
  );
}
