import React, { useEffect, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import api, { WS_URL } from './api';

export default function Chat({ user }) {
    const { id } = useParams();
    const [messages, setMessages] = useState([]);
    const [req, setReq] = useState(null);
    const [text, setText] = useState('');
    const wsRef = useRef(null);
    const bottomRef = useRef(null);

    useEffect(() => {
        api.get(`/requests/${id}`).then((r) => setReq(r.data)).catch(console.error);
        api.get(`/requests/${id}/messages`).then((r) => setMessages(r.data)).catch(console.error);
        const token = sessionStorage.getItem('token');
        const ws = new WebSocket(`${WS_URL}/ws/requests/${id}/chat?token=${token}`);
        wsRef.current = ws;
        ws.onmessage = (ev) => {
            const msg = JSON.parse(ev.data);
            if (msg.type === 'message') setMessages((p) => [...p, msg]);
        };
        return () => ws.close();
    }, [id]);

    useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

    const send = (e) => {
        e.preventDefault();
        if (!text.trim() || !wsRef.current) return;
        wsRef.current.send(JSON.stringify({ text }));
        setText('');
    };

    return (
        <div>
            <h2>Чат {req && `по объявлению «${req.item_title}»`}</h2>
            {req && <p style={{ color: '#666' }}>{user.role === 'buyer' ? `Продавец: ${req.seller}` : `Покупатель: ${req.buyer}`}</p>}
            <div className="chat-box">
                <div className="chat-messages">
                    {messages.map((m) => (
                        <div key={m.id} className={`msg ${m.sender === user.username ? 'me' : ''}`}>
                            <div className="bubble">
                                {m.sender !== user.username && <b>{m.sender}: </b>}
                                {m.text}
                            </div>
                        </div>
                    ))}
                    <div ref={bottomRef} />
                </div>
                <form className="chat-form" onSubmit={send}>
                    <input value={text} onChange={(e) => setText(e.target.value)} placeholder="Сообщение..." maxLength={1000} />
                    <button className="btn">Отправить</button>
                </form>
            </div>
        </div>
    );
}