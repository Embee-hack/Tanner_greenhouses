import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import PageHeader from "@/components/shared/PageHeader";

import Modal from "@/components/shared/Modal";
import FormField from "@/components/shared/FormField";
import EmptyState from "@/components/shared/EmptyState";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Sprout, Pencil, Maximize2, Layers, CheckCircle2, LayoutGrid } from "lucide-react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";

const statusConfig = {
  active: { label: "Active", bg: "bg-emerald-50", text: "text-emerald-700", dot: "bg-emerald-500", border: "border-emerald-200" },
  inactive: { label: "Inactive", bg: "bg-slate-50", text: "text-slate-500", dot: "bg-slate-400", border: "border-slate-200" },
  maintenance: { label: "Maintenance", bg: "bg-amber-50", text: "text-amber-700", dot: "bg-amber-500", border: "border-amber-200" },
};

const blockColors = [
  "from-primary to-primary/70",
  "from-accent to-accent/70",
  "from-success to-success/70",
  "from-warning to-warning/70",
  "from-danger to-danger/70",
  "from-primary/60 to-primary/80",
];

function GreenhouseCard({ gh, onEdit }) {
  const sc = statusConfig[gh.status] || statusConfig.active;
  const colorIdx = parseInt(gh.code?.replace(/\D/g, "") || "0") % blockColors.length;
  const gradient = blockColors[colorIdx];

  return (
    <div className="bg-card rounded-2xl border border-border overflow-hidden shadow-sm hover:shadow-md transition-shadow group">
      {/* Color header */}
      <div className={`h-0.5 bg-gradient-to-r ${gradient} opacity-40`} />
      <div className="p-4">
        <div className="flex items-start justify-between mb-3">
          <div>
            <span className="text-2xl font-black text-foreground">{gh.code}</span>
            {gh.name && <h3 className="font-medium text-foreground text-xs mt-1 text-muted-foreground">{gh.name}</h3>}
          </div>
          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border ${sc.bg} ${sc.text} ${sc.border}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${sc.dot}`} />
            {sc.label}
          </span>
        </div>

        <div className="grid grid-cols-2 gap-2 mb-4">
          <div className="bg-muted/50 rounded-xl p-2.5">
            <div className="flex items-center gap-1 mb-1">
              <Maximize2 className="w-3 h-3 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">Area</span>
            </div>
            <p className="text-sm font-bold text-foreground">{gh.area ? gh.area.toLocaleString() : "—"} <span className="text-xs font-normal text-muted-foreground">m²</span></p>
          </div>
          <div className="bg-muted/50 rounded-xl p-2.5">
            <div className="flex items-center gap-1 mb-1">
              <Layers className="w-3 h-3 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">Capacity</span>
            </div>
            <p className="text-sm font-bold text-foreground">{gh.capacity_plants ? gh.capacity_plants.toLocaleString() : "—"} <span className="text-xs font-normal text-muted-foreground">plants</span></p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Link
            to={createPageUrl(`GreenhouseDetail?id=${gh.id}`)}
            className="flex-1 text-center text-xs font-semibold bg-primary text-primary-foreground rounded-lg py-1.5 hover:opacity-90 transition-opacity"
          >
            View Details
          </Link>
          <button
            onClick={() => onEdit(gh)}
            className="p-1.5 rounded-lg border border-border hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
          >
            <Pencil className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}

function StatCard({ icon: Icon, label, value, sub, color }) {
  return (
    <div className="bg-card rounded-2xl border border-border p-4 flex items-center gap-3">
      <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${color}`}>
        <Icon className="w-4 h-4 text-white" />
      </div>
      <div className="min-w-0">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-xl font-black text-foreground leading-tight">{value}</p>
        {sub && <p className="text-xs text-muted-foreground">{sub}</p>}
      </div>
    </div>
  );
}

const defaultForm = { code: "", name: "", block_id: "", area: "", capacity_plants: "", status: "active", notes: "" };
const defaultBlockForm = { code: "", name: "", notes: "" };

