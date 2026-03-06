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
import { Plus, BarChart3 } from "lucide-react";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip } from "recharts";

const defaultForm = { greenhouse_id: "", cycle_id: "", date: new Date().toISOString().slice(0, 10), kg_harvested: "", grade_a_kg: "", grade_b_kg: "", grade_c_kg: "", notes: "" };

export default function Harvests() {
  const [records, setRecords] = useState([]);
  const [greenhouses, setGreenhouses] = useState([]);
  const [cycles, setCycles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState(defaultForm);
  const [saving, setSaving] = useState(false);

  const load = () => {
    Promise.all([
      base44.entities.HarvestRecord.list("-date", 200),
      base44.entities.Greenhouse.list("code"),
      base44.entities.CropCycle.list("-planting_date"),
    ]).then(([ha, gh, cy]) => {
      setRecords(ha);
      setGreenhouses(gh);
      setCycles(cy);
      setLoading(false);
    });
  };

  useEffect(() => { load(); }, []);

  const ghMap = Object.fromEntries(greenhouses.map(g => [g.id, g]));
  const availableCycles = cycles.filter(c => c.greenhouse_id === form.greenhouse_id && c.status === "active");

  const handleSave = async () => {
    setSaving(true);
    await base44.entities.HarvestRecord.create({
      ...form,
      kg_harvested: parseFloat(form.kg_harvested) || 0,
      grade_a_kg: parseFloat(form.grade_a_kg) || 0,
      grade_b_kg: parseFloat(form.grade_b_kg) || 0,
      grade_c_kg: parseFloat(form.grade_c_kg) || 0,
    });
    setSaving(false);
    setShowModal(false);
    load();
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
    { key: "date", label: "Date" },
    { key: "greenhouse_id", label: "Greenhouse", render: v => ghMap[v]?.code ?? "—" },
    { key: "kg_harvested", label: "Total (kg)", align: "right", render: v => v?.toFixed(1) },
    { key: "grade_a_kg", label: "Grade A", align: "right", render: v => v > 0 ? v.toFixed(1) : "—" },
    { key: "grade_b_kg", label: "Grade B", align: "right", render: v => v > 0 ? v.toFixed(1) : "—" },
    { key: "grade_c_kg", label: "Grade C", align: "right", render: v => v > 0 ? v.toFixed(1) : "—" },
    { key: "notes", label: "Notes", render: v => v || "—" },
  ];

  const totalKg = records.reduce((s, r) => s + (r.kg_harvested || 0), 0);

  return (
    <div className="p-4 md:p-6 space-y-6">
      <PageHeader
        title="Harvest Records"
        subtitle={`${totalKg.toLocaleString(undefined, { maximumFractionDigits: 0 })} kg total harvested`}
        actions={
          <Button size="sm" onClick={() => { setForm(defaultForm); setShowModal(true); }} className="gap-1.5">
            <Plus className="w-4 h-4" /> Log Harvest
          </Button>
        }
      />

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
        <EmptyState icon={BarChart3} title="No harvest records" description="Log your first harvest to start tracking yield." action={<Button onClick={() => setShowModal(true)}><Plus className="w-4 h-4 mr-1" />Log Harvest</Button>} />
      ) : (
        <DataTable columns={columns} data={records} loading={loading} />
      )}

      <Modal open={showModal} onClose={() => setShowModal(false)} title="Log Harvest">
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <FormField label="Greenhouse" required>
              <Select value={form.greenhouse_id} onValueChange={v => setForm(f => ({ ...f, greenhouse_id: v, cycle_id: "" }))}>
                <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent>{greenhouses.map(g => <SelectItem key={g.id} value={g.id}>{g.code}</SelectItem>)}</SelectContent>
              </Select>
            </FormField>
            <FormField label="Cycle">
              <Select value={form.cycle_id} onValueChange={v => setForm(f => ({ ...f, cycle_id: v }))}>
                <SelectTrigger><SelectValue placeholder="Active cycle" /></SelectTrigger>
                <SelectContent>{availableCycles.map(c => <SelectItem key={c.id} value={c.id}>{c.variety || c.crop_type} ({c.planting_date})</SelectItem>)}</SelectContent>
              </Select>
            </FormField>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <FormField label="Date" required>
              <Input type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} />
            </FormField>
            <FormField label="Total kg Harvested" required>
              <Input type="number" value={form.kg_harvested} onChange={e => setForm(f => ({ ...f, kg_harvested: e.target.value }))} placeholder="0.0" step="0.1" />
            </FormField>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <FormField label="Grade A (kg)">
              <Input type="number" value={form.grade_a_kg} onChange={e => setForm(f => ({ ...f, grade_a_kg: e.target.value }))} placeholder="0" step="0.1" />
            </FormField>
            <FormField label="Grade B (kg)">
              <Input type="number" value={form.grade_b_kg} onChange={e => setForm(f => ({ ...f, grade_b_kg: e.target.value }))} placeholder="0" step="0.1" />
            </FormField>
            <FormField label="Grade C (kg)">
              <Input type="number" value={form.grade_c_kg} onChange={e => setForm(f => ({ ...f, grade_c_kg: e.target.value }))} placeholder="0" step="0.1" />
            </FormField>
          </div>
          <FormField label="Notes">
            <Input value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
          </FormField>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setShowModal(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving || !form.greenhouse_id || !form.kg_harvested || !form.date}>
              {saving ? "Saving…" : "Log Harvest"}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}