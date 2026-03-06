import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import PageHeader from "@/components/shared/PageHeader";
import Modal from "@/components/shared/Modal";
import FormField from "@/components/shared/FormField";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  format, startOfMonth, endOfMonth, eachDayOfInterval,
  startOfWeek, endOfWeek, isSameMonth, isSameDay, parseISO, isToday
} from "date-fns";

const EVENT_TYPES = ["planting","harvest","treatment","inspection","maintenance","other"];
const EVENT_COLORS = {
  planting: "bg-success/20 text-success border-success/40",
  harvest: "bg-primary/20 text-primary border-primary/40",
  treatment: "bg-warning/20 text-warning border-warning/40",
  inspection: "bg-blue-500/20 text-blue-600 border-blue-400/40",
  maintenance: "bg-purple-500/20 text-purple-600 border-purple-400/40",
  other: "bg-muted text-muted-foreground border-border",
};
const DOT_COLORS = {
  planting: "bg-success",
  harvest: "bg-primary",
  treatment: "bg-warning",
  inspection: "bg-blue-500",
  maintenance: "bg-purple-500",
  other: "bg-muted-foreground",
};

const defaultForm = { title: "", date: "", end_date: "", event_type: "other", greenhouse_id: "", description: "" };

export default function FarmCalendar() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [events, setEvents] = useState([]);
  const [greenhouses, setGreenhouses] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [editEvent, setEditEvent] = useState(null);
  const [form, setForm] = useState(defaultForm);
  const [saving, setSaving] = useState(false);
  const [selectedDay, setSelectedDay] = useState(null);

  const load = () => {
    Promise.all([
      base44.entities.CalendarEvent.list("-date", 500),
      base44.entities.Greenhouse.list("code"),
    ]).then(([ev, gh]) => {
      setEvents(ev);
      setGreenhouses(gh);
    });
  };

  useEffect(() => { load(); }, []);

  const ghMap = Object.fromEntries(greenhouses.map(g => [g.id, g]));

  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const calStart = startOfWeek(monthStart, { weekStartsOn: 1 });
  const calEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });
  const days = eachDayOfInterval({ start: calStart, end: calEnd });

  const getEventsForDay = (day) =>
    events.filter(e => e.date && isSameDay(parseISO(e.date), day));

  const openAdd = (day = null) => {
    setEditEvent(null);
    setForm({ ...defaultForm, date: day ? format(day, "yyyy-MM-dd") : "" });
    setShowModal(true);
  };

  const openEdit = (ev) => {
    setEditEvent(ev);
    setForm({ ...defaultForm, ...ev });
    setShowModal(true);
  };

  const handleSave = async () => {
    setSaving(true);
    const data = { ...form, greenhouse_id: form.greenhouse_id || null, end_date: form.end_date || null };
    if (editEvent) {
      await base44.entities.CalendarEvent.update(editEvent.id, data);
    } else {
      await base44.entities.CalendarEvent.create(data);
    }
    setSaving(false);
    setShowModal(false);
    load();
  };

  const handleDelete = async (id) => {
    await base44.entities.CalendarEvent.delete(id);
    load();
  };

  const selectedDayEvents = selectedDay ? getEventsForDay(selectedDay) : [];

  return (
    <div className="p-4 md:p-6 space-y-4">
      <PageHeader
        title="Farm Calendar"
        subtitle={format(currentDate, "MMMM yyyy")}
        actions={
          <div className="flex items-center gap-2">
            <button onClick={() => setCurrentDate(d => new Date(d.getFullYear(), d.getMonth() - 1, 1))} className="p-1.5 rounded-lg border border-border hover:bg-muted transition-colors">
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button onClick={() => setCurrentDate(new Date())} className="px-3 py-1.5 text-xs rounded-lg border border-border hover:bg-muted transition-colors font-medium">Today</button>
            <button onClick={() => setCurrentDate(d => new Date(d.getFullYear(), d.getMonth() + 1, 1))} className="p-1.5 rounded-lg border border-border hover:bg-muted transition-colors">
              <ChevronRight className="w-4 h-4" />
            </button>
            <Button size="sm" onClick={() => openAdd()} className="gap-1.5 ml-2">
              <Plus className="w-4 h-4" /> Add Event
            </Button>
          </div>
        }
      />

      {/* Legend */}
      <div className="flex flex-wrap gap-3">
        {EVENT_TYPES.map(t => (
          <div key={t} className="flex items-center gap-1.5">
            <div className={cn("w-2 h-2 rounded-full", DOT_COLORS[t])} />
            <span className="text-xs text-muted-foreground capitalize">{t}</span>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Calendar grid */}
        <div className="lg:col-span-2 bg-card rounded-xl border border-border overflow-hidden">
          {/* Day headers */}
          <div className="grid grid-cols-7 border-b border-border">
            {["Mon","Tue","Wed","Thu","Fri","Sat","Sun"].map(d => (
              <div key={d} className="py-2 text-center text-xs font-semibold text-muted-foreground">{d}</div>
            ))}
          </div>
          {/* Days */}
          <div className="grid grid-cols-7">
            {days.map((day, idx) => {
              const dayEvents = getEventsForDay(day);
              const inMonth = isSameMonth(day, currentDate);
              const isSelected = selectedDay && isSameDay(day, selectedDay);
              const todayDay = isToday(day);
              return (
                <div
                  key={idx}
                  onClick={() => setSelectedDay(isSelected ? null : day)}
                  className={cn(
                    "min-h-[80px] p-1.5 border-b border-r border-border/50 cursor-pointer transition-colors",
                    !inMonth && "opacity-40",
                    isSelected && "bg-primary/10",
                    !isSelected && "hover:bg-muted/40"
                  )}
                >
                  <div className={cn(
                    "w-6 h-6 flex items-center justify-center text-xs font-semibold rounded-full mb-1",
                    todayDay ? "bg-primary text-primary-foreground" : "text-foreground"
                  )}>
                    {format(day, "d")}
                  </div>
                  <div className="space-y-0.5">
                    {dayEvents.slice(0, 2).map(ev => (
                      <div
                        key={ev.id}
                        onClick={e => { e.stopPropagation(); openEdit(ev); }}
                        className={cn("text-[10px] px-1.5 py-0.5 rounded border truncate cursor-pointer hover:opacity-80", EVENT_COLORS[ev.event_type] || EVENT_COLORS.other)}
                      >
                        {ev.title}
                      </div>
                    ))}
                    {dayEvents.length > 2 && (
                      <div className="text-[10px] text-muted-foreground px-1">+{dayEvents.length - 2} more</div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Side panel */}
        <div className="bg-card rounded-xl border border-border p-4 flex flex-col">
          {selectedDay ? (
            <>
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-sm">{format(selectedDay, "EEEE, MMM d")}</h3>
                <button onClick={() => openAdd(selectedDay)} className="text-xs text-primary hover:underline flex items-center gap-0.5">
                  <Plus className="w-3 h-3" /> Add
                </button>
              </div>
              {selectedDayEvents.length === 0 ? (
                <div className="flex-1 flex items-center justify-center text-muted-foreground text-sm">No events this day</div>
              ) : (
                <div className="space-y-2 overflow-y-auto">
                  {selectedDayEvents.map(ev => (
                    <div key={ev.id} className={cn("p-3 rounded-lg border text-xs", EVENT_COLORS[ev.event_type] || EVENT_COLORS.other)}>
                      <div className="font-semibold mb-0.5">{ev.title}</div>
                      <div className="capitalize opacity-80">{ev.event_type}{ev.greenhouse_id && ` · ${ghMap[ev.greenhouse_id]?.code}`}</div>
                      {ev.description && <div className="mt-1 opacity-70">{ev.description}</div>}
                      <div className="flex gap-2 mt-2">
                        <button onClick={() => openEdit(ev)} className="underline">Edit</button>
                        <button onClick={() => handleDelete(ev.id)} className="underline">Delete</button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground text-sm gap-2">
              <div>Click a day to view events</div>
              <div className="text-xs">{events.length} total events</div>
            </div>
          )}
        </div>
      </div>

      <Modal open={showModal} onClose={() => setShowModal(false)} title={editEvent ? "Edit Event" : "Add Calendar Event"}>
        <div className="space-y-4">
          <FormField label="Title" required>
            <Input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="Event title" />
          </FormField>
          <div className="grid grid-cols-2 gap-4">
            <FormField label="Date" required>
              <Input type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} />
            </FormField>
            <FormField label="End Date">
              <Input type="date" value={form.end_date} onChange={e => setForm(f => ({ ...f, end_date: e.target.value }))} />
            </FormField>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <FormField label="Type" required>
              <Select value={form.event_type} onValueChange={v => setForm(f => ({ ...f, event_type: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{EVENT_TYPES.map(t => <SelectItem key={t} value={t} className="capitalize">{t}</SelectItem>)}</SelectContent>
              </Select>
            </FormField>
            <FormField label="Greenhouse">
              <Select value={form.greenhouse_id} onValueChange={v => setForm(f => ({ ...f, greenhouse_id: v }))}>
                <SelectTrigger><SelectValue placeholder="All / N/A" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value={null}>All / N/A</SelectItem>
                  {greenhouses.map(g => <SelectItem key={g.id} value={g.id}>{g.code}</SelectItem>)}
                </SelectContent>
              </Select>
            </FormField>
          </div>
          <FormField label="Description">
            <Input value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Optional details" />
          </FormField>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setShowModal(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving || !form.title || !form.date}>
              {saving ? "Saving…" : editEvent ? "Save Changes" : "Add Event"}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}