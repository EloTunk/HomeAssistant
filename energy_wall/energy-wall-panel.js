/*
 * Energy Wall – Home Assistant custom panel for a landscape wall tablet.
 * Designed for 1920×1200 but scales with its container (everything is in em).
 *
 * Register with panel_custom (see README.md). All entity IDs are placeholders:
 * override them under `config.entities` in configuration.yaml.
 */

const FONTS_CSS =
  "https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600&family=Unbounded:wght@500&display=swap";

const DEFAULTS = {
  theme: "auto", // auto (sunrise/sunset) | dark | light
  fonts_css: FONTS_CSS, // point at a self-hosted CSS file for offline tablets
  active_w: 50, // below this a source counts as idle (no glow)
  battery_warn: 20, // % – amber
  battery_crit: 10, // % – red
  grid_warn_w: 5000, // W imported – amber
  grid_crit_w: 9000, // W imported – red
  ev_charging_w: 100, // W above which the EV counts as charging
  arm_seconds: 4, // window for the second tap
  battery_charge_positive: true, // battery_power > 0 means charging
  grid_import_positive: true, // grid_power > 0 means importing
  sun_entity: "sun.sun",
  entities: {
    solar_power: "sensor.solar_power", // W or kW
    solar_today: "sensor.solar_energy_today", // kWh (optional)
    battery_soc: "sensor.battery_soc", // %
    battery_power: "sensor.battery_power", // W or kW
    home_power: "sensor.home_power", // W or kW
    grid_power: "sensor.grid_power", // W or kW
    ev_power: "sensor.ev_charger_power", // W or kW
    ev_switch: "switch.ev_charger", // start / stop charging
    ev_soc: "", // optional, %
  },
};

const HISTORY_BUCKETS = 96; // 24 h × 15 min
const HISTORY_REFRESH_MS = 10 * 60 * 1000;

const ICONS = {
  sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',
  battery:
    '<rect x="2" y="7" width="17" height="10" rx="2.5"/><path d="M22 11v2"/><path d="M6 12h6"/>',
  home: '<path d="M3 11.5 12 4l9 7.5"/><path d="M5.5 10v9.5h13V10"/><path d="M10 19.5v-5h4v5"/>',
  grid: '<path d="M12 3v18"/><path d="M7 21l5-18 5 18"/><path d="M8.5 9h7M7.5 14h9"/>',
  bolt: '<path d="M13 2 5 13.5h6L10 22l8-11.5h-6z"/>',
  sunrise:
    '<path d="M4 18h16M7 14a5 5 0 0 1 10 0"/><path d="M12 6V3M5.6 8.6 4 7M18.4 8.6 20 7"/>',
  moon: '<path d="M20 14.5A8 8 0 0 1 9.5 4 8 8 0 1 0 20 14.5z"/>',
  alert:
    '<path d="M12 3 2.5 20h19z"/><path d="M12 10v4.5M12 17.5v.01"/>',
  close: '<path d="M6 6l12 12M18 6 6 18"/>',
};

const icon = (name) =>
  `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONS[name]}</svg>`;

const CARDS = [
  { key: "solar", label: "Solar", icon: "sun", span: 4 },
  { key: "home", label: "Home", icon: "home", span: 4 },
  { key: "battery", label: "Battery", icon: "battery", span: 4 },
  { key: "grid", label: "Grid", icon: "grid", span: 6 },
  { key: "ev", label: "EV", icon: "bolt", span: 6 },
];

