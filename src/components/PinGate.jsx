'use client';

import { useEffect, useMemo, useState } from 'react';

export default function PinGate({ children }) {
const expectedPin = useMemo(() => {
// Reads from .env.local -> NEXT_PUBLIC_SHARED_PIN
return (process.env.NEXT_PUBLIC_SHARED_PIN || '7788').trim();
}, []);

const [pin, setPin] = useState('');
const [unlocked, setUnlocked] = useState(false);
const [error, setError] = useState('');

useEffect(() => {
const saved = localStorage.getItem('DMAT_PIN_OK');
if (saved === '1') setUnlocked(true);
}, []);

const verify = () => {
const attempt = (pin || '').trim();
if (attempt.length !== 4) {
setError('PIN must be 4 digits.');
return;
}
if (attempt === expectedPin) {
setError('');
setUnlocked(true);
localStorage.setItem('DMAT_PIN_OK', '1');
} else {
setError('Wrong PIN.');
}
};

const logout = () => {
localStorage.removeItem('DMAT_PIN_OK');
setUnlocked(false);
setPin('');
setError('');
};

if (unlocked) {
return (
<div>
<div style={{ padding: 10, display: 'flex', justifyContent: 'flex-end' }}>
<button onClick={logout} style={{ padding: '8px 12px', cursor: 'pointer' }}>
Lock
</button>
</div>
{children}
</div>
);
}

return (
<div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', padding: 20 }}>
<div style={{ width: 320, padding: 18, borderRadius: 12, border: '1px solid #333' }}>
<h2 style={{ margin: 0, marginBottom: 8 }}>Enter PIN</h2>
<div style={{ marginBottom: 10, opacity: 0.85 }}>4-digit PIN</div>

<input
value={pin}
onChange={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
onKeyDown={(e) => {
if (e.key === 'Enter') verify();
}}
type="password"
inputMode="numeric"
placeholder="••••"
style={{ width: '100%', padding: 12, fontSize: 18, borderRadius: 8 }}
/>

<button
onClick={verify}
style={{ marginTop: 12, width: '100%', padding: 12, borderRadius: 8, cursor: 'pointer' }}
>
Verify
</button>

{error ? <div style={{ marginTop: 10, color: '#ff6b6b' }}>{error}</div> : null}
</div>
</div>
);
}