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
Timestamp,
} from "firebase/firestore";
import { db, ensureAuth } from "@/lib/firebase";

const STATUS = {
Pending: "pending",
Completed: "completed",
Declined: "declined",
Scheduled: "scheduled",
};

const EMPTY_NEW_DRAFT = {
orderNumber: "",
year: "",
make: "",
model: "",
notes: "",
status: "Pending",
appointment: "",
appointmentAt: null, // Date
declineReason: "",
};

export default function Page() {
const [orders, setOrders] = useState([]);
const [selected, setSelected] = useState(null);

const [q, setQ] = useState("");
const [statusFilter, setStatusFilter] = useState("all"); // all | Pending | Completed | Declined | Scheduled
const [apptFilter, setApptFilter] = useState("all"); // all | with | none | today | tomorrow

const [mounted, setMounted] = useState(false);
const [ready, setReady] = useState(false);
const [errMsg, setErrMsg] = useState("");

// New Order modal
const [newOpen, setNewOpen] = useState(false);
const [newDraft, setNewDraft] = useState({ ...EMPTY_NEW_DRAFT });

useEffect(() => setMounted(true), []);

// Always auth BEFORE snapshot, so PC + phone share same Firebase + permissions work
useEffect(() => {
if (!mounted) return;

let unsub = () => {};

(async () => {
try {
setErrMsg("");
setReady(false);

await ensureAuth();

unsub = onSnapshot(
collection(db, "orders"),
(snap) => {
const data = snap.docs.map((d) => ({ id: d.id, ...d.data() }));

// Sort newest first (by createdAt seconds)
data.sort((a, b) => {
const aT = a.createdAt?.seconds || 0;
const bT = b.createdAt?.seconds || 0;
if (bT !== aT) return bT - aT;
return String(b.orderNumber || "").localeCompare(
String(a.orderNumber || "")
);
});

setOrders(data);
setReady(true);
},
(error) => {
console.error("Firestore onSnapshot error:", error);
setErrMsg(
"No pude cargar la base de datos. Revisa Firestore Rules / Auth / Variables de Firebase."
);
setReady(true);
}
);
} catch (e) {
console.error("Auth init error:", e);
setErrMsg(
"Error conectando a Firebase (Auth). Revisa tus variables NEXT_PUBLIC_FIREBASE_*."
);
setReady(true);
}
})();

return () => unsub();
}, [mounted]);

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

const toDateSafe = (val) => {
if (!val) return null;
if (val?.toDate) return val.toDate();
if (val instanceof Date) return val;
return null;
};

const isSameDay = (d1, d2) =>
d1.getFullYear() === d2.getFullYear() &&
d1.getMonth() === d2.getMonth() &&
d1.getDate() === d2.getDate();

const byAppt = (o) => {
if (apptFilter === "all") return true;
const has = !!o.appointment || !!o.appointmentAt;
if (apptFilter === "with") return has;
if (apptFilter === "none") return !has;

const at = toDateSafe(o.appointmentAt);

const now = new Date();
const tomorrow = new Date(now);
tomorrow.setDate(tomorrow.getDate() + 1);

if (apptFilter === "today") {
if (at) return isSameDay(at, now);
return String(o.appointment || "").toLowerCase().includes("today");
}

if (apptFilter === "tomorrow") {
if (at) return isSameDay(at, tomorrow);
return String(o.appointment || "").toLowerCase().includes("tomorrow");
}

return true;
};

return orders.filter((o) => bySearch(o) && byStatus(o) && byAppt(o));
}, [orders, q, statusFilter, apptFilter]);

if (!mounted) return null;

async function createOrder() {
await ensureAuth();

const orderNumber = String(newDraft.orderNumber || "").trim();
if (!orderNumber) {
alert("Order # is required");
return;
}

const payload = {
orderNumber,
year: String(newDraft.year || "").trim(),
make: String(newDraft.make || "").trim(),
model: String(newDraft.model || "").trim(),
notes: String(newDraft.notes || "").trim(),
status: newDraft.status || "Pending",
appointment: newDraft.appointment || "",
appointmentAt: newDraft.appointmentAt
? Timestamp.fromDate(newDraft.appointmentAt)
: null,
declineReason: String(newDraft.declineReason || "").trim(),
createdAt: serverTimestamp(),
};

await addDoc(collection(db, "orders"), payload);

// IMPORTANT: reset ALWAYS so next order is clean
setNewDraft({ ...EMPTY_NEW_DRAFT });
setNewOpen(false);
}

async function saveOrder(id, data) {
await ensureAuth();

const clean = {
orderNumber: String(data.orderNumber || "").trim(),
year: String(data.year || "").trim(),
make: String(data.make || "").trim(),
model: String(data.model || "").trim(),
status: data.status || "Pending",
notes: String(data.notes || "").trim(),
appointment: data.appointment || "",
appointmentAt: data.appointmentAt
? Timestamp.fromDate(data.appointmentAt)
: null,
declineReason: String(data.declineReason || "").trim(),
};

await updateDoc(doc(db, "orders", id), clean);
}

