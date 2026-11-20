import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import api from './api';

export default function Login({ onLogin }) {
    const [u, setU] = useState(''); const [p, setP] = useState('');
    const [err, setErr] = useState(''); const nav = useNavigate();

    const submit = async (e) => {
        e.preventDefault(); setErr('');
        if (u.length < 3) return setErr('Логин минимум 3 символа');
        if (p.length < 6) return setErr('Пароль минимум 6 символов');
        try {
            const body = new URLSearchParams({ username: u, password: p });
            const r = await api.post('/token', body, { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } });
            onLogin(r.data); nav('/');
        } catch (e) { setErr(e.response?.data?.detail || e.message); }
    };

    return (
        <div className="form-card">
            <h2>Вход</h2>
            <form onSubmit={submit}>
                <input placeholder="Логин" value={u} onChange={(e) => setU(e.target.value)} required minLength={3} />
                <input type="password" placeholder="Пароль" value={p} onChange={(e) => setP(e.target.value)} required minLength={6} />
                {err && <p style={{ color: 'var(--danger)' }}>{err}</p>}
                <button className="btn">Войти</button>
            </form>
            <p style={{ textAlign: 'center', marginTop: 12, fontSize: 14 }}>
                Нет аккаунта? <Link to="/register">Регистрация</Link>
            </p>
        </div>
    );
}