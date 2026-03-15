import dayjs from 'dayjs';
import mechanicCardOne from '../assets/mechanic-card-1.png';
import mechanicCardTwo from '../assets/mechanic-card-2.png';

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

const seededUnit = (seed) => {
  const raw = Math.sin(seed * 12.9898) * 43758.5453;
  return raw - Math.floor(raw);
};

const createHabits = (items) => items.map((habit, index) => ({
  weeklyGoal: 5,
  createdAt: `2023-12-${String(index + 1).padStart(2, '0')}T08:00:00.000Z`,
  ...habit,
}));

const createEntry = (dateKey, habitIds) => ({
  completedHabits: habitIds,
  habits: Object.fromEntries(
    habitIds.map((habitId, index) => [
      habitId,
      { completedAt: `${dateKey}T${String(7 + index).padStart(2, '0')}:00:00.000Z` },
    ]),
  ),
});

const buildHabitProgressByDate = ({ startDate, endDate, entries, habits }) => {
  const progress = {};
  const completionsByHabit = {};
  const streakByHabit = {};
  const habitIds = habits.map((habit) => habit.id);
  let cursor = dayjs(startDate);
  const end = dayjs(endDate);

  while (cursor.isBefore(end) || cursor.isSame(end, 'day')) {
    const dateKey = cursor.format('YYYY-MM-DD');
    const completedHabitIds = entries[dateKey]?.completedHabits || [];
    const completedSet = new Set(completedHabitIds);

    habitIds.forEach((habitId) => {
      if (completedSet.has(habitId)) {
        completionsByHabit[habitId] = (completionsByHabit[habitId] || 0) + 1;
        streakByHabit[habitId] = (streakByHabit[habitId] || 0) + 1;
        if (!progress[dateKey]) progress[dateKey] = {};
        progress[dateKey][habitId] = {
          completions: completionsByHabit[habitId],
          streak: streakByHabit[habitId],
        };
      } else {
        streakByHabit[habitId] = 0;
      }
    });

    cursor = cursor.add(1, 'day');
  }

  return progress;
};

const buildYearPreview = ({
  year,
  habits,
  monthlyEnergy,
  weeklyBiasByHabit,
  seasonalityByHabit,
  slumps,
  rebounds,
}) => {
  const startDate = dayjs(`${year}-01-01`);
  const endDate = dayjs(`${year}-12-31`);
  const calendarEntries = {};

  let cursor = startDate;
  while (cursor.isBefore(endDate) || cursor.isSame(endDate, 'day')) {
    const dateKey = cursor.format('YYYY-MM-DD');
    const monthIndex = cursor.month();
    const dayOfWeek = cursor.day();
    const completedHabitIds = habits
      .filter((habit, habitIndex) => {
        let probability = habit.baseRate
          * (weeklyBiasByHabit[habit.id]?.[dayOfWeek] || 1)
          * (seasonalityByHabit[habit.id]?.[monthIndex] || 1)
          * (monthlyEnergy[monthIndex] || 1);

        slumps.forEach((window) => {
          if (dateKey >= window.start && dateKey <= window.end) {
            probability *= window.factor;
          }
        });

        rebounds.forEach((window) => {
          if (dateKey >= window.start && dateKey <= window.end) {
            probability *= window.factor;
          }
        });

        probability = clamp(probability, 0.03, 0.97);
        const seed = Number(dateKey.replace(/-/g, '')) + ((habitIndex + 1) * 211);
        return seededUnit(seed) < probability;
      })
      .map((habit) => habit.id);

    if (completedHabitIds.length > 0) {
      calendarEntries[dateKey] = createEntry(dateKey, completedHabitIds);
    }

    cursor = cursor.add(1, 'day');
  }

  return {
    year,
    calendarEntries,
    habitProgressByDate: buildHabitProgressByDate({
      startDate: startDate.format('YYYY-MM-DD'),
      endDate: endDate.format('YYYY-MM-DD'),
      entries: calendarEntries,
      habits,
    }),
    getCompletedHabits: (dateKey) => calendarEntries[dateKey]?.completedHabits || [],
  };
};

const showcaseHabits = createHabits([
  { id: 'read-25', name: 'Read 25 min', emoji: '📚', color: '#38bdf8', weeklyGoal: 6 },
  { id: 'run-3mi', name: 'Run 3 mi', emoji: '🏃', color: '#fb7185', weeklyGoal: 4 },
  { id: 'meditate-10', name: 'Meditate 10 min', emoji: '🧘', color: '#34d399', weeklyGoal: 7 },
]);

const yearExampleHabits = showcaseHabits.map((habit) => ({
  ...habit,
  baseRate: habit.id === 'read-25' ? 0.7 : habit.id === 'run-3mi' ? 0.48 : 0.79,
}));

const yearExample = {
  title: 'A complete year using the real HabitLock grid',
  subtitle: 'The same footer habit strip, populated with realistic completions, slumps, rebounds, and layered pattern cells from the product.',
  habits: yearExampleHabits,
  ...buildYearPreview({
    year: 2024,
    habits: yearExampleHabits,
    monthlyEnergy: [0.96, 0.9, 1.01, 1.05, 1.08, 1.06, 0.99, 0.93, 1.02, 1.07, 1.04, 1.1],
    weeklyBiasByHabit: {
      'read-25': [0.84, 0.86, 0.82, 0.82, 0.8, 0.6, 0.64],
      'run-3mi': [0.58, 0.6, 0.55, 0.5, 0.56, 0.74, 0.68],
      'meditate-10': [0.92, 0.9, 0.9, 0.88, 0.86, 0.78, 0.82],
    },
    seasonalityByHabit: {
      'read-25': [1.02, 1, 1.01, 1.04, 1.05, 1.06, 1.02, 0.98, 1.01, 1.04, 1.03, 1.07],
      'run-3mi': [0.88, 0.9, 1, 1.08, 1.1, 1.12, 1.1, 1.04, 1, 0.96, 0.92, 0.86],
      'meditate-10': [1.05, 1.04, 1.03, 1.02, 1.01, 1, 0.99, 1, 1.01, 1.03, 1.05, 1.08],
    },
    slumps: [
      { start: '2024-02-14', end: '2024-02-20', factor: 0.5 },
      { start: '2024-08-10', end: '2024-08-19', factor: 0.56 },
    ],
    rebounds: [
      { start: '2024-03-01', end: '2024-03-08', factor: 1.18 },
      { start: '2024-09-02', end: '2024-09-12', factor: 1.14 },
    ],
  }),
};

const homepageArtShowcase = {
  sectionLabel: 'The Art Mechanic',
  headline: 'Your habits should leave a mark.',
  subheadline: 'Turn daily consistency into visual art.',
  identityLines: [
    "See the identity you're building",
    'Build proof, not just streaks',
    'A calendar that looks earned',
  ],
  mechanicCards: [
    {
      title: 'Every habit paints the calendar',
      description: 'Each completion adds color, shape, texture, or rhythm to your month.',
      icon: '1',
      image: mechanicCardOne,
      imageAlt: 'A visual habit calendar filled with emoji streaks across the month.',
    },
    {
      title: 'Consistency creates patterns',
      description: 'Repeated effort forms recognizable structures that become more satisfying over time.',
      icon: '2',
      image: mechanicCardTwo,
      imageAlt: 'A close-up row of completed habit days showing a growing streak.',
    },
    {
      title: 'Your progress becomes personal',
      description: 'No two calendars look exactly the same. Your habits create a signature visual record.',
      icon: '3',
    },
  ],
  yearExample,
};

export default homepageArtShowcase;
