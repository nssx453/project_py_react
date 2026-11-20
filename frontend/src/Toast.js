import React, { useEffect, useState } from 'react';

export function showToast(msg, type = 'success') {
    window.dispatchEvent(new CustomEvent('toast', { detail: { msg, type } }));
}

export default function Toaster() {
    const [toast, setToast] = useState(null);

    useEffect(() => {
        const onToast = (e) => setToast({ ...e.detail, id: Date.now() });
        window.addEventListener('toast', onToast);
        return () => window.removeEventListener('toast', onToast);
    }, []);

    useEffect(() => {
        if (!toast) return;
        const t = setTimeout(() => setToast(null), 2600);
        return () => clearTimeout(t);
    }, [toast]);

    if (!toast) return null;
    return <div className={`toast ${toast.type}`}>{toast.msg}</div>;
}