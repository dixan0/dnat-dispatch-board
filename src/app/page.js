"use client";

import { useEffect, useMemo, useState } from "react";
import {
collection,
addDoc,
deleteDoc,
doc,
onSnapshot,
updateDoc,
serverTimestamp,
} from "firebase/firestore";
import { db } from "../lib/firebase";

const STATUS = {
Pending: "pending",
Scheduled: "scheduled",
Completed: "completed",
Declined: "declined",
};

/* ================= HELPERS (calendar + formatting) ================= */

function toDateMaybe(v) {
if (!v) return null;
if (typeof v === "object" && typeof v.toDate === "function") return v.toDate(); // Firestore Timestamp
if (v instanceof Date) return v;
const d = new Date(v);
return isNaN(d.getTime()) ? null : d;
}

function toLocalInputValue(date) {
if (!date) return "";
const pad = (n) => String(n).padStart(2, "0");
const yyyy = date.getFullYear();
const mm = pad(date.getMonth() + 1);
const dd = pad(date.getDate());
const hh = pad(date.getHours());
const mi = pad(date.getMinutes());
return `${yyyy}-${mm}-${dd}T${hh}:${mi}`;
}

function formatUS(date) {
// 12-31-2025 1:30 PM
if (!date) return "";
const mm = String(date.getMonth() + 1).padStart(2, "0");
const dd = String(date.getDate()).padStart(2, "0");
const yyyy = date.getFullYear();

let h = date.getHours();
const m = String(date.getMinutes()).padStart(2, "0");
const ampm = h >= 12 ? "PM" : "AM";
h = h % 12;
if (h === 0) h = 12;

return `${mm}-${dd}-${yyyy} ${h}:${m} ${ampm}`;
}

function applyCalendarValue(setDraft, value) {
const d = value ? new Date(value) : null;
if (!d || isNaN(d.getTime())) {
setDraft((p) => ({ ...p, appointmentAt: null, appointment: "" }));
return;
}
setDraft((p) => ({
...p,
appointmentAt: d,
appointment: formatUS(d),
}));
}

/* ================= PAGE ================= */

