import { useState, useEffect, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import PageHeader from "@/components/shared/PageHeader";
import DataTable from "@/components/shared/DataTable";
import Modal from "@/components/shared/Modal";
import FormField from "@/components/shared/FormField";
import EmptyState from "@/components/shared/EmptyState";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Plus, ShoppingCart, Copy, Pencil, Trash2, MoreHorizontal } from "lucide-react";
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from "recharts";
import { useCurrency } from "@/components/shared/CurrencyProvider.jsx";

const PAGE_SIZE = 20;

const defaultForm = {
  date: new Date().toISOString().slice(0, 10),
  buyer: "",
  greenhouse_id: "",
  crop_type_id: "",
  variety_id: "",
  crop_type: "",
  variety: "",
  kg_sold: "",
  price_per_kg: "",
  notes: "",
};

const getItemLabel = (row) => {
  if (!row?.crop_type) return "—";
  return row.variety ? `${row.crop_type} · ${row.variety}` : row.crop_type;
};

const formatMonthLabel = (monthKey) => {
  if (!monthKey || !/^\d{4}-\d{2}$/.test(monthKey)) return monthKey || "Unknown";
  const [year, month] = monthKey.split("-").map(Number);
  const date = new Date(year, month - 1, 1);
  if (Number.isNaN(date.getTime())) return monthKey;
  return new Intl.DateTimeFormat("en-US", { month: "short", year: "numeric" }).format(date);
};

const formatMonthTick = (monthKey) => {
  if (!monthKey || !/^\d{4}-\d{2}$/.test(monthKey)) return monthKey || "";
  const [year, month] = monthKey.split("-").map(Number);
  const date = new Date(year, month - 1, 1);
  if (Number.isNaN(date.getTime())) return monthKey;
  return new Intl.DateTimeFormat("en-US", { month: "short" }).format(date);
};

const getLast12MonthKeys = () => {
  const keys = [];
  const anchor = new Date();
  for (let i = 11; i >= 0; i -= 1) {
    const monthDate = new Date(anchor.getFullYear(), anchor.getMonth() - i, 1);
    const year = monthDate.getFullYear();
    const month = String(monthDate.getMonth() + 1).padStart(2, "0");
    keys.push(`${year}-${month}`);
  }
  return keys;
};

