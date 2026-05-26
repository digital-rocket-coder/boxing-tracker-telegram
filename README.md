# 🥊 Boxing Tracker — Telegram Mini App

## Структура

```
boxing-tracker/
├── frontend/          # Чистый HTML/CSS/JS (без сборки)
│   ├── index.html
│   ├── style.css
│   └── app.js
└── backend/           # FastAPI + SQLite
    ├── main.py
    ├── bot.py
    └── requirements.txt
```

## Запуск бэкенда

```bash
cd backend
pip install -r requirements.txt
BOT_TOKEN=your_token uvicorn main:app --reload --port 8000
```

## Запуск бота

```bash
cd backend
BOT_TOKEN=your_token WEBAPP_URL=https://your-app.vercel.app python bot.py
```

## Деплой фронтенда (Vercel / Netlify)

Папку `frontend/` деплоить как статику — никакой сборки не нужно.

**Vercel:**
```bash
npx vercel frontend/
```

**Netlify:** перетащить папку `frontend/` в Netlify Drop.

## Настройка бота (BotFather)

1. `/newbot` → получить токен
2. `/setmenubutton` → URL вашего фронтенда
3. Запустить `bot.py` с токеном

## Переменные окружения

| Переменная | Описание |
|---|---|
| `BOT_TOKEN` | Токен бота от BotFather |
| `WEBAPP_URL` | URL задеплоенного фронтенда |
| `DB_PATH` | Путь к SQLite файлу (по умолчанию `boxing.db`) |

## Dev-режим (без токена)

Если `BOT_TOKEN` не задан, сервер пропускает валидацию initData и отдаёт демо-пользователя. Фронтенд при недоступном бэкенде показывает демо-данные (12 из 60).
