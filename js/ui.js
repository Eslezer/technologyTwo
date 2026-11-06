/* Shared UI helpers: icons, escaping, dates, toast, modal. */
window.UI = (function () {
  const PATHS = {
    user: '<circle cx="12" cy="8" r="4"/><path d="M4 21c0-4 4-6 8-6s8 2 8 6"/>',
    home: '<path d="M3 11l9-8 9 8"/><path d="M5 10v10h14V10"/>',
    activity: '<path d="M3 12h4l3-8 4 16 3-8h4"/>',
    book: '<path d="M4 4h6a3 3 0 0 1 3 3v13a2 2 0 0 0-2-2H4z"/><path d="M20 4h-6a3 3 0 0 0-3 3v13a2 2 0 0 1 2-2h7z"/>',
    org: '<circle cx="9" cy="8" r="3"/><circle cx="17" cy="10" r="2.5"/><path d="M3 20c0-3 3-5 6-5s6 2 6 5"/><path d="M15 20c0-2 1-3.5 4-3.5"/>',
    calendar: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/>',
    mail: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 7l9 6 9-6"/>',
    grades: '<path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/>',
    tools: '<path d="M14 6a4 4 0 0 0 5 5l-9 9a2.1 2.1 0 0 1-3-3z"/>',
    logout: '<path d="M15 4h4v16h-4M10 8l-4 4 4 4M6 12h10"/>',
    heart: '<path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z"/>',
    access: '<circle cx="12" cy="4.5" r="1.5"/><path d="M5 8l7 1.5L19 8M12 9.5V14l-3 6M12 14l3 6"/>',
    wallet: '<rect x="3" y="6" width="18" height="14" rx="2"/><path d="M3 10h18M16 15h2"/>',
    spark: '<path d="M12 3v4M12 17v4M3 12h4M17 12h4M6 6l2.5 2.5M15.5 15.5L18 18M6 18l2.5-2.5M15.5 8.5L18 6"/>',
    check: '<path d="M5 12l5 5 9-10"/>',
    alert: '<path d="M12 3l10 18H2z"/><path d="M12 10v5M12 18v.5"/>',
    info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v6M12 7.5v.5"/>',
    eye: '<path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>',
    lock: '<rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/>',
    shield: '<path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z"/>',
    bell: '<path d="M6 16V11a6 6 0 0 1 12 0v5l2 2H4z"/><path d="M10 20a2 2 0 0 0 4 0"/>',
    chat: '<path d="M4 5h16v11H9l-5 4z"/>',
    send: '<path d="M4 12l16-8-6 16-2-7z"/>',
    flag: '<path d="M5 21V4M5 4h11l-2 4 2 4H5"/>',
    thumb: '<path d="M7 10v10H4V10zM7 10l4-7a2 2 0 0 1 2 2v4h6a2 2 0 0 1 2 2.3l-1.3 7A2 2 0 0 1 17.7 20H7"/>',
    search: '<circle cx="11" cy="11" r="7"/><path d="M20 20l-4-4"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
    clipboard: '<rect x="5" y="4" width="14" height="17" rx="2"/><path d="M9 4h6v3H9zM9 12h6M9 16h4"/>',
    x: '<path d="M6 6l12 12M18 6L6 18"/>',
    menu: '<path d="M4 6h16M4 12h16M4 18h16"/>',
    pin: '<path d="M9 3h6l-1 6 3 3H7l3-3zM12 12v9"/>',
    smile: '<circle cx="12" cy="12" r="9"/><path d="M8 14s1.5 2 4 2 4-2 4-2M9 9.5v.5M15 9.5v.5"/>',
    users: '<circle cx="9" cy="8" r="3.5"/><path d="M2 20c0-3.5 3-6 7-6s7 2.5 7 6"/><path d="M16 4.5a3.5 3.5 0 0 1 0 7M18 14c2.5.5 4 2.6 4 6"/>',
  };

  function icon(name, cls) {
    return `<svg class="icon ${cls || ""}" viewBox="0 0 24 24" aria-hidden="true">${PATHS[name] || ""}</svg>`;
  }

  function esc(s) {
    return String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  }

  const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  function parseDate(iso) { const [y, m, d] = iso.split("-").map(Number); return new Date(y, m - 1, d); }
  function fmtDate(iso) { const d = parseDate(iso); return `${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`; }
  function dayMonth(iso) { const d = parseDate(iso); return { day: d.getDate(), mon: MONTHS[d.getMonth()] }; }

  const LEVEL = {
    ok: { label: "On track", icon: "check" },
    watch: { label: "Keep an eye on", icon: "info" },
    alert: { label: "Needs attention", icon: "alert" },
  };
  function chip(level, text) {
    const l = LEVEL[level];
    return `<span class="chip ${level}">${icon(l.icon)}${esc(text || l.label)}</span>`;
  }

  let toastTimer;
  function toast(msg) {
    const el = document.getElementById("toast");
    el.textContent = msg;
    el.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.classList.remove("show"), 3200);
  }

  const modal = {
    el: () => document.getElementById("modal"),
    open(html) {
      const d = this.el();
      d.innerHTML = html;
      if (!d.open) d.showModal();
      d.scrollTop = 0;
      return d;
    },
    close() { const d = this.el(); if (d.open) d.close(); },
  };

  // Consistent pastel avatar colour per alias
  const AVA = ["#7a4fa3", "#1f7a8c", "#b4572e", "#3d7a2a", "#8c2f5a", "#4a5fb3", "#7d6a17"];
  function avatarColor(alias) {
    let h = 0;
    for (const c of alias) h = (h * 31 + c.charCodeAt(0)) >>> 0;
    return AVA[h % AVA.length];
  }
  function alias(name, staff) {
    const initial = staff ? "M" : name.replace("Anonymous ", "").charAt(0);
    return `<span class="alias ${staff ? "staff" : ""}"><span class="ava" style="background:${avatarColor(name)}">${esc(initial)}</span>${esc(name)}${staff ? ' <span class="chip blue">Staff</span>' : ""}</span>`;
  }

  return { icon, esc, fmtDate, dayMonth, chip, toast, modal, alias, LEVEL };
})();