async function removeOrder(id) {
await ensureAuth();
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
<button
className="btn btnPrimary hideOnMobile"
onClick={() => setNewOpen(true)}
>
➕ New Order
</button>
</div>
</header>

{/* INFO / ERROR */}
{!ready && (
<div className="infoBanner">Connecting to Firebase…</div>
)}
{errMsg && (
<div className="errorBanner">{errMsg}</div>
)}

{/* QUICK FILTERS */}
<div className="filters">
<div className="filterGroup">
<span className="filterLabel">Status:</span>
<button
className={`pill ${statusFilter === "all" ? "active" : ""}`}
onClick={() => setStatusFilter("all")}
>
All
</button>
<button
className={`pill ${statusFilter === "Pending" ? "active" : ""}`}
onClick={() => setStatusFilter("Pending")}
>
Pending
</button>
<button
className={`pill ${statusFilter === "Scheduled" ? "active" : ""}`}
onClick={() => setStatusFilter("Scheduled")}
>
Scheduled
</button>
<button
className={`pill ${statusFilter === "Completed" ? "active" : ""}`}
onClick={() => setStatusFilter("Completed")}
>
Completed
</button>
<button
className={`pill ${statusFilter === "Declined" ? "active" : ""}`}
onClick={() => setStatusFilter("Declined")}
>
Declined
</button>
</div>

<div className="filterGroup">
<span className="filterLabel">Appointment:</span>
<button
className={`pill ${apptFilter === "all" ? "active" : ""}`}
onClick={() => setApptFilter("all")}
>
All
</button>
<button
className={`pill ${apptFilter === "with" ? "active" : ""}`}
onClick={() => setApptFilter("with")}
>
Appt
</button>
<button
className={`pill ${apptFilter === "none" ? "active" : ""}`}
onClick={() => setApptFilter("none")}
>
No Appt
</button>
<button
className={`pill ${apptFilter === "today" ? "active" : ""}`}
onClick={() => setApptFilter("today")}
>
Today
</button>
<button
className={`pill ${apptFilter === "tomorrow" ? "active" : ""}`}
onClick={() => setApptFilter("tomorrow")}
>
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
<span className={`badge ${STATUS[o.status] || "pending"}`}>
{o.status || "Pending"}
</span>
</div>

<div className="muted">Order #{o.orderNumber}</div>

<div className="cardInfo">
{o.appointment ? (
<div className="appt">📅 {o.appointment}</div>
) : (
<div className="appt mutedSmall">No appointment</div>
)}
{o.notes ? (
<div className="notes">📝 {o.notes}</div>
) : (
<div className="notes mutedSmall">No notes</div>
)}
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
onClose={() => {
setNewOpen(false);
setNewDraft({ ...EMPTY_NEW_DRAFT }); // reset also when closing
}}
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

function formatLabelFromDate(d) {
if (!d) return "";
const date = d.toLocaleDateString();
const time = d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
return `${date} ${time}`;
}

function onPickDateTime(v) {
if (!v) {
setDraft((p) => ({ ...p, appointment: "", appointmentAt: null }));
return;
}
const d = new Date(v);
setDraft((p) => ({
...p,
appointmentAt: d,
appointment: formatLabelFromDate(d),
status: p.status === "Pending" ? "Scheduled" : p.status,
}));
}

return (
<div className="modalOverlay" onClick={onClose}>
<div className="modal modalLarge" onClick={(e) => e.stopPropagation()}>
<div className="modalHeader">
<div>
<div className="modalTitle">➕ New Order</div>
<div className="modalSub">Enter full info</div>
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
<select
className="fieldInput"
value={draft.status}
onChange={(e) => setField("status", e.target.value)}
>
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
<input
className="fieldInput"
value={draft.year}
onChange={(e) => setField("year", e.target.value)}
placeholder="2018"
/>
</div>
<div>
<label className="fieldLabel">Make</label>
<input
className="fieldInput"
value={draft.make}
onChange={(e) => setField("make", e.target.value)}
placeholder="Honda"
/>
</div>
</div>

<div className="twoCol">
<div>
<label className="fieldLabel">Model</label>
<input
className="fieldInput"
value={draft.model}
onChange={(e) => setField("model", e.target.value)}
placeholder="Civic"
/>
</div>
<div>
<label className="fieldLabel">Appointment (Calendar)</label>
<input
className="fieldInput"
type="datetime-local"
value={
draft.appointmentAt
? toLocalInputValue(draft.appointmentAt)
: ""
}
onChange={(e) => onPickDateTime(e.target.value)}
/>
<div className="mutedSmall" style={{ marginTop: 6 }}>
{draft.appointment ? <>📅 {draft.appointment}</> : "No appointment set"}
</div>
<button
className="btn btnDanger"
style={{ marginTop: 10 }}
onClick={() => onPickDateTime("")}
>
Clear
</button>
</div>
</div>

<label className="fieldLabel">Notes</label>
<textarea
className="fieldInput"
style={{ minHeight: 90 }}
value={draft.notes}
onChange={(e) => setField("notes", e.target.value)}
placeholder="Notes..."
/>

<label className="fieldLabel">Decline Reason (only if Declined)</label>
<input
className="fieldInput"
value={draft.declineReason || ""}
onChange={(e) => setField("declineReason", e.target.value)}
placeholder="Reason..."
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
const [draft, setDraft] = useState({ ...order });

useEffect(() => {
// Normalize appointmentAt from Firestore Timestamp to Date for editing
const appt =
order.appointmentAt?.toDate ? order.appointmentAt.toDate() : null;
setDraft({ ...order, appointmentAt: appt });
}, [order]);

function setField(k, v) {
setDraft((p) => ({ ...p, [k]: v }));
}

function formatLabelFromDate(d) {
if (!d) return "";
const date = d.toLocaleDateString();
const time = d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
return `${date} ${time}`;
}

function onPickDateTime(v) {
if (!v) {
setDraft((p) => ({ ...p, appointment: "", appointmentAt: null }));
return;
}
const d = new Date(v);
setDraft((p) => ({
...p,
appointmentAt: d,
appointment: formatLabelFromDate(d),
status: p.status === "Pending" ? "Scheduled" : p.status,
}));
}

async function confirmDelete() {
const ok = confirm(
`Delete Order #${order.orderNumber}? This cannot be undone.`
);
if (!ok) return;
await onDelete();
onClose();
}

return (
<div className="modalOverlay" onClick={onClose}>
<div className="modal modalLarge" onClick={(e) => e.stopPropagation()}>
<div className="modalHeader">
<div>
<div className="modalTitle">
Order #{order.orderNumber} • {draft.year} {draft.make} {draft.model}
</div>
<div className="modalSub">Update, then save</div>
</div>
<button className="iconBtn" onClick={onClose}>
✕
</button>
</div>

<div className="modalBody">
<div className="sectionTitle">Status</div>
<div className="actionRow">
<button
className="btn btnPrimary"
onClick={() => setField("status", "Pending")}
>
⏳ Pending
</button>
<button
className="btn btnOutline"
onClick={() => setField("status", "Scheduled")}
>
📆 Scheduled
</button>
<button
className="btn btnOutline"
onClick={() => setField("status", "Completed")}
>
✅ Completed
</button>
<button
className="btn btnDanger"
onClick={() => setField("status", "Declined")}
>
❌ Declined
</button>
</div>

<div className="sectionTitle">Appointment (Calendar)</div>
<div className="twoCol">
<div>
<input
className="fieldInput"
type="datetime-local"
value={draft.appointmentAt ? toLocalInputValue(draft.appointmentAt) : ""}
onChange={(e) => onPickDateTime(e.target.value)}
/>
<div className="mutedSmall" style={{ marginTop: 6 }}>
{draft.appointment ? <>📅 {draft.appointment}</> : "No appointment set"}
</div>
<button
className="btn btnDanger"
style={{ marginTop: 10 }}
onClick={() => onPickDateTime("")}
>
Clear
</button>
</div>

<div>
<label className="fieldLabel">Decline Reason (if Declined)</label>
<input
className="fieldInput"
value={draft.declineReason || ""}
onChange={(e) => setField("declineReason", e.target.value)}
placeholder="Reason..."
/>
</div>
</div>

<div className="sectionTitle">Edit</div>
<div className="twoCol">
<div>
<label className="fieldLabel">Year</label>
<input
className="fieldInput"
value={draft.year || ""}
onChange={(e) => setField("year", e.target.value)}
/>
</div>
<div>
<label className="fieldLabel">Make</label>
<input
className="fieldInput"
value={draft.make || ""}
onChange={(e) => setField("make", e.target.value)}
/>
</div>
</div>

<div className="twoCol">
<div>
<label className="fieldLabel">Model</label>
<input
className="fieldInput"
value={draft.model || ""}
onChange={(e) => setField("model", e.target.value)}
/>
</div>
<div>
<label className="fieldLabel">Order #</label>
<input
className="fieldInput"
value={draft.orderNumber || ""}
onChange={(e) => setField("orderNumber", e.target.value)}
/>
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
orderNumber: draft.orderNumber,
year: draft.year,
make: draft.make,
model: draft.model,
status: draft.status,
notes: draft.notes,
appointment: draft.appointment || "",
appointmentAt: draft.appointmentAt || null,
declineReason: draft.declineReason || "",
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

/* ================= helpers ================= */

// Convert Date -> "YYYY-MM-DDTHH:mm" for datetime-local input
function toLocalInputValue(date) {
const d = new Date(date);
const pad = (n) => String(n).padStart(2, "0");
const yyyy = d.getFullYear();
const mm = pad(d.getMonth() + 1);
const dd = pad(d.getDate());
const hh = pad(d.getHours());
const mi = pad(d.getMinutes());
return `${yyyy}-${mm}-${dd}T${hh}:${mi}`;
}
