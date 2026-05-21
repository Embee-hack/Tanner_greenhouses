import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import PageHeader from "@/components/shared/PageHeader";
import Modal from "@/components/shared/Modal";
import FormField from "@/components/shared/FormField";
import EmptyState from "@/components/shared/EmptyState";
import DeleteConfirmDialog from "@/components/shared/DeleteConfirmDialog.jsx";
import ErrorBanner from "@/components/shared/ErrorBanner.jsx";
import RecordActions from "@/components/shared/RecordActions.jsx";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Plus, Sprout, Pencil, Maximize2, Layers, CheckCircle2, LayoutGrid, Trash2, MoreHorizontal, ArrowUpRight } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { getErrorMessage } from "@/lib/errors.js";

const statusConfig = {
  active: { label: "Active", bg: "bg-success/14", text: "text-success", dot: "bg-success", border: "border-success/35" },
  inactive: { label: "Inactive", bg: "bg-muted/70", text: "text-muted-foreground", dot: "bg-muted-foreground", border: "border-border" },
  maintenance: { label: "Maintenance", bg: "bg-warning/14", text: "text-warning", dot: "bg-warning", border: "border-warning/35" },
};

const blockColors = [
  "from-primary to-primary/70",
  "from-accent to-accent/70",
  "from-success to-success/70",
  "from-warning to-warning/70",
  "from-danger to-danger/70",
  "from-primary/60 to-primary/80",
];