const STYLE = `
:host {
  display: block;
  position: relative;
  height: 100vh;
  container-type: size;
  overflow: hidden;
  font-family: "Plus Jakarta Sans", system-ui, -apple-system, "Segoe UI", sans-serif;
  --solar: #fbbf24;
  --battery: #34d399;
  --home: #38bdf8;
  --grid: #94a3b8;
  --ev: #2dd4bf;
  --warn: #f59e0b;
  --crit: #ef4444;
  --ease: cubic-bezier(.2,.8,.2,1);
  /* light palette is the base; dark swaps the roles */
  --bg: #eef3f8;
  --text: #0f172a;
  --dim: rgba(15,23,42,.6);
  --card: rgba(255,255,255,.58);
  --card-edge: rgba(255,255,255,.85);
  --card-line: rgba(15,23,42,.07);
  --track: rgba(15,23,42,.09);
  --sheet: rgba(248,251,254,.82);
  --scrim: rgba(15,23,42,.28);
  --shadow: 0 1.2em 3em -1.4em rgba(30,58,95,.28);
  --ic-mix: #000;
  --ic-mix-pct: 30%;
  --glow-pct: 42%;
  --amb-a: rgba(251,191,36,.20);
  --amb-b: rgba(56,189,248,.20);
  color-scheme: light;
}
:host([data-theme="dark"]) {
  --bg: #080b11;
  --text: #f1f5f9;
  --dim: rgba(226,232,240,.56);
  --card: rgba(255,255,255,.05);
  --card-edge: rgba(255,255,255,.10);
  --card-line: rgba(255,255,255,.04);
  --track: rgba(255,255,255,.09);
  --sheet: rgba(18,24,36,.80);
  --scrim: rgba(2,4,8,.6);
  --shadow: 0 1.4em 3.4em -1.4em rgba(0,0,0,.7);
  --ic-mix: #fff;
  --ic-mix-pct: 0%;
  --glow-pct: 55%;
  --amb-a: rgba(251,191,36,.07);
  --amb-b: rgba(56,189,248,.08);
  color-scheme: dark;
}
* { box-sizing: border-box; margin: 0; -webkit-tap-highlight-color: transparent; }
button { font: inherit; color: inherit; }

.stage {
  position: absolute; inset: 0;
  font-size: max(11px, min(0.8333cqw, 1.3333cqh)); /* 16px at 1920×1200 */
  color: var(--text);
  background:
    radial-gradient(60em 40em at 8% 0%, var(--amb-a), transparent 70%),
    radial-gradient(60em 44em at 100% 100%, var(--amb-b), transparent 70%),
    var(--bg);
  padding: 2.5em 3.5em 3em;
  display: grid;
  grid-template-rows: auto 1fr;
  gap: 2em;
  transition: background-color .9s ease, color .9s ease;
}

/* header */
header { display: flex; align-items: center; justify-content: space-between; gap: 2em; min-height: 4.5em; }
.clock { font-family: "Unbounded", sans-serif; font-weight: 500; font-size: 3.4em; letter-spacing: -.02em; line-height: 1; }
.date { color: var(--dim); font-size: 1.15em; margin-top: .5em; }
.sunline { display: flex; align-items: center; gap: .7em; color: var(--dim); font-size: 1.1em; }
.sunline svg { width: 1.6em; height: 1.6em; }
.banner {
  flex: 1; max-width: 46em; min-height: 4em; padding: 0 1.6em; display: flex; align-items: center; gap: 1em;
  border-radius: 2em; font-weight: 600; font-size: 1.15em;
  background: color-mix(in srgb, var(--warn) 16%, var(--card));
  border: 1px solid color-mix(in srgb, var(--warn) 55%, transparent);
  animation: rise .5s var(--ease);
}
.banner svg { width: 1.7em; height: 1.7em; flex: none; color: var(--warn); }
.banner small { margin-left: auto; color: var(--dim); font-weight: 500; white-space: nowrap; }
.banner.crit { background: color-mix(in srgb, var(--crit) 16%, var(--card)); border-color: color-mix(in srgb, var(--crit) 60%, transparent); }
.banner.crit svg { color: var(--crit); }

/* card grid */
main { display: grid; grid-template-columns: repeat(12, 1fr); grid-template-rows: 1fr 1fr; gap: 1.75em; min-height: 0; }
.card {
  --c: var(--grid);
  position: relative; min-height: 0; display: flex; flex-direction: column; text-align: left;
  padding: 2em 2.2em 1.8em;
  border-radius: 1.625em; /* 26px at 1920×1200 */
  background: var(--card);
  border: 1px solid var(--card-edge);
  box-shadow: var(--shadow), inset 0 0 0 1px var(--card-line);
  -webkit-backdrop-filter: blur(1.6em) saturate(1.4); backdrop-filter: blur(1.6em) saturate(1.4);
  cursor: pointer; overflow: hidden;
  transition: box-shadow .8s ease, border-color .6s ease, transform .25s var(--ease), background-color .9s ease;
  font: inherit; color: inherit; width: 100%;
}
.card:active { transform: scale(.985); }
.card:focus-visible { outline: 3px solid var(--c); outline-offset: 3px; }
.card[data-key="solar"] { --c: var(--solar); }
.card[data-key="battery"] { --c: var(--battery); }
.card[data-key="home"] { --c: var(--home); }
.card[data-key="grid"] { --c: var(--grid); }
.card[data-key="ev"] { --c: var(--ev); }
.card.active {
  box-shadow: var(--shadow), 0 0 4.5em -1em color-mix(in srgb, var(--c) var(--glow-pct), transparent), inset 0 0 0 1px color-mix(in srgb, var(--c) 35%, transparent);
}
.card.warn { border-color: color-mix(in srgb, var(--warn) 65%, transparent); }
.card.crit { border-color: color-mix(in srgb, var(--crit) 70%, transparent); }
.card.na .value, .card.na .unit { opacity: .35; }

.top { display: flex; align-items: center; gap: .9em; }
.badge {
  width: 3em; height: 3em; border-radius: 1em; display: grid; place-items: center; flex: none;
  color: color-mix(in srgb, var(--c) 100%, var(--ic-mix) var(--ic-mix-pct));
  background: color-mix(in srgb, var(--c) 16%, transparent);
}
.badge svg { width: 1.6em; height: 1.6em; }
.card.active .badge { animation: breathe 3.6s ease-in-out infinite; }
.label { color: var(--dim); font-size: 1.15em; font-weight: 500; letter-spacing: .02em; }
.chip {
  margin-left: auto; padding: .35em .9em; border-radius: 2em; font-size: .95em; font-weight: 600;
  background: color-mix(in srgb, var(--warn) 20%, transparent); color: var(--text);
  border: 1px solid color-mix(in srgb, var(--warn) 55%, transparent);
}
.card.crit .chip { background: color-mix(in srgb, var(--crit) 20%, transparent); border-color: color-mix(in srgb, var(--crit) 60%, transparent); }
.chip:empty { display: none; }

.reading { margin-top: auto; display: flex; align-items: baseline; gap: .35em; }
.value { font-family: "Unbounded", sans-serif; font-weight: 500; font-size: 5.6em; line-height: 1; letter-spacing: -.03em; font-variant-numeric: tabular-nums; }
.unit { font-family: "Unbounded", sans-serif; font-weight: 500; font-size: 1.7em; color: var(--dim); }
.sub { color: var(--dim); font-size: 1.2em; margin-top: .7em; min-height: 1.4em; }

.spark { position: absolute; right: 0; left: 0; bottom: 0; height: 38%; pointer-events: none; opacity: .9; }
.spark path.line { fill: none; stroke: var(--c); stroke-width: 2.2; stroke-linejoin: round; vector-effect: non-scaling-stroke; opacity: .55; }
.card > *:not(.spark) { position: relative; }

.meter { height: .7em; border-radius: 1em; background: var(--track); margin-top: 1.1em; overflow: hidden; }
.meter i { display: block; height: 100%; width: 0; border-radius: inherit; background: var(--c); transition: width 1s var(--ease), background-color .6s ease; }
.card.warn .meter i { background: var(--warn); }
.card.crit .meter i { background: var(--crit); }

/* EV action */
.ev-action {
  position: relative; overflow: hidden; margin-top: 1.4em; min-height: 4.2em; border-radius: 2.1em; width: 100%;
  border: 1px solid color-mix(in srgb, var(--ev) 45%, transparent);
  background: color-mix(in srgb, var(--ev) 14%, transparent);
  font-weight: 600; font-size: 1.25em; cursor: pointer;
  transition: background-color .3s ease, border-color .3s ease, transform .2s var(--ease);
}
.ev-action:active { transform: scale(.985); }
.ev-action:disabled { opacity: .4; cursor: default; }
.ev-action:focus-visible { outline: 3px solid var(--ev); outline-offset: 3px; }
.ev-action.armed { background: color-mix(in srgb, var(--warn) 24%, transparent); border-color: var(--warn); }
.ev-action b { position: relative; font-weight: 600; }
.ev-action .countdown { position: absolute; left: 0; bottom: 0; height: .35em; width: 100%; background: var(--warn); transform-origin: left; transform: scaleX(0); }
.ev-action.armed .countdown { animation: drain var(--arm, 4s) linear forwards; }
.ev-action.done { border-color: var(--battery); }

/* sheet */
.scrim {
  position: absolute; inset: 0; z-index: 10; display: grid; place-items: center; padding: 3em;
  background: var(--scrim); -webkit-backdrop-filter: blur(.6em); backdrop-filter: blur(.6em);
  opacity: 0; pointer-events: none; transition: opacity .3s ease;
}
.scrim.open { opacity: 1; pointer-events: auto; }
.sheet {
  --c: var(--grid);
  width: min(74em, 100%); max-height: 100%; overflow: auto; padding: 2.6em 3em 3em;
  border-radius: 2.4em; background: var(--sheet); border: 1px solid var(--card-edge);
  -webkit-backdrop-filter: blur(2.2em) saturate(1.5); backdrop-filter: blur(2.2em) saturate(1.5);
  box-shadow: 0 3em 8em -2em rgba(0,0,0,.5);
  transform: translateY(2.5em) scale(.985); transition: transform .4s var(--ease);
}
.scrim.open .sheet { transform: none; }
.sheet-head { display: flex; align-items: center; gap: 1em; }
.sheet-head .label { font-size: 1.3em; }
.close {
  margin-left: auto; width: 4.2em; height: 4.2em; border-radius: 50%; border: 1px solid var(--card-edge);
  background: var(--card); display: grid; place-items: center; cursor: pointer;
}
.close svg { width: 1.8em; height: 1.8em; }
.close:focus-visible { outline: 3px solid var(--c); outline-offset: 3px; }
.sheet .reading { margin-top: 1.2em; }
.sheet .value { font-size: 7em; }
.chart { display: block; width: 100%; height: auto; margin-top: 1.8em; overflow: visible; }
.chart text { font-family: "Plus Jakarta Sans", sans-serif; font-size: 15px; fill: var(--dim); }
.chart .grid { stroke: var(--track); stroke-width: 1; }
.chart .zero { stroke: var(--dim); stroke-dasharray: 4 6; opacity: .6; }
.chart .ln { fill: none; stroke: var(--c); stroke-width: 3; stroke-linejoin: round; stroke-linecap: round; }
.stats { display: grid; grid-template-columns: repeat(4, 1fr); gap: 1.2em; margin-top: 2em; }
.stat { padding: 1.2em 1.4em; border-radius: 1.4em; background: var(--card); border: 1px solid var(--card-line); }
.stat span { display: block; color: var(--dim); font-size: 1em; }
.stat b { display: block; margin-top: .35em; font-family: "Unbounded", sans-serif; font-weight: 500; font-size: 1.8em; }
.value small, .stat b small { font-size: .35em; color: var(--dim); letter-spacing: 0; }
.nodata { color: var(--dim); padding: 3em 0; text-align: center; }

[hidden] { display: none !important; }
@keyframes breathe { 0%,100% { box-shadow: 0 0 0 0 color-mix(in srgb, var(--c) 0%, transparent); } 50% { box-shadow: 0 0 1.4em .1em color-mix(in srgb, var(--c) 32%, transparent); } }
@keyframes drain { to { transform: scaleX(1); } }
@keyframes rise { from { opacity: 0; transform: translateY(-.6em); } }
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after { animation: none !important; transition-duration: .01ms !important; }
}
`;

