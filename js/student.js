/* ------------------------------------------------------------------
   Student view: Grades > Progress & support
   Sections: overview (links, tracker, alerts), forum, surveys, privacy
------------------------------------------------------------------- */
window.Student = (function () {
  const { icon, esc, chip, fmtDate, dayMonth, toast, modal, alias } = UI;
  const D = DEMO;
  const S = D.student;
  const T = D.thresholds;

  /* ---------- state ---------- */
  const answers = () => Store.get("answers", {});
  const prefs = () => Object.assign({ inApp: true, email: true, weekly: false, pulse: true }, Store.get("prefs", {}));
  const dismissed = () => Store.get("dismissed", {});
  function forum() {
    let f = Store.get("forum", null);
    if (!f) {
      f = JSON.parse(JSON.stringify({ posts: D.forum.posts, dms: D.forum.dms }));
      f.helpful = {}; f.reported = {};
    }
    return f;
  }
  const saveForum = (f) => Store.set("forum", f);
  const ANIMALS = ["Quokka", "Bilby", "Numbat", "Wombat", "Possum", "Bandicoot", "Kingfisher", "Lorikeet", "Galah", "Pademelon"];
  function myAlias() {
    let a = Store.get("alias", null);
    if (!a) { a = "Anonymous " + ANIMALS[Math.floor(Math.random() * ANIMALS.length)]; Store.set("alias", a); }
    return a;
  }

  // Subjects the student has hidden from My progress. Hidden subjects don't
  // count towards their averages, tiles or alerts (staff still see them).
  const hiddenSubjects = () => Store.get("hiddenSubjects", []);
  const visibleSubjects = () => S.subjects.filter((s) => !hiddenSubjects().includes(s.code));

  function activeSignals() {
    const d = dismissed();
    const me = Object.assign({}, S, { subjects: visibleSubjects() });
    return Risk.signals(Object.assign({}, D, { student: me }), answers()).filter((s) => !d[s.id]);
  }

  /* ---------- shared bits ---------- */
  function subnav(section) {
    const n = activeSignals().filter((s) => s.level === "alert").length;
    const pending = D.surveys.filter((s) => s.featured && !answers()[s.id]).length;
    const items = [
      ["overview", "My progress", "grades", n],
      ["forum", "Student forum", "chat", 0],
      ["surveys", "Surveys", "clipboard", pending],
      ["privacy", "Alerts & privacy", "shield", 0],
    ];
    return `<nav class="subnav" aria-label="Progress and support">${items
      .map(([id, label, ic, c]) => `<a href="#/support/${id}" class="${section === id ? "on" : ""}" ${section === id ? 'aria-current="page"' : ""}>${icon(ic)}${label}${c ? `<span class="count" aria-label="${c} need attention">${c}</span>` : ""}</a>`)
      .join("")}</nav>`;
  }

  function meter(value, max, opts) {
    const o = opts || {};
    const pct = (v) => Math.max(0, Math.min(100, (v / max) * 100));
    const label = o.label || `${value} of ${max}`;
    return `<div class="meter ${o.level && o.level !== "ok" ? o.level : ""}" role="img" aria-label="${esc(label)}">
      <div class="fill" style="width:${pct(value)}%"></div>
      ${o.expected != null ? `<div class="tick" style="left:calc(${pct(o.expected)}% - 1px)" title="Expected: ${o.expected}"></div>` : ""}
      ${o.threshold != null ? `<div class="tick threshold" style="left:calc(${pct(o.threshold)}% - 1px)" title="Staff alerted below ${o.threshold}"></div>` : ""}
    </div>`;
  }

  /* ================================================================
     GRADES (existing page, lightly mocked)
  ================================================================ */
  function renderGrades(view) {
    document.getElementById("page-title").textContent = "Grades";
    view.innerHTML = `
      <div class="banner">
        <span class="b-icon">${icon("spark")}</span>
        <div class="b-text"><strong>New: Progress &amp; support</strong><p>See how you're tracking against what's expected and find help in one place.</p></div>
        <a class="btn" href="#/support/overview">Open</a>
      </div>
      <div class="table-wrap">
        <table class="subjects">
          <thead><tr><th>Subject</th><th>Grade so far</th><th>Submitted</th><th>Next due</th></tr></thead>
          <tbody>
            ${S.subjects.map((s) => `<tr>
              <td><div class="code">${s.code}</div><div class="name">${esc(s.name)}</div></td>
              <td><strong>${s.grade}%</strong></td>
              <td>${s.submitted} of ${s.total}</td>
              <td>${s.overdue.length ? `<span class="chip alert">${icon("alert")}${s.overdue.length} overdue</span>` : '<span class="sub">Nothing overdue</span>'}</td>
            </tr>`).join("")}
          </tbody>
        </table>
      </div>`;
  }

  /* ================================================================
     PROGRESS & SUPPORT router
  ================================================================ */
  function renderSupport(view, section) {
    document.getElementById("page-title").textContent = "Grades";
    const sections = { overview, forum: forumView, surveys, privacy };
    const fn = sections[section] || overview;
    view.innerHTML = subnav(section) + `<div id="section"></div>` + demoFoot(true);
    view.onclick = view.onsubmit = view.oninput = view.onchange = null;
    fn(view.querySelector("#section"), view);

  }

  function demoFoot(studentPage) {
    return `<div class="demo-foot">${icon("info")}<span>Prototype with made-up data. Your changes are saved in this browser only.</span>${studentPage ? `<button class="btn secondary small" data-pulse-demo>${icon("heart")}Demo: wellbeing pop-up</button>` : ""}<button class="btn ghost small" data-reset>Reset demo</button></div>`;
  }

  /* ================================================================
     OVERVIEW
  ================================================================ */
  function overview(el, view) {
    const a = answers();
    const checkin = D.surveys.find((s) => s.featured);
    const checkinDone = !!a[checkin.id];
    const daysLeft = Risk.daysBetween(D.term.today, checkin.due);
    const sig = activeSignals();
    const alerts = sig.filter((s) => s.level === "alert");
    const overall = alerts.length ? "alert" : sig.length ? "watch" : "ok";

    const vis = visibleSubjects();
    const hidden = S.subjects.filter((s) => !vis.includes(s));
    const avgOf = (k) => (vis.length ? Math.round(vis.reduce((n, s) => n + s[k], 0) / vis.length) : 0);
    const attAvg = avgOf("attendance");
    const gradeAvg = avgOf("grade");
    const submitted = vis.reduce((n, s) => n + s.submitted, 0);
    const dueSoFar = vis.reduce((n, s) => n + s.dueSoFar, 0);
    const totalAssess = vis.reduce((n, s) => n + s.total, 0);
    const overdue = vis.reduce((n, s) => n + s.overdue.length, 0);
    const gpaLevel = Risk.metricLevel(S.gpa.term, T.gpa, true);
    const attLevel = Risk.metricLevel(attAvg, T.attendance, true);
    const subLevel = Risk.metricLevel(overdue, T.overdue, false);

    const headline = {
      ok: ["You're on track", "Nice work. Everything is at or above what's expected for week " + D.term.week + "."],
      watch: ["Mostly on track", "A couple of things are worth a look. Nothing urgent yet."],
      alert: [`${alerts.length} thing${alerts.length === 1 ? "" : "s"} need${alerts.length === 1 ? "s" : ""} attention`, "You're still in time to turn these around. The help options below are free."],
    }[overall];

    el.innerHTML = `
      ${!checkinDone ? `
      <div class="banner prize">
        <span class="b-icon">${icon("spark")}</span>
        <div class="b-text"><strong>Mid-trimester check-in: you could win $200</strong><p>Optional, about ${checkin.minutes} minutes. Finish by ${fmtDate(checkin.due)} to go in the draw.</p></div>
        <button class="btn" data-survey="${checkin.id}">Take part</button>
      </div>` : ""}

      <div class="split">
        <div>
          <section class="section" aria-labelledby="h-progress">
            <div class="section-head"><h2 id="h-progress">My progress</h2><p>${esc(D.term.name)} · Week ${D.term.week} of ${D.term.totalWeeks}</p></div>

            <div class="summary">
              <div>${chip(overall)}</div>
              <div><h3>${esc(headline[0])}</h3></div>
            </div>

            <div class="grid tiles" style="margin-bottom:12px">
              <div class="card tile">
                <div class="label">Trimester GPA ${chip(gpaLevel, gpaLevel === "ok" ? "On track" : gpaLevel === "watch" ? "Keep an eye on" : "Below threshold")}</div>
                <div class="value">${S.gpa.term.toFixed(1)}<small> / 7</small></div>
                ${meter(S.gpa.term, 7, { expected: S.gpa.cumulative, threshold: T.gpa.alert, level: gpaLevel, label: `GPA ${S.gpa.term} of 7, your usual ${S.gpa.cumulative}` })}
                <div class="note">Your usual: ${S.gpa.cumulative.toFixed(1)}</div>
              </div>
              <div class="card tile">
                <div class="label">Attendance ${vis.length ? chip(attLevel, attLevel === "ok" ? "On track" : attLevel === "watch" ? "Keep an eye on" : "Below threshold") : ""}</div>
                <div class="value">${attAvg}%</div>
                ${meter(attAvg, 100, { expected: T.attendance.watch, threshold: T.attendance.alert, level: attLevel, label: `Attendance ${attAvg}%, expected ${T.attendance.watch}%` })}
                <div class="note">Across ${vis.length} subject${vis.length === 1 ? "" : "s"} · expected ${T.attendance.watch}%</div>
              </div>
              <div class="card tile">
                <div class="label">Assessments ${chip(subLevel, subLevel === "ok" ? "On track" : `${overdue} overdue`)}</div>
                <div class="value">${submitted}<small> of ${dueSoFar} due</small></div>
                ${meter(submitted, totalAssess, { expected: dueSoFar, level: subLevel, label: `${submitted} submitted, ${dueSoFar} due so far, ${totalAssess} in total` })}
                <div class="note">${totalAssess - dueSoFar} still to come this trimester</div>
              </div>
              <div class="card tile">
                <div class="label">Check-in ${checkinDone ? chip("ok", "Done, you're in the draw") : '<span class="chip blue">Optional</span>'}</div>
                <div class="value">${checkinDone ? "Done" : daysLeft >= 0 ? `${daysLeft}<small> days left</small>` : "Closed"}</div>
                <div class="note">${checkinDone ? "Thanks! Winners drawn after it closes" : `Closes ${fmtDate(checkin.due)} · prize draw`}</div>
              </div>
            </div>
            <div class="meter-legend" style="margin-bottom:20px">
              <span><i class="k-fill"></i>You</span>
              <span><i class="k-tick"></i>Expected by now</span>
              <span><i class="k-thr"></i>Staff are notified below this</span>
            </div>

            <div class="table-wrap">
              <table class="subjects">
                <caption class="sr-only">Progress by subject</caption>
                <thead><tr><th>Subject</th><th>Grade so far</th><th>Attendance</th><th>Submitted</th><th>Status</th><th><span class="sr-only">Hide</span></th></tr></thead>
                <tbody>${vis.length ? vis.map(subjectRow).join("") : `<tr><td colspan="6" class="empty-row">All subjects are hidden.</td></tr>`}</tbody>
                ${vis.length ? averageRow(vis, gradeAvg, attAvg, submitted, dueSoFar, totalAssess, overdue) : ""}
              </table>
            </div>
            ${hidden.length ? `<div class="hidden-subjects">
              ${icon("eye")}<span>Hidden from your progress:</span>
              ${hidden.map((s) => `<button class="btn ghost small" data-unhide="${s.code}" title="Show ${esc(s.name)} again">${s.code} · Show</button>`).join("")}
            </div>` : ""}
            <p class="table-note">${icon("info")}Hiding a subject removes it from your averages and alerts. Your lecturers and Student Support still see it.</p>
          </section>

          <section class="section" aria-labelledby="h-links">
            <div class="section-head"><h2 id="h-links">Get support</h2><p>Free for all JCU students</p></div>
            <div class="quick-links">
              ${D.supportLinks.map((l) => `<a class="quick-link" href="${l.href}" data-link="${l.id}"><span class="ql-icon">${icon(l.icon)}</span><strong>${esc(l.title)}</strong></a>`).join("")}
            </div>
          </section>
        </div>

        <aside>
          <section class="section" aria-labelledby="h-attn">
            <div class="section-head"><h2 id="h-attn">For you</h2></div>
            <div id="nudges"></div>
          </section>
          <section class="section" aria-labelledby="h-dates">
            <div class="section-head"><h2 id="h-dates">Key dates</h2></div>
            <div class="card" style="padding:6px 16px">
              <ul class="dates">${D.keyDates.map(dateRow).join("")}</ul>
            </div>
          </section>
        </aside>
      </div>`;

    renderNudges(el.querySelector("#nudges"), view);

    view.onclick = (e) => {
      const sv = e.target.closest("[data-survey]");
      if (sv) { openSurvey(sv.dataset.survey, view); return; }
      const ql = e.target.closest("[data-link]");
      if (ql) { e.preventDefault(); const l = D.supportLinks.find((x) => x.id === ql.dataset.link); toast(`${l.title} would open here.`); return; }
      const hide = e.target.closest("[data-hide]");
      if (hide) {
        const h = hiddenSubjects(); h.push(hide.dataset.hide); Store.set("hiddenSubjects", h);
        toast(`${hide.dataset.hide} hidden. It no longer counts towards your averages or alerts.`);
        refresh(view); return;
      }
      const unhide = e.target.closest("[data-unhide]");
      if (unhide) {
        Store.set("hiddenSubjects", hiddenSubjects().filter((c) => c !== unhide.dataset.unhide));
        toast(`${unhide.dataset.unhide} is back in your progress.`);
        refresh(view);
      }
    };
  }

  function subjectRow(s) {
    const g = Risk.metricLevel(s.grade, T.grade, true);
    const at = Risk.metricLevel(s.attendance, T.attendance, true);
    const od = Risk.metricLevel(s.overdue.length, T.overdue, false);
    const worst = [g, at, od].includes("alert") ? "alert" : [g, at, od].includes("watch") ? "watch" : "ok";
    return `<tr>
      <td><div class="code">${s.code}</div><div class="name">${esc(s.name)}</div></td>
      <td class="metric"><span class="num">${s.grade}%</span> <span class="exp">pass 50%</span>${meter(s.grade, 100, { expected: T.grade.watch, threshold: T.grade.alert, level: g, label: `${s.grade}% so far` })}</td>
      <td class="metric"><span class="num">${s.attendance}%</span> <span class="exp">exp. ${T.attendance.watch}%</span>${meter(s.attendance, 100, { expected: T.attendance.watch, threshold: T.attendance.alert, level: at, label: `${s.attendance}% attendance` })}</td>
      <td class="metric"><span class="num">${s.submitted}/${s.dueSoFar}</span> <span class="exp">due so far</span>${meter(s.submitted, s.total, { expected: s.dueSoFar, level: od, label: `${s.submitted} of ${s.dueSoFar} due submitted` })}</td>
      <td>${chip(worst)}</td>
      <td class="row-action"><button class="icon-btn" data-hide="${s.code}" aria-label="Hide ${esc(s.code)} ${esc(s.name)} from my progress" title="Hide from my progress">${icon("eyeOff")}</button></td>
    </tr>`;
  }

  function averageRow(vis, gradeAvg, attAvg, submitted, dueSoFar, totalAssess, overdue) {
    const g = Risk.metricLevel(gradeAvg, T.grade, true);
    const at = Risk.metricLevel(attAvg, T.attendance, true);
    const od = Risk.metricLevel(overdue, T.overdue, false);
    const worst = [g, at, od].includes("alert") ? "alert" : [g, at, od].includes("watch") ? "watch" : "ok";
    return `<tfoot><tr class="avg-row">
      <td><div class="code">Average</div><div class="name">${vis.length} subject${vis.length === 1 ? "" : "s"}</div></td>
      <td class="metric"><span class="num">${gradeAvg}%</span> <span class="exp">pass 50%</span>${meter(gradeAvg, 100, { expected: T.grade.watch, threshold: T.grade.alert, level: g, label: `Average grade ${gradeAvg}%` })}</td>
      <td class="metric"><span class="num">${attAvg}%</span> <span class="exp">exp. ${T.attendance.watch}%</span>${meter(attAvg, 100, { expected: T.attendance.watch, threshold: T.attendance.alert, level: at, label: `Average attendance ${attAvg}%` })}</td>
      <td class="metric"><span class="num">${submitted}/${dueSoFar}</span> <span class="exp">due so far</span>${meter(submitted, totalAssess, { expected: dueSoFar, level: od, label: `${submitted} of ${dueSoFar} due submitted in total` })}</td>
      <td>${chip(worst)}</td>
      <td></td>
    </tr></tfoot>`;
  }

  function dateRow(k) {
    const days = Risk.daysBetween(D.term.today, k.date);
    const dm = dayMonth(k.date);
    const when = days < 0 ? "Passed" : days === 0 ? "Today" : `In ${days} day${days === 1 ? "" : "s"}`;
    return `<li class="${days < 0 ? "past" : ""}">
      <div class="cal"><b>${dm.mon}</b><span>${dm.day}</span></div>
      <div><strong>${esc(k.label)}</strong><p>${esc(k.detail)}</p><span class="when">${when}</span></div>
    </li>`;
  }

  /* ---------- nudges ---------- */
  function renderNudges(box, view) {
    const p = prefs();
    const d = dismissed();
    const list = activeSignals();
    const hiddenCount = Object.keys(d).length;

    if (!p.inApp && box.dataset.force !== "1") {
      box.innerHTML = `<div class="empty">${icon("bell")}<p>You've turned off progress alerts.</p>
        <p style="font-size:12px">Staff are still told if you fall below a threshold, so they can check in.</p>
        <button class="btn secondary small" data-show-anyway>Show them anyway</button></div>`;
    } else if (!list.length) {
      box.innerHTML = `<div class="empty">${icon("smile")}<p>Nothing needs your attention right now.</p></div>`;
    } else {
      box.innerHTML = `<div class="nudges">${list.map(nudge).join("")}</div>`;
    }
    if (hiddenCount) {
      box.insertAdjacentHTML("beforeend", `<p style="margin:10px 0 0"><button class="btn ghost small" data-restore>Show ${hiddenCount} dismissed</button></p>`);
    }
    // Messages and referrals sent from the staff view
    const msgs = Store.get("staffMessages", []);
    if (msgs.length) {
      box.insertAdjacentHTML("afterbegin", `<div class="nudges" style="margin-bottom:10px">${msgs.map((m) => `
        <article class="nudge staff-msg">
          <span class="n-icon">${icon(m.referral ? "users" : "mail")}</span>
          <div class="n-title">${esc(m.subject)}</div>
          <div>
            <details><summary>From ${esc(m.from)}</summary><p class="msg-body">${esc(m.body)}</p></details>
          </div>
        </article>`).join("")}</div>`);
    }

    box.onclick = (e) => {
      const b = e.target.closest("button, a");
      if (!b) return;
      if (b.hasAttribute("data-show-anyway")) { box.dataset.force = "1"; renderNudges(box, view); return; }
      if (b.hasAttribute("data-restore")) { Store.set("dismissed", {}); refresh(view); return; }
      const id = b.dataset.id;
      if (b.dataset.fine != null) {
        const dd = dismissed(); dd[id] = "fine"; Store.set("dismissed", dd);
        toast("Thanks for letting us know. We'll pass that on, so no one chases you about it.");
        refresh(view);
      } else if (b.dataset.later != null) {
        const dd = dismissed(); dd[id] = "later"; Store.set("dismissed", dd);
        toast("Okay, we'll remind you in 3 days.");
        refresh(view);
      } else if (b.dataset.go) {
        e.preventDefault();
        const l = D.supportLinks.find((x) => x.id === b.dataset.go);
        toast(l ? `${l.title} would open here.` : "This would open the subject.");
      }
    };
  }

  function nudge(s) {
    const act = s.action.survey
      ? `<button class="btn small" data-survey="${s.action.survey}">${esc(s.action.label)}</button>`
      : `<a class="btn small" href="#" data-go="${s.action.link || ""}">${esc(s.action.label)}</a>`;
    const canDismiss = s.id !== "checkin";
    return `<article class="nudge ${s.level}">
      <span class="n-icon">${icon(UI.LEVEL[s.level].icon)}</span>
      <div class="n-title">${esc(s.title)}</div>
      <div>
        <div class="n-actions">
          ${act}
          ${canDismiss ? `<button class="btn ghost small" data-fine data-id="${s.id}">I'm fine, thanks</button>
          <button class="btn ghost small" data-later data-id="${s.id}">Remind me later</button>` : ""}
        </div>
        <div class="staff-note" style="margin-top:6px">${s.level === "alert"
          ? `${icon("eye")}Your Student Support Advisor has been notified.`
          : `${icon("lock")}Only you can see this.`}</div>
      </div>
    </article>`;
  }

  function refresh(view) {
    const section = (location.hash.split("/")[2]) || "overview";
    renderSupport(view, section);
  }

  /* ---------- attendance chart ---------- */
  function attendanceChart(card, series) {
    const data = series || S.attendanceByWeek;
    if (card.dataset.table === "1") {
      card.innerHTML = `<table class="data-table"><thead><tr><th>Week</th><th>Attendance</th><th>vs expected (${T.attendance.watch}%)</th></tr></thead><tbody>
        ${data.map((v, i) => `<tr><td>Week ${i + 1}</td><td>${v}%</td><td>${v - T.attendance.watch > 0 ? "+" : ""}${v - T.attendance.watch} pts</td></tr>`).join("")}
      </tbody></table>`;
      return;
    }
    const W = 640, H = 220, L = 36, R = 110, TOP = 14, B = 28;
    const yMin = 40, yMax = 100;
    const x = (i) => L + (i / (data.length - 1)) * (W - L - R);
    const y = (v) => TOP + (1 - (v - yMin) / (yMax - yMin)) * (H - TOP - B);
    const pts = data.map((v, i) => `${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(" ");
    const area = `M${x(0)},${y(yMin)} L${pts.split(" ").join(" L")} L${x(data.length - 1)},${y(yMin)} Z`;
    const grid = [40, 60, 80, 100].map((v) => `<line class="grid-line" x1="${L}" x2="${W - R}" y1="${y(v)}" y2="${y(v)}"/><text class="axis-label" x="${L - 8}" y="${y(v) + 4}" text-anchor="end">${v}%</text>`).join("");
    const xl = data.map((_, i) => `<text class="axis-label" x="${x(i)}" y="${H - 8}" text-anchor="middle">W${i + 1}</text>`).join("");
    const last = data.length - 1;

    card.innerHTML = `
      <svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Weekly attendance from ${data[0]}% in week 1 to ${data[last]}% in week ${last + 1}. Expected is ${T.attendance.watch}%.">
        ${grid}${xl}
        <path class="area" d="${area}"/>
        <line class="ref" x1="${L}" x2="${W - R}" y1="${y(T.attendance.watch)}" y2="${y(T.attendance.watch)}"/>
        <text class="ref-label" x="${W - R + 8}" y="${y(T.attendance.watch) + 4}">Expected ${T.attendance.watch}%</text>
        <line class="thr" x1="${L}" x2="${W - R}" y1="${y(T.attendance.alert)}" y2="${y(T.attendance.alert)}"/>
        <text class="thr-label" x="${W - R + 8}" y="${y(T.attendance.alert) + 4}">Staff alert ${T.attendance.alert}%</text>
        <polyline class="series" points="${pts}"/>
        <circle class="dot" cx="${x(last)}" cy="${y(data[last])}" r="5"/>
        <g class="hover" style="display:none"><line class="crosshair" y1="${TOP}" y2="${H - B}"/><circle class="dot" r="5"/></g>
        <rect class="hit" x="${L}" y="${TOP}" width="${W - L - R}" height="${H - TOP - B}" fill="transparent"/>
      </svg>
      <div class="tooltip" role="presentation"></div>`;

    const svg = card.querySelector("svg");
    const hover = svg.querySelector(".hover");
    const tip = card.querySelector(".tooltip");
    const hit = svg.querySelector(".hit");
    function show(evt) {
      const r = svg.getBoundingClientRect();
      const sx = ((evt.clientX - r.left) / r.width) * W;
      const i = Math.max(0, Math.min(last, Math.round(((sx - L) / (W - L - R)) * last)));
      hover.style.display = "";
      hover.querySelector("line").setAttribute("x1", x(i));
      hover.querySelector("line").setAttribute("x2", x(i));
      hover.querySelector("circle").setAttribute("cx", x(i));
      hover.querySelector("circle").setAttribute("cy", y(data[i]));
      const diff = data[i] - T.attendance.watch;
      tip.innerHTML = `<strong>Week ${i + 1}</strong> · ${data[i]}% <span style="opacity:.75">(${diff >= 0 ? "+" : ""}${diff} vs expected)</span>`;
      const cr = card.getBoundingClientRect();
      tip.style.left = `${(x(i) / W) * r.width + (r.left - cr.left)}px`;
      tip.style.top = `${(y(data[i]) / H) * r.height + (r.top - cr.top)}px`;
      tip.classList.add("show");
    }
    hit.addEventListener("pointermove", show);
    hit.addEventListener("pointerleave", () => { hover.style.display = "none"; tip.classList.remove("show"); });
  }

  /* ================================================================
     FORUM
  ================================================================ */
  const forumUI = { tab: "posts", cat: "All", q: "", sort: "new", open: {}, dm: null, composing: false };

  function filterText(text) {
    if (/[^\s@]+@[^\s@]+\.[^\s@]+/.test(text)) return { blocked: "Remove the email address. Posts are anonymous, so personal contact details aren't allowed." };
    if (/(\+?61|\b0)[\s-]?\d(?:[\s-]?\d){7,}/.test(text)) return { blocked: "Remove the phone number. Personal contact details aren't allowed." };
    if (/\bjc\d{6}\b/i.test(text)) return { blocked: "Remove the student number. It could identify you or someone else." };
    let masked = false;
    let out = text;
    D.forum.blockedWords.forEach((w) => {
      const re = new RegExp(`\\b${w}\\b`, "gi");
      if (re.test(out)) { masked = true; out = out.replace(re, (m) => m[0] + "*".repeat(m.length - 1)); }
    });
    return { text: out, masked };
  }

  function forumView(el, view) {
    const f = forum();
    const me = myAlias();
    const counts = { All: f.posts.length };
    D.forum.categories.forEach((c) => (counts[c] = f.posts.filter((p) => p.category === c).length));

    let posts = f.posts.filter((p) => (forumUI.cat === "All" || p.category === forumUI.cat));
    if (forumUI.q) {
      const q = forumUI.q.toLowerCase();
      posts = posts.filter((p) => (p.title + " " + p.body).toLowerCase().includes(q));
    }
    posts = posts.slice().sort((a, b) => {
      if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
      if (forumUI.sort === "helpful") return (b.helpful + (f.helpful[b.id] ? 1 : 0)) - (a.helpful + (f.helpful[a.id] ? 1 : 0));
      return (b.order || 0) - (a.order || 0);
    });

    el.innerHTML = `
      <div class="forum-toolbar">
        <div class="forum-tabs" role="tablist">
          <button role="tab" aria-selected="${forumUI.tab === "posts"}" class="${forumUI.tab === "posts" ? "on" : ""}" data-tab="posts">${icon("chat")}Posts</button>
          <button role="tab" aria-selected="${forumUI.tab === "dms"}" class="${forumUI.tab === "dms" ? "on" : ""}" data-tab="dms">${icon("mail")}Private messages</button>
        </div>
        <span class="sub" style="margin-left:auto">You post as ${alias(me)}</span>
      </div>
      ${forumUI.tab === "posts" ? postsView(f, posts, counts, me) : dmView(f)}`;

    bindForum(el, view);
  }

  function postsView(f, posts, counts, me) {
    return `
    <div class="forum-layout">
      <div class="forum-side">
        <div>
          <ul class="cat-list" aria-label="Categories">
            ${["All"].concat(D.forum.categories).map((c) => `<li><button class="${forumUI.cat === c ? "on" : ""}" data-cat="${esc(c)}"><span>${esc(c)}</span><span>${counts[c]}</span></button></li>`).join("")}
          </ul>
        </div>
        <div class="mod-note">
          <strong>${icon("shield")}Moderated by JCU staff</strong>
          Posts are anonymous to other students.
          <ul>
            <li>Be kind and respectful</li>
            <li>No names, emails, phone numbers or student IDs</li>
            <li>Report anything that worries you</li>
          </ul>
          <p style="margin:8px 0 0">In danger? Call <b>000</b>. Lifeline 24/7: <b>13 11 14</b>.</p>
        </div>
      </div>
      <div>
        <div class="forum-toolbar">
          <label class="search">${icon("search")}<span class="sr-only">Search posts</span><input type="search" placeholder="Search posts" value="${esc(forumUI.q)}" data-q></label>
          <label><span class="sr-only">Sort</span><select data-sort>
            <option value="new" ${forumUI.sort === "new" ? "selected" : ""}>Newest</option>
            <option value="helpful" ${forumUI.sort === "helpful" ? "selected" : ""}>Most helpful</option>
          </select></label>
          <button class="btn" data-compose>${icon("plus")}New post</button>
        </div>

        <form class="card composer" ${forumUI.composing ? "" : "hidden"} data-composer>
          <h3 style="margin-bottom:12px">New anonymous post</h3>
          <div id="filter-msg"></div>
          <div class="field"><label for="np-cat">Category</label>
            <select id="np-cat" name="category">${D.forum.categories.map((c) => `<option ${c === (forumUI.cat !== "All" ? forumUI.cat : "General") ? "selected" : ""}>${esc(c)}</option>`).join("")}</select></div>
          <div class="field"><label for="np-title">Title</label><input id="np-title" name="title" maxlength="120" required></div>
          <div class="field"><label for="np-body">Post</label><textarea id="np-body" name="body" maxlength="2000" required></textarea>
            <span class="hint">Shown as ${esc(me)}. Moderators can see posts but not who wrote them, unless a post is reported for safety.</span></div>
          <div style="display:flex;gap:8px;justify-content:flex-end"><button type="button" class="btn ghost" data-cancel>Cancel</button><button class="btn" type="submit">Post</button></div>
        </form>

        ${posts.length ? posts.map((p) => postCard(p, f, me)).join("") : `<div class="empty">No posts match. Try another category or search.</div>`}
      </div>
    </div>`;
  }

  function postCard(p, f, me) {
    const open = forumUI.open[p.id];
    const helpful = p.helpful + (f.helpful[p.id] ? 1 : 0);
    const reported = f.reported[p.id];
    const mine = p.alias === me;
    return `<article class="post ${p.pinned ? "pinned" : ""}">
      <div class="post-meta">
        ${alias(p.alias, p.staff)}${mine ? '<span class="chip neutral">You</span>' : ""}
        <span>·</span><span>${esc(p.time)}</span><span>·</span><span class="chip neutral">${esc(p.category)}</span>
        ${p.pinned ? `<span class="chip blue">${icon("pin")}Pinned</span>` : ""}
      </div>
      <h3>${esc(p.title)}</h3>
      <p>${esc(p.body)}</p>
      <div class="post-actions">
        <button class="btn ghost small ${f.helpful[p.id] ? "on" : ""}" data-helpful="${p.id}" aria-pressed="${!!f.helpful[p.id]}">${icon("thumb")}Helpful · ${helpful}</button>
        <button class="btn ghost small" data-toggle="${p.id}" aria-expanded="${!!open}">${icon("chat")}${p.comments.length} comment${p.comments.length === 1 ? "" : "s"}</button>
        ${!p.staff && !mine ? `<button class="btn ghost small" data-dm="${esc(p.alias)}">${icon("mail")}Message privately</button>` : ""}
        ${!p.staff && !mine ? (reported ? `<span class="flagged-note">${icon("flag")}Reported for review</span>` : `<button class="btn ghost small" data-report="${p.id}">${icon("flag")}Report</button>`) : ""}
      </div>
      ${open ? `<div class="comments">
        ${p.comments.map((c) => `<div class="comment ${c.staff ? "staff" : ""}"><div class="post-meta" style="margin:0">${alias(c.alias, c.staff)}<span>·</span><span>${esc(c.time)}</span></div><p>${esc(c.body)}</p></div>`).join("")}
        <form class="comment-form" data-comment="${p.id}"><label class="sr-only" for="c-${p.id}">Add a comment</label><input id="c-${p.id}" name="body" placeholder="Add an anonymous comment" maxlength="1000" required><button class="btn small" type="submit">Reply</button></form>
        <div class="comment-msg" data-cmsg="${p.id}"></div>
      </div>` : ""}
    </article>`;
  }

  function dmView(f) {
    if (!f.dms.length) {
      return `<div class="empty">${icon("mail")}<p>No private messages yet. Use “Message privately” on a post to start one.</p></div>`;
    }
    const cur = f.dms.find((d) => d.id === forumUI.dm) || f.dms[0];
    forumUI.dm = cur.id;
    return `<div class="dm-layout">
      <div class="dm-list" role="list">
        ${f.dms.map((d) => `<button role="listitem" class="${d.id === cur.id ? "on" : ""}" data-open-dm="${d.id}">${alias(d.with)}<small>${esc((d.messages[d.messages.length - 1] || { body: "No messages yet" }).body)}</small></button>`).join("")}
      </div>
      <div class="dm-thread">
        <div class="dm-head">${alias(cur.with)}
          ${cur.flagged ? `<span class="flagged-note">${icon("flag")}Flagged for moderator review</span>` : `<button class="btn ghost small" data-flag-dm="${cur.id}">${icon("flag")}Flag conversation</button>`}
        </div>
        <div class="dm-privacy ${cur.flagged ? "flagged" : ""}">${cur.flagged
          ? `${icon("eye")}A moderator can now read this conversation to check everyone is safe.`
          : `${icon("lock")}Private. Moderators can't see this unless one of you flags it.`}</div>
        <div class="dm-msgs">
          ${cur.messages.map((m) => `<div class="bubble ${m.from === "me" ? "me" : ""}">${esc(m.body)}<small>${esc(m.time)}</small></div>`).join("") || '<p class="sub">Say hi. Remember not to share personal details.</p>'}
        </div>
        <div id="dm-msg" style="padding:0 14px"></div>
        <form class="dm-form" data-dm-form="${cur.id}"><label class="sr-only" for="dm-input">Message</label><input id="dm-input" name="body" placeholder="Write a message" maxlength="1000" required autocomplete="off"><button class="btn" type="submit">${icon("send")}<span class="sr-only">Send</span></button></form>
      </div>
    </div>`;
  }

  function bindForum(el, view) {
    const rerender = () => forumView(el, view);
    view.onclick = (e) => {
      const t = e.target.closest("button, a");
      if (!t || !el.contains(t)) return;
      const f = forum();
      if (t.dataset.tab) { forumUI.tab = t.dataset.tab; rerender(); }
      else if (t.dataset.cat) { forumUI.cat = t.dataset.cat; rerender(); }
      else if (t.hasAttribute("data-compose")) { forumUI.composing = true; rerender(); el.querySelector("#np-title").focus(); }
      else if (t.hasAttribute("data-cancel")) { forumUI.composing = false; rerender(); }
      else if (t.dataset.toggle) { forumUI.open[t.dataset.toggle] = !forumUI.open[t.dataset.toggle]; rerender(); }
      else if (t.dataset.helpful) { f.helpful[t.dataset.helpful] = !f.helpful[t.dataset.helpful]; saveForum(f); rerender(); }
      else if (t.dataset.report) {
        f.reported[t.dataset.report] = true; saveForum(f);
        toast("Reported. A moderator will review this post."); rerender();
      } else if (t.dataset.dm) {
        let d = f.dms.find((x) => x.with === t.dataset.dm);
        if (!d) { d = { id: "d" + Date.now(), with: t.dataset.dm, flagged: false, messages: [] }; f.dms.unshift(d); saveForum(f); }
        forumUI.tab = "dms"; forumUI.dm = d.id; rerender();
        const inp = el.querySelector("#dm-input"); if (inp) inp.focus();
      } else if (t.dataset.openDm) { forumUI.dm = t.dataset.openDm; rerender(); }
      else if (t.dataset.flagDm) {
        if (confirm("Flag this conversation? A moderator will be able to read it to check everyone is safe. The other person won't be told who flagged it.")) {
          const d = f.dms.find((x) => x.id === t.dataset.flagDm); d.flagged = true; saveForum(f);
          toast("Flagged. A moderator will review this conversation."); rerender();
        }
      }
    };
    view.oninput = (e) => {
      if (e.target.matches("[data-q]")) {
        forumUI.q = e.target.value;
        const pos = e.target.selectionStart;
        rerender();
        const q = el.querySelector("[data-q]"); q.focus(); q.setSelectionRange(pos, pos);
      }
    };
    view.onchange = (e) => {
      if (e.target.matches("[data-sort]")) { forumUI.sort = e.target.value; rerender(); }
    };
    view.onsubmit = (e) => {
      e.preventDefault();
      const form = e.target;
      const f = forum();
      const me = myAlias();
      if (form.matches("[data-composer]")) {
        const fd = new FormData(form);
        const title = filterText(fd.get("title").trim());
        const body = filterText(fd.get("body").trim());
        const blocked = title.blocked || body.blocked;
        const msg = el.querySelector("#filter-msg");
        if (blocked) { msg.innerHTML = `<div class="filter-msg block">${icon("alert")}<span>${esc(blocked)}</span></div>`; return; }
        f.posts.push({ id: "u" + Date.now(), order: Date.now(), alias: me, category: fd.get("category"), title: title.text, body: body.text, time: "Just now", helpful: 0, pinned: false, comments: [] });
        saveForum(f);
        forumUI.composing = false; forumUI.sort = "new"; forumUI.cat = "All";
        rerender();
        toast(title.masked || body.masked ? "Posted. Some words were filtered." : "Posted anonymously.");
      } else if (form.dataset.comment) {
        const id = form.dataset.comment;
        const r = filterText(new FormData(form).get("body").trim());
        if (r.blocked) { el.querySelector(`[data-cmsg="${id}"]`).innerHTML = `<div class="filter-msg block" style="margin-top:8px">${icon("alert")}<span>${esc(r.blocked)}</span></div>`; return; }
        const p = f.posts.find((x) => x.id === id);
        p.comments.push({ alias: me, body: r.text, time: "Just now", staff: false });
        saveForum(f); rerender();
        if (r.masked) toast("Comment posted. Some words were filtered.");
      } else if (form.dataset.dmForm) {
        const r = filterText(new FormData(form).get("body").trim());
        if (r.blocked) { el.querySelector("#dm-msg").innerHTML = `<div class="filter-msg block" style="margin-top:8px">${icon("alert")}<span>${esc(r.blocked)}</span></div>`; return; }
        const d = f.dms.find((x) => x.id === form.dataset.dmForm);
        d.messages.push({ from: "me", body: r.text, time: "Just now" });
        saveForum(f); rerender();
        const inp = el.querySelector("#dm-input"); if (inp) inp.focus();
      }
    };
  }

  // Seed posts get descending order so user posts appear on top under "Newest"
  D.forum.posts.forEach((p, i) => (p.order = D.forum.posts.length - i));

  /* ================================================================
     SURVEYS
  ================================================================ */
  function surveys(el, view) {
    const a = answers();
    const skipped = Store.get("skipped", {});
    const feat = D.surveys.filter((s) => s.featured);
    const opt = D.surveys.filter((s) => !s.featured);

    el.innerHTML = `
      <section class="section">
        <div class="section-head"><h2>Mid-trimester check-in</h2></div>
        <div class="grid cols-2">${feat.map((s) => surveyCard(s, a, skipped)).join("")}</div>
      </section>
      <section class="section">
        <div class="section-head"><h2>More surveys</h2></div>
        <div class="grid cols-3">${opt.map((s) => surveyCard(s, a, skipped)).join("")}</div>
      </section>`;

    view.onclick = (e) => {
      const t = e.target.closest("button");
      if (!t) return;
      if (t.dataset.survey) openSurvey(t.dataset.survey, view);
      else if (t.dataset.skip) {
        const sk = Store.get("skipped", {}); sk[t.dataset.skip] = !sk[t.dataset.skip]; Store.set("skipped", sk);
        toast(sk[t.dataset.skip] ? "Okay, we won't remind you about this one." : "Reminders turned back on.");
        surveys(el, view);
      } else if (t.dataset.clear) {
        const aa = answers(); delete aa[t.dataset.clear]; Store.set("answers", aa);
        toast("Your answers were deleted."); refresh(view);
      }
    };
  }

  function surveyCard(s, a, skipped) {
    const done = !!a[s.id];
    const days = s.due ? Risk.daysBetween(D.term.today, s.due) : null;
    const status = done ? chip("ok", s.prize ? "Completed, you're in the draw" : "Completed") : skipped[s.id] ? '<span class="chip neutral">Not interested</span>' : '<span class="chip neutral">Optional</span>';
    return `<div class="card survey-card ${s.featured ? "featured" : ""}">
      <div class="top"><h3>${esc(s.title)}</h3>${status}</div>
      ${s.prize ? `<div class="prize-line">${icon("spark")}<span>Finish it to go in the draw for <b>${esc(s.prize)}</b></span></div>` : ""}
      <div class="meta"><span>${icon("clock")}About ${s.minutes} min</span><span>${icon("clipboard")}${s.questions.length} questions</span>${s.due ? `<span>${icon("calendar")}Closes ${fmtDate(s.due)}${days >= 0 ? ` (${days} days)` : ""}</span>` : ""}</div>
      <details><summary>Why we ask and who sees it</summary><p><b>Why:</b> ${esc(s.why)}</p><p><b>Who sees it:</b> ${esc(s.who)}</p></details>
      <div class="foot">
        <button class="btn ${done ? "secondary" : ""}" data-survey="${s.id}">${done ? "Update answers" : s.prize ? "Take part" : "Start"}</button>
        ${done ? `<button class="btn ghost" data-clear="${s.id}">Delete my answers</button>` : ""}
        ${!done ? `<button class="btn ghost" data-skip="${s.id}">${skipped[s.id] ? "Remind me again" : "Not interested"}</button>` : ""}
      </div>
    </div>`;
  }

  function question(q, i, prev, optional) {
    const val = prev ? prev[q.id] : undefined;
    const name = `q-${q.id}`;
    const req = q.required ? '<span class="req">Required</span>' : "";
    const pntsOpt = (q.pnts || optional) && q.type !== "text"
      ? `<label class="pnts"><input type="${q.type === "multi" ? "checkbox" : "radio"}" name="${name}" value="__pnts" ${val === "__pnts" || (Array.isArray(val) && val.includes("__pnts")) ? "checked" : ""}><span>Prefer not to say</span></label>`
      : "";
    let control = "";
    if (q.type === "scale") {
      control = `<div class="scale">${[1, 2, 3, 4, 5].map((n) => `<label><input type="radio" name="${name}" value="${n}" ${val === n ? "checked" : ""}><span>${n}</span></label>`).join("")}</div>
        <div class="scale-ends"><span>1 · ${esc(q.low)}</span><span>5 · ${esc(q.high)}</span></div>
        ${pntsOpt ? `<div class="opts" style="margin-top:8px">${pntsOpt}</div>` : ""}`;
    } else if (q.type === "choice" || q.type === "multi") {
      const type = q.type === "multi" ? "checkbox" : "radio";
      control = `<div class="opts">${q.options.map((o) => {
        const checked = Array.isArray(val) ? val.includes(o) : val === o;
        return `<label><input type="${type}" name="${name}" value="${esc(o)}" ${checked ? "checked" : ""}><span>${esc(o)}</span></label>`;
      }).join("")}${pntsOpt}</div>`;
    } else {
      control = `<textarea name="${name}" maxlength="1000" aria-label="${esc(q.label)}">${esc(val || "")}</textarea>`;
    }
    return `<fieldset class="q" data-qid="${q.id}" data-required="${q.required ? 1 : 0}"><legend>${i + 1}. ${esc(q.label)}${req}</legend>${control}</fieldset>`;
  }

  function readForm(form, s) {
    const out = {};
    s.questions.forEach((q) => {
      const name = `q-${q.id}`;
      if (q.type === "multi") {
        const v = [...form.querySelectorAll(`[name="${name}"]:checked`)].map((x) => x.value);
        if (v.length) out[q.id] = v;
      } else if (q.type === "text") {
        const v = form.querySelector(`[name="${name}"]`).value.trim();
        if (v) out[q.id] = v;
      } else {
        const c = form.querySelector(`[name="${name}"]:checked`);
        if (c) out[q.id] = q.type === "scale" && c.value !== "__pnts" ? Number(c.value) : c.value;
      }
    });
    return out;
  }

  function openSurvey(id, view) {
    const s = D.surveys.find((x) => x.id === id);
    const prev = answers()[id];
    const d = modal.open(`
      <form method="dialog" data-survey-form>
        <div class="modal-head">
          <div><h2 id="modal-title">${esc(s.title)}</h2><p>${icon("lock")} ${esc(s.who)}</p></div>
          <button type="button" class="btn ghost small" data-close aria-label="Close">${icon("x")}</button>
        </div>
        <div class="progress" aria-hidden="true"><div style="width:0%"></div></div>
        <div class="modal-body">${s.questions.map((q, i) => question(q, i, prev, true)).join("")}</div>
        <div class="modal-foot"><span class="sub" data-progress-text></span><div style="display:flex;gap:8px"><button type="button" class="btn ghost" data-close>Save for later</button><button class="btn" type="submit">Submit</button></div></div>
      </form>`);

    const form = d.querySelector("form");
    const bar = d.querySelector(".progress div");
    const ptxt = d.querySelector("[data-progress-text]");
    function progress() {
      const r = readForm(form, s);
      const n = s.questions.filter((q) => r[q.id] != null).length;
      bar.style.width = `${(n / s.questions.length) * 100}%`;
      ptxt.textContent = `${n} of ${s.questions.length} answered`;
    }
    progress();
    // "Prefer not to say" in a multi-select clears the other choices, and vice versa
    form.onchange = (e) => {
      const t = e.target;
      if (t.type === "checkbox") {
        const group = form.querySelectorAll(`[name="${t.name}"]`);
        if (t.value === "__pnts" && t.checked) group.forEach((g) => { if (g !== t) g.checked = false; });
        else if (t.checked) group.forEach((g) => { if (g.value === "__pnts") g.checked = false; });
      }
      t.closest(".q")?.classList.remove("invalid");
      progress();
    };
    form.oninput = progress;
    d.onclick = (e) => {
      if (e.target.closest("[data-close]")) { modal.close(); }
      if (e.target.closest("[data-done]")) { modal.close(); refresh(view); }
    };
    form.onsubmit = (e) => {
      e.preventDefault();
      const r = readForm(form, s);
      const missing = s.questions.filter((q) => q.required && r[q.id] == null);
      form.querySelectorAll(".q").forEach((f) => f.classList.toggle("invalid", missing.some((m) => m.id === f.dataset.qid)));
      if (missing.length) {
        form.querySelector(".q.invalid").scrollIntoView({ behavior: "smooth", block: "center" });
        toast(`Please answer ${missing.length} more required question${missing.length === 1 ? "" : "s"}.`);
        return;
      }
      const all = answers(); all[id] = r; Store.set("answers", all);
      thanks(s, r);
    };
  }

  function thanks(s, r) {
    const tips = [];
    if (r.contact === "Yes, please") tips.push("A Student Support Advisor will contact you within 2 business days.");
    if (r.leaving === "Yes, seriously" || r.leaving === "Sometimes") tips.push(`If you're thinking about pausing, talk to an adviser before <b>${fmtDate("2026-11-13")}</b> so no fail is recorded. There may be options like reducing your study load.`);
    (Array.isArray(r.support) ? r.support : []).filter((x) => x !== "__pnts").forEach((x) => {
      const map = {
        "Help with study skills": "Academic support",
        "Extension or special consideration": "Book a consultation",
        "Counselling": "Counselling & wellbeing",
        "Financial help": "Money & housing",
        "Changing my study load": "Book a consultation",
        "Meeting other students": "Events & clubs",
      };
      tips.push(`${esc(x)}: see <b>${map[x]}</b> on your Progress &amp; support page.`);
    });
    const low = ["coping", "health"].some((k) => typeof r[k] === "number" && r[k] <= 2);
    if (low) tips.push("Free counselling is available. If you need to talk to someone right now, Lifeline is open 24/7 on <b>13 11 14</b>.");

    modal.open(`
      <div class="modal-head"><div><h2 id="modal-title">Thanks for completing this</h2></div><button type="button" class="btn ghost small" data-done aria-label="Close">${icon("x")}</button></div>
      <div class="modal-body thanks">
        <div class="big">${icon("check")}</div>
        <p>Your answers have been saved. You can update them any time this trimester.</p>
        ${s.prize ? `<p class="prize-line" style="justify-content:center">${icon("spark")}<span>You're in the draw for <b>${esc(s.prize)}</b>. Winners are contacted by student email after ${fmtDate(s.due)}.</span></p>` : ""}
        ${tips.length ? `<ul>${tips.map((t) => `<li>${t}</li>`).join("")}</ul>` : ""}
      </div>
      <div class="modal-foot"><span></span><button class="btn" data-done>Done</button></div>`);
  }

  /* ================================================================
     ALERTS & PRIVACY
  ================================================================ */
  function privacy(el, view) {
    const p = prefs();
    const row = (key, title, text) => `<div class="toggle-row"><div><strong>${title}</strong><p>${text}</p></div>
      <label class="switch"><input type="checkbox" data-pref="${key}" ${p[key] ? "checked" : ""} aria-label="${esc(title)}"><span class="track"></span></label></div>`;

    el.innerHTML = `
      <div class="split">
        <section class="section">
          <div class="section-head"><h2>My alerts</h2></div>
          <div class="card" style="padding:4px 20px">
            ${row("inApp", "Progress alerts on this page", "Shows “For you” cards when something drops below what's expected.")}
            ${row("email", "Email me about alerts", "Sent to your student email. At most one a week.")}
            ${row("weekly", "Weekly progress summary", "A short Monday email with your attendance, grades and what's due.")}
            ${row("pulse", "Occasional quick questions", "Now and then, a one-tap question about how you're going (sleep, stress, energy). Only Student Support sees answers.")}
            <div class="toggle-row"><div><strong>Staff notifications</strong><p>If you fall below a threshold (for example, under ${T.attendance.alert}% attendance or ${T.overdue.alert}+ overdue assessments), your Student Support Advisor is told so they can check in. This can't be turned off, but you can always reply “I'm fine, thanks”.</p></div>
              <span class="locked">${icon("lock")}Always on</span></div>
          </div>
        </section>
        <section class="section">
          <div class="section-head"><h2>Thresholds</h2></div>
          <div class="card">
            <table class="privacy">
              <thead><tr><th>Measure</th><th>Heads up</th><th>Staff notified</th></tr></thead>
              <tbody>
                <tr><td>Attendance</td><td>Under ${T.attendance.watch}%</td><td>Under ${T.attendance.alert}%</td></tr>
                <tr><td>Grade in a subject</td><td>Under ${T.grade.watch}%</td><td>Under ${T.grade.alert}%</td></tr>
                <tr><td>Trimester GPA</td><td>Under ${T.gpa.watch}</td><td>Under ${T.gpa.alert}</td></tr>
                <tr><td>Overdue assessments</td><td>${T.overdue.watch}</td><td>${T.overdue.alert} or more</td></tr>
                <tr><td>No subject activity</td><td>${T.inactivityDays.watch} days</td><td>${T.inactivityDays.alert} days</td></tr>
                <tr><td>Wellbeing check-in (if you take part)</td><td>Answers show some pressure</td><td>Answers suggest you need support</td></tr>
              </tbody>
            </table>
          </div>
        </section>
      </div>

      <section class="section">
        <div class="section-head"><h2>What we use and who sees it</h2><p>We never use this data for grading.</p></div>
        <div class="table-wrap">
          <table class="privacy" style="min-width:640px">
            <thead><tr><th>Data</th><th>Where it comes from</th><th>Who can see it</th><th>What it's used for</th></tr></thead>
            <tbody>
              <tr><td>Grades and submissions</td><td>LearnJCU</td><td>You, your lecturers, Student Support</td><td>Progress tracker and alerts</td></tr>
              <tr><td>Attendance</td><td>Class check-ins (where recorded)</td><td>You, your lecturers, Student Support</td><td>Progress tracker and alerts</td></tr>
              <tr><td>Activity on LearnJCU</td><td>Logins and page visits</td><td>Student Support (summary only)</td><td>Spotting inactivity. Your routine (from Study habits) is taken into account</td></tr>
              <tr><td>Enrolment and course load</td><td>Student records</td><td>Student Support</td><td>Suggesting study load options</td></tr>
              <tr><td>Wellbeing check-in</td><td>You (optional, mid-trimester)</td><td>Student Support and the wellbeing team. Lecturers only see whether it's done</td><td>Offering support early</td></tr>
              <tr><td>Optional surveys</td><td>You, only if you choose</td><td>Student Support only</td><td>Tailoring support. You can delete your answers any time</td></tr>
              <tr><td>Forum posts and private messages</td><td>You</td><td>Posts: other students (anonymously) and moderators. Messages: only if flagged</td><td>Peer support and safety</td></tr>
            </tbody>
          </table>
        </div>
      </section>`;

    view.onchange = (e) => {
      const k = e.target.dataset.pref;
      if (!k) return;
      const np = prefs(); np[k] = e.target.checked; Store.set("prefs", np);
      toast(k === "inApp" && !e.target.checked ? "Alerts hidden. Staff are still told if you fall below a threshold." : "Saved.");
    };
  }

  return { renderGrades, renderSupport, meter, attendanceChart, demoFoot };
})();
