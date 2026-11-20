import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import api from './api';

export default function Register({ onLogin }) {
    const [u, setU] = useState(''); const [p, setP] = useState('');
    const [role, setRole] = useState('buyer'); const [err, setErr] = useState('');
    const nav = useNavigate();

    const submit = async (e) => {
        e.preventDefault(); setErr('');
        if (u.length < 3) return setErr('Логин минимум 3 символа');
        if (p.length < 6) return setErr('Пароль минимум 6 символов');
        try {
            const r = await api.post('/register', { username: u, password: p, role });
            onLogin(r.data); nav('/');
        } catch (e) {
            const d = e.response?.data?.detail;
            setErr(Array.isArray(d) ? d.map((x) => x.msg).join(', ') : (d || e.message));
        }
    };

    return (
        <div className="form-card">
            <h2>Регистрация</h2>
            <form onSubmit={submit}>
                <input placeholder="Логин (3–20 симв.)" value={u} onChange={(e) => setU(e.target.value)} required minLength={3} maxLength={20} />
                <input type="password" placeholder="Пароль (6+ симв.)" value={p} onChange={(e) => setP(e.target.value)} required minLength={6} />
                <div style={{ marginBottom: 12 }}>
                    <label style={{ marginRight: 16 }}>
                        <input type="radio" checked={role === 'buyer'} onChange={() => setRole('buyer')} /> Покупатель
                    </label>
                    <label>
                        <input type="radio" checked={role === 'seller'} onChange={() => setRole('seller')} /> Продавец
                    </label>
                </div>
                {err && <p style={{ color: 'var(--danger)' }}>{err}</p>}
                <button className="btn">Зарегистрироваться</button>
            </form>
            <p style={{ textAlign: 'center', marginTop: 12, fontSize: 14 }}>
                Есть аккаунт? <Link to="/login">Вход</Link>
            </p>
        </div>
    );
}