export default function Page() {
const [orders, setOrders] = useState([]);
const [selected, setSelected] = useState(null);

const [q, setQ] = useState("");
const [statusFilter, setStatusFilter] = useState("all"); // all | Pending | Scheduled | Completed | Declined
const [apptFilter, setApptFilter] = useState("all"); // all | with | none | today | tomorrow

const [mounted, setMounted] = useState(false);

// New Order modal
const [newOpen, setNewOpen] = useState(false);
const [newDraft, setNewDraft] = useState({
orderNumber: "",
year: "",
make: "",
model: "",
notes: "",
status: "Pending",
appointment: "",
appointmentAt: null,
});

useEffect(() => setMounted(true), []);

useEffect(() => {
const unsub = onSnapshot(collection(db, "orders"), (snap) => {
const data = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
// Sort: newest first (fallback by orderNumber)
data.sort((a, b) => {
const aT = a.createdAt?.seconds || 0;
const bT = b.createdAt?.seconds || 0;
if (bT !== aT) return bT - aT;
return String(b.orderNumber || "").localeCompare(String(a.orderNumber || ""));
});
setOrders(data);
});
return () => unsub();
}, []);

const filtered = useMemo(() => {
const s = q.trim().toLowerCase();

const bySearch = (o) => {
if (!s) return true;
return (
String(o.orderNumber || "").toLowerCase().includes(s) ||
String(o.make || "").toLowerCase().includes(s) ||
String(o.model || "").toLowerCase().includes(s) ||
String(o.year || "").toLowerCase().includes(s)
);
};

const byStatus = (o) => {
if (statusFilter === "all") return true;
return String(o.status || "") === statusFilter;
};

const byAppt = (o) => {
if (apptFilter === "all") return true;
const has = !!o.appointment;
if (apptFilter === "with") return has;
if (apptFilter === "none") return !has;

const at = toDateMaybe(o.appointmentAt);

const isSameDay = (d1, d2) =>
d1.getFullYear() === d2.getFullYear() &&
d1.getMonth() === d2.getMonth() &&
d1.getDate() === d2.getDate();

const now = new Date();
const tomorrow = new Date(now);
tomorrow.setDate(tomorrow.getDate() + 1);

if (apptFilter === "today") {
if (!at) return String(o.appointment || "").toLowerCase().includes("today");
return isSameDay(at, now);
}

if (apptFilter === "tomorrow") {
if (!at) return String(o.appointment || "").toLowerCase().includes("tomorrow");
return isSameDay(at, tomorrow);
}

return true;
};

return orders.filter((o) => bySearch(o) && byStatus(o) && byAppt(o));
}, [orders, q, statusFilter, apptFilter]);

if (!mounted) return null;

async function createOrder() {
const orderNumber = String(newDraft.orderNumber || "").trim();
if (!orderNumber) {
alert("Order # is required");
return;
}

await addDoc(collection(db, "orders"), {
orderNumber: orderNumber,
year: String(newDraft.year || "").trim(),
make: String(newDraft.make || "").trim(),
model: String(newDraft.model || "").trim(),
notes: String(newDraft.notes || "").trim(),
status: newDraft.status || "Pending",
appointment: newDraft.appointment || "",
appointmentAt: newDraft.appointmentAt || null,
createdAt: serverTimestamp(),
});

// reset
setNewDraft({
orderNumber: "",
year: "",
make: "",
model: "",
notes: "",
status: "Pending",
appointment: "",
appointmentAt: null,
});
setNewOpen(false);
}

async function saveOrder(id, data) {
const { id: _, ...clean } = data; // never write id into doc
await updateDoc(doc(db, "orders", id), clean);
}

async function removeOrder(id) {
await deleteDoc(doc(db, "orders", id));
}

return (
<div className="page">
<header className="topBar">
<div className="title">DMAT Dispatch Board</div>

<div className="topRight">
<input
className="search"
placeholder="Search order, year, make, model"
value={q}
onChange={(e) => setQ(e.target.value)}
/>
<button className="btn btnPrimary hideOnMobile" onClick={() => setNewOpen(true)}>
➕ New Order
</button>
</div>
</header>

{/* QUICK FILTERS */}
<div className="filters">
<div className="filterGroup">
<span className="filterLabel">Status:</span>
<button className={`pill ${statusFilter === "all" ? "active" : ""}`} onClick={() => setStatusFilter("all")}>
All
</button>
<button className={`pill ${statusFilter === "Pending" ? "active" : ""}`} onClick={() => setStatusFilter("Pending")}>
Pending
</button>
<button className={`pill ${statusFilter === "Scheduled" ? "active" : ""}`} onClick={() => setStatusFilter("Scheduled")}>
Scheduled
</button>
<button className={`pill ${statusFilter === "Completed" ? "active" : ""}`} onClick={() => setStatusFilter("Completed")}>
Completed
</button>
<button className={`pill ${statusFilter === "Declined" ? "active" : ""}`} onClick={() => setStatusFilter("Declined")}>
Declined
</button>
</div>

<div className="filterGroup">
<span className="filterLabel">Appointment:</span>
<button className={`pill ${apptFilter === "all" ? "active" : ""}`} onClick={() => setApptFilter("all")}>
All
</button>
<button className={`pill ${apptFilter === "with" ? "active" : ""}`} onClick={() => setApptFilter("with")}>
Appt
</button>
<button className={`pill ${apptFilter === "none" ? "active" : ""}`} onClick={() => setApptFilter("none")}>
No Appt
</button>
<button className={`pill ${apptFilter === "today" ? "active" : ""}`} onClick={() => setApptFilter("today")}>
Today
</button>
<button className={`pill ${apptFilter === "tomorrow" ? "active" : ""}`} onClick={() => setApptFilter("tomorrow")}>
Tomorrow
</button>
</div>
</div>

{/* GRID */}
<div className="grid">
{filtered.map((o) => (
<div key={o.id} className="card" onClick={() => setSelected(o)}>
<div className="cardTop">
<div className="cardTitle">
{o.year ? `${o.year} ` : ""}
{o.make || "Make"} {o.model || "Model"}
</div>
<span className={`badge ${STATUS[o.status] || "pending"}`}>{o.status || "Pending"}</span>
</div>

<div className="muted">Order #{o.orderNumber}</div>

<div className="cardInfo">
{o.appointment ? (
<div className="appt">📅 {o.appointment}</div>
) : (
<div className="appt mutedSmall">No appointment</div>
)}
{o.notes ? <div className="notes">📝 {o.notes}</div> : <div className="notes mutedSmall">No notes</div>}
</div>

<div className="tapHint">Tap to open</div>
</div>
))}
</div>

{/* MOBILE FLOAT BUTTON */}
<button className="fab" onClick={() => setNewOpen(true)}>
➕
</button>

{/* NEW ORDER MODAL */}
{newOpen && (
<NewOrderModal
draft={newDraft}
setDraft={setNewDraft}
onClose={() => setNewOpen(false)}
onCreate={createOrder}
/>
)}

{/* ORDER MODAL */}
{selected && (
<OrderModal
order={selected}
onClose={() => setSelected(null)}
onSave={(data) => saveOrder(selected.id, data)}
onDelete={() => removeOrder(selected.id)}
/>
)}
</div>
);
}

