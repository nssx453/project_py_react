import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api, { API_URL } from './api';
import { showToast } from './Toast';

export default function Cart() {
    const [list, setList] = useState([]);
    const [loading, setLoading] = useState(true);
    const [busy, setBusy] = useState(false);
    const nav = useNavigate();

    const load = () => api.get('/cart/').then((r) => setList(r.data)).catch(console.error).finally(() => setLoading(false));
    useEffect(() => { load(); }, []);

    const notify = () => window.dispatchEvent(new Event('cart:update'));

    const remove = async (id) => {
        await api.delete(`/cart/${id}`);
        showToast('Удалено из корзины', 'error');
        load(); notify();
    };

    const checkout = async () => {
        if (!list.length) return;
        setBusy(true);
        try {
            const r = await api.post('/cart/checkout/all');
            showToast(`Оформлено запросов: ${r.data.created}`, 'success');
            notify();
            setTimeout(() => nav('/requests'), 700);
        } catch (e) {
            showToast(e.response?.data?.detail || e.message, 'error');
        } finally { setBusy(false); }
    };

    const total = list.reduce((s, i) => s + i.price, 0);

    return (
        <div>
            <h2 style={{ letterSpacing: '-.5px' }}>Корзина</h2>

            {loading && (
                <>
                    <div className="skeleton skeleton-card" style={{ height: 120, marginBottom: 10 }} />
                    <div className="skeleton skeleton-card" style={{ height: 120, marginBottom: 10 }} />
                </>
            )}

            {!loading && list.length === 0 && (
                <div style={{ background: '#fff', borderRadius: 'var(--radius)', padding: 40, textAlign: 'center', boxShadow: 'var(--shadow-sm)', animation: 'fadeInUp .35s ease' }}>
                    <p style={{ fontSize: 44, margin: 0 }}>🛒</p>
                    <p>Корзина пуста. <Link to="/">Перейти к покупкам</Link></p>
                </div>
            )}

            {list.map((it) => (
                <div key={it.item_id} className="cart-row">
                    <img src={it.image_url.startsWith('http') ? it.image_url : `${API_URL}${it.image_url}`} alt={it.title} />
                    <div style={{ flex: 1 }}>
                        <b style={{ display: 'block', marginBottom: 4 }}>{it.title}</b>
                        <div style={{ color: 'var(--muted)', fontSize: 13 }}>Продавец: {it.owner}</div>
                    </div>
                    <div style={{ fontWeight: 800, fontSize: 18, minWidth: 110, textAlign: 'right' }}>
                        {it.price.toLocaleString('ru-RU')} ₽
                    </div>
                    <button className="btn btn-danger" onClick={() => remove(it.item_id)}>Удалить</button>
                </div>
            ))}

            {list.length > 0 && (
                <div className="cart-total">
                    <div style={{ fontSize: 18 }}>Итого:&nbsp;
                        <b style={{ fontSize: 24, letterSpacing: '-.5px' }}>{total.toLocaleString('ru-RU')} ₽</b>
                    </div>
                    <button className="btn" onClick={checkout} disabled={busy}>
                        {busy ? 'Оформляем...' : 'Купить всё'}
                    </button>
                </div>
            )}
        </div>
    );
}