const positiveHash = (value) => {
  let hash = 0;
  for (let i = 0; i < value.length; i += 1) {
    hash = (hash << 5) - hash + value.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
};

const buildItemColorMap = (labels) => {
  const map = new Map();
  const usedHues = new Set();

  labels.forEach((label) => {
    const lower = label.toLowerCase();
    if (lower.includes("habanero")) {
      map.set(label, "#dc2626"); // red
      usedHues.add(2);
      return;
    }
    if (lower.includes("bell")) {
      map.set(label, "#2563eb"); // blue
      usedHues.add(218);
      return;
    }

    let hue = positiveHash(label) % 360;
    while (usedHues.has(hue)) {
      hue = (hue + 37) % 360;
    }
    usedHues.add(hue);
    map.set(label, `hsl(${hue} 68% 42%)`);
  });

  return map;
};

export default function Sales() {
  const { fmt, symbol } = useCurrency();
  const [records, setRecords] = useState([]);
  const [greenhouses, setGreenhouses] = useState([]);
  const [cropTypes, setCropTypes] = useState([]);
  const [varieties, setVarieties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState(defaultForm);
  const [editItem, setEditItem] = useState(null);
  const [saving, setSaving] = useState(false);
  const [duplicatingId, setDuplicatingId] = useState("");
  const [selectedIds, setSelectedIds] = useState([]);
  const [deleteDialog, setDeleteDialog] = useState(null); // { mode: "single" | "bulk", ids: [] }
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState("");
  const [monthFilter, setMonthFilter] = useState("");
  const [productFilter, setProductFilter] = useState("__all__");
  const [sortBy, setSortBy] = useState("month_desc");
  const [chartMetric, setChartMetric] = useState("kg");
  const [currentPage, setCurrentPage] = useState(1);

  const load = () => {
    Promise.all([
      base44.entities.SalesRecord.list("-date", 400),
      base44.entities.Greenhouse.list("code"),
      base44.entities.CropType.list("name"),
      base44.entities.CropVariety.list("name"),
    ]).then(([sa, gh, ct, cv]) => {
      setRecords(sa);
      setGreenhouses(gh);
      setCropTypes(ct);
      setVarieties(cv);
      setLoading(false);
    });
  };

  useEffect(() => {
    load();
  }, []);

  const ghMap = Object.fromEntries(greenhouses.map((g) => [g.id, g]));
  const cropTypeMap = Object.fromEntries(cropTypes.map((c) => [c.id, c]));
  const varietiesByCropType = varieties.reduce((acc, item) => {
    const key = item.crop_type_id || "__none__";
    if (!acc[key]) acc[key] = [];
    acc[key].push(item);
    return acc;
  }, {});
  const availableVarieties = form.crop_type_id ? (varietiesByCropType[form.crop_type_id] || []) : [];

  const productOptions = useMemo(() => {
    const labels = new Set();
    records.forEach((row) => {
      const label = getItemLabel(row);
      if (label !== "—") labels.add(label);
    });
    return Array.from(labels).sort((a, b) => a.localeCompare(b));
  }, [records]);

  const filteredRecords = useMemo(() => {
    return records.filter((row) => {
      const monthKey = String(row.date || "").slice(0, 7);
      if (monthFilter && monthKey !== monthFilter) return false;
      if (productFilter !== "__all__" && getItemLabel(row) !== productFilter) return false;
      return true;
    });
  }, [records, monthFilter, productFilter]);

  const sortedRecords = useMemo(() => {
    const sorted = [...filteredRecords];
    sorted.sort((a, b) => {
      const monthA = String(a.date || "").slice(0, 7);
      const monthB = String(b.date || "").slice(0, 7);

      if (sortBy === "month_desc") {
        if (monthA !== monthB) return monthB.localeCompare(monthA);
        return String(b.date || "").localeCompare(String(a.date || ""));
      }
      if (sortBy === "month_asc") {
        if (monthA !== monthB) return monthA.localeCompare(monthB);
        return String(a.date || "").localeCompare(String(b.date || ""));
      }
      if (sortBy === "product_az") {
        const itemCompare = getItemLabel(a).localeCompare(getItemLabel(b));
        if (itemCompare !== 0) return itemCompare;
        return String(b.date || "").localeCompare(String(a.date || ""));
      }
      if (sortBy === "product_za") {
        const itemCompare = getItemLabel(b).localeCompare(getItemLabel(a));
        if (itemCompare !== 0) return itemCompare;
        return String(b.date || "").localeCompare(String(a.date || ""));
      }

      return 0;
    });
    return sorted;
  }, [filteredRecords, sortBy]);

  const totalPages = Math.max(1, Math.ceil(sortedRecords.length / PAGE_SIZE));

  useEffect(() => {
    setCurrentPage(1);
  }, [monthFilter, productFilter, sortBy]);

  useEffect(() => {
    if (currentPage > totalPages) setCurrentPage(totalPages);
  }, [currentPage, totalPages]);

  const pageStart = (currentPage - 1) * PAGE_SIZE;
  const pageEnd = pageStart + PAGE_SIZE;
  const paginatedRecords = sortedRecords.slice(pageStart, pageEnd);

  const currentPageIds = paginatedRecords.map((r) => r.id).filter(Boolean);
  const filteredIds = sortedRecords.map((r) => r.id).filter(Boolean);
  const allVisibleSelected = currentPageIds.length > 0 && currentPageIds.every((id) => selectedIds.includes(id));
  const hasSomeSelected = currentPageIds.some((id) => selectedIds.includes(id)) && !allVisibleSelected;
  const filtersActive = Boolean(monthFilter) || productFilter !== "__all__";

  useEffect(() => {
    setSelectedIds((prev) => prev.filter((id) => filteredIds.includes(id)));
  }, [sortedRecords]);

  const getCropTypeIdByName = (name) =>
    cropTypes.find((item) => String(item.name || "").toLowerCase() === String(name || "").toLowerCase())?.id || "";

  const getVarietyIdByName = (cropTypeId, name) =>
    varieties.find(
      (item) =>
        item.crop_type_id === cropTypeId &&
        String(item.name || "").toLowerCase() === String(name || "").toLowerCase()
    )?.id || "";

  const buildSalePayload = (source) => {
    const kg = parseFloat(source.kg_sold) || 0;
    const price = parseFloat(source.price_per_kg) || 0;
    const selectedCropType = cropTypeMap[source.crop_type_id];
    const selectedVariety = varieties.find((v) => v.id === source.variety_id);

    return {
      date: source.date || new Date().toISOString().slice(0, 10),
      buyer: String(source.buyer || "").trim(),
      greenhouse_id: source.greenhouse_id || null,
      crop_type_id: source.crop_type_id || null,
      variety_id: source.variety_id || null,
      crop_type: selectedCropType?.name || source.crop_type || "",
      variety: selectedVariety?.name || source.variety || "",
      kg_sold: kg,
      price_per_kg: price,
      revenue: parseFloat((kg * price).toFixed(2)),
      notes: String(source.notes || "").trim() || null,
    };
  };

  const openCreate = () => {
    setEditItem(null);
    setForm(defaultForm);
    setError("");
    setShowModal(true);
  };

  const openEdit = (row) => {
    const derivedCropTypeId = row.crop_type_id || getCropTypeIdByName(row.crop_type);
    const derivedVarietyId = row.variety_id || getVarietyIdByName(derivedCropTypeId, row.variety);

    setEditItem(row);
    setForm({
      ...defaultForm,
      ...row,
      greenhouse_id: row.greenhouse_id || "",
      crop_type_id: derivedCropTypeId || "",
      variety_id: derivedVarietyId || "",
      crop_type: row.crop_type || "",
      variety: row.variety || "",
      kg_sold: row.kg_sold != null ? String(row.kg_sold) : "",
      price_per_kg: row.price_per_kg != null ? String(row.price_per_kg) : "",
      notes: row.notes || "",
    });
    setError("");
    setShowModal(true);
  };

  const handleSave = async () => {
    setError("");
    setSaving(true);
    try {
      const payload = buildSalePayload(form);
      if (editItem?.id) {
        await base44.entities.SalesRecord.update(editItem.id, payload);
      } else {
        await base44.entities.SalesRecord.create(payload);
      }
      setSaving(false);
      setShowModal(false);
      setEditItem(null);
      load();
    } catch (err) {
      setSaving(false);
      setError(err?.data?.error || err?.message || "Failed to save sale record.");
    }
  };

  const handleDuplicate = async (row) => {
    setError("");
    setDuplicatingId(row.id);
    try {
      await base44.entities.SalesRecord.create(buildSalePayload({
        ...row,
        notes: row.notes || "",
      }));
      load();
    } catch (err) {
      setError(err?.data?.error || err?.message || "Failed to duplicate sale.");
    } finally {
      setDuplicatingId("");
    }
  };

  const toggleSelectAll = (checked) => {
    if (checked) {
      setSelectedIds((prev) => {
        const set = new Set(prev);
        currentPageIds.forEach((id) => set.add(id));
        return Array.from(set);
      });
      return;
    }

    setSelectedIds((prev) => prev.filter((id) => !currentPageIds.includes(id)));
  };

  const toggleSelectOne = (id, checked) => {
    if (!id) return;
    setSelectedIds((prev) => {
      if (checked) {
        if (prev.includes(id)) return prev;
        return [...prev, id];
      }
      return prev.filter((item) => item !== id);
    });
  };

  const requestDeleteSingle = (id) => {
    if (!id) return;
    setDeleteDialog({ mode: "single", ids: [id] });
  };

  const requestDeleteBulk = () => {
    if (selectedIds.length === 0) return;
    setDeleteDialog({ mode: "bulk", ids: selectedIds });
  };

  const handleConfirmDelete = async () => {
    const ids = deleteDialog?.ids || [];
    if (ids.length === 0) return;

    setDeleting(true);
    setError("");
    try {
      await Promise.all(ids.map((id) => base44.entities.SalesRecord.delete(id)));
      setDeleteDialog(null);
      setSelectedIds((prev) => prev.filter((id) => !ids.includes(id)));
      await load();
    } catch (err) {
      setError(err?.data?.error || err?.message || "Failed to delete sale record(s).");
    } finally {
      setDeleting(false);
    }
  };

  const totalRevenue = records.reduce((s, r) => s + (r.revenue || r.kg_sold * r.price_per_kg || 0), 0);
  const totalKg = records.reduce((s, r) => s + (r.kg_sold || 0), 0);
  const avgPrice = totalKg > 0 ? totalRevenue / totalKg : 0;
  const filteredRevenue = sortedRecords.reduce((s, r) => s + (r.revenue || r.kg_sold * r.price_per_kg || 0), 0);
  const filteredKg = sortedRecords.reduce((s, r) => s + (r.kg_sold || 0), 0);
  const filteredAvgPrice = filteredKg > 0 ? filteredRevenue / filteredKg : 0;
  const filteredBuyers = new Set(sortedRecords.map((r) => String(r.buyer || "").trim()).filter(Boolean)).size;

  const itemSummaries = useMemo(() => {
    const map = new Map();
    sortedRecords.forEach((row) => {
      const label = getItemLabel(row);
      if (label === "—") return;
      const current = map.get(label) || { label, salesCount: 0, kg: 0, revenue: 0 };
      current.salesCount += 1;
      current.kg += Number(row.kg_sold || 0);
      current.revenue += Number(row.revenue || (row.kg_sold || 0) * (row.price_per_kg || 0));
      map.set(label, current);
    });
    return Array.from(map.values()).sort((a, b) => b.kg - a.kg);
  }, [sortedRecords]);

  const itemSeries = useMemo(() => {
    const labels = itemSummaries.map((item) => item.label);
    const colorMap = buildItemColorMap(labels);
    return itemSummaries.map((item) => ({
      label: item.label,
      dataKeyKg: `series_kg_${positiveHash(item.label)}`,
      dataKeyRevenue: `series_revenue_${positiveHash(item.label)}`,
      color: colorMap.get(item.label) || "hsl(145 63% 36%)",
      totalKg: item.kg,
      totalRevenue: item.revenue,
    }));
  }, [itemSummaries]);

  const monthlyItemChart = useMemo(() => {
    const last12MonthKeys = getLast12MonthKeys();
    const seriesByLabel = new Map(itemSeries.map((item) => [item.label, item]));
    const monthMap = new Map(
      last12MonthKeys.map((monthKey) => {
        const point = {
          month: monthKey,
          monthLabel: formatMonthLabel(monthKey),
          salesCount: 0,
          totalKg: 0,
          totalRevenue: 0,
        };
        itemSeries.forEach((item) => {
          point[item.dataKeyKg] = 0;
          point[item.dataKeyRevenue] = 0;
        });
        return [monthKey, point];
      })
    );

    sortedRecords.forEach((row) => {
      if (!row.date) return;
      const monthKey = row.date.slice(0, 7);
      if (!monthMap.has(monthKey)) return;
      const itemLabel = getItemLabel(row);
      const itemConfig = seriesByLabel.get(itemLabel);
      if (!itemConfig) return;

      const point = monthMap.get(monthKey);
      const kg = Number(row.kg_sold || 0);
      const revenue = Number(row.revenue || kg * Number(row.price_per_kg || 0));

      point[itemConfig.dataKeyKg] = Number((point[itemConfig.dataKeyKg] || 0) + kg);
      point[itemConfig.dataKeyRevenue] = Number((point[itemConfig.dataKeyRevenue] || 0) + revenue);
      point.totalKg += kg;
      point.totalRevenue += revenue;
      point.salesCount += 1;
    });

    return last12MonthKeys
      .map((monthKey) => monthMap.get(monthKey))
      .map((point) => ({
        ...point,
        totalKg: Number(point.totalKg.toFixed(1)),
        totalRevenue: Number(point.totalRevenue.toFixed(2)),
      }));
  }, [sortedRecords, itemSeries]);

  const columns = [
    {
      key: "__select",
      label: (
        <div className="flex items-center">
          <Checkbox
            checked={allVisibleSelected ? true : hasSomeSelected ? "indeterminate" : false}
            onCheckedChange={(checked) => toggleSelectAll(checked === true)}
            aria-label="Select all sales on this page"
          />
        </div>
      ),
      render: (_, row) => (
        <div className="flex items-center">
          <Checkbox
            checked={selectedIds.includes(row.id)}
            onCheckedChange={(checked) => toggleSelectOne(row.id, checked === true)}
            aria-label={`Select sale ${row.id}`}
          />
        </div>
      ),
    },
    { key: "date", label: "Date" },
    { key: "buyer", label: "Buyer" },
    {
      key: "crop_type",
      label: "Item Sold",
      render: (_, row) => getItemLabel(row),
    },
    { key: "greenhouse_id", label: "Greenhouse", render: (v) => (v ? (ghMap[v]?.code ?? v) : "All") },
    { key: "kg_sold", label: "kg Sold", align: "right", render: (v) => v?.toFixed(1) },
    { key: "price_per_kg", label: `${symbol}/kg`, align: "right", render: (v) => fmt(v, 2) },
    { key: "revenue", label: "Revenue", align: "right", render: (v, row) => fmt(v || row.kg_sold * row.price_per_kg || 0, 2) },
    {
      key: "id",
      label: "",
      align: "right",
      render: (_, row) => (
        <div className="flex justify-end">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={(e) => e.stopPropagation()}
                aria-label="Open sale actions"
              >
                <MoreHorizontal className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-40">
              <DropdownMenuItem
                onSelect={() => openEdit(row)}
              >
                <Pencil className="w-4 h-4" />
                Edit
              </DropdownMenuItem>
              <DropdownMenuItem
                onSelect={() => handleDuplicate(row)}
                disabled={duplicatingId === row.id || deleting}
              >
                <Copy className="w-4 h-4" />
                {duplicatingId === row.id ? "Duplicating..." : "Duplicate"}
              </DropdownMenuItem>
              <DropdownMenuItem
                onSelect={() => requestDeleteSingle(row.id)}
                disabled={deleting}
                className="text-danger focus:text-danger"
              >
                <Trash2 className="w-4 h-4" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      ),
    },
  ];

  const startItem = sortedRecords.length === 0 ? 0 : pageStart + 1;
  const endItem = Math.min(pageEnd, sortedRecords.length);

  const pageNumbers = useMemo(() => {
    if (totalPages <= 5) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }

    if (currentPage <= 3) return [1, 2, 3, 4, 5];
    if (currentPage >= totalPages - 2) return [totalPages - 4, totalPages - 3, totalPages - 2, totalPages - 1, totalPages];
    return [currentPage - 2, currentPage - 1, currentPage, currentPage + 1, currentPage + 2];
  }, [currentPage, totalPages]);

  return (
    <div className="p-4 md:p-6 space-y-6">
      <PageHeader
        title="Sales Records"
        subtitle={filtersActive
          ? `${fmt(filteredRevenue)} filtered · ${sortedRecords.length} records`
          : `${fmt(totalRevenue)} total · avg ${fmt(avgPrice, 2)}/kg`}
        actions={
          <Button size="sm" onClick={openCreate} className="gap-1.5">
            <Plus className="w-4 h-4" /> Record Sale
          </Button>
        }
      />

      {error && (
        <div className="bg-danger/10 text-danger text-sm rounded-lg px-4 py-2">
          {error}
        </div>
      )}

      <div className="bg-card border border-border rounded-2xl p-4 md:p-5 space-y-4">
        <div className="grid md:grid-cols-[1fr_1fr_1fr_auto] gap-3 items-end">
          <FormField label="Month">
            <Input
              type="month"
              value={monthFilter}
              onChange={(e) => setMonthFilter(e.target.value)}
            />
          </FormField>
          <FormField label="Product">
            <Select value={productFilter} onValueChange={setProductFilter}>
              <SelectTrigger>
                <SelectValue placeholder="All products" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">All products</SelectItem>
                {productOptions.map((label) => (
                  <SelectItem key={label} value={label}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FormField>
          <FormField label="Sort by">
            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="month_desc">Month: latest first</SelectItem>
                <SelectItem value="month_asc">Month: oldest first</SelectItem>
                <SelectItem value="product_az">Product: A to Z</SelectItem>
                <SelectItem value="product_za">Product: Z to A</SelectItem>
              </SelectContent>
            </Select>
          </FormField>
          <Button
            variant="outline"
            onClick={() => {
              setMonthFilter("");
              setProductFilter("__all__");
              setSortBy("month_desc");
            }}
            disabled={!filtersActive && sortBy === "month_desc"}
          >
            Reset
          </Button>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="rounded-xl bg-muted/40 border border-border px-3 py-2.5">
            <div className="text-xs text-muted-foreground">Records</div>
            <div className="text-lg font-semibold">{sortedRecords.length}</div>
          </div>
          <div className="rounded-xl bg-muted/40 border border-border px-3 py-2.5">
            <div className="text-xs text-muted-foreground">Total Sold</div>
            <div className="text-lg font-semibold">{filteredKg.toFixed(1)} kg</div>
          </div>
          <div className="rounded-xl bg-muted/40 border border-border px-3 py-2.5">
            <div className="text-xs text-muted-foreground">Revenue</div>
            <div className="text-lg font-semibold">{fmt(filteredRevenue, 2)}</div>
          </div>
          <div className="rounded-xl bg-muted/40 border border-border px-3 py-2.5">
            <div className="text-xs text-muted-foreground">Avg Price</div>
            <div className="text-lg font-semibold">{fmt(filteredAvgPrice, 2)}/kg</div>
          </div>
        </div>
      </div>

      {monthlyItemChart.length > 0 && itemSeries.length > 0 && (
        <div className="bg-card rounded-2xl border border-border p-5 md:p-6">
          <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
            <div>
              <h3 className="font-semibold text-base">Monthly Item Sales Trends</h3>
              <p className="text-sm text-muted-foreground">Last 12 months, split by item.</p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <div className="text-sm text-muted-foreground">
                {filteredBuyers} buyer{filteredBuyers === 1 ? "" : "s"} · {itemSeries.length} item{itemSeries.length === 1 ? "" : "s"}
              </div>
              <div className="inline-flex rounded-lg border border-border p-1 bg-muted/40">
                <Button
                  size="sm"
                  variant={chartMetric === "kg" ? "default" : "ghost"}
                  className="h-7 px-2.5 text-xs"
                  onClick={() => setChartMetric("kg")}
                >
                  kg sold
                </Button>
                <Button
                  size="sm"
                  variant={chartMetric === "revenue" ? "default" : "ghost"}
                  className="h-7 px-2.5 text-xs"
                  onClick={() => setChartMetric("revenue")}
                >
                  Revenue
                </Button>
              </div>
            </div>
          </div>

          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={monthlyItemChart}>
              <CartesianGrid vertical={false} strokeDasharray="3 3" stroke="hsl(150,12%,88%)" />
              <XAxis dataKey="month" tick={{ fontSize: 11 }} tickFormatter={formatMonthTick} />
              <YAxis
                tick={{ fontSize: 11 }}
                tickFormatter={(value) => chartMetric === "kg" ? Number(value).toFixed(0) : fmt(value, 0)}
                label={{
                  value: chartMetric === "kg" ? "kg sold" : `revenue (${symbol})`,
                  angle: -90,
                  position: "insideLeft",
                  offset: 8,
                  style: { fontSize: 10, fill: "hsl(150,10%,45%)" },
                }}
              />
              <Tooltip
                formatter={(value, name) =>
                  chartMetric === "kg"
                    ? [`${Number(value || 0).toFixed(1)} kg`, name]
                    : [fmt(Number(value || 0), 2), name]
                }
                labelFormatter={(label, payload) => {
                  const point = payload?.[0]?.payload;
                  if (!point) return formatMonthLabel(label);
                  return `${point.monthLabel} · ${point.totalKg.toFixed(1)} kg total · ${fmt(point.totalRevenue, 2)} revenue`;
                }}
              />
              <Legend />
              {itemSeries.map((item) => (
                <Line
                  key={item.label}
                  type="monotone"
                  dataKey={chartMetric === "kg" ? item.dataKeyKg : item.dataKeyRevenue}
                  name={item.label}
                  stroke={item.color}
                  strokeWidth={2.2}
                  dot={{ r: 2.5, strokeWidth: 1 }}
                  activeDot={{ r: 5 }}
                  connectNulls
                />
              ))}
            </LineChart>
          </ResponsiveContainer>

          {itemSeries.length > 0 && (
            <div className="mt-4 flex flex-wrap gap-2">
              {itemSeries.map((item) => (
                <div key={item.label} className="rounded-full border border-border bg-muted/30 px-3 py-1.5 text-xs text-muted-foreground inline-flex items-center gap-1.5">
                  <span className="inline-block w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                  {item.label}: {chartMetric === "kg" ? `${item.totalKg.toFixed(1)} kg` : fmt(item.totalRevenue, 2)}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {!loading && records.length === 0 ? (
        <EmptyState
          icon={ShoppingCart}
          title="No sales records"
          description="Record your first sale."
          action={<Button onClick={openCreate}><Plus className="w-4 h-4 mr-1" />Record Sale</Button>}
        />
      ) : (
        <div className="space-y-3">
          <DataTable columns={columns} data={paginatedRecords} loading={loading} />

          {!loading && sortedRecords.length > 0 && (
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 px-1">
              <p className="text-sm text-muted-foreground">
                Showing {startItem}–{endItem} of {sortedRecords.length}
              </p>

              <div className="flex items-center gap-1.5">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                >
                  Previous
                </Button>

                {pageNumbers[0] > 1 && (
                  <>
                    <Button variant="ghost" size="sm" onClick={() => setCurrentPage(1)}>1</Button>
                    <span className="text-muted-foreground px-1">...</span>
                  </>
                )}

                {pageNumbers.map((page) => (
                  <Button
                    key={page}
                    size="sm"
                    variant={page === currentPage ? "default" : "ghost"}
                    onClick={() => setCurrentPage(page)}
                  >
                    {page}
                  </Button>
                ))}

                {pageNumbers[pageNumbers.length - 1] < totalPages && (
                  <>
                    <span className="text-muted-foreground px-1">...</span>
                    <Button variant="ghost" size="sm" onClick={() => setCurrentPage(totalPages)}>{totalPages}</Button>
                  </>
                )}

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </div>
      )}

      {selectedIds.length > 0 && (
        <div className="fixed bottom-6 right-6 z-40">
          <div className="rounded-2xl border border-border bg-card/95 backdrop-blur shadow-lg px-3 py-3 flex items-center gap-2">
            <span className="text-sm text-muted-foreground pr-1">{selectedIds.length} selected</span>
            <Button variant="outline" size="sm" onClick={() => setSelectedIds([])} disabled={deleting}>
              Clear
            </Button>
            <Button size="sm" variant="destructive" onClick={requestDeleteBulk} disabled={deleting}>
              <Trash2 className="w-4 h-4 mr-1" />
              Delete
            </Button>
          </div>
        </div>
      )}

      <Modal open={showModal} onClose={() => { setShowModal(false); setEditItem(null); }} title={editItem ? "Edit Sale" : "Record Sale"}>
        <div className="space-y-4">
          {error && <div className="bg-danger/10 text-danger text-sm rounded-lg px-4 py-2">{error}</div>}
          <div className="grid grid-cols-2 gap-4">
            <FormField label="Date" required>
              <Input type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} />
            </FormField>
            <FormField label="Buyer" required>
              <Input value={form.buyer} onChange={e => setForm(f => ({ ...f, buyer: e.target.value }))} placeholder="Buyer name" />
            </FormField>
          </div>
          <FormField label="Greenhouse (optional)">
            <Select value={form.greenhouse_id} onValueChange={v => setForm(f => ({ ...f, greenhouse_id: v }))}>
              <SelectTrigger><SelectValue placeholder="All / shared" /></SelectTrigger>
              <SelectContent>
                <SelectItem value={null}>All / shared</SelectItem>
                {greenhouses.map(g => <SelectItem key={g.id} value={g.id}>{g.code} — {g.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </FormField>
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
            <FormField label="Variety (optional)">
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
                  <SelectValue
                    placeholder={
                      !form.crop_type_id
                        ? "Select crop type first"
                        : availableVarieties.length
                        ? "Select variety"
                        : "No varieties for selected crop"
                    }
                  />
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
          <div className="grid grid-cols-2 gap-4">
            <FormField label="kg Sold" required>
              <Input type="number" value={form.kg_sold} onChange={e => setForm(f => ({ ...f, kg_sold: e.target.value }))} placeholder="0.0" step="0.1" />
            </FormField>
            <FormField label={`Price per kg (${symbol})`} required>
              <Input type="number" value={form.price_per_kg} onChange={e => setForm(f => ({ ...f, price_per_kg: e.target.value }))} placeholder="0.00" step="0.01" />
            </FormField>
          </div>
          {form.kg_sold && form.price_per_kg && (
            <div className="bg-success/10 text-success text-sm rounded-lg px-4 py-2 font-semibold">
              Revenue: {fmt(parseFloat(form.kg_sold) * parseFloat(form.price_per_kg), 2)}
            </div>
          )}
          <FormField label="Notes">
            <Input value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
          </FormField>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => { setShowModal(false); setEditItem(null); }}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving || !form.buyer || !form.crop_type_id || !form.kg_sold || !form.price_per_kg}>
              {saving ? "Saving…" : editItem ? "Save Changes" : "Record Sale"}
            </Button>
          </div>
        </div>
      </Modal>

      <AlertDialog open={!!deleteDialog} onOpenChange={(open) => { if (!open) setDeleteDialog(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {deleteDialog?.mode === "bulk" ? "Delete selected sales?" : "Delete this sale?"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {deleteDialog?.mode === "bulk"
                ? `This will permanently delete ${deleteDialog?.ids?.length || 0} sale records. This action cannot be undone.`
                : "This sale record will be permanently deleted. This action cannot be undone."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              disabled={deleting}
              className="bg-danger hover:bg-danger/90"
            >
              {deleting ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
