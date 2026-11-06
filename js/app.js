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

  function renderNav() {
    document.getElementById("nav-list").innerHTML = NAV.map((n) => {
      const lead = n.avatar
        ? `<span class="avatar">${DEMO.student.preferredName.charAt(0)}${DEMO.student.fullName.split(" ")[1].charAt(0)}</span>`
        : icon(n.icon);
      const badge = n.badge ? `<span class="badge" aria-label="${n.badge} unread">${n.badge}</span>` : "";
      return `<li><a href="${n.href}" class="${n.key === "grades" ? "active" : ""}" ${n.key === "grades" ? 'aria-current="page"' : ""}>${lead}<span>${UI.esc(n.label)}</span>${badge}</a></li>`;
    }).join("");
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
    if (parts[0] === "staff") return { role: "staff", page: "staff" };
    if (parts[0] === "grades") return { role: "student", page: "grades" };
    return { role: "student", page: "support", section: parts[1] || "overview" };
  }

  function route() {
    const r = parse();
    renderTabs(r);
    view.onclick = view.onsubmit = view.oninput = view.onchange = null;
    if (r.page === "staff") Staff.render(view);
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

  renderNav();
  window.addEventListener("hashchange", () => { route(); window.scrollTo(0, 0); });
  route();
})();
