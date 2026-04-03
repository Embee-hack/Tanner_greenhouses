import { useState, useEffect, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { isAdminUser } from "@/lib/roles.js";
import PageHeader from "@/components/shared/PageHeader";
import Modal from "@/components/shared/Modal";
import FormField from "@/components/shared/FormField";
import EmptyState from "@/components/shared/EmptyState";
import ErrorBanner from "@/components/shared/ErrorBanner.jsx";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
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
import { getErrorMessage } from "@/lib/errors.js";

const CATEGORIES = ["labor","fertilizer","pesticide","water","energy","packaging","transport","equipment","seeds","other"];
const COLORS = ["hsl(152,60%,32%)","hsl(38,95%,52%)","hsl(199,89%,48%)","hsl(280,65%,60%)","hsl(0,72%,51%)","hsl(340,75%,55%)","hsl(45,90%,50%)","hsl(170,60%,40%)","hsl(230,70%,60%)","hsl(90,55%,45%)"];

const defaultForm = { date: new Date().toISOString().slice(0, 10), category: "labor", amount: "", greenhouse_id: "", description: "" };
const SHARED_GREENHOUSE_VALUE = "__shared__";

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

const getExpenseSelectionState = (rows, selectedIds) => {
  const ids = rows.map((row) => row.id).filter(Boolean);
  const allSelected = ids.length > 0 && ids.every((id) => selectedIds.includes(id));
  const someSelected = ids.some((id) => selectedIds.includes(id)) && !allSelected;
  return allSelected ? true : someSelected ? "indeterminate" : false;
};

export default function Expenses() {
  const { fmt, symbol } = useCurrency();
  const { user } = useAuth();
  const isAdmin = isAdminUser(user);
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
  const [loadError, setLoadError] = useState("");
  const [expandedDates, setExpandedDates] = useState([]);

  const load = async () => {
    try {
      setLoading(true);
      const [ex, gh] = await Promise.all([
        base44.entities.ExpenseRecord.list("-date", 200),
        base44.entities.Greenhouse.list("code"),
      ]);
      setRecords(ex);
      setGreenhouses(gh);
      setLoadError("");
    } catch (err) {
      setLoadError(getErrorMessage(err, "Failed to load expense records."));
    } finally {
      setLoading(false);
    }
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

  const toggleSelectOne = (id, checked) => {
    if (!id) return;
    setSelectedIds(prev => checked ? (prev.includes(id) ? prev : [...prev, id]) : prev.filter(i => i !== id));
  };

  const toggleSelectGroup = (rows, checked) => {
    const ids = rows.map((row) => row.id).filter(Boolean);
    if (checked) {
      setSelectedIds((prev) => Array.from(new Set([...prev, ...ids])));
      return;
    }
    setSelectedIds((prev) => prev.filter((id) => !ids.includes(id)));
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

  const sortedRecords = useMemo(() => {
    const sorted = [...records];
    sorted.sort((a, b) => {
      const dateCompare = String(b.date || "").localeCompare(String(a.date || ""));
      if (dateCompare !== 0) return dateCompare;

      const loggedCompare = String(b.created_date || b.updated_date || "").localeCompare(String(a.created_date || a.updated_date || ""));
      if (loggedCompare !== 0) return loggedCompare;

      return Number(b.amount || 0) - Number(a.amount || 0);
    });
    return sorted;
  }, [records]);

  const groupedRecords = useMemo(() => {
    const groups = new Map();

    sortedRecords.forEach((row) => {
      const dateKey = String(row.date || "__undated__");
      if (!groups.has(dateKey)) {
        groups.set(dateKey, {
          date: dateKey,
          rows: [],
          totalAmount: 0,
          categoryTotals: {},
        });
      }

      const group = groups.get(dateKey);
      group.rows.push(row);
      group.totalAmount += Number(row.amount || 0);
      group.categoryTotals[row.category] = (group.categoryTotals[row.category] || 0) + Number(row.amount || 0);
    });

    return Array.from(groups.values()).map((group) => ({
      ...group,
      topCategories: Object.entries(group.categoryTotals)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .map(([name]) => name),
    }));
  }, [sortedRecords]);

  useEffect(() => {
    const visibleIds = sortedRecords.map((row) => row.id).filter(Boolean);
    setSelectedIds((prev) => prev.filter((id) => visibleIds.includes(id)));
  }, [sortedRecords]);

  useEffect(() => {
    setExpandedDates((current) => {
      const validDates = current.filter((value) => groupedRecords.some((group) => group.date === value));
      if (validDates.length > 0) return validDates;
      return groupedRecords.length > 0 ? [groupedRecords[0].date] : [];
    });
  }, [groupedRecords]);

  // Category breakdown pie
  const catMap = {};
  records.forEach(r => {
    catMap[r.category] = (catMap[r.category] || 0) + (r.amount || 0);
  });
  const pieData = Object.entries(catMap).map(([name, value]) => ({ name, value: parseFloat(value.toFixed(2)) }));

  const totalExpenses = records.reduce((s, r) => s + (r.amount || 0), 0);

  return (
    <div className="p-4 md:p-6 space-y-6">
      <PageHeader
        title="Expenses"
        subtitle={isAdmin ? `${fmt(totalExpenses)} total` : `${records.length} expense record${records.length === 1 ? "" : "s"}`}
        actions={
          <Button size="sm" onClick={openCreate} className="gap-1.5">
            <Plus className="w-4 h-4" /> Add Expense
          </Button>
        }
      />

      <ErrorBanner message={loadError} onRetry={load} />

      {error && (
        <div className="bg-danger/10 text-danger text-sm rounded-lg px-4 py-2">{error}</div>
      )}

      {isAdmin && pieData.length > 0 && (
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
        <Accordion type="multiple" value={expandedDates} onValueChange={setExpandedDates} className="space-y-3">
          {groupedRecords.map((group) => (
            <AccordionItem key={group.date} value={group.date} className="rounded-2xl border border-border bg-card px-4">
              <div className="flex items-start gap-3">
                <div className="pt-4" onClick={(event) => event.stopPropagation()}>
                  <Checkbox
                    checked={getExpenseSelectionState(group.rows, selectedIds)}
                    onCheckedChange={(checked) => toggleSelectGroup(group.rows, checked === true)}
                    aria-label={`Select expenses for ${formatExpenseDate(group.date)}`}
                  />
                </div>
                <AccordionTrigger className="py-4 hover:no-underline">
                  <div className="flex flex-1 flex-col gap-3 text-left md:flex-row md:items-center md:justify-between">
                    <div>
                      <div className="text-base font-semibold text-foreground">{formatExpenseDate(group.date)}</div>
                      <div className="text-xs text-muted-foreground mt-1">
                        {group.rows.length} expense record{group.rows.length === 1 ? "" : "s"}
                      </div>
                    </div>
                    <div className="flex flex-col gap-2 md:items-end">
                      <div className="rounded-xl border border-border bg-muted/30 px-3 py-2">
                        <div className="text-[11px] text-muted-foreground">Total Spent</div>
                        <div className="text-sm font-semibold text-foreground">{fmt(group.totalAmount, 2)}</div>
                      </div>
                      {group.topCategories.length > 0 ? (
                        <div className="flex flex-wrap gap-1.5 justify-start md:justify-end">
                          {group.topCategories.map((category) => {
                            const catClass = CATEGORY_COLORS[category] || CATEGORY_COLORS.other;
                            return (
                              <span key={category} className={`text-[11px] font-semibold px-2 py-0.5 rounded-full border capitalize ${catClass}`}>
                                {category.replace(/_/g, " ")}
                              </span>
                            );
                          })}
                        </div>
                      ) : null}
                    </div>
                  </div>
                </AccordionTrigger>
              </div>
              <AccordionContent className="pl-11">
                <div className="overflow-x-auto rounded-xl border border-border">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border bg-muted/40">
                        <th className="px-4 py-3 w-10" />
                        <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide whitespace-nowrap">Category</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide whitespace-nowrap">Greenhouse</th>
                        <th className="px-4 py-3 text-right text-xs font-semibold text-muted-foreground uppercase tracking-wide whitespace-nowrap">Amount</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide whitespace-nowrap">Description</th>
                        <th className="px-4 py-3 w-12" />
                      </tr>
                    </thead>
                    <tbody>
                      {group.rows.map((row) => {
                        const catClass = CATEGORY_COLORS[row.category] || CATEGORY_COLORS.other;
                        return (
                          <tr key={row.id} className="border-b border-border/50 last:border-b-0">
                            <td className="px-4 py-3">
                              <Checkbox
                                checked={selectedIds.includes(row.id)}
                                onCheckedChange={(checked) => toggleSelectOne(row.id, checked === true)}
                                aria-label={`Select expense ${row.id}`}
                              />
                            </td>
                            <td className="px-4 py-3">
                              <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border capitalize ${catClass}`}>
                                {row.category?.replace(/_/g, " ") || "—"}
                              </span>
                            </td>
                            <td className="px-4 py-3">
                              {row.greenhouse_id ? (
                                <span className="text-xs bg-muted text-muted-foreground px-2 py-0.5 rounded-md font-medium">{ghMap[row.greenhouse_id]?.code ?? row.greenhouse_id}</span>
                              ) : (
                                <span className="text-xs text-muted-foreground italic">Shared</span>
                              )}
                            </td>
                            <td className="px-4 py-3 text-right">
                              <span className="font-bold text-foreground">{fmt(row.amount, 2)}</span>
                            </td>
                            <td className="px-4 py-3">
                              {row.description ? (
                                <span className="text-sm text-muted-foreground">{row.description}</span>
                              ) : (
                                <span className="text-muted-foreground/50">—</span>
                              )}
                            </td>
                            <td className="px-4 py-3">
                              <div className="flex justify-end">
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-8 w-8"
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
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
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
              <Select
                value={form.greenhouse_id || SHARED_GREENHOUSE_VALUE}
                onValueChange={(value) => setForm((f) => ({ ...f, greenhouse_id: value === SHARED_GREENHOUSE_VALUE ? "" : value }))}
              >
                <SelectTrigger><SelectValue placeholder="Shared expense" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value={SHARED_GREENHOUSE_VALUE}>Shared</SelectItem>
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