function GreenhouseRow({ gh, blockLabel, onOpen, onEdit, onDelete }) {
  const sc = statusConfig[gh.status] || statusConfig.active;

  return (
    <div className="flex items-start gap-3 p-3 sm:p-4">
      <button
        type="button"
        onClick={() => onOpen(gh)}
        className="flex-1 min-w-0 rounded-2xl border border-border/70 bg-background/70 px-4 py-4 text-left transition-all hover:border-primary/30 hover:bg-muted/40 hover:shadow-sm"
      >
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center">
          <div className="min-w-0 xl:w-72">
            <div className="flex flex-wrap items-center gap-3">
              <span className="text-3xl font-black tracking-tight text-foreground">{gh.code}</span>
              <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium border ${sc.bg} ${sc.text} ${sc.border}`}>
                <span className={`w-1.5 h-1.5 rounded-full ${sc.dot}`} />
                {sc.label}
              </span>
            </div>
            <div className="mt-1 text-sm font-medium text-foreground">{gh.name || "No greenhouse name"}</div>
            <div className="mt-1 text-xs text-muted-foreground">{blockLabel}</div>
          </div>

          <div className="grid flex-1 grid-cols-1 gap-3 sm:grid-cols-3">
            <div className="rounded-xl bg-muted/50 px-3 py-3">
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <Maximize2 className="w-3 h-3" />
                Area
              </div>
              <div className="mt-1 text-lg font-bold text-foreground">
                {gh.area ? gh.area.toLocaleString() : "—"}
                <span className="ml-1 text-sm font-normal text-muted-foreground">m²</span>
              </div>
            </div>

            <div className="rounded-xl bg-muted/50 px-3 py-3">
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <Layers className="w-3 h-3" />
                Capacity
              </div>
              <div className="mt-1 text-lg font-bold text-foreground">
                {gh.capacity_plants ? gh.capacity_plants.toLocaleString() : "—"}
                <span className="ml-1 text-sm font-normal text-muted-foreground">plants</span>
              </div>
            </div>

            <div className="rounded-xl bg-muted/50 px-3 py-3">
              <div className="text-xs text-muted-foreground">Notes</div>
              <div className="mt-1 truncate text-sm font-medium text-foreground">{gh.notes || "No extra notes"}</div>
            </div>
          </div>

          <div className="flex items-center justify-between gap-3 xl:w-36 xl:justify-end">
            <span className="text-sm font-semibold text-primary">Open details</span>
            <ArrowUpRight className="w-4 h-4 text-primary" />
          </div>
        </div>
      </button>

      <div className="pt-2" onClick={(event) => event.stopPropagation()}>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-9 w-9 text-muted-foreground" aria-label={`Open actions for ${gh.code}`}>
              <MoreHorizontal className="w-4 h-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-40">
            <DropdownMenuItem onSelect={() => onEdit(gh)}>
              <Pencil className="w-4 h-4" />
              Edit
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={() => onDelete(gh)} className="text-danger focus:text-danger">
              <Trash2 className="w-4 h-4" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}

function GreenhouseSection({ title, subtitle, gradient, rows, onOpen, onEdit, onDelete }) {
  return (
    <section className="overflow-hidden rounded-3xl border border-border bg-card shadow-sm">
      <div className={`h-1 bg-gradient-to-r ${gradient}`} />
      <div className="border-b border-border px-4 py-4 sm:px-5">
        <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h3 className="text-base font-semibold text-foreground">{title}</h3>
            <p className="text-sm text-muted-foreground">{subtitle}</p>
          </div>
          <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            {rows.length} greenhouse{rows.length === 1 ? "" : "s"}
          </div>
        </div>
      </div>
      <div className="divide-y divide-border">
        {rows.map((gh) => (
          <GreenhouseRow
            key={gh.id}
            gh={gh}
            blockLabel={title}
            onOpen={onOpen}
            onEdit={onEdit}
            onDelete={onDelete}
          />
        ))}
      </div>
    </section>
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
const NONE_VALUE = "__none__";

export default function Greenhouses() {
  const navigate = useNavigate();
  const location = useLocation();
  const [greenhouses, setGreenhouses] = useState([]);
  const [blocks, setBlocks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showBlockModal, setShowBlockModal] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [editBlock, setEditBlock] = useState(null);
  const [form, setForm] = useState(defaultForm);
  const [blockForm, setBlockForm] = useState(defaultBlockForm);
  const [saving, setSaving] = useState(false);
  const [savingBlock, setSavingBlock] = useState(false);
  const [deleteDialog, setDeleteDialog] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [error, setError] = useState("");
  const [blockError, setBlockError] = useState("");

  const load = async () => {
    try {
      setLoading(true);
      const [gh, bl] = await Promise.all([
        base44.entities.Greenhouse.list("code"),
        base44.entities.Block.list("name"),
      ]);
      setGreenhouses(gh);
      setBlocks(bl);
      setLoadError("");
    } catch (err) {
      setLoadError(getErrorMessage(err, "Failed to load greenhouses."));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const openAdd = () => {
    setError("");
    setForm(defaultForm);
    setEditItem(null);
    setShowModal(true);
  };

  const openEdit = (row) => {
    setError("");
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

  const closeModal = () => {
    setShowModal(false);
    setEditItem(null);
    setForm(defaultForm);
    setError("");
  };

  const openBlockModal = () => {
    setBlockError("");
    setEditBlock(null);
    setBlockForm(defaultBlockForm);
    setShowBlockModal(true);
  };

  useEffect(() => {
    const settingsPanel = new URLSearchParams(location.search).get("settings");
    if (settingsPanel !== "blocks" || loading || showBlockModal) return;
    openBlockModal();
    navigate(createPageUrl("Greenhouses"), { replace: true });
  }, [location.search, loading, navigate, showBlockModal]);

  const openEditBlock = (block) => {
    setBlockError("");
    setEditBlock(block);
    setBlockForm({
      ...defaultBlockForm,
      ...block,
    });
    setShowBlockModal(true);
  };

  const closeBlockModal = () => {
    setShowBlockModal(false);
    setEditBlock(null);
    setBlockForm(defaultBlockForm);
    setBlockError("");
  };

  const handleSave = async () => {
    setSaving(true);
    setError("");
    try {
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
      closeModal();
      await load();
    } catch (err) {
      setError(getErrorMessage(err, "Failed to save greenhouse."));
    } finally {
      setSaving(false);
    }
  };

  const handleSaveBlock = async () => {
    const blockCode = String(blockForm.code || "").trim();
    const blockName = String(blockForm.name || "").trim();
    if (!blockCode && !blockName) return;
    setSavingBlock(true);
    setBlockError("");
    try {
      const payload = {
        code: blockCode || null,
        name: blockName || blockCode || "Unnamed Block",
        notes: String(blockForm.notes || "").trim() || null,
        status: editBlock?.status || "active",
      };
      if (editBlock) {
        await base44.entities.Block.update(editBlock.id, payload);
      } else {
        await base44.entities.Block.create(payload);
      }
      setEditBlock(null);
      setBlockForm(defaultBlockForm);
      await load();
    } catch (err) {
      setBlockError(getErrorMessage(err, `Failed to ${editBlock ? "update" : "create"} block.`));
    } finally {
      setSavingBlock(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteDialog) return;
    setDeleting(true);
    try {
      if (deleteDialog.kind === "block") {
        const greenhouseCount = greenhouses.filter((greenhouse) => greenhouse.block_id === deleteDialog.item.id).length;
        if (greenhouseCount > 0) {
          setBlockError(`This block is assigned to ${greenhouseCount} greenhouse${greenhouseCount === 1 ? "" : "s"}. Reassign them first.`);
          setDeleting(false);
          return;
        }
        await base44.entities.Block.delete(deleteDialog.item.id);
        if (editBlock?.id === deleteDialog.item.id) {
          setEditBlock(null);
          setBlockForm(defaultBlockForm);
        }
      } else {
        await base44.entities.Greenhouse.delete(deleteDialog.item.id);
        if (editItem?.id === deleteDialog.item.id) {
          closeModal();
        }
      }
      setDeleteDialog(null);
      await load();
    } catch (err) {
      const fallback = deleteDialog.kind === "block" ? "Failed to delete block." : "Failed to delete greenhouse.";
      if (deleteDialog.kind === "block") {
        setBlockError(getErrorMessage(err, fallback));
      } else {
        setLoadError(getErrorMessage(err, fallback));
      }
    } finally {
      setDeleting(false);
    }
  };

  const formatBlockLabel = (block) => {
    if (!block) return "";
    if (block.code) return `${block.code} — ${block.name || "Unnamed Block"}`;
    return block.name || "Unnamed Block";
  };

  const greenhouseGroups = [...greenhouses]
    .sort((a, b) => String(a.code || "").localeCompare(String(b.code || "")))
    .reduce((groups, greenhouse) => {
      const block = blocks.find((item) => item.id === greenhouse.block_id) || null;
      const key = block?.id || "__unassigned__";
      if (!groups[key]) {
        groups[key] = {
          key,
          title: block ? formatBlockLabel(block) : "Unassigned Greenhouses",
          gradient: blockColors[Object.keys(groups).length % blockColors.length],
          rows: [],
        };
      }
      groups[key].rows.push(greenhouse);
      return groups;
    }, {});

  const groupedGreenhouses = Object.values(greenhouseGroups).sort((a, b) => {
    if (a.key === "__unassigned__") return 1;
    if (b.key === "__unassigned__") return -1;
    return a.title.localeCompare(b.title);
  });

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
            <Button size="sm" variant="outline" onClick={openBlockModal} className="gap-1.5">
              <Layers className="w-4 h-4" /> Manage Blocks
            </Button>
            <Button size="sm" onClick={openAdd} className="gap-1.5">
              <Plus className="w-4 h-4" /> Add Greenhouse
            </Button>
          </>
        }
      />

      <ErrorBanner message={loadError} onRetry={load} className="mb-6" />

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
        <div className="space-y-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-32 bg-muted animate-pulse rounded-3xl" />
          ))}
        </div>
      ) : (
        <div className="space-y-4">
          {groupedGreenhouses.map((group) => {
            const groupArea = group.rows.reduce((sum, item) => sum + (item.area || 0), 0);
            const groupCapacity = group.rows.reduce((sum, item) => sum + (item.capacity_plants || 0), 0);

            return (
              <GreenhouseSection
                key={group.key}
                title={group.title}
                subtitle={`${groupArea ? `${groupArea.toLocaleString()} m²` : "Area not recorded"} · ${groupCapacity ? `${groupCapacity.toLocaleString()} plants capacity` : "Capacity not recorded"}`}
                gradient={group.gradient}
                rows={group.rows}
                onOpen={(row) => navigate(createPageUrl(`GreenhouseDetail?id=${row.id}`))}
                onEdit={openEdit}
                onDelete={(row) => setDeleteDialog({ kind: "greenhouse", item: row })}
              />
            );
          })}
        </div>
      )}

      <Modal open={showModal} onClose={closeModal} title={editItem ? "Edit Greenhouse" : "Add Greenhouse"}>
        <div className="space-y-4">
          {blocks.length > 0 && (
            <FormField label="Block">
              <Select
                value={form.block_id || NONE_VALUE}
                onValueChange={(v) =>
                  setForm((f) => {
                    const selectedBlock = blocks.find((b) => b.id === v);
                    return {
                      ...f,
                      block_id: v === NONE_VALUE ? "" : v,
                      name: f.name || selectedBlock?.name || "",
                    };
                  })
                }
              >
                <SelectTrigger><SelectValue placeholder="Select block (optional)" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value={NONE_VALUE}>No block assigned</SelectItem>
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
          {error ? <div className="bg-danger/10 text-danger text-sm rounded-lg px-4 py-2">{error}</div> : null}
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={closeModal}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving || !form.code}>
              {saving ? "Saving…" : editItem ? "Update" : "Add Greenhouse"}
            </Button>
          </div>
        </div>
      </Modal>

      <Modal open={showBlockModal} onClose={closeBlockModal} title="Manage Blocks">
        <div className="space-y-4">
          {blockError ? <div className="bg-danger/10 text-danger text-sm rounded-lg px-4 py-2">{blockError}</div> : null}
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
              onClick={handleSaveBlock}
              disabled={savingBlock || (!String(blockForm.code || "").trim() && !String(blockForm.name || "").trim())}
            >
              {savingBlock ? "Saving…" : editBlock ? "Save Block" : "Create Block"}
            </Button>
          </div>

          <div className="rounded-xl border border-border divide-y divide-border">
            {blocks.length === 0 ? (
              <div className="px-4 py-6 text-sm text-muted-foreground text-center">
                No blocks created yet.
              </div>
            ) : (
              blocks.map((block) => (
                <div key={block.id} className="px-4 py-3 flex items-start justify-between gap-3">
                  <div>
                    <div className="text-sm font-semibold text-foreground">{formatBlockLabel(block)}</div>
                    {block.notes && <div className="text-xs text-muted-foreground mt-0.5">{block.notes}</div>}
                  </div>
                  <RecordActions
                    onEdit={() => openEditBlock(block)}
                    onDelete={() => setDeleteDialog({ kind: "block", item: block })}
                    ariaLabel={`Actions for ${formatBlockLabel(block)}`}
                  />
                </div>
              ))
            )}
          </div>
        </div>
      </Modal>

      <DeleteConfirmDialog
        open={!!deleteDialog}
        onOpenChange={(open) => {
          if (!open) setDeleteDialog(null);
        }}
        title={deleteDialog?.kind === "block" ? "Delete this block?" : "Delete this greenhouse?"}
        description={
          deleteDialog?.kind === "block"
            ? "This block will be removed if no greenhouse is assigned to it."
            : "This greenhouse will be removed from the app. Review related records before deleting."
        }
        confirmLabel={deleteDialog?.kind === "block" ? "Delete Block" : "Delete Greenhouse"}
        loading={deleting}
        onConfirm={handleDelete}
      />
    </div>
  );
}