/* ================= NEW ORDER MODAL ================= */

function NewOrderModal({ draft, setDraft, onClose, onCreate }) {
function setField(k, v) {
setDraft((p) => ({ ...p, [k]: v }));
}

return (
<div className="modalOverlay" onClick={onClose}>
<div className="modal modalLarge" onClick={(e) => e.stopPropagation()}>
<div className="modalHeader">
<div>
<div className="modalTitle">➕ New Order</div>
<div className="modalSub">Enter full info (professional)</div>
</div>
<button className="iconBtn" onClick={onClose}>
✕
</button>
</div>

<div className="modalBody">
<div className="twoCol">
<div>
<label className="fieldLabel">Order # *</label>
<input
className="fieldInput"
value={draft.orderNumber}
onChange={(e) => setField("orderNumber", e.target.value)}
placeholder="1001"
/>
</div>
<div>
<label className="fieldLabel">Status</label>
<select className="fieldInput" value={draft.status} onChange={(e) => setField("status", e.target.value)}>
<option>Pending</option>
<option>Scheduled</option>
<option>Completed</option>
<option>Declined</option>
</select>
</div>
</div>

<div className="twoCol">
<div>
<label className="fieldLabel">Year</label>
<input className="fieldInput" value={draft.year} onChange={(e) => setField("year", e.target.value)} placeholder="2018" />
</div>
<div>
<label className="fieldLabel">Make</label>
<input className="fieldInput" value={draft.make} onChange={(e) => setField("make", e.target.value)} placeholder="Honda" />
</div>
</div>

<div className="twoCol">
<div>
<label className="fieldLabel">Model</label>
<input className="fieldInput" value={draft.model} onChange={(e) => setField("model", e.target.value)} placeholder="Civic" />
</div>

<div>
<label className="fieldLabel">Appointment (Calendar)</label>
<input
type="datetime-local"
className="fieldInput"
value={toLocalInputValue(toDateMaybe(draft.appointmentAt))}
onChange={(e) => applyCalendarValue(setDraft, e.target.value)}
/>
</div>
</div>

{draft.appointment ? (
<div className="infoBox">📅 Appointment: <b>{draft.appointment}</b></div>
) : (
<div className="infoBox mutedSmall">No appointment set</div>
)}

<div className="actionRow">
<button
className="btn btnDanger"
onClick={() => setDraft((p) => ({ ...p, appointment: "", appointmentAt: null }))}
>
Clear Appointment
</button>
</div>

<label className="fieldLabel">Notes</label>
<textarea
className="fieldInput"
style={{ minHeight: 90 }}
value={draft.notes}
onChange={(e) => setField("notes", e.target.value)}
placeholder="Notes..."
/>

<div className="footerRow">
<button className="btn btnPrimary" onClick={onCreate}>
Create Order
</button>
<button className="btn btnOutline" onClick={onClose}>
Cancel
</button>
</div>
</div>
</div>
</div>
);
}

/* ================= ORDER MODAL ================= */

