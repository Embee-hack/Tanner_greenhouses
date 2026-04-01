import { useEffect, useMemo, useState } from "react";
import { Copy, MoreHorizontal, Pencil, Trash2 } from "lucide-react";
import PageHeader from "@/components/shared/PageHeader";
import DataTable from "@/components/shared/DataTable";
import EmptyState from "@/components/shared/EmptyState";
import FormField from "@/components/shared/FormField";
import Modal from "@/components/shared/Modal";
import StatCard from "@/components/dashboard/StatCard";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

const renderField = (field, form, setForm) => {
  if (field.type === "select") {
    return (
      <Select value={form[field.key] ?? ""} onValueChange={(value) => setForm((current) => ({ ...current, [field.key]: value }))}>
        <SelectTrigger>
          <SelectValue placeholder={field.placeholder || `Select ${field.label.toLowerCase()}`} />
        </SelectTrigger>
        <SelectContent>
          {(field.options || []).map((option) => (
            <SelectItem key={String(option.value)} value={String(option.value)}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    );
  }

  if (field.type === "textarea") {
    return (
      <Textarea
        rows={field.rows || 4}
        value={form[field.key] ?? ""}
        onChange={(event) => setForm((current) => ({ ...current, [field.key]: event.target.value }))}
        placeholder={field.placeholder}
      />
    );
  }

  return (
    <Input
      type={field.type || "text"}
      min={field.min}
      step={field.step}
      value={form[field.key] ?? ""}
      onChange={(event) => setForm((current) => ({ ...current, [field.key]: event.target.value }))}
      placeholder={field.placeholder}
    />
  );
};

const duplicateFieldValue = (key, value) => {
  if (typeof value !== "string") return value;

  const trimmed = value.trim();
  if (!trimmed) return value;

  if (key === "flock_code" || key === "tag_number" || key === "code" || key.endsWith("_code")) {
    return `${trimmed}-COPY`;
  }

  if (key === "name" || key === "title") {
    return `${trimmed} Copy`;
  }

  return value;
};

export default function RecordManagerPage({
  title,
  subtitle,
  actionLabel,
  actionIcon: ActionIcon,
  columns,
  records,
  loading,
  summaryCards = [],
  emptyState,
  initialValues,
  fields,
  onCreate,
  onUpdate,
  onDelete,
  mapToForm = (row) => ({ ...row }),
  buildPayload = (form) => form,
  prepareDuplicateForm,
  modalTitle,
}) {
  const [showModal, setShowModal] = useState(false);
  const [editingRecord, setEditingRecord] = useState(null);
  const [duplicatingRecord, setDuplicatingRecord] = useState(null);
  const [form, setForm] = useState(initialValues);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [selectedIds, setSelectedIds] = useState([]);
  const [deleteDialog, setDeleteDialog] = useState(null);

  const singularTitle = useMemo(() => title.replace(/s$/, ""), [title]);
  const hasTableActions = Boolean(onUpdate || onDelete || onCreate);
  const allIds = useMemo(() => records.map((record) => record.id).filter(Boolean), [records]);
  const allSelected = allIds.length > 0 && allIds.every((id) => selectedIds.includes(id));
  const someSelected = allIds.some((id) => selectedIds.includes(id)) && !allSelected;

  useEffect(() => {
    if (allIds.length === 0) {
      setSelectedIds([]);
      return;
    }
    const validIds = new Set(allIds);
    setSelectedIds((current) => current.filter((id) => validIds.has(id)));
  }, [allIds]);

  const resolvedModalTitle = useMemo(() => {
    if (duplicatingRecord) return modalTitle?.duplicate || `Duplicate ${singularTitle}`;
    if (!editingRecord) return modalTitle?.create || `Add ${title.slice(0, -1)}`;
    return modalTitle?.edit || `Edit ${title.slice(0, -1)}`;
  }, [duplicatingRecord, editingRecord, modalTitle, singularTitle, title]);

  const openCreate = () => {
    setEditingRecord(null);
    setDuplicatingRecord(null);
    setForm(initialValues);
    setError("");
    setShowModal(true);
  };

  const openEdit = (record) => {
    setEditingRecord(record);
    setDuplicatingRecord(null);
    setForm({
      ...initialValues,
      ...mapToForm(record),
    });
    setError("");
    setShowModal(true);
  };

  const openDuplicate = (record) => {
    const mappedForm = {
      ...initialValues,
      ...mapToForm(record),
    };

    const duplicatedForm = fields.reduce(
      (accumulator, field) => ({
        ...accumulator,
        [field.key]: duplicateFieldValue(field.key, mappedForm[field.key]),
      }),
      mappedForm
    );

    setEditingRecord(null);
    setDuplicatingRecord(record);
    setForm(prepareDuplicateForm ? prepareDuplicateForm(duplicatedForm, record) : duplicatedForm);
    setError("");
    setShowModal(true);
  };

  const handleSave = async () => {
    setSaving(true);
    setError("");

    try {
      const payload = buildPayload(form);
      if (editingRecord) {
        await onUpdate(editingRecord.id, payload);
      } else {
        await onCreate(payload);
      }
      setEditingRecord(null);
      setDuplicatingRecord(null);
      setForm(initialValues);
      setShowModal(false);
    } catch (saveError) {
      setError(saveError?.message || "Unable to save record");
    } finally {
      setSaving(false);
    }
  };

  const toggleSelectAll = (checked) => {
    if (!onDelete) return;
    setSelectedIds((current) =>
      checked ? Array.from(new Set([...current, ...allIds])) : current.filter((id) => !allIds.includes(id))
    );
  };

  const toggleSelectOne = (id, checked) => {
    if (!id || !onDelete) return;
    setSelectedIds((current) => (checked ? (current.includes(id) ? current : [...current, id]) : current.filter((item) => item !== id)));
  };

  const requestDelete = (record) => {
    if (!record || !onDelete || saving) return;
    setDeleteDialog({
      mode: "single",
      ids: [record.id],
    });
  };

  const requestDeleteBulk = () => {
    if (!onDelete || selectedIds.length === 0 || saving) return;
    setDeleteDialog({
      mode: "bulk",
      ids: selectedIds,
    });
  };

  const handleConfirmDelete = async () => {
    const ids = deleteDialog?.ids || [];
    if (ids.length === 0 || !onDelete) return;

    setSaving(true);
    setError("");

    try {
      await onDelete(ids.length === 1 ? ids[0] : ids);
      setSelectedIds((current) => current.filter((id) => !ids.includes(id)));
      if (editingRecord?.id && ids.includes(editingRecord.id)) {
        setEditingRecord(null);
        setDuplicatingRecord(null);
        setForm(initialValues);
        setShowModal(false);
      }
      setDeleteDialog(null);
    } catch (deleteError) {
      setError(deleteError?.message || "Unable to delete record");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!editingRecord) return;
    requestDelete(editingRecord);
  };

  const tableColumns = hasTableActions
    ? [
        ...(onDelete
          ? [
              {
                key: "__select",
                label: (
                  <div className="flex items-center">
                    <Checkbox
                      checked={allSelected ? true : someSelected ? "indeterminate" : false}
                      onCheckedChange={(checked) => toggleSelectAll(checked === true)}
                      aria-label={`Select all ${title.toLowerCase()}`}
                    />
                  </div>
                ),
                render: (_value, row) => (
                  <div className="flex items-center" onClick={(event) => event.stopPropagation()}>
                    <Checkbox
                      checked={selectedIds.includes(row.id)}
                      onCheckedChange={(checked) => toggleSelectOne(row.id, checked === true)}
                      aria-label={`Select ${singularTitle.toLowerCase()}`}
                    />
                  </div>
                ),
              },
            ]
          : []),
        ...columns,
        {
          key: "__actions",
          label: "",
          align: "right",
          render: (_value, row) => (
            <div className="flex justify-end" onClick={(event) => event.stopPropagation()}>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={(event) => event.stopPropagation()}
                    aria-label={`Open ${singularTitle.toLowerCase()} actions`}
                  >
                    <MoreHorizontal className="w-4 h-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-40">
                  {onUpdate ? (
                    <DropdownMenuItem onSelect={() => openEdit(row)}>
                      <Pencil className="w-4 h-4" />
                      Edit
                    </DropdownMenuItem>
                  ) : null}
                  {onCreate ? (
                    <DropdownMenuItem onSelect={() => openDuplicate(row)}>
                      <Copy className="w-4 h-4" />
                      Duplicate
                    </DropdownMenuItem>
                  ) : null}
                  {onDelete ? (
                    <DropdownMenuItem onSelect={() => requestDelete(row)} className="text-danger focus:text-danger">
                      <Trash2 className="w-4 h-4" />
                      Delete
                    </DropdownMenuItem>
                  ) : null}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          ),
        },
      ]
    : columns;

  return (
    <div className="p-4 md:p-6 space-y-6">
      <PageHeader
        title={title}
        subtitle={subtitle}
        actions={
          <Button onClick={openCreate} className="gap-1.5">
            {ActionIcon ? <ActionIcon className="w-4 h-4" /> : null}
            {actionLabel}
          </Button>
        }
      />

      {summaryCards.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
          {summaryCards.map((card) => (
            <StatCard key={card.title} {...card} loading={loading} />
          ))}
        </div>
      )}

      {!loading && records.length === 0 ? (
        <EmptyState
          icon={emptyState.icon}
          title={emptyState.title}
          description={emptyState.description}
          action={
            <Button onClick={openCreate} className="gap-1.5">
              {ActionIcon ? <ActionIcon className="w-4 h-4" /> : null}
              {actionLabel}
            </Button>
          }
        />
      ) : (
        <DataTable columns={tableColumns} data={records} loading={loading} />
      )}

      {selectedIds.length > 0 && onDelete ? (
        <div className="fixed bottom-6 right-6 z-40">
          <div className="rounded-2xl border border-border bg-card/95 backdrop-blur shadow-lg px-3 py-3 flex items-center gap-2">
            <span className="text-sm text-muted-foreground pr-1">{selectedIds.length} selected</span>
            <Button variant="outline" size="sm" onClick={() => setSelectedIds([])} disabled={saving}>
              Clear
            </Button>
            <Button size="sm" variant="destructive" onClick={requestDeleteBulk} disabled={saving}>
              <Trash2 className="w-4 h-4 mr-1" />
              Delete
            </Button>
          </div>
        </div>
      ) : null}

      <Modal open={showModal} onClose={() => setShowModal(false)} title={resolvedModalTitle} size="lg">
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {fields.map((field) => (
              <FormField
                key={field.key}
                label={field.label}
                required={field.required}
                className={field.fullWidth ? "md:col-span-2" : undefined}
              >
                {renderField(field, form, setForm)}
              </FormField>
            ))}
          </div>

          {error ? <p className="text-sm text-danger">{error}</p> : null}

          <div className="flex items-center justify-between gap-3 pt-2">
            <div className="flex items-center gap-2">
              {editingRecord && onCreate ? (
                <Button variant="outline" onClick={() => openDuplicate(editingRecord)} disabled={saving}>
                  Duplicate
                </Button>
              ) : null}
              {editingRecord && onDelete ? (
                <Button variant="outline" onClick={handleDelete} disabled={saving}>
                  Delete
                </Button>
              ) : null}
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" onClick={() => setShowModal(false)} disabled={saving}>
                Cancel
              </Button>
              <Button onClick={handleSave} disabled={saving}>
                {saving ? "Saving..." : duplicatingRecord ? "Create Copy" : editingRecord ? "Save Changes" : "Create Record"}
              </Button>
            </div>
          </div>
        </div>
      </Modal>

      <AlertDialog open={Boolean(deleteDialog)} onOpenChange={(open) => !open && setDeleteDialog(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {deleteDialog?.mode === "bulk"
                ? `Delete selected ${title.toLowerCase()}?`
                : `Delete this ${singularTitle.toLowerCase()}?`}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {deleteDialog?.mode === "bulk"
                ? `This will permanently delete ${deleteDialog?.ids?.length || 0} ${title.toLowerCase()}. This action cannot be undone.`
                : `This ${singularTitle.toLowerCase()} will be permanently deleted. This action cannot be undone.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={saving}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmDelete} disabled={saving} className="bg-danger hover:bg-danger/90">
              {saving ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
