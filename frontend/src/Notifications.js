import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api, { API_URL } from './api';
import { showToast } from './Toast';

export default function Notifications({ user }) {
    const [open, setOpen] = useState(false);
    const [list, setList] = useState([]);
    const dropdownRef = useRef(null);
    const nav = useNavigate();

    const unread = list.filter((n) => !n.read).length;

    const load = () => {
        if (!user) return;
        api.get('/notifications/').then((r) => setList(r.data)).catch(() => { });
    };

    useEffect(() => {
        load();
        const t = setInterval(load, 20000);
        return () => clearInterval(t);
    }, [user?.username]);

    useEffect(() => {
        if (!user) return;
        const token = sessionStorage.getItem('token');
        if (!token) return;
        const es = new EventSource(`${API_URL}/sse/requests?token=${token}`);
        es.onmessage = (ev) => {
            try {
                const d = JSON.parse(ev.data);
                if (d.kind === 'notification') {
                    setList((prev) => [d, ...prev]);
                    showToast(d.text, 'success');
                }
            } catch { }
        };
        return () => es.close();
    }, [user?.username]);

    useEffect(() => {
        const h = (e) => {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target)) setOpen(false);
        };
        document.addEventListener('mousedown', h);
        return () => document.removeEventListener('mousedown', h);
    }, []);

    const markAllRead = async () => {
        await api.post('/notifications/read');
        setList((prev) => prev.map((n) => ({ ...n, read: true })));
    };

    const clear = async () => {
        await api.delete('/notifications/');
        setList([]);
    };

    const handleClick = async (n) => {
        try {
            if (!n.read) {
                await api.post('/notifications/read');
                setList((prev) => prev.map((x) => ({ ...x, read: true })));
            }
        } catch (e) {
        }
        setOpen(false);
        if (n.link) nav(n.link);
    };
    if (!user) return null;

    return (
        <div ref={dropdownRef} style={{ position: 'relative' }}>
            <button
                onClick={() => setOpen((v) => !v)}
                aria-label="Уведомления"
                style={{
                    position: 'relative', background: 'transparent', border: 'none',
                    cursor: 'pointer', fontSize: 20, color: 'var(--snowdrift)',
                    padding: 6, borderRadius: 10, transition: 'background .15s',
                }}
                onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(247,247,244,.1)'}
                onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
            >
                🔔
                {unread > 0 && (
                    <span key={unread} style={{
                        position: 'absolute', top: 0, right: -2,
                        background: 'var(--dusty-rose)', color: 'var(--espresso)',
                        fontSize: 10, fontWeight: 800, borderRadius: 999, padding: '1px 6px',
                        animation: 'badgeBounce .35s ease',
                    }}>{unread}</span>
                )}
            </button>

            {open && (
                <div style={{
                    position: 'absolute', top: 'calc(100% + 10px)', right: 0,
                    width: 340, maxHeight: 440, overflowY: 'auto',
                    background: '#fff', borderRadius: 'var(--radius)',
                    boxShadow: 'var(--shadow-lg)', border: '1px solid var(--border)',
                    animation: 'fadeInUp .25s ease', zIndex: 100,
                }}>
                    <div style={{
                        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                        padding: '12px 16px', borderBottom: '1px solid var(--border)',
                    }}>
                        <b style={{ fontSize: 15, color: 'var(--espresso)' }}>Уведомления</b>
                        <div style={{ display: 'flex', gap: 8 }}>
                            {unread > 0 && (
                                <button className="btn btn-secondary" style={{ padding: '4px 10px', fontSize: 12 }} onClick={markAllRead}>Прочитать</button>
                            )}
                            {list.length > 0 && (
                                <button className="btn btn-danger" style={{ padding: '4px 10px', fontSize: 12 }} onClick={clear}>Очистить</button>
                            )}
                        </div>
                    </div>

                    {list.length === 0 && (
                        <div style={{ padding: 30, textAlign: 'center', color: 'var(--muted)', fontSize: 14 }}>
                            Пока нет уведомлений
                        </div>
                    )}

                    {list.map((n) => (
                        <div key={n.id} onClick={() => handleClick(n)}
                            style={{
                                padding: '12px 16px', borderBottom: '1px solid var(--border)', cursor: 'pointer',
                                background: n.read ? '#fff' : 'rgba(169, 199, 232, .12)',
                                transition: 'background .15s', display: 'flex', alignItems: 'center', gap: 10,
                            }}
                            onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(169, 199, 232, .22)'}
                            onMouseLeave={(e) => e.currentTarget.style.background = n.read ? '#fff' : 'rgba(169, 199, 232, .12)'}
                        >
                            <div style={{ flex: 1 }}>
                                <div style={{ fontSize: 13, color: 'var(--espresso)', fontWeight: n.read ? 400 : 600 }}>
                                    {n.kind === 'new_request' ? '🛒' : n.kind === 'accepted' ? '✅' : '❌'} {n.text}
                                </div>
                                <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 4 }}>
                                    {new Date(n.created_at).toLocaleString('ru-RU')}
                                </div>
                            </div>
                            <span style={{ color: 'var(--muted)', fontSize: 16 }}>→</span>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}