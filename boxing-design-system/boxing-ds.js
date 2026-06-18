/* =====================================================================
   BOXING TIMER — Design System  (v1.0)
   ---------------------------------------------------------------------
   Подключение (после React UMD, до твоего text/babel скрипта):

     <script crossorigin src="https://unpkg.com/react@18/umd/react.production.min.js"></script>
     <script crossorigin src="https://unpkg.com/react-dom@18/umd/react-dom.production.min.js"></script>
     <script src="boxing-ds.js"></script>          // <-- этот файл
     <script src="https://unpkg.com/@babel/standalone/babel.min.js"></script>
     <script type="text/babel"> ... твой код ... </script>

   В JSX обращайся через глобал BoxingDS:
     const { tokens, Button, Field, DurationChip, TimerDisplay,
             HeaderBand, RoundBadge, IconButton } = BoxingDS;

   Шрифт: Montserrat — временная замена (оригинал не был передан).
   Поменять шрифт = одна строка в tokens.font ниже.
   ===================================================================== */
(function (global) {
  "use strict";
  var React = global.React;
  if (!React) { console.error("BoxingDS: подключи React ДО boxing-ds.js"); return; }
  var h = React.createElement;
  var useState = React.useState;

  /* ---------------------------------- TOKENS ------------------------- */
  var tokens = {
    color: {
      primary:    "#EDE136", // жёлтый — акцент, кнопки, обводки, таймер
      ink:        "#2D2E36", // графит — панели, текст на жёлтом
      bg:         "#25262D", // базовый фон экрана
      raised:     "#42434A", // чипы, неактивные поверхности
      disabled:   "#817D36", // олива — кнопка/строка до заполнения
      white:      "#FFFFFF", // текст полей, выпадающие списки
      muted:      "#9A9BA5", // вторичный текст, подписи
      borderIdle: "#4A4B53"  // обводка пустого поля
    },
    font:   "'Montserrat', system-ui, -apple-system, sans-serif",
    radius: "4px",                       // углы по умолчанию (острые)
    space:  function (n) { return n * 4 + "px"; }, // шкала отступов: space(4) = 16px
    weight: { regular: 500, label: 700, bold: 800, black: 900 }
  };

  /* --- однократная инъекция шрифта + сброса (вызови BoxingDS.injectGlobal()) */
  var injected = false;
  function injectGlobal() {
    if (injected || typeof document === "undefined") return;
    injected = true;
    var link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = "https://fonts.googleapis.com/css2?family=Montserrat:wght@400;500;600;700;800;900&display=swap";
    document.head.appendChild(link);
    var st = document.createElement("style");
    st.textContent =
      "*{box-sizing:border-box;}" +
      "body{margin:0;background:" + tokens.color.bg + ";font-family:" + tokens.font + ";-webkit-font-smoothing:antialiased;}" +
      "::selection{background:" + tokens.color.primary + ";color:" + tokens.color.ink + ";}";
    document.head.appendChild(st);
  }

  /* ---------------------------------- ICONS -------------------------- */
  function svg(paths, props) {
    props = props || {};
    return h("svg", {
      viewBox: "0 0 24 24", width: props.size || 20, height: props.size || 20,
      fill: "none", stroke: props.stroke || tokens.color.primary,
      strokeWidth: props.sw || 2.4, strokeLinecap: "round", strokeLinejoin: "round"
    }, paths.map(function (d, i) { return h("path", { key: i, d: d }); }));
  }
  var Icons = {
    chevronDown: function (p) { return svg(["M6 9l6 6 6-6"], p); },
    chevronUp:   function (p) { return svg(["M18 15l-6-6-6 6"], p); },
    trash:       function (p) { return svg(["M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13M10 11v6M14 11v6"], Object.assign({ sw: 2 }, p)); }
  };

  /* ---------------------------------- BUTTON ------------------------- */
  // variant: "primary" | "disabled"
  function Button(props) {
    var disabled = props.variant === "disabled" || props.disabled;
    var st = {
      background: disabled ? tokens.color.disabled : tokens.color.primary,
      color: tokens.color.ink, fontFamily: tokens.font, fontWeight: tokens.weight.bold,
      fontSize: props.size || 24, letterSpacing: "1px", textTransform: "uppercase",
      textAlign: "center", padding: "18px", border: "none", width: "100%",
      borderRadius: tokens.radius, cursor: disabled ? "default" : "pointer",
      opacity: disabled ? 0.9 : 1, transition: "filter .12s, transform .06s",
      userSelect: "none"
    };
    return h("button", {
      style: Object.assign(st, props.style), onClick: disabled ? undefined : props.onClick, disabled: disabled
    }, props.children);
  }

  /* ------------------------------ ICON BUTTON ------------------------ */
  // icon: "trash" | "plus" | React node
  function IconButton(props) {
    var size = props.box || 64;
    var inner = props.icon === "trash" ? Icons.trash({ size: 26 })
              : props.icon === "plus"  ? h("span", { style: { color: tokens.color.primary, fontSize: 34, fontWeight: 600, lineHeight: 1 } }, "+")
              : props.icon;
    return h("button", {
      onClick: props.onClick,
      style: Object.assign({
        width: size, height: size, background: tokens.color.raised, border: "none",
        borderRadius: tokens.radius, display: "flex", alignItems: "center",
        justifyContent: "center", cursor: "pointer"
      }, props.style)
    }, inner);
  }

  /* ------------------------------ HEADER BAND ------------------------ */
  function HeaderBand(props) {
    return h("div", {
      style: Object.assign({ background: tokens.color.primary, padding: "22px 20px 26px" }, props.style)
    }, h("span", {
      style: {
        display: "inline-block", color: tokens.color.ink, fontFamily: tokens.font,
        fontWeight: tokens.weight.bold, fontSize: props.size || 26, textTransform: "uppercase",
        letterSpacing: "0.5px", borderBottom: "3px solid " + tokens.color.ink, paddingBottom: "8px"
      }
    }, props.title));
  }

  /* -------------------------------- FIELD ---------------------------- */
  // Раскрывающийся селект.
  // props: { label, value, options:[string], onChange(v) }
  function Field(props) {
    var st = useState(false), open = st[0], setOpen = st[1];
    var hasValue = props.value != null && props.value !== "";
    var active = open || hasValue;
    var border = open ? tokens.color.disabled : (active ? tokens.color.primary : tokens.color.borderIdle);
    var rows = (props.options || []).map(function (opt) {
      var sel = opt === props.value;
      return h("div", {
        key: opt,
        onClick: function () { setOpen(false); props.onChange && props.onChange(opt); },
        style: {
          background: sel ? tokens.color.disabled : "transparent",
          color: sel ? tokens.color.white : "#C9CAD2",
          fontFamily: tokens.font, fontWeight: sel ? 700 : 600, fontSize: 16,
          letterSpacing: "1px", padding: "14px 18px", cursor: "pointer"
        }
      }, opt);
    });
    return h("div", {
      style: Object.assign({ border: "2px solid " + border, borderRadius: tokens.radius, overflow: "hidden" }, props.style)
    },
      h("div", {
        onClick: function () { setOpen(!open); },
        style: {
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "16px 18px", cursor: "pointer"
        }
      },
        h("span", {
          style: {
            color: hasValue ? tokens.color.white : "#C9CAD2", fontFamily: tokens.font,
            fontWeight: 700, fontSize: 16, letterSpacing: "1px", textTransform: "uppercase"
          }
        }, hasValue ? props.value : props.label),
        open ? Icons.chevronUp() : Icons.chevronDown()
      ),
      open ? h("div", null, rows) : null
    );
  }

  /* ----------------------------- DURATION CHIP ----------------------- */
  // props: { primary:"3", secondary:"MIN", selected, onClick, sub:"ТАЙМЕР 1 МИН" }
  function DurationChip(props) {
    var sel = props.selected;
    return h("div", {
      onClick: props.onClick,
      style: Object.assign({
        width: props.size || 96, height: props.size || 96,
        background: sel ? "transparent" : tokens.color.raised,
        border: sel ? "2.5px solid " + tokens.color.primary : "2.5px solid transparent",
        borderRadius: tokens.radius, display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "center", gap: "2px", cursor: "pointer"
      }, props.style)
    },
      h("span", { style: { color: tokens.color.primary, fontFamily: tokens.font, fontWeight: 800, fontSize: 26, lineHeight: 1 } }, props.primary),
      props.secondary ? h("span", { style: { color: tokens.color.primary, fontFamily: tokens.font, fontWeight: 800, fontSize: 13, letterSpacing: "1px" } }, props.secondary) : null,
      props.sub ? h("span", { style: { color: tokens.color.primary, fontFamily: tokens.font, fontWeight: 700, fontSize: 10, textAlign: "center", lineHeight: 1.2, marginTop: 2 } }, props.sub) : null
    );
  }

  /* ----------------------------- ADD CHIP (+) ------------------------ */
  function AddChip(props) {
    return h("div", {
      onClick: props.onClick,
      style: Object.assign({
        width: props.size || 96, height: props.size || 96, background: tokens.color.raised,
        borderRadius: tokens.radius, display: "flex", alignItems: "center",
        justifyContent: "center", color: tokens.color.primary, fontSize: 34, cursor: "pointer"
      }, props.style)
    }, "+");
  }

  /* ------------------------------ ROUND BADGE ------------------------ */
  // props: { count, label }  — тёмный круг + подпись (для жёлтого поля)
  function RoundBadge(props) {
    return h("div", { style: Object.assign({ display: "flex", flexDirection: "column", alignItems: "center", gap: "6px" }, props.style) },
      h("div", {
        style: {
          width: props.size || 56, height: props.size || 56, borderRadius: "50%",
          background: tokens.color.ink, color: tokens.color.white, fontFamily: tokens.font,
          fontWeight: 800, fontSize: 22, display: "flex", alignItems: "center", justifyContent: "center"
        }
      }, props.count),
      h("div", { style: { color: tokens.color.ink, fontFamily: tokens.font, fontWeight: 800, fontSize: 15, letterSpacing: "2px" } }, props.label || "ROUNDS")
    );
  }

  /* ----------------------------- TIMER DISPLAY ----------------------- */
  // props: { count, label, time }  — жёлтое поле с бейджем и большим временем
  function TimerDisplay(props) {
    return h("div", {
      style: Object.assign({
        background: tokens.color.primary, borderRadius: props.flush ? 0 : tokens.radius,
        padding: "30px 20px", display: "flex", flexDirection: "column", alignItems: "center", flex: props.flush ? 1 : "none"
      }, props.style)
    },
      h(RoundBadge, { count: props.count, label: props.label, size: 50 }),
      h("div", {
        style: {
          color: tokens.color.ink, fontFamily: tokens.font, fontWeight: 900,
          fontSize: props.timeSize || 76, lineHeight: 1, letterSpacing: "-1px", marginTop: 12
        }
      }, props.time)
    );
  }

  /* ---------------------------------- EXPORT ------------------------- */
  global.BoxingDS = {
    tokens: tokens, injectGlobal: injectGlobal, Icons: Icons,
    Button: Button, IconButton: IconButton, HeaderBand: HeaderBand,
    Field: Field, DurationChip: DurationChip, AddChip: AddChip,
    RoundBadge: RoundBadge, TimerDisplay: TimerDisplay
  };
})(typeof window !== "undefined" ? window : this);
