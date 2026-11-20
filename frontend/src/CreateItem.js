import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from './api';
import { showToast } from './Toast';

export default function CreateItem() {
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [price, setPrice] = useState('');
    const [file, setFile] = useState(null);
    const [preview, setPreview] = useState(null);
    const [progress, setProgress] = useState(0);
    const [loading, setLoading] = useState(false);
    const nav = useNavigate();

    const pickFile = (f) => {
        if (!f) return;
        if (!f.type.startsWith('image/')) return showToast('Нужно изображение (jpg, png)', 'error');
        if (f.size > 8 * 1024 * 1024) return showToast('Максимум 8 МБ', 'error');
        setFile(f); setPreview(URL.createObjectURL(f));
    };

    const submit = async (e) => {
        e.preventDefault();
        if (!file) return showToast('Выберите фото', 'error');
        if (title.trim().length < 3) return showToast('Название от 3 символов', 'error');
        if (Number(price) <= 0) return showToast('Цена должна быть больше 0', 'error');

        setLoading(true); setProgress(0);
        const fd = new FormData();
        fd.append('title', title);
        fd.append('description', description);
        fd.append('price', price);
        fd.append('file', file);

        try {
            await api.post('/items/', fd, {
                onUploadProgress: (ev) => {
                    if (ev.total) setProgress(Math.round((ev.loaded * 100) / ev.total));
                },
            });
            setProgress(100);
            showToast('Объявление опубликовано!', 'success');
            setTimeout(() => nav('/'), 500);
        } catch (err) {
            showToast(err.response?.data?.detail || err.message, 'error');
            setProgress(0);
        } finally { setLoading(false); }
    };

    return (
        <div className="form-card" style={{ maxWidth: 520 }}>
            <h2>Разместить объявление</h2>

            <div style={{
                border: '2px dashed var(--border)', borderRadius: 'var(--radius)',
                padding: 16, marginBottom: 16, textAlign: 'center',
                background: preview ? 'transparent' : '#FBFAF8',
                position: 'relative',
            }}
                onDragOver={(e) => { e.preventDefault(); e.currentTarget.style.borderColor = 'var(--dusty-rose)'; }}
                onDragLeave={(e) => e.currentTarget.style.borderColor = 'var(--border)'}
                onDrop={(e) => {
                    e.preventDefault();
                    e.currentTarget.style.borderColor = 'var(--border)';
                    pickFile(e.dataTransfer.files?.[0]);
                }}
            >
                {preview ? (
                    <div style={{ position: 'relative' }}>
                        <img src={preview} alt="preview"
                            style={{ width: '100%', maxHeight: 260, objectFit: 'cover', borderRadius: 12, animation: 'pop .35s ease' }} />
                        <button type="button" onClick={() => { setFile(null); setPreview(null); }} disabled={loading}
                            style={{
                                position: 'absolute', top: 8, right: 8,
                                background: 'var(--espresso)', color: 'var(--snowdrift)',
                                border: 'none', borderRadius: 999, width: 30, height: 30,
                                cursor: 'pointer', fontWeight: 700,
                            }}>✕</button>
                    </div>
                ) : (
                    <label style={{ cursor: 'pointer', display: 'block' }}>
                        <div style={{ fontSize: 36, marginBottom: 6 }}>📷</div>
                        <div style={{ color: 'var(--muted)', fontSize: 14 }}>
                            Перетащите фото сюда или <span style={{ color: 'var(--dusty-rose)', fontWeight: 600 }}>выберите файл</span>
                        </div>
                        <input type="file" accept="image/*" style={{ display: 'none' }} onChange={(e) => pickFile(e.target.files?.[0])} />
                    </label>
                )}
            </div>

            <form onSubmit={submit}>
                <input placeholder="Название" value={title} onChange={(e) => setTitle(e.target.value)} disabled={loading} required minLength={3} maxLength={100} />
                <textarea placeholder="Описание" rows={3} value={description} onChange={(e) => setDescription(e.target.value)} disabled={loading} maxLength={1000} />
                <input type="number" step="0.01" placeholder="Цена, ₽" value={price} onChange={(e) => setPrice(e.target.value)} disabled={loading} required min="1" />

                {loading && (
                    <div style={{ marginBottom: 12 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: 'var(--muted)', marginBottom: 6 }}>
                            <span>Публикуем...</span><span>{progress}%</span>
                        </div>
                        <div style={{ height: 8, background: 'var(--espresso-soft)', borderRadius: 999, overflow: 'hidden' }}>
                            <div style={{
                                height: '100%', width: `${progress}%`,
                                background: 'linear-gradient(90deg, var(--frozen-lake), var(--dusty-rose))',
                                borderRadius: 999, transition: 'width .25s ease',
                            }} />
                        </div>
                    </div>
                )}

                <button className="btn" disabled={loading} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10 }}>
                    {loading && (
                        <span style={{
                            width: 16, height: 16, borderRadius: '50%',
                            border: '2px solid rgba(62,38,29,.25)', borderTopColor: 'var(--espresso)',
                            animation: 'spin 0.8s linear infinite', display: 'inline-block',
                        }} />
                    )}
                    {loading ? 'Публикуем...' : 'Опубликовать'}
                </button>
            </form>
        </div>
    );
}