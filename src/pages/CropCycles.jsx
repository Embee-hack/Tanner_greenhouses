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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Leaf, ChevronDown, RotateCcw, Calendar, Sprout, TrendingUp, ListTree } from "lucide-react";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle
} from "@/components/ui/alert-dialog";

const defaultForm = {
  greenhouse_id: "",
  crop_type_id: "",
  variety_id: "",
  crop_type: "",
  variety: "",
  planting_date: "",
  plants_planted: "",
  status: "active",
  notes: "",
};
const defaultCropTypeForm = { name: "" };
const defaultVarietyForm = { crop_type_id: "", name: "" };

const getErrorMessage = (error, fallback) => {
  if (error?.data?.error) return String(error.data.error);
  const message = String(error?.message || "");
  if (message.toLowerCase().includes("cannot reach api server")) return message;
  if (message.toLowerCase().includes("failed to fetch")) {
    return "Cannot reach API server. Make sure backend is running, then try again.";
  }
  return message || fallback;
};

export default function CropCycles() {
  const [cycles, setCycles] = useState([]);
  const [greenhouses, setGreenhouses] = useState([]);
  const [cropTypes, setCropTypes] = useState([]);
  const [varieties, setVarieties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [showCatalogModal, setShowCatalogModal] = useState(false);
  const [form, setForm] = useState(defaultForm);
  const [cropTypeForm, setCropTypeForm] = useState(defaultCropTypeForm);
  const [varietyForm, setVarietyForm] = useState(defaultVarietyForm);
  const [saving, setSaving] = useState(false);
  const [savingCropType, setSavingCropType] = useState(false);
  const [savingVariety, setSavingVariety] = useState(false);
  const [error, setError] = useState("");
  const [catalogError, setCatalogError] = useState("");
  const [confirmAction, setConfirmAction] = useState(null); // { cycle, status }

  const load = async () => {
    try {
      const [cy, gh, ct, cv] = await Promise.all([
        base44.entities.CropCycle.list("-planting_date"),
        base44.entities.Greenhouse.list("code"),
        base44.entities.CropType.list("name"),
        base44.entities.CropVariety.list("name"),
      ]);
      setCycles(cy);
      setGreenhouses(gh);
      setCropTypes(ct);
      setVarieties(cv);
      setLoadError("");
    } catch (err) {
      setLoadError(getErrorMessage(err, "Failed to load crop cycle data."));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const ghMap = Object.fromEntries(greenhouses.map(g => [g.id, g]));
  const cropTypeMap = Object.fromEntries(cropTypes.map(c => [c.id, c]));
  const varietiesByCropType = varieties.reduce((acc, item) => {
    const key = item.crop_type_id || "__none__";
    if (!acc[key]) acc[key] = [];
    acc[key].push(item);
    return acc;
  }, {});
  const availableVarieties = form.crop_type_id ? (varietiesByCropType[form.crop_type_id] || []) : [];

  const handleSave = async () => {
    setError("");
    if (cropTypes.length === 0) {
      setError("Create at least one crop type before starting a cycle.");
      return;
    }
    if (!form.crop_type_id) {
      setError("Select a crop type.");
      return;
    }
    // Check only one active cycle per greenhouse
    const activeCycles = cycles.filter(c => c.greenhouse_id === form.greenhouse_id && c.status === "active");
    if (activeCycles.length > 0 && form.status === "active") {
      setError("This greenhouse already has an active cycle. Complete or abandon it first.");
      return;
    }

    const selectedCropType = cropTypeMap[form.crop_type_id];
    const selectedVariety = varieties.find(v => v.id === form.variety_id);

    setSaving(true);
    try {
      await base44.entities.CropCycle.create({
        ...form,
        crop_type_id: form.crop_type_id || null,
        variety_id: form.variety_id || null,
        crop_type: selectedCropType?.name || form.crop_type || "",
        variety: selectedVariety?.name || "",
        plants_planted: form.plants_planted ? parseInt(form.plants_planted) : null,
      });
      setShowModal(false);
      await load();
    } catch (err) {
      setError(getErrorMessage(err, "Failed to create crop cycle."));
    } finally {
      setSaving(false);
    }
  };

  const openNewCycleModal = () => {
    const firstCropType = cropTypes[0];
    setForm({
      ...defaultForm,
      crop_type_id: firstCropType?.id || "",
      crop_type: firstCropType?.name || "",
    });
    setError("");
    setShowModal(true);
  };

  const openCatalogModal = () => {
    setCatalogError("");
    setCropTypeForm(defaultCropTypeForm);
    setVarietyForm({ ...defaultVarietyForm, crop_type_id: cropTypes[0]?.id || "" });
    setShowCatalogModal(true);
  };

  const handleCreateCropType = async () => {
    const name = String(cropTypeForm.name || "").trim();
    if (!name) return;

    const exists = cropTypes.some((item) => String(item.name || "").toLowerCase() === name.toLowerCase());
    if (exists) {
      setCatalogError("This crop type already exists.");
      return;
    }

    setCatalogError("");
    setSavingCropType(true);
    try {
      const created = await base44.entities.CropType.create({ name });
      setCropTypeForm(defaultCropTypeForm);
      setVarietyForm((prev) => ({ ...prev, crop_type_id: created?.id || prev.crop_type_id }));
      await load();
    } catch (err) {
      setCatalogError(getErrorMessage(err, "Failed to create crop type."));
    } finally {
      setSavingCropType(false);
    }
  };

  const handleCreateVariety = async () => {
    const name = String(varietyForm.name || "").trim();
    if (!name || !varietyForm.crop_type_id) return;

    const exists = varieties.some(
      (item) =>
        item.crop_type_id === varietyForm.crop_type_id &&
        String(item.name || "").toLowerCase() === name.toLowerCase()
    );
    if (exists) {
      setCatalogError("This variety already exists for the selected crop type.");
      return;
    }

    setCatalogError("");
    setSavingVariety(true);
    try {
      await base44.entities.CropVariety.create({
        crop_type_id: varietyForm.crop_type_id,
        name,
      });
      setVarietyForm((prev) => ({ ...prev, name: "" }));
      await load();
    } catch (err) {
      setCatalogError(getErrorMessage(err, "Failed to create variety."));
    } finally {
      setSavingVariety(false);
    }
  };

  const updateStatus = async (cycle, status) => {
    try {
      await base44.entities.CropCycle.update(cycle.id, { status, end_date: status !== "active" ? new Date().toISOString().slice(0, 10) : null });
      setConfirmAction(null);
      await load();
    } catch (err) {
      setError(getErrorMessage(err, "Failed to update cycle status."));
      setConfirmAction(null);
    }
  };

  const columns = [
    { key: "greenhouse_id", label: "Greenhouse", render: (v) => <span className="font-semibold">{ghMap[v]?.code ?? v}</span> },
    { key: "crop_type", label: "Crop" },
    { key: "variety", label: "Variety", render: v => v || "—" },
    { key: "planting_date", label: "Planted" },
    { key: "plants_planted", label: "Plants", align: "right", render: v => v?.toLocaleString() ?? "—" },
    { key: "status", label: "Status", render: v => <StatusBadge status={v} /> },
    {
      key: "id", label: "Actions",
      render: (_, row) => {
        if (row.status === "active") {
          return (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground border border-border rounded-md px-2 py-1 hover:bg-muted transition-colors">
                  Actions <ChevronDown className="w-3 h-3" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => setConfirmAction({ cycle: row, status: "completed" })} className="text-primary focus:text-primary">
                  Mark as Completed
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setConfirmAction({ cycle: row, status: "abandoned" })} className="text-danger focus:text-danger">
                  Mark as Abandoned
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          );
        }
        if (row.status === "completed" || row.status === "abandoned") {
          return (
            <button
              onClick={() => setConfirmAction({ cycle: row, status: "active" })}
              className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground border border-border rounded-md px-2 py-1 hover:bg-muted transition-colors"
              title="Revert to Active"
            >
              <RotateCcw className="w-3 h-3" /> Revert
            </button>
          );
        }
        return null;
      }
    },
  ];

  const activeCycles = cycles.filter(c => c.status === "active");
  const completedCycles = cycles.filter(c => c.status === "completed");
  const upcomingCycles = activeCycles.filter(c => {
    const plantDate = new Date(c.planting_date);
    const today = new Date();
    return plantDate > today;
  });

  return (
     <div className="p-4 md:p-6">
      <PageHeader
         title="Crop Cycles"
         subtitle={`${activeCycles.length} active · ${upcomingCycles.length} upcoming`}
        actions={
          <>
            <Button size="sm" variant="outline" onClick={openCatalogModal} className="gap-1.5">
              <ListTree className="w-4 h-4" /> Manage Crops
            </Button>
            <Button size="sm" onClick={openNewCycleModal} className="gap-1.5">
              <Plus className="w-4 h-4" /> New Cycle
            </Button>
          </>
        }
      />

      {loadError && (
        <div className="mb-4 bg-danger/10 text-danger text-sm rounded-lg px-4 py-2">
          {loadError}
        </div>
      )}

      {!loading && cycles.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">
          <div className="bg-card border border-border rounded-2xl p-4">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-primary" />
              </div>
              <span className="text-xs text-muted-foreground font-medium">Active Cycles</span>
            </div>
            <div className="text-2xl font-bold text-foreground">{activeCycles.length}</div>
          </div>
          <div className="bg-card border border-border rounded-2xl p-4">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-lg bg-accent/10 flex items-center justify-center">
                <Calendar className="w-5 h-5 text-accent" />
              </div>
              <span className="text-xs text-muted-foreground font-medium">Upcoming</span>
            </div>
            <div className="text-2xl font-bold text-foreground">{upcomingCycles.length}</div>
          </div>
          <div className="bg-card border border-border rounded-2xl p-4">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-lg bg-success/10 flex items-center justify-center">
                <Sprout className="w-5 h-5 text-success" />
              </div>
              <span className="text-xs text-muted-foreground font-medium">Completed</span>
            </div>
            <div className="text-2xl font-bold text-foreground">{completedCycles.length}</div>
          </div>
        </div>
      )}

      {!loading && cycles.length === 0 ? (
        <EmptyState icon={Leaf} title="No crop cycles yet" description="Start your first crop cycle for a greenhouse." action={<Button onClick={openNewCycleModal}><Plus className="w-4 h-4 mr-1" />New Cycle</Button>} />
      ) : (
        <DataTable columns={columns} data={cycles} loading={loading} />
      )}

      <AlertDialog open={!!confirmAction} onOpenChange={open => { if (!open) setConfirmAction(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {confirmAction?.status === "completed" ? "Complete this cycle?" : confirmAction?.status === "abandoned" ? "Abandon this cycle?" : "Revert to Active?"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {confirmAction?.status === "completed"
                ? "This will mark the crop cycle as completed. You can revert this later if needed."
                : confirmAction?.status === "abandoned"
                ? "This will mark the crop cycle as abandoned. You can revert this later if needed."
                : "This will revert the cycle back to Active status and clear the end date."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => updateStatus(confirmAction.cycle, confirmAction.status)}
              className={confirmAction?.status === "abandoned" ? "bg-danger hover:bg-danger/90" : ""}
            >
              Confirm
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Modal open={showModal} onClose={() => setShowModal(false)} title="New Crop Cycle">
        <div className="space-y-4">
          {error && <div className="bg-danger/10 text-danger text-sm rounded-lg px-4 py-2">{error}</div>}
          <FormField label="Greenhouse" required>
            <Select value={form.greenhouse_id} onValueChange={v => setForm(f => ({ ...f, greenhouse_id: v }))}>
              <SelectTrigger><SelectValue placeholder="Select greenhouse" /></SelectTrigger>
              <SelectContent>
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
            <FormField label="Variety">
              <Select
                value={form.variety_id}
                onValueChange={(v) => {
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
                  {availableVarieties.map((item) => (
                    <SelectItem key={item.id} value={item.id}>{item.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FormField>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <FormField label="Planting Date" required>
              <Input type="date" value={form.planting_date} onChange={e => setForm(f => ({ ...f, planting_date: e.target.value }))} />
            </FormField>
            <FormField label="Plants Planted" required>
              <Input type="number" value={form.plants_planted} onChange={e => setForm(f => ({ ...f, plants_planted: e.target.value }))} placeholder="2000" />
            </FormField>
          </div>
          <FormField label="Status">
            <Select value={form.status} onValueChange={v => setForm(f => ({ ...f, status: v }))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="abandoned">Abandoned</SelectItem>
              </SelectContent>
            </Select>
          </FormField>
          <FormField label="Notes">
            <Input value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} placeholder="Optional..." />
          </FormField>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setShowModal(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving || !form.greenhouse_id || !form.crop_type_id || !form.planting_date || !form.plants_planted}>
              {saving ? "Saving…" : "Start Cycle"}
            </Button>
          </div>
        </div>
      </Modal>

      <Modal open={showCatalogModal} onClose={() => setShowCatalogModal(false)} title="Manage Crops & Varieties">
        <div className="space-y-4">
          {catalogError && <div className="bg-danger/10 text-danger text-sm rounded-lg px-4 py-2">{catalogError}</div>}

          <div className="grid grid-cols-2 gap-4">
            <FormField label="New Crop Type" required>
              <Input
                value={cropTypeForm.name}
                onChange={(e) => setCropTypeForm({ name: e.target.value })}
                placeholder="Pepper"
              />
            </FormField>
            <div className="flex items-end">
              <Button onClick={handleCreateCropType} disabled={savingCropType || !String(cropTypeForm.name || "").trim()}>
                {savingCropType ? "Saving…" : "Create Crop Type"}
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <FormField label="Crop Type for Variety" required>
              <Select
                value={varietyForm.crop_type_id}
                onValueChange={(v) => setVarietyForm((f) => ({ ...f, crop_type_id: v }))}
              >
                <SelectTrigger><SelectValue placeholder="Select crop type" /></SelectTrigger>
                <SelectContent>
                  {cropTypes.map((cropType) => (
                    <SelectItem key={cropType.id} value={cropType.id}>{cropType.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FormField>
            <FormField label="New Variety" required>
              <div className="flex gap-2">
                <Input
                  value={varietyForm.name}
                  onChange={(e) => setVarietyForm((f) => ({ ...f, name: e.target.value }))}
                  placeholder="e.g. Capsicum"
                />
                <Button
                  onClick={handleCreateVariety}
                  disabled={savingVariety || !varietyForm.crop_type_id || !String(varietyForm.name || "").trim()}
                >
                  {savingVariety ? "Saving…" : "Add"}
                </Button>
              </div>
            </FormField>
          </div>

          <div className="rounded-xl border border-border divide-y divide-border">
            {cropTypes.length === 0 ? (
              <div className="px-4 py-6 text-sm text-muted-foreground text-center">
                No crop types yet. Create one to start.
              </div>
            ) : (
              cropTypes.map((cropType) => {
                const cropVarieties = (varietiesByCropType[cropType.id] || []).sort((a, b) =>
                  String(a.name || "").localeCompare(String(b.name || ""))
                );
                return (
                  <div key={cropType.id} className="px-4 py-3">
                    <div className="text-sm font-semibold text-foreground">{cropType.name}</div>
                    {cropVarieties.length === 0 ? (
                      <div className="text-xs text-muted-foreground mt-0.5">No varieties yet.</div>
                    ) : (
                      <div className="flex flex-wrap gap-1.5 mt-2">
                        {cropVarieties.map((item) => (
                          <span key={item.id} className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground border border-border">
                            {item.name}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      </Modal>
    </div>
  );
}
