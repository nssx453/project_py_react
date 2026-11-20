import os, asyncio, random, shutil, json
from contextlib import asynccontextmanager
from datetime import datetime, timedelta, timezone
from itertools import count

from fastapi import (FastAPI, WebSocket, WebSocketDisconnect, UploadFile, File,
                     Form, Depends, HTTPException, Request)
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from fastapi.staticfiles import StaticFiles
from fastapi.responses import StreamingResponse
from jose import JWTError, jwt
from pydantic import BaseModel
import bcrypt

KEY, ALG = "ddd", "HS256"
UPLOAD = "uploads"
os.makedirs(UPLOAD, exist_ok=True)

users, items, reqs, msgs = {}, [], [], []
carts, notifs, sse, chats = {}, {}, {}, {}
uid, rid, mid, nid = count(1), count(1), count(1), count(1)

def now(): return datetime.now(timezone.utc).isoformat()
def hp(p): return bcrypt.hashpw(p.encode(), bcrypt.gensalt()).decode()
def cp(p, h):
    try: return bcrypt.checkpw(p.encode(), h.encode())
    except: return False

def token(u, r):
    exp = datetime.now(timezone.utc) + timedelta(minutes=180)
    return jwt.encode({"sub": u, "role": r, "exp": exp}, KEY, algorithm=ALG)

def decode(t):
    try: return jwt.decode(t, KEY, algorithms=[ALG])
    except JWTError: raise HTTPException(401, "Invalid token")

oauth = OAuth2PasswordBearer(tokenUrl="token", auto_error=False)

async def me(t: str = Depends(oauth)):
    if not t: raise HTTPException(401, "Not authenticated")
    u = decode(t).get("sub")
    if u not in users: raise HTTPException(401, "User not found")
    return {"username": u, "role": users[u]["role"]}

def role(r):
    async def f(u=Depends(me)):
        if u["role"] != r: raise HTTPException(403, f"Только {r}")
        return u
    return f

class RegIn(BaseModel):
    username: str
    password: str
    role: str

FAKE = [
    ("iPhone 13, 128GB", "Отличное состояние.", 45000, "https://i.pinimg.com/736x/05/0f/14/050f14ef6523532a74162ddb483ed715.jpg", "AppleStore"),
    ("MacBook Air M1", "Идеальное, 8/256.", 62000, "https://i.pinimg.com/736x/d6/8f/36/d68f3667a9661426665af41afb5504d4.jpg", "TechnoShop"),
    ("Кроссовки Nike", "Оригинал, 42.", 8500, "https://i.pinimg.com/736x/2e/69/c1/2e69c1e4e2e60e7d41a16648fb3c7705.jpg", "SportZone"),
    ("Велосипед", "Алюминий, 21 скорость.", 15000, "https://i.pinimg.com/736x/d7/6e/8a/d76e8a1d067c8095bdb177b4842cf591.jpg", "VeloMir"),
    ("Кофемашина", "Работает идеально.", 12000, "https://i.pinimg.com/1200x/56/a7/3c/56a73c49fa0b545091e12cdc26d3c89f.jpg", "HomeAppl"),
    ("Пальто", "Женское, M.", 4000, "https://i.pinimg.com/736x/73/b8/9e/73b89e7902b54a7b2a3c4b0341a3f12f.jpg", "FashionHouse"),
    ("PlayStation 5", "Дисковая, 2 геймпада.", 55000, "https://i.pinimg.com/736x/1c/df/ae/1cdfaea381543192fe207cb236ea9055.jpg", "GameStore"),
    ("Стол", "Дуб, 120x60.", 6500, "https://i.pinimg.com/736x/bc/dc/85/bcdc85fe3cb8673a0289adcde9ab1d1c.jpg", "Mebel"),
]

@asynccontextmanager
async def life(app):
    for t, d, p, i, o in FAKE:
        users.setdefault(o, {"hash": hp("123456"), "role": "seller"})
        items.append({"id": next(uid), "title": t, "description": d,
                      "price": p, "image_url": i, "owner": o})
    yield

app = FastAPI(lifespan=life)
app.add_middleware(CORSMiddleware, allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
                   allow_credentials=True, allow_methods=["*"], allow_headers=["*"])
app.mount("/uploads", StaticFiles(directory=UPLOAD), name="uploads")

def push(u, data):
    for q in list(sse.get(u, [])):
        try: q.put_nowait(data)
        except: pass

def notify(u, kind, text):
    n = {"id": next(nid), "kind": kind, "text": text, "link": "/requests",
         "read": False, "created_at": now()}
    notifs.setdefault(u, []).append(n)
    push(u, {"kind": "notification", **n})

