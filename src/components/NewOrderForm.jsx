import { useState } from "react";
import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import { db } from "../lib/firebase";

export default function NewOrderForm() {
const [orderNumber, setOrderNumber] = useState("");
const [year, setYear] = useState("");
const [make, setMake] = useState("");
const [model, setModel] = useState("");
const [saving, setSaving] = useState(false);
const [msg, setMsg] = useState("");

async function handleSubmit(e) {
e.preventDefault();
setMsg("");

if (!orderNumber.trim()) return setMsg("Falta Order Number");
if (!year || Number.isNaN(Number(year))) return setMsg("Year inválido");
if (!make.trim()) return setMsg("Falta Make");
if (!model.trim()) return setMsg("Falta Model");

setSaving(true);
try {
await addDoc(collection(db, "orders"), {
orderNumber: orderNumber.trim(),
year: Number(year),
make: make.trim(),
model: model.trim(),
status: "pending",
appointment: "none",
declineReason: "",
createdAt: serverTimestamp(),
});

setOrderNumber("");
setYear("");
setMake("");
setModel("");
setMsg("✅ Orden creada");
} catch (err) {
setMsg("❌ Error: " + (err?.message || String(err)));
} finally {
setSaving(false);
}
}

return (
<form
onSubmit={handleSubmit}
style={{
border: "1px solid #333",
borderRadius: 8,
marginBottom: 14,
display: "flex",
flexDirection: "column",
maxHeight: "75vh",
overflow: "hidden",
background: "#fff",
}}
>
<div style={{ padding: 12, overflowY: "auto", flex: 1 }}>
<h3 style={{ marginTop: 0 }}>Nueva Orden</h3>

<div
style={{
display: "grid",
gap: 8,
gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
}}
>
<label>
Order #
<input
value={orderNumber}
onChange={(e) => setOrderNumber(e.target.value)}
placeholder="1001"
style={{ width: "100%" }}
/>
</label>

<label>
Year
<input
value={year}
onChange={(e) => setYear(e.target.value)}
placeholder="2019"
inputMode="numeric"
style={{ width: "100%" }}
/>
</label>

<label>
Make
<input
value={make}
onChange={(e) => setMake(e.target.value)}
placeholder="Toyota"
style={{ width: "100%" }}
/>
</label>

<label>
Model
<input
value={model}
onChange={(e) => setModel(e.target.value)}
placeholder="Camry"
style={{ width: "100%" }}
/>
</label>
</div>
</div>

<div
style={{
position: "sticky",
bottom: 0,
background: "#fff",
borderTop: "1px solid #ddd",
padding: 12,
paddingBottom: "calc(env(safe-area-inset-bottom) + 12px)",
display: "flex",
gap: 10,
alignItems: "center",
}}
>
<button type="submit" disabled={saving}>
{saving ? "Guardando..." : "Crear orden"}
</button>
{msg ? <span>{msg}</span> : null}
</div>
</form>
);
}

