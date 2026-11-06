/* ------------------------------------------------------------------
   Demo data. Everything here is invented for the prototype.
   In production this would come from the student management system
   (enrolment, timetable, grades), the LMS (submissions, logins) and
   the survey service. Kept in one place so the staff dashboard can
   read the same records.
------------------------------------------------------------------- */
window.DEMO = {
  term: {
    name: "Trimester 3, 2026",
    week: 9,
    totalWeeks: 13,
    today: "2026-11-06",
  },

  // Academic calendar deadlines (from the TechnologyOne interview:
  // catch problems before these dates).
  keyDates: [
    { id: "census", label: "Census date", detail: "Last day to drop a subject without paying fees", date: "2026-10-02" },
    { id: "withdraw", label: "Withdraw without academic penalty", detail: "You still pay fees, but no fail is recorded", date: "2026-11-13" },
    { id: "checkin", label: "Mid-trimester check-in closes", detail: "Optional. Take part to enter the prize draw", date: "2026-11-13" },
    { id: "exams", label: "Exam period starts", detail: "Check your timetable for exam times", date: "2026-11-30" },
  ],

  student: {
    id: "demo-student",
    preferredName: "Jordan",
    fullName: "Jordan Lee",
    course: "Bachelor of Information Technology",
    campus: "Brisbane",
    year: 3,
    gpa: { term: 4.3, cumulative: 5.1, expected: 4.0 }, // JCU 7-point scale
    lastLoginDaysAgo: 1,
    subjects: [
      {
        code: "CP3501", name: "Deep Learning",
        grade: 54, attendance: 62,
        submitted: 6, dueSoFar: 8, total: 10,
        overdue: ["Prac-7 drop box", "Prac-8 drop box"],
        lastActiveDaysAgo: 9,
      },
      {
        code: "CP3407", name: "Advanced Software Engineering",
        grade: 71, attendance: 88,
        submitted: 4, dueSoFar: 4, total: 6,
        overdue: [], lastActiveDaysAgo: 1,
      },
      {
        code: "CP3404", name: "Information Security",
        grade: 63, attendance: 79,
        submitted: 3, dueSoFar: 3, total: 5,
        overdue: [], lastActiveDaysAgo: 2,
      },
      {
        code: "CP3405", name: "IT Design Sprint",
        grade: 78, attendance: 92,
        submitted: 2, dueSoFar: 2, total: 3,
        overdue: [], lastActiveDaysAgo: 0,
      },
    ],
    // Weekly attendance across all classes, % of scheduled sessions
    attendanceByWeek: [96, 92, 90, 85, 81, 74, 70, 66, 68],
  },

  // Thresholds that trigger an automatic staff notification.
  // Students can mute their own alerts, but staff are always told.
  thresholds: {
    attendance: { watch: 80, alert: 70 },
    grade: { watch: 60, alert: 50 },
    gpa: { watch: 4.5, alert: 4.0 },
    overdue: { watch: 1, alert: 2 },
    inactivityDays: { watch: 7, alert: 14 },
  },

  supportLinks: [
    { id: "academic", icon: "book", title: "Academic support", text: "Study skills, writing help, maths and stats", href: "#" },
    { id: "consult", icon: "calendar", title: "Book a consultation", text: "Meet a lecturer or academic adviser", href: "#" },
    { id: "wellbeing", icon: "heart", title: "Counselling & wellbeing", text: "Free, confidential counselling", href: "#" },
    { id: "access", icon: "access", title: "Accessibility services", text: "Adjustments for disability or health conditions", href: "#" },
    { id: "money", icon: "wallet", title: "Money & housing", text: "Hardship grants, loans and accommodation", href: "#" },
    { id: "events", icon: "spark", title: "Events & clubs", text: "Meet people, workshops, peer study groups", href: "#" },
  ],

  forum: {
    categories: ["General", "Study help", "Wellbeing", "Money & housing", "Campus life"],
    // Blocked words are masked; personal details are blocked outright.
    blockedWords: ["idiot", "stupid", "loser", "damn", "crap"],
    posts: [
      {
        id: "p1", alias: "Anonymous Kookaburra", category: "Study help",
        title: "Anyone else behind on the Deep Learning pracs?",
        body: "I've missed two prac drop boxes and feel like I can't catch up. Is it worth emailing the lecturer or should I just push through?",
        time: "2 hours ago", helpful: 14, pinned: false,
        comments: [
          { alias: "Anonymous Cassowary", body: "Email them. I did last trimester and got an extension because I had a rough few weeks.", time: "1 hour ago", staff: false },
          { alias: "Moderator", body: "Good advice. You can also book a consultation from the support links at the top of this page.", time: "40 min ago", staff: true },
        ],
      },
      {
        id: "p2", alias: "Moderator", category: "General",
        title: "Welcome to the student forum (please read)",
        body: "Posts are anonymous to other students. Be kind, don't share personal details, and report anything that worries you. If you or someone else is in danger, call 000. Lifeline is available 24/7 on 13 11 14.",
        time: "3 weeks ago", helpful: 40, pinned: true, staff: true,
        comments: [],
      },
      {
        id: "p3", alias: "Anonymous Wallaby", category: "Money & housing",
        title: "Working 30 hours a week and studying full time",
        body: "Rent went up and I've had to pick up more shifts. Has anyone dropped to part time? Did it affect your visa or Centrelink?",
        time: "Yesterday", helpful: 9, pinned: false,
        comments: [
          { alias: "Anonymous Platypus", body: "I went part time in second year. Talk to student services first. They explained what it meant for my payments.", time: "Yesterday", staff: false },
        ],
      },
      {
        id: "p4", alias: "Anonymous Echidna", category: "Wellbeing",
        title: "First in my family at uni and feeling lost",
        body: "Everyone seems to know how things work (extensions, special consideration, census dates). Where do you even find this stuff?",
        time: "3 days ago", helpful: 22, pinned: false,
        comments: [
          { alias: "Anonymous Kookaburra", body: "Same! The key dates box on the Progress & support page helped me a lot.", time: "2 days ago", staff: false },
          { alias: "Anonymous Dugong", body: "Peer mentors are great for this. Check Events & clubs.", time: "2 days ago", staff: false },
        ],
      },
      {
        id: "p5", alias: "Anonymous Dugong", category: "Campus life",
        title: "Study group for Info Security exam?",
        body: "Looking for 3 or 4 people to meet in the library on Thursdays before the exam period.",
        time: "4 days ago", helpful: 6, pinned: false,
        comments: [],
      },
    ],
    dms: [
      {
        id: "d1", with: "Anonymous Cassowary", flagged: false,
        messages: [
          { from: "them", body: "Hey, saw your comment about the pracs. Want to work through Prac 7 together?", time: "Yesterday" },
          { from: "me", body: "Yes please, I'm totally stuck on the CNN part.", time: "Yesterday" },
        ],
      },
    ],
  },

  surveys: [
    {
      id: "checkin",
      featured: true,
      title: "Mid-trimester wellbeing check-in",
      summary: "A short check-in on how your study and life are going.",
      minutes: 3,
      due: "2026-11-13",
      prize: "one of five $200 cash prizes",
      why: "It helps us spot when students need support early, before the withdrawal deadline. It's optional, and everyone who completes it goes in the prize draw.",
      who: "Your Student Support Advisor and the wellbeing team. Your lecturers only see whether you completed it, not your answers.",
      questions: [
        { id: "coping", type: "scale", label: "Overall, how are you coping with uni this trimester?", low: "Struggling", high: "Doing well", required: true },
        { id: "workload", type: "scale", label: "How manageable is your study workload?", low: "Not manageable", high: "Very manageable", required: true },
        { id: "health", type: "scale", label: "How has your physical and mental health been?", low: "Poor", high: "Great", required: true, pnts: true },
        { id: "connected", type: "scale", label: "How connected do you feel to other students and staff?", low: "Not at all", high: "Very connected", required: true },
        { id: "work", type: "choice", label: "How many hours a week do you work in paid jobs?", options: ["None", "1 to 10", "11 to 20", "21 to 30", "More than 30"], required: true, pnts: true },
        { id: "leaving", type: "choice", label: "Have you thought about pausing or leaving your studies?", options: ["No", "Sometimes", "Yes, seriously"], required: true, pnts: true },
        { id: "support", type: "multi", label: "Would any of these help right now? (choose any)", options: ["Help with study skills", "Extension or special consideration", "Counselling", "Financial help", "Changing my study load", "Meeting other students"] },
        { id: "contact", type: "choice", label: "Would you like someone from Student Support to contact you?", options: ["Yes, please", "No, thanks"], required: true },
        { id: "other", type: "text", label: "Anything else you'd like us to know? (optional)" },
      ],
    },
    {
      id: "about",
      required: false,
      title: "About you",
      summary: "Background that can affect your uni experience, like being first in your family at university.",
      minutes: 2,
      why: "Some students face extra challenges that we don't know about unless they tell us. This lets us offer the right support from the start.",
      who: "Student Support only. It's never shown to lecturers or used in grading.",
      questions: [
        { id: "firstfamily", type: "choice", label: "Are you the first person in your family to go to university?", options: ["Yes", "No"], pnts: true },
        { id: "international", type: "choice", label: "Are you an international student?", options: ["Yes", "No"], pnts: true },
        { id: "language", type: "choice", label: "Is English your first language?", options: ["Yes", "No"], pnts: true },
        { id: "carer", type: "choice", label: "Do you care for children or family members?", options: ["Yes", "No"], pnts: true },
        { id: "distance", type: "choice", label: "How long does it take you to get to campus?", options: ["Under 30 min", "30 to 60 min", "Over an hour", "I study online"], pnts: true },
      ],
    },
    {
      id: "habits",
      required: false,
      title: "Study habits",
      summary: "How and when you study, so suggestions and reminders fit your routine.",
      minutes: 2,
      why: "Some people log in once a week and do everything at once. Knowing your routine stops us sending alerts you don't need.",
      who: "Used by the system to tune your alerts. Student Support can see a summary.",
      questions: [
        { id: "routine", type: "choice", label: "Which sounds most like you?", options: ["A little every day", "A few longer sessions a week", "One big session a week", "It changes a lot"], pnts: true },
        { id: "where", type: "multi", label: "Where do you usually study?", options: ["At home", "Library", "On campus elsewhere", "At work or on the commute"] },
        { id: "confidence", type: "scale", label: "How confident are you with your current subjects?", low: "Not confident", high: "Very confident", pnts: true },
      ],
    },
  ],
};
