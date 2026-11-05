/*
 * Wall Dashboard – Home Assistant custom panel for a landscape tablet.
 * Dark by default. Cards: Home, Grid, EV, Lights (per room), Security (locks + cameras).
 * Scales with its container (everything is in em). Override anything under `config:`
 * in panel_custom (see README.md).
 */

const FONTS_CSS =
  "https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600&family=Unbounded:wght@500&display=swap";

const DEFAULTS = {
  theme: "dark", // dark | light | auto (light between sunrise and sunset)
  fonts_css: FONTS_CSS,
  active_w: 50, // below this a source is idle (no glow)
  grid_warn_w: 5000, // W imported, amber
  grid_crit_w: 9000, // W imported, red
  ev_charging_w: 100,
  arm_seconds: 4, // window for the confirming second tap
  grid_import_positive: true,
  sun_entity: "sun.sun",
  entities: {
    home_power: "sensor.evcc_home_power",
    grid_power: "sensor.p1_meter_power",
    ev_power: "sensor.zag143440_charge_power",
    ev_switch: "switch.zag143440_charging",
  },
  switches: [], // extra switch.* ids to always include; use `switch_exclude` (regex string) to hide more
  // rooms: [] -> not set: all lights are grouped automatically by their Home Assistant area.
  // Set `rooms` to override with your own grouping.
  car: {
    name: "ID.7",
    soc: "sensor.ute_id_7_battery_level",
    odometer: "sensor.ute_id_7_odometer",
    range: "sensor.evcc_hjemmelader_vehicle_range",
    power: "sensor.ute_id_7_charging_power",
    charging: "binary_sensor.ute_id_7_currently_charging",
    status: "sensor.ute_id_7_charging_status",
    remaining: "sensor.ute_id_7_remaining_charge_time",
    location: "", // optional: a device_tracker.* entity
  },
  security: {
    locks: [{ name: "Front door", entity: "lock.front_door", door: "binary_sensor.front_door_door" }],
    cameras: [
      { name: "Front", entity: "camera.framside_live_view" },
      { name: "Back", entity: "camera.bakside_live_view" },
    ],
  },
};

const BUILD = "6"; // shown bottom-right so you can tell which file the tablet loaded

// UniFi access points (rw_*) and switches (sw_*) expose their status LEDs as lights
const LIGHT_EXCLUDE = /^light\.(rw|sw)_/;

// switch.* entities whose id matches this are settings/diagnostics, not things you switch on and off
const SWITCH_EXCLUDE =
  /child_lock|_led$|indicator|privacy|detection|alarm|notification|record|smart_track|firmware|upgrade|reboot|flip|mute|noise_cancel|tamper|cloud_connection|autofocus|ir_lamp|wiper|media_sync|diagnose|lens_|preset|auto_track|automatic|unifi_network|^switch\.gvn44_|do_not_disturb|dock_|battery_|evcc_|zag143440|_nvr_|ute_ute|status_indicator|permanent_cable|bubble_soak|^switch\.(framside|bakside)/;

const FALLBACK_ROOMS = [
    { name: "Stue", lights: ["light.stalampe1", "light.stalampe2", "light.tvlys", "light.radiolys", "light.blomsterlys"] },
    { name: "Tak", lights: ["light.tak1", "light.tak2", "light.tak3", "light.tak4"] },
    { name: "Vinduer", lights: ["light.vinduslys_2", "light.vinduslys_3"] },
    { name: "Arbeid", lights: ["light.stalampe_arbeidslys"] },
    { name: "Mathea", lights: ["light.mathea_1"] },
    { name: "Margrethe", lights: ["light.margrethe_1"] },
    { name: "Switches", lights: ["switch.vinduslys_1", "switch.vinduslys_1_2", "switch.utekontakt", "switch.cavius", "switch.skru_pa_skaplys", "switch.skru_av_skaplys", "switch.vitrineskap_1_socket_1", "switch.vitrineskap_2_socket_1", "switch.isbitmaskin_switch"] },
];

const ICONS = {
  car: '<path d="M5 16V11l1.800-4.500A2 2 0 0 1 8.700 5h6.600a2 2 0 0 1 1.900 1.500L19 11v5M3.500 16h17M7.500 16v2M16.500 16v2"/><circle cx="7.500" cy="13" r=".6"/><circle cx="16.500" cy="13" r=".6"/>',
  pin: '<path d="M12 21s-6-5.600-6-10.500a6 6 0 0 1 12 0C18 15.400 12 21 12 21z"/><circle cx="12" cy="10.500" r="2"/>',
  home: '<path d="M3 11.5 12 4l9 7.5M5.5 10v9.5h13V10M10 19.5v-5h4v5"/>',
  grid: '<path d="M12 3v18M7 21l5-18 5 18M8.5 9h7M7.5 14h9"/>',
  ev: '<path d="M13 2 5 13.5h6L10 22l8-11.5h-6z"/>',
  bulb: '<path d="M9 18h6M10 21h4M12 3a6 6 0 0 0-3.5 10.9c.6.5 1 1.2 1 2.1h5c0-.9.4-1.6 1-2.1A6 6 0 0 0 12 3z"/>',
  shield: '<path d="M12 3 4.5 6v5.5c0 4.5 3.2 8 7.5 9.5 4.3-1.5 7.5-5 7.5-9.5V6z"/>',
  lock: '<rect x="5" y="11" width="14" height="10" rx="2.5"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/>',
  unlock: '<rect x="5" y="11" width="14" height="10" rx="2.5"/><path d="M8 11V8a4 4 0 0 1 7.5-2"/>',
  camera: '<path d="M3 8.5A2.5 2.5 0 0 1 5.5 6h2L9 4h6l1.500 2h2A2.500 2.500 0 0 1 21 8.500v8A2.500 2.500 0 0 1 18.500 19h-13A2.500 2.500 0 0 1 3 16.500z"/><circle cx="12" cy="12.500" r="3.500"/>',
  alert: '<path d="M12 3 2.5 20h19zM12 10v4.5M12 17.5v.01"/>',
  close: '<path d="M6 6l12 12M18 6 6 18"/>',
  sun: '<path d="M4 18h16M7 14a5 5 0 0 1 10 0M12 6V3M5.6 8.6 4 7M18.4 8.6 20 7"/>',
  moon: '<path d="M20 14.5A8 8 0 0 1 9.5 4 8 8 0 1 0 20 14.5z"/>',
};
const svg = (n) =>
  `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONS[n]}</svg>`;

const CARDS = [
  { key: "home", label: "Home", span: 3 },
  { key: "grid", label: "Grid", span: 3 },
  { key: "ev", label: "EV charger", span: 3 },
];

const STYLE = `
:host { display:block; position:relative; height:100vh; height:100dvh; container-type:size; overflow:hidden;
  font-family:"Plus Jakarta Sans",system-ui,-apple-system,"Segoe UI",sans-serif;
  --home:#38bdf8; --car:#818cf8; --grid:#94a3b8; --ev:#2dd4bf; --light:#f5c542; --sec:#a78bfa;
  --warn:#f59e0b; --crit:#ef4444; --ease:cubic-bezier(.2,.8,.2,1);
  /* dark is the default palette; light swaps the roles */
  --bg:#080b11; --text:#f1f5f9; --dim:rgba(226,232,240,.56);
  --card:rgba(255,255,255,.05); --edge:rgba(255,255,255,.10); --track:rgba(255,255,255,.09);
  --sheet:rgba(18,24,36,.88); --scrim:rgba(2,4,8,.6); --shadow:0 1.4em 3.4em -1.4em rgba(0,0,0,.7);
  --glow:55%; --amb-a:rgba(167,139,250,.07); --amb-b:rgba(56,189,248,.08); color-scheme:dark; }
:host([data-theme="light"]) { --bg:#eef3f8; --text:#0f172a; --dim:rgba(15,23,42,.6);
  --card:rgba(255,255,255,.58); --edge:rgba(255,255,255,.85); --track:rgba(15,23,42,.09);
  --sheet:rgba(248,251,254,.88); --scrim:rgba(15,23,42,.28); --shadow:0 1.2em 3em -1.4em rgba(30,58,95,.28);
  --glow:42%; --amb-a:rgba(167,139,250,.16); --amb-b:rgba(56,189,248,.20); color-scheme:light; }
* { box-sizing:border-box; margin:0; -webkit-tap-highlight-color:transparent; }
button { font:inherit; color:inherit; cursor:pointer; }
[hidden] { display:none !important; }
.stage { position:absolute; inset:0; font-size:max(11px,min(.8333cqw,1.3333cqh)); color:var(--text);
  background:radial-gradient(60em 40em at 8% 0%,var(--amb-a),transparent 70%),
    radial-gradient(60em 44em at 100% 100%,var(--amb-b),transparent 70%),var(--bg);
  padding:2.5em 3.5em 3em; display:grid; grid-template-rows:auto 1fr; gap:2em;
  transition:background-color .9s ease,color .9s ease; }
header { display:flex; align-items:center; justify-content:space-between; gap:2em; min-height:4.5em; }
.clock { font-family:"Unbounded",sans-serif; font-weight:500; font-size:3.4em; letter-spacing:-.02em; line-height:1; }
.date { color:var(--dim); font-size:1.15em; margin-top:.5em; }
.sunline { display:flex; align-items:center; gap:.7em; color:var(--dim); font-size:1.1em; }
.sunline svg { width:1.6em; height:1.6em; }
.banner { flex:1; max-width:46em; min-height:4em; padding:0 1.6em; display:flex; align-items:center; gap:1em;
  border-radius:2em; font-weight:600; font-size:1.15em;
  background:color-mix(in srgb,var(--warn) 16%,var(--card));
  border:1px solid color-mix(in srgb,var(--warn) 55%,transparent); animation:rise .5s var(--ease); }
.banner.crit { background:color-mix(in srgb,var(--crit) 18%,var(--card)); border-color:color-mix(in srgb,var(--crit) 60%,transparent); }
.banner svg { width:1.7em; height:1.7em; flex:none; color:var(--warn); }
.banner.crit svg { color:var(--crit); }
.grid { display:grid; grid-template-columns:repeat(12,1fr); grid-template-rows:minmax(0,.8fr) minmax(0,1.2fr); gap:2em; min-height:0; }
.panel, .card { --c:var(--grid); position:relative; min-height:0; border-radius:26px; border:1px solid var(--edge); background:var(--card);
  -webkit-backdrop-filter:blur(22px) saturate(1.4); backdrop-filter:blur(22px) saturate(1.4); box-shadow:var(--shadow); }
.card { text-align:left; padding:2.2em 2.4em; display:flex; flex-direction:column; justify-content:space-between; overflow:hidden;
  transition:box-shadow .6s ease,border-color .6s ease,transform .2s var(--ease); }
.card:active { transform:scale(.985); }
.card:focus-visible { outline:3px solid var(--c); outline-offset:3px; }
.card[data-key="home"] { --c:var(--home); } .card[data-key="ev"] { --c:var(--ev); }
.card.active { border-color:color-mix(in srgb,var(--c) 45%,var(--edge));
  box-shadow:var(--shadow),0 0 3.5em -1em color-mix(in srgb,var(--c) var(--glow),transparent); }
.card.warn { --c:var(--warn); } .card.crit { --c:var(--crit); }
.row { display:flex; align-items:center; gap:.9em; color:var(--dim); font-weight:500; font-size:1.2em; }
.row svg { width:1.7em; height:1.7em; color:var(--c); }
.card.active .row svg { animation:breathe 4s ease-in-out infinite; }
.big { font-family:"Unbounded",sans-serif; font-weight:500; font-size:4.6em; letter-spacing:-.03em; line-height:1; }
.big small { font-size:.34em; margin-left:.25em; color:var(--dim); letter-spacing:0; }
.sub { color:var(--dim); font-size:1.15em; min-height:1.4em; }
.evbtn { display:flex; align-items:center; justify-content:center; align-self:flex-start; min-height:64px; min-width:14em; padding:0 2em;
  border-radius:2em; font-weight:600; font-size:1.25em; border:1px solid color-mix(in srgb,var(--ev) 55%,transparent);
  background:color-mix(in srgb,var(--ev) 16%,transparent); transition:background .3s,border-color .3s; }
.evbtn.armed, .tile.armed { background:var(--warn); border-color:var(--warn); color:#1a1200; }
.panel { padding:2em 2.4em; display:flex; flex-direction:column; gap:1.4em; }
.panel .row svg { color:var(--pc); }
.lights { grid-column:span 8; --pc:var(--light); }
.security { grid-column:span 4; --pc:var(--sec); }
.rooms { flex:1; min-height:0; overflow-y:auto; -webkit-overflow-scrolling:touch; display:grid; grid-template-columns:repeat(auto-fill,minmax(19em,1fr)); align-content:start; gap:1.4em; padding:.3em; margin:-.3em; }
.rgroup { display:flex; flex-direction:column; gap:.7em; }
.rgroup .tile { min-height:70px; }
.lchips { display:flex; flex-wrap:wrap; gap:.6em; }
.chip { min-height:56px; padding:0 1.3em; border-radius:2em; border:1px solid var(--edge); background:var(--track); font-weight:500; font-size:1.05em; transition:background .3s,border-color .3s; }
.chip.on { background:color-mix(in srgb,var(--light) 22%,var(--card)); border-color:color-mix(in srgb,var(--light) 55%,transparent); }
.chip:disabled { opacity:.4; cursor:default; }
.chip:focus-visible { outline:3px solid var(--light); outline-offset:2px; }
.car { text-align:left; } .car { --c:var(--car); }
.facts { display:flex; flex-direction:column; gap:.5em; font-size:1.05em; }
.facts div { display:flex; justify-content:space-between; gap:1em; color:var(--dim); }
.facts b { color:var(--text); font-weight:600; }
.tile { min-height:64px; padding:0 1.6em; display:flex; align-items:center; justify-content:space-between; gap:1em; text-align:left;
  border-radius:26px; border:1px solid var(--edge); background:var(--track); font-weight:600; font-size:1.3em;
  transition:background .4s,border-color .4s,box-shadow .6s,transform .2s var(--ease); }
.tile:active { transform:scale(.97); }
.tile:focus-visible { outline:3px solid var(--pc); outline-offset:3px; }
.tile small { display:block; margin-top:.25em; color:var(--dim); font-weight:500; font-size:.75em; }
.tile.armed small { color:inherit; }
.tile svg { width:1.7em; height:1.7em; flex:none; color:var(--dim); }
.lic { display:flex; }
.tile.on { background:color-mix(in srgb,var(--pc) 20%,var(--card)); border-color:color-mix(in srgb,var(--pc) 55%,transparent);
  box-shadow:0 0 2.6em -1em color-mix(in srgb,var(--pc) var(--glow),transparent); }
.tile.on svg { color:var(--pc); }
.tile.crit { background:color-mix(in srgb,var(--crit) 18%,var(--card)); border-color:color-mix(in srgb,var(--crit) 60%,transparent); }
.tile.crit svg { color:var(--crit); }
.tile:disabled { opacity:.4; cursor:default; }
.locks { display:flex; flex-direction:column; gap:1.2em; }
.cams { flex:1; min-height:0; display:grid; grid-template-columns:repeat(2,1fr); gap:1.2em; }
.cam { position:relative; min-height:64px; padding:0; overflow:hidden; border-radius:22px; border:1px solid var(--edge); background:var(--track); }
.cam img { position:absolute; inset:0; width:100%; height:100%; object-fit:cover; }
.cam span { position:absolute; left:.8em; bottom:.7em; padding:.35em .9em; border-radius:2em; font-weight:600; font-size:1.1em;
  background:rgba(8,11,17,.62); color:#f1f5f9; }
.cam:focus-visible { outline:3px solid var(--pc); outline-offset:3px; }
.build { position:absolute; right:1.4em; bottom:.8em; font-size:.9em; color:var(--dim); opacity:.5; pointer-events:none; }
.scrim { position:absolute; inset:0; z-index:5; background:var(--scrim); display:flex; align-items:flex-end; justify-content:center;
  -webkit-backdrop-filter:blur(6px); backdrop-filter:blur(6px); animation:fade .3s ease; }
.sheet { --c:var(--grid); width:min(78em,94%); height:70%; margin-bottom:2em; padding:2.6em 3em; border-radius:36px; border:1px solid var(--edge);
  background:var(--sheet); -webkit-backdrop-filter:blur(30px); backdrop-filter:blur(30px); box-shadow:var(--shadow);
  display:flex; flex-direction:column; gap:1.6em; animation:rise .45s var(--ease); }
.sheet h2 { display:flex; align-items:center; gap:.7em; font-size:1.6em; font-weight:600; }
.sheet h2 svg { width:1.5em; height:1.5em; color:var(--c); }
.close { margin-left:auto; width:70px; height:70px; border-radius:50%; border:1px solid var(--edge); background:var(--card); display:grid; place-items:center; }
.close svg { width:1.6em; height:1.6em; }
.chart { flex:1; min-height:0; width:100%; }
.chart path.line { fill:none; stroke:var(--c); stroke-width:2.5; vector-effect:non-scaling-stroke; }
.chart path.area { fill:color-mix(in srgb,var(--c) 18%,transparent); }
.live { flex:1; min-height:0; width:100%; object-fit:contain; border-radius:22px; background:var(--track); }
.stats { display:flex; gap:3em; color:var(--dim); font-size:1.15em; }
.stats b { display:block; color:var(--text); font-family:"Unbounded",sans-serif; font-weight:500; font-size:1.5em; margin-top:.2em; }
@keyframes rise { from { opacity:0; transform:translateY(1.2em); } }
@keyframes fade { from { opacity:0; } }
@keyframes breathe { 50% { opacity:.55; } }
/* phones and portrait tablets: one scrolling column, full-screen sheets */
@container (max-width: 900px) {
  .stage { overflow-y:auto; -webkit-overflow-scrolling:touch; font-size:14px; padding:1.2em 1em 2.5em; display:flex; flex-direction:column; gap:1.4em; touch-action:manipulation; }
  .stage > * { flex:none; }
  .grid, .panel, .card { min-height:auto; }
  header { flex-wrap:wrap; gap:1em; min-height:0; }
  .clock { font-size:2.8em; }
  .date { font-size:1em; margin-top:.4em; }
  .sunline { font-size:1em; }
  .banner { order:3; flex:1 1 100%; max-width:none; font-size:1em; }
  .grid { grid-template-columns:repeat(2,minmax(0,1fr)); grid-template-rows:none; grid-auto-rows:auto; gap:1em; }
  .card { grid-column:span 1 !important; min-height:12.5em; padding:1.3em 1.2em; gap:.8em; }
  .card .row { font-size:1em; }
  .big { font-size:3.2em; }
  .sub { font-size:1em; }
  .evbtn { min-width:0; width:100%; align-self:stretch; padding:0 1em; font-size:1.05em; }
  .facts { font-size:.95em; }
  .panel { grid-column:1 / -1 !important; padding:1.3em 1.2em; }
  .rooms { flex:none; overflow:visible; grid-template-columns:repeat(auto-fill,minmax(15em,1fr)); }
  .cams { flex:none; grid-auto-rows:11em; }
  .scrim { align-items:stretch; }
  .sheet { width:100%; height:100%; margin:0; border-radius:0; border-width:0; padding:1.2em 1.2em 1.6em; gap:1.1em; }
  .sheet h2 { font-size:1.25em; }
  .chart { min-height:15em; }
  .stats { flex-wrap:wrap; gap:1.4em; font-size:1em; }
  .build { display:none; }
}
@media (prefers-reduced-motion:reduce) { *,*::before,*::after { animation:none !important; transition:none !important; } }
`;

