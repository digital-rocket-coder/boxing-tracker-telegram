/* ─── Config ─────────────────────────────────────────────── */
const API_BASE = window.location.hostname === 'localhost' || window.location.protocol === 'file:'
  ? 'http://localhost:8000'
  : '';  // same origin in production

/* ─── Telegram WebApp ────────────────────────────────────── */
const tg = window.Telegram?.WebApp;
if (tg) {
  tg.ready();
  tg.expand();
}

/* ─── State ──────────────────────────────────────────────── */
let state = null;   // full progress response
let pendingCell = null;

/* ─── DOM refs ───────────────────────────────────────────── */
const $ = id => document.getElementById(id);
const loader   = $('loader');
const main     = $('main');
const dialog   = $('dialog');

/* ─── API ────────────────────────────────────────────────── */
function authHeader() {
  const initData = tg?.initData;
  return initData ? { 'Authorization': `tma ${initData}` } : {};
}

async function apiFetch(method, path, body) {
  const opts = {
    method,
    headers: { 'Content-Type': 'application/json', ...authHeader() },
  };
  if (body !== undefined) opts.body = JSON.stringify(body);
  const res = await fetch(API_BASE + path, opts);
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

/* ─── Render ─────────────────────────────────────────────── */
function render(data) {
  state = data;
  const { user, subscription, stats, cells } = data;

  $('userName').textContent = user.first_name || user.username || 'Боксёр';
  $('subTitle').textContent = subscription.title + ' · ' + subscription.total + ' занятий';

  $('statDone').textContent = stats.completed;
  $('statLeft').textContent = stats.remaining;
  $('statPct').textContent  = stats.percent + '%';

  $('progressFill').style.width  = stats.percent + '%';
  $('progressLabel').textContent = stats.percent + '%';

  const grid = $('grid');
  grid.innerHTML = '';
  cells.forEach(cell => {
    const el = document.createElement('div');
    el.className = 'cell' + (cell.completed ? ' done' : '');
    el.textContent = cell.completed ? '✓' : cell.number;
    el.dataset.number = cell.number;
    el.addEventListener('click', () => onCellClick(cell));
    grid.appendChild(el);
  });

  loader.classList.add('hidden');
  main.classList.remove('hidden');
}

/* ─── Cell click ─────────────────────────────────────────── */
function onCellClick(cell) {
  pendingCell = cell;
  const num = cell.number;

  if (cell.completed) {
    $('dialogTitle').textContent = `Занятие №${num}`;
    $('dialogBody').textContent  = 'Отменить отметку этого занятия?';
    $('btnConfirm').textContent  = 'Да, отменить';
    $('btnConfirm').className    = 'btn-confirm danger';
  } else {
    $('dialogTitle').textContent = `Занятие №${num}`;
    $('dialogBody').textContent  = 'Отметить занятие как выполненное?';
    $('btnConfirm').textContent  = 'Да, занятие прошло';
    $('btnConfirm').className    = 'btn-confirm';
  }

  dialog.classList.remove('hidden');
}

function closeDialog() {
  dialog.classList.add('hidden');
  pendingCell = null;
}

$('btnCancel').addEventListener('click', closeDialog);
$('dialog').addEventListener('click', e => {
  if (e.target === dialog) closeDialog();
});

$('btnConfirm').addEventListener('click', async () => {
  if (!pendingCell) return;
  const { number, completed } = pendingCell;
  closeDialog();

  try {
    let data;
    if (completed) {
      data = await apiFetch('DELETE', `/api/sessions/${number}/complete`);
    } else {
      data = await apiFetch('POST', `/api/sessions/${number}/complete`);
      if (tg?.HapticFeedback) tg.HapticFeedback.notificationOccurred('success');
    }
    render(data);
  } catch (err) {
    console.error(err);
    if (tg?.HapticFeedback) tg.HapticFeedback.notificationOccurred('error');
  }
});

/* ─── Share ──────────────────────────────────────────────── */
$('btnShare').addEventListener('click', () => {
  if (!state) return;
  const { stats, subscription } = state;

  // Build visual progress bar (10 blocks)
  const filled = Math.round(stats.percent / 10);
  const bar = '🟩'.repeat(filled) + '⬜'.repeat(10 - filled);

  let lastDate = '';
  if (stats.last_date) {
    const d = new Date(stats.last_date);
    lastDate = '\nПоследнее занятие: ' + d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' });
  }

  const text =
`🥊 Мой прогресс — ${subscription.title}
━━━━━━━━━━━━━━━━━━
✅ Выполнено: ${stats.completed} из ${subscription.total}
⏳ Осталось: ${stats.remaining} занятий
📊 Прогресс: ${stats.percent}%
${bar}  ${stats.percent}%${lastDate}`;

  if (tg?.switchInlineQuery !== undefined) {
    // Share via Telegram
    tg.switchInlineQuery(text, ['users', 'groups']);
  } else if (navigator.share) {
    navigator.share({ text });
  } else {
    navigator.clipboard?.writeText(text);
    alert('Текст скопирован в буфер обмена!');
  }
});

/* ─── Init ───────────────────────────────────────────────── */
async function init() {
  try {
    const data = await apiFetch('GET', '/api/progress');
    render(data);
  } catch (err) {
    console.error('Failed to load progress:', err);
    // Show demo data when backend is unavailable
    renderDemo();
  }
}

function renderDemo() {
  const cells = Array.from({ length: 60 }, (_, i) => ({
    number: i + 1,
    completed: i < 12,
    completed_at: i < 12 ? new Date().toISOString() : null,
  }));
  render({
    user: { id: 1, first_name: tg?.initDataUnsafe?.user?.first_name || 'Боксёр', username: null },
    subscription: { id: 1, title: 'Бокс', total: 60, share_token: 'demo' },
    stats: { completed: 12, remaining: 48, percent: 20, last_date: new Date().toISOString() },
    cells,
  });
}

init();
