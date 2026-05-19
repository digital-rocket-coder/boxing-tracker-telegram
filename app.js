const tg = window.Telegram?.WebApp;
const state = {
  progress: null,
  pendingSession: null,
  readonly: location.pathname.startsWith("/share/") || new URLSearchParams(location.search).get("readonly") === "1",
};
const storageKey = "boxing-tracker-progress-v1";

const els = {
  studentName: document.querySelector("#studentName"),
  subscriptionTitle: document.querySelector("#subscriptionTitle"),
  modePill: document.querySelector("#modePill"),
  completedCount: document.querySelector("#completedCount"),
  remainingCount: document.querySelector("#remainingCount"),
  progressPercent: document.querySelector("#progressPercent"),
  progressCaption: document.querySelector("#progressCaption"),
  progressFill: document.querySelector("#progressFill"),
  progressTrack: document.querySelector(".progress-track"),
  sessionGrid: document.querySelector("#sessionGrid"),
  lastSession: document.querySelector("#lastSession"),
  shareButton: document.querySelector("#shareButton"),
  copyLinkButton: document.querySelector("#copyLinkButton"),
  dialog: document.querySelector("#confirmDialog"),
  dialogTitle: document.querySelector("#dialogTitle"),
  dialogText: document.querySelector("#dialogText"),
  confirmButton: document.querySelector("#confirmButton"),
  toast: document.querySelector("#toast"),
};

tg?.ready();
tg?.expand();
tg?.setHeaderColor?.("secondary_bg_color");

function authHeaders() {
  return tg?.initData ? { Authorization: `tma ${tg.initData}` } : {};
}

async function api(path, options = {}) {
  const response = await fetch(path, {
    ...options,
    headers: {
      ...authHeaders(),
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
  });
  const contentType = response.headers.get("content-type") || "";
  const payload = contentType.includes("application/json") ? await response.json() : {};
  if (!response.ok) {
    throw new Error(payload.error || "Не удалось выполнить действие.");
  }
  return payload;
}

function makeDemoProgress(savedSessions) {
  const total = 60;
  const sessions = Array.from({ length: total }, (_, index) => {
    const number = index + 1;
    return {
      number,
      completedAt: savedSessions?.[number] || (number <= 12 ? "2026-05-19T00:00:00Z" : null),
    };
  });
  const completed = sessions.filter((session) => session.completedAt).length;
  return {
    student: { firstName: "Павел", username: "paul" },
    subscription: { id: 1, title: "Бокс", total, shareToken: "local-demo" },
    stats: {
      completed,
      remaining: total - completed,
      percent: Math.round((completed / total) * 100),
      lastCompletedAt: [...sessions].reverse().find((session) => session.completedAt)?.completedAt || null,
    },
    sessions,
  };
}

function loadLocalProgress() {
  const saved = JSON.parse(localStorage.getItem(storageKey) || "{}");
  return makeDemoProgress(saved.sessions || null);
}

function saveLocalProgress(progress) {
  const sessions = {};
  progress.sessions.forEach((session) => {
    if (session.completedAt) sessions[session.number] = session.completedAt;
  });
  localStorage.setItem(storageKey, JSON.stringify({ sessions }));
}

async function readProgress() {
  try {
    if (state.readonly) {
      const parts = location.pathname.split("/").filter(Boolean);
      const token = parts[parts.length - 1];
      return await api(`/api/progress/share/${token}`);
    }
    return await api("/api/progress");
  } catch (error) {
    return loadLocalProgress();
  }
}

async function updateSession(number, complete) {
  try {
    return await api(`/api/sessions/${number}/complete`, { method: complete ? "POST" : "DELETE" });
  } catch (error) {
    const progress = loadLocalProgress();
    const session = progress.sessions.find((item) => item.number === number);
    if (session) {
      session.completedAt = complete ? new Date().toISOString() : null;
      const completed = progress.sessions.filter((item) => item.completedAt).length;
      progress.stats.completed = completed;
      progress.stats.remaining = progress.subscription.total - completed;
      progress.stats.percent = Math.round((completed / progress.subscription.total) * 100);
      progress.stats.lastCompletedAt = [...progress.sessions].reverse().find((item) => item.completedAt)?.completedAt || null;
      saveLocalProgress(progress);
    }
    return progress;
  }
}

function formatDate(iso) {
  if (!iso) return "Пока нет";
  return new Intl.DateTimeFormat("ru-RU", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date(iso));
}

function showToast(text) {
  els.toast.textContent = text;
  els.toast.classList.add("is-visible");
  window.clearTimeout(showToast.timer);
  showToast.timer = window.setTimeout(() => els.toast.classList.remove("is-visible"), 2200);
}

function progressTiles(completed, total) {
  const filled = Math.round((completed / total) * 10);
  return `${"🟩".repeat(filled)}${"⬜".repeat(10 - filled)}`;
}

function buildReport() {
  const { stats, subscription } = state.progress;
  return [
    "🥊 Мой прогресс — Бокс",
    "━━━━━━━━━━━━━━━━━━",
    `✅ Выполнено: ${stats.completed} из ${subscription.total}`,
    `⏳ Осталось: ${stats.remaining} занятий`,
    `📊 Прогресс: ${stats.percent}%`,
    `${progressTiles(stats.completed, subscription.total)}  ${stats.percent}%`,
    "",
    `Последнее занятие: ${formatDate(stats.lastCompletedAt)}`,
  ].join("\n");
}

function shareUrl() {
  const token = state.progress?.subscription?.shareToken;
  return `${location.origin}/share/${token}`;
}

function render() {
  const { student, subscription, stats, sessions } = state.progress;
  els.studentName.textContent = student.firstName || "Ученик";
  els.subscriptionTitle.textContent = `${subscription.title}, ${subscription.total} занятий`;
  els.modePill.textContent = state.readonly ? "Тренер" : "Ученик";
  els.completedCount.textContent = stats.completed;
  els.remainingCount.textContent = stats.remaining;
  els.progressPercent.textContent = `${stats.percent}%`;
  els.progressCaption.textContent = `${stats.completed} из ${subscription.total}`;
  els.progressFill.style.width = `${stats.percent}%`;
  els.progressTrack.setAttribute("aria-valuenow", String(stats.percent));
  els.lastSession.textContent = formatDate(stats.lastCompletedAt);
  els.shareButton.disabled = state.readonly;
  els.shareButton.textContent = state.readonly ? "Режим просмотра" : "Отправить тренеру";

  els.sessionGrid.replaceChildren(
    ...sessions.map((session) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = `session-cell${session.completedAt ? " is-complete" : ""}${state.readonly ? " is-readonly" : ""}`;
      button.textContent = session.completedAt ? "✓" : session.number;
      button.setAttribute("aria-label", session.completedAt
        ? `Занятие ${session.number} выполнено ${formatDate(session.completedAt)}`
        : `Занятие ${session.number} предстоит`);
      button.disabled = state.readonly;
      button.addEventListener("click", () => openConfirm(session));
      return button;
    }),
  );
}

