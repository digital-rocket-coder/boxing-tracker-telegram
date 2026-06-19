"""
Telegram bot entry point.
Run: BOT_TOKEN=xxx WEBAPP_URL=https://your-app.vercel.app python bot.py
"""
import os
import logging
from telegram import Update, InlineKeyboardButton, InlineKeyboardMarkup, WebAppInfo
from telegram.ext import ApplicationBuilder, CommandHandler, ContextTypes

logging.basicConfig(level=logging.INFO)

BOT_TOKEN  = os.environ["BOT_TOKEN"]
WEBAPP_URL = os.environ.get("WEBAPP_URL", "https://your-app.vercel.app")
TIMER_URL  = WEBAPP_URL.rstrip("/") + "/timer.html"


async def start(update: Update, ctx: ContextTypes.DEFAULT_TYPE):
    kb = [
        [InlineKeyboardButton("⏱ Таймер", web_app=WebAppInfo(url=TIMER_URL))],
        [InlineKeyboardButton("🥊 Трекер", web_app=WebAppInfo(url=WEBAPP_URL))],
    ]
    await update.message.reply_text(
        "Привет! Выбери что открыть 👇",
        reply_markup=InlineKeyboardMarkup(kb),
    )


async def timer(update: Update, ctx: ContextTypes.DEFAULT_TYPE):
    kb = [[InlineKeyboardButton("⏱ Открыть таймер", web_app=WebAppInfo(url=TIMER_URL))]]
    await update.message.reply_text("Боксёрский таймер 🥊", reply_markup=InlineKeyboardMarkup(kb))


async def progress(update: Update, ctx: ContextTypes.DEFAULT_TYPE):
    kb = [[InlineKeyboardButton("📊 Мой прогресс", web_app=WebAppInfo(url=WEBAPP_URL))]]
    await update.message.reply_text("Открываю твой прогресс:", reply_markup=InlineKeyboardMarkup(kb))


if __name__ == "__main__":
    app = ApplicationBuilder().token(BOT_TOKEN).build()
    app.add_handler(CommandHandler("start",    start))
    app.add_handler(CommandHandler("timer",    timer))
    app.add_handler(CommandHandler("progress", progress))
    app.run_polling()
