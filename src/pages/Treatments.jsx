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
import { Plus, FlaskConical } from "lucide-react";

const TYPES = ["chemical","biological","physical","cultural","other"];
const OUTCOMES = ["pending","effective","partial","ineffective"];
const defaultForm = { greenhouse_id: "", incident_id: "", date: new Date().toISOString().slice(0, 10), treatment_type: "chemical", chemical_name: "", dose: "", applicator: "", notes: "", outcome: "pending" };

export default function Treatments() {
  const [records, setRecords] = useState([]);
  const [greenhouses, setGreenhouses] = useState([]);
  const [incidents, setIncidents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState(defaultForm);
  const [saving, setSaving] = useState(false);

  const load = () => {
    Promise.all([
      base44.entities.Treatment.list("-date", 200),
      base44.entities.Greenhouse.list("code"),
      base44.entities.Incident.filter({ status: "open" }),
    ]).then(([tr, gh, inc]) => {
      setRecords(tr);
      setGreenhouses(gh);
      setIncidents(inc);
      setLoading(false);
    });
  };

  useEffect(() => { load(); }, []);

  const ghMap = Object.fromEntries(greenhouses.map(g => [g.id, g]));
  const openIncidents = incidents.filter(i => i.greenhouse_id === form.greenhouse_id);

  const handleSave = async () => {
    setSaving(true);
    await base44.entities.Treatment.create({
      ...form,
      incident_id: form.incident_id || null,
    });
    setSaving(false);
    setShowModal(false);
    load();
  };

  const columns = [
    { key: "date", label: "Date" },
    { key: "greenhouse_id", label: "Greenhouse", render: v => ghMap[v]?.code ?? "—" },
    { key: "treatment_type", label: "Type", render: v => <span className="capitalize">{v}</span> },
    { key: "chemical_name", label: "Chemical/Agent", render: v => v || "—" },
    { key: "dose", label: "Dose", render: v => v || "—" },
    { key: "applicator", label: "Applicator", render: v => v || "—" },
    { key: "outcome", label: "Outcome", render: v => <StatusBadge status={v} /> },
  ];

  return (
    <div className="p-4 md:p-6">
      <PageHeader
        title="Treatments"
        subtitle={`${records.length} treatments logged`}
        actions={
          <Button size="sm" onClick={() => { setForm(defaultForm); setShowModal(true); }} className="gap-1.5">
            <Plus className="w-4 h-4" /> Log Treatment
          </Button>
        }
      />

      {!loading && records.length === 0 ? (
        <EmptyState icon={FlaskConical} title="No treatments logged" description="Log treatments applied to greenhouses." action={<Button onClick={() => setShowModal(true)}><Plus className="w-4 h-4 mr-1" />Log Treatment</Button>} />
      ) : (
        <DataTable columns={columns} data={records} loading={loading} />
      )}

      <Modal open={showModal} onClose={() => setShowModal(false)} title="Log Treatment">
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <FormField label="Greenhouse" required>
              <Select value={form.greenhouse_id} onValueChange={v => setForm(f => ({ ...f, greenhouse_id: v, incident_id: "" }))}>
                <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent>{greenhouses.map(g => <SelectItem key={g.id} value={g.id}>{g.code}</SelectItem>)}</SelectContent>
              </Select>
            </FormField>
            <FormField label="Date" required>
              <Input type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} />
            </FormField>
          </div>
          <FormField label="Related Incident (optional)">
            <Select value={form.incident_id} onValueChange={v => setForm(f => ({ ...f, incident_id: v }))}>
              <SelectTrigger><SelectValue placeholder="None" /></SelectTrigger>
              <SelectContent>
                <SelectItem value={null}>None</SelectItem>
                {openIncidents.map(i => <SelectItem key={i.id} value={i.id}>{i.name || i.incident_type} ({i.date})</SelectItem>)}
              </SelectContent>
            </Select>
          </FormField>
          <div className="grid grid-cols-2 gap-4">
            <FormField label="Treatment Type" required>
              <Select value={form.treatment_type} onValueChange={v => setForm(f => ({ ...f, treatment_type: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{TYPES.map(t => <SelectItem key={t} value={t} className="capitalize">{t}</SelectItem>)}</SelectContent>
              </Select>
            </FormField>
            <FormField label="Outcome">
              <Select value={form.outcome} onValueChange={v => setForm(f => ({ ...f, outcome: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{OUTCOMES.map(o => <SelectItem key={o} value={o} className="capitalize">{o}</SelectItem>)}</SelectContent>
              </Select>
            </FormField>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <FormField label="Chemical/Agent Name">
              <Input value={form.chemical_name} onChange={e => setForm(f => ({ ...f, chemical_name: e.target.value }))} placeholder="e.g. Imidacloprid" />
            </FormField>
            <FormField label="Dose">
              <Input value={form.dose} onChange={e => setForm(f => ({ ...f, dose: e.target.value }))} placeholder="e.g. 2ml/L" />
            </FormField>
          </div>
          <FormField label="Applicator">
            <Input value={form.applicator} onChange={e => setForm(f => ({ ...f, applicator: e.target.value }))} placeholder="Person/team applying" />
          </FormField>
          <FormField label="Notes">
            <Textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} className="h-16 resize-none" />
          </FormField>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setShowModal(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving || !form.greenhouse_id || !form.treatment_type}>
              {saving ? "Saving…" : "Log Treatment"}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}