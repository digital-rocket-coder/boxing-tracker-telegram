import hashlib
import hmac
import json
import os
import time
import urllib.parse
from contextlib import asynccontextmanager
from datetime import datetime, timezone
from typing import Optional

from fastapi import Depends, FastAPI, Header, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import sqlite3

BOT_TOKEN = os.getenv("BOT_TOKEN", "")
DB_PATH = os.getenv("DB_PATH", "boxing.db")


# ─── DB ──────────────────────────────────────────────────────────────────────

def get_db():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    try:
        yield conn
    finally:
        conn.close()


def init_db():
    conn = sqlite3.connect(DB_PATH)
    conn.executescript("""
        CREATE TABLE IF NOT EXISTS users (
            id         INTEGER PRIMARY KEY,
            username   TEXT,
            first_name TEXT,
            created_at TEXT DEFAULT (datetime('now'))
        );
        CREATE TABLE IF NOT EXISTS subscriptions (
            id         INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id    INTEGER REFERENCES users(id),
            title      TEXT DEFAULT 'Бокс',
            total      INTEGER DEFAULT 60,
            share_token TEXT UNIQUE,
            created_at TEXT DEFAULT (datetime('now'))
        );
        CREATE TABLE IF NOT EXISTS sessions (
            id              INTEGER PRIMARY KEY AUTOINCREMENT,
            subscription_id INTEGER REFERENCES subscriptions(id),
            session_number  INTEGER NOT NULL,
            completed_at    TEXT,
            UNIQUE(subscription_id, session_number)
        );
        CREATE TABLE IF NOT EXISTS trainer_links (
            user_id    INTEGER REFERENCES users(id),
            trainer_id INTEGER NOT NULL,
            PRIMARY KEY (user_id, trainer_id)
        );
    """)
    conn.commit()
    conn.close()


# ─── Auth ─────────────────────────────────────────────────────────────────────

def validate_init_data(init_data: str) -> dict:
    """Validate Telegram WebApp initData. Returns parsed user dict."""
    if not BOT_TOKEN:
        # Dev mode: allow fake data
        params = dict(urllib.parse.parse_qsl(init_data))
        user_str = params.get("user", "{}")
        return json.loads(user_str) if user_str else {"id": 1, "first_name": "Dev", "username": "dev"}

    params = dict(urllib.parse.parse_qsl(init_data))
    received_hash = params.pop("hash", "")
    check_string = "\n".join(f"{k}={v}" for k, v in sorted(params.items()))
    secret = hmac.new(b"WebAppData", BOT_TOKEN.encode(), hashlib.sha256).digest()
    expected = hmac.new(secret, check_string.encode(), hashlib.sha256).hexdigest()

    if not hmac.compare_digest(expected, received_hash):
        raise HTTPException(status_code=401, detail="Invalid initData")

    auth_date = int(params.get("auth_date", 0))
    if time.time() - auth_date > 86400:
        raise HTTPException(status_code=401, detail="initData expired")

    user_str = params.get("user", "{}")
    return json.loads(user_str)


def get_current_user(authorization: Optional[str] = Header(None), db: sqlite3.Connection = Depends(get_db)):
    if not authorization or not authorization.startswith("tma "):
        # Dev fallback
        tg_user = {"id": 1, "first_name": "Тестовый", "username": "testuser"}
    else:
        init_data = authorization[4:]
        tg_user = validate_init_data(init_data)

    user_id = tg_user["id"]
    existing = db.execute("SELECT id FROM users WHERE id = ?", (user_id,)).fetchone()
    if not existing:
        db.execute(
            "INSERT INTO users (id, username, first_name) VALUES (?, ?, ?)",
            (user_id, tg_user.get("username"), tg_user.get("first_name")),
        )
        db.commit()

    # Ensure subscription exists
    sub = db.execute("SELECT id FROM subscriptions WHERE user_id = ?", (user_id,)).fetchone()
    if not sub:
        token = hashlib.sha256(f"{user_id}{time.time()}".encode()).hexdigest()[:16]
        db.execute(
            "INSERT INTO subscriptions (user_id, title, total, share_token) VALUES (?, ?, ?, ?)",
            (user_id, "Бокс", 60, token),
        )
        db.commit()

    return tg_user


