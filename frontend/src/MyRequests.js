import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api, { API_URL } from './api';
import { showToast } from './Toast';

export default function MyRequests({ user }) {
    const [list, setList] = useState(null);

    const load = () => api.get('/requests/').then((r) => setList(r.data)).catch(console.error);

    useEffect(() => {
        load();
        const token = sessionStorage.getItem('token');
        if (!token) return;
        const es = new EventSource(`${API_URL}/sse/requests?token=${token}`);
        es.onmessage = (ev) => {
            try {
                const d = JSON.parse(ev.data);
                if (d.kind === 'new_request') { showToast(`Новый запрос: ${d.item_title}`, 'success'); load(); }
                if (d.kind === 'status_changed') { showToast(`Статус: ${d.item_title} → ${d.status}`, 'success'); load(); }
            } catch { }
        };
        return () => es.close();
    }, []);

    const act = async (id, action) => {
        try { await api.post(`/requests/${id}/${action}`); load(); }
        catch (e) { showToast(e.response?.data?.detail || e.message, 'error'); }
    };

    return (
        <div className="requests-list">
            <h2 style={{ letterSpacing: '-.5px' }}>{user.role === 'seller' ? 'Запросы покупателей' : 'Мои запросы'}</h2>

            {list === null && (
                <>
                    <div className="skeleton skeleton-card" style={{ height: 100, marginBottom: 12 }} />
                    <div className="skeleton skeleton-card" style={{ height: 100, marginBottom: 12 }} />
                </>
            )}

            {list && list.length === 0 && (
                <div style={{ background: '#fff', borderRadius: 'var(--radius)', padding: 40, textAlign: 'center', boxShadow: 'var(--shadow-sm)', animation: 'fadeInUp .35s ease' }}>
                    <p style={{ fontSize: 44, margin: 0 }}>📭</p>
                    <p>Пока пусто</p>
                </div>
            )}

            {list && list.map((r) => (
                <div key={r.id} className="req">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                            <b>{r.item_title}</b>
                            <span className={`badge ${r.status}`}>
                                {r.status === 'pending' ? 'ожидает' : r.status === 'accepted' ? 'принят' : 'отклонён'}
                            </span>
                        </div>
                        <div style={{ color: 'var(--muted)', fontSize: 12 }}>
                            {new Date(r.created_at).toLocaleString('ru-RU')}
                        </div>
                    </div>
                    <div style={{ margin: '8px 0', fontSize: 14 }}>
                        {user.role === 'seller' ? `Покупатель: ${r.buyer}` : `Продавец: ${r.seller}`}
                    </div>
                    <div style={{ display: 'flex', gap: 8 }}>
                        {user.role === 'seller' && r.status === 'pending' && (
                            <>
                                <button className="btn" onClick={() => act(r.id, 'accept')}>Принять</button>
                                <button className="btn btn-danger" onClick={() => act(r.id, 'reject')}>Отклонить</button>
                            </>
                        )}
                        {r.status === 'accepted' && (
                            <Link to={`/requests/${r.id}/chat`} className="btn btn-secondary">Открыть чат</Link>
                        )}
                    </div>
                </div>
            ))}
        </div>
    );
}