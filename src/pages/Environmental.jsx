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
import { Plus, Thermometer } from "lucide-react";
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from "recharts";

const defaultForm = { greenhouse_id: "", date: new Date().toISOString().slice(0, 10), time: "", temperature_c: "", humidity_pct: "", co2_ppm: "", light_lux: "", notes: "" };

export default function Environmental() {
  const [records, setRecords] = useState([]);
  const [greenhouses, setGreenhouses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState(defaultForm);
  const [saving, setSaving] = useState(false);
  const [selectedGh, setSelectedGh] = useState("");

  const load = () => {
    Promise.all([
      base44.entities.EnvironmentalLog.list("-date", 300),
      base44.entities.Greenhouse.list("code"),
    ]).then(([logs, gh]) => {
      setRecords(logs);
      setGreenhouses(gh);
      setLoading(false);
    });
  };

  useEffect(() => { load(); }, []);

  const ghMap = Object.fromEntries(greenhouses.map(g => [g.id, g]));

  const handleSave = async () => {
    setSaving(true);
    await base44.entities.EnvironmentalLog.create({
      ...form,
      temperature_c: form.temperature_c ? parseFloat(form.temperature_c) : null,
      humidity_pct: form.humidity_pct ? parseFloat(form.humidity_pct) : null,
      co2_ppm: form.co2_ppm ? parseFloat(form.co2_ppm) : null,
      light_lux: form.light_lux ? parseFloat(form.light_lux) : null,
    });
    setSaving(false);
    setShowModal(false);
    load();
  };

  const filtered = selectedGh ? records.filter(r => r.greenhouse_id === selectedGh) : records;

  // Chart data (last 20 entries for selected gh)
  const chartData = filtered.slice(0, 20).reverse().map(r => ({
    date: r.date,
    temp: r.temperature_c,
    humidity: r.humidity_pct,
  }));

  const columns = [
    { key: "date", label: "Date" },
    { key: "time", label: "Time", render: v => v || "—" },
    { key: "greenhouse_id", label: "Greenhouse", render: v => ghMap[v]?.code ?? "—" },
    { key: "temperature_c", label: "Temp (°C)", align: "right", render: v => v != null ? v.toFixed(1) : "—" },
    { key: "humidity_pct", label: "Humidity (%)", align: "right", render: v => v != null ? v.toFixed(1) : "—" },
    { key: "co2_ppm", label: "CO₂ (ppm)", align: "right", render: v => v != null ? v.toFixed(0) : "—" },
    { key: "light_lux", label: "Light (lux)", align: "right", render: v => v != null ? v.toLocaleString() : "—" },
  ];

  return (
    <div className="p-4 md:p-6 space-y-6">
      <PageHeader
        title="Environmental Logs"
        subtitle={`${records.length} readings`}
        actions={
          <div className="flex items-center gap-2">
            <Select value={selectedGh} onValueChange={setSelectedGh}>
              <SelectTrigger className="w-36"><SelectValue placeholder="All GH" /></SelectTrigger>
              <SelectContent>
                <SelectItem value={null}>All</SelectItem>
                {greenhouses.map(g => <SelectItem key={g.id} value={g.id}>{g.code}</SelectItem>)}
              </SelectContent>
            </Select>
            <Button size="sm" onClick={() => { setForm(defaultForm); setShowModal(true); }} className="gap-1.5">
              <Plus className="w-4 h-4" /> Log Reading
            </Button>
          </div>
        }
      />

      {chartData.length > 1 && (
        <div className="bg-card rounded-xl border border-border p-5">
          <h3 className="font-semibold text-sm mb-4">Temperature & Humidity Trend</h3>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(150,12%,88%)" />
              <XAxis dataKey="date" tick={{ fontSize: 10 }} />
              <YAxis yAxisId="left" tick={{ fontSize: 10 }} label={{ value: "Temp (°C)", angle: -90, position: "insideLeft", offset: 10, style: { fontSize: 10, fill: "hsl(0,72%,51%)" } }} />
              <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 10 }} label={{ value: "Humidity (%)", angle: 90, position: "insideRight", offset: 10, style: { fontSize: 10, fill: "hsl(199,89%,48%)" } }} />
              <Tooltip />
              <Legend />
              <Line yAxisId="left" type="monotone" dataKey="temp" stroke="hsl(0,72%,51%)" strokeWidth={2} name="Temp (°C)" dot={false} />
              <Line yAxisId="right" type="monotone" dataKey="humidity" stroke="hsl(199,89%,48%)" strokeWidth={2} name="Humidity (%)" dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {!loading && records.length === 0 ? (
        <EmptyState icon={Thermometer} title="No environmental logs" description="Log readings from your greenhouses." action={<Button onClick={() => setShowModal(true)}><Plus className="w-4 h-4 mr-1" />Log Reading</Button>} />
      ) : (
        <DataTable columns={columns} data={filtered} loading={loading} />
      )}

      <Modal open={showModal} onClose={() => setShowModal(false)} title="Log Environmental Reading">
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <FormField label="Greenhouse" required>
              <Select value={form.greenhouse_id} onValueChange={v => setForm(f => ({ ...f, greenhouse_id: v }))}>
                <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent>{greenhouses.map(g => <SelectItem key={g.id} value={g.id}>{g.code}</SelectItem>)}</SelectContent>
              </Select>
            </FormField>
            <FormField label="Date" required>
              <Input type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} />
            </FormField>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <FormField label="Time">
              <Input type="time" value={form.time} onChange={e => setForm(f => ({ ...f, time: e.target.value }))} />
            </FormField>
            <FormField label="Temperature (°C)">
              <Input type="number" value={form.temperature_c} onChange={e => setForm(f => ({ ...f, temperature_c: e.target.value }))} placeholder="25.0" step="0.1" />
            </FormField>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <FormField label="Humidity (%)">
              <Input type="number" value={form.humidity_pct} onChange={e => setForm(f => ({ ...f, humidity_pct: e.target.value }))} placeholder="65" step="0.1" />
            </FormField>
            <FormField label="CO₂ (ppm)">
              <Input type="number" value={form.co2_ppm} onChange={e => setForm(f => ({ ...f, co2_ppm: e.target.value }))} placeholder="400" />
            </FormField>
            <FormField label="Light (lux)">
              <Input type="number" value={form.light_lux} onChange={e => setForm(f => ({ ...f, light_lux: e.target.value }))} placeholder="5000" />
            </FormField>
          </div>
          <FormField label="Notes">
            <Input value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} placeholder="Optional..." />
          </FormField>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setShowModal(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving || !form.greenhouse_id || !form.date}>
              {saving ? "Saving…" : "Log Reading"}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}