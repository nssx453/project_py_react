import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, Link, useNavigate } from 'react-router-dom';
import Login from './Login';
import Register from './Register';
import ItemsList from './ItemsList';
import CreateItem from './CreateItem';
import ItemDetail from './ItemDetail';
import MyRequests from './MyRequests';
import Chat from './Chat';
import Cart from './Cart';
import Notifications from './Notifications';
import Toaster from './Toast';
import { auth } from './api';
import api from './api';

function Header({ user, onLogout, cartCount }) {
  const [q, setQ] = useState('');
  const nav = useNavigate();
  return (
    <div className="header">
      <Link to="/" className="logo">avito<span>mini</span></Link>
      <input
        className="search"
        placeholder="Что ищете?"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        onKeyDown={(e) => e.key === 'Enter' && nav(`/?q=${encodeURIComponent(q)}`)}
      />
      <div className="header-right">
        {user?.role === 'seller' && <Link to="/create" className="btn">+ Разместить</Link>}
        {user?.role === 'buyer' && (
          <Link to="/cart" style={{ position: 'relative', display: 'inline-flex', alignItems: 'center', fontSize: 15 }}>
            Корзина
            {cartCount > 0 && (
              <span key={cartCount} style={{
                marginLeft: 6,
                background: 'var(--dusty-rose)', color: 'var(--espresso)',
                fontSize: 11, fontWeight: 700, borderRadius: 999,
                padding: '1px 6px', animation: 'badgeBounce .35s ease',
              }}>{cartCount}</span>
            )}
          </Link>
        )}
        {user && <Link to="/requests">Запросы</Link>}
        {user && <Notifications user={user} />}
        {user ? (
          <>
            <span className="user-badge">
              {user.username} · {user.role === 'seller' ? 'продавец' : 'покупатель'}
            </span>
            <button className="btn btn-secondary" onClick={onLogout}>Выйти</button>
          </>
        ) : (
          <>
            <Link to="/login" className="btn btn-secondary">Войти</Link>
            <Link to="/register" className="btn">Регистрация</Link>
          </>
        )}
      </div>
    </div>
  );
}

function AppInner() {
  const [user, setUser] = useState(() => {
    const a = auth.get();
    return a.token ? a : null;
  });
  const [cartCount, setCartCount] = useState(0);

  const refreshCart = () => {
    if (!user || user.role !== 'buyer') { setCartCount(0); return; }
    api.get('/cart/').then((r) => setCartCount(r.data.length)).catch(() => setCartCount(0));
  };

  useEffect(() => { refreshCart(); }, [user]);

  useEffect(() => {
    const h = () => refreshCart();
    window.addEventListener('cart:update', h);
    return () => window.removeEventListener('cart:update', h);
  }, [user]);

  const onLogin = (d) => {
    auth.save(d);
    setUser({ token: d.access_token, role: d.role, username: d.username });
  };
  const onLogout = () => { auth.clear(); setUser(null); setCartCount(0); };

  return (
    <>
      <Header user={user} onLogout={onLogout} cartCount={cartCount} />
      <div className="container">
        <Routes>
          <Route path="/" element={<ItemsList user={user} />} />
          <Route path="/items/:id" element={<ItemDetail user={user} />} />
          <Route path="/create" element={user?.role === 'seller' ? <CreateItem /> : <Navigate to="/login" />} />
          <Route path="/requests" element={user ? <MyRequests user={user} /> : <Navigate to="/login" />} />
          <Route path="/requests/:id/chat" element={user ? <Chat user={user} /> : <Navigate to="/login" />} />
          <Route path="/cart" element={user?.role === 'buyer' ? <Cart /> : <Navigate to="/login" />} />
          <Route path="/login" element={<Login onLogin={onLogin} />} />
          <Route path="/register" element={<Register onLogin={onLogin} />} />
        </Routes>
      </div>
      <Toaster />
    </>
  );
}

export default function App() {
  return <Router><AppInner /></Router>;
}