"use client";

import { useEffect, useMemo, useState } from "react";
import {
addDoc,
collection,
doc,
onSnapshot,
orderBy,
query,
serverTimestamp,
updateDoc,
} from "firebase/firestore";
import { db } from "../lib/firebase";

// Helpers UI
function Badge({ status }) {
const s = (status || "pending").toLowerCase();
const map = {
pending: { label: "Pending", cls: "bPending" },
scheduled: { label: "Scheduled", cls: "bScheduled" },
completed: { label: "Completed", cls: "bCompleted" },
declined: { label: "Declined", cls: "bDeclined" },
};
const item = map[s] || { label: status || "Pending", cls: "bPending" };
return <span className={`badge ${item.cls}`}>{item.label}</span>;
}

function Icon({ name }) {
const icons = {
plus: "＋",
lock: "🔒",
edit: "✎",
check: "✓",
x: "✕",
warn: "⚠",
};
return <span className="icon">{icons[name] || "•"}</span>;
}

function Modal({ open, title, children, onClose }) {
if (!open) return null;
return (
<div className="modalBackdrop" onMouseDown={onClose}>
<div className="modal" onMouseDown={(e) => e.stopPropagation()}>
<div className="modalHeader">
<div className="modalTitle">{title}</div>
<button className="btn ghost" onClick={onClose} aria-label="Close">
<Icon name="x" /> Close
</button>
</div>
<div className="modalBody">{children}</div>
</div>
</div>
);
}

function NewOrderForm({ onCreate, onClose }) {
const [orderNumber, setOrderNumber] = useState("");
const [year, setYear] = useState("");
const [make, setMake] = useState("");
const [model, setModel] = useState("");

function clean(s) {
return (s || "").trim();
}

const canSave =
clean(orderNumber).length > 0 &&
String(clean(year)).length > 0 &&
clean(make).length > 0 &&
clean(model).length > 0;

return (
<div className="form">
<div className="grid2">
<div className="field">
<label>Order #</label>
<input
value={orderNumber}
onChange={(e) => setOrderNumber(e.target.value)}
placeholder="1001"
inputMode="numeric"
/>
</div>

<div className="field">
<label>Year</label>
<input
value={year}
onChange={(e) => setYear(e.target.value)}
placeholder="2019"
inputMode="numeric"
/>
</div>

<div className="field">
<label>Make</label>
<input
value={make}
onChange={(e) => setMake(e.target.value)}
placeholder="Toyota"
/>
</div>

<div className="field">
<label>Model</label>
<input
value={model}
onChange={(e) => setModel(e.target.value)}
placeholder="Camry"
/>
</div>
</div>

<div className="hint">
Se guarda como <b>status: pending</b> y <b>appointment: none</b>.
</div>

<div className="actionsRow">
<button className="btn ghost" onClick={onClose}>
Cancel
</button>
<button
className="btn primary"
disabled={!canSave}
onClick={() =>
onCreate({
orderNumber: clean(orderNumber),
year: Number(clean(year)),
make: clean(make),
model: clean(model),
})
}
>
<Icon name="check" /> Create Order
</button>
</div>
</div>
);
}

