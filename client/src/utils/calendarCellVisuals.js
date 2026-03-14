import {
  getAutoPatternPreset,
  getHabitSeedOffset,
  getPatternOverrideForHabit,
  hashString,
} from './patterns';

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

const seededRandom = (seed) => {
  let t = seed + 0x6D2B79F5;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};

const getHistoryProgress = (completionCount) => {
  if (!Number.isFinite(completionCount) || completionCount <= 0) return 0;
  const cap = 50;
  return clamp(Math.log10(completionCount + 1) / Math.log10(cap + 1), 0, 1);
};

const getStreakProgress = (streakCount) => {
  if (!Number.isFinite(streakCount) || streakCount <= 0) return 0;
  if (streakCount === 1) return 0.08;
  if (streakCount === 2) return 0.18;
  return clamp(streakCount, 1, 7) / 7;
};

export const getHabitVisualStrength = ({ completions = 0, streak = 0 } = {}) => {
  const streakProgress = getStreakProgress(streak);
  if (streakProgress > 0) return streakProgress;
  return 0.08 + (getHistoryProgress(completions) * 0.2);
};

const lightenColor = (hex, amount) => {
  const normalized = (hex || '#60a5fa').replace('#', '');
  const value = parseInt(normalized, 16);
  const r = Math.min(255, ((value >> 16) & 0xff) + Math.round(255 * amount));
  const g = Math.min(255, ((value >> 8) & 0xff) + Math.round(255 * amount));
  const b = Math.min(255, (value & 0xff) + Math.round(255 * amount));
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`;
};

const toHex = (opacity) => (
  Math.round(Math.min(1, Math.max(0, opacity)) * 255).toString(16).padStart(2, '0')
);

export const buildCalendarCellVisuals = ({
  date,
  habits = [],
  habitById = null,
  completedHabitIds = [],
  habitProgressByDate = {},
  animationIndex = 0,
  isPreview = false,
  patternConfig = null,
  previewOverrides = null,
}) => {
  const habitLookup = habitById || new Map(habits.map((habit) => [habit.id, habit]));
  const completedHabitDetails = completedHabitIds
    .map((habitId) => habitLookup.get(habitId))
    .filter(Boolean);

  const dateSeed = date.split('-').reduce((acc, num) => acc + parseInt(num, 10), 0);
  const defaultColors = ['#3b82f6', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981', '#06b6d4'];
  const habitColors = completedHabitDetails.map(
    (habit, index) => habit.color || defaultColors[index % defaultColors.length],
  );
  const patternSeed = completedHabitDetails.length > 0
    ? hashString(completedHabitDetails.map((habit) => habit.id).sort().join('|'))
    : 0;

  const dayVisualStrength = completedHabitDetails.length > 0
    ? completedHabitDetails.reduce((acc, habit) => {
      const progress = habitProgressByDate?.[date]?.[habit.id] || { completions: 1, streak: 1 };
      return acc + getHabitVisualStrength(progress);
    }, 0) / Math.max(1, completedHabitDetails.length)
    : 0;

  const baseStyle = {
    '--animation-delay': `${animationIndex * 0.02}s`,
    '--completion-overlay-opacity': `${0.05 + (dayVisualStrength * 0.18)}`,
  };

  let backgroundModel = null;
  if (completedHabitDetails.length > 0 && habits.length > 0) {
    const completionRatio = completedHabitDetails.length / habits.length;
    const allHabitsCompleted = completionRatio >= 1;
    const completionIntensity = allHabitsCompleted ? 1 : Math.max(dayVisualStrength, completionRatio);
    const computedOpacity = clamp(isPreview ? 0.2 + (completionIntensity * 0.5) : completionIntensity, 0.08, 1);
    const baseOpacity = allHabitsCompleted ? 1 : computedOpacity;
    const primaryColor = habitColors[0];
    const secondaryColor = habitColors[1] || habitColors[0];
    const angle1 = Math.floor(seededRandom(dateSeed) * 360);
    const angle2 = (angle1 + 120 + Math.floor(seededRandom(dateSeed + 1) * 60)) % 360;
    const centerGlowOpacity = baseOpacity * (0.1 + (completionRatio * 0.18));
    const orbOpacityMultiplier = 0.04 + (completionRatio * 0.13);
    const edgeGlowOpacity = baseOpacity * (0.04 + (completionRatio * 0.06));
    const auroraOpacity = baseOpacity * (0.04 + (completionRatio * 0.08));
    const singleAuroraStartOpacity = baseOpacity * (0.05 + (completionRatio * 0.08));
    const singleAuroraEndOpacity = baseOpacity * (0.03 + (completionRatio * 0.05));
    const baseFillStartOpacity = baseOpacity * (0.18 + (completionRatio * 0.42));
    const baseFillEndOpacity = baseOpacity * (0.34 + (completionRatio * 0.66));

    const centerGlow = `radial-gradient(ellipse at 50% 50%, ${lightenColor(primaryColor, 0.22)}${toHex(centerGlowOpacity)} 0%, transparent 72%)`;
    const orbs = habitColors.slice(0, Math.min(4, habitColors.length)).map((color, index) => {
      const orbSeed = dateSeed + (index * 17);
      const x = 15 + (seededRandom(orbSeed) * 70);
      const y = 15 + (seededRandom(orbSeed + 1) * 70);
      const size = 38 + (seededRandom(orbSeed + 2) * 32) + (completionRatio * 18);
      const orbOpacity = baseOpacity * orbOpacityMultiplier;
      return {
        color,
        x,
        y,
        size,
        opacity: orbOpacity,
        css: `radial-gradient(ellipse ${size}% ${size * 1.18}% at ${x}% ${y}%, ${color}${toHex(orbOpacity)} 0%, ${color}${toHex(orbOpacity * 0.32)} 38%, transparent 72%)`,
      };
    });
    const edgeGlow = `radial-gradient(ellipse at 50% 100%, ${secondaryColor}${toHex(edgeGlowOpacity)} 0%, transparent 50%)`;
    const aurora = habitColors.length >= 2
      ? `linear-gradient(${angle1}deg, ${habitColors.map((color, index) => `${color}${toHex(auroraOpacity)} ${(index / habitColors.length) * 100}%`).join(', ')}, transparent 100%)`
      : `linear-gradient(${angle1}deg, ${primaryColor}${toHex(singleAuroraStartOpacity)} 0%, ${lightenColor(primaryColor, 0.16)}${toHex(singleAuroraEndOpacity)} 100%)`;
    const baseFill = `linear-gradient(${angle2}deg, ${primaryColor}${toHex(baseFillStartOpacity)} 0%, ${secondaryColor}${toHex(baseFillEndOpacity)} 100%)`;

    backgroundModel = {
      dateSeed,
      colors: habitColors,
      completionRatio,
      baseOpacity,
      primaryColor,
      secondaryColor,
      angle1,
      angle2,
      centerGlow,
      centerGlowColor: lightenColor(primaryColor, 0.22),
      centerGlowOpacity,
      orbs,
      edgeGlow,
      edgeGlowOpacity,
      auroraOpacity,
      singleAuroraStartOpacity,
      singleAuroraEndOpacity,
      baseFillStartOpacity,
      baseFillEndOpacity,
      aurora,
      baseFill,
      css: [centerGlow, ...orbs.map((orb) => orb.css), edgeGlow, aurora, baseFill].filter(Boolean).join(', '),
    };
  }

  const backgroundStyle = backgroundModel
    ? {
      ...baseStyle,
      '--cell-background': backgroundModel.css,
    }
    : baseStyle;

  const patternLayers = completedHabitDetails.map((habit, index) => {
    const override = previewOverrides?.[habit.id] || getPatternOverrideForHabit(habit, patternConfig);
    const preset = override || getAutoPatternPreset(habit.id);
    const progress = habitProgressByDate?.[date]?.[habit.id] || { completions: 1, streak: 1 };
    const visualStrength = getHabitVisualStrength(progress);

    return {
      color: habit.color || habitColors[index],
      habitId: habit.id,
      preset,
      seed: patternSeed + getHabitSeedOffset(`${date}:${habit.id}:${index}`),
      opacityMultiplier: isPreview ? 1 : clamp(0.4 + (visualStrength * 0.65), 0.4, 1),
      scaleMultiplier: isPreview ? 1 : 0.94 + (visualStrength * 0.12),
    };
  });

  return {
    completedHabitDetails,
    habitColors,
    patternSeed,
    dayVisualStrength,
    backgroundStyle,
    backgroundModel,
    patternLayers,
  };
};

export default buildCalendarCellVisuals;