@app.get("/sse/requests")
async def stream(req: Request, token: str):
    try: u = decode(token)["sub"]
    except HTTPException: raise HTTPException(401, "Invalid token")
    if u not in users: raise HTTPException(401, "User not found")
    q = asyncio.Queue()
    sse.setdefault(u, []).append(q)

    async def gen():
        try:
            yield f"event: hello\ndata: {u}\n\n"
            while not await req.is_disconnected():
                try: yield f"data: {json.dumps(await asyncio.wait_for(q.get(), 15), ensure_ascii=False)}\n\n"
                except asyncio.TimeoutError: yield ": ping\n\n"
        finally:
            if q in sse.get(u, []): sse[u].remove(q)

    return StreamingResponse(gen(), media_type="text/event-stream",
                             headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"})

@app.get("/notifications/")
async def list_n(u=Depends(me)): return list(reversed(notifs.get(u["username"], [])))

@app.post("/notifications/read")
async def read_all(u=Depends(me)):
    for n in notifs.get(u["username"], []): n["read"] = True
    return {"ok": True}

@app.delete("/notifications/")
async def clear_n(u=Depends(me)):
    notifs[u["username"]] = []
    return {"ok": True}

@app.post("/register")
async def register(d: RegIn):
    if not (3 <= len(d.username) <= 20) or len(d.password) < 6:
        raise HTTPException(422, "Логин 3-20, пароль 6+")
    if " " in d.username: raise HTTPException(422, "Без пробелов")
    if d.role not in ("buyer", "seller"): raise HTTPException(422, "Роль buyer/seller")
    if d.username in users: raise HTTPException(400, "Занят")
    users[d.username] = {"hash": hp(d.password), "role": d.role}
    return {"access_token": token(d.username, d.role), "token_type": "bearer",
            "username": d.username, "role": d.role}

@app.post("/token")
async def login(f: OAuth2PasswordRequestForm = Depends()):
    u = users.get(f.username)
    if not u or not cp(f.password, u["hash"]): raise HTTPException(401, "Неверно")
    return {"access_token": token(f.username, u["role"]), "token_type": "bearer",
            "username": f.username, "role": u["role"]}

@app.get("/users/me")
async def me_info(u=Depends(me)): return u

@app.post("/items/")
async def create_item(title: str = Form(...), description: str = Form(""),
                      price: float = Form(...), file: UploadFile = File(...),
                      u=Depends(role("seller"))):
    if len(title.strip()) < 3: raise HTTPException(422, "Название 3+")
    if not (0 < price <= 10_000_000): raise HTTPException(422, "Цена 0-10M")
    if not file.content_type or not file.content_type.startswith("image/"):
        raise HTTPException(422, "Только фото")
    safe = f"{datetime.now().strftime('%Y%m%d%H%M%S%f')}_{file.filename}"
    with open(os.path.join(UPLOAD, safe), "wb") as f: shutil.copyfileobj(file.file, f)
    item = {"id": next(uid), "title": title.strip(), "description": description.strip(),
            "price": round(price, 2), "image_url": f"/uploads/{safe}", "owner": u["username"]}
    items.append(item)
    return item

@app.get("/items/")
async def list_items(): return items

@app.get("/items/{item_id}")
async def get_item(item_id: int):
    for it in items:
        if it["id"] == item_id: return it
    raise HTTPException(404)

@app.get("/cart/")
async def get_cart(u=Depends(role("buyer"))):
    return [{"item_id": i["id"], "title": i["title"], "price": i["price"],
             "image_url": i["image_url"], "owner": i["owner"]}
            for i in items if i["id"] in carts.get(u["username"], [])]

@app.post("/cart/checkout/all")
async def checkout(u=Depends(role("buyer"))):
    ids = list(carts.get(u["username"], []))
    if not ids: raise HTTPException(400, "Пусто")
    n = 0
    for iid in ids:
        it = next((x for x in items if x["id"] == iid), None)
        if not it: continue
        if any(r["item_id"] == iid and r["buyer"] == u["username"] and r["status"] == "pending" for r in reqs):
            continue
        mk_req(it, u["username"]); n += 1
    carts[u["username"]] = []
    return {"created": n}

@app.post("/cart/{item_id}")
async def add_cart(item_id: int, u=Depends(role("buyer"))):
    it = next((x for x in items if x["id"] == item_id), None)
    if not it: raise HTTPException(404)
    if it["owner"] == u["username"]: raise HTTPException(400, "Свой товар нельзя")
    lst = carts.setdefault(u["username"], [])
    if item_id in lst: raise HTTPException(400, "Уже в корзине")
    lst.append(item_id); return {"ok": True}

@app.delete("/cart/{item_id}")
async def del_cart(item_id: int, u=Depends(role("buyer"))):
    lst = carts.get(u["username"], [])
    if item_id in lst: lst.remove(item_id)
    return {"ok": True}

def mk_req(item, buyer):
    r = {"id": next(rid), "item_id": item["id"], "item_title": item["title"],
         "buyer": buyer, "seller": item["owner"], "status": "pending", "created_at": now()}
    reqs.append(r)
    purchase.bump(item["id"], True)
    push(item["owner"], {"kind": "new_request", **r})
    notify(item["owner"], "new_request", f"Запрос на «{item['title']}» от {buyer}")
    return r

@app.post("/items/{item_id}/requests")
async def create_req(item_id: int, u=Depends(role("buyer"))):
    it = next((x for x in items if x["id"] == item_id), None)
    if not it: raise HTTPException(404)
    if it["owner"] == u["username"]: raise HTTPException(400, "Свой товар")
    if any(r["item_id"] == item_id and r["buyer"] == u["username"] and r["status"] == "pending" for r in reqs):
        raise HTTPException(400, "Уже отправлен")
    return mk_req(it, u["username"])

@app.get("/requests/")
async def my_reqs(u=Depends(me)):
    k = "buyer" if u["role"] == "buyer" else "seller"
    return [r for r in reqs if r[k] == u["username"]]

def get_r(rid_):
    r = next((x for x in reqs if x["id"] == rid_), None)
    if not r: raise HTTPException(404)
    return r

@app.post("/requests/{rid_}/accept")
async def accept(rid_: int, u=Depends(role("seller"))):
    r = get_r(rid_)
    if r["seller"] != u["username"]: raise HTTPException(403)
    r["status"] = "accepted"
    push(r["buyer"], {"kind": "status_changed", **r})
    notify(r["buyer"], "accepted", f"Принят: «{r['item_title']}»")
    return r

@app.post("/requests/{rid_}/reject")
async def reject(rid_: int, u=Depends(role("seller"))):
    r = get_r(rid_)
    if r["seller"] != u["username"]: raise HTTPException(403)
    r["status"] = "rejected"
    push(r["buyer"], {"kind": "status_changed", **r})
    notify(r["buyer"], "rejected", f"Отклонён: «{r['item_title']}»")
    return r

@app.get("/requests/{rid_}")
async def get_one(rid_: int, u=Depends(me)):
    r = get_r(rid_)
    if u["username"] not in (r["buyer"], r["seller"]): raise HTTPException(403)
    return r

@app.get("/requests/{rid_}/messages")
async def get_msgs(rid_: int, u=Depends(me)):
    r = get_r(rid_)
    if u["username"] not in (r["buyer"], r["seller"]): raise HTTPException(403)
    return [m for m in msgs if m["request_id"] == rid_]

class Purchase:
    def __init__(self): self.c, self.t, self.n = {}, {}, {}

    async def connect(self, ws, iid):
        await ws.accept()
        self.c.setdefault(iid, []).append(ws)
        self.n.setdefault(iid, random.randint(5, 20))
        await ws.send_json({"type": "init", "count": self.n[iid], "timestamp": now()})
        if iid not in self.t or self.t[iid].done():
            self.t[iid] = asyncio.create_task(self.sim(iid))

    def disconnect(self, ws, iid):
        a = self.c.get(iid, [])
        if ws in a: a.remove(ws)
        if not a:
            self.c.pop(iid, None)
            t = self.t.pop(iid, None)
            if t: t.cancel()

    async def send(self, iid, m):
        for c in list(self.c.get(iid, [])):
            try: await c.send_json(m)
            except: self.disconnect(c, iid)

    async def sim(self, iid):
        try:
            while True:
                await asyncio.sleep(random.uniform(4, 9))
                self.n[iid] += 1
                await self.send(iid, {"type": "update", "count": self.n[iid],
                                      "timestamp": now(), "fake": True})
        except asyncio.CancelledError: pass

    def bump(self, iid, real=False):
        self.n[iid] = self.n.get(iid, 0) + 1
        async def go():
            await self.send(iid, {"type": "update", "count": self.n[iid],
                                  "timestamp": now(), "fake": not real})
        asyncio.create_task(go())

purchase = Purchase()

@app.websocket("/ws/items/{item_id}/purchases")
async def ws_buy(ws: WebSocket, item_id: int):
    await purchase.connect(ws, item_id)
    try:
        while True: await ws.receive_text()
    except WebSocketDisconnect: purchase.disconnect(ws, item_id)

@app.websocket("/ws/requests/{rid_}/chat")
async def ws_chat(ws: WebSocket, rid_: int, token: str):
    try: u = decode(token)["sub"]
    except HTTPException: await ws.close(4001); return
    r = next((x for x in reqs if x["id"] == rid_), None)
    if not r or u not in (r["buyer"], r["seller"]): await ws.close(4003); return
    await ws.accept()
    chats.setdefault(rid_, []).append(ws)
    try:
        while True:
            d = await ws.receive_json()
            text = (d.get("text") or "").strip()[:1000]
            if not text: continue
            m = {"id": next(mid), "request_id": rid_, "sender": u, "text": text, "timestamp": now()}
            msgs.append(m)
            for c in list(chats.get(rid_, [])):
                try: await c.send_json({"type": "message", **m})
                except: pass
    except WebSocketDisconnect:
        if ws in chats.get(rid_, []): chats[rid_].remove(ws)