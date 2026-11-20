import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Line } from 'react-chartjs-2';
import {
    Chart as ChartJS, CategoryScale, LinearScale, PointElement,
    LineElement, Title, Tooltip, Legend, Filler,
} from 'chart.js';
import api, { API_URL, WS_URL } from './api';
import { showToast } from './Toast';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, Filler);

export default function ItemDetail({ user }) {
    const { id } = useParams();
    const [item, setItem] = useState(null);
    const [err, setErr] = useState('');
    const [requested, setRequested] = useState(false);
    const [count, setCount] = useState(0);
    const [points, setPoints] = useState({ labels: [], data: [] });
    const [flash, setFlash] = useState(false);

    useEffect(() => { api.get(`/items/${id}`).then((r) => setItem(r.data)).catch((e) => setErr(e.message)); }, [id]);

    useEffect(() => {
        const ws = new WebSocket(`${WS_URL}/ws/items/${id}/purchases`);
        ws.onmessage = (ev) => {
            const msg = JSON.parse(ev.data);
            if (msg.type === 'init') {
                setCount(msg.count);
                setPoints({ labels: [new Date(msg.timestamp).toLocaleTimeString()], data: [msg.count] });
            } else if (msg.type === 'update') {
                setCount(msg.count);
                setPoints((p) => ({
                    labels: [...p.labels, new Date(msg.timestamp).toLocaleTimeString()].slice(-30),
                    data: [...p.data, msg.count].slice(-30),
                }));
                if (!msg.fake) { setFlash(true); setTimeout(() => setFlash(false), 900); }
            }
        };
        return () => ws.close();
    }, [id]);

    const sendRequest = async () => {
        try {
            await api.post(`/items/${id}/requests`);
            setRequested(true);
            showToast('Запрос отправлен продавцу', 'success');
        } catch (e) { showToast(e.response?.data?.detail || e.message, 'error'); }
    };

    const addToCart = async () => {
        try {
            await api.post(`/cart/${id}`);
            window.dispatchEvent(new Event('cart:update'));
            showToast('Добавлено в корзину', 'success');
        } catch (e) { showToast(e.response?.data?.detail || e.message, 'error'); }
    };

    if (err) return <p style={{ color: 'var(--danger)' }}>{err}</p>;
    if (!item) return <div className="skeleton skeleton-card" style={{ height: 420 }} />;

    const imgSrc = item.image_url.startsWith('http') ? item.image_url : `${API_URL}${item.image_url}`;
    const isOwnItem = user?.username === item.owner;

    const chartData = {
        labels: points.labels,
        datasets: [{
            label: 'Покупок', data: points.data,
            borderColor: '#D9A5A8', backgroundColor: 'rgba(217, 165, 168, 0.22)',
            fill: true, tension: 0.35, pointRadius: 0, borderWidth: 2.5,
        }],
    };

    return (
        <>
            <div className="detail">
                <div className="detail-img">
                    <img src={imgSrc} alt={item.title} />
                </div>
                <div className="detail-info">
                    <h1>{item.title}</h1>
                    <div className="detail-price">{item.price.toLocaleString('ru-RU')} ₽</div>
                    <div className="detail-owner">Продавец: <b>{item.owner}</b></div>
                    <p>{item.description}</p>
                    {user?.role === 'buyer' && !isOwnItem && (
                        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                            <button className="btn" onClick={sendRequest} disabled={requested}>
                                {requested ? '✓ Запрос отправлен' : 'Купить сейчас'}
                            </button>
                            <button className="btn btn-secondary" onClick={addToCart}>🛒 В корзину</button>
                        </div>
                    )}
                    {!user && <p><Link to="/login">Войдите</Link>, чтобы купить</p>}
                </div>
            </div>

            <div className="chart-wrap">
                <h3>
                    <span className="chart-live" />
                    Продано: {count} шт.
                    {flash && <span className="chart-up">▲ только что купили!</span>}
                </h3>
                <div style={{ maxWidth: 820, animation: flash ? 'chartPulse 1s ease' : undefined }}>
                    <Line data={chartData} options={{
                        responsive: true, animation: { duration: 400 },
                        plugins: { legend: { display: false } },
                        scales: {
                            y: { beginAtZero: true, ticks: { precision: 0 }, grid: { color: '#EFE9E3' } },
                            x: { ticks: { maxTicksLimit: 8 }, grid: { display: false } },
                        },
                    }} />
                </div>
            </div>
        </>
    );
}