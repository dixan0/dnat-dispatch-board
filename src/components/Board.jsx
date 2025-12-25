'use client';

import { useEffect, useMemo, useState } from 'react';
import {
collection,
deleteDoc,
doc,
getDoc,
onSnapshot,
orderBy,
query,
serverTimestamp,
setDoc,
updateDoc,
} from 'firebase/firestore';
import { db, ensureAuth } from '../lib/firebase';

const STATUS = {
pending: { label: 'Needs Appointment', color: '#fbbf24' }, // yellow
scheduled: { label: 'Appointment Set', color: '#22c55e' }, // green
rejected: { label: 'Rejected', color: '#ef4444' }, // red
completed: { label: 'Completed', color: '#3b82f6' }, // blue
};

function twoHoursAfter(date) {
return new Date(date.getTime() + 2 * 60 * 60 * 1000);
}

export default function DispatchBoard() {
const [orders, setOrders] = useState([]);
const [search, setSearch] = useState('');

// form
const [orderNumber, setOrderNumber] = useState('');
const [year, setYear] = useState('');
const [make, setMake] = useState('');
const [model, setModel] = useState('');
const [location, setLocation] = useState('');
const [apptAt, setApptAt] = useState(''); // datetime-local
const [notes, setNotes] = useState('');
const [status, setStatus] = useState('pending');

const filtered = useMemo(() => {
const s = search.trim();
if (!s) return orders;
return orders.filter(o => (o.orderNumber || '').includes(s));
}, [orders, search]);

useEffect(() => {
(async () => {
await ensureAuth();

const q = query(collection(db, 'orders'), orderBy('createdAt', 'desc'));
const unsub = onSnapshot(q, (snap) => {
const list = snap.docs.map(d => ({ id: d.id, ...d.data() }));
setOrders(list);
});

return () => unsub();
})();
}, []);

// Auto-complete after 2 hours past appointment time
useEffect(() => {
if (!orders.length) return;

const now = new Date();
const toAutoComplete = orders.filter(o => {
if (o.status !== 'scheduled') return false;
if (!o.appointmentAt) return false;
const d = o.appointmentAt?.toDate ? o.appointmentAt.toDate() : new Date(o.appointmentAt);
return twoHoursAfter(d) <= now;
});

toAutoComplete.forEach(async (o) => {
try {
await updateDoc(doc(db, 'orders', o.id), { status: 'completed', updatedAt: serverTimestamp() });
} catch {}
});
}, [orders]);

const resetForm = () => {
setOrderNumber('');
setYear('');
setMake('');
setModel('');
setLocation('');
setApptAt('');
setNotes('');
setStatus('pending');
};

const addOrUpdate = async () => {
const on = orderNumber.trim();
if (!on) return alert('Order Number is required.');

// appointment is required (per your requirement)
if (!apptAt) return alert('Appointment date & time is required.');

const ref = doc(db, 'orders', on);

const existing = await getDoc(ref);

// If you want strictly unique and not overwrite existing:
// if (existing.exists()) return alert('Order Number already exists.');

const payload = {
orderNumber: on,
year: year.trim(),
make: make.trim(),
model: model.trim(),
location: location.trim(),
notes: notes.trim(),
status,
appointmentAt: new Date(apptAt).toISOString(),
updatedAt: serverTimestamp(),
createdAt: existing.exists() ? existing.data().createdAt || serverTimestamp() : serverTimestamp(),
};

await setDoc(ref, payload, { merge: true });
resetForm();
};

const setStatusFor = async (id, newStatus) => {
await updateDoc(doc(db, 'orders', id), { status: newStatus, updatedAt: serverTimestamp() });
};

const removeOrder = async (id) => {
if (!confirm('Delete this order?')) return;
await deleteDoc(doc(db, 'orders', id));
};

return (
<div style={{ padding: 20, color: '#fff' }}>
<h1 style={{ marginTop: 0 }}>DM Auto Transport & Towing — Dispatch Board</h1>

<div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 14 }}>
<input
value={search}
onChange={(e) => setSearch(e.target.value.replace(/\D/g, '').slice(0, 20))}
placeholder="Search by Order #"
style={{ padding: 10, borderRadius: 8, minWidth: 220 }}
/>
</div>

<div style={{ border: '1px solid #333', borderRadius: 12, padding: 14, marginBottom: 18 }}>
<h3 style={{ marginTop: 0 }}>Add / Update Order</h3>

<div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 10 }}>
<input value={orderNumber} onChange={(e) => setOrderNumber(e.target.value.replace(/\D/g, '').slice(0, 30))} placeholder="Order # (required)" style={inp} />
<input value={year} onChange={(e) => setYear(e.target.value.replace(/\D/g, '').slice(0, 4))} placeholder="Year (optional)" style={inp} />
<input value={make} onChange={(e) => setMake(e.target.value)} placeholder="Make (optional)" style={inp} />
<input value={model} onChange={(e) => setModel(e.target.value)} placeholder="Model (optional)" style={inp} />
<input value={location} onChange={(e) => setLocation(e.target.value)} placeholder="Appointment Location (optional)" style={inp} />
<input value={apptAt} onChange={(e) => setApptAt(e.target.value)} type="datetime-local" style={inp} />
<select value={status} onChange={(e) => setStatus(e.target.value)} style={inp}>
<option value="pending">Needs Appointment (Yellow)</option>
<option value="scheduled">Appointment Set (Green)</option>
<option value="rejected">Rejected (Red)</option>
<option value="completed">Completed (Blue)</option>
</select>
<input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Notes / Rejection reason" style={inp} />
</div>

