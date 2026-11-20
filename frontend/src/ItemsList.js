import React, { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import api, { API_URL } from './api';

export default function ItemsList() {
    const [items, setItems] = useState(null);
    const [params] = useSearchParams();
    const q = params.get('q') || '';

    useEffect(() => { api.get('/items/').then((r) => setItems(r.data)).catch(console.error); }, []);

    const filtered = !items ? [] :
        q ? items.filter((i) => i.title.toLowerCase().includes(q.toLowerCase())) : items;

    return (
        <div>
            <h2 style={{ fontWeight: 700, letterSpacing: '-.5px', marginTop: 0 }}>
                {q ? `Результаты: "${q}"` : 'Рекомендации'}
                {items && <span style={{ color: 'var(--muted)', fontSize: 16, fontWeight: 400 }}> · {filtered.length}</span>}
            </h2>

            {!items && (
                <div className="items-grid">
                    {Array.from({ length: 8 }).map((_, i) => <div key={i} className="skeleton skeleton-card" />)}
                </div>
            )}

            {items && (
                <div className="items-grid">
                    {filtered.map((it) => (
                        <Link key={it.id} to={`/items/${it.id}`} className="card">
                            <img src={it.image_url.startsWith('http') ? it.image_url : `${API_URL}${it.image_url}`} alt={it.title} loading="lazy" />
                            <div className="card-body">
                                <p className="card-title">{it.title}</p>
                                <p className="card-price">{it.price.toLocaleString('ru-RU')} ₽</p>
                                <p className="card-owner">{it.owner}</p>
                            </div>
                        </Link>
                    ))}
                    {filtered.length === 0 && <p>Ничего не найдено</p>}
                </div>
            )}
        </div>
    );
}