import { useState, useEffect, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { useCurrency } from "@/components/shared/CurrencyProvider.jsx";
import PageHeader from "@/components/shared/PageHeader";
import Modal from "@/components/shared/Modal";
import FormField from "@/components/shared/FormField";
import EmptyState from "@/components/shared/EmptyState";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Package, AlertTriangle, TrendingDown, ImageIcon, Pencil, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";

const CATS = ["fertilizer","pesticide","seeds","packaging","equipment","tools","other"];
const defaultForm = { name: "", category: "fertilizer", unit: "", quantity_in_stock: "", reorder_level: "", unit_cost: "", supplier: "", greenhouse_id: "", notes: "", image_url: "" };

function StockAdjustModal({ item, onClose, onDone, fmt }) {
  const [mode, setMode] = useState("add"); // "add" | "remove"
  const [qty, setQty] = useState("");
  const [saving, setSaving] = useState(false);

  const handle = async () => {
    const amount = parseFloat(qty) || 0;
    if (amount <= 0) return;
    setSaving(true);
    const newQty = mode === "add"
      ? (item.quantity_in_stock || 0) + amount
      : Math.max(0, (item.quantity_in_stock || 0) - amount);
    await base44.entities.InventoryItem.update(item.id, { quantity_in_stock: newQty });
    setSaving(false);
    onDone();
  };

  return (
    <Modal open={true} onClose={onClose} title={`Adjust Stock — ${item.name}`} size="sm">
      <div className="space-y-4">
        <div className="flex rounded-xl overflow-hidden border border-border">
          {["add", "remove"].map(m => (
            <button key={m} onClick={() => setMode(m)}
              className={cn("flex-1 py-2.5 text-sm font-semibold capitalize transition-colors",
                mode === m ? (m === "add" ? "bg-emerald-600 text-white" : "bg-red-500 text-white") : "bg-muted text-muted-foreground hover:bg-muted/80"
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
        {qty && parseFloat(qty) > 0 && (
          <div className="text-xs text-center text-muted-foreground">
            New stock: <strong>{mode === "add"
              ? ((item.quantity_in_stock || 0) + parseFloat(qty)).toLocaleString()
              : Math.max(0, (item.quantity_in_stock || 0) - parseFloat(qty)).toLocaleString()
            } {item.unit}</strong>
          </div>
        )}
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
  const [items, setItems] = useState([]);
  const [greenhouses, setGreenhouses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [form, setForm] = useState(defaultForm);
  const [saving, setSaving] = useState(false);
  const [catFilter, setCatFilter] = useState("all");
  const [adjustItem, setAdjustItem] = useState(null);
  const [uploadingImg, setUploadingImg] = useState(false);
  const fileRef = useRef();

  const load = () => {
    Promise.all([
      base44.entities.InventoryItem.list("name"),
      base44.entities.Greenhouse.list("code"),
    ]).then(([inv, gh]) => {
      setItems(inv);
      setGreenhouses(gh);
      setLoading(false);
    });
  };

  useEffect(() => { load(); }, []);

  const ghMap = Object.fromEntries(greenhouses.map(g => [g.id, g]));

  const openAdd = () => { setEditItem(null); setForm(defaultForm); setShowModal(true); };
  const openEdit = (item) => {
    setEditItem(item);
    setForm({ ...defaultForm, ...item, quantity_in_stock: item.quantity_in_stock ?? "", reorder_level: item.reorder_level ?? "", unit_cost: item.unit_cost ?? "" });
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
    const data = {
      ...form,
      quantity_in_stock: parseFloat(form.quantity_in_stock) || 0,
      reorder_level: form.reorder_level !== "" ? parseFloat(form.reorder_level) : null,
      unit_cost: form.unit_cost !== "" ? parseFloat(form.unit_cost) : null,
      greenhouse_id: form.greenhouse_id || null,
    };
    if (editItem) {
      await base44.entities.InventoryItem.update(editItem.id, data);
    } else {
      await base44.entities.InventoryItem.create(data);
    }
    setSaving(false);
    setShowModal(false);
    load();
  };

  const handleDelete = async (id) => {
    await base44.entities.InventoryItem.delete(id);
    load();
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
                  {item.supplier && <div className="text-xs text-muted-foreground truncate">{item.supplier}</div>}

                  {/* Quick stock adjust */}
                  <button
                    onClick={() => setAdjustItem(item)}
                    className="mt-2 w-full text-xs font-semibold py-1.5 rounded-lg bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
                  >
                    ± Adjust Stock
                  </button>

                  <div className="flex gap-1 mt-1.5">
                    <button onClick={() => openEdit(item)} className="flex-1 py-1 text-xs border border-border rounded-lg hover:bg-muted transition-colors flex items-center justify-center gap-1">
                      <Pencil className="w-3 h-3" /> Edit
                    </button>
                    <button onClick={() => handleDelete(item.id)} className="p-1 text-xs border border-border rounded-lg hover:bg-red-50 hover:border-red-200 transition-colors text-danger">
                      <Trash2 className="w-3 h-3" />
                    </button>
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
          fmt={fmt}
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
            <FormField label="Supplier">
              <Input value={form.supplier} onChange={e => setForm(f => ({ ...f, supplier: e.target.value }))} placeholder="Supplier name" />
            </FormField>
          </div>
          <FormField label="Notes">
            <Input value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
          </FormField>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setShowModal(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving || !form.name || !form.unit}>
              {saving ? "Saving…" : editItem ? "Save Changes" : "Add Item"}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}