/* ------------------------------------------------------------------
   Risk signal engine. Shared by the student view (shown as friendly
   "things that need attention") and the future staff dashboard (shown
   as a risk score and an escalation queue).

   level: "ok" | "watch" | "alert"
   "alert" = below threshold, so staff are notified automatically.
------------------------------------------------------------------- */
window.Risk = (function () {
  const LEVEL_WEIGHT = { ok: 0, watch: 1, alert: 3 };

  function band(value, t, lowerIsWorse) {
    if (lowerIsWorse) {
      if (value < t.alert) return "alert";
      if (value < t.watch) return "watch";
      return "ok";
    }
    if (value >= t.alert) return "alert";
    if (value >= t.watch) return "watch";
    return "ok";
  }

  function daysBetween(a, b) {
    return Math.round((new Date(b) - new Date(a)) / 86400000);
  }

  function signals(data, answers) {
    const s = data.student;
    const t = data.thresholds;
    const out = [];

    // GPA
    const gpaLevel = band(s.gpa.term, t.gpa, true);
    if (gpaLevel !== "ok") {
      out.push({
        id: "gpa", level: gpaLevel, source: "Grades",
        title: `Trimester GPA is ${s.gpa.term.toFixed(1)}`,
        student: "Your GPA this trimester is lower than usual for you. A study plan can help you finish strongly.",
        action: { label: "Get academic support", link: "academic" },
      });
    }

    s.subjects.forEach((sub) => {
      const att = band(sub.attendance, t.attendance, true);
      if (att !== "ok") {
        out.push({
          id: `att-${sub.code}`, level: att, source: "Attendance", subject: sub.code,
          title: `${sub.attendance}% attendance in ${sub.code}`,
          student: `You've been to ${sub.attendance}% of ${sub.name} classes. Recordings and consultations can help you catch up.`,
          action: { label: "Book a consultation", link: "consult" },
        });
      }
      const gr = band(sub.grade, t.grade, true);
      if (gr !== "ok") {
        out.push({
          id: `grade-${sub.code}`, level: gr, source: "Grades", subject: sub.code,
          title: `${sub.grade}% so far in ${sub.code}`,
          student: `You're passing ${sub.name}, but only just. Academic support can help with the remaining assessments.`,
          action: { label: "Get academic support", link: "academic" },
        });
      }
      const od = band(sub.overdue.length, t.overdue, false);
      if (od !== "ok") {
        out.push({
          id: `overdue-${sub.code}`, level: od, source: "Submissions", subject: sub.code,
          title: `${sub.overdue.length} overdue in ${sub.code}`,
          student: `${sub.overdue.join(" and ")} ${sub.overdue.length > 1 ? "are" : "is"} overdue. You may be able to get an extension if something has come up.`,
          action: { label: "Ask about an extension", link: "consult" },
        });
      }
      const inact = band(sub.lastActiveDaysAgo, t.inactivityDays, false);
      if (inact !== "ok") {
        out.push({
          id: `inactive-${sub.code}`, level: inact, source: "LMS activity", subject: sub.code,
          title: `No activity in ${sub.code} for ${sub.lastActiveDaysAgo} days`,
          student: `You haven't opened ${sub.name} for ${sub.lastActiveDaysAgo} days. If that's just your routine, you can tell us below.`,
          action: { label: "Open subject", link: null },
        });
      }
    });

    // Mandatory check-in
    const checkin = data.surveys.find((x) => x.required);
    const done = answers && answers[checkin.id];
    if (!done) {
      const daysLeft = daysBetween(data.term.today, checkin.due);
      out.push({
        id: "checkin", level: daysLeft < 0 ? "alert" : "watch", source: "Check-in",
        title: daysLeft < 0 ? "Wellbeing check-in overdue" : `Wellbeing check-in due in ${daysLeft} days`,
        student: "Everyone completes this short check-in each trimester. It takes about 3 minutes.",
        action: { label: "Start check-in", survey: checkin.id },
      });
    } else {
      const a = done;
      const low = ["coping", "workload", "health", "connected"].filter((k) => typeof a[k] === "number" && a[k] <= 2);
      if (low.length >= 2 || a.leaving === "Yes, seriously") {
        out.push({
          id: "checkin-answers", level: "alert", source: "Check-in",
          title: "Check-in answers suggest support may help",
          student: "Thanks for being honest in your check-in. Student Support will reach out, and you can contact them any time.",
          action: { label: "Counselling & wellbeing", link: "wellbeing" },
        });
      } else if (low.length === 1 || a.leaving === "Sometimes") {
        out.push({
          id: "checkin-answers", level: "watch", source: "Check-in",
          title: "Check-in shows some pressure",
          student: "Your check-in shows things are a bit tough right now. Here's where to find help if you want it.",
          action: { label: "See support options", link: "wellbeing" },
        });
      }
    }

    // Sort: alerts first
    out.sort((x, y) => LEVEL_WEIGHT[y.level] - LEVEL_WEIGHT[x.level]);
    return out;
  }

  // 0–100 score for the staff dashboard. Not shown to students.
  function score(list) {
    const raw = list.reduce((n, x) => n + LEVEL_WEIGHT[x.level], 0);
    return Math.min(100, Math.round((raw / 12) * 100));
  }

  function metricLevel(value, t, lowerIsWorse) {
    return band(value, t, lowerIsWorse);
  }

  return { signals, score, metricLevel, daysBetween };
})();
