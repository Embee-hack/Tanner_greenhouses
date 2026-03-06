import { useEffect, useMemo, useRef, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Pencil, Trash2, Phone, Building2, User, Settings2, ImageIcon } from "lucide-react";
import Modal from "@/components/shared/Modal";
import PageHeader from "@/components/shared/PageHeader";
import FormField from "@/components/shared/FormField";
import StatusBadge from "@/components/shared/StatusBadge";
import { useCurrency } from "@/components/shared/CurrencyProvider";

const DEFAULT_ROLE_OPTIONS = [
  { key: "farm_manager", name: "Farm Manager" },
  { key: "greenhouse_worker", name: "Greenhouse Worker" },
  { key: "irrigation_tech", name: "Irrigation Tech" },
  { key: "pest_control", name: "Pest Control" },
  { key: "harvester", name: "Harvester" },
  { key: "driver", name: "Driver" },
];

const DEFAULT_ROLE_KEYS = new Set(DEFAULT_ROLE_OPTIONS.map((item) => item.key));
const STATUSES = ["active", "inactive", "on_leave", "terminated"];
const NONE_VALUE = "__none__";

const normalizeRoleKey = (value) =>
  String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");

const roleLabelFromKey = (value) =>
  String(value || "")
    .replace(/_/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());

const toCatalogRole = (rawRole) => {
  const key = normalizeRoleKey(rawRole?.key || rawRole?.name);
  if (!key) return null;
  return {
    ...rawRole,
    key,
    name: String(rawRole?.name || roleLabelFromKey(key)).trim(),
  };
};

