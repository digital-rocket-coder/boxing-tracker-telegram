# Telegram Mini App — Boxing Tracker

Самодостаточный MVP по ТЗ: веб-интерфейс Mini App, API, SQLite-хранилище и публичная read-only ссылка для тренера.

## Запуск

```bash
python3 server.py
```

Откройте:

```text
http://127.0.0.1:8787
```

При первом запуске создаётся демо-абонемент на 60 занятий, из которых 12 уже отмечены.

## Деплой на Vercel

В настройках проекта Vercel выберите папку этого приложения как Root Directory.

Если репозиторий содержит только это приложение, оставьте Root Directory пустым.
Если приложение лежит внутри Obsidian vault, укажите:

```text
outputs/boxing-tracker-telegram
```

Build Command и Output Directory можно оставить пустыми. В корне проекта лежат `index.html`, `app.js` и `styles.css`, поэтому Vercel может отдать приложение без сборки.

На Vercel приложение работает как статический MVP и сохраняет прогресс в браузере через `localStorage`. Для общего хранения между устройствами и тренером подключите внешнюю БД, например Vercel Postgres или Supabase.

## Telegram-режим

Для локальной проверки приложение работает без `BOT_TOKEN` и использует демо-пользователя. В продакшене задайте токен бота:

```bash
BOT_TOKEN=123456:telegram-token python3 server.py
```

После этого API принимает только запросы с валидным Telegram Mini App `initData` в заголовке:

```text
Authorization: tma <initData>
```

## API

- `GET /api/progress`
- `POST /api/sessions/{number}/complete`
- `DELETE /api/sessions/{number}/complete`
- `GET /api/progress/share/{token}`
- `POST /api/trainer/link`

## Что входит в MVP

- счётчики «Отходил / Осталось / Прогресс»;
- прогресс-бар;
- сетка занятий 10 x 6;
- отметка и отмена занятия через подтверждение;
- сохранение прогресса в SQLite;
- Telegram WebApp hooks: `ready`, `expand`, haptic feedback, share;
- read-only режим для тренера по `/share/{token}`;
- адаптация к Telegram CSS-переменным и светлой/тёмной теме.