function openConfirm(session) {
  state.pendingSession = session;
  const complete = Boolean(session.completedAt);
  els.dialogTitle.textContent = complete ? `Отменить занятие №${session.number}?` : `Отметить занятие №${session.number}?`;
  els.dialogText.textContent = complete
    ? `Сейчас оно отмечено как пройденное: ${formatDate(session.completedAt)}.`
    : `Отметить занятие №${session.number} как выполненное?`;
  els.confirmButton.textContent = complete ? "Да, отменить" : "Да, занятие прошло";
  els.dialog.showModal();
}

async function applySessionChange() {
  const session = state.pendingSession;
  if (!session) return;
  const complete = Boolean(session.completedAt);
  state.progress = await updateSession(session.number, !complete);
  render();
  tg?.HapticFeedback?.notificationOccurred?.(complete ? "warning" : "success");
  showToast(complete ? `Занятие №${session.number} снова открыто` : `Занятие №${session.number} отмечено`);
}

async function shareProgress() {
  const report = buildReport();
  const text = `${report}\n\n${shareUrl()}`;
  if (tg?.openTelegramLink) {
    tg.openTelegramLink(`https://t.me/share/url?url=${encodeURIComponent(shareUrl())}&text=${encodeURIComponent(report)}`);
    return;
  }
  if (navigator.share) {
    await navigator.share({ title: "Мой прогресс — Бокс", text, url: shareUrl() });
    return;
  }
  await navigator.clipboard.writeText(text);
  showToast("Отчёт скопирован");
}

async function copyTrainerLink() {
  await navigator.clipboard.writeText(shareUrl());
  showToast("Ссылка для тренера скопирована");
}

async function load() {
  try {
    state.progress = await readProgress();
    render();
  } catch (error) {
    showToast(error.message);
  }
}

els.dialog.addEventListener("close", () => {
  if (els.dialog.returnValue === "confirm") {
    applySessionChange().catch((error) => showToast(error.message));
  }
  state.pendingSession = null;
});

els.shareButton.addEventListener("click", () => {
  if (!state.readonly) shareProgress().catch((error) => showToast(error.message));
});
els.copyLinkButton.addEventListener("click", () => copyTrainerLink().catch((error) => showToast(error.message)));

load();
