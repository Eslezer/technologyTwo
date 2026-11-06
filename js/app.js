/* App shell: side navigation, page tabs and hash routing.
   Routes
     #/grades                 standard grades list
     #/support/<section>      student Progress & support (overview, forum, surveys, privacy)
     #/staff                  staff dashboard (next sprint)
*/
(function () {
  const { icon } = UI;
  const shell = document.getElementById("shell");
  const view = document.getElementById("view");

  const NAV = [
    { label: DEMO.student.fullName, icon: null, avatar: true, href: "#" },
    { label: "Welcome", icon: "home", href: "#" },
    { label: "Activity", icon: "activity", href: "#" },
    { label: "Subjects", icon: "book", href: "#" },
    { label: "Organisations", icon: "org", href: "#" },
    { label: "Calendar", icon: "calendar", href: "#" },
    { label: "Messages", icon: "mail", href: "#", badge: 30 },
    { label: "Grades", icon: "grades", href: "#/support/overview", key: "grades" },
    { label: "Tools", icon: "tools", href: "#" },
    { label: "Sign Out", icon: "logout", href: "#" },
  ];

  function renderNav(role) {
    const who = role === "staff" ? DEMO.staff.name : DEMO.student.fullName;
    const ini = who.replace(/^Dr /, "").split(" ").map((x) => x[0]).slice(0, 2).join("");
    const home = role === "staff" ? "#/staff" : "#/support/overview";
    document.getElementById("nav-list").innerHTML = NAV.map((n) => {
      const lead = n.avatar ? `<span class="avatar">${ini}</span>` : icon(n.icon);
      const label = n.avatar ? who : n.label;
      const href = n.key === "grades" ? home : n.href;
      const badge = n.badge ? `<span class="badge" aria-label="${n.badge} unread">${n.badge}</span>` : "";
      return `<li><a href="${href}">${lead}<span>${UI.esc(label)}</span>${badge}</a></li>`;
    }).join("") +
      `<li class="lets-help"><a href="${home}">${icon("heart")}<span>Let's help</span></a></li>`;
  }

  function renderTabs(route) {
    const tabs = route.role === "staff"
      ? [{ href: "#/staff", label: "Student support", on: true, isNew: true }]
      : [
          { href: "#/grades", label: "Grades", on: route.page === "grades" },
          { href: "#/support/overview", label: "Progress & support", on: route.page === "support", isNew: true },
        ];
    document.getElementById("page-tabs").innerHTML = tabs
      .map((t) => `<a href="${t.href}" class="${t.on ? "on" : ""}" ${t.on ? 'aria-current="page"' : ""}>${t.label}${t.isNew ? '<span class="new">New</span>' : ""}</a>`)
      .join("");
    document.querySelectorAll(".role-switch a").forEach((a) => {
      a.classList.toggle("on", a.dataset.role === route.role);
    });
  }

  function parse() {
    const parts = (location.hash || "#/support/overview").replace(/^#\/?/, "").split("/");
    if (parts[0] === "staff") return { role: "staff", page: "staff", parts: parts.slice(1) };
    if (parts[0] === "grades") return { role: "student", page: "grades" };
    return { role: "student", page: "support", section: parts[1] || "overview" };
  }

  function route() {
    const r = parse();
    renderNav(r.role);
    renderTabs(r);
    view.onclick = view.onsubmit = view.oninput = view.onchange = null;
    if (r.role === "staff") Pulse.hide(); else Pulse.maybeAuto();
    if (r.page === "staff") Staff.render(view, r.parts);
    else if (r.page === "grades") Student.renderGrades(view);
    else Student.renderSupport(view, r.section);
    shell.classList.remove("nav-open");
    document.getElementById("menu-btn").setAttribute("aria-expanded", "false");
  }

  // Mobile nav
  const menuBtn = document.getElementById("menu-btn");
  menuBtn.innerHTML = icon("menu");
  menuBtn.addEventListener("click", () => {
    const open = shell.classList.toggle("nav-open");
    menuBtn.setAttribute("aria-expanded", String(open));
  });
  shell.addEventListener("click", (e) => {
    if (shell.classList.contains("nav-open") && !e.target.closest(".sidenav") && !e.target.closest("#menu-btn")) {
      shell.classList.remove("nav-open");
    }
  });

  // Close modal when clicking the backdrop
  document.getElementById("modal").addEventListener("click", (e) => {
    if (e.target.id === "modal") UI.modal.close();
  });

  // "Reset demo" footer button (student and staff pages)
  document.addEventListener("click", (e) => {
    if (e.target.closest("[data-pulse-demo]")) { Pulse.show(true); return; }
    if (!e.target.closest("[data-reset]")) return;
    Store.reset();
    UI.toast("Demo data reset.");
    route();
  });

  window.addEventListener("hashchange", () => { route(); window.scrollTo(0, 0); });
  route();
})();