class EnergyWallPanel extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: "open" });
    this._cfg = this._mergeConfig({});
    this._built = false;
    this._hist = {};
    this._sheetKey = null;
    this._armed = false;
    this._timers = [];
  }

  set panel(p) {
    this._cfg = this._mergeConfig(p && p.config ? p.config : {});
    if (this._built) this._update();
  }
  set narrow(_) {}
  set route(_) {}

  set hass(h) {
    this._hass = h;
    if (!this._built) this._build();
    this._update();
    if (!this._histAt || Date.now() - this._histAt > HISTORY_REFRESH_MS) this._loadHistory();
  }

  connectedCallback() {
    this._timers.push(setInterval(() => this._tick(), 15000));
  }
  disconnectedCallback() {
    this._timers.forEach(clearInterval);
    this._timers = [];
    clearTimeout(this._armTimer);
  }

  _mergeConfig(c) {
    return { ...DEFAULTS, ...c, entities: { ...DEFAULTS.entities, ...(c.entities || {}) } };
  }

  /* ---------- data helpers ---------- */
  _state(id) {
    const s = id && this._hass ? this._hass.states[id] : null;
    return s && s.state !== "unavailable" && s.state !== "unknown" ? s : null;
  }
  _factor(s, kind) {
    const u = (s.attributes.unit_of_measurement || "").trim();
    if (kind === "power") return u === "kW" ? 1000 : u === "MW" ? 1e6 : 1;
    if (kind === "energy") return u === "Wh" ? 0.001 : u === "MWh" ? 1000 : 1;
    return 1;
  }
  _num(id, kind) {
    const s = this._state(id);
    if (!s) return null;
    const v = parseFloat(s.state);
    return Number.isFinite(v) ? v * this._factor(s, kind) : null;
  }
  _fmtPower(w) {
    const a = Math.abs(w);
    return a >= 1000 ? { v: (a / 1000).toFixed(1), u: "kW" } : { v: String(Math.round(a)), u: "W" };
  }

  /* ---------- per-card model ---------- */
  _model(key) {
    const e = this._cfg.entities;
    const c = this._cfg;
    const on = c.active_w;
    const na = { value: "–", unit: "", sub: "No data", active: false, level: null, status: "", chip: "", na: true };
    const p = (w) => this._fmtPower(w);

    if (key === "solar") {
      const w = this._num(e.solar_power, "power");
      if (w === null) return na;
      const today = this._num(e.solar_today, "energy");
      const f = p(Math.max(0, w));
      return { value: f.v, unit: f.u, sub: today === null ? (w >= on ? "Producing" : "Idle") : `${today.toFixed(1)} kWh today`, active: w >= on, level: null, status: "", chip: "" };
    }
    if (key === "home") {
      const w = this._num(e.home_power, "power");
      if (w === null) return na;
      const g = this._num(e.grid_power, "power");
      let sub = "Using now";
      if (g !== null && w >= on) {
        const imp = (c.grid_import_positive ? g : -g);
        const own = Math.max(0, Math.min(1, (w - Math.max(0, imp)) / w));
        sub = `${Math.round(own * 100)}% self-supplied`;
      }
      const f = p(w);
      return { value: f.v, unit: f.u, sub, active: w >= on, level: null, status: "", chip: "" };
    }
    if (key === "battery") {
      const soc = this._num(e.battery_soc);
      if (soc === null) return na;
      const raw = this._num(e.battery_power, "power");
      let sub = "Idle";
      let active = false;
      if (raw !== null) {
        const charging = c.battery_charge_positive ? raw : -raw;
        if (Math.abs(charging) >= on) {
          active = true;
          sub = `${charging > 0 ? "Charging" : "Discharging"} · ${p(charging).v} ${p(charging).u}`;
        }
      }
      const status = soc <= c.battery_crit ? "crit" : soc <= c.battery_warn ? "warn" : "";
      return { value: String(Math.round(soc)), unit: "%", sub, active, level: soc / 100, status, chip: status === "crit" ? "Very low" : status === "warn" ? "Low" : "" };
    }
    if (key === "grid") {
      const raw = this._num(e.grid_power, "power");
      if (raw === null) return na;
      const imp = c.grid_import_positive ? raw : -raw;
      const f = p(imp);
      const active = Math.abs(imp) >= on;
      const status = imp >= c.grid_crit_w ? "crit" : imp >= c.grid_warn_w ? "warn" : "";
      return { value: f.v, unit: f.u, sub: !active ? "Balanced" : imp > 0 ? "Importing" : "Exporting", active, level: null, status, chip: status === "crit" ? "Very high" : status === "warn" ? "High" : "" };
    }
    if (key === "ev") {
      const w = this._num(e.ev_power, "power");
      if (w === null) return na;
      const sw = this._state(e.ev_switch);
      const soc = this._num(e.ev_soc);
      const charging = w >= c.ev_charging_w;
      const f = p(w);
      let sub = charging ? "Charging" : sw && sw.state === "on" ? "Connected · waiting" : "Not charging";
      if (soc !== null) sub += ` · ${Math.round(soc)}%`;
      return { value: f.v, unit: f.u, sub, active: charging, level: soc === null ? null : soc / 100, status: "", chip: "" };
    }
    return na;
  }

  /* ---------- build ---------- */
  _build() {
    this._built = true;
    this._ensureFonts();
    const cards = CARDS.map(
      (d) => `
      <div class="card" role="button" tabindex="0" data-key="${d.key}" style="grid-column: span ${d.span}" aria-label="${d.label} details">
        <svg class="spark" viewBox="0 0 100 40" preserveAspectRatio="none" aria-hidden="true">
          <defs><linearGradient id="g-${d.key}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="var(--c)" stop-opacity=".22"/><stop offset="1" stop-color="var(--c)" stop-opacity="0"/></linearGradient></defs>
          <path class="area" fill="url(#g-${d.key})"/><path class="line"/>
        </svg>
        <div class="top"><span class="badge">${icon(d.icon)}</span><span class="label">${d.label}</span><span class="chip" data-f="chip"></span></div>
        <div class="reading"><span class="value" data-f="value">–</span><span class="unit" data-f="unit"></span></div>
        <div class="sub" data-f="sub"></div>
        ${d.key === "battery" ? '<div class="meter"><i data-f="meter"></i></div>' : ""}
        ${d.key === "ev" ? `<div class="ev-action" role="button" tabindex="0" data-f="evbtn"><span class="countdown"></span><b data-f="evtxt">Start charging</b></div>` : ""}
      </div>`
    ).join("");

    this.shadowRoot.innerHTML = `
      <style>${STYLE}</style>
      <div class="stage">
        <header>
          <div><div class="clock" data-f="clock">--:--</div><div class="date" data-f="date"></div></div>
          <div class="banner" data-f="banner" hidden role="status"><span data-f="bicon"></span><span data-f="btext"></span><small data-f="bmore"></small></div>
          <div class="sunline" data-f="sunline"></div>
        </header>
        <main>${cards}</main>
        <div class="scrim" data-f="scrim">
          <div class="sheet" role="dialog" aria-modal="true" aria-labelledby="sheet-title" data-f="sheet"></div>
        </div>
      </div>`;

    this._els = {};
    this.shadowRoot.querySelectorAll("[data-f]").forEach((n) => {
      if (!n.closest(".card")) this._els[n.dataset.f] = n;
    });
    this._cardEls = {};
    this.shadowRoot.querySelectorAll(".card").forEach((card) => {
      const o = { card };
      card.querySelectorAll("[data-f]").forEach((n) => (o[n.dataset.f] = n));
      this._cardEls[card.dataset.key] = o;
      card.addEventListener("click", () => this._openSheet(card.dataset.key));
      card.addEventListener("keydown", (ev) => {
        if (ev.target === card && (ev.key === "Enter" || ev.key === " ")) {
          ev.preventDefault();
          this._openSheet(card.dataset.key);
        }
      });
    });

    const btn = this._cardEls.ev.evbtn;
    const act = (ev) => {
      ev.stopPropagation();
      this._evTap();
    };
    btn.addEventListener("click", act);
    btn.addEventListener("keydown", (ev) => {
      if (ev.key === "Enter" || ev.key === " ") {
        ev.preventDefault();
        act(ev);
      }
    });

    this._els.scrim.addEventListener("click", (ev) => {
      if (ev.target === this._els.scrim) this._closeSheet();
    });
    this.shadowRoot.addEventListener("keydown", (ev) => {
      if (ev.key === "Escape") this._closeSheet();
    });
  }

  _ensureFonts() {
    const url = this._cfg.fonts_css;
    if (!url || document.querySelector('link[data-energy-wall-fonts]')) return;
    const l = document.createElement("link");
    l.rel = "stylesheet";
    l.href = url;
    l.dataset.energyWallFonts = "";
    document.head.appendChild(l);
  }

  /* ---------- update ---------- */
  _tick() {
    if (this._built) this._update();
  }

  _theme() {
    const t = this._cfg.theme;
    if (t === "dark" || t === "light") return t;
    const sun = this._hass && this._hass.states[this._cfg.sun_entity];
    if (sun) return sun.state === "below_horizon" ? "dark" : "light";
    const h = new Date().getHours();
    return h >= 7 && h < 19 ? "light" : "dark";
  }

  _update() {
    if (!this._hass || !this._built) return;
    const lang = (this._hass.locale && this._hass.locale.language) || navigator.language;
    const theme = this._theme();
    if (this.getAttribute("data-theme") !== theme) this.setAttribute("data-theme", theme);

    const now = new Date();
    this._els.clock.textContent = now.toLocaleTimeString(lang, { hour: "2-digit", minute: "2-digit" });
    this._els.date.textContent = now.toLocaleDateString(lang, { weekday: "long", day: "numeric", month: "long" });
    this._updateSunline(lang, theme);

    const alerts = [];
    for (const d of CARDS) {
      const m = this._model(d.key);
      const o = this._cardEls[d.key];
      o.value.textContent = m.value;
      o.unit.textContent = m.unit;
      o.sub.textContent = m.sub;
      o.chip.textContent = m.chip;
      o.card.classList.toggle("active", !!m.active);
      o.card.classList.toggle("na", !!m.na);
      o.card.classList.toggle("warn", m.status === "warn");
      o.card.classList.toggle("crit", m.status === "crit");
      if (o.meter) o.meter.style.width = m.level === null ? "0%" : `${Math.round(m.level * 100)}%`;
      if (m.na) alerts.push({ level: "warn", text: `${d.label} data unavailable` });
      if (m.status && d.key === "battery") alerts.push({ level: m.status, text: `Battery ${m.status === "crit" ? "critically low" : "low"} (${m.value}%)` });
      if (m.status && d.key === "grid") alerts.push({ level: m.status, text: `Grid draw ${m.status === "crit" ? "very high" : "high"} (${m.value} ${m.unit})` });
    }
    this._updateEv();
    this._updateBanner(alerts);
    if (this._sheetKey) this._updateSheetLive();
  }

  _updateSunline(lang, theme) {
    const sun = this._hass.states[this._cfg.sun_entity];
    const next = sun && sun.attributes[theme === "light" ? "next_setting" : "next_rising"];
    if (!next) {
      this._els.sunline.innerHTML = "";
      return;
    }
    const t = new Date(next).toLocaleTimeString(lang, { hour: "2-digit", minute: "2-digit" });
    this._els.sunline.innerHTML = `${icon(theme === "light" ? "sunrise" : "moon")}<span>${theme === "light" ? "Sunset" : "Sunrise"} ${t}</span>`;
  }

  _updateBanner(alerts) {
    const b = this._els.banner;
    if (!alerts.length) {
      b.hidden = true;
      return;
    }
    alerts.sort((a, z) => (z.level === "crit") - (a.level === "crit"));
    const top = alerts[0];
    b.hidden = false;
    b.classList.toggle("crit", top.level === "crit");
    this._els.bicon.innerHTML = icon("alert");
    this._els.btext.textContent = top.text;
    this._els.bmore.textContent = alerts.length > 1 ? `+${alerts.length - 1} more` : "";
  }

  /* ---------- EV: second tap for risky action ---------- */
  _updateEv() {
    const o = this._cardEls.ev;
    const sw = this._state(this._cfg.entities.ev_switch);
    const on = !!sw && sw.state === "on";
    o.evbtn.setAttribute("aria-disabled", sw ? "false" : "true");
    o.evbtn.style.opacity = sw ? "" : ".4";
    o.evbtn.style.pointerEvents = sw ? "" : "none";
    o.evbtn.classList.toggle("armed", this._armed);
    o.evbtn.style.setProperty("--arm", `${this._cfg.arm_seconds}s`);
    const verb = on ? "Stop charging" : "Start charging";
    o.evtxt.textContent = this._flash || (this._armed ? `Tap again to ${on ? "stop" : "start"}` : verb);
  }

  _evTap() {
    const id = this._cfg.entities.ev_switch;
    const sw = this._state(id);
    if (!sw) return;
    if (!this._armed) {
      this._armed = true;
      clearTimeout(this._armTimer);
      this._armTimer = setTimeout(() => {
        this._armed = false;
        this._updateEv();
      }, this._cfg.arm_seconds * 1000);
      // restart the countdown animation
      const b = this._cardEls.ev.evbtn;
      b.classList.remove("armed");
      void b.offsetWidth;
      this._updateEv();
      return;
    }
    clearTimeout(this._armTimer);
    this._armed = false;
    const turnOff = sw.state === "on";
    this._hass.callService("homeassistant", turnOff ? "turn_off" : "turn_on", { entity_id: id });
    this._flash = turnOff ? "Stopping…" : "Starting…";
    this._cardEls.ev.evbtn.classList.add("done");
    setTimeout(() => {
      this._flash = null;
      this._cardEls.ev.evbtn.classList.remove("done");
      this._updateEv();
    }, 2500);
    this._updateEv();
  }

  /* ---------- history ---------- */
  _historyEntity(key) {
    const e = this._cfg.entities;
    return { solar: e.solar_power, home: e.home_power, battery: e.battery_soc, grid: e.grid_power, ev: e.ev_power }[key];
  }
  _historyKind(key) {
    return key === "battery" ? null : "power";
  }

  async _loadHistory() {
    if (!this._hass || this._loading) return;
    this._loading = true;
    const ids = CARDS.map((d) => this._historyEntity(d.key)).filter(Boolean);
    const start = new Date(Date.now() - 24 * 3600 * 1000);
    try {
      const res = await this._hass.callApi(
        "GET",
        `history/period/${start.toISOString()}?filter_entity_id=${ids.join(",")}&minimal_response&no_attributes`
      );
      const byId = {};
      for (const arr of res || []) if (arr.length) byId[arr[0].entity_id] = arr;
      for (const d of CARDS) {
        const id = this._historyEntity(d.key);
        const s = this._state(id);
        const f = s ? this._factor(s, this._historyKind(d.key)) : 1;
        this._hist[d.key] = byId[id] ? this._bucket(byId[id], start.getTime(), f, d.key === "grid" && !this._cfg.grid_import_positive) : null;
      }
      this._histAt = Date.now();
      this._drawSparks();
      if (this._sheetKey) this._renderSheet();
    } catch (err) {
      this._hist = {};
      this._histAt = Date.now() - HISTORY_REFRESH_MS + 60000; // retry in a minute
    } finally {
      this._loading = false;
    }
  }

  _bucket(points, t0, factor, invert) {
    const step = (24 * 3600 * 1000) / HISTORY_BUCKETS;
    const out = new Array(HISTORY_BUCKETS).fill(null);
    let i = 0;
    let last = null;
    for (let b = 0; b < HISTORY_BUCKETS; b++) {
      const end = t0 + (b + 1) * step;
      while (i < points.length && new Date(points[i].last_changed || points[i].last_updated || t0).getTime() <= end) {
        const v = parseFloat(points[i].state);
        if (Number.isFinite(v)) last = v * factor * (invert ? -1 : 1);
        i++;
      }
      out[b] = last;
    }
    return out;
  }

  _path(series, w, h, lo, hi) {
    const pts = series.map((v, i) => (v === null ? null : [(i / (series.length - 1)) * w, h - ((v - lo) / (hi - lo || 1)) * h]));
    const first = pts.findIndex(Boolean);
    if (first < 0) return { line: "", area: "" };
    const filled = pts.slice(first);
    const line = filled.map((p, i) => `${i ? "L" : "M"}${p[0].toFixed(1)} ${(p[1] ?? h).toFixed(1)}`).join("");
    const area = `${line}L${filled[filled.length - 1][0].toFixed(1)} ${h}L${filled[0][0].toFixed(1)} ${h}Z`;
    return { line, area };
  }

  _drawSparks() {
    for (const d of CARDS) {
      const s = this._hist[d.key];
      const svg = this._cardEls[d.key].card.querySelector(".spark");
      if (!s) {
        svg.querySelector(".line").setAttribute("d", "");
        svg.querySelector(".area").setAttribute("d", "");
        continue;
      }
      const vals = s.filter((v) => v !== null);
      const lo = Math.min(0, ...vals);
      const hi = Math.max(1, ...vals);
      const { line, area } = this._path(s, 100, 40, lo, hi);
      svg.querySelector(".line").setAttribute("d", line);
      svg.querySelector(".area").setAttribute("d", area);
    }
  }

  /* ---------- detail sheet ---------- */
  _openSheet(key) {
    this._sheetKey = key;
    this._returnFocus = this._cardEls[key].card;
    this._renderSheet();
    this._els.scrim.classList.add("open");
    const c = this._els.sheet.querySelector(".close");
    if (c) c.focus({ preventScroll: true });
  }

  _closeSheet() {
    if (!this._sheetKey) return;
    this._sheetKey = null;
    this._els.scrim.classList.remove("open");
    if (this._returnFocus) this._returnFocus.focus({ preventScroll: true });
  }

  _fmtSeries(key, v) {
    if (key === "battery") return `${Math.round(v)}<small> %</small>`;
    const f = this._fmtPower(v);
    return `${f.v}<small> ${f.u}</small>`;
  }

  _renderSheet() {
    const key = this._sheetKey;
    if (!key) return;
    const d = CARDS.find((x) => x.key === key);
    const sheet = this._els.sheet;
    sheet.style.setProperty("--c", `var(--${key})`);
    const s = this._hist[key];
    const lang = (this._hass.locale && this._hass.locale.language) || navigator.language;
    let body = `<p class="nodata">No history available for the last 24 hours.</p>`;
    if (s && s.some((v) => v !== null)) {
      const vals = s.filter((v) => v !== null);
      const min = Math.min(...vals);
      const max = Math.max(...vals);
      const avg = vals.reduce((a, b) => a + b, 0) / vals.length;
      const lo = key === "battery" ? 0 : Math.min(0, min);
      const hi = key === "battery" ? 100 : Math.max(1, max);
      const W = 1000;
      const H = 300;
      const { line } = this._path(s, W, H, lo, hi);
      const rows = [lo, (lo + hi) / 2, hi];
      const yOf = (v) => H - ((v - lo) / (hi - lo || 1)) * H;
      const lab = (v) => (key === "battery" ? `${Math.round(v)}%` : (() => { const f = this._fmtPower(v); return `${v < 0 ? "−" : ""}${f.v} ${f.u}`; })());
      const grid = rows.map((v) => `<line class="grid" x1="0" x2="${W}" y1="${yOf(v)}" y2="${yOf(v)}"/><text x="${W}" y="${yOf(v) - 8}" text-anchor="end">${lab(v)}</text>`).join("");
      const zero = lo < 0 ? `<line class="zero" x1="0" x2="${W}" y1="${yOf(0)}" y2="${yOf(0)}"/>` : "";
      const t0 = Date.now() - 24 * 3600 * 1000;
      const xl = [0, 6, 12, 18, 24].map((h) => {
        const x = (h / 24) * W;
        const anchor = h === 0 ? "start" : h === 24 ? "end" : "middle";
        const t = new Date(t0 + h * 3600 * 1000).toLocaleTimeString(lang, { hour: "2-digit", minute: "2-digit" });
        return `<text x="${x}" y="${H + 30}" text-anchor="${anchor}">${t}</text>`;
      }).join("");
      const fmt = (v) => this._fmtSeries(key, v);
      body = `
        <svg class="chart" viewBox="0 0 ${W} ${H + 40}" role="img" aria-label="${d.label}, last 24 hours">
          <defs><linearGradient id="sg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="var(--c)" stop-opacity=".28"/><stop offset="1" stop-color="var(--c)" stop-opacity="0"/></linearGradient></defs>
          ${grid}${zero}
          <path d="${line}L${W} ${H}L0 ${H}Z" fill="url(#sg)" stroke="none"/>
          <path class="ln" d="${line}"/>${xl}
        </svg>
        <div class="stats">
          <div class="stat"><span>Now</span><b data-f="snow"></b></div>
          <div class="stat"><span>24 h low</span><b>${fmt(min)}</b></div>
          <div class="stat"><span>24 h average</span><b>${fmt(avg)}</b></div>
          <div class="stat"><span>24 h high</span><b>${fmt(max)}</b></div>
        </div>`;
    }
    sheet.innerHTML = `
      <div class="sheet-head"><span class="badge">${icon(d.icon)}</span><span class="label" id="sheet-title">${d.label} · last 24 hours</span>
        <button class="close" aria-label="Close">${icon("close")}</button></div>
      <div class="reading"><span class="value" data-f="sv">–</span><span class="unit" data-f="su"></span></div>
      <div class="sub" data-f="ss"></div>
      ${body}`;
    sheet.querySelector(".close").addEventListener("click", () => this._closeSheet());
    this._updateSheetLive();
  }

  _updateSheetLive() {
    const key = this._sheetKey;
    const sheet = this._els.sheet;
    const m = this._model(key);
    const set = (f, v) => {
      const n = sheet.querySelector(`[data-f="${f}"]`);
      if (n) n.textContent = v;
    };
    set("sv", m.value);
    set("su", m.unit);
    set("ss", m.sub);
    const now = sheet.querySelector('[data-f="snow"]');
    if (now) now.innerHTML = `${m.value}<small> ${m.unit}</small>`;
  }
}

if (!customElements.get("energy-wall-panel")) customElements.define("energy-wall-panel", EnergyWallPanel);
