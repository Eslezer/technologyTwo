/* ------------------------------------------------------------------
   Wellbeing pulse: an occasional one-tap question for students.
   - Shows at most once per browser session, about 20 seconds after a
     student page opens, and not if they answered in the last 24 hours.
   - Students can skip it or turn it off (Alerts & privacy).
   - A low answer offers support straight away.
   - Answers go to Student Support only; lecturers see a count.
------------------------------------------------------------------- */
window.Pulse = (function () {
  const { icon, esc, toast } = UI;
  const FACES = ["😞", "🙁", "😐", "🙂", "😄"];

  const QUESTIONS = [
    { id: "feeling", text: "How are you feeling today?", type: "scale", labels: ["Awful", "Not great", "Okay", "Good", "Great"] },
    { id: "sleep", text: "How well did you sleep last night?", type: "scale", labels: ["Badly", "Not great", "Okay", "Well", "Really well"] },
    { id: "stress", text: "How's your stress about uni this week?", type: "scale", labels: ["Overwhelmed", "High", "Manageable", "Low", "Barely any"] },
    { id: "energy", text: "How's your energy for study today?", type: "scale", labels: ["Empty", "Low", "Okay", "Good", "Full tank"] },
    { id: "connected", text: "How connected do you feel to uni right now?", type: "scale", labels: ["Not at all", "A little", "Somewhat", "Quite", "Very"] },
    { id: "break", text: "Have you had a proper break this week?", type: "choice", options: ["Yes", "Sort of", "Not really"], low: ["Not really"] },
    { id: "talk", text: "Have you caught up with a friend or classmate lately?", type: "choice", options: ["Yes", "Not yet this week", "Not for a while"], low: ["Not for a while"] },
    { id: "meal", text: "Have you eaten a proper meal today?", type: "choice", options: ["Yes", "Sort of", "Not yet"], low: ["Not yet"] },
  ];

  const state = () => Object.assign({ answers: [], lastAt: 0 }, Store.get("pulse", {}));
  const enabled = () => Store.get("prefs", {}).pulse !== false;
  let timer = null;

  function el() {
    let d = document.getElementById("pulse");
    if (!d) {
      d = document.createElement("div");
      d.id = "pulse";
      d.className = "pulse";
      d.setAttribute("role", "dialog");
      d.setAttribute("aria-label", "Quick wellbeing question");
      document.body.appendChild(d);
    }
    return d;
  }

  function hide() {
    const d = document.getElementById("pulse");
    if (d) { d.classList.remove("show"); setTimeout(() => { if (!d.classList.contains("show")) d.innerHTML = ""; }, 200); }
  }

  function show(force) {
    if (!force && !enabled()) return;
    const st = state();
    const last = st.answers.length ? st.answers[0].q : null;
    const pool = QUESTIONS.filter((q) => q.id !== last);
    const q = pool[Math.floor(Math.random() * pool.length)];
    const d = el();

    const answers = q.type === "scale"
      ? `<div class="pulse-faces">${FACES.map((f, i) => `<button data-a="${i + 1}" title="${esc(q.labels[i])}" aria-label="${esc(q.labels[i])}"><span>${f}</span><small>${esc(q.labels[i])}</small></button>`).join("")}</div>`
      : `<div class="pulse-opts">${q.options.map((o) => `<button class="btn secondary small" data-a="${esc(o)}">${esc(o)}</button>`).join("")}</div>`;

    d.innerHTML = `
      <div class="pulse-head">
        <span class="pulse-tag">${icon("heart")}Quick question</span>
        <button class="pulse-x" data-skip aria-label="Close">${icon("x")}</button>
      </div>
      <p class="pulse-q">${esc(q.text)}</p>
      ${answers}
      <div class="pulse-foot">
        <span>${icon("lock")}Only Student Support sees answers</span>
        <span><button class="link-btn" data-skip>Skip</button> · <button class="link-btn" data-off>Don't ask me again</button></span>
      </div>`;
    void d.offsetWidth; // force a reflow so the fade-in runs (rAF pauses in background tabs)
    d.classList.add("show");
    const first = d.querySelector("[data-a]");
    if (first) first.focus({ preventScroll: true });

    d.onclick = (e) => {
      const b = e.target.closest("button");
      if (!b) return;
      if (b.hasAttribute("data-skip")) { hide(); return; }
      if (b.hasAttribute("data-off")) {
        const p = Store.get("prefs", {}); p.pulse = false; Store.set("prefs", p);
        hide(); toast("Okay, no more quick questions. You can turn them back on in Alerts & privacy.");
        return;
      }
      if (b.hasAttribute("data-close")) { hide(); return; }
      if (b.hasAttribute("data-help")) {
        hide(); toast("Counselling & wellbeing would open here.");
        return;
      }
      if (b.dataset.a != null) answer(q, b.dataset.a);
    };
  }

  function answer(q, raw) {
    const value = q.type === "scale" ? Number(raw) : raw;
    const st = state();
    st.answers.unshift({ q: q.id, a: value, at: Date.now() });
    st.answers = st.answers.slice(0, 50);
    st.lastAt = Date.now();
    Store.set("pulse", st);

    const low = q.type === "scale" ? value <= 2 : (q.low || []).includes(value);
    const d = el();
    if (low) {
      d.innerHTML = `
        <div class="pulse-head"><span class="pulse-tag">${icon("heart")}Thanks for telling us</span><button class="pulse-x" data-close aria-label="Close">${icon("x")}</button></div>
        <p class="pulse-q">Sorry it's a tough one. Would it help to talk to someone?</p>
        <p class="pulse-small">Counselling is free and confidential. If you need someone right now, Lifeline is open 24/7 on <b>13 11 14</b>.</p>
        <div class="pulse-opts"><button class="btn small" data-help>Counselling & wellbeing</button><button class="btn ghost small" data-close>I'm okay, thanks</button></div>`;
    } else {
      d.innerHTML = `
        <div class="pulse-head"><span class="pulse-tag">${icon("check")}Thanks!</span><button class="pulse-x" data-close aria-label="Close">${icon("x")}</button></div>
        <p class="pulse-q" style="margin-bottom:0">Glad to hear it. See you next time.</p>`;
      setTimeout(hide, 2500);
    }
  }

  // Called on every student page load
  function maybeAuto() {
    if (timer || !enabled()) return;
    let seen = false;
    try { seen = sessionStorage.getItem("pulse-seen") === "1"; } catch (e) { /* ignore */ }
    if (seen || Date.now() - state().lastAt < 24 * 3600 * 1000) return;
    timer = setTimeout(() => {
      if (!location.hash.startsWith("#/support") && !location.hash.startsWith("#/grades") && location.hash !== "") return;
      try { sessionStorage.setItem("pulse-seen", "1"); } catch (e) { /* ignore */ }
      if (!document.getElementById("modal").open) show(false);
    }, 20000);
  }

  function count() { return state().answers.length; }

  return { show, hide, maybeAuto, count };
})();
