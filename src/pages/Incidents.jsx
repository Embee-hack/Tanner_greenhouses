import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import PageHeader from "@/components/shared/PageHeader";
import DataTable from "@/components/shared/DataTable";
import StatusBadge from "@/components/shared/StatusBadge";
import Modal from "@/components/shared/Modal";
import FormField from "@/components/shared/FormField";
import EmptyState from "@/components/shared/EmptyState";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Bug } from "lucide-react";

const TYPES = ["pest","disease","environmental","structural","other"];
const SEVERITIES = ["low","medium","high","critical"];
const defaultForm = { greenhouse_id: "", cycle_id: "", date: new Date().toISOString().slice(0, 10), incident_type: "pest", name: "", severity: "medium", affected_plants: "", description: "", status: "open" };

export default function Incidents() {
  const [records, setRecords] = useState([]);
  const [greenhouses, setGreenhouses] = useState([]);
  const [cycles, setCycles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState(defaultForm);
  const [saving, setSaving] = useState(false);

  const load = () => {
    Promise.all([
      base44.entities.Incident.list("-date", 200),
      base44.entities.Greenhouse.list("code"),
      base44.entities.CropCycle.filter({ status: "active" }),
    ]).then(([inc, gh, cy]) => {
      setRecords(inc);
      setGreenhouses(gh);
      setCycles(cy);
      setLoading(false);
    });
  };

  useEffect(() => { load(); }, []);

  const ghMap = Object.fromEntries(greenhouses.map(g => [g.id, g]));
  const availableCycles = cycles.filter(c => c.greenhouse_id === form.greenhouse_id);

  const handleSave = async () => {
    setSaving(true);
    await base44.entities.Incident.create({
      ...form,
      affected_plants: form.affected_plants ? parseInt(form.affected_plants) : null,
      cycle_id: form.cycle_id || null,
    });
    setSaving(false);
    setShowModal(false);
    load();
  };

  const updateStatus = async (incident, status) => {
    await base44.entities.Incident.update(incident.id, { status });
    load();
  };

  const columns = [
    { key: "date", label: "Date" },
    { key: "greenhouse_id", label: "Greenhouse", render: v => ghMap[v]?.code ?? "—" },
    { key: "incident_type", label: "Type", render: v => <span className="capitalize">{v}</span> },
    { key: "name", label: "Name/Pest", render: v => v || "—" },
    { key: "severity", label: "Severity", render: v => <StatusBadge status={v} /> },
    { key: "affected_plants", label: "Plants", align: "right", render: v => v?.toLocaleString() ?? "—" },
    { key: "status", label: "Status", render: v => <StatusBadge status={v} /> },
    {
      key: "id", label: "Actions",
      render: (_, row) => row.status === "open" ? (
        <div className="flex gap-1.5">
          <button onClick={() => updateStatus(row, "treated")} className="text-xs text-warning hover:underline">Treating</button>
          <button onClick={() => updateStatus(row, "resolved")} className="text-xs text-success hover:underline">Resolve</button>
        </div>
      ) : null
    },
  ];

  return (
    <div className="p-4 md:p-6">
      <PageHeader
        title="Pest & Disease Incidents"
        subtitle={`${records.filter(r => r.status === "open").length} open incidents`}
        actions={
          <Button size="sm" onClick={() => { setForm(defaultForm); setShowModal(true); }} className="gap-1.5">
            <Plus className="w-4 h-4" /> Report Incident
          </Button>
        }
      />

      {!loading && records.length === 0 ? (
        <EmptyState icon={Bug} title="No incidents reported" description="Report pest or disease incidents." action={<Button onClick={() => setShowModal(true)}><Plus className="w-4 h-4 mr-1" />Report Incident</Button>} />
      ) : (
        <DataTable columns={columns} data={records} loading={loading} />
      )}

      <Modal open={showModal} onClose={() => setShowModal(false)} title="Report Incident">
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <FormField label="Greenhouse" required>
              <Select value={form.greenhouse_id} onValueChange={v => setForm(f => ({ ...f, greenhouse_id: v, cycle_id: "" }))}>
                <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent>{greenhouses.map(g => <SelectItem key={g.id} value={g.id}>{g.code}</SelectItem>)}</SelectContent>
              </Select>
            </FormField>
            <FormField label="Date" required>
              <Input type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} />
            </FormField>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <FormField label="Type" required>
              <Select value={form.incident_type} onValueChange={v => setForm(f => ({ ...f, incident_type: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{TYPES.map(t => <SelectItem key={t} value={t} className="capitalize">{t}</SelectItem>)}</SelectContent>
              </Select>
            </FormField>
            <FormField label="Severity" required>
              <Select value={form.severity} onValueChange={v => setForm(f => ({ ...f, severity: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{SEVERITIES.map(s => <SelectItem key={s} value={s} className="capitalize">{s}</SelectItem>)}</SelectContent>
              </Select>
            </FormField>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <FormField label="Pest/Disease Name">
              <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. Aphids" />
            </FormField>
            <FormField label="Affected Plants">
              <Input type="number" value={form.affected_plants} onChange={e => setForm(f => ({ ...f, affected_plants: e.target.value }))} placeholder="0" />
            </FormField>
          </div>
          <FormField label="Description">
            <Textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Describe the incident..." className="h-20 resize-none" />
          </FormField>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setShowModal(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving || !form.greenhouse_id || !form.incident_type}>
              {saving ? "Saving…" : "Report Incident"}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}