# ─── App ─────────────────────────────────────────────────────────────────────

@asynccontextmanager
async def lifespan(app: FastAPI):
    init_db()
    yield


app = FastAPI(lifespan=lifespan, title="Boxing Tracker API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


def build_progress(user_id: int, db: sqlite3.Connection) -> dict:
    user = db.execute("SELECT * FROM users WHERE id = ?", (user_id,)).fetchone()
    sub = db.execute("SELECT * FROM subscriptions WHERE user_id = ?", (user_id,)).fetchone()
    sessions = db.execute(
        "SELECT session_number, completed_at FROM sessions WHERE subscription_id = ?",
        (sub["id"],),
    ).fetchall()

    completed_map = {s["session_number"]: s["completed_at"] for s in sessions}
    total = sub["total"]
    completed_count = sum(1 for s in sessions if s["completed_at"] is not None)
    cells = []
    for n in range(1, total + 1):
        cells.append({"number": n, "completed": n in completed_map, "completed_at": completed_map.get(n)})

    last_date = None
    done_dates = [s["completed_at"] for s in sessions if s["completed_at"]]
    if done_dates:
        last_date = max(done_dates)

    return {
        "user": {"id": user["id"], "first_name": user["first_name"], "username": user["username"]},
        "subscription": {"id": sub["id"], "title": sub["title"], "total": total, "share_token": sub["share_token"]},
        "stats": {
            "completed": completed_count,
            "remaining": total - completed_count,
            "percent": round(completed_count / total * 100),
            "last_date": last_date,
        },
        "cells": cells,
    }


@app.get("/api/progress")
def get_progress(tg_user=Depends(get_current_user), db=Depends(get_db)):
    return build_progress(tg_user["id"], db)


@app.post("/api/sessions/{number}/complete")
def complete_session(number: int, tg_user=Depends(get_current_user), db=Depends(get_db)):
    sub = db.execute("SELECT id, total FROM subscriptions WHERE user_id = ?", (tg_user["id"],)).fetchone()
    if not sub or not (1 <= number <= sub["total"]):
        raise HTTPException(status_code=400, detail="Invalid session number")
    now = datetime.now(timezone.utc).isoformat()
    db.execute(
        "INSERT INTO sessions (subscription_id, session_number, completed_at) VALUES (?, ?, ?) "
        "ON CONFLICT(subscription_id, session_number) DO UPDATE SET completed_at = excluded.completed_at",
        (sub["id"], number, now),
    )
    db.commit()
    return build_progress(tg_user["id"], db)


@app.delete("/api/sessions/{number}/complete")
def uncomplete_session(number: int, tg_user=Depends(get_current_user), db=Depends(get_db)):
    sub = db.execute("SELECT id FROM subscriptions WHERE user_id = ?", (tg_user["id"],)).fetchone()
    if not sub:
        raise HTTPException(status_code=404)
    db.execute(
        "DELETE FROM sessions WHERE subscription_id = ? AND session_number = ?",
        (sub["id"], number),
    )
    db.commit()
    return build_progress(tg_user["id"], db)


@app.get("/api/progress/share/{token}")
def share_progress(token: str, db=Depends(get_db)):
    sub = db.execute("SELECT * FROM subscriptions WHERE share_token = ?", (token,)).fetchone()
    if not sub:
        raise HTTPException(status_code=404)
    return build_progress(sub["user_id"], db)


@app.post("/api/trainer/link")
def link_trainer(body: dict, tg_user=Depends(get_current_user), db=Depends(get_db)):
    trainer_id = body.get("trainer_id")
    if not trainer_id:
        raise HTTPException(status_code=400, detail="trainer_id required")
    db.execute(
        "INSERT OR IGNORE INTO trainer_links (user_id, trainer_id) VALUES (?, ?)",
        (tg_user["id"], trainer_id),
    )
    db.commit()
    return {"ok": True}