export default function Greenhouses() {
  const [greenhouses, setGreenhouses] = useState([]);
  const [blocks, setBlocks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showBlockModal, setShowBlockModal] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [form, setForm] = useState(defaultForm);
  const [blockForm, setBlockForm] = useState(defaultBlockForm);
  const [saving, setSaving] = useState(false);
  const [savingBlock, setSavingBlock] = useState(false);

  const load = () => {
    Promise.all([
      base44.entities.Greenhouse.list("code"),
      base44.entities.Block.list("name"),
    ]).then(([gh, bl]) => {
      setGreenhouses(gh);
      setBlocks(bl);
      setLoading(false);
    });
  };

  useEffect(() => { load(); }, []);

  const openAdd = () => { setForm(defaultForm); setEditItem(null); setShowModal(true); };
  const openEdit = (row) => {
    setForm({
      ...defaultForm,
      ...row,
      block_id: row.block_id || "",
      area: row.area ?? "",
      capacity_plants: row.capacity_plants ?? "",
    });
    setEditItem(row);
    setShowModal(true);
  };

  const handleSave = async () => {
    setSaving(true);
    const data = {
      ...form,
      name: String(form.name || "").trim() || null,
      block_id: form.block_id || null,
      area: form.area ? parseFloat(form.area) : null,
      capacity_plants: form.capacity_plants ? parseInt(form.capacity_plants) : null,
    };
    if (editItem) {
      await base44.entities.Greenhouse.update(editItem.id, data);
    } else {
      await base44.entities.Greenhouse.create(data);
    }
    setSaving(false);
    setShowModal(false);
    load();
  };

  const handleCreateBlock = async () => {
    const blockCode = String(blockForm.code || "").trim();
    const blockName = String(blockForm.name || "").trim();
    if (!blockCode && !blockName) return;
    setSavingBlock(true);
    await base44.entities.Block.create({
      code: blockCode || null,
      name: blockName || blockCode || "Unnamed Block",
      notes: String(blockForm.notes || "").trim() || null,
      status: "active",
    });
    setBlockForm(defaultBlockForm);
    setSavingBlock(false);
    load();
  };

  const formatBlockLabel = (block) => {
    if (!block) return "";
    if (block.code) return `${block.code} — ${block.name || "Unnamed Block"}`;
    return block.name || "Unnamed Block";
  };

  const activeCount = greenhouses.filter(g => g.status === "active").length;
  const maintenanceCount = greenhouses.filter(g => g.status === "maintenance").length;
  const totalArea = greenhouses.reduce((sum, g) => sum + (g.area || 0), 0);
  const totalCapacity = greenhouses.reduce((sum, g) => sum + (g.capacity_plants || 0), 0);

  return (
    <div className="p-4 md:p-6">
      <PageHeader
        title="Greenhouses"
        subtitle={`${greenhouses.length} total · ${activeCount} active`}
        actions={
          <>
            <Button size="sm" variant="outline" onClick={() => setShowBlockModal(true)} className="gap-1.5">
              <Layers className="w-4 h-4" /> Manage Blocks
            </Button>
            <Button size="sm" onClick={openAdd} className="gap-1.5">
              <Plus className="w-4 h-4" /> Add Greenhouse
            </Button>
          </>
        }
      />

      {!loading && greenhouses.length > 0 && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
          <StatCard icon={LayoutGrid} label="Total Greenhouses" value={greenhouses.length} sub={`${blocks.length} block${blocks.length !== 1 ? "s" : ""}`} color="bg-primary" />
          <StatCard icon={CheckCircle2} label="Active" value={activeCount} sub={maintenanceCount > 0 ? `${maintenanceCount} in maintenance` : "all operational"} color="bg-emerald-500" />
          <StatCard icon={Maximize2} label="Total Area" value={totalArea ? `${totalArea.toLocaleString()} m²` : "—"} sub={totalArea ? `avg ${Math.round(totalArea / greenhouses.length).toLocaleString()} m² each` : "not recorded"} color="bg-blue-500" />
          <StatCard icon={Layers} label="Total Capacity" value={totalCapacity ? totalCapacity.toLocaleString() : "—"} sub={totalCapacity ? "plants across all units" : "not recorded"} color="bg-violet-500" />
        </div>
      )}

      {!loading && greenhouses.length === 0 ? (
        <EmptyState icon={Sprout} title="No greenhouses yet" description="Add your first greenhouse to get started." action={<Button onClick={openAdd}><Plus className="w-4 h-4 mr-1" />Add Greenhouse</Button>} />
      ) : loading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
          {Array.from({ length: 12 }).map((_, i) => (
            <div key={i} className="h-44 bg-muted animate-pulse rounded-2xl" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
          {greenhouses.map(gh => (
            <GreenhouseCard key={gh.id} gh={gh} onEdit={openEdit} />
          ))}
        </div>
      )}

      <Modal open={showModal} onClose={() => setShowModal(false)} title={editItem ? "Edit Greenhouse" : "Add Greenhouse"}>
        <div className="space-y-4">
          {blocks.length > 0 && (
            <FormField label="Block">
              <Select
                value={form.block_id}
                onValueChange={(v) =>
                  setForm((f) => {
                    const selectedBlock = blocks.find((b) => b.id === v);
                    return {
                      ...f,
                      block_id: v,
                      name: f.name || selectedBlock?.name || "",
                    };
                  })
                }
              >
                <SelectTrigger><SelectValue placeholder="Select block (optional)" /></SelectTrigger>
                <SelectContent>
                  {blocks.map((block) => (
                    <SelectItem key={block.id} value={block.id}>{formatBlockLabel(block)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FormField>
          )}
          <div className="grid grid-cols-2 gap-4">
            <FormField label="Code" required>
              <Input value={form.code} onChange={e => setForm(f => ({ ...f, code: e.target.value }))} placeholder="GH-01" />
            </FormField>
            <FormField label="Name (optional)">
              <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Optional greenhouse name" />
            </FormField>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <FormField label="Area (m²)">
              <Input type="number" value={form.area} onChange={e => setForm(f => ({ ...f, area: e.target.value }))} placeholder="500" />
            </FormField>
            <FormField label="Plant Capacity">
              <Input type="number" value={form.capacity_plants} onChange={e => setForm(f => ({ ...f, capacity_plants: e.target.value }))} placeholder="2000" />
            </FormField>
          </div>
          <FormField label="Status">
            <Select value={form.status} onValueChange={v => setForm(f => ({ ...f, status: v }))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
                <SelectItem value="maintenance">Maintenance</SelectItem>
              </SelectContent>
            </Select>
          </FormField>
          <FormField label="Notes">
            <Input value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} placeholder="Optional notes..." />
          </FormField>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setShowModal(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving || !form.code}>
              {saving ? "Saving…" : editItem ? "Update" : "Add Greenhouse"}
            </Button>
          </div>
        </div>
      </Modal>

      <Modal open={showBlockModal} onClose={() => setShowBlockModal(false)} title="Manage Blocks">
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <FormField label="Block Code">
              <Input
                value={blockForm.code}
                onChange={(e) => setBlockForm((f) => ({ ...f, code: e.target.value }))}
                placeholder="BLK-A"
              />
            </FormField>
            <FormField label="Block Name (optional)">
              <Input
                value={blockForm.name}
                onChange={(e) => setBlockForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="Block A"
              />
            </FormField>
          </div>
          <FormField label="Notes">
            <Input
              value={blockForm.notes}
              onChange={(e) => setBlockForm((f) => ({ ...f, notes: e.target.value }))}
              placeholder="Optional notes..."
            />
          </FormField>
          <div className="flex justify-end">
            <Button
              onClick={handleCreateBlock}
              disabled={savingBlock || (!String(blockForm.code || "").trim() && !String(blockForm.name || "").trim())}
            >
              {savingBlock ? "Saving…" : "Create Block"}
            </Button>
          </div>

          <div className="rounded-xl border border-border divide-y divide-border">
            {blocks.length === 0 ? (
              <div className="px-4 py-6 text-sm text-muted-foreground text-center">
                No blocks created yet.
              </div>
            ) : (
              blocks.map((block) => (
                <div key={block.id} className="px-4 py-3">
                  <div className="text-sm font-semibold text-foreground">{formatBlockLabel(block)}</div>
                  {block.notes && <div className="text-xs text-muted-foreground mt-0.5">{block.notes}</div>}
                </div>
              ))
            )}
          </div>
        </div>
      </Modal>
    </div>
  );
}