export default function Workers() {
  const { fmt } = useCurrency();
  const [workers, setWorkers] = useState([]);
  const [greenhouses, setGreenhouses] = useState([]);
  const [roleCatalog, setRoleCatalog] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showRoleModal, setShowRoleModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({});
  const [photoError, setPhotoError] = useState("");
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const photoInputRef = useRef(null);
  const [newRoleName, setNewRoleName] = useState("");
  const [roleError, setRoleError] = useState("");
  const [savingRole, setSavingRole] = useState(false);

  const load = () => {
    Promise.all([
      base44.entities.Worker.list(),
      base44.entities.Greenhouse.list(),
      base44.entities.WorkerRole.list("name"),
    ]).then(([workersData, greenhouseData, rolesData]) => {
      setWorkers(workersData);
      setGreenhouses(greenhouseData);
      setRoleCatalog(rolesData);
      setLoading(false);
    });
  };

  useEffect(() => {
    load();
  }, []);

  const roleOptions = useMemo(() => {
    const optionsMap = new Map(DEFAULT_ROLE_OPTIONS.map((item) => [item.key, item.name]));

    roleCatalog
      .map(toCatalogRole)
      .filter(Boolean)
      .filter((role) => role.status !== "inactive")
      .forEach((role) => {
        optionsMap.set(role.key, role.name);
      });

    return Array.from(optionsMap.entries())
      .map(([key, name]) => ({ key, name }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [roleCatalog]);

  const customCatalogRoles = useMemo(
    () =>
      roleCatalog
        .map(toCatalogRole)
        .filter(Boolean)
        .filter((role) => !DEFAULT_ROLE_KEYS.has(role.key))
        .sort((a, b) => a.name.localeCompare(b.name)),
    [roleCatalog]
  );

  const roleNameByKey = useMemo(
    () => Object.fromEntries(roleOptions.map((item) => [item.key, item.name])),
    [roleOptions]
  );

  const defaultRoleKey = roleOptions.find((item) => item.key === "greenhouse_worker")?.key || roleOptions[0]?.key || "greenhouse_worker";

  const roleOptionsForForm = useMemo(() => {
    const currentKey = normalizeRoleKey(form.role);
    if (!currentKey || roleOptions.some((item) => item.key === currentKey)) return roleOptions;
    return [{ key: currentKey, name: roleLabelFromKey(form.role) }, ...roleOptions];
  }, [form.role, roleOptions]);

  const roleLabel = (role) => {
    const key = normalizeRoleKey(role);
    if (!key) return "—";
    return roleNameByKey[key] || roleLabelFromKey(key);
  };

  const openCreate = () => {
    setEditing(null);
    setPhotoError("");
    setForm({
      status: "active",
      role: defaultRoleKey,
      greenhouse_id: NONE_VALUE,
      salary: "",
      profile_picture: null,
    });
    setShowModal(true);
  };

  const openEdit = (worker) => {
    setEditing(worker);
    setPhotoError("");
    setForm({
      ...worker,
      greenhouse_id: worker.greenhouse_id || NONE_VALUE,
      salary: worker.salary ?? "",
    });
    setShowModal(true);
  };

  const handleSave = async () => {
    const payload = {
      ...form,
      role: normalizeRoleKey(form.role) || defaultRoleKey,
      greenhouse_id: form.greenhouse_id && form.greenhouse_id !== NONE_VALUE ? form.greenhouse_id : null,
      salary: form.salary === "" || form.salary == null ? null : Number(form.salary),
    };

    if (Number.isNaN(payload.salary)) payload.salary = null;

    if (editing) {
      const updated = await base44.entities.Worker.update(editing.id, payload);
      setWorkers((prev) => prev.map((worker) => (worker.id === editing.id ? updated : worker)));
    } else {
      const created = await base44.entities.Worker.create(payload);
      setWorkers((prev) => [...prev, created]);
    }

    setShowModal(false);
  };

  const handleDelete = async (id) => {
    await base44.entities.Worker.delete(id);
    setWorkers((prev) => prev.filter((worker) => worker.id !== id));
  };

  const openRoleManager = () => {
    setRoleError("");
    setNewRoleName("");
    setShowRoleModal(true);
  };

  const handleCreateRole = async () => {
    const name = String(newRoleName || "").trim();
    const key = normalizeRoleKey(name);
    if (!key) {
      setRoleError("Role name must contain letters or numbers.");
      return;
    }

    if (roleOptions.some((item) => item.key === key)) {
      setRoleError("This role already exists.");
      return;
    }

    setRoleError("");
    setSavingRole(true);
    const created = await base44.entities.WorkerRole.create({
      key,
      name,
      status: "active",
    });
    setRoleCatalog((prev) => [...prev, created]);
    setNewRoleName("");
    setSavingRole(false);
  };

  const handleDeleteCustomRole = async (role) => {
    const inUse = workers.some((worker) => normalizeRoleKey(worker.role) === role.key);
    if (inUse) {
      setRoleError("This role is currently assigned to one or more workers. Reassign them first.");
      return;
    }

    await base44.entities.WorkerRole.delete(role.id);
    setRoleCatalog((prev) => prev.filter((item) => item.id !== role.id));
  };

  const openPhotoPicker = () => {
    if (!uploadingPhoto) photoInputRef.current?.click();
  };

  const handleProfilePictureUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setPhotoError("");
    if (!file.type.startsWith("image/")) {
      setPhotoError("Please choose a valid image file.");
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      setPhotoError("Image must be under 2MB.");
      return;
    }

    try {
      setUploadingPhoto(true);
      const dataUrl = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (evt) => resolve(evt.target.result);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
      setForm((prev) => ({ ...prev, profile_picture: dataUrl }));
    } catch (_error) {
      setPhotoError("Photo processing failed. Please try again.");
    } finally {
      setUploadingPhoto(false);
      if (e.target) e.target.value = "";
    }
  };

  const ghName = (id) => greenhouses.find((greenhouse) => greenhouse.id === id)?.code || "—";
  const totalSalary = workers.filter((worker) => worker.status === "active").reduce((sum, worker) => sum + (worker.salary || 0), 0);

  return (
    <div className="p-4 md:p-6 space-y-5">
      <PageHeader
        title="Workers"
        subtitle={`${workers.filter((worker) => worker.status === "active").length} active · Monthly payroll: ${fmt(totalSalary)}`}
        actions={
          <>
            <Button variant="outline" onClick={openRoleManager} size="sm">
              <Settings2 className="w-4 h-4 mr-1" /> Manage Roles
            </Button>
            <Button onClick={openCreate} size="sm">
              <Plus className="w-4 h-4 mr-1" /> Add Worker
            </Button>
          </>
        }
      />

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="h-52 bg-muted animate-pulse rounded-2xl" />
          ))}
        </div>
      ) : workers.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
          <User className="w-10 h-10 mb-3 opacity-30" />
          <p className="font-medium">No workers yet</p>
          <p className="text-sm">Add your first worker to get started</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {workers.map((worker) => (
            <div key={worker.id} className="bg-card border border-border rounded-2xl overflow-hidden flex flex-col group hover:shadow-lg transition-shadow">
              <div className="w-full h-44 bg-gradient-to-br from-primary/20 to-primary/5 overflow-hidden flex items-center justify-center">
                {worker.profile_picture ? (
                  <img src={worker.profile_picture} alt={worker.full_name} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <div className="w-20 h-20 rounded-xl bg-primary/10 flex items-center justify-center text-2xl font-bold text-primary">
                      {(worker.full_name || "?")[0].toUpperCase()}
                    </div>
                  </div>
                )}
              </div>
              <div className="p-4 flex flex-col gap-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1">
                    <div className="font-semibold text-foreground text-sm leading-tight">{worker.full_name}</div>
                    <div className="text-xs text-muted-foreground mt-1">{roleLabel(worker.role)}</div>
                  </div>
                  <StatusBadge status={worker.status} />
                </div>
                <div className="space-y-1 text-xs text-muted-foreground">
                  {worker.phone && (
                    <div className="flex items-center gap-1.5">
                      <Phone className="w-3 h-3 flex-shrink-0" />
                      <span className="truncate">{worker.phone}</span>
                    </div>
                  )}
                  {worker.greenhouse_id && (
                    <div className="flex items-center gap-1.5">
                      <Building2 className="w-3 h-3 flex-shrink-0" />
                      {ghName(worker.greenhouse_id)}
                    </div>
                  )}
                  {worker.salary > 0 && <div className="text-foreground font-medium">{fmt(worker.salary)}/mo</div>}
                  {worker.hire_date && <div className="text-xs">Hired {worker.hire_date}</div>}
                </div>
                <div className="flex gap-2 mt-auto pt-3 border-t border-border">
                  <Button variant="ghost" size="sm" className="flex-1 h-7 text-xs" onClick={() => openEdit(worker)}>
                    <Pencil className="w-3 h-3 mr-1" />
                    Edit
                  </Button>
                  <Button variant="ghost" size="sm" className="h-7 text-xs text-danger hover:text-danger" onClick={() => handleDelete(worker.id)}>
                    <Trash2 className="w-3 h-3" />
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal open={showModal} title={editing ? "Edit Worker" : "Add Worker"} onClose={() => setShowModal(false)}>
        <div className="space-y-3">
          <div className="flex items-center gap-3 pb-2 border-b border-border">
            <input
              ref={photoInputRef}
              type="file"
              accept="image/*"
              onChange={handleProfilePictureUpload}
              className="hidden"
            />

            <button
              type="button"
              onClick={openPhotoPicker}
              className="relative w-24 h-20 rounded-xl bg-primary/10 flex items-center justify-center overflow-hidden ring-2 ring-border hover:ring-primary/40 transition-all"
            >
              {form.profile_picture ? (
                <img src={form.profile_picture} alt={form.full_name} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full bg-primary/10 flex items-center justify-center text-primary">
                  <ImageIcon className="w-6 h-6" />
                </div>
              )}
            </button>

            <div className="flex-1">
              <div className="text-sm font-medium text-foreground">Profile Photo</div>
              <div className="text-xs text-muted-foreground">Rectangular photo upload. No crop step.</div>
              <div className="flex items-center gap-2 mt-2">
                <Button type="button" variant="outline" size="sm" onClick={openPhotoPicker} disabled={uploadingPhoto}>
                  {uploadingPhoto ? "Uploading..." : form.profile_picture ? "Change Photo" : "Upload Photo"}
                </Button>
                {form.profile_picture && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="text-danger hover:text-danger"
                    disabled={uploadingPhoto}
                    onClick={() => setForm((prev) => ({ ...prev, profile_picture: null }))}
                  >
                    Remove
                  </Button>
                )}
              </div>
              {photoError && <div className="text-xs text-danger mt-1">{photoError}</div>}
            </div>
          </div>

          <FormField label="Full Name" required>
            <Input placeholder="Enter worker's full name" value={form.full_name || ""} onChange={(e) => setForm((prev) => ({ ...prev, full_name: e.target.value }))} />
          </FormField>

          <FormField label="Role" required>
            <Select value={normalizeRoleKey(form.role) || defaultRoleKey} onValueChange={(value) => setForm((prev) => ({ ...prev, role: value }))}>
              <SelectTrigger>
                <SelectValue placeholder="Select role" />
              </SelectTrigger>
              <SelectContent>
                {roleOptionsForForm.map((role) => (
                  <SelectItem key={role.key} value={role.key}>
                    {role.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FormField>

          <FormField label="Phone Number">
            <Input placeholder="+234..." value={form.phone || ""} onChange={(e) => setForm((prev) => ({ ...prev, phone: e.target.value }))} />
          </FormField>

          <FormField label="Assigned Greenhouse">
            <Select value={form.greenhouse_id || NONE_VALUE} onValueChange={(value) => setForm((prev) => ({ ...prev, greenhouse_id: value }))}>
              <SelectTrigger>
                <SelectValue placeholder="Select greenhouse (optional)" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NONE_VALUE}>None</SelectItem>
                {greenhouses.map((greenhouse) => (
                  <SelectItem key={greenhouse.id} value={greenhouse.id}>
                    {greenhouse.code} - {greenhouse.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FormField>

          <FormField label="Monthly Salary (NGN)">
            <Input
              type="number"
              placeholder="80000"
              value={form.salary ?? ""}
              onChange={(e) => setForm((prev) => ({ ...prev, salary: e.target.value }))}
            />
          </FormField>

          <FormField label="Hire Date">
            <Input type="date" value={form.hire_date || ""} onChange={(e) => setForm((prev) => ({ ...prev, hire_date: e.target.value }))} />
          </FormField>

          <FormField label="Status">
            <Select value={form.status || "active"} onValueChange={(value) => setForm((prev) => ({ ...prev, status: value }))}>
              <SelectTrigger>
                <SelectValue placeholder="Select status" />
              </SelectTrigger>
              <SelectContent>{STATUSES.map((status) => <SelectItem key={status} value={status}>{roleLabelFromKey(status)}</SelectItem>)}</SelectContent>
            </Select>
          </FormField>

          <FormField label="Notes">
            <Input placeholder="Optional notes..." value={form.notes || ""} onChange={(e) => setForm((prev) => ({ ...prev, notes: e.target.value }))} />
          </FormField>
          <div className="flex gap-2 justify-end pt-2">
            <Button variant="outline" onClick={() => setShowModal(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={!String(form.full_name || "").trim()}>
              Save
            </Button>
          </div>
        </div>
      </Modal>

      <Modal open={showRoleModal} title="Manage Worker Roles" onClose={() => setShowRoleModal(false)}>
        <div className="space-y-4">
          {roleError && <div className="text-sm rounded-lg px-3 py-2 bg-danger/10 text-danger">{roleError}</div>}
          <div className="flex gap-2">
            <Input placeholder="e.g. Quality Supervisor" value={newRoleName} onChange={(e) => setNewRoleName(e.target.value)} />
            <Button onClick={handleCreateRole} disabled={savingRole || !String(newRoleName || "").trim()}>
              {savingRole ? "Creating..." : "Create Role"}
            </Button>
          </div>

          <div className="rounded-xl border border-border divide-y divide-border">
            {DEFAULT_ROLE_OPTIONS.map((role) => (
              <div key={role.key} className="px-4 py-3 flex items-center justify-between gap-3">
                <div>
                  <div className="text-sm font-medium text-foreground">{role.name}</div>
                  <div className="text-xs text-muted-foreground">System role</div>
                </div>
              </div>
            ))}

            {customCatalogRoles.length === 0 ? (
              <div className="px-4 py-3 text-xs text-muted-foreground">No custom roles yet.</div>
            ) : (
              customCatalogRoles.map((role) => (
                <div key={role.id} className="px-4 py-3 flex items-center justify-between gap-3">
                  <div>
                    <div className="text-sm font-medium text-foreground">{role.name}</div>
                    <div className="text-xs text-muted-foreground">Custom role</div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 text-danger hover:text-danger"
                    onClick={() => handleDeleteCustomRole(role)}
                  >
                    <Trash2 className="w-4 h-4 mr-1" />
                    Delete
                  </Button>
                </div>
              ))
            )}
          </div>
        </div>
      </Modal>
    </div>
  );
}
