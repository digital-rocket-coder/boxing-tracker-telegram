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


async def start(update: Update, ctx: ContextTypes.DEFAULT_TYPE):
    kb = [[InlineKeyboardButton(
        "🥊 Открыть трекер",
        web_app=WebAppInfo(url=WEBAPP_URL),
    )]]
    await update.message.reply_text(
        "Привет! Нажми кнопку ниже, чтобы открыть трекер занятий 👇",
        reply_markup=InlineKeyboardMarkup(kb),
    )


async def progress(update: Update, ctx: ContextTypes.DEFAULT_TYPE):
    kb = [[InlineKeyboardButton(
        "📊 Мой прогресс",
        web_app=WebAppInfo(url=WEBAPP_URL),
    )]]
    await update.message.reply_text("Открываю твой прогресс:", reply_markup=InlineKeyboardMarkup(kb))


if __name__ == "__main__":
    app = ApplicationBuilder().token(BOT_TOKEN).build()
    app.add_handler(CommandHandler("start",    start))
    app.add_handler(CommandHandler("progress", progress))
    app.run_polling()
