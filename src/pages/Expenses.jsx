import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import PageHeader from "@/components/shared/PageHeader";
import DataTable from "@/components/shared/DataTable";
import Modal from "@/components/shared/Modal";
import FormField from "@/components/shared/FormField";
import EmptyState from "@/components/shared/EmptyState";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, DollarSign } from "lucide-react";
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
  const [saving, setSaving] = useState(false);

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

  const handleSave = async () => {
    setSaving(true);
    await base44.entities.ExpenseRecord.create({
      ...form,
      amount: parseFloat(form.amount) || 0,
      greenhouse_id: form.greenhouse_id || null,
      allocation_method: "direct",
    });
    setSaving(false);
    setShowModal(false);
    load();
  };

  // Category breakdown pie
  const catMap = {};
  records.forEach(r => {
    catMap[r.category] = (catMap[r.category] || 0) + (r.amount || 0);
  });
  const pieData = Object.entries(catMap).map(([name, value]) => ({ name, value: parseFloat(value.toFixed(2)) }));

  const totalExpenses = records.reduce((s, r) => s + (r.amount || 0), 0);

  const columns = [
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
  ];

  return (
    <div className="p-4 md:p-6 space-y-6">
      <PageHeader
        title="Expenses"
        subtitle={`${fmt(totalExpenses)} total`}
        actions={
          <Button size="sm" onClick={() => { setForm(defaultForm); setShowModal(true); }} className="gap-1.5">
            <Plus className="w-4 h-4" /> Add Expense
          </Button>
        }
      />

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
        <EmptyState icon={DollarSign} title="No expenses recorded" description="Track your farm expenses." action={<Button onClick={() => setShowModal(true)}><Plus className="w-4 h-4 mr-1" />Add Expense</Button>} />
      ) : (
        <DataTable columns={columns} data={records} loading={loading} />
      )}

      <Modal open={showModal} onClose={() => setShowModal(false)} title="Add Expense">
        <div className="space-y-4">
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
            <Button variant="outline" onClick={() => setShowModal(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving || !form.amount}>
              {saving ? "Saving…" : "Add Expense"}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}