# Boxing Timer — Design System

Визуальный язык приложения боксёрского таймера: цвет, типографика и
готовые React-компоненты. Один файл, без сборки.

## Состав

| Файл | Назначение |
|------|------------|
| `boxing-ds.js` | Дизайн-система: токены + React-компоненты (глобал `BoxingDS`) |
| `showcase.html` | Витрина-документация (открывается двойным кликом, офлайн) |
| `assets/logo.png` | Логотип приложения |

## Подключение (React 18 UMD + Babel Standalone, без сборки)

Порядок важен — `boxing-ds.js` ставится **после React, до Babel**:

```html
<script crossorigin src="https://unpkg.com/react@18/umd/react.production.min.js"></script>
<script crossorigin src="https://unpkg.com/react-dom@18/umd/react-dom.production.min.js"></script>
<script src="boxing-ds.js"></script>
<script src="https://unpkg.com/@babel/standalone/babel.min.js"></script>

<script type="text/babel">
  const { tokens, Button, Field, DurationChip, TimerDisplay,
          HeaderBand, RoundBadge, IconButton, injectGlobal } = BoxingDS;

  injectGlobal(); // подключает шрифт Montserrat + сброс стилей

  function App() {
    return <Button onClick={() => alert("go")}>Start</Button>;
  }
  ReactDOM.createRoot(document.getElementById("root")).render(<App />);
</script>
```

## Токены — `BoxingDS.tokens`

| Токен | Значение | Роль |
|-------|----------|------|
| `color.primary`    | `#EDE136` | акцент, кнопки, обводки, таймер |
| `color.ink`        | `#2D2E36` | панели, текст на жёлтом |
| `color.bg`         | `#25262D` | базовый фон экрана |
| `color.raised`     | `#42434A` | чипы, неактивные поверхности |
| `color.disabled`   | `#817D36` | кнопка/строка до заполнения |
| `color.white`      | `#FFFFFF` | текст полей, списки |
| `color.muted`      | `#9A9BA5` | вторичный текст, подписи |
| `color.borderIdle` | `#4A4B53` | обводка пустого поля |
| `font`             | `'Montserrat', system-ui, sans-serif` | единственная гарнитура |
| `radius`           | `4px` | углы по умолчанию |
| `space(n)`         | `n * 4 px` | шкала отступов |

> **Шрифт:** сейчас Montserrat — временная замена. Заменить везде = одна
> строка `tokens.font` в `boxing-ds.js`.

## Компоненты — `BoxingDS.*`

| Компонент | Пропсы |
|-----------|--------|
| `Button` | `variant` (`primary`/`disabled`), `onClick`, `size`, `children` |
| `IconButton` | `icon` (`trash`/`plus`/node), `onClick` |
| `HeaderBand` | `title` |
| `Field` | `label`, `value`, `options[]`, `onChange(v)` — раскрывающийся селект |
| `DurationChip` | `primary`, `secondary`, `selected`, `onClick`, `sub` |
| `AddChip` | `onClick` |
| `RoundBadge` | `count`, `label` |
| `TimerDisplay` | `count`, `label`, `time`, `timeSize`, `flush` |

## Витрина

Открой `showcase.html` в браузере — палитра, типографика, все компоненты
и примеры экранов на одной странице.

---
v1.0 · June 2026