function OrderModal({ order, onClose, onSave, onDelete }) {
const [draft, setDraft] = useState({
...order,
year: order?.year ?? "",
make: order?.make ?? "",
model: order?.model ?? "",
orderNumber: order?.orderNumber ?? "",
notes: order?.notes ?? "",
status: order?.status ?? "Pending",
appointment: order?.appointment ?? "",
appointmentAt: order?.appointmentAt ?? null,
declineReason: order?.declineReason ?? "",
});

useEffect(() => {
setDraft({
...order,
year: order?.year ?? "",
make: order?.make ?? "",
model: order?.model ?? "",
orderNumber: order?.orderNumber ?? "",
notes: order?.notes ?? "",
status: order?.status ?? "Pending",
appointment: order?.appointment ?? "",
appointmentAt: order?.appointmentAt ?? null,
declineReason: order?.declineReason ?? "",
});
}, [order]);

function setField(k, v) {
setDraft((p) => ({ ...p, [k]: v }));
}

async function confirmDelete() {
const ok = confirm(`Delete Order #${order.orderNumber}? This cannot be undone.`);
if (!ok) return;
await onDelete();
}

return (
<div className="modalOverlay" onClick={onClose}>
<div className="modal modalLarge" onClick={(e) => e.stopPropagation()}>
<div className="modalHeader">
<div>
<div className="modalTitle">
Order #{order.orderNumber} • {draft.year} {draft.make} {draft.model}
</div>
<div className="modalSub">Tap buttons to update, then save</div>
</div>
<button className="iconBtn" onClick={onClose}>
✕
</button>
</div>

<div className="modalBody">
<div className="sectionTitle">Status</div>
<div className="actionRow">
<button className="btn btnPrimary" onClick={() => setField("status", "Pending")}>
⏳ Pending
</button>
<button className="btn btnOutline" onClick={() => setField("status", "Scheduled")}>
📅 Scheduled
</button>
<button className="btn btnOutline" onClick={() => setField("status", "Completed")}>
✅ Completed
</button>
<button className="btn btnDanger" onClick={() => setField("status", "Declined")}>
❌ Declined
</button>
</div>

<div className="sectionTitle">Appointment (Calendar)</div>

<div className="twoCol">
<div>
<label className="fieldLabel">Pick date & time</label>
<input
type="datetime-local"
className="fieldInput"
value={toLocalInputValue(toDateMaybe(draft.appointmentAt))}
onChange={(e) => applyCalendarValue(setDraft, e.target.value)}
/>
</div>

<div>
<label className="fieldLabel">&nbsp;</label>
<button
className="btn btnDanger"
onClick={() => setDraft((p) => ({ ...p, appointment: "", appointmentAt: null }))}
>
Clear
</button>
</div>
</div>

{draft.appointment ? (
<div className="infoBox">
📅 Appointment: <b>{draft.appointment}</b>
</div>
) : (
<div className="infoBox mutedSmall">No appointment set</div>
)}

<div className="sectionTitle">Edit</div>
<div className="twoCol">
<div>
<label className="fieldLabel">Year</label>
<input className="fieldInput" value={draft.year || ""} onChange={(e) => setField("year", e.target.value)} />
</div>
<div>
<label className="fieldLabel">Make</label>
<input className="fieldInput" value={draft.make || ""} onChange={(e) => setField("make", e.target.value)} />
</div>
</div>

<div className="twoCol">
<div>
<label className="fieldLabel">Model</label>
<input className="fieldInput" value={draft.model || ""} onChange={(e) => setField("model", e.target.value)} />
</div>
<div>
<label className="fieldLabel">Order #</label>
<input className="fieldInput" value={draft.orderNumber || ""} onChange={(e) => setField("orderNumber", e.target.value)} />
</div>
</div>

<label className="fieldLabel">Notes</label>
<textarea
className="fieldInput"
style={{ minHeight: 90 }}
value={draft.notes || ""}
onChange={(e) => setField("notes", e.target.value)}
/>

<div className="footerRow">
<button
className="btn btnPrimary"
onClick={async () => {
await onSave({
orderNumber: String(draft.orderNumber || "").trim(),
year: String(draft.year || "").trim(),
make: String(draft.make || "").trim(),
model: String(draft.model || "").trim(),
status: draft.status || "Pending",
notes: String(draft.notes || "").trim(),
appointment: draft.appointment || "",
appointmentAt: draft.appointmentAt || null,
declineReason: String(draft.declineReason || "").trim(),
});
onClose();
}}
>
💾 Save Changes
</button>

<button className="btn btnDanger" onClick={confirmDelete}>
🗑 Delete Order
</button>
</div>
</div>
</div>
</div>
);
}
