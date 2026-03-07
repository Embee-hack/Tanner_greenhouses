import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import PageHeader from "@/components/shared/PageHeader";
import DataTable from "@/components/shared/DataTable";
import Modal from "@/components/shared/Modal";
import FormField from "@/components/shared/FormField";
import EmptyState from "@/components/shared/EmptyState";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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
import { Plus, DollarSign, Copy, Pencil, Trash2, MoreHorizontal } from "lucide-react";
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip } from "recharts";
import { useCurrency } from "@/components/shared/CurrencyProvider.jsx";
import { format, parseISO } from "date-fns";

const CATEGORIES = ["labor","fertilizer","pesticide","water","energy","packaging","transport","equipment","seeds","other"];
const COLORS = ["hsl(152,60%,32%)","hsl(38,95%,52%)","hsl(199,89%,48%)","hsl(280,65%,60%)","hsl(0,72%,51%)","hsl(340,75%,55%)","hsl(45,90%,50%)","hsl(170,60%,40%)","hsl(230,70%,60%)","hsl(90,55%,45%)"];

const defaultForm = { date: new Date().toISOString().slice(0, 10), category: "labor", amount: "", greenhouse_id: "", description: "" };

const formatExpenseDate = (dateStr) => {
  try { return format(parseISO(String(dateStr)), "d MMM yyyy"); }
  catch { return dateStr || "—"; }
};

const CATEGORY_COLORS = {
  labor: "bg-blue-50 text-blue-700 border-blue-200",
  fertilizer: "bg-lime-50 text-lime-700 border-lime-200",
  pesticide: "bg-orange-50 text-orange-700 border-orange-200",
  water: "bg-cyan-50 text-cyan-700 border-cyan-200",
  energy: "bg-yellow-50 text-yellow-700 border-yellow-200",
  packaging: "bg-purple-50 text-purple-700 border-purple-200",
  transport: "bg-indigo-50 text-indigo-700 border-indigo-200",
  equipment: "bg-slate-50 text-slate-700 border-slate-200",
  seeds: "bg-emerald-50 text-emerald-700 border-emerald-200",
  other: "bg-muted text-muted-foreground border-border",
};

export default function Expenses() {
  const { fmt, symbol } = useCurrency();
  const [records, setRecords] = useState([]);
  const [greenhouses, setGreenhouses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState(defaultForm);
  const [editItem, setEditItem] = useState(null);
  const [saving, setSaving] = useState(false);
  const [duplicatingId, setDuplicatingId] = useState("");
  const [selectedIds, setSelectedIds] = useState([]);
  const [deleteDialog, setDeleteDialog] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState("");

  const load = () => {
    Promise.all([
      base44.entities.ExpenseRecord.list("-date", 200),
      base44.entities.Greenhouse.list("code"),
    ]).then(([ex, gh]) => {
      setRecords(ex);
      setGreenhouses(gh);
      setLoading(false);
    });
  };

  useEffect(() => { load(); }, []);

  const ghMap = Object.fromEntries(greenhouses.map(g => [g.id, g]));

  const openCreate = () => {
    setEditItem(null);
    setForm(defaultForm);
    setError("");
    setShowModal(true);
  };

  const openEdit = (row) => {
    setEditItem(row);
    setForm({
      ...defaultForm,
      ...row,
      greenhouse_id: row.greenhouse_id || "",
      amount: row.amount != null ? String(row.amount) : "",
      description: row.description || "",
    });
    setError("");
    setShowModal(true);
  };

  const handleSave = async () => {
    setError("");
    setSaving(true);
    try {
      const payload = {
        ...form,
        amount: parseFloat(form.amount) || 0,
        greenhouse_id: form.greenhouse_id || null,
        allocation_method: "direct",
      };
      if (editItem?.id) {
        await base44.entities.ExpenseRecord.update(editItem.id, payload);
      } else {
        await base44.entities.ExpenseRecord.create(payload);
      }
      setSaving(false);
      setShowModal(false);
      setEditItem(null);
      load();
    } catch (err) {
      setSaving(false);
      setError(err?.data?.error || err?.message || "Failed to save expense.");
    }
  };

  const handleDuplicate = async (row) => {
    setDuplicatingId(row.id);
    try {
      await base44.entities.ExpenseRecord.create({
        date: row.date,
        category: row.category,
        amount: row.amount,
        greenhouse_id: row.greenhouse_id || null,
        description: row.description || "",
        allocation_method: "direct",
      });
      load();
    } catch (err) {
      setError(err?.data?.error || err?.message || "Failed to duplicate expense.");
    } finally {
      setDuplicatingId("");
    }
  };

  const toggleSelectAll = (checked) => {
    const pageIds = records.map(r => r.id).filter(Boolean);
    if (checked) {
      setSelectedIds(prev => Array.from(new Set([...prev, ...pageIds])));
    } else {
      setSelectedIds(prev => prev.filter(id => !pageIds.includes(id)));
    }
  };

  const toggleSelectOne = (id, checked) => {
    if (!id) return;
    setSelectedIds(prev => checked ? (prev.includes(id) ? prev : [...prev, id]) : prev.filter(i => i !== id));
  };

  const requestDeleteSingle = (id) => { if (id) setDeleteDialog({ mode: "single", ids: [id] }); };
  const requestDeleteBulk = () => { if (selectedIds.length > 0) setDeleteDialog({ mode: "bulk", ids: selectedIds }); };

  const handleConfirmDelete = async () => {
    const ids = deleteDialog?.ids || [];
    if (ids.length === 0) return;
    setDeleting(true);
    setError("");
    try {
      await Promise.all(ids.map(id => base44.entities.ExpenseRecord.delete(id)));
      setDeleteDialog(null);
      setSelectedIds(prev => prev.filter(id => !ids.includes(id)));
      await load();
    } catch (err) {
      setError(err?.data?.error || err?.message || "Failed to delete expense(s).");
    } finally {
      setDeleting(false);
    }
  };

  // Category breakdown pie
  const catMap = {};
  records.forEach(r => {
    catMap[r.category] = (catMap[r.category] || 0) + (r.amount || 0);
  });
  const pieData = Object.entries(catMap).map(([name, value]) => ({ name, value: parseFloat(value.toFixed(2)) }));

  const totalExpenses = records.reduce((s, r) => s + (r.amount || 0), 0);

  const allIds = records.map(r => r.id).filter(Boolean);
  const allSelected = allIds.length > 0 && allIds.every(id => selectedIds.includes(id));
  const someSelected = allIds.some(id => selectedIds.includes(id)) && !allSelected;

  const columns = [
    {
      key: "__select",
      label: (
        <div className="flex items-center">
          <Checkbox
            checked={allSelected ? true : someSelected ? "indeterminate" : false}
            onCheckedChange={checked => toggleSelectAll(checked === true)}
            aria-label="Select all"
          />
        </div>
      ),
      render: (_, row) => (
        <div className="flex items-center">
          <Checkbox
            checked={selectedIds.includes(row.id)}
            onCheckedChange={checked => toggleSelectOne(row.id, checked === true)}
            aria-label={`Select expense ${row.id}`}
          />
        </div>
      ),
    },
    {
      key: "date",
      label: "Date",
      render: v => (
        <span className="text-sm text-foreground font-medium whitespace-nowrap">{formatExpenseDate(v)}</span>
      ),
    },
    {
      key: "category",
      label: "Category",
      render: v => {
        const catClass = CATEGORY_COLORS[v] || CATEGORY_COLORS.other;
        return (
          <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border capitalize ${catClass}`}>
            {v?.replace(/_/g, " ") || "—"}
          </span>
        );
      },
    },
    {
      key: "greenhouse_id",
      label: "Greenhouse",
      render: v => v
        ? <span className="text-xs bg-muted text-muted-foreground px-2 py-0.5 rounded-md font-medium">{ghMap[v]?.code ?? v}</span>
        : <span className="text-xs text-muted-foreground italic">Shared</span>,
    },
    {
      key: "amount",
      label: "Amount",
      align: "right",
      render: v => <span className="font-bold text-foreground">{fmt(v, 2)}</span>,
    },
    {
      key: "description",
      label: "Description",
      render: v => v
        ? <span className="text-sm text-muted-foreground">{v}</span>
        : <span className="text-muted-foreground/50">—</span>,
    },
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
                onClick={e => e.stopPropagation()}
                aria-label="Open expense actions"
              >
                <MoreHorizontal className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-40">
              <DropdownMenuItem onSelect={() => openEdit(row)}>
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

  return (
    <div className="p-4 md:p-6 space-y-6">
      <PageHeader
        title="Expenses"
        subtitle={`${fmt(totalExpenses)} total`}
        actions={
          <Button size="sm" onClick={openCreate} className="gap-1.5">
            <Plus className="w-4 h-4" /> Add Expense
          </Button>
        }
      />

      {error && (
        <div className="bg-danger/10 text-danger text-sm rounded-lg px-4 py-2">{error}</div>
      )}

      {pieData.length > 0 && (
        <div className="bg-card rounded-xl border border-border p-5">
          <h3 className="font-semibold text-sm mb-4">Expense Breakdown</h3>
          <div className="flex flex-col sm:flex-row items-center gap-6">
            <div className="w-full sm:w-56 flex-shrink-0" style={{ height: 200 }}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={85}
                    paddingAngle={2}
                  >
                    {pieData.map((entry, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Tooltip formatter={(v, name) => [fmt(v), name.charAt(0).toUpperCase() + name.slice(1)]} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="flex-1 w-full space-y-2">
              {pieData
                .sort((a, b) => b.value - a.value)
                .map((entry, i) => {
                  const pct = ((entry.value / totalExpenses) * 100).toFixed(0);
                  return (
                    <div key={entry.name} className="flex items-center gap-3">
                      <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: COLORS[pieData.indexOf(entry) % COLORS.length] }} />
                      <span className="text-sm text-foreground capitalize flex-1">{entry.name}</span>
                      <span className="text-sm font-semibold text-muted-foreground">{pct}%</span>
                    </div>
                  );
                })}
            </div>
          </div>
        </div>
      )}

      {!loading && records.length === 0 ? (
        <EmptyState icon={DollarSign} title="No expenses recorded" description="Track your farm expenses." action={<Button onClick={openCreate}><Plus className="w-4 h-4 mr-1" />Add Expense</Button>} />
      ) : (
        <DataTable columns={columns} data={records} loading={loading} />
      )}

      {selectedIds.length > 0 && (
        <div className="fixed bottom-6 right-6 z-40">
          <div className="rounded-2xl border border-border bg-card/95 backdrop-blur shadow-lg px-3 py-3 flex items-center gap-2">
            <span className="text-sm text-muted-foreground pr-1">{selectedIds.length} selected</span>
            <Button variant="outline" size="sm" onClick={() => setSelectedIds([])} disabled={deleting}>Clear</Button>
            <Button size="sm" variant="destructive" onClick={requestDeleteBulk} disabled={deleting}>
              <Trash2 className="w-4 h-4 mr-1" />
              Delete
            </Button>
          </div>
        </div>
      )}

      <Modal open={showModal} onClose={() => { setShowModal(false); setEditItem(null); }} title={editItem ? "Edit Expense" : "Add Expense"}>
        <div className="space-y-4">
          {error && <div className="bg-danger/10 text-danger text-sm rounded-lg px-4 py-2">{error}</div>}
          <div className="grid grid-cols-2 gap-4">
            <FormField label="Date" required>
              <Input type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} />
            </FormField>
            <FormField label={`Amount (${symbol})`} required>
              <Input type="number" value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} placeholder="0.00" step="0.01" />
            </FormField>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <FormField label="Category" required>
              <Select value={form.category} onValueChange={v => setForm(f => ({ ...f, category: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{CATEGORIES.map(c => <SelectItem key={c} value={c} className="capitalize">{c.replace(/_/g," ")}</SelectItem>)}</SelectContent>
              </Select>
            </FormField>
            <FormField label="Greenhouse (optional)">
              <Select value={form.greenhouse_id} onValueChange={v => setForm(f => ({ ...f, greenhouse_id: v }))}>
                <SelectTrigger><SelectValue placeholder="Shared expense" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value={null}>Shared</SelectItem>
                  {greenhouses.map(g => <SelectItem key={g.id} value={g.id}>{g.code}</SelectItem>)}
                </SelectContent>
              </Select>
            </FormField>
          </div>
          <FormField label="Description">
            <Input value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Optional..." />
          </FormField>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => { setShowModal(false); setEditItem(null); }}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving || !form.amount}>
              {saving ? "Saving…" : editItem ? "Save Changes" : "Add Expense"}
            </Button>
          </div>
        </div>
      </Modal>

      <AlertDialog open={!!deleteDialog} onOpenChange={open => { if (!open) setDeleteDialog(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {deleteDialog?.mode === "bulk" ? "Delete selected expenses?" : "Delete this expense?"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {deleteDialog?.mode === "bulk"
                ? `This will permanently delete ${deleteDialog?.ids?.length || 0} expense records. This action cannot be undone.`
                : "This expense record will be permanently deleted. This action cannot be undone."}
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
