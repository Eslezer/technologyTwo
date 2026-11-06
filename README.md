# Progress & Support: JCU × TechnologyOne Design Sprint 2026

A clickable prototype of a student support dashboard that sits under **Grades** in LearnJCU (Blackboard Ultra). It helps staff spot students who may be at risk of dropping out, and gives students a place to track progress, find help and talk to each other.

Everything runs in the browser as plain HTML, CSS and JavaScript. There's no build step, and all data is made up (`js/data.js`).

## What's in it

**Student view** (`#/support/...`)

| Section | What it does |
|---|---|
| My progress | Support quick links, GPA / attendance / assessments / check-in tiles compared with what's expected, a per-subject breakdown, weekly attendance chart, key academic dates (census and withdrawal deadlines), and "For you" alerts |
| Alerts | Each alert offers help and lets the student reply "I'm fine, thanks" or "Remind me later". Alerts below a threshold say that staff have been notified. |
| Student forum | Anonymous posts by category, search and sort, comments, "helpful" votes and reporting. A basic filter masks rude words and blocks emails, phone numbers and student IDs. Private messages stay hidden from moderators unless one person flags the conversation. |
| Surveys | An optional **mid-trimester wellbeing check-in**. Everyone who finishes it by the closing date goes in a draw for one of five $200 cash prizes. There are also optional *About you* and *Study habits* surveys. Each survey says why we ask and who sees the answers, and every question has a "Prefer not to say" option. Skipping the check-in doesn't count against a student. Only the answers of students who take part feed the risk rules. |
| Alerts & privacy | Students can turn their own alerts and the quick questions off (staff notifications stay on). The page also shows the thresholds and a table of what data is used and who sees it. |
| Quick questions | An occasional pop-up asks one random wellbeing question (sleep, stress, energy, breaks and so on) with one-tap answers. It appears at most once per browser session, about 20 seconds after a student page opens, and not again within 24 hours. A low answer offers counselling straight away. Use **Demo: wellbeing pop-up** at the bottom of student pages to trigger it on demand. |

**Staff view** (`#/staff`): a lecturer's view of their students. Switch to it with **Viewing as: Staff** or the **Let's help** button.

| Part | What it does |
|---|---|
| Subjects | "All my subjects" or one subject. Each shows how many students are high risk. |
| Student list | Each student has a **progress score** out of 100, where 100 means fully on track and lower means more at risk. By default the list is sorted lowest progress first. You can also sort by lowest grade, lowest attendance, most overdue, longest inactive or name, and search by name or student number. The summary tiles filter to high, medium or referred students. |
| Pins | Pinned students stay at the top. Tomas and Cindy are pinned in the demo, as in the sketch. |
| Student profile | **How to help** lists suggested actions (extension, recordings, refer to Academic support, study load before the withdrawal date, and so on), each with *Write message*, *Refer*, *Mark done* or *Not needed*. The profile also shows why the student is flagged, progress in your subjects (other subjects show only on track or needs attention), attendance by week, wellbeing status and an activity timeline. |
| Message / Refer | A prefilled message from a template, or a referral to Student Support, counselling, Academic support and others, with urgency, reasons and an optional "let the student know". |

Jordan Lee (marked **Live demo**) is the same student as the student view. Their check-in, "I'm fine, thanks" replies and survey answers change their staff-side score, and messages or referrals you send appear in Jordan's **For you** list.

The class roster is generated from a fixed seed in `js/roster.js`. Lecturers never see check-in or quick-question answers, only whether Student Support is following up and how many quick questions were answered.

## Project layout

```
index.html        app shell (side nav, page tabs)
css/styles.css    LearnJCU look: #1372BA, Noto Serif titles, Open Sans body
css/staff.css     staff view and "Let's help" button
css/pulse.css     quick-question pop-up
js/data.js        demo data: student, subjects, thresholds, forum, surveys
js/roster.js      demo class roster for the staff view (seeded)
js/risk.js        risk rules → signals (ok / watch / alert), 0-100 risk score (staff see 100 minus this as progress), high/medium/low band
js/store.js       localStorage wrapper (demo state survives reloads)
js/ui.js          icons, toast, modal, helpers
js/pulse.js       occasional quick wellbeing question pop-up
js/student.js     student view
js/staff.js       staff view: student list, profile, message and refer
js/app.js         hash router
```

To change when alerts trigger, edit `thresholds` in `js/data.js`. To change what counts as high or medium risk, edit `score()` and `riskBand()` in `js/risk.js`. After changing a file, bump the `?v=` number on the asset links in `index.html` so browsers pick up the new version.

Use **Reset demo** at the bottom of any page to clear saved answers, posts and dismissed alerts.

## Run locally

```bash
python -m http.server 5173
```

Then open http://localhost:5173.

## Host on GitHub Pages

1. Push this folder to `main` on GitHub.
2. Go to **Settings → Pages**, choose **Deploy from a branch**, then select `main` and `/ (root)`.
3. The site appears at `https://<user>.github.io/technologyTwo/` within a minute or two.

The `.nojekyll` file tells Pages to serve the files as they are.