const num = (s) => {
  if (!s || s.state === "unavailable" || s.state === "unknown") return null;
  const v = parseFloat(s.state);
  if (Number.isNaN(v)) return null;
  return (s.attributes?.unit_of_measurement || "").toLowerCase() === "kw" ? v * 1000 : v;
};
const fmtPower = (w) => {
  if (w === null) return ["–", ""];
  const a = Math.abs(w);
  return a >= 1000 ? [(a / 1000).toFixed(1), "kW"] : [Math.round(a).toString(), "W"];
};
const esc = (t) => String(t).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);

class WallDashboard extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: "open" });
    this._cfg = DEFAULTS;
    this._manualRooms = null;
    this._rooms = null;
    this._open = null;
    this._timers = {};
    this._built = false;
  }

  set panel(p) {
    const c = p?.config || {};
    this._cfg = {
      ...DEFAULTS,
      ...c,
      entities: { ...DEFAULTS.entities, ...(c.entities || {}) },
      security: { ...DEFAULTS.security, ...(c.security || {}) },
      car: { ...DEFAULTS.car, ...(c.car || {}) },
    };
    this._manualRooms = Array.isArray(c.rooms) && c.rooms.length ? c.rooms : null;
  }

  set hass(h) {
    this._hass = h;
    try {
      if (!this._built) {
        this._build();
        this._loadRooms();
      }
      this._update();
    } catch (e) {
      console.error("wall-dashboard:", e);
      this.shadowRoot.innerHTML = `<pre style="padding:2em;color:#f87171;background:#080b11;height:100%;white-space:pre-wrap">wall-dashboard error:\n${esc(e.stack || e)}</pre>`;
      this._built = false;
    }
  }

  connectedCallback() {
    this._tick = setInterval(() => {
      this._clock();
      this._refreshCams();
    }, 10000);
  }
  disconnectedCallback() {
    clearInterval(this._tick);
    Object.values(this._timers).forEach(clearTimeout);
  }

  _build() {
    const cfg = this._cfg;
    const sec = cfg.security;
    this.shadowRoot.innerHTML = `
      <link rel="stylesheet" href="${cfg.fonts_css}">
      <style>${STYLE}</style>
      <div class="stage">
        <header>
          <div><div class="clock"></div><div class="date"></div></div>
          <div class="banner-slot" style="display:contents"></div>
          <div class="sunline"></div>
        </header>
        <div class="build">v${BUILD}</div>
        <main class="grid">
          ${CARDS.map(
            (c) => `<button class="card" data-key="${c.key}" style="grid-column:span ${c.span}" aria-label="${c.label} details">
              <div class="row">${svg(c.key)}<span>${c.label}</span></div>
              <div class="big"><span class="v">–</span><small class="u"></small></div>
              <div class="sub"></div>
              ${c.key === "ev" ? '<span class="evbtn" role="button" tabindex="0"></span>' : ""}
            </button>`
          ).join("")}
          <div class="card car" data-key="car" style="grid-column:span 3">
            <div class="row">${svg("car")}<span>${esc(cfg.car.name)}</span></div>
            <div class="big"><span class="v">–</span><small class="u">%</small></div>
            <div class="sub"></div>
            <div class="facts"></div>
          </div>
          <section class="panel lights" aria-label="Lights">
            <div class="row">${svg("bulb")}<span>Lights &amp; switches</span></div>
            <div class="rooms"></div>
          </section>
          <section class="panel security" aria-label="Security">
            <div class="row">${svg("shield")}<span>Security</span></div>
            <div class="locks">
              ${(sec.locks || []).map((l, i) => `<button class="tile lock" data-lock="${i}"><span>${esc(l.name)}<small></small></span><span class="lic"></span></button>`).join("")}
            </div>
            <div class="cams">
              ${(sec.cameras || []).map((c, i) => `<button class="cam" data-cam="${i}" aria-label="${esc(c.name)} camera"><img alt="" hidden><span>${esc(c.name)}</span></button>`).join("")}
            </div>
          </section>
        </main>
        <div class="scrim" hidden><div class="sheet" role="dialog" aria-modal="true"></div></div>
      </div>`;
    this._built = true;
    const $ = (s) => this.shadowRoot.querySelector(s);
    const $$ = (s) => this.shadowRoot.querySelectorAll(s);
    this.$ = $;
    this.$$ = $$;
    $$("button.card").forEach((el) =>
      el.addEventListener("click", (e) => {
        if (!e.target.closest(".evbtn")) this._openSheet(el.dataset.key);
      })
    );
    $$(".lock").forEach((el) => el.addEventListener("click", () => this._lockTap(+el.dataset.lock, el)));
    $$(".cam").forEach((el) => el.addEventListener("click", () => this._openCamera(+el.dataset.cam)));
    const btn = $(".evbtn");
    const act = (e) => {
      e.stopPropagation();
      this._evTap();
    };
    btn.addEventListener("click", act);
    btn.addEventListener("keydown", (e) => (e.key === "Enter" || e.key === " ") && act(e));
    $(".scrim").addEventListener("click", (e) => e.target === e.currentTarget && this._closeSheet());
    this.shadowRoot.addEventListener("keydown", (e) => e.key === "Escape" && this._closeSheet());
    this._clock();
  }

  _state(key) {
    const id = this._cfg.entities[key];
    return id ? this._hass.states[id] : undefined;
  }

  _clock() {
    if (!this._built) return;
    const d = new Date();
    this.$(".clock").textContent = d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: false });
    this.$(".date").textContent = d.toLocaleDateString([], { weekday: "long", day: "numeric", month: "long" });
  }

  _theme() {
    const t = this._cfg.theme;
    if (t === "dark" || t === "light") return t;
    const sun = this._hass.states[this._cfg.sun_entity];
    return sun && sun.state === "above_horizon" ? "light" : "dark";
  }

  _values() {
    let grid = num(this._state("grid_power"));
    if (grid !== null && !this._cfg.grid_import_positive) grid = -grid; // grid > 0 = importing
    return {
      home: num(this._state("home_power")),
      grid,
      ev: num(this._state("ev_power")),
      evSwitch: this._state("ev_switch"),
    };
  }

  _update() {
    if (!this._built) return;
    const cfg = this._cfg;
    const v = this._values();
    this.setAttribute("data-theme", this._theme());

    const sun = this._hass.states[cfg.sun_entity];
    if (sun) {
      const up = sun.state === "above_horizon";
      const t = sun.attributes[up ? "next_setting" : "next_rising"];
      const time = t ? new Date(t).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: false }) : "";
      this.$(".sunline").innerHTML = `${svg(up ? "sun" : "moon")}<span>${up ? "Sunset" : "Sunrise"} ${time}</span>`;
    }

    const set = (key, o) => {
      const el = this.$(`.card[data-key="${key}"]`);
      el.querySelector(".v").textContent = o.val[0];
      el.querySelector(".u").textContent = o.val[1];
      el.querySelector(".sub").textContent = o.sub || "";
      el.classList.toggle("active", !!o.active);
      el.classList.toggle("warn", o.level === "warn");
      el.classList.toggle("crit", o.level === "crit");
    };
    const on = (w) => w !== null && Math.abs(w) >= cfg.active_w;

    set("home", { val: fmtPower(v.home), active: on(v.home), sub: "Consumption" });

    const imp = v.grid !== null && v.grid > 0 ? v.grid : 0;
    const gridLevel = imp >= cfg.grid_crit_w ? "crit" : imp >= cfg.grid_warn_w ? "warn" : "";
    set("grid", {
      val: fmtPower(v.grid),
      active: on(v.grid),
      level: gridLevel,
      sub: !on(v.grid) ? "Balanced" : v.grid > 0 ? "Importing" : "Exporting",
    });

    const charging = v.ev !== null && v.ev >= cfg.ev_charging_w;
    set("ev", { val: fmtPower(v.ev), active: charging, sub: charging ? "Charging" : "Not charging" });
    const btn = this.$(".evbtn");
    btn.hidden = !v.evSwitch;
    if (v.evSwitch && !btn.classList.contains("armed")) btn.textContent = v.evSwitch.state === "on" ? "Stop charging" : "Start charging";

    // calm by default: banner only for amber / red conditions
    const msg = gridLevel ? { crit: gridLevel === "crit", text: `High grid import ${fmtPower(v.grid).join(" ")}` } : null;
    this.$(".banner-slot").innerHTML = msg
      ? `<div class="banner ${msg.crit ? "crit" : ""}" role="alert">${svg("alert")}<span>${esc(msg.text)}</span></div>`
      : "";

    this._updateCar();
    this._updateRooms();
    this._updateSecurity();
    if (this._open && this._open !== "camera") this._renderStats();
  }

  /* ---------- lights ---------- */
  async _loadRooms() {
    if (this._manualRooms) return this._setRooms(this._manualRooms);
    let rooms = null;
    try {
      const [areas, ents, devs] = await Promise.all([
        this._hass.callWS({ type: "config/area_registry/list" }),
        this._hass.callWS({ type: "config/entity_registry/list" }),
        this._hass.callWS({ type: "config/device_registry/list" }),
      ]);
      const areaName = Object.fromEntries(areas.map((a) => [a.area_id, a.name]));
      const devArea = Object.fromEntries(devs.map((d) => [d.id, d.area_id]));
      const regs = Object.fromEntries(ents.map((e) => [e.entity_id, e]));
      const groups = {};
      const extra = new Set(this._cfg.switches || []);
      const lskip = this._cfg.light_exclude ? new RegExp(this._cfg.light_exclude) : null;
      const skip = this._cfg.switch_exclude ? new RegExp(this._cfg.switch_exclude) : null;
      Object.keys(this._hass.states)
        .filter((id) => {
          const r = regs[id];
          if (r?.hidden_by || r?.disabled_by) return false;
          if (id.startsWith("light.")) return !LIGHT_EXCLUDE.test(id) && !(lskip && lskip.test(id));
          if (!id.startsWith("switch.")) return false;
          if (extra.has(id)) return true;
          return !r?.entity_category && !SWITCH_EXCLUDE.test(id) && !(skip && skip.test(id));
        })
        .forEach((id) => {
          const r = regs[id] || {};
          const name = areaName[r.area_id || devArea[r.device_id]] || "Other";
          (groups[name] = groups[name] || []).push(id);
        });
      rooms = Object.keys(groups)
        .sort((a, b) => (a === "Other") - (b === "Other") || a.localeCompare(b))
        .map((name) => ({ name, lights: groups[name].sort() }));
    } catch (e) {
      /* registry needs an admin user; fall back to the built-in grouping */
    }
    this._setRooms(rooms && rooms.length ? rooms : FALLBACK_ROOMS);
  }

  _setRooms(rooms) {
    this._rooms = rooms;
    const box = this.$(".rooms");
    box.innerHTML = rooms
      .map(
        (r, i) => `<div class="rgroup">
          <button class="tile room" data-room="${i}"><span>${esc(r.name)}<small></small></span>${svg("bulb")}</button>
          ${r.lights.length > 1 ? `<div class="lchips">${r.lights.map((id) => `<button class="chip" data-light="${esc(id)}"></button>`).join("")}</div>` : ""}
        </div>`
      )
      .join("");
    box.querySelectorAll(".room").forEach((el) => el.addEventListener("click", () => this._toggleRoom(+el.dataset.room)));
    box.querySelectorAll(".chip").forEach((el) =>
      el.addEventListener("click", () => this._hass.callService("homeassistant", "toggle", { entity_id: el.dataset.light }))
    );
    this._update();
  }

  _roomLights(i) {
    return ((this._rooms || [])[i]?.lights || []).map((id) => this._hass.states[id]).filter(Boolean);
  }

  _updateRooms() {
    if (!this._rooms) return;
    this.$$(".room").forEach((el) => {
      const ls = this._roomLights(+el.dataset.room);
      const onN = ls.filter((l) => l.state === "on").length;
      el.disabled = !ls.length;
      el.classList.toggle("on", onN > 0);
      el.setAttribute("aria-pressed", onN > 0 ? "true" : "false");
      el.querySelector("small").textContent = !ls.length ? "Unavailable" : onN ? `${onN} of ${ls.length} on` : "Off";
    });
    this.$$(".chip").forEach((el) => {
      const st = this._hass.states[el.dataset.light];
      el.disabled = !st || st.state === "unavailable";
      el.classList.toggle("on", st?.state === "on");
      el.setAttribute("aria-pressed", st?.state === "on" ? "true" : "false");
      el.textContent = st?.attributes?.friendly_name || el.dataset.light.replace("light.", "");
    });
  }

  _toggleRoom(i) {
    const ls = this._roomLights(i);
    if (!ls.length) return;
    const anyOn = ls.some((l) => l.state === "on");
    this._hass.callService("homeassistant", anyOn ? "turn_off" : "turn_on", { entity_id: ls.map((l) => l.entity_id) });
  }

  /* ---------- car ---------- */
  _updateCar() {
    const c = this._cfg.car;
    const st = (k) => (c[k] ? this._hass.states[c[k]] : undefined);
    const val = (k) => {
      const s = st(k);
      return !s || s.state === "unavailable" || s.state === "unknown" ? null : s.state;
    };
    const el = this.$(".car");
    const soc = parseFloat(val("soc"));
    el.querySelector(".v").textContent = Number.isNaN(soc) ? "–" : Math.round(soc);
    const charging = st("charging")?.state === "on";
    el.classList.toggle("active", charging);
    const pw = num(st("power"));
    const rem = parseFloat(val("remaining"));
    const dur = (m) => (m >= 60 ? `${Math.floor(m / 60)} h ${Math.round(m % 60)} min` : `${Math.round(m)} min`);
    el.querySelector(".sub").textContent = charging
      ? `Charging${pw ? " " + fmtPower(pw).join(" ") : ""}${!Number.isNaN(rem) && rem > 0 ? " · " + dur(rem) + " left" : ""}`
      : val("status")?.replace(/_/g, " ") || "Not charging";
    const facts = [];
    const odo = parseFloat(val("odometer"));
    if (!Number.isNaN(odo)) facts.push(["Odometer", `${Math.round(odo).toLocaleString("nb-NO")} km`]);
    const rng = parseFloat(val("range"));
    if (!Number.isNaN(rng)) facts.push(["Range", `${Math.round(rng)} km`]);
    const loc = st("location");
    if (loc && loc.state !== "unavailable" && loc.state !== "unknown") {
      const a = loc.attributes || {};
      const place = loc.state === "not_home" ? "Away" : loc.state === "home" ? "Home" : loc.state;
      facts.push(["Location", `${a.latitude != null && loc.state === "not_home" ? `${(+a.latitude).toFixed(3)}, ${(+a.longitude).toFixed(3)}` : place}`]);
    }
    el.querySelector(".facts").innerHTML = facts.map(([k, v]) => `<div><span>${k}</span><b>${esc(v)}</b></div>`).join("");
  }

  /* ---------- security ---------- */
  _updateSecurity() {
    const sec = this._cfg.security;
    this.$$(".lock").forEach((el) => {
      if (el.classList.contains("armed")) return;
      const l = sec.locks[+el.dataset.lock];
      const st = this._hass.states[l.entity];
      const door = l.door && this._hass.states[l.door];
      const state = st?.state;
      const open = door?.state === "on";
      el.disabled = !st || state === "unavailable";
      el.classList.toggle("on", state === "locked");
      el.querySelector("small").textContent = !st
        ? "Unavailable"
        : `${state === "locked" ? "Locked" : state === "unlocked" ? "Unlocked" : state}${door ? (open ? " · door open" : " · door closed") : ""}`;
      el.querySelector(".lic").innerHTML = svg(state === "locked" ? "lock" : "unlock");
    });
    this._refreshCams();
  }

  _lockTap(i, el) {
    const l = this._cfg.security.locks[i];
    const st = this._hass.states[l.entity];
    if (!st) return;
    if (st.state !== "locked") {
      this._hass.callService("lock", "lock", { entity_id: l.entity }); // locking is safe: one tap
      return;
    }
    if (!el.classList.contains("armed")) {
      el.classList.add("armed"); // unlocking is risky: second tap
      el.querySelector("small").textContent = "Tap again to unlock";
      clearTimeout(this._timers["lock" + i]);
      this._timers["lock" + i] = setTimeout(() => {
        el.classList.remove("armed");
        this._updateSecurity();
      }, this._cfg.arm_seconds * 1000);
      return;
    }
    clearTimeout(this._timers["lock" + i]);
    el.classList.remove("armed");
    this._hass.callService("lock", "unlock", { entity_id: l.entity });
  }

  _camUrl(entity, stream) {
    const st = this._hass.states[entity];
    if (!st) return "";
    if (stream) return `/api/camera_proxy_stream/${entity}?token=${st.attributes.access_token}`;
    const pic = st.attributes.entity_picture;
    if (!pic) return "";
    return `${pic}${pic.includes("?") ? "&" : "?"}_=${Date.now()}`;
  }

  _refreshCams() {
    if (!this._built) return;
    const cams = this._cfg.security.cameras || [];
    this.$$(".cam").forEach((el) => {
      const url = this._camUrl(cams[+el.dataset.cam].entity);
      const img = el.querySelector("img");
      if (url) {
        img.src = url;
        img.hidden = false;
      }
    });
  }

  _openCamera(i) {
    const c = this._cfg.security.cameras[i];
    this._open = "camera";
    const sheet = this.$(".sheet");
    sheet.style.setProperty("--c", "var(--sec)");
    sheet.innerHTML = `
      <h2>${svg("camera")}<span>${esc(c.name)}</span><button class="close" aria-label="Close">${svg("close")}</button></h2>
      <img class="live" alt="${esc(c.name)} live view" src="${this._camUrl(c.entity, true)}">`;
    this._showSheet();
  }

  /* ---------- EV ---------- */
  _evTap() {
    const sw = this._state("ev_switch");
    if (!sw) return;
    const btn = this.$(".evbtn");
    if (!btn.classList.contains("armed")) {
      btn.classList.add("armed");
      btn.textContent = "Tap again to confirm";
      this._timers.ev = setTimeout(() => {
        btn.classList.remove("armed");
        this._update();
      }, this._cfg.arm_seconds * 1000);
      return;
    }
    clearTimeout(this._timers.ev);
    btn.classList.remove("armed");
    this._hass.callService("homeassistant", sw.state === "on" ? "turn_off" : "turn_on", {
      entity_id: this._cfg.entities.ev_switch,
    });
  }

  /* ---------- detail sheet ---------- */
  _showSheet() {
    const sheet = this.$(".sheet");
    sheet.querySelector(".close").addEventListener("click", () => this._closeSheet());
    this.$(".scrim").hidden = false;
    sheet.querySelector(".close").focus();
  }

  async _openSheet(key) {
    this._open = key;
    this._range = null;
    const card = CARDS.find((c) => c.key === key);
    const sheet = this.$(".sheet");
    sheet.style.setProperty("--c", `var(--${key})`);
    sheet.innerHTML = `
      <h2>${svg(key)}<span>${card.label} · last 24 h</span><button class="close" aria-label="Close">${svg("close")}</button></h2>
      <svg class="chart" viewBox="0 0 960 300" preserveAspectRatio="none"></svg>
      <div class="stats"></div>`;
    this._showSheet();
    this._renderStats();
    const id = this._cfg.entities[{ home: "home_power", grid: "grid_power", ev: "ev_power" }[key]];
    if (!id) return;
    try {
      const end = new Date();
      const start = new Date(end - 24 * 3600 * 1000);
      const res = await this._hass.callWS({
        type: "history/history_during_period",
        start_time: start.toISOString(),
        end_time: end.toISOString(),
        entity_ids: [id],
        minimal_response: true,
        no_attributes: true,
        significant_changes_only: false,
      });
      if (this._open !== key) return;
      const pts = (res[id] || [])
        .map((p) => ({ t: p.lu ? p.lu * 1000 : Date.parse(p.last_updated), v: parseFloat(p.s ?? p.state) }))
        .filter((p) => !Number.isNaN(p.v) && p.t);
      this._drawChart(pts, start.getTime(), end.getTime());
    } catch (e) {
      /* history unavailable: the sheet still shows live stats */
    }
  }

  _drawChart(pts, t0, t1) {
    const el = this.$(".chart");
    if (!el || pts.length < 2) return;
    const vs = pts.map((p) => p.v);
    const min = Math.min(0, ...vs);
    const max = Math.max(...vs) || 1;
    const x = (t) => ((t - t0) / (t1 - t0)) * 960;
    const y = (v) => 290 - ((v - min) / (max - min)) * 280;
    const d = pts.map((p, i) => `${i ? "L" : "M"}${x(p.t).toFixed(1)},${y(p.v).toFixed(1)}`).join("");
    el.innerHTML = `<path class="area" d="${d}L${x(pts.at(-1).t).toFixed(1)},300L${x(pts[0].t).toFixed(1)},300Z"/><path class="line" d="${d}"/>`;
    this._range = { min: Math.min(...vs), max: Math.max(...vs), avg: vs.reduce((a, b) => a + b, 0) / vs.length };
    this._renderStats();
  }

  _renderStats() {
    const el = this.$(".stats");
    if (!el || !this._open) return;
    const v = this._values();
    const live = { home: v.home, grid: v.grid, ev: v.ev }[this._open];
    const f = (n) => (n === null || n === undefined ? "–" : fmtPower(n).join(" "));
    const r = this._range || {};
    el.innerHTML = [["Now", live], ["Average", r.avg], ["Peak", r.max], ["Low", r.min]]
      .map(([l, n]) => `<div>${l}<b>${f(n)}</b></div>`)
      .join("");
  }

  _closeSheet() {
    this._open = null;
    this._range = null;
    this.$(".sheet").innerHTML = ""; // drops the live camera stream connection
    this.$(".scrim").hidden = true;
  }
}

customElements.define("wall-dashboard", WallDashboard);