<div style={{ marginTop: 12, display: 'flex', gap: 10 }}>
<button onClick={addOrUpdate} style={btn}>Save</button>
<button onClick={resetForm} style={btn2}>Clear</button>
</div>
</div>

{/* Desktop table */}
<div className="desktopOnly" style={{ overflowX: 'auto', border: '1px solid #333', borderRadius: 12 }}>
<table style={{ width: '100%', borderCollapse: 'collapse' }}>
<thead>
<tr style={{ textAlign: 'left' }}>
<th style={th}>Status</th>
<th style={th}>Order #</th>
<th style={th}>Vehicle</th>
<th style={th}>Appointment</th>
<th style={th}>Location</th>
<th style={th}>Notes</th>
<th style={th}>Actions</th>
</tr>
</thead>
<tbody>
{filtered.map(o => {
const st = STATUS[o.status] || STATUS.pending;
return (
<tr key={o.id} style={{ borderTop: '1px solid #222' }}>
<td style={td}>
<span style={{ display: 'inline-block', padding: '6px 10px', borderRadius: 999, background: st.color, color: '#111', fontWeight: 700 }}>
{st.label}
</span>
</td>
<td style={td}>{o.orderNumber}</td>
<td style={td}>{[o.year, o.make, o.model].filter(Boolean).join(' ')}</td>
<td style={td}>{o.appointmentAt ? new Date(o.appointmentAt).toLocaleString() : ''}</td>
<td style={td}>{o.location || ''}</td>
<td style={td}>{o.notes || ''}</td>
<td style={td}>
<div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
<button onClick={() => setStatusFor(o.id, 'pending')} style={mini(STATUS.pending.color)}>Yellow</button>
<button onClick={() => setStatusFor(o.id, 'scheduled')} style={mini(STATUS.scheduled.color)}>Green</button>
<button onClick={() => setStatusFor(o.id, 'rejected')} style={mini(STATUS.rejected.color)}>Red</button>
<button onClick={() => setStatusFor(o.id, 'completed')} style={mini(STATUS.completed.color)}>Blue</button>
<button onClick={() => removeOrder(o.id)} style={mini('#666')}>Delete</button>
</div>
</td>
</tr>
);
})}
</tbody>
</table>
</div>

{/* Mobile cards */}
<div className="mobileOnly" style={{ display: 'grid', gap: 10 }}>
{filtered.map(o => {
const st = STATUS[o.status] || STATUS.pending;
return (
<div key={o.id} style={{ border: '1px solid #333', borderRadius: 12, padding: 12 }}>
<div style={{ display: 'flex', justifyContent: 'space-between', gap: 10 }}>
<div style={{ fontWeight: 800 }}>Order #{o.orderNumber}</div>
<div style={{ padding: '4px 10px', borderRadius: 999, background: st.color, color: '#111', fontWeight: 800 }}>
{st.label}
</div>
</div>

<div style={{ marginTop: 8, opacity: 0.95 }}>
<div><b>Vehicle:</b> {[o.year, o.make, o.model].filter(Boolean).join(' ')}</div>
<div><b>Appointment:</b> {o.appointmentAt ? new Date(o.appointmentAt).toLocaleString() : ''}</div>
<div><b>Location:</b> {o.location || ''}</div>
<div><b>Notes:</b> {o.notes || ''}</div>
</div>

<div style={{ marginTop: 10, display: 'flex', gap: 6, flexWrap: 'wrap' }}>
<button onClick={() => setStatusFor(o.id, 'pending')} style={mini(STATUS.pending.color)}>Yellow</button>
<button onClick={() => setStatusFor(o.id, 'scheduled')} style={mini(STATUS.scheduled.color)}>Green</button>
<button onClick={() => setStatusFor(o.id, 'rejected')} style={mini(STATUS.rejected.color)}>Red</button>
<button onClick={() => setStatusFor(o.id, 'completed')} style={mini(STATUS.completed.color)}>Blue</button>
<button onClick={() => removeOrder(o.id)} style={mini('#666')}>Delete</button>
</div>
</div>
);
})}
</div>

<style jsx global>{`
body { background: #0b0f14; }
.desktopOnly { display: block; }
.mobileOnly { display: none; }
@media (max-width: 820px) {
.desktopOnly { display: none; }
.mobileOnly { display: grid; }
}
`}</style>
</div>
);
}

const inp = {
padding: 10,
borderRadius: 8,
border: '1px solid #333',
background: '#0b0f14',
color: '#fff',
};

const btn = {
padding: '10px 14px',
borderRadius: 8,
cursor: 'pointer',
fontWeight: 800,
};

const btn2 = {
padding: '10px 14px',
borderRadius: 8,
cursor: 'pointer',
background: 'transparent',
border: '1px solid #444',
color: '#fff',
};

const th = { padding: 12, opacity: 0.85 };
const td = { padding: 12, verticalAlign: 'top' };

const mini = (bg) => ({
padding: '8px 10px',
borderRadius: 10,
cursor: 'pointer',
background: bg,
border: 'none',
fontWeight: 800,
color: '#111',
});
