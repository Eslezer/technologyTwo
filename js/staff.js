/* Staff dashboard: placeholder for the next sprint.
   It already reads the same data and risk engine as the student view,
   so building it out means adding views here, not new plumbing. */
window.Staff = (function () {
  const { icon, esc, chip } = UI;

  function render(view) {
    document.getElementById("page-title").textContent = "Grades";
    const answers = Store.get("answers", {});
    const signals = Risk.signals(DEMO, answers);
    const score = Risk.score(signals);
    const dismissed = Store.get("dismissed", {});
    const alerts = signals.filter((s) => s.level === "alert");

    view.innerHTML = `
      <div class="placeholder" style="text-align:left">
        <h2 style="margin-top:0">Staff dashboard: coming next sprint</h2>
        <p>This view will show at-risk students, an escalation queue and moderation tools for the forum.
        It already uses the same data and risk rules as the student view. Here is the demo student as staff would see them:</p>
        <div class="card" style="margin-top:16px">
          <div style="display:flex;justify-content:space-between;gap:12px;flex-wrap:wrap;align-items:center">
            <div>
              <h3>${esc(DEMO.student.fullName)}</h3>
              <p class="sub">${esc(DEMO.student.course)} · Year ${DEMO.student.year} · ${esc(DEMO.student.campus)}</p>
            </div>
            <div style="text-align:right">
              <div style="font-size:28px;font-weight:600">${score}<small style="font-size:14px;color:var(--muted)"> / 100</small></div>
              <div class="sub">Risk score</div>
            </div>
          </div>
          <ul style="margin:14px 0 0;padding-left:18px">
            ${signals.map((s) => `<li style="margin-bottom:6px">${chip(s.level)} ${esc(s.title)} <span class="sub">· ${esc(s.source)}${dismissed[s.id] === "fine" ? " · student said they're fine" : ""}</span></li>`).join("")}
          </ul>
          <p class="sub" style="margin-top:12px">${icon("bell")} ${alerts.length} automatic staff notification${alerts.length === 1 ? "" : "s"} sent (below threshold).</p>
        </div>
      </div>`;
  }

  return { render };
})();
