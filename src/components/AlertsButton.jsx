'use client';

import { useEffect, useRef, useState } from 'react';

export default function AlertsButton({ onEnabled }) {
const [enabled, setEnabled] = useState(false);
const audioRef = useRef(null);

useEffect(() => {
audioRef.current = new Audio('/notify.mp3');
audioRef.current.volume = 0.8;
}, []);

async function enableAlerts() {
// 1) Pedir permiso de notificaciones
if ('Notification' in window) {
const perm = await Notification.requestPermission();
if (perm !== 'granted') {
alert('Necesitas permitir notificaciones en el navegador.');
return;
}
}

// 2) “Desbloquear” audio (Chrome requiere interacción del usuario)
try {
await audioRef.current.play();
audioRef.current.pause();
audioRef.current.currentTime = 0;
} catch (e) {
// si falla, igual dejamos enabled para banners
console.log('Audio locked by browser:', e);
}

setEnabled(true);
onEnabled?.({
playSound: () => {
try {
audioRef.current.currentTime = 0;
audioRef.current.play();
} catch {}
},
notify: (title, body) => {
try {
if ('Notification' in window && Notification.permission === 'granted') {
new Notification(title, { body });
}
} catch {}
},
});
}

return (
<button
onClick={enableAlerts}
style={{
padding: '8px 12px',
borderRadius: 10,
border: '1px solid #333',
background: enabled ? '#1f6f3d' : '#111',
color: '#fff',
cursor: 'pointer'
}}
title="Activa sonido + notificaciones"
>
{enabled ? 'Alerts: ON ✅' : 'Enable Alerts 🔔'}
</button>
);
}
