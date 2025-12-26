"use client";

import { useMemo, useState } from "react";

export default function PinGate({ children }) {
const expectedPin = useMemo(() => {
// Lee de .env.local -> NEXT_PUBLIC_SHARED_PIN
return (process.env.NEXT_PUBLIC_SHARED_PIN || "7788").trim();
}, []);

const [pin, setPin] = useState("");
const [unlocked, setUnlocked] = useState(false);
const [error, setError] = useState("");

const verify = () => {
const attempt = (pin || "").trim();

if (attempt.length !== 4) {
setError("PIN must be 4 digits.");
return;
}

if (attempt === expectedPin) {
setError("");
setUnlocked(true);
} else {
setError("Wrong PIN.");
}
};

// ✅ SI NO está unlocked, mostramos SOLO el PIN (NO children)
if (!unlocked) {
return (
<div style={{ minHeight: "100dvh", display: "grid", placeItems: "center", padding: 16 }}>
<div style={{ width: "100%", maxWidth: 360, background: "#fff", borderRadius: 16, padding: 16, boxShadow: "0 10px 30px rgba(0,0,0,.08)" }}>
<h2 style={{ margin: 0, marginBottom: 6 }}>Enter PIN</h2>
<p style={{ marginTop: 0, color: "#666" }}>Dispatch Board</p>

<input
value={pin}
onChange={(e) => setPin(e.target.value)}
inputMode="numeric"
pattern="[0-9]*"
maxLength={4}
placeholder="4-digit PIN"
style={{ width: "100%", padding: 14, borderRadius: 12, border: "1px solid #ddd", fontSize: 18 }}
/>

{error ? <div style={{ color: "#c00", marginTop: 10 }}>{error}</div> : null}

<button
onClick={verify}
style={{ width: "100%", marginTop: 12, padding: 14, borderRadius: 12, border: "none", fontSize: 16, cursor: "pointer" }}
>
Unlock
</button>
</div>
</div>
);
}

// ✅ Si ya está unlocked, ahora sí mostramos la app
return <>{children}</>;
}
