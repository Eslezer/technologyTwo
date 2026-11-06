/* ------------------------------------------------------------------
   Demo class roster for the staff view. Generated from a fixed seed so
   every visitor sees the same class. Jordan Lee (the student view's
   demo student) is included and stays live: what you do as Jordan
   shows up here.
------------------------------------------------------------------- */
(function () {
  const D = window.DEMO;

  D.staff = {
    name: "Dr Riley Harper",
    first: "Riley",
    role: "Lecturer",
    subjects: [
      { code: "CP3501", name: "Deep Learning" },
      { code: "CP3404", name: "Information Security" },
      { code: "CP3407", name: "Advanced Software Engineering" },
    ],
  };

  const OTHER = [
    { code: "CP3405", name: "IT Design Sprint" },
    { code: "CP3402", name: "Cloud Computing" },
    { code: "CP2406", name: "Programming III" },
    { code: "MA2201", name: "Discrete Mathematics" },
  ];

  // Small seeded PRNG (mulberry32)
  let seed = 20261106;
  function rnd() {
    seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }
  const between = (a, b) => a + rnd() * (b - a);
  const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
  const pick = (arr) => arr[Math.floor(rnd() * arr.length)];

  // [name, risk propensity 0..1]. The first four come from the team's sketch.
  const PEOPLE = [
    ["Tomas Reyes", 0.12], ["Cindy Nguyen", 0.38], ["Tahsin Rahman", 0.6], ["Vinny Russo", 0.93],
    ["Aisha Khan", 0.08], ["Ben Carter", 0.45], ["Chloe Martin", 0.15], ["Daniel Okafor", 0.72],
    ["Emily Tran", 0.05], ["Finn O'Brien", 0.55], ["Grace Liu", 0.2], ["Hamish Taylor", 0.82],
    ["Isla Murphy", 0.1], ["Jack Wilson", 0.33], ["Kiara Walker", 0.66], ["Liam Patel", 0.18],
    ["Maya Singh", 0.27], ["Noah Kim", 0.9], ["Olivia Brown", 0.07], ["Priya Sharma", 0.48],
    ["Ruby Thompson", 0.14], ["Sam Fletcher", 0.58], ["Tara Jones", 0.22], ["Will Anderson", 0.76],
    ["Zara Ahmed", 0.11], ["Lucas Silva", 0.4], ["Mei Chen", 0.16], ["Ethan Clarke", 0.52],
  ];
  const COURSES = ["Bachelor of Information Technology", "Bachelor of Computer Science", "Bachelor of Engineering (Honours)", "Bachelor of Data Science"];
  const CAMPUS = ["Brisbane", "Brisbane", "Brisbane", "Online"];

  function makeSubject(sub, p) {
    const total = Math.round(between(5, 10));
    const dueSoFar = Math.round(total * 0.65);
    let overdue = 0;
    if (p > 0.8) overdue = 2;
    else if (p > 0.55 && rnd() < 0.55) overdue = 1;
    else if (rnd() < 0.04) overdue = 1;
    const names = [];
    for (let i = 0; i < overdue; i++) names.push(`Prac-${dueSoFar - i} drop box`);
    return {
      code: sub.code, name: sub.name,
      grade: clamp(Math.round(84 - p * 38 + between(-7, 7)), 18, 98),
      attendance: clamp(Math.round(97 - p * 46 + between(-7, 7)), 20, 100),
      submitted: dueSoFar - overdue, dueSoFar, total,
      overdue: names.reverse(),
      lastActiveDaysAgo: p > 0.8 ? Math.round(between(9, 18)) : p > 0.55 ? Math.round(between(2, 9)) : Math.round(between(0, 3)),
    };
  }

  function weekly(avg, p) {
    const start = clamp(96 - p * 12, 60, 100);
    const end = clamp(2 * avg - start, 15, 100);
    const out = [];
    for (let w = 0; w < 9; w++) out.push(clamp(Math.round(start + ((end - start) * w) / 8 + between(-4, 4)), 10, 100));
    return out;
  }

  const roster = PEOPLE.map(([fullName, p], idx) => {
    // Everyone is in at least one of the lecturer's subjects
    const mine = D.staff.subjects.filter(() => rnd() < 0.55);
    if (!mine.length) mine.push(D.staff.subjects[idx % 3]);
    const others = OTHER.filter(() => rnd() < 0.4).slice(0, 2);
    const subjects = mine.concat(others).map((s) => makeSubject(s, p));
    const attAvg = Math.round(subjects.reduce((n, s) => n + s.attendance, 0) / subjects.length);
    const term = Math.round(clamp(6.4 - p * 3 + between(-0.3, 0.3), 1.5, 7) * 10) / 10;

    const checkinDone = rnd() > p * 0.75;
    let answers = {};
    if (checkinDone) {
      const struggling = p > 0.7 && rnd() < 0.75;
      answers.checkin = struggling
        ? { coping: 2, workload: 2, health: 2, connected: 3, leaving: "Sometimes" }
        : { coping: 4, workload: p > 0.45 ? 3 : 4, health: 4, connected: 4, leaving: "No" };
    }
    const first = fullName.split(" ")[0];
    return {
      id: "s" + (idx + 1),
      fullName, preferredName: first,
      studentNo: "jc" + String(Math.floor(100000 + rnd() * 899999)),
      course: pick(COURSES), year: Math.round(between(1, 3)), campus: pick(CAMPUS),
      gpa: { term, cumulative: Math.round(clamp(term + between(0.2, 0.8), 1, 7) * 10) / 10, expected: 4.0 },
      lastLoginDaysAgo: Math.min(...subjects.map((s) => s.lastActiveDaysAgo)),
      subjects,
      attendanceByWeek: weekly(attAvg, p),
      answers,
      checkinDate: checkinDone ? `2026-11-0${Math.round(between(1, 5))}` : null,
      sharedOptional: rnd() < 0.5,
      fine: {},
    };
  });

  // Some medium-risk students have replied "I'm fine, thanks" to an alert
  roster.forEach((s) => {
    const sig = Risk.signals(Object.assign({}, D, { student: s }), s.answers);
    const watch = sig.filter((x) => x.level === "watch" && x.id !== "checkin");
    if (watch.length && rnd() < 0.35) s.fine[watch[0].id] = "fine";
  });

  D.roster = roster;
})();
