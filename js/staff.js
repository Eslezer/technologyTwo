/* ------------------------------------------------------------------
   Staff view: Grades > Student support
     #/staff                    all my students
     #/staff/subject/<code>     students in one subject
     #/staff/student/<id>       a student's profile
------------------------------------------------------------------- */
window.Staff = (function () {
  const { icon, esc, chip, fmtDate, toast, modal } = UI;
  const D = DEMO;
  const T = D.thresholds;
  const MY = D.staff.subjects.map((s) => s.code);

  const ui = { subject: "all", sort: "risk", filter: "all", q: "" };

  /* ---------- state ---------- */
  function st() {
    return Object.assign({ pins: ["s1", "s2"], log: {}, recs: {}, referrals: {} }, Store.get("staff", {}));
  }
  const save = (s) => Store.set("staff", s);
  function logAction(sid, type, text) {
    const s = st();
    (s.log[sid] = s.log[sid] || []).unshift({ type, text, at: Date.now() });
    save(s);
  }
  function timeLabel(ms) {
    return "Today, " + new Date(ms).toLocaleTimeString("en-AU", { hour: "numeric", minute: "2-digit" });
  }

  /* ---------- students ---------- */
  function jordan() {
    const a = Store.get("answers", {});
    const dism = Store.get("dismissed", {});
    const fine = {};
    Object.keys(dism).forEach((k) => { if (dism[k] === "fine") fine[k] = "fine"; });
    return Object.assign({}, D.student, {
      id: "demo-student", studentNo: "jc000001", answers: a, fine,
      checkinDate: a.checkin ? D.term.today : null,
      sharedOptional: !!(a.about || a.habits),
      lastLoginDaysAgo: D.student.lastLoginDaysAgo,
    });
  }

  function enrich(s) {
    const signals = Risk.signals(Object.assign({}, D, { student: s }), s.answers);
    // A student's "I'm fine, thanks" lowers how much that signal counts
    const adjusted = signals
      .map((x) => (s.fine[x.id] ? Object.assign({}, x, { level: x.level === "alert" ? "watch" : "ok" }) : x));
    const score = Risk.score(adjusted);
    // Shown to staff as a progress score: 100 = fully on track, lower = more at risk
    return Object.assign(s, { signals, score, progress: 100 - score, band: Risk.riskBand(score) });
  }

  function students() {
    return [jordan()].concat(D.roster).map(enrich);
  }

  function inMine(s) { return s.subjects.filter((x) => MY.includes(x.code)); }

  // Metrics in the context of the selected subject (or averaged over mine)
  function ctx(s, code) {
    const subs = code === "all" ? inMine(s) : s.subjects.filter((x) => x.code === code);
    const avg = (k) => Math.round(subs.reduce((n, x) => n + x[k], 0) / subs.length);
    return {
      grade: avg("grade"),
      attendance: avg("attendance"),
      overdue: subs.reduce((n, x) => n + x.overdue.length, 0),
      inactive: Math.min(...subs.map((x) => x.lastActiveDaysAgo)),
    };
  }

  const BAND = {
    high: { level: "alert", label: "High risk" },
    medium: { level: "watch", label: "Medium" },
    low: { level: "ok", label: "Low" },
  };
  const bandChip = (b) => chip(BAND[b].level, BAND[b].label);
  const initials = (n) => n.split(" ").map((x) => x[0]).slice(0, 2).join("");

  function statusChips(s) {
    const S = st();
    const out = [];
    const openRef = (S.referrals[s.id] || []).find((r) => r.status === "open");
    if (openRef) out.push(`<span class="chip blue">${icon("users")}Referred</span>`);
    if ((S.log[s.id] || []).some((l) => l.type === "message")) out.push(`<span class="chip neutral">${icon("mail")}Contacted</span>`);
    if (Object.keys(s.fine).length) out.push(`<span class="chip neutral">${icon("smile")}Says they're fine</span>`);
    return out.join("");
  }

  /* ---------- router ---------- */
  function render(view, parts) {
    document.getElementById("page-title").textContent = "Grades";
    parts = parts || [];
    if (parts[0] === "student" && parts[1]) return profile(view, decodeURIComponent(parts[1]));
    ui.subject = parts[0] === "subject" && MY.includes(parts[1]) ? parts[1] : "all";
    list(view);
  }

  /* ================================================================
     LIST
  ================================================================ */
  function list(view) {
    const all = students();
    const S = st();
    const enrolled = all.filter((s) => (ui.subject === "all" ? inMine(s).length : s.subjects.some((x) => x.code === ui.subject)));

    const counts = { all: { n: 0, high: 0 } };
    MY.forEach((c) => (counts[c] = { n: 0, high: 0 }));
    all.forEach((s) => {
      if (inMine(s).length) { counts.all.n++; if (s.band === "high") counts.all.high++; }
      s.subjects.forEach((x) => { if (counts[x.code]) { counts[x.code].n++; if (s.band === "high") counts[x.code].high++; } });
    });

    let rows = enrolled.filter((s) => {
      if (ui.filter === "referred") return (S.referrals[s.id] || []).some((r) => r.status === "open");
      if (ui.filter !== "all" && s.band !== ui.filter) return false;
      return true;
    });
    if (ui.q) {
      const q = ui.q.toLowerCase();
      rows = rows.filter((s) => (s.fullName + " " + s.studentNo).toLowerCase().includes(q));
    }
    const SORTS = {
      risk: (a, b) => b.score - a.score,
      grade: (a, b) => ctx(a, ui.subject).grade - ctx(b, ui.subject).grade,
      attendance: (a, b) => ctx(a, ui.subject).attendance - ctx(b, ui.subject).attendance,
      overdue: (a, b) => ctx(b, ui.subject).overdue - ctx(a, ui.subject).overdue,
      inactive: (a, b) => ctx(b, ui.subject).inactive - ctx(a, ui.subject).inactive,
      name: (a, b) => a.fullName.localeCompare(b.fullName),
    };
    rows.sort((a, b) => SORTS[ui.sort](a, b) || b.score - a.score);
    const pinned = rows.filter((s) => S.pins.includes(s.id));
    const rest = rows.filter((s) => !S.pins.includes(s.id));

    const high = enrolled.filter((s) => s.band === "high").length;
    const med = enrolled.filter((s) => s.band === "medium").length;
    const referred = enrolled.filter((s) => (S.referrals[s.id] || []).some((r) => r.status === "open")).length;
    const checkins = enrolled.filter((s) => s.answers.checkin).length;
    const subjName = ui.subject === "all" ? "All my subjects" : `${ui.subject} ${D.staff.subjects.find((x) => x.code === ui.subject).name}`;

    view.innerHTML = `
      <div class="staff-layout">
        <nav class="subject-list" aria-label="Subjects">
          <a href="#/staff" class="${ui.subject === "all" ? "on" : ""}"><span><strong>All my subjects</strong><small>${counts.all.n} students</small></span>${counts.all.high ? `<span class="hi-badge" title="High risk">${counts.all.high}</span>` : ""}</a>
          ${D.staff.subjects.map((s) => `<a href="#/staff/subject/${s.code}" class="${ui.subject === s.code ? "on" : ""}"><span><strong>${s.code}</strong><small>${esc(s.name)} · ${counts[s.code].n}</small></span>${counts[s.code].high ? `<span class="hi-badge" title="High risk">${counts[s.code].high}</span>` : ""}</a>`).join("")}
        </nav>

        <div class="staff-main">
          <div class="section-head"><h2>${esc(subjName)}</h2><p>${esc(D.term.name)} · Week ${D.term.week} of ${D.term.totalWeeks}</p></div>

          <div class="grid tiles staff-tiles">
            <button class="card tile ${ui.filter === "all" ? "sel" : ""}" data-filter="all"><span class="label">Students</span><span class="value">${enrolled.length}</span></button>
            <button class="card tile ${ui.filter === "high" ? "sel" : ""}" data-filter="high"><span class="label">${chip("alert", "High risk", true)}</span><span class="value">${high}</span></button>
            <button class="card tile ${ui.filter === "medium" ? "sel" : ""}" data-filter="medium"><span class="label">${chip("watch", "Medium", true)}</span><span class="value">${med}</span></button>
            <button class="card tile ${ui.filter === "referred" ? "sel" : ""}" data-filter="referred"><span class="label"><span class="chip blue">${icon("users")}Referred</span></span><span class="value">${referred}</span></button>
            <div class="card tile"><span class="label"><span class="chip neutral">${icon("clipboard")}Did check-in</span></span><span class="value">${checkins}<small class="sub"> / ${enrolled.length}</small></span></div>
          </div>

          <div class="forum-toolbar" style="margin-top:16px">
            <label class="search">${icon("search")}<span class="sr-only">Search students</span><input type="search" placeholder="Search by name or student number" value="${esc(ui.q)}" data-q></label>
            <label class="sort-label">Sort by <select data-sort>
              ${[["risk", "Lowest progress (recommended)"], ["grade", "Lowest grade"], ["attendance", "Lowest attendance"], ["overdue", "Most overdue"], ["inactive", "Longest inactive"], ["name", "Name A–Z"]]
                .map(([v, l]) => `<option value="${v}" ${ui.sort === v ? "selected" : ""}>${l}</option>`).join("")}
            </select></label>
          </div>

          <div class="roster-head" aria-hidden="true"><span></span><span>Student</span><span>Progress</span><span>Grade</span><span>Attend.</span><span>Overdue</span><span>Status</span></div>
          ${pinned.length ? `<h3 class="group-title">${icon("pin")}Pinned <span>${pinned.length}</span></h3><div class="roster">${pinned.map((s) => row(s, true)).join("")}</div>` : ""}
          <h3 class="group-title">${pinned.length ? "Everyone else" : "Students"} <span>${rest.length}</span></h3>
          <div class="roster">${rest.length ? rest.map((s) => row(s, false)).join("") : `<div class="empty">No students match.</div>`}</div>
          <p class="sub" style="margin-top:12px">${icon("info")} Progress score: 100 means fully on track, and lower means more at risk. It combines grades, attendance, submissions, LearnJCU activity and the check-in (if they took part). Pin students to keep them at the top.</p>
        </div>
      </div>
      ${Student.demoFoot()}`;

    view.onclick = (e) => {
      const pin = e.target.closest("[data-pin]");
      if (pin) {
        const s = st();
        const id = pin.dataset.pin;
        s.pins = s.pins.includes(id) ? s.pins.filter((x) => x !== id) : [id].concat(s.pins);
        save(s);
        toast(s.pins.includes(id) ? "Pinned to the top." : "Unpinned.");
        list(view);
        return;
      }
      const f = e.target.closest("[data-filter]");
      if (f) { ui.filter = ui.filter === f.dataset.filter && f.dataset.filter !== "all" ? "all" : f.dataset.filter; list(view); return; }
      const r = e.target.closest("[data-open]");
      if (r && !e.target.closest("a")) location.hash = `#/staff/student/${r.dataset.open}`;
    };
    view.onchange = (e) => { if (e.target.matches("[data-sort]")) { ui.sort = e.target.value; list(view); } };
    view.oninput = (e) => {
      if (e.target.matches("[data-q]")) {
        ui.q = e.target.value;
        const pos = e.target.selectionStart;
        list(view);
        const q = view.querySelector("[data-q]"); q.focus(); q.setSelectionRange(pos, pos);
      }
    };
  }

  function row(s, pinned) {
    const c = ctx(s, ui.subject);
    const gl = Risk.metricLevel(c.grade, T.grade, true);
    const al = Risk.metricLevel(c.attendance, T.attendance, true);
    const ol = Risk.metricLevel(c.overdue, T.overdue, false);
    const top = s.signals[0];
    return `<div class="srow ${s.band}" data-open="${s.id}">
      <button class="pin-btn ${pinned ? "on" : ""}" data-pin="${s.id}" aria-pressed="${pinned}" aria-label="${pinned ? "Unpin" : "Pin"} ${esc(s.fullName)}">${icon("pin")}</button>
      <div class="s-who">
        <span class="s-ava">${esc(initials(s.fullName))}</span>
        <div><a class="s-name" href="#/staff/student/${s.id}">${esc(s.fullName)}</a>${s.id === "demo-student" ? ' <span class="chip blue">Live demo</span>' : ""}
        <small>${top ? esc(top.title) : "No concerns"}</small></div>
      </div>
      <div class="s-risk">
        <div class="riskbar" role="img" aria-label="Progress score ${s.progress} out of 100"><div style="width:${Math.max(3, s.progress)}%"></div></div>
        <span class="s-score">${s.progress}</span>${bandChip(s.band)}
      </div>
      <div class="s-metrics">
        <div class="s-m ${gl}"><b>${c.grade}%</b><small>Grade</small></div>
        <div class="s-m ${al}"><b>${c.attendance}%</b><small>Attendance</small></div>
        <div class="s-m ${ol}"><b>${c.overdue}</b><small>Overdue</small></div>
      </div>
      <div class="s-flags">${statusChips(s)}</div>
    </div>`;
  }

  /* ================================================================
     PROFILE
  ================================================================ */
  function recommendations(s) {
    const out = [];
    const sub = (code) => s.subjects.find((x) => x.code === code);
    s.signals.forEach((x) => {
      const [kind, code] = x.id.split("-");
      const mine = !code || MY.includes(code);
      if (kind === "overdue" && mine) out.push({ id: x.id, title: `Offer an extension for ${sub(code).overdue.join(" and ")}`, why: x.title, kind: "message", tpl: "extension", code });
      if (kind === "att" && mine && x.level === "alert") out.push({ id: x.id, title: `Share ${code} recordings and invite them to a consultation`, why: x.title, kind: "message", tpl: "attendance", code });
      if (kind === "grade" && mine) out.push({ id: x.id, title: "Refer to Academic support", why: x.title, kind: "refer", to: "Academic support (Learning Centre)" });
      if (kind === "inactive" && mine) out.push({ id: x.id, title: "Send a quick check-in message", why: x.title, kind: "message", tpl: "checkin", code });
      if (kind === "gpa") out.push({ id: x.id, title: "Suggest a study plan with an academic adviser", why: x.title, kind: "refer", to: "Academic adviser" });
      if (x.id === "checkin-answers" && x.level === "alert") out.push({ id: x.id, title: "Refer to Student Support (wellbeing)", why: "Wellbeing check-in was flagged", kind: "refer", to: "Student Support Advisor" });
    });
    const withdraw = D.keyDates.find((k) => k.id === "withdraw");
    const daysLeft = Risk.daysBetween(D.term.today, withdraw.date);
    if (s.band === "high" && daysLeft >= 0) {
      out.unshift({ id: "studyload", title: `Talk about study load options before ${fmtDate(withdraw.date)}`, why: `Last day to withdraw without academic penalty is in ${daysLeft} days`, kind: "message", tpl: "studyload" });
    }
    // Merge duplicates (e.g. "Refer to Academic support" for two subjects)
    const merged = [];
    out.forEach((r) => {
      const same = merged.find((m) => m.title === r.title);
      if (same) same.why += " · " + r.why; else merged.push(r);
    });
    return merged;
  }

  function template(kind, s, code) {
    const first = s.preferredName;
    const sub = code ? s.subjects.find((x) => x.code === code) : null;
    const sign = `\n\nKind regards,\n${D.staff.name}`;
    const T = {
      general: ["Checking in", `Hi ${first},\n\nI wanted to check in and see how you're going this trimester. If anything is making study harder at the moment, I'm happy to chat or point you to support.`],
      extension: [`${code}: overdue work`, `Hi ${first},\n\nI noticed ${sub ? sub.overdue.join(" and ") : "some work"} ${sub && sub.overdue.length > 1 ? "are" : "is"} still outstanding. If something has come up, let me know. I can offer a short extension, or you can apply for special consideration.`],
      attendance: [`${code}: catching up`, `Hi ${first},\n\nI've noticed you've missed a few ${code} classes lately. The recordings are on LearnJCU, and you're welcome to book a consultation if you'd like help catching up.`],
      checkin: [`${code}: how are you going?`, `Hi ${first},\n\nI haven't seen you on the ${code} site for a little while. Just checking everything's okay. If you'd like a hand getting back on track, reply here.`],
      survey: ["Mid-trimester check-in (prize draw)", `Hi ${first},

If you have 3 minutes, the mid-trimester wellbeing check-in is open until ${fmtDate(D.keyDates.find((k) => k.id === "checkin").date)}. It's optional, only Student Support sees your answers, and everyone who finishes goes in the draw for ${D.surveys.find((x) => x.featured).prize}.`],
      studyload: ["Your study options", `Hi ${first},\n\nI wanted to make sure you know your options this trimester. If things are getting on top of you, reducing your study load before ${fmtDate(D.keyDates.find((k) => k.id === "withdraw").date)} means no fail is recorded. An academic adviser can talk it through with you.`],
    };
    const t = T[kind] || T.general;
    return { subject: t[0], body: t[1] + sign };
  }

  function profile(view, id) {
    const all = students();
    const s = all.find((x) => x.id === id);
    if (!s) { view.innerHTML = `<div class="empty">Student not found. <a href="#/staff">Back to students</a></div>`; return; }
    const S = st();
    const pinned = S.pins.includes(s.id);
    const recs = recommendations(s);
    const recState = S.recs[s.id] || {};
    const openRecs = recs.filter((r) => !recState[r.id]);
    const doneRecs = recs.filter((r) => recState[r.id]);
    const refs = S.referrals[s.id] || [];
    const mine = inMine(s);
    const others = s.subjects.filter((x) => !MY.includes(x.code));
    const back = ui.subject === "all" ? "#/staff" : `#/staff/subject/${ui.subject}`;
    const wellbeingFlag = s.signals.find((x) => x.id === "checkin-answers");

    view.innerHTML = `
      <a class="back-link" href="${back}">← ${ui.subject === "all" ? "All my students" : `Students in ${ui.subject}`}</a>

      <div class="card profile-head ${s.band}">
        <span class="s-ava big">${esc(initials(s.fullName))}</span>
        <div class="p-who">
          <h2>${esc(s.fullName)} ${s.id === "demo-student" ? '<span class="chip blue">Live demo</span>' : ""}</h2>
          <p class="sub">${esc(s.studentNo)} · ${esc(s.course)} · Year ${s.year} · ${esc(s.campus)}</p>
          <div class="p-actions">
            <button class="btn" data-contact>${icon("mail")}Message</button>
            <button class="btn secondary" data-refer>${icon("users")}Refer / escalate</button>
            <button class="btn ghost" data-pin-one aria-pressed="${pinned}">${icon("pin")}${pinned ? "Unpin" : "Pin to top"}</button>
          </div>
        </div>
        <div class="p-score">
          <div class="riskbar tall" role="img" aria-label="Progress score ${s.progress} out of 100"><div style="width:${Math.max(3, s.progress)}%"></div></div>
          <div><span class="value">${s.progress}</span><small> / 100</small> ${bandChip(s.band)}</div>
          <small class="sub">Progress score${Object.keys(s.fine).length ? " · adjusted for the student's replies" : ""}</small>
        </div>
      </div>

      ${refs.filter((r) => r.status === "open").map((r) => `
        <div class="banner">
          <span class="b-icon">${icon("users")}</span>
          <div class="b-text"><strong>Referred to ${esc(r.to)} · ${esc(r.urgency)}</strong><p>${timeLabel(r.at)}${r.note ? ` · “${esc(r.note)}”` : ""}${r.notify ? " · Student was told" : ""}</p></div>
          <button class="btn secondary small" data-resolve="${r.at}">Mark resolved</button>
        </div>`).join("")}

      <div class="split">
        <div>
          <section class="section">
            <div class="section-head"><h2>How to help</h2><p>Suggested from this student's data</p></div>
            ${openRecs.length ? `<div class="recs">${openRecs.slice(0, ui.allRecs ? 99 : 4).map((r) => `
              <div class="rec">
                <span class="rec-icon">${icon(r.kind === "refer" ? "users" : "mail")}</span>
                <div class="rec-body"><strong>${esc(r.title)}</strong><small>${esc(r.why)}</small></div>
                <div class="rec-actions">
                  <button class="btn small" data-rec="${r.id}">${r.kind === "refer" ? "Refer" : "Write message"}</button>
                  <button class="btn ghost small" data-rec-done="${r.id}">Mark done</button>
                  <button class="btn ghost small" data-rec-skip="${r.id}">Not needed</button>
                </div>
              </div>`).join("")}</div>
              ${openRecs.length > 4 ? `<button class="btn ghost small" style="margin-top:6px" data-all-recs>${ui.allRecs ? "Show fewer" : `Show ${openRecs.length - 4} more`}</button>` : ""}` : `<div class="empty">${icon("check")}<p>No open suggestions.</p></div>`}
            ${doneRecs.length ? `<p class="sub" style="margin-top:8px">${doneRecs.length} handled: ${doneRecs.map((r) => `${esc(r.title)} (${recState[r.id] === "done" ? "done" : "not needed"})`).join("; ")} <button class="btn ghost small" data-rec-reset>Undo</button></p>` : ""}
          </section>

          <section class="section">
            <div class="section-head"><h2>Why they're flagged</h2></div>
            ${s.signals.length ? `<ul class="signal-list">${s.signals.map((x) => {
              const label = x.id === "checkin-answers" ? "Wellbeing check-in flagged. Student Support is following up" : x.title;
              return `<li>${chip(s.fine[x.id] ? "ok" : x.level, s.fine[x.id] ? "Said they're fine" : x.level === "alert" ? "Below threshold" : "Heads up")}<span>${esc(label)}</span><small>${esc(x.source)}</small></li>`;
            }).join("")}</ul>` : `<div class="empty">No concerns right now.</div>`}
          </section>

          <section class="section">
            <div class="section-head"><h2>Your subjects</h2></div>
            <div class="table-wrap">
              <table class="subjects">
                <thead><tr><th>Subject</th><th>Grade so far</th><th>Attendance</th><th>Submitted</th><th>Last active</th></tr></thead>
                <tbody>${mine.map((x) => {
                  const g = Risk.metricLevel(x.grade, T.grade, true), a = Risk.metricLevel(x.attendance, T.attendance, true), o = Risk.metricLevel(x.overdue.length, T.overdue, false);
                  return `<tr>
                    <td><div class="code">${x.code}</div><div class="name">${esc(x.name)}</div></td>
                    <td class="metric"><span class="num">${x.grade}%</span>${Student.meter(x.grade, 100, { expected: T.grade.watch, threshold: T.grade.alert, level: g, label: `${x.grade}%` })}</td>
                    <td class="metric"><span class="num">${x.attendance}%</span>${Student.meter(x.attendance, 100, { expected: T.attendance.watch, threshold: T.attendance.alert, level: a, label: `${x.attendance}%` })}</td>
                    <td class="metric"><span class="num">${x.submitted}/${x.dueSoFar}</span>${Student.meter(x.submitted, x.total, { expected: x.dueSoFar, level: o, label: `${x.submitted} of ${x.dueSoFar}` })}</td>
                    <td>${x.lastActiveDaysAgo === 0 ? "Today" : `${x.lastActiveDaysAgo} days ago`}</td>
                  </tr>`;
                }).join("")}</tbody>
              </table>
            </div>
            ${others.length ? `<p class="sub" style="margin-top:8px">${icon("lock")} Also enrolled in ${others.map((x) => `${x.code} (${Risk.metricLevel(x.grade, T.grade, true) === "ok" && Risk.metricLevel(x.attendance, T.attendance, true) === "ok" ? "on track" : "needs attention"})`).join(", ")}. Details are only shown to that subject's staff.</p>` : ""}
          </section>

          <section class="section">
            <div class="section-head"><h2>Attendance by week</h2><p>All subjects</p></div>
            <div class="card chart-card" id="p-chart"></div>
          </section>
        </div>

        <aside>
          <section class="section">
            <div class="section-head"><h2>Wellbeing</h2></div>
            <div class="card kv">
              <div><span>Check-in</span><b>${s.answers.checkin ? `Completed ${fmtDate(s.checkinDate)}` : "Didn't take part (optional)"}</b></div>
              <div><span>Student Support</span><b>${wellbeingFlag && wellbeingFlag.level === "alert" ? "Following up" : wellbeingFlag ? "Monitoring" : "No concerns raised"}</b></div>
              <div><span>Optional surveys</span><b>${s.sharedOptional ? "Shared with Student Support" : "Not shared"}</b></div>
              <div><span>Quick questions</span><b>${s.id === "demo-student" ? Pulse.count() : (parseInt(s.id.slice(1), 10) * 7) % 5} answered this week</b></div>
              <div><span>Last on LearnJCU</span><b>${s.lastLoginDaysAgo === 0 ? "Today" : `${s.lastLoginDaysAgo} day${s.lastLoginDaysAgo === 1 ? "" : "s"} ago`}</b></div>
              <div><span>Trimester GPA</span><b>${s.gpa.term.toFixed(1)} <small class="sub">(usually ${s.gpa.cumulative.toFixed(1)})</small></b></div>
              <p class="sub" style="margin:8px 0 0">${icon("lock")} Check-in and quick-question answers are only visible to Student Support.</p>
            </div>
          </section>
          <section class="section">
            <div class="section-head"><h2>Activity</h2></div>
            <ol class="timeline">${timeline(s).map((t) => `<li class="${t.type}"><span class="t-dot"></span><div><b>${esc(t.text)}</b><small>${esc(t.when)}</small></div></li>`).join("")}</ol>
          </section>
        </aside>
      </div>
      ${Student.demoFoot()}`;

    Student.attendanceChart(view.querySelector("#p-chart"), s.attendanceByWeek);

    view.onclick = (e) => {
      const t = e.target.closest("button");
      if (!t) return;
      if (t.hasAttribute("data-contact")) contact(view, s, "general");
      else if (t.hasAttribute("data-refer")) refer(view, s, null);
      else if (t.hasAttribute("data-pin-one")) {
        const S2 = st(); S2.pins = S2.pins.includes(s.id) ? S2.pins.filter((x) => x !== s.id) : [s.id].concat(S2.pins); save(S2);
        toast(S2.pins.includes(s.id) ? "Pinned to the top of your list." : "Unpinned."); profile(view, id);
      } else if (t.dataset.rec) {
        const r = recs.find((x) => x.id === t.dataset.rec);
        if (r.kind === "refer") refer(view, s, r); else contact(view, s, r.tpl, r);
      } else if (t.dataset.recDone || t.dataset.recSkip) {
        const rid = t.dataset.recDone || t.dataset.recSkip;
        const S2 = st(); (S2.recs[s.id] = S2.recs[s.id] || {})[rid] = t.dataset.recDone ? "done" : "skipped"; save(S2);
        if (t.dataset.recDone) logAction(s.id, "action", "Marked done: " + recs.find((x) => x.id === rid).title);
        profile(view, id);
      } else if (t.hasAttribute("data-all-recs")) {
        ui.allRecs = !ui.allRecs; profile(view, id);
      } else if (t.hasAttribute("data-rec-reset")) {
        const S2 = st(); S2.recs[s.id] = {}; save(S2); profile(view, id);
      } else if (t.dataset.resolve) {
        const S2 = st(); const r = (S2.referrals[s.id] || []).find((x) => String(x.at) === t.dataset.resolve);
        if (r) { r.status = "resolved"; save(S2); logAction(s.id, "action", `Referral to ${r.to} resolved`); }
        profile(view, id);
      }
    };
  }

  function timeline(s) {
    const items = (st().log[s.id] || []).map((l) => ({ type: l.type, text: l.text, when: timeLabel(l.at) }));
    Object.keys(s.fine).forEach((k) => {
      const sig = s.signals.find((x) => x.id === k);
      if (sig) items.push({ type: "student", text: `Student replied “I'm fine, thanks” to: ${sig.title}`, when: "This week" });
    });
    if (s.answers.checkin) items.push({ type: "student", text: "Completed the wellbeing check-in", when: fmtDate(s.checkinDate) });
    s.signals.filter((x) => x.level === "alert").forEach((x) => items.push({ type: "system", text: `Automatic alert to Student Support: ${x.id === "checkin-answers" ? "wellbeing check-in" : x.title}`, when: "This week" }));
    if (!items.length) items.push({ type: "system", text: "No activity yet", when: "" });
    return items;
  }

  /* ---------- contact modal ---------- */
  function contact(view, s, tplKind, rec) {
    const code = rec && rec.code ? rec.code : null;
    const t = template(tplKind, s, code);
    const d = modal.open(`
      <form data-contact-form>
        <div class="modal-head"><div><h2 id="modal-title">Message ${esc(s.preferredName)}</h2><p>Sent through LearnJCU Messages${rec ? ` · ${esc(rec.why)}` : ""}</p></div>
          <button type="button" class="btn ghost small" data-close aria-label="Close">${icon("x")}</button></div>
        <div class="modal-body">
          <div class="field"><label for="m-tpl">Start from</label>
            <select id="m-tpl" name="tpl">
              ${[["general", "General check-in"], ["extension", "Offer an extension"], ["attendance", "Attendance / catching up"], ["checkin", "Haven't seen you online"], ["survey", "Check-in invite (prize draw)"], ["studyload", "Study load options"]]
                .map(([v, l]) => `<option value="${v}" ${v === tplKind ? "selected" : ""}>${l}</option>`).join("")}
            </select></div>
          <div class="field"><label for="m-sub">Subject</label><input id="m-sub" name="subject" value="${esc(t.subject)}" required></div>
          <div class="field"><label for="m-body">Message</label><textarea id="m-body" name="body" rows="9" required>${esc(t.body)}</textarea>
            <span class="hint">Keep it friendly and specific. Don't mention their progress score.</span></div>
          <label class="check"><input type="checkbox" name="email" checked> Also send to their student email</label>
        </div>
        <div class="modal-foot"><span class="sub">Demo only: nothing is actually sent.</span><div style="display:flex;gap:8px"><button type="button" class="btn ghost" data-close>Cancel</button><button class="btn" type="submit">${icon("send")}Send</button></div></div>
      </form>`);
    const form = d.querySelector("form");
    form.tpl.onchange = () => {
      const nt = template(form.tpl.value, s, code || (inMine(s)[0] || {}).code);
      form.subject.value = nt.subject; form.body.value = nt.body;
    };
    d.onclick = (e) => { if (e.target.closest("[data-close]")) modal.close(); };
    form.onsubmit = (e) => {
      e.preventDefault();
      logAction(s.id, "message", `Message sent: “${form.subject.value}”`);
      if (rec) { const S2 = st(); (S2.recs[s.id] = S2.recs[s.id] || {})[rec.id] = "done"; save(S2); }
      if (s.id === "demo-student") {
        const m = Store.get("staffMessages", []);
        m.unshift({ from: D.staff.name, subject: form.subject.value, body: form.body.value, at: Date.now() });
        Store.set("staffMessages", m);
      }
      modal.close();
      toast(`Message sent to ${s.preferredName}.`);
      profile(view, s.id);
    };
  }

  /* ---------- refer / escalate modal ---------- */
  function refer(view, s, rec) {
    const TO = ["Student Support Advisor", "Counselling & wellbeing", "Academic support (Learning Centre)", "Academic adviser", "Accessibility services", "Course coordinator"];
    const chosen = rec ? rec.to : TO[0];
    const d = modal.open(`
      <form data-refer-form>
        <div class="modal-head"><div><h2 id="modal-title">Refer ${esc(s.preferredName)}</h2><p>Hand over to a team that can help. They'll see the reasons you tick.</p></div>
          <button type="button" class="btn ghost small" data-close aria-label="Close">${icon("x")}</button></div>
        <div class="modal-body">
          <fieldset class="q"><legend>Refer to</legend>
            <div class="opts">${TO.map((t) => `<label><input type="radio" name="to" value="${esc(t)}" ${t === chosen ? "checked" : ""}><span>${esc(t)}</span></label>`).join("")}</div></fieldset>
          <fieldset class="q"><legend>How soon?</legend>
            <div class="opts">${["Routine (within 5 days)", "Soon (within 2 days)", "Urgent (today)"].map((u, i) => `<label><input type="radio" name="urgency" value="${u.split(" (")[0]}" ${i === (s.band === "high" ? 1 : 0) ? "checked" : ""}><span>${u}</span></label>`).join("")}</div></fieldset>
          <fieldset class="q"><legend>Reasons to share</legend>
            <div class="checks">${s.signals.map((x) => `<label class="check"><input type="checkbox" name="reason" value="${esc(x.title)}" checked> ${esc(x.id === "checkin-answers" ? "Wellbeing check-in flagged" : x.title)}</label>`).join("") || '<p class="sub">No automatic reasons. Add a note below.</p>'}</div></fieldset>
          <div class="field"><label for="r-note">Note (optional)</label><textarea id="r-note" name="note" rows="3" placeholder="Anything you've noticed or already tried"></textarea></div>
          <label class="check"><input type="checkbox" name="notify" checked> Let ${esc(s.preferredName)} know they've been referred</label>
          <p class="filter-msg mask" style="margin-top:12px">${icon("alert")}<span>If a student is in immediate danger, call 000 or campus security first.</span></p>
        </div>
        <div class="modal-foot"><span class="sub">Demo only: nothing is actually sent.</span><div style="display:flex;gap:8px"><button type="button" class="btn ghost" data-close>Cancel</button><button class="btn" type="submit">Refer</button></div></div>
      </form>`);
    const form = d.querySelector("form");
    d.onclick = (e) => { if (e.target.closest("[data-close]")) modal.close(); };
    form.onsubmit = (e) => {
      e.preventDefault();
      const fd = new FormData(form);
      const r = { to: fd.get("to"), urgency: fd.get("urgency"), note: fd.get("note").trim(), notify: !!fd.get("notify"), reasons: fd.getAll("reason"), status: "open", at: Date.now() };
      const S2 = st();
      (S2.referrals[s.id] = S2.referrals[s.id] || []).unshift(r);
      if (rec) (S2.recs[s.id] = S2.recs[s.id] || {})[rec.id] = "done";
      save(S2);
      logAction(s.id, "refer", `Referred to ${r.to} (${r.urgency.toLowerCase()})`);
      if (s.id === "demo-student" && r.notify) {
        const m = Store.get("staffMessages", []);
        m.unshift({ from: D.staff.name, subject: `You've been referred to ${r.to}`, body: `Your lecturer has asked ${r.to} to get in touch with you. They'll contact you soon. You don't need to do anything.`, at: Date.now(), referral: true });
        Store.set("staffMessages", m);
      }
      modal.close();
      toast(`Referred to ${r.to}.`);
      profile(view, s.id);
    };
  }

  return { render };
})();
