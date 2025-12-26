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
useEffect(() => {
if (!open) return;
const prevOverflow = document.body.style.overflow;
const prevPosition = document.body.style.position;
const prevWidth = document.body.style.width;

document.body.style.overflow = "hidden";
document.body.style.position = "relative";
document.body.style.width = "100%";

return () => {
document.body.style.overflow = prevOverflow;
document.body.style.position = prevPosition;
document.body.style.width = prevWidth;
};
}, [open]);

if (!open) return null;

return (
<div
className="modalOverlay"
onMouseDown={onClose}
role="dialog"
aria-modal="true"
>
<div className="modal modalLarge" onMouseDown={(e) => e.stopPropagation()}>
<div className="modalHeader">
<div>
<div className="modalTitle">{title}</div>
</div>
<button className="iconBtn" onClick={onClose} aria-label="Close">
✕
</button>
</div>

<div className="modalBody" style={{ overflowY: "auto", flex: "1 1 auto" }}>
{children}
</div>
</div>

<style jsx>{`
.modalOverlay {
position: fixed;
inset: 0;
background: rgba(0, 0, 0, 0.45);
display: flex;
align-items: flex-end;
justify-content: center;
padding: 14px;
z-index: 9999;
}
.modal {
width: min(620px, 96vw);
background: #fff;
border-radius: 18px;
box-shadow: 0 24px 60px rgba(0, 0, 0, 0.25);
overflow: hidden;
display: flex;
flex-direction: column;
max-height: 92vh;
}
.modalHeader {
display: flex;
justify-content: space-between;
align-items: center;
padding: 14px 16px;
background: linear-gradient(
90deg,
rgba(255, 122, 0, 0.15),
rgba(255, 154, 61, 0.1)
);
border-bottom: 1px solid rgba(0, 0, 0, 0.06);
flex: 0 0 auto;
}
.modalBody {
padding: 14px 16px;
-webkit-overflow-scrolling: touch;
padding-bottom: calc(env(safe-area-inset-bottom) + 120px);
}
.modalTitle {
font-weight: 1000;
font-size: 16px;
}
.iconBtn {
background: #fff;
border: 1px solid rgba(0, 0, 0, 0.12);
width: 38px;
height: 38px;
border-radius: 12px;
cursor: pointer;
font-size: 18px;
}
`}</style>
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
<div className="form formScroll">
<div className="formInner">
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
</div>

<div className="actionsRow stickyFooter">
<button className="btn ghost" onClick={onClose} type="button">
Cancel
</button>
<button
className="btn primary"
disabled={!canSave}
type="button"
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

const [openNew, setOpenNew] = useState(false);
const [editApptOpen, setEditApptOpen] = useState(false);
const [editApptValue, setEditApptValue] = useState("");
const [editApptOrderId, setEditApptOrderId] = useState(null);

const [declineOpen, setDeclineOpen] = useState(false);
const [declineReason, setDeclineReason] = useState("");
const [declineOrderId, setDeclineOrderId] = useState(null);

const [search, setSearch] = useState("");
const [statusFilter, setStatusFilter] = useState("all");

const q = useMemo(() => {
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
declineReason: "",
createdAt: serverTimestamp(),
});
setOpenNew(false);
} catch (e) {
setErr(String(e?.message || e));
}
}

function openEditAppointment(order) {
setEditApptOrderId(order.id);
setEditApptValue(
order.appointment && order.appointment !== "" ? order.appointment : "none"
);
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
const okStatus =
statusFilter === "all"
? true
: (o.status || "pending") === statusFilter;
const haystack = `${o.orderNumber || ""} ${o.year || ""} ${o.make || ""} ${
o.model || ""
}`.toLowerCase();
const okSearch = s.length === 0 ? true : haystack.includes(s);
return okStatus && okSearch;
});
}, [orders, search, statusFilter]);

function doLock() {
localStorage.removeItem("dmat_pin_ok");
window.location.reload();
}

return (
<div className="page">
<style jsx global>{`
.modalBackdrop {
position: fixed;
inset: 0;
background: rgba(0, 0, 0, 0.45);
z-index: 9999;
display: flex;
align-items: flex-end;
justify-content: center;
padding: 12px;
}
.modal {
width: 100%;
max-width: 720px;
background: #fff;
border-radius: 14px;
overflow: hidden;
display: flex;
flex-direction: column;
max-height: 92vh;
}
.modalHeader {
display: flex;
align-items: center;
justify-content: space-between;
gap: 10px;
padding: 12px;
border-bottom: 1px solid #eee;
flex: 0 0 auto;
}
.modalBody {
flex: 1 1 auto;
overflow-y: auto;
-webkit-overflow-scrolling: touch;
padding: 12px;
padding-bottom: calc(env(safe-area-inset-bottom) + 120px);
}
.formScroll {
display: flex;
flex-direction: column;
min-height: 100%;
}
.formInner {
flex: 1 1 auto;
}
.stickyFooter {
position: sticky;
bottom: 0;
background: #fff;
border-top: 1px solid #eee;
padding-top: 10px;
padding-bottom: calc(env(safe-area-inset-bottom) + 12px);
z-index: 50;
}
`}</style>

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
className={`btn mini ${
status === "pending" ? "miniActive" : ""
}`}
onClick={() => setStatus(o.id, "pending")}
>
Pending
</button>
<button
className={`btn mini ${
status === "scheduled" ? "miniActive" : ""
}`}
onClick={() => setStatus(o.id, "scheduled")}
>
Scheduled
</button>
<button
className={`btn mini ${
status === "completed" ? "miniActive" : ""
}`}
onClick={() => setStatus(o.id, "completed")}
>
Completed
</button>
<button className="btn mini danger" onClick={() => openDecline(o)}>
Decline + reason
</button>

<button
className="btn mini ghost2"
onClick={() => openEditAppointment(o)}
>
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

<Modal
open={openNew}
title="Create New Order"
onClose={() => setOpenNew(false)}
>
<NewOrderForm onCreate={createOrder} onClose={() => setOpenNew(false)} />
</Modal>

<Modal
open={editApptOpen}
title="Edit Appointment"
onClose={() => setEditApptOpen(false)}
>
<div className="form formScroll">
<div className="formInner">
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
</div>

<div className="actionsRow stickyFooter">
<button
className="btn ghost"
onClick={() => setEditApptOpen(false)}
type="button"
>
Cancel
</button>
<button
className="btn primary"
type="button"
onClick={async () => {
try {
if (!editApptOrderId) return;
await setAppointment(editApptOrderId, (editApptValue || "").trim());
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

<Modal
open={declineOpen}
title="Decline Order"
onClose={() => setDeclineOpen(false)}
>
<div className="form formScroll">
<div className="formInner">
<div className="field">
<label>Reason</label>
<input
value={declineReason}
onChange={(e) => setDeclineReason(e.target.value)}
placeholder="Ej: Customer no answer / Not in network / No keys..."
/>
<div className="hint">
Se guardará como <b>status: declined</b> con la razón.
</div>
</div>
</div>

<div className="actionsRow stickyFooter">
<button
className="btn ghost"
onClick={() => setDeclineOpen(false)}
type="button"
>
Cancel
</button>
<button
className="btn danger"
type="button"
onClick={async () => {
try {
if (!declineOrderId) return;
await setDecline(declineOrderId, (declineReason || "").trim());
setDeclineOpen(false);
} catch (e) {
setErr(String(e?.message || e));
}
}}
>
<Icon name="check" /> Decline
</button>
</div>
</div>
</Modal>
</div>
);
}

