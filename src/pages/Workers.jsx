import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { isAdminUser } from "@/lib/roles.js";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Pencil, Trash2, Phone, Building2, User, Settings2, ImageIcon, Leaf } from "lucide-react";
import Modal from "@/components/shared/Modal";
import PageHeader from "@/components/shared/PageHeader";
import ErrorBanner from "@/components/shared/ErrorBanner.jsx";
import FormField from "@/components/shared/FormField";
import StatusBadge from "@/components/shared/StatusBadge";
import DeleteConfirmDialog from "@/components/shared/DeleteConfirmDialog.jsx";
import { useCurrency } from "@/components/shared/CurrencyProvider";
import { getErrorMessage } from "@/lib/errors.js";
import { createPageUrl } from "@/utils";

const normalizeGreenhouseIds = (worker) => {
  if (Array.isArray(worker?.greenhouse_ids)) return worker.greenhouse_ids.filter(Boolean);
  if (worker?.greenhouse_id) return [worker.greenhouse_id];
  return [];
};

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

const getWorkerInitials = (name) =>
  String(name || "")
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() || "")
    .join("") || "?";

const toWorkerListItem = (worker) => {
  const picture = String(worker?.profile_picture || "").trim();
  const safePicture = picture && (picture.startsWith("/") || /^https?:\/\//i.test(picture)) ? picture : null;
  const greenhouseIds = normalizeGreenhouseIds(worker);

  return {
    id: worker?.id || null,
    full_name: worker?.full_name || "",
    role: worker?.role || "",
    phone: worker?.phone || "",
    greenhouse_id: greenhouseIds[0] || null,
    greenhouse_ids: greenhouseIds,
    nursery_assigned: worker?.nursery_assigned === true || worker?.nursery_assigned === "true",
    blocks: worker?.blocks || null,
    hire_date: worker?.hire_date || null,
    status: worker?.status || "active",
    salary: worker?.salary ?? null,
    profile_picture: safePicture,
    has_profile_picture: Boolean(picture),
    created_date: worker?.created_date || null,
    updated_date: worker?.updated_date || null,
  };
};

export default function Workers() {
  const { fmt } = useCurrency();
  const { user } = useAuth();
  const isAdmin = isAdminUser(user);
  const location = useLocation();
  const navigate = useNavigate();
  const [workers, setWorkers] = useState([]);
  const [greenhouses, setGreenhouses] = useState([]);
  const [roleCatalog, setRoleCatalog] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showRoleModal, setShowRoleModal] = useState(false);
  const [detailWorker, setDetailWorker] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({});
  const [photoError, setPhotoError] = useState("");
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const photoInputRef = useRef(null);
  const detailRequestRef = useRef(0);
  const [newRoleName, setNewRoleName] = useState("");
  const [editingRole, setEditingRole] = useState(null);
  const [roleError, setRoleError] = useState("");
  const [savingRole, setSavingRole] = useState(false);
  const [deleteDialog, setDeleteDialog] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [error, setError] = useState("");

  const load = async () => {
    try {
      setLoading(true);
      const data = await base44.workers.bootstrap();
      setWorkers(data?.workers || []);
      setGreenhouses(data?.greenhouses || []);
      setRoleCatalog(data?.roles || []);
      setLoadError("");
    } catch (err) {
      setLoadError(getErrorMessage(err, "Failed to load workers."));
    } finally {
      setLoading(false);
    }
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

  const sortedWorkers = useMemo(
    () => [...workers].sort((a, b) => String(a.full_name || "").localeCompare(String(b.full_name || ""))),
    [workers]
  );

  const openCreate = () => {
    detailRequestRef.current += 1;
    setDetailWorker(null);
    setDetailLoading(false);
    setEditing(null);
    setPhotoError("");
    setError("");
    setForm({
      status: "active",
      role: defaultRoleKey,
      greenhouse_ids: [],
      nursery_assigned: false,
      blocks: "",
      salary: "",
      profile_picture: null,
    });
    setShowModal(true);
  };

  const openEdit = (worker) => {
    detailRequestRef.current += 1;
    setDetailWorker(null);
    setDetailLoading(false);
    setEditing(worker);
    setPhotoError("");
    setError("");
    setForm({
      ...worker,
      greenhouse_ids: normalizeGreenhouseIds(worker),
      nursery_assigned: worker.nursery_assigned === true || worker.nursery_assigned === "true",
      blocks: worker.blocks || "",
      salary: worker.salary ?? "",
    });
    setShowModal(true);
  };

  const handleSave = async () => {
    setError("");
    try {
      const greenhouseIds = Array.isArray(form.greenhouse_ids) ? form.greenhouse_ids.filter(Boolean) : [];
      const payload = {
        ...form,
        role: normalizeRoleKey(form.role) || defaultRoleKey,
        greenhouse_ids: greenhouseIds,
        greenhouse_id: greenhouseIds[0] || null,
        nursery_assigned: !!form.nursery_assigned,
        blocks: String(form.blocks || "").trim() || null,
        salary: form.salary === "" || form.salary == null ? null : Number(form.salary),
      };

      if (Number.isNaN(payload.salary)) payload.salary = null;

      if (editing) {
        const updated = await base44.entities.Worker.update(editing.id, payload);
        setWorkers((prev) => prev.map((worker) => (worker.id === editing.id ? toWorkerListItem(updated) : worker)));
      } else {
        const created = await base44.entities.Worker.create(payload);
        setWorkers((prev) => [...prev, toWorkerListItem(created)]);
      }

      setShowModal(false);
    } catch (err) {
      setError(getErrorMessage(err, "Failed to save worker."));
    }
  };

  const handleDelete = async () => {
    if (!deleteDialog) return;

    setDeleting(true);
    try {
      if (deleteDialog.kind === "worker") {
        await base44.entities.Worker.delete(deleteDialog.item.id);
        setWorkers((prev) => prev.filter((worker) => worker.id !== deleteDialog.item.id));
        if (detailWorker?.id === deleteDialog.item.id) {
          detailRequestRef.current += 1;
          setDetailWorker(null);
          setDetailLoading(false);
        }
      } else {
        const role = deleteDialog.item;
        const inUse = workers.some((worker) => normalizeRoleKey(worker.role) === role.key);
        if (inUse) {
          setRoleError("This role is currently assigned to one or more workers. Reassign them first.");
          setDeleteDialog(null);
          return;
        }

        await base44.entities.WorkerRole.delete(role.id);
        setRoleCatalog((prev) => prev.filter((item) => item.id !== role.id));
        if (editingRole?.id === role.id) {
          setEditingRole(null);
          setNewRoleName("");
        }
      }

      setDeleteDialog(null);
    } catch (err) {
      const fallback = deleteDialog.kind === "worker" ? "Failed to delete worker." : "Failed to delete worker role.";
      if (deleteDialog.kind === "worker") {
        setLoadError(getErrorMessage(err, fallback));
      } else {
        setRoleError(getErrorMessage(err, fallback));
      }
    } finally {
      setDeleting(false);
    }
  };

  const openRoleManager = () => {
    setRoleError("");
    setNewRoleName("");
    setEditingRole(null);
    setShowRoleModal(true);
  };

  useEffect(() => {
    const settingsPanel = new URLSearchParams(location.search).get("settings");
    if (settingsPanel !== "roles" || loading || showRoleModal || !isAdmin) return;
    openRoleManager();
    navigate(createPageUrl("Workers"), { replace: true });
  }, [isAdmin, loading, location.search, navigate, showRoleModal]);

  const openEditRole = (role) => {
    setEditingRole(role);
    setNewRoleName(role.name || "");
    setRoleError("");
  };

  const handleSaveRole = async () => {
    const name = String(newRoleName || "").trim();
    const key = editingRole?.key || normalizeRoleKey(name);
    if (!key) {
      setRoleError("Role name must contain letters or numbers.");
      return;
    }

    if (roleOptions.some((item) => item.key === key && key !== editingRole?.key)) {
      setRoleError("This role already exists.");
      return;
    }

    setRoleError("");
    setSavingRole(true);
    try {
      if (editingRole) {
        const updated = await base44.entities.WorkerRole.update(editingRole.id, {
          ...editingRole,
          name,
        });
        setRoleCatalog((prev) => prev.map((item) => (item.id === editingRole.id ? updated : item)));
      } else {
        const created = await base44.entities.WorkerRole.create({
          key,
          name,
          status: "active",
        });
        setRoleCatalog((prev) => [...prev, created]);
      }
      setEditingRole(null);
      setNewRoleName("");
    } catch (err) {
      setRoleError(getErrorMessage(err, `Failed to ${editingRole ? "update" : "create"} worker role.`));
    } finally {
      setSavingRole(false);
    }
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
      const upload = await base44.integrations.Core.UploadFile({ file });
      if (!upload?.file_url) {
        throw new Error("Photo upload did not return a file URL.");
      }
      setForm((prev) => ({ ...prev, profile_picture: upload.file_url }));
    } catch (_error) {
      setPhotoError("Photo upload failed. Please try again.");
    } finally {
      setUploadingPhoto(false);
      if (e.target) e.target.value = "";
    }
  };

  const openDetail = async (worker) => {
    const requestId = detailRequestRef.current + 1;
    detailRequestRef.current = requestId;
    setDetailWorker(worker);
    setDetailLoading(true);
    try {
      const detail = await base44.entities.Worker.get(worker.id);
      if (detailRequestRef.current !== requestId) return;
      setDetailWorker(detail);
      setLoadError("");
    } catch (err) {
      if (detailRequestRef.current !== requestId) return;
      setLoadError(getErrorMessage(err, "Failed to load worker details."));
    } finally {
      if (detailRequestRef.current === requestId) {
        setDetailLoading(false);
      }
    }
  };

  const ghName = (id) => greenhouses.find((g) => g.id === id)?.code || null;

  const assignmentLabel = (worker) => {
    const parts = [];
    const ids = normalizeGreenhouseIds(worker);
    const ghCodes = ids.map(ghName).filter(Boolean);
    if (ghCodes.length > 0) parts.push(ghCodes.join(", "));
    if (worker.nursery_assigned) parts.push("Nursery");
    return parts.length > 0 ? parts.join(" · ") : "Not assigned";
  };

  const totalSalary = workers.filter((worker) => worker.status === "active").reduce((sum, worker) => sum + (worker.salary || 0), 0);

  return (
    <div className="p-4 md:p-6 space-y-5">
      <PageHeader
        title="Workers"
        subtitle={
          isAdmin
            ? `${workers.filter((worker) => worker.status === "active").length} active · Monthly payroll: ${fmt(totalSalary)}`
            : `${workers.filter((worker) => worker.status === "active").length} active workers`
        }
        actions={
          <>
            {isAdmin && (
              <Button variant="outline" onClick={openRoleManager} size="sm">
                <Settings2 className="w-4 h-4 mr-1" /> Manage Roles
              </Button>
            )}
            <Button onClick={openCreate} size="sm">
              <Plus className="w-4 h-4 mr-1" /> Add Worker
            </Button>
          </>
        }
      />

      <ErrorBanner message={loadError} onRetry={load} />

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="h-24 bg-muted animate-pulse rounded-3xl" />
          ))}
        </div>
      ) : workers.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
          <User className="w-10 h-10 mb-3 opacity-30" />
          <p className="font-medium">No workers yet</p>
          <p className="text-sm">Add your first worker to get started</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-3xl border border-border bg-card shadow-sm">
          <div className="hidden grid-cols-[minmax(0,2.2fr)_minmax(0,1.4fr)_minmax(0,1.2fr)_auto] gap-4 border-b border-border bg-muted/30 px-5 py-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground lg:grid">
            <div>Worker</div>
            <div>Assignment</div>
            <div>Contact</div>
            <div className="text-right">Status</div>
          </div>
          <div className="divide-y divide-border">
            {sortedWorkers.map((worker) => (
              <div key={worker.id} className="p-3 sm:p-4">
                <button
                  type="button"
                  onClick={() => openDetail(worker)}
                  className="w-full min-w-0 rounded-2xl border border-border/70 bg-background/70 px-4 py-4 text-left transition-all hover:border-primary/30 hover:bg-muted/40 hover:shadow-sm"
                >
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-center">
                    <div className="flex min-w-0 items-center gap-3 lg:w-[320px]">
                      <div className="h-14 w-14 flex-shrink-0 overflow-hidden rounded-2xl border border-border bg-primary/10">
                        {worker.profile_picture ? (
                          <img src={worker.profile_picture} alt={worker.full_name} className="h-full w-full object-cover" />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center text-lg font-bold text-primary">
                            {getWorkerInitials(worker.full_name)}
                          </div>
                        )}
                      </div>
                      <div className="min-w-0">
                        <div className="truncate text-base font-semibold text-foreground">{worker.full_name}</div>
                        <div className="mt-1 text-sm text-muted-foreground">{roleLabel(worker.role)}</div>
                      </div>
                    </div>

                    <div className="grid flex-1 grid-cols-1 gap-3 sm:grid-cols-3">
                      <div className="rounded-xl bg-muted/50 px-3 py-3">
                        <div className="text-xs text-muted-foreground">Assignments</div>
                        <div className="mt-1 flex items-center gap-1.5 text-sm font-medium text-foreground">
                          <Building2 className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
                          <span className="truncate">{assignmentLabel(worker)}</span>
                        </div>
                        {worker.blocks && (
                          <div className="mt-0.5 text-xs text-muted-foreground truncate">Blocks: {worker.blocks}</div>
                        )}
                      </div>

                      <div className="rounded-xl bg-muted/50 px-3 py-3">
                        <div className="text-xs text-muted-foreground">Contact</div>
                        <div className="mt-1 flex items-center gap-1.5 text-sm font-medium text-foreground">
                          <Phone className="w-3.5 h-3.5 text-muted-foreground" />
                          <span>{worker.phone || "No phone number"}</span>
                        </div>
                      </div>

                      <div className="rounded-xl bg-muted/50 px-3 py-3">
                        <div className="text-xs text-muted-foreground">{isAdmin ? "Employment" : "Hire Date"}</div>
                        <div className="mt-1 text-sm font-medium text-foreground">
                          {isAdmin && worker.salary > 0 ? `${fmt(worker.salary)}/mo` : worker.hire_date ? `Hired ${worker.hire_date}` : "No hire date"}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between gap-3 lg:w-[170px] lg:justify-end">
                      <StatusBadge status={worker.status} />
                      <span className="text-sm font-semibold text-primary">View details</span>
                    </div>
                  </div>
                </button>
              </div>
            ))}
          </div>
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

          <div className="rounded-xl border border-border p-4 space-y-3">
            <div className="text-sm font-semibold text-foreground">Assignments <span className="text-xs font-normal text-muted-foreground">(optional)</span></div>

            {greenhouses.length > 0 && (
              <div>
                <div className="text-xs text-muted-foreground mb-2">Greenhouses</div>
                <div className="grid grid-cols-2 gap-2">
                  {greenhouses.map((gh) => {
                    const checked = (form.greenhouse_ids || []).includes(gh.id);
                    return (
                      <label key={gh.id} className="flex items-center gap-2 cursor-pointer rounded-lg border border-border px-3 py-2 hover:bg-muted/50 transition-colors">
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={(e) => setForm((prev) => {
                            const ids = prev.greenhouse_ids || [];
                            return {
                              ...prev,
                              greenhouse_ids: e.target.checked ? [...ids, gh.id] : ids.filter((id) => id !== gh.id),
                            };
                          })}
                          className="rounded"
                        />
                        <span className="text-sm font-medium">{gh.code}</span>
                        {gh.name && <span className="text-xs text-muted-foreground truncate">{gh.name}</span>}
                      </label>
                    );
                  })}
                </div>
              </div>
            )}

            <div>
              <div className="text-xs text-muted-foreground mb-2">Nursery</div>
              <label className="flex items-center gap-2 cursor-pointer rounded-lg border border-border px-3 py-2 hover:bg-muted/50 transition-colors w-fit">
                <input
                  type="checkbox"
                  checked={!!form.nursery_assigned}
                  onChange={(e) => setForm((prev) => ({ ...prev, nursery_assigned: e.target.checked }))}
                  className="rounded"
                />
                <span className="text-sm font-medium">Assigned to Nursery</span>
              </label>
            </div>

            <div>
              <div className="text-xs text-muted-foreground mb-1">Blocks <span className="text-muted-foreground/60">(optional)</span></div>
              <Input
                placeholder="e.g. Block A, Block B"
                value={form.blocks || ""}
                onChange={(e) => setForm((prev) => ({ ...prev, blocks: e.target.value }))}
              />
            </div>
          </div>

          {isAdmin && (
            <FormField label="Monthly Salary (NGN)">
              <Input
                type="number"
                placeholder="80000"
                value={form.salary ?? ""}
                onChange={(e) => setForm((prev) => ({ ...prev, salary: e.target.value }))}
              />
            </FormField>
          )}

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
          {error ? <div className="bg-danger/10 text-danger text-sm rounded-lg px-4 py-2">{error}</div> : null}
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

      <Modal
        open={!!detailWorker}
        title="Worker Details"
        onClose={() => {
          detailRequestRef.current += 1;
          setDetailLoading(false);
          setDetailWorker(null);
        }}
        size="lg"
      >
        {detailWorker ? (
          <div className="space-y-5">
            {detailLoading ? (
              <div className="rounded-xl border border-border bg-muted/30 px-4 py-2 text-sm text-muted-foreground">
                Loading full worker record...
              </div>
            ) : null}
            <div className="rounded-2xl border border-border bg-muted/20 p-4">
              <div className="flex flex-col gap-4 md:flex-row md:items-center">
                <div className="h-28 w-28 flex-shrink-0 overflow-hidden rounded-2xl border border-border bg-primary/10">
                  {detailWorker.profile_picture ? (
                    <img src={detailWorker.profile_picture} alt={detailWorker.full_name} className="h-full w-full object-cover" />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-3xl font-bold text-primary">
                      {getWorkerInitials(detailWorker.full_name)}
                    </div>
                  )}
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-3">
                    <h3 className="text-2xl font-bold text-foreground">{detailWorker.full_name}</h3>
                    <StatusBadge status={detailWorker.status} size="md" />
                  </div>
                  <div className="mt-1 text-sm font-medium text-muted-foreground">{roleLabel(detailWorker.role)}</div>
                  <div className="mt-3 flex flex-wrap gap-2 text-xs text-muted-foreground">
                    {normalizeGreenhouseIds(detailWorker).map((id) => (
                      <span key={id} className="rounded-full border border-border bg-card px-2.5 py-1">
                        <Building2 className="w-3 h-3 inline mr-1" />{ghName(id) || id}
                      </span>
                    ))}
                    {detailWorker.nursery_assigned && (
                      <span className="rounded-full border border-border bg-card px-2.5 py-1">
                        <Leaf className="w-3 h-3 inline mr-1" />Nursery
                      </span>
                    )}
                    {!normalizeGreenhouseIds(detailWorker).length && !detailWorker.nursery_assigned && (
                      <span className="rounded-full border border-border bg-card px-2.5 py-1">No assignments</span>
                    )}
                    <span className="rounded-full border border-border bg-card px-2.5 py-1">
                      {detailWorker.phone || "No phone number"}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="rounded-xl border border-border p-4">
                <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Role</div>
                <div className="mt-1 text-sm font-medium text-foreground">{roleLabel(detailWorker.role)}</div>
              </div>

              <div className="rounded-xl border border-border p-4">
                <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Phone Number</div>
                <div className="mt-1 text-sm font-medium text-foreground">{detailWorker.phone || "—"}</div>
              </div>

              <div className="rounded-xl border border-border p-4">
                <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Assigned Houses</div>
                <div className="mt-1 text-sm font-medium text-foreground">
                  {normalizeGreenhouseIds(detailWorker).map((id) => ghName(id) || id).join(", ") || "—"}
                </div>
              </div>

              <div className="rounded-xl border border-border p-4">
                <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Nursery / Blocks</div>
                <div className="mt-1 text-sm font-medium text-foreground">
                  {[detailWorker.nursery_assigned ? "Nursery" : null, detailWorker.blocks || null].filter(Boolean).join(" · ") || "—"}
                </div>
              </div>

              <div className="rounded-xl border border-border p-4">
                <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Hire Date</div>
                <div className="mt-1 text-sm font-medium text-foreground">{detailWorker.hire_date || "—"}</div>
              </div>

              {isAdmin ? (
                <div className="rounded-xl border border-border p-4">
                  <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Monthly Salary</div>
                  <div className="mt-1 text-sm font-medium text-foreground">
                    {detailWorker.salary > 0 ? `${fmt(detailWorker.salary)}/mo` : "—"}
                  </div>
                </div>
              ) : null}

              <div className="rounded-xl border border-border p-4">
                <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Status</div>
                <div className="mt-2">
                  <StatusBadge status={detailWorker.status} size="md" />
                </div>
              </div>

              <div className="rounded-xl border border-border p-4 md:col-span-2">
                <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Notes</div>
                <div className="mt-1 text-sm font-medium text-foreground">{detailWorker.notes || "No notes added."}</div>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-1">
              <Button variant="outline" onClick={() => setDetailWorker(null)}>
                Close
              </Button>
              <Button
                variant="outline"
                disabled={detailLoading}
                onClick={() => {
                  setDetailWorker(null);
                  openEdit(detailWorker);
                }}
              >
                <Pencil className="w-4 h-4 mr-1" />
                Edit Worker
              </Button>
              <Button
                variant="destructive"
                disabled={detailLoading}
                onClick={() => setDeleteDialog({ kind: "worker", item: detailWorker })}
              >
                <Trash2 className="w-4 h-4 mr-1" />
                Delete Worker
              </Button>
            </div>
          </div>
        ) : null}
      </Modal>

      <Modal open={showRoleModal && isAdmin} title="Manage Worker Roles" onClose={() => setShowRoleModal(false)}>
        <div className="space-y-4">
          {roleError && <div className="text-sm rounded-lg px-3 py-2 bg-danger/10 text-danger">{roleError}</div>}
          <div className="flex gap-2">
            <Input placeholder="e.g. Quality Supervisor" value={newRoleName} onChange={(e) => setNewRoleName(e.target.value)} />
            {editingRole ? (
              <Button variant="outline" onClick={() => { setEditingRole(null); setNewRoleName(""); setRoleError(""); }}>
                Cancel
              </Button>
            ) : null}
            <Button onClick={handleSaveRole} disabled={savingRole || !String(newRoleName || "").trim()}>
              {savingRole ? "Saving..." : editingRole ? "Save Role" : "Create Role"}
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
                  <div className="flex items-center gap-2">
                    <Button variant="ghost" size="sm" className="h-8" onClick={() => openEditRole(role)}>
                      <Pencil className="w-4 h-4 mr-1" />
                      Edit
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 text-danger hover:text-danger"
                      onClick={() => setDeleteDialog({ kind: "role", item: role })}
                    >
                      <Trash2 className="w-4 h-4 mr-1" />
                      Delete
                    </Button>
                  </div>
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
        title={deleteDialog?.kind === "role" ? "Delete this worker role?" : "Delete this worker?"}
        description={
          deleteDialog?.kind === "role"
            ? "This custom worker role will be removed from the role catalog. Reassign any workers using it first."
            : "This worker record will be removed from the app. This action cannot be undone."
        }
        confirmLabel={deleteDialog?.kind === "role" ? "Delete Role" : "Delete Worker"}
        loading={deleting}
        onConfirm={handleDelete}
      />
    </div>
  );
}
