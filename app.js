(function () {
  "use strict";

  const CFG = Object.assign({
    title: "Project Roadmap",
    subtitle: "",
    sheetCsvUrl: "",
    sheetEditUrl: "",
    fallbackCsv: "data/sample-milestones.csv",
    slashDateOrder: "DMY",
    themeColors: {},
    defaultZoom: "quarter",
  }, window.GANTT_CONFIG || {});

  const PALETTE = ["#2563eb", "#16a34a", "#ea580c", "#9333ea", "#db2777", "#0891b2", "#ca8a04", "#64748b", "#dc2626", "#4f46e5"];
  const HORIZONS = { short: "Short-term", medium: "Medium-term", long: "Long-term" };
  const HORIZON_ORDER = ["short", "medium", "long"];
  const STATUSES = { planned: "Planned", active: "In progress", done: "Done", delayed: "Delayed" };
  const ZOOMS = { month: 8, quarter: 3, year: 1.2 }; // pixels per day
  const DAY = 86400000;
  const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

  const state = {
    items: [],
    themes: [],
    colors: {},
    hiddenThemes: new Set(),
    hiddenHorizons: new Set(),
    query: "",
    groupBy: "theme",
    zoom: ZOOMS[CFG.defaultZoom] ? CFG.defaultZoom : "quarter",
    scrolledToToday: false,
  };

  const $ = (sel) => document.querySelector(sel);

  function esc(s) {
    return String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  }

  // ---------- Parsing ----------

  function parseCSV(text) {
    const rows = [];
    let row = [], field = "", inQuotes = false;
    for (let i = 0; i < text.length; i++) {
      const c = text[i];
      if (inQuotes) {
        if (c === '"') {
          if (text[i + 1] === '"') { field += '"'; i++; } else inQuotes = false;
        } else field += c;
      } else if (c === '"') inQuotes = true;
      else if (c === ",") { row.push(field); field = ""; }
      else if (c === "\n" || c === "\r") {
        if (c === "\r" && text[i + 1] === "\n") i++;
        row.push(field); rows.push(row); row = []; field = "";
      } else field += c;
    }
    if (field !== "" || row.length) { row.push(field); rows.push(row); }
    return rows.filter((r) => r.some((f) => f.trim() !== ""));
  }

  // Returns a UTC timestamp, null for empty, NaN for unreadable.
  function parseDate(s, isEnd) {
    s = (s || "").trim();
    if (!s) return null;
    let m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
    if (m) return Date.UTC(+m[1], +m[2] - 1, +m[3]);
    m = s.match(/^(\d{4})-(\d{1,2})$/);
    if (m) return isEnd ? Date.UTC(+m[1], +m[2], 0) : Date.UTC(+m[1], +m[2] - 1, 1);
    m = s.match(/^(\d{1,2})[/.](\d{1,2})[/.](\d{4})$/);
    if (m) {
      const [d, mo] = CFG.slashDateOrder === "MDY" ? [+m[2], +m[1]] : [+m[1], +m[2]];
      return Date.UTC(+m[3], mo - 1, d);
    }
    return NaN;
  }

  function normHorizon(s) {
    s = (s || "").trim().toLowerCase();
    if (s.startsWith("s")) return "short";
    if (s.startsWith("m")) return "medium";
    if (s.startsWith("l")) return "long";
    return "";
  }

  function normStatus(s) {
    s = (s || "").trim().toLowerCase();
    if (!s) return "planned";
    if (/done|complete|finished/.test(s)) return "done";
    if (/progress|ongoing|active|started/.test(s)) return "active";
    if (/delay|late|risk|blocked/.test(s)) return "delayed";
    return "planned";
  }

  function normalize(rows) {
    const warnings = [];
    if (!rows.length) return { items: [], warnings: ["The data source is empty."] };

    const head = rows[0].map((h) => h.trim().toLowerCase());
    const idx = {};
    ["title", "theme", "horizon", "start", "end", "owner", "status", "notes"].forEach((k) => { idx[k] = head.indexOf(k); });
    const missing = ["title", "theme", "start"].filter((k) => idx[k] < 0);
    if (missing.length) {
      return { items: [], warnings: [`Missing required column(s): ${missing.join(", ")}. The first row must contain the column names.`] };
    }

    const items = [];
    rows.slice(1).forEach((r, i) => {
      const line = i + 2;
      const get = (k) => (idx[k] >= 0 ? (r[idx[k]] || "").trim() : "");
      const title = get("title");
      if (!title) return;

      const start = parseDate(get("start"), false);
      let end = parseDate(get("end"), true);
      if (start === null || Number.isNaN(start)) {
        warnings.push(`Row ${line} “${title}”: start date “${get("start")}” is missing or unreadable (use YYYY-MM-DD).`);
        return;
      }
      if (Number.isNaN(end)) {
        warnings.push(`Row ${line} “${title}”: end date “${get("end")}” is unreadable, shown as a single-day milestone.`);
        end = null;
      }
      if (end !== null && end < start) {
        warnings.push(`Row ${line} “${title}”: end date is before start date, shown as a single-day milestone.`);
        end = null;
      }

      let horizon = normHorizon(get("horizon"));
      if (!horizon) {
        warnings.push(`Row ${line} “${title}”: horizon “${get("horizon")}” not recognised (use short, medium or long), treated as medium.`);
        horizon = "medium";
      }

      items.push({
        id: items.length,
        title,
        theme: get("theme") || "Other",
        horizon,
        start,
        end: end === null ? start : end,
        point: end === null || end === start,
        owner: get("owner"),
        status: normStatus(get("status")),
        notes: get("notes"),
      });
    });
    return { items, warnings };
  }

  // ---------- Loading ----------

  async function fetchText(url) {
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.text();
  }

  async function load() {
    const warnings = [];
    let text, source;
    if (CFG.sheetCsvUrl) {
      try {
        text = await fetchText(CFG.sheetCsvUrl);
        if (/^\s*<(!doctype|html)/i.test(text)) throw new Error("got a web page instead of CSV — publish the sheet as CSV");
        source = "Google Sheet";
      } catch (err) {
        warnings.push(`Could not load the Google Sheet (${err.message}). Showing sample data instead.`);
      }
    }
    if (text === undefined) {
      try {
        text = await fetchText(CFG.fallbackCsv);
        source = "sample data";
      } catch (err) {
        $("#gantt").innerHTML = `<p class="empty">Could not load any milestone data (${esc(err.message)}).<br>If you opened index.html directly from disk, serve the folder instead, e.g. <code>python3 -m http.server</code>.</p>`;
        return;
      }
    }

    const parsed = normalize(parseCSV(text));
    state.items = parsed.items;
    warnings.push(...parsed.warnings);

    // Themes listed in config.js come first, in that order; new ones follow as they appear.
    const present = new Set(state.items.map((it) => it.theme));
    state.themes = Object.keys(CFG.themeColors).filter((t) => present.has(t));
    state.items.forEach((it) => { if (!state.themes.includes(it.theme)) state.themes.push(it.theme); });
    const used = new Set(Object.values(CFG.themeColors).map((c) => c.toLowerCase()));
    const free = PALETTE.filter((c) => !used.has(c));
    let next = 0;
    state.colors = {};
    state.themes.forEach((t) => {
      state.colors[t] = CFG.themeColors[t] || free[next++ % free.length] || PALETTE[next % PALETTE.length];
    });

    const time = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    const hint = source === "sample data" && !CFG.sheetCsvUrl ? " — set <code>sheetCsvUrl</code> in config.js to connect your Google Sheet" : "";
    $("#source").innerHTML = `${state.items.length} milestones · loaded from ${esc(source)} at ${time}${hint}`;

    renderWarnings(warnings);
    renderFilters();
    render();
  }

  // ---------- Controls ----------

  function renderWarnings(warnings) {
    const box = $("#warnings");
    if (!warnings.length) { box.hidden = true; return; }
    box.hidden = false;
    box.innerHTML = `<details${warnings.length <= 3 ? " open" : ""}><summary>⚠ ${warnings.length} issue${warnings.length > 1 ? "s" : ""} in the data</summary><ul>${warnings.map((w) => `<li>${esc(w)}</li>`).join("")}</ul></details>`;
  }

  function renderFilters() {
    $("#theme-filters").innerHTML = state.themes.map((t) =>
      `<button type="button" class="chip" data-theme="${esc(t)}" aria-pressed="${!state.hiddenThemes.has(t)}" style="--c:${state.colors[t]}"><span class="swatch"></span>${esc(t)}</button>`
    ).join("");
    $("#horizon-filters").innerHTML = HORIZON_ORDER.map((h) =>
      `<button type="button" class="chip" data-horizon="${h}" aria-pressed="${!state.hiddenHorizons.has(h)}"><span class="swatch h-${h}"></span>${HORIZONS[h]}</button>`
    ).join("");
  }

  function toggle(set, key) {
    if (set.has(key)) set.delete(key); else set.add(key);
  }

  function bindControls() {
    $("#title").textContent = CFG.title;
    document.title = CFG.title;
    $("#subtitle").textContent = CFG.subtitle;
    if (CFG.sheetEditUrl) {
      $("#edit-link").href = CFG.sheetEditUrl;
      $("#edit-link").hidden = false;
    }

    $("#theme-filters").addEventListener("click", (e) => {
      const chip = e.target.closest(".chip");
      if (!chip) return;
      toggle(state.hiddenThemes, chip.dataset.theme);
      chip.setAttribute("aria-pressed", !state.hiddenThemes.has(chip.dataset.theme));
      render();
    });
    $("#horizon-filters").addEventListener("click", (e) => {
      const chip = e.target.closest(".chip");
      if (!chip) return;
      toggle(state.hiddenHorizons, chip.dataset.horizon);
      chip.setAttribute("aria-pressed", !state.hiddenHorizons.has(chip.dataset.horizon));
      render();
    });
    $("#search").addEventListener("input", (e) => { state.query = e.target.value.trim().toLowerCase(); render(); });
    $("#group-by").addEventListener("change", (e) => { state.groupBy = e.target.value; render(); });
    $("#zoom").addEventListener("click", (e) => {
      const btn = e.target.closest("button");
      if (!btn) return;
      state.zoom = btn.dataset.zoom;
      state.scrolledToToday = false;
      render();
    });
    $("#reload").addEventListener("click", () => load());

    $("#gantt").addEventListener("click", (e) => {
      const el = e.target.closest("[data-id]");
      if (el) { e.stopPropagation(); showPopover(state.items[+el.dataset.id], el); }
    });
    $("#gantt").addEventListener("keydown", (e) => {
      const el = e.target.closest("[data-id]");
      if (el && (e.key === "Enter" || e.key === " ")) { e.preventDefault(); showPopover(state.items[+el.dataset.id], el); }
    });
    document.addEventListener("click", (e) => { if (!e.target.closest("#popover")) hidePopover(); });
    document.addEventListener("keydown", (e) => { if (e.key === "Escape") hidePopover(); });
    window.addEventListener("resize", hidePopover);
    $("#gantt").addEventListener("scroll", hidePopover, true);
  }

  // ---------- Gantt ----------

  function matches(it) {
    if (state.hiddenThemes.has(it.theme) || state.hiddenHorizons.has(it.horizon)) return false;
    if (!state.query) return true;
    return [it.title, it.theme, it.owner, it.notes, HORIZONS[it.horizon], STATUSES[it.status]]
      .some((v) => v && v.toLowerCase().includes(state.query));
  }

  function fmtDate(t) {
    const d = new Date(t);
    return `${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
  }

  function fmtDuration(it) {
    const days = Math.round((it.end - it.start) / DAY) + 1;
    if (days < 14) return `${days} day${days > 1 ? "s" : ""}`;
    if (days < 60) return `${Math.round(days / 7)} weeks`;
    return `${Math.round(days / 30.44)} months`;
  }

  function todayUTC() {
    const n = new Date();
    return Date.UTC(n.getFullYear(), n.getMonth(), n.getDate());
  }

  function render() {
    document.querySelectorAll("#zoom button").forEach((b) => b.setAttribute("aria-pressed", b.dataset.zoom === state.zoom));
    hidePopover();

    const root = $("#gantt");
    const visible = state.items.filter(matches);
    if (!visible.length) {
      root.innerHTML = `<p class="empty">${state.items.length ? "No milestones match the current filters." : "No milestones yet."}</p>`;
      return;
    }

    // Time range: whole months around all visible items (and today, if close by).
    const today = todayUTC();
    let min = Math.min(...visible.map((i) => i.start));
    let max = Math.max(...visible.map((i) => i.end));
    if (today >= min - 90 * DAY && today <= max + 90 * DAY) { min = Math.min(min, today); max = Math.max(max, today); }
    const d0 = new Date(min), d1 = new Date(max);
    const rangeStart = Date.UTC(d0.getUTCFullYear(), d0.getUTCMonth(), 1);
    const rangeEnd = Date.UTC(d1.getUTCFullYear(), d1.getUTCMonth() + 1, 1);
    const px = ZOOMS[state.zoom];
    const x = (t) => ((t - rangeStart) / DAY) * px;
    const trackW = Math.round(x(rangeEnd));
    const off = (n) => `calc(var(--label-w) + ${n}px)`;

    // Scale: years and months.
    let scale = "", grid = "";
    for (let y = d0.getUTCFullYear(); y <= d1.getUTCFullYear(); y++) {
      const a = Math.max(Date.UTC(y, 0, 1), rangeStart), b = Math.min(Date.UTC(y + 1, 0, 1), rangeEnd);
      scale += `<div class="g-year" style="left:${x(a)}px;width:${x(b) - x(a)}px">${y}</div>`;
    }
    for (let t = rangeStart; t < rangeEnd;) {
      const d = new Date(t);
      const nextT = Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 1);
      const w = x(nextT) - x(t);
      const label = w >= 28 ? MONTHS[d.getUTCMonth()] : w >= 10 ? MONTHS[d.getUTCMonth()][0] : "";
      scale += `<div class="g-month" style="left:${x(t)}px;width:${w}px">${label}</div>`;
      grid += `<div class="g-gridline${d.getUTCMonth() === 0 ? " year" : ""}" style="left:${off(x(t))}"></div>`;
      t = nextT;
    }
    if (today >= rangeStart && today < rangeEnd) {
      grid += `<div class="g-today" style="left:${off(x(today))}"><span>Today</span></div>`;
    }

    // Groups.
    const keys = state.groupBy === "theme" ? state.themes : HORIZON_ORDER;
    const keyOf = (it) => (state.groupBy === "theme" ? it.theme : it.horizon);
    let rows = "";
    keys.forEach((key) => {
      const group = visible.filter((it) => keyOf(it) === key).sort((a, b) => a.start - b.start || a.end - b.end);
      if (!group.length) return;
      const isTheme = state.groupBy === "theme";
      const color = isTheme ? state.colors[key] : "var(--muted)";
      const name = isTheme ? key : HORIZONS[key];
      const gs = Math.min(...group.map((i) => i.start)), ge = Math.max(...group.map((i) => i.end));
      rows += `<div class="g-row g-group" style="--c:${color}">
        <div class="g-label"><span class="swatch${isTheme ? "" : " h-" + key}"></span>${esc(name)} <span class="g-count">${group.length}</span></div>
        <div class="g-track" style="width:${trackW}px"><div class="g-span" style="left:${x(gs)}px;width:${Math.max(x(ge + DAY) - x(gs), 4)}px"></div></div>
      </div>`;

      group.forEach((it) => {
        const c = state.colors[it.theme];
        const left = x(it.start);
        const width = x(it.end + DAY) - left;
        const meta = isTheme ? HORIZONS[it.horizon] : it.theme;
        const tip = `${it.title} — ${fmtDate(it.start)}${it.point ? "" : " to " + fmtDate(it.end)}`;
        const bar = it.point
          ? `<div class="bar point h-${it.horizon} st-${it.status}" style="left:${left}px" data-id="${it.id}" tabindex="0" title="${esc(tip)}"></div>`
          : `<div class="bar h-${it.horizon} st-${it.status}" style="left:${left}px;width:${width}px" data-id="${it.id}" tabindex="0" title="${esc(tip)}">${it.status === "done" && width > 20 ? '<span class="tick">✓</span>' : ""}</div>`;
        rows += `<div class="g-row" style="--c:${c}">
          <div class="g-label" data-id="${it.id}">
            <span class="g-title">${esc(it.title)}</span>
            <span class="g-meta"><span class="status-dot st-${it.status}" title="${STATUSES[it.status]}"></span>${esc(meta)}${it.owner ? " · " + esc(it.owner) : ""}</span>
          </div>
          <div class="g-track" style="width:${trackW}px">${bar}</div>
        </div>`;
      });
    });

    const prevScroll = root.querySelector(".g-scroll")?.scrollLeft;
    root.innerHTML = `<div class="g-scroll"><div class="g-inner" style="width:${off(trackW)}">
      <div class="g-head"><div class="g-corner">Milestone</div><div class="g-scale" style="width:${trackW}px">${scale}</div></div>
      <div class="g-body">${grid}${rows}</div>
    </div></div>`;

    const scroller = root.querySelector(".g-scroll");
    if (!state.scrolledToToday) {
      scroller.scrollLeft = Math.max(0, x(today) - 120);
      state.scrolledToToday = true;
    } else if (prevScroll !== undefined) {
      scroller.scrollLeft = prevScroll;
    }
  }

  // ---------- Popover ----------

  function showPopover(it, anchor) {
    const pop = $("#popover");
    pop.style.setProperty("--c", state.colors[it.theme]);
    pop.innerHTML = `<h3>${esc(it.title)}</h3>
      <dl>
        <dt>Theme</dt><dd>${esc(it.theme)}</dd>
        <dt>Horizon</dt><dd>${HORIZONS[it.horizon]}</dd>
        <dt>${it.point ? "Date" : "Dates"}</dt><dd>${fmtDate(it.start)}${it.point ? "" : " → " + fmtDate(it.end) + ` <span style="color:var(--muted)">(${fmtDuration(it)})</span>`}</dd>
        <dt>Status</dt><dd><span class="status-dot st-${it.status}" style="display:inline-block;margin-right:6px"></span>${STATUSES[it.status]}</dd>
        ${it.owner ? `<dt>Owner</dt><dd>${esc(it.owner)}</dd>` : ""}
      </dl>
      ${it.notes ? `<p class="notes">${esc(it.notes)}</p>` : ""}`;
    pop.hidden = false;

    const r = anchor.getBoundingClientRect();
    const pw = pop.offsetWidth, ph = pop.offsetHeight;
    let left = Math.min(Math.max(16, r.left), window.innerWidth - pw - 16);
    let top = r.bottom + 8;
    if (top + ph > window.innerHeight - 16) top = Math.max(16, r.top - ph - 8);
    pop.style.left = `${left}px`;
    pop.style.top = `${top}px`;
  }

  function hidePopover() {
    $("#popover").hidden = true;
  }

  bindControls();
  load();
})();
