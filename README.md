
# HabitLock

HabitLock is a minimal, modular habit-tracking web application built around a calendar-centric interface. Users can track multiple habits, set weekly goals, and visualize progress using emojis and color-coded streaks.

## 🔥 Features

- 🌗 **Calendar View**: Primary interface where users can track daily habit completions
- ✍️ **Habit Creation**: Add habits with name, description, emoji, color, and weekly goal
- 💫 **Multiple Habits per Day**: Each day cell can show stacked emojis with tooltips
- 🔄 **Weekly Goal Tracking**: Habits glow when goal is reached within a week
- 📊 **Stats View**: View per-habit streaks, weekly completion %, and calendar heatmaps
- 🔐 **Anonymous Firebase Auth**: Seamless user session (skip login for MVP)
- 🎨 **SCSS Module Styling**: Fully modular design
- 🧠 **MVP-First Architecture**: Clean, extensible file structure made for scale and LLMs

---

## 🧱 Tech Stack

| Layer       | Tool            | Purpose                          |
|------------|-----------------|----------------------------------|
| Frontend   | React (Vite)    | Core SPA rendering               |
| Styling    | SCSS Modules    | Component-scoped CSS             |
| Auth/DB    | Firebase        | Anonymous auth + Realtime DB     |
| Date Utils | Day.js          | Fast date manipulation           |
| Hosting    | Firebase Hosting| Easy MVP deployment              |

---

## 🗂 Project Structure

```
HabitLock/
├── client/
│   ├── public/
│   ├── src/
│   │   ├── components/
│   │   │   ├── CalendarGrid.jsx
│   │   │   ├── CalendarCell.jsx
│   │   │   ├── HabitModal.jsx
│   │   │   └── Tooltip.jsx
│   │   ├── views/
│   │   │   ├── CalendarView.jsx
│   │   │   └── StatsView.jsx
│   │   ├── context/
│   │   ├── hooks/
│   │   │   ├── useCalendar.js
│   │   │   └── useHabits.js
│   │   ├── services/
│   │   │   ├── firebase.js
│   │   │   └── db.js
│   │   ├── utils/
│   │   │   ├── dateUtils.js
│   │   │   └── streakUtils.js
│   │   ├── styles/
│   │   └── App.jsx
│   └── vite.config.js
├── .env
├── README.md
└── package.json
```

---

## ⚙️ Data Model

### 🔸 Habit
```json
{
  "id": "habit123",
  "name": "Workout",
  "description": "Gym or cardio",
  "emoji": "💪",
  "color": "#FF4D4F",
  "weeklyGoal": 3,
  "createdAt": 1717171717
}
```

### 🔸 Daily Entry
Stored under `calendarEntries/{userId}/{date}`
```json
{
  "date": "2025-06-01",
  "completedHabits": ["habit123", "habit456"]
}
```

---

## 🔄 Logic Rules

- Streak = consecutive **daily** completions per habit
- Weekly goal = number of times habit completed **within a calendar week**
- Week resets every **Monday**
- When weekly goal met, emoji **glows**
- When multiple habits completed in one day, cell background has a **stacked gradient**
- Past completions can be **edited**, future completions allowed for now (premium in future)
- Deleting a habit also deletes related history

---

## 🧠 LLM Task Delegation Suggestions

- `useCalendar.js`: Generate full matrix of days in a month, handle streaks and glow logic
- `useHabits.js`: Manage create/edit/delete logic with Firebase sync
- `HabitModal.jsx`: Modal for setting emoji, color, name, description, goal
- `CalendarCell.jsx`: Handle stacked emojis, glow effect, tooltip per habit
- `StatsView.jsx`: Show per-habit streak line chart, weekly goal completion bar, calendar heatmap

---

## 🚀 Setup

```bash
git clone https://github.com/yourname/habitlock
cd habitlock/client
npm install
npm run dev
```

Setup your Firebase config in `.env`:
```env
VITE_FIREBASE_API_KEY=
VITE_FIREBASE_AUTH_DOMAIN=
VITE_FIREBASE_PROJECT_ID=
VITE_FIREBASE_DATABASE_URL=
VITE_FIREBASE_STORAGE_BUCKET=
VITE_FIREBASE_APP_ID=
```

---

## 🧪 Future Ideas

- Premium: unlock future-date editing, multiple streak types
- Social: share your streaks/stats
- Reminders / Notifications
- Mobile PWA support
