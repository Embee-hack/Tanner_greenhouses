import { useState, useEffect, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { useLocation, useNavigate } from "react-router-dom";
import { useCurrency } from "@/components/shared/CurrencyProvider.jsx";
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
import { Plus, Package, AlertTriangle, TrendingDown, ImageIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { getErrorMessage } from "@/lib/errors.js";
import { createPageUrl } from "@/utils";

const CATS = ["fertilizer","pesticide","seeds","packaging","equipment","tools","other"];
const getDefaultForm = () => ({
  name: "",
  category: "fertilizer",
  unit: "",
  quantity_in_stock: "",
  reorder_level: "",
  unit_cost: "",
  supplier: "",
  purchase_date: new Date().toISOString().slice(0, 10),
  greenhouse_id: "",
  notes: "",
  image_url: "",
});

const formatDate = (value) => {
  if (!value) return "";
  try {
    return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" }).format(new Date(`${value}T00:00:00`));
  } catch {
    return value;
  }
};

function StockAdjustModal({ item, onClose, onDone }) {
  const [mode, setMode] = useState("add"); // "add" | "remove"
  const [qty, setQty] = useState("");
  const [purchaseDate, setPurchaseDate] = useState(new Date().toISOString().slice(0, 10));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const handle = async () => {
    const amount = parseFloat(qty) || 0;
    if (amount <= 0) return;
    setSaving(true);
    setError("");
    try {
      const newQty = mode === "add"
        ? (item.quantity_in_stock || 0) + amount
        : Math.max(0, (item.quantity_in_stock || 0) - amount);
      await base44.entities.InventoryItem.update(item.id, {
        quantity_in_stock: newQty,
        ...(mode === "add" ? { purchase_date: purchaseDate || item.purchase_date || null } : {}),
      });
      onDone();
    } catch (err) {
      setError(getErrorMessage(err, "Failed to adjust stock."));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal open={true} onClose={onClose} title={`Adjust Stock — ${item.name}`} size="sm">
      <div className="space-y-4">
        <div className="flex rounded-xl overflow-hidden border border-border">
          {["add", "remove"].map(m => (
            <button key={m} onClick={() => setMode(m)}
              className={cn("flex-1 py-2.5 text-sm font-semibold capitalize transition-colors",
                mode === m ? (m === "add" ? "bg-success text-success-foreground" : "bg-danger text-danger-foreground") : "bg-muted text-muted-foreground hover:bg-muted/80"
              )}
            >{m === "add" ? "➕ Add Stock" : "➖ Remove Stock"}</button>
          ))}
        </div>
        <div className="bg-muted/50 rounded-xl p-3 text-center">
          <div className="text-xs text-muted-foreground">Current Stock</div>
          <div className="text-2xl font-bold text-foreground">{item.quantity_in_stock?.toLocaleString()} <span className="text-sm font-normal text-muted-foreground">{item.unit}</span></div>
        </div>
        <FormField label={`Quantity to ${mode === "add" ? "add" : "remove"} (${item.unit})`} required>
          <Input type="number" value={qty} onChange={e => setQty(e.target.value)} placeholder="0" min="0" step="0.01" autoFocus />
        </FormField>
        {mode === "add" ? (
          <FormField label="Purchase Date">
            <Input type="date" value={purchaseDate} onChange={e => setPurchaseDate(e.target.value)} />
          </FormField>
        ) : null}
        {qty && parseFloat(qty) > 0 && (
          <div className="text-xs text-center text-muted-foreground">
            New stock: <strong>{mode === "add"
              ? ((item.quantity_in_stock || 0) + parseFloat(qty)).toLocaleString()
              : Math.max(0, (item.quantity_in_stock || 0) - parseFloat(qty)).toLocaleString()
            } {item.unit}</strong>
          </div>
        )}
        {error ? <div className="bg-danger/10 text-danger text-sm rounded-lg px-4 py-2">{error}</div> : null}
        <div className="flex gap-2 pt-1">
          <Button variant="outline" className="flex-1" onClick={onClose}>Cancel</Button>
          <Button className="flex-1" onClick={handle} disabled={saving || !qty || parseFloat(qty) <= 0}>
            {saving ? "Saving…" : "Confirm"}
          </Button>
        </div>
      </div>
    </Modal>
  );
}

export default function Inventory() {
  const { fmt } = useCurrency();
  const location = useLocation();
  const navigate = useNavigate();
  const [items, setItems] = useState([]);
  const [greenhouses, setGreenhouses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [form, setForm] = useState(getDefaultForm);
  const [saving, setSaving] = useState(false);
  const [catFilter, setCatFilter] = useState("all");
  const [adjustItem, setAdjustItem] = useState(null);
  const [deleteItem, setDeleteItem] = useState(null);
  const [uploadingImg, setUploadingImg] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const fileRef = useRef();
  const [loadError, setLoadError] = useState("");
  const [error, setError] = useState("");

  const load = async () => {
    try {
      setLoading(true);
      const [inv, gh] = await Promise.all([
        base44.entities.InventoryItem.list("name"),
        base44.entities.Greenhouse.list("code"),
      ]);
      setItems(inv);
      setGreenhouses(gh);
      setLoadError("");
    } catch (err) {
      setLoadError(getErrorMessage(err, "Failed to load inventory."));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  useEffect(() => {
    const itemId = new URLSearchParams(location.search).get("item");
    if (!itemId || items.length === 0 || showModal) return;

    const item = items.find((current) => current.id === itemId);
    if (!item) return;

    setError("");
    setEditItem(item);
    setForm({
      ...getDefaultForm(),
      ...item,
      quantity_in_stock: item.quantity_in_stock ?? "",
      reorder_level: item.reorder_level ?? "",
      unit_cost: item.unit_cost ?? "",
      purchase_date: item.purchase_date || "",
    });
    setShowModal(true);
    navigate(createPageUrl("Inventory"), { replace: true });
  }, [items, location.search, navigate, showModal]);

  const openAdd = () => { setError(""); setEditItem(null); setForm(getDefaultForm()); setShowModal(true); };
  const openEdit = (item) => {
    setError("");
    setEditItem(item);
    setForm({
      ...getDefaultForm(),
      ...item,
      quantity_in_stock: item.quantity_in_stock ?? "",
      reorder_level: item.reorder_level ?? "",
      unit_cost: item.unit_cost ?? "",
      purchase_date: item.purchase_date || "",
    });
    setShowModal(true);
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) return;
    setUploadingImg(true);
    try {
      const dataUrl = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (evt) => resolve(evt.target.result);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
      setForm(f => ({ ...f, image_url: dataUrl }));
    } finally {
      setUploadingImg(false);
      if (e.target) e.target.value = "";
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setError("");
    try {
      const data = {
        ...form,
        quantity_in_stock: parseFloat(form.quantity_in_stock) || 0,
        reorder_level: form.reorder_level !== "" ? parseFloat(form.reorder_level) : null,
        unit_cost: form.unit_cost !== "" ? parseFloat(form.unit_cost) : null,
        purchase_date: form.purchase_date || null,
        greenhouse_id: form.greenhouse_id || null,
      };
      if (editItem) {
        await base44.entities.InventoryItem.update(editItem.id, data);
      } else {
        await base44.entities.InventoryItem.create(data);
      }
      setShowModal(false);
      load();
    } catch (err) {
      setError(getErrorMessage(err, "Failed to save inventory item."));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteItem) return;

    setDeleting(true);
    try {
      await base44.entities.InventoryItem.delete(deleteItem.id);
      setDeleteItem(null);
      await load();
    } catch (err) {
      setLoadError(getErrorMessage(err, "Failed to delete inventory item."));
    } finally {
      setDeleting(false);
    }
  };

  const filtered = catFilter === "all" ? items : items.filter(i => i.category === catFilter);
  const lowStock = items.filter(i => i.reorder_level != null && i.quantity_in_stock <= i.reorder_level);

  return (
    <div className="p-4 md:p-6 space-y-6">
      <PageHeader
        title="Inventory"
        subtitle={`${items.length} items · ${lowStock.length} low stock alerts`}
        actions={
          <Button size="sm" onClick={openAdd} className="gap-1.5">
            <Plus className="w-4 h-4" /> Add Item
          </Button>
        }
      />

      <ErrorBanner message={loadError} onRetry={load} />

      {lowStock.length > 0 && (
        <div className="bg-warning/10 border border-warning/30 rounded-xl p-4 flex items-start gap-3">
          <AlertTriangle className="w-4 h-4 text-warning mt-0.5 flex-shrink-0" />
          <div>
            <div className="text-sm font-semibold text-warning">Low Stock Alert</div>
            <div className="text-xs text-muted-foreground mt-0.5">
              {lowStock.map(i => `${i.name} (${i.quantity_in_stock} ${i.unit})`).join(" · ")}
            </div>
          </div>
        </div>
      )}

      {/* Category filter */}
      <div className="flex gap-2 flex-wrap">
        {["all", ...CATS].map(c => (
          <button key={c} onClick={() => setCatFilter(c)}
            className={cn("px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all capitalize",
              catFilter === c ? "bg-primary text-primary-foreground border-primary" : "bg-muted text-muted-foreground border-border hover:border-primary/40"
            )}>
            {c === "all" ? "All" : c.replace(/_/g, " ")}
          </button>
        ))}
      </div>

      {/* Item Cards */}
      {!loading && filtered.length === 0 ? (
        <EmptyState icon={Package} title="No inventory items" description="Track your farm supplies and materials." action={<Button onClick={openAdd}><Plus className="w-4 h-4 mr-1" />Add Item</Button>} />
      ) : loading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
          {Array.from({ length: 10 }).map((_, i) => <div key={i} className="h-48 bg-muted animate-pulse rounded-2xl" />)}
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
          {filtered.map(item => {
            const isLow = item.reorder_level != null && item.quantity_in_stock <= item.reorder_level;
            const totalVal = (item.unit_cost || 0) * (item.quantity_in_stock || 0);
            return (
              <div key={item.id} className={cn("bg-card rounded-2xl border overflow-hidden shadow-sm hover:shadow-md transition-shadow", isLow ? "border-orange-300" : "border-border")}>
                {/* Image */}
                <div className="h-40 bg-gradient-to-br from-muted to-muted/50 flex items-center justify-center overflow-hidden relative p-2">
                  {item.image_url ? (
                    <img src={item.image_url} alt={item.name} className="w-full h-full object-contain" />
                  ) : (
                    <Package className="w-10 h-10 text-muted-foreground/30" />
                  )}
                  {isLow && (
                    <div className="absolute top-2 right-2 bg-orange-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full flex items-center gap-0.5">
                      <TrendingDown className="w-2.5 h-2.5" /> Low
                    </div>
                  )}
                </div>
                <div className="p-3">
                  <div className="font-bold text-sm text-foreground truncate">{item.name}</div>
                  <div className="text-xs text-muted-foreground capitalize mb-2">{item.category?.replace(/_/g, " ")}</div>
                  <div className={cn("text-lg font-bold", isLow ? "text-orange-600" : "text-foreground")}>
                    {item.quantity_in_stock?.toLocaleString()} <span className="text-xs font-normal text-muted-foreground">{item.unit}</span>
                  </div>
                  {totalVal > 0 && <div className="text-xs text-muted-foreground">Value: {fmt(totalVal)}</div>}
                  {item.purchase_date && <div className="text-xs text-muted-foreground">Purchased: {formatDate(item.purchase_date)}</div>}
                  {item.supplier && <div className="text-xs text-muted-foreground truncate">{item.supplier}</div>}

                  {/* Quick stock adjust */}
                  <button
                    onClick={() => setAdjustItem(item)}
                    className="mt-2 w-full text-xs font-semibold py-1.5 rounded-lg bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
                  >
                    ± Adjust Stock
                  </button>

                  <div className="mt-1.5 flex justify-end">
                    <RecordActions
                      onEdit={() => openEdit(item)}
                      onDelete={() => setDeleteItem(item)}
                      ariaLabel={`Actions for ${item.name}`}
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Stock Adjust Modal */}
      {adjustItem && (
        <StockAdjustModal
          item={adjustItem}
          onClose={() => setAdjustItem(null)}
          onDone={() => { setAdjustItem(null); load(); }}
        />
      )}

      {/* Add/Edit Modal */}
      <Modal open={showModal} onClose={() => setShowModal(false)} title={editItem ? "Edit Item" : "Add Inventory Item"}>
        <div className="space-y-4">
          {/* Image upload */}
          <FormField label="Item Image">
            <div className="flex items-center gap-3">
              <div className="w-20 h-20 rounded-xl border border-border bg-muted flex items-center justify-center overflow-hidden flex-shrink-0">
                {form.image_url ? (
                  <img src={form.image_url} alt="preview" className="w-full h-full object-cover" />
                ) : (
                  <ImageIcon className="w-6 h-6 text-muted-foreground/40" />
                )}
              </div>
              <div>
                <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
                <Button type="button" variant="outline" size="sm" onClick={() => fileRef.current?.click()} disabled={uploadingImg}>
                  {uploadingImg ? "Uploading…" : "Upload Image"}
                </Button>
                {form.image_url && (
                  <button className="block text-xs text-danger mt-1" onClick={() => setForm(f => ({ ...f, image_url: "" }))}>Remove</button>
                )}
              </div>
            </div>
          </FormField>

          <div className="grid grid-cols-2 gap-4">
            <FormField label="Item Name" required>
              <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. NPK Fertilizer" />
            </FormField>
            <FormField label="Category" required>
              <Select value={form.category} onValueChange={v => setForm(f => ({ ...f, category: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{CATS.map(c => <SelectItem key={c} value={c} className="capitalize">{c.replace(/_/g, " ")}</SelectItem>)}</SelectContent>
              </Select>
            </FormField>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <FormField label="Unit" required>
              <Input value={form.unit} onChange={e => setForm(f => ({ ...f, unit: e.target.value }))} placeholder="kg, L, pcs…" />
            </FormField>
            <FormField label="In Stock">
              <Input type="number" value={form.quantity_in_stock} onChange={e => setForm(f => ({ ...f, quantity_in_stock: e.target.value }))} placeholder="0" step="0.01" />
            </FormField>
            <FormField label="Reorder Level">
              <Input type="number" value={form.reorder_level} onChange={e => setForm(f => ({ ...f, reorder_level: e.target.value }))} placeholder="0" step="0.01" />
            </FormField>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <FormField label="Unit Cost">
              <Input type="number" value={form.unit_cost} onChange={e => setForm(f => ({ ...f, unit_cost: e.target.value }))} placeholder="0.00" step="0.01" />
            </FormField>
            <FormField label="Purchase Date">
              <Input type="date" value={form.purchase_date} onChange={e => setForm(f => ({ ...f, purchase_date: e.target.value }))} />
            </FormField>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <FormField label="Supplier">
              <Input value={form.supplier} onChange={e => setForm(f => ({ ...f, supplier: e.target.value }))} placeholder="Supplier name" />
            </FormField>
            <FormField label="Greenhouse">
              <Select value={form.greenhouse_id || "__none__"} onValueChange={v => setForm(f => ({ ...f, greenhouse_id: v === "__none__" ? "" : v }))}>
                <SelectTrigger><SelectValue placeholder="Optional" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">No greenhouse</SelectItem>
                  {greenhouses.map(g => <SelectItem key={g.id} value={g.id}>{g.code}</SelectItem>)}
                </SelectContent>
              </Select>
            </FormField>
          </div>
          <FormField label="Notes">
            <Input value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
          </FormField>
          {error ? <div className="bg-danger/10 text-danger text-sm rounded-lg px-4 py-2">{error}</div> : null}
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setShowModal(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving || !form.name || !form.unit}>
              {saving ? "Saving…" : editItem ? "Save Changes" : "Add Item"}
            </Button>
          </div>
        </div>
      </Modal>

      <DeleteConfirmDialog
        open={!!deleteItem}
        onOpenChange={(open) => {
          if (!open) setDeleteItem(null);
        }}
        title="Delete this inventory item?"
        description="This inventory item will be removed from stock records. This action cannot be undone."
        confirmLabel="Delete Item"
        loading={deleting}
        onConfirm={handleDelete}
      />
    </div>
  );
}