export default function DispatchBoard() {
const [orders, setOrders] = useState([]);
const [err, setErr] = useState("");

// Modals
const [openNew, setOpenNew] = useState(false);
const [editApptOpen, setEditApptOpen] = useState(false);
const [editApptValue, setEditApptValue] = useState("");
const [editApptOrderId, setEditApptOrderId] = useState(null);

const [declineOpen, setDeclineOpen] = useState(false);
const [declineReason, setDeclineReason] = useState("");
const [declineOrderId, setDeclineOrderId] = useState(null);

// Filters
const [search, setSearch] = useState("");
const [statusFilter, setStatusFilter] = useState("all");

const q = useMemo(() => {
// Nota: orderBy requiere que createdAt exista (tú ya lo estás guardando).
return query(collection(db, "orders"), orderBy("createdAt", "desc"));
}, []);

useEffect(() => {
const unsub = onSnapshot(
q,
(snap) => {
const list = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
setOrders(list);
setErr("");
},
(e) => setErr(String(e?.message || e))
);
return () => unsub();
}, [q]);

async function setStatus(orderId, status) {
await updateDoc(doc(db, "orders", orderId), { status });
}

async function setAppointment(orderId, value) {
await updateDoc(doc(db, "orders", orderId), { appointment: value });
}

async function setDecline(orderId, reason) {
await updateDoc(doc(db, "orders", orderId), {
status: "declined",
declineReason: reason,
});
}

async function createOrder(payload) {
try {
await addDoc(collection(db, "orders"), {
orderNumber: payload.orderNumber,
year: payload.year,
make: payload.make,
model: payload.model,
status: "pending",
appointment: "none",
createdAt: serverTimestamp(),
});
setOpenNew(false);
} catch (e) {
setErr(String(e?.message || e));
}
}

function openEditAppointment(order) {
setEditApptOrderId(order.id);
setEditApptValue(order.appointment && order.appointment !== "" ? order.appointment : "none");
setEditApptOpen(true);
}

function openDecline(order) {
setDeclineOrderId(order.id);
setDeclineReason("");
setDeclineOpen(true);
}

const filtered = useMemo(() => {
const s = (search || "").trim().toLowerCase();
return orders.filter((o) => {
const okStatus = statusFilter === "all" ? true : (o.status || "pending") === statusFilter;
const haystack =
`${o.orderNumber || ""} ${o.year || ""} ${o.make || ""} ${o.model || ""}`.toLowerCase();
const okSearch = s.length === 0 ? true : haystack.includes(s);
return okStatus && okSearch;
});
}, [orders, search, statusFilter]);

function doLock() {
// Si tu PinGate usa otra llave, cámbiala aquí.
// Esta es una llave común que usamos en ejemplos:
localStorage.removeItem("dmat_pin_ok");
window.location.reload();
}

return (
<div className="page">
<div className="topbar">
<div className="brand">
<div className="title">DMAT Dispatch Board</div>
<div className="sub">
Realtime orders: <b>{filtered.length}</b>
</div>
</div>

<div className="topActions">
<button className="btn primary" onClick={() => setOpenNew(true)}>
<Icon name="plus" /> New Order
</button>
<button className="btn ghost" onClick={doLock} title="Lock">
<Icon name="lock" /> Lock
</button>
</div>
</div>

{err ? (
<div className="alert">
<Icon name="warn" /> <b>Error:</b> {err}
</div>
) : null}

<div className="controls">
<div className="searchBox">
<input
value={search}
onChange={(e) => setSearch(e.target.value)}
placeholder="Search: order#, year, make, model..."
/>
</div>

<div className="seg">
<button
className={`segBtn ${statusFilter === "all" ? "active" : ""}`}
onClick={() => setStatusFilter("all")}
>
All
</button>
<button
className={`segBtn ${statusFilter === "pending" ? "active" : ""}`}
onClick={() => setStatusFilter("pending")}
>
Pending
</button>
<button
className={`segBtn ${statusFilter === "scheduled" ? "active" : ""}`}
onClick={() => setStatusFilter("scheduled")}
>
Scheduled
</button>
<button
className={`segBtn ${statusFilter === "completed" ? "active" : ""}`}
onClick={() => setStatusFilter("completed")}
>
Completed
</button>
<button
className={`segBtn ${statusFilter === "declined" ? "active" : ""}`}
onClick={() => setStatusFilter("declined")}
>
Declined
</button>
</div>
</div>

<div className="grid">
{filtered.map((o) => {
const status = (o.status || "pending").toLowerCase();
const appt = o.appointment || "none";

return (
<div className="card" key={o.id}>
<div className="cardHead">
<div className="left">
<div className="orderLine">
<span className="muted">Order</span>{" "}
<span className="orderNum">#{o.orderNumber || "-"}</span>
</div>
<div className="vehicle">
{o.year || ""} {o.make || ""} {o.model || ""}
</div>
</div>
<div className="right">
<Badge status={status} />
</div>
</div>

<div className="meta">
<div className="metaRow">
<span className="metaKey">Appointment</span>
<span className="metaVal">{appt}</span>
</div>

{status === "declined" && o.declineReason ? (
<div className="metaRow">
<span className="metaKey">Reason</span>
<span className="metaVal">{o.declineReason}</span>
</div>
) : null}
</div>

<div className="btnGrid">
<button
className={`btn mini ${status === "pending" ? "miniActive" : ""}`}
onClick={() => setStatus(o.id, "pending")}
>
Pending
</button>
<button
className={`btn mini ${status === "scheduled" ? "miniActive" : ""}`}
onClick={() => setStatus(o.id, "scheduled")}
>
Scheduled
</button>
<button
className={`btn mini ${status === "completed" ? "miniActive" : ""}`}
onClick={() => setStatus(o.id, "completed")}
>
Completed
</button>
<button className="btn mini danger" onClick={() => openDecline(o)}>
Decline + reason
</button>

<button className="btn mini ghost2" onClick={() => openEditAppointment(o)}>
<Icon name="edit" /> Edit appointment
</button>
</div>
</div>
);
})}

{filtered.length === 0 ? (
<div className="empty">
No orders yet. Tap <b>New Order</b> to create one.
</div>
) : null}
</div>

{/* MODAL: New Order */}
<Modal open={openNew} title="Create New Order" onClose={() => setOpenNew(false)}>
<NewOrderForm onCreate={createOrder} onClose={() => setOpenNew(false)} />
</Modal>

{/* MODAL: Edit appointment */}
<Modal
open={editApptOpen}
title="Edit Appointment"
onClose={() => setEditApptOpen(false)}
>
<div className="form">
<div className="field">
<label>Appointment</label>
<input
value={editApptValue}
onChange={(e) => setEditApptValue(e.target.value)}
placeholder='Ej: "12/26 3:30pm" o "none"'
/>
<div className="hint">
Puedes poner <b>none</b> si no tiene cita todavía.
</div>
</div>

<div className="actionsRow">
<button className="btn ghost" onClick={() => setEditApptOpen(false)}>
Cancel
</button>
<button
className="btn primary"
onClick={async () => {
try {
if (!editApptOrderId) return;
await setAppointment(editApptOrderId, (editApptValue || "none").trim());
setEditApptOpen(false);
} catch (e) {
setErr(String(e?.message || e));
}
}}
>
<Icon name="check" /> Save
</button>
</div>
</div>
</Modal>

{/* MODAL: Decline reason */}
<Modal open={declineOpen} title="Decline Order" onClose={() => setDeclineOpen(false)}>
<div className="form">
<div className="field">
<label>Reason</label>
<textarea
rows={3}
value={declineReason}
onChange={(e) => setDeclineReason(e.target.value)}
placeholder="Ej: no disponible / no contestó / fuera de área..."
/>
</div>

<div className="actionsRow">
<button className="btn ghost" onClick={() => setDeclineOpen(false)}>
Cancel
</button>
<button
className="btn danger"
disabled={(declineReason || "").trim().length === 0}
onClick={async () => {
try {
if (!declineOrderId) return;
await setDecline(declineOrderId, declineReason.trim());
setDeclineOpen(false);
} catch (e) {
setErr(String(e?.message || e));
}
}}
>
<Icon name="warn" /> Decline
</button>
</div>
</div>
</Modal>

<style jsx>{`
:global(body) {
background: #0b1220;
color: #e8eefc;
}

.page {
min-height: 100vh;
padding: 14px;
max-width: 1100px;
margin: 0 auto;
font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Arial;
}

.topbar {
display: flex;
align-items: flex-start;
justify-content: space-between;
gap: 12px;
padding: 14px;
border: 1px solid rgba(255, 255, 255, 0.08);
background: rgba(255, 255, 255, 0.04);
border-radius: 14px;
backdrop-filter: blur(8px);
}

.brand .title {
font-size: 18px;
font-weight: 800;
letter-spacing: 0.2px;
}
.brand .sub {
margin-top: 4px;
opacity: 0.85;
font-size: 13px;
}

.topActions {
display: flex;
gap: 10px;
flex-wrap: wrap;
justify-content: flex-end;
}

.controls {
margin-top: 12px;
display: flex;
gap: 10px;
flex-direction: column;
}

.searchBox input {
width: 100%;
padding: 12px 12px;
border-radius: 12px;
background: rgba(255, 255, 255, 0.06);
border: 1px solid rgba(255, 255, 255, 0.10);
color: #e8eefc;
outline: none;
}

.seg {
display: grid;
grid-template-columns: repeat(5, 1fr);
gap: 8px;
}
.segBtn {
padding: 10px 10px;
border-radius: 12px;
background: rgba(255, 255, 255, 0.04);
border: 1px solid rgba(255, 255, 255, 0.10);
color: #e8eefc;
font-weight: 700;
font-size: 12px;
cursor: pointer;
}
.segBtn.active {
background: rgba(110, 168, 255, 0.18);
border-color: rgba(110, 168, 255, 0.45);
}

.alert {
margin-top: 12px;
padding: 12px;
border-radius: 12px;
background: rgba(255, 90, 90, 0.12);
border: 1px solid rgba(255, 90, 90, 0.35);
color: #ffd1d1;
}

.grid {
margin-top: 12px;
display: grid;
grid-template-columns: 1fr;
gap: 12px;
}

.card {
border-radius: 16px;
border: 1px solid rgba(255, 255, 255, 0.08);
background: rgba(255, 255, 255, 0.04);
padding: 14px;
box-shadow: 0 10px 24px rgba(0, 0, 0, 0.25);
}

.cardHead {
display: flex;
justify-content: space-between;
gap: 10px;
align-items: flex-start;
}

.orderLine {
font-size: 13px;
opacity: 0.9;
}
.muted {
opacity: 0.7;
}
.orderNum {
font-weight: 900;
}
.vehicle {
margin-top: 2px;
font-size: 15px;
font-weight: 800;
}

.meta {
margin-top: 10px;
display: grid;
gap: 6px;
padding: 10px;
border-radius: 12px;
background: rgba(0, 0, 0, 0.18);
border: 1px solid rgba(255, 255, 255, 0.06);
}
.metaRow {
display: flex;
justify-content: space-between;
gap: 10px;
font-size: 13px;
}
.metaKey {
opacity: 0.75;
}
.metaVal {
font-weight: 800;
text-align: right;
word-break: break-word;
}

.btnGrid {
margin-top: 10px;
display: grid;
grid-template-columns: 1fr 1fr;
gap: 8px;
}

.btn {
border-radius: 12px;
border: 1px solid rgba(255, 255, 255, 0.12);
background: rgba(255, 255, 255, 0.06);
color: #e8eefc;
padding: 11px 12px;
font-weight: 800;
cursor: pointer;
transition: 0.15s;
user-select: none;
}
.btn:hover {
transform: translateY(-1px);
border-color: rgba(255, 255, 255, 0.22);
}
.btn:disabled {
opacity: 0.45;
cursor: not-allowed;
transform: none;
}

.btn.primary {
background: rgba(110, 168, 255, 0.18);
border-color: rgba(110, 168, 255, 0.45);
}

.btn.danger {
background: rgba(255, 90, 90, 0.12);
border-color: rgba(255, 90, 90, 0.45);
}

.btn.ghost {
background: transparent;
}
.btn.ghost2 {
grid-column: 1 / -1;
background: rgba(255, 255, 255, 0.03);
}

.btn.mini {
padding: 10px 10px;
font-size: 13px;
}
.miniActive {
background: rgba(140, 255, 195, 0.10);
border-color: rgba(140, 255, 195, 0.35);
}

.badge {
font-size: 12px;
font-weight: 900;
padding: 8px 10px;
border-radius: 999px;
border: 1px solid rgba(255, 255, 255, 0.14);
background: rgba(255, 255, 255, 0.05);
display: inline-flex;
align-items: center;
gap: 6px;
}
.bPending {
background: rgba(255, 215, 90, 0.12);
border-color: rgba(255, 215, 90, 0.35);
}
.bScheduled {
background: rgba(110, 168, 255, 0.15);
border-color: rgba(110, 168, 255, 0.38);
}
.bCompleted {
background: rgba(140, 255, 195, 0.12);
border-color: rgba(140, 255, 195, 0.35);
}
.bDeclined {
background: rgba(255, 90, 90, 0.12);
border-color: rgba(255, 90, 90, 0.38);
}

.icon {
margin-right: 6px;
}

.empty {
opacity: 0.8;
padding: 18px;
border-radius: 14px;
border: 1px dashed rgba(255, 255, 255, 0.18);
background: rgba(255, 255, 255, 0.03);
text-align: center;
}

/* Modal */
.modalBackdrop {
position: fixed;
inset: 0;
background: rgba(0, 0, 0, 0.55);
display: flex;
align-items: center;
justify-content: center;
padding: 16px;
z-index: 50;
}
.modal {
width: 100%;
max-width: 620px;
border-radius: 16px;
border: 1px solid rgba(255, 255, 255, 0.10);
background: rgba(10, 16, 30, 0.96);
box-shadow: 0 20px 40px rgba(0, 0, 0, 0.40);
overflow: hidden;
}
.modalHeader {
display: flex;
justify-content: space-between;
align-items: center;
gap: 10px;
padding: 14px;
border-bottom: 1px solid rgba(255, 255, 255, 0.08);
}
.modalTitle {
font-weight: 900;
font-size: 16px;
}
.modalBody {
padding: 14px;
}

.form {
display: grid;
gap: 12px;
}
.grid2 {
display: grid;
gap: 10px;
grid-template-columns: 1fr;
}
.field label {
display: block;
font-size: 12px;
opacity: 0.8;
margin-bottom: 6px;
font-weight: 800;
}
.field input,
.field textarea {
width: 100%;
padding: 12px 12px;
border-radius: 12px;
background: rgba(255, 255, 255, 0.06);
border: 1px solid rgba(255, 255, 255, 0.10);
color: #e8eefc;
outline: none;
}
.hint {
font-size: 12px;
opacity: 0.75;
}
.actionsRow {
display: flex;
justify-content: flex-end;
gap: 10px;
flex-wrap: wrap;
margin-top: 4px;
}

/* Desktop improvements */
@media (min-width: 860px) {
.controls {
flex-direction: row;
align-items: center;
}
.searchBox {
flex: 1;
}
.seg {
grid-template-columns: repeat(5, auto);
}
.grid {
grid-template-columns: 1fr 1fr;
}
.grid2 {
grid-template-columns: 1fr 1fr;
}
}
`}</style>
</div>
);